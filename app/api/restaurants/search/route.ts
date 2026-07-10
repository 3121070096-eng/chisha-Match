import { DEFAULT_RESTAURANT_AREA, getRestaurantAreaKey } from "@/data/restaurants";
import {
  cacheInsertFromRestaurant,
  restaurantFromCacheRow
} from "@/lib/restaurantCache";
import {
  getPresetAreaCenter,
  hasAmapApiKey,
  resolveAmapLocationByText,
  searchAmapRestaurants,
  searchAmapRestaurantsByText
} from "@/lib/server/amap";
import {
  formatSupabaseError,
  getSupabaseErrorDebugPayload
} from "@/lib/supabaseErrors";
import type { Database, Json } from "@/types/supabase";
import type { Restaurant } from "@/data/restaurants";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RestaurantApiResponse = {
  ok: boolean;
  source: "amap" | "local_fallback";
  restaurants: Restaurant[];
  error?: string;
  debug?: {
    message: unknown;
    code: unknown;
    details: unknown;
    hint: unknown;
  };
  reason?: string;
};

type SearchInput = {
  roomId?: string;
  areaKey?: string;
  locationLabel?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
  cuisinePreference?: string;
};

type RestaurantCacheRow = Database["public"]["Tables"]["restaurant_cache"]["Row"];

function getServerSupabaseClient(options: { serviceRole?: boolean } = {}): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options.serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseInput(request: Request): Promise<SearchInput> {
  const url = new URL(request.url);
  const fromQuery = {
    roomId: url.searchParams.get("roomId") ?? undefined,
    areaKey: url.searchParams.get("areaKey") ?? undefined,
    locationLabel:
      url.searchParams.get("locationLabel") ??
      url.searchParams.get("location") ??
      undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
    lat: getNumberParam(url.searchParams.get("lat")),
    lng: getNumberParam(url.searchParams.get("lng")),
    radiusM: getNumberParam(url.searchParams.get("radiusM")),
    cuisinePreference: url.searchParams.get("cuisinePreference") ?? undefined
  };

  if (request.method !== "POST") return fromQuery;

  try {
    const body = (await request.json()) as Partial<SearchInput>;
    return {
      ...fromQuery,
      ...body
    };
  } catch {
    return fromQuery;
  }
}

async function recordServerEvent({
  roomId,
  eventName,
  metadata
}: {
  roomId?: string;
  eventName: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from("events").insert({
      room_id: roomId ?? null,
      event_name: eventName,
      metadata: metadata as Json
    });

    if (error) console.error("[RestaurantAPI] record event failed", error);
  } catch (error) {
    console.error("[RestaurantAPI] record event crashed", error);
  }
}

async function updateRoomRestaurantSource(roomId: string | undefined, source: string) {
  if (!roomId) return;
  const supabase = getServerSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("rooms")
      .update({ restaurant_source: source })
      .eq("id", roomId);

    if (error) console.error("[RestaurantAPI] update room source failed", error);
  } catch (error) {
    console.error("[RestaurantAPI] update room source crashed", error);
  }
}

async function loadCachedRestaurantsForRoom(roomId?: string) {
  if (!roomId) return [];
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_restaurants")
    .select("rank, restaurant_cache(*)")
    .eq("room_id", roomId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("[RestaurantAPI] load room restaurants failed", error);
    return [];
  }

  return ((data ?? []) as unknown as Array<{
    rank: number | null;
    restaurant_cache: RestaurantCacheRow | RestaurantCacheRow[] | null;
  }>)
    .map((item) => {
      const row = Array.isArray(item.restaurant_cache)
        ? item.restaurant_cache[0]
        : item.restaurant_cache;
      return row ? restaurantFromCacheRow(row) : null;
    })
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}

async function writeRestaurantCacheForRoom(roomId: string, restaurants: Restaurant[]) {
  const supabase = getServerSupabaseClient({ serviceRole: true });
  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED");
  }

  const cachePayload = restaurants.map(cacheInsertFromRestaurant);
  const { data: cacheRows, error: cacheError } = await supabase
    .from("restaurant_cache")
    .upsert(cachePayload, { onConflict: "source,source_place_id" })
    .select("*");

  if (cacheError) {
    console.error("[RestaurantAPI] write restaurant_cache failed", cacheError);
    throw cacheError;
  }

  const roomRows = (cacheRows ?? []).map((row, index) => ({
    room_id: roomId,
    restaurant_id: row.id,
    rank: index + 1
  }));

  if (roomRows.length === 0) {
    throw new Error("NO_CACHE_ROWS_RETURNED");
  }

  const { error: roomRestaurantError } = await supabase
    .from("room_restaurants")
    .upsert(roomRows, { onConflict: "room_id,restaurant_id" });

  if (roomRestaurantError) {
    console.error("[RestaurantAPI] write room_restaurants failed", roomRestaurantError);
    throw roomRestaurantError;
  }

  await updateRoomRestaurantSource(roomId, "api");
}

async function searchRestaurantsWithAmap(input: SearchInput) {
  const areaKey =
    input.areaKey || getRestaurantAreaKey(input.locationLabel).toString();
  const radiusM = input.radiusM ?? 3000;
  const keyword = input.keyword || "餐厅";
  const presetCenter = getPresetAreaCenter(input.areaKey, input.locationLabel);

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    return searchAmapRestaurants({
      lat: input.lat,
      lng: input.lng,
      radiusM,
      keyword,
      cuisinePreference: input.cuisinePreference,
      areaKey
    });
  }

  if (presetCenter) {
    return searchAmapRestaurants({
      lat: presetCenter.lat,
      lng: presetCenter.lng,
      radiusM,
      keyword,
      cuisinePreference: input.cuisinePreference,
      areaKey
    });
  }

  const locationLabel = input.locationLabel?.trim();
  if (locationLabel) {
    const coordinates = await resolveAmapLocationByText(locationLabel);

    if (coordinates) {
      const aroundRestaurants = await searchAmapRestaurants({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radiusM,
        keyword,
        cuisinePreference: input.cuisinePreference,
        areaKey
      });

      if (aroundRestaurants.length >= 8) return aroundRestaurants;
    }
  }

  return searchAmapRestaurantsByText({
    locationLabel,
    keyword,
    cuisinePreference: input.cuisinePreference,
    areaKey
  });
}

function getSafeErrorDebug(error?: unknown) {
  if (!error) return undefined;
  const debug = getSupabaseErrorDebugPayload(error);

  return {
    message: debug.message,
    code: debug.code,
    details: debug.details,
    hint: debug.hint
  };
}

function fallbackResponse(reason: string, error?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      source: "local_fallback",
      reason,
      error: error ? formatSupabaseError(error) : undefined,
      debug: getSafeErrorDebug(error),
      restaurants: []
    } satisfies RestaurantApiResponse,
    { status: 200 }
  );
}

async function handleSearch(request: Request) {
  const input = await parseInput(request);
  const areaKey = input.areaKey || getRestaurantAreaKey(input.locationLabel);
  const cachedRestaurants = await loadCachedRestaurantsForRoom(input.roomId);

  if (cachedRestaurants.length > 0) {
    return NextResponse.json({
      ok: true,
      source: "amap",
      restaurants: cachedRestaurants
    } satisfies RestaurantApiResponse);
  }

  if (!hasAmapApiKey()) {
    await Promise.all([
      recordServerEvent({
        roomId: input.roomId,
        eventName: "restaurant_api_failed",
        metadata: {
          reason: "AMAP_API_KEY_NOT_CONFIGURED",
          area_key: areaKey,
          location_label: input.locationLabel
        }
      }),
      recordServerEvent({
        roomId: input.roomId,
        eventName: "fallback_restaurants_used",
        metadata: {
          requested_area_key: areaKey,
          fallback_area_key: DEFAULT_RESTAURANT_AREA
        }
      }),
      updateRoomRestaurantSource(input.roomId, "api_fallback")
    ]);

    return fallbackResponse("AMAP_API_KEY_NOT_CONFIGURED");
  }

  await recordServerEvent({
    roomId: input.roomId,
    eventName: "restaurant_api_requested",
    metadata: {
      area_key: areaKey,
      location_label: input.locationLabel,
      radius_m: input.radiusM ?? 3000,
      cuisine_preference: input.cuisinePreference,
      has_coordinates:
        typeof input.lat === "number" && typeof input.lng === "number"
    }
  });

  try {
    const restaurants = await searchRestaurantsWithAmap(input);

    if (restaurants.length < 8) {
      await Promise.all([
        recordServerEvent({
          roomId: input.roomId,
          eventName: "restaurant_api_failed",
          metadata: {
            reason: "AMAP_RETURNED_TOO_FEW_RESTAURANTS",
            returned_count: restaurants.length,
            area_key: areaKey,
            location_label: input.locationLabel
          }
        }),
        recordServerEvent({
          roomId: input.roomId,
          eventName: "fallback_restaurants_used",
          metadata: {
            requested_area_key: areaKey,
            fallback_area_key: DEFAULT_RESTAURANT_AREA
          }
        }),
        updateRoomRestaurantSource(input.roomId, "api_fallback")
      ]);

      return fallbackResponse("AMAP_RETURNED_TOO_FEW_RESTAURANTS");
    }

    const limitedRestaurants = restaurants.slice(0, 20);

    if (input.roomId) {
      try {
        await writeRestaurantCacheForRoom(input.roomId, limitedRestaurants);
        await Promise.all([
          recordServerEvent({
            roomId: input.roomId,
            eventName: "restaurant_cache_written",
            metadata: {
              room_id: input.roomId,
              restaurant_count: limitedRestaurants.length
            }
          }),
          recordServerEvent({
            roomId: input.roomId,
            eventName: "room_restaurant_pool_created",
            metadata: {
              room_id: input.roomId,
              restaurant_count: limitedRestaurants.length,
              area_key: areaKey,
              location_label: input.locationLabel,
              source: "amap"
            }
          })
        ]);
      } catch (cacheError) {
        console.error("[RestaurantAPI] cache write failed", cacheError);
        const cacheDebug = getSafeErrorDebug(cacheError);
        await Promise.all([
          recordServerEvent({
            roomId: input.roomId,
            eventName: "restaurant_api_failed",
            metadata: {
              reason: "RESTAURANT_CACHE_WRITE_FAILED",
              area_key: areaKey,
              location_label: input.locationLabel,
              cache_error: cacheDebug
            }
          }),
          recordServerEvent({
            roomId: input.roomId,
            eventName: "fallback_restaurants_used",
            metadata: {
              requested_area_key: areaKey,
              fallback_area_key: DEFAULT_RESTAURANT_AREA
            }
          }),
          updateRoomRestaurantSource(input.roomId, "api_fallback")
        ]);

        return fallbackResponse("RESTAURANT_CACHE_WRITE_FAILED", cacheError);
      }
    }

    await recordServerEvent({
      roomId: input.roomId,
      eventName: "restaurant_api_succeeded",
      metadata: {
        returned_count: limitedRestaurants.length,
        area_key: areaKey,
        source: "amap"
      }
    });

    return NextResponse.json({
      ok: true,
      source: "amap",
      restaurants: limitedRestaurants
    } satisfies RestaurantApiResponse);
  } catch (error) {
    console.error("[RestaurantAPI] amap search failed", error);
    await Promise.all([
      recordServerEvent({
        roomId: input.roomId,
        eventName: "restaurant_api_failed",
        metadata: {
          reason: error instanceof Error ? error.message : "AMAP_REQUEST_FAILED",
          area_key: areaKey,
          location_label: input.locationLabel
        }
      }),
      recordServerEvent({
        roomId: input.roomId,
        eventName: "fallback_restaurants_used",
        metadata: {
          requested_area_key: areaKey,
          fallback_area_key: DEFAULT_RESTAURANT_AREA
        }
      }),
      updateRoomRestaurantSource(input.roomId, "api_fallback")
    ]);

    return fallbackResponse("AMAP_REQUEST_FAILED", error);
  }
}

export async function GET(request: Request) {
  return handleSearch(request);
}

export async function POST(request: Request) {
  return handleSearch(request);
}
