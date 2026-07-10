import {
  DEFAULT_RESTAURANT_AREA,
  allRestaurants,
  getRestaurantAreaKey,
  getRestaurantsForLocation
} from "@/data/restaurants";
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
import {
  buildRestaurantPool,
  type RestaurantPoolBuildResult,
  type RestaurantQualityContext
} from "@/lib/restaurantQuality";
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
  budget?: number;
};

type RestaurantCacheRow = Database["public"]["Tables"]["restaurant_cache"]["Row"];

const MIN_REAL_RESTAURANTS = 8;

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
    cuisinePreference: url.searchParams.get("cuisinePreference") ?? undefined,
    budget: getNumberParam(url.searchParams.get("budget"))
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

async function writeRestaurantCacheForRoom(
  roomId: string,
  restaurants: Restaurant[],
  source: "api" | "api_fallback" = "api"
) {
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

  await updateRoomRestaurantSource(roomId, source);
}

function getQualityContext(input: SearchInput, areaKey: string): RestaurantQualityContext {
  return {
    areaKey,
    locationLabel: input.locationLabel,
    cuisinePreference: input.cuisinePreference,
    budget: input.budget,
    radiusM: input.radiusM,
    targetCount: 20
  };
}

function getFallbackRestaurants(input: SearchInput, areaKey: string) {
  const locationPool = getRestaurantsForLocation(input.locationLabel || areaKey);
  const defaultPool = getRestaurantsForLocation(DEFAULT_RESTAURANT_AREA);

  // A few regional packs contain fewer than 16 entries. allRestaurants is only the
  // final safety net; quality ranking still prefers the selected area first.
  return [...locationPool, ...defaultPool, ...allRestaurants];
}

function buildQualityPool(
  apiRestaurants: Restaurant[],
  input: SearchInput,
  areaKey: string
) {
  return buildRestaurantPool(
    apiRestaurants,
    getFallbackRestaurants(input, areaKey),
    getQualityContext(input, areaKey)
  );
}

function hasCuisinePreference(cuisinePreference?: string) {
  const preference = cuisinePreference?.trim();
  return Boolean(preference && preference !== "不限");
}

function mergeRestaurantCandidates(
  cuisineFirst: Restaurant[],
  nearbyFill: Restaurant[]
) {
  const seen = new Set<string>();

  return [...cuisineFirst, ...nearbyFill].filter((restaurant) => {
    const key = restaurant.sourcePlaceId ?? restaurant.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchNearbyCandidates({
  lat,
  lng,
  radiusM,
  keyword,
  cuisinePreference,
  areaKey
}: {
  lat: number;
  lng: number;
  radiusM: number;
  keyword: string;
  cuisinePreference?: string;
  areaKey: string;
}) {
  const cuisineFirst = await searchAmapRestaurants({
    lat,
    lng,
    radiusM,
    keyword,
    cuisinePreference,
    areaKey
  });

  if (!hasCuisinePreference(cuisinePreference) || cuisineFirst.length >= MIN_REAL_RESTAURANTS) {
    return cuisineFirst;
  }

  // A cuisine query can be too narrow around a precise current location. Keep its
  // matches first, then complete the same pool with nearby food POIs.
  const nearbyFill = await searchAmapRestaurants({
    lat,
    lng,
    radiusM,
    keyword,
    areaKey
  });

  return mergeRestaurantCandidates(cuisineFirst, nearbyFill);
}

async function searchTextCandidates({
  locationLabel,
  keyword,
  cuisinePreference,
  areaKey
}: {
  locationLabel?: string;
  keyword: string;
  cuisinePreference?: string;
  areaKey: string;
}) {
  const cuisineFirst = await searchAmapRestaurantsByText({
    locationLabel,
    keyword,
    cuisinePreference,
    areaKey
  });

  if (!hasCuisinePreference(cuisinePreference) || cuisineFirst.length >= MIN_REAL_RESTAURANTS) {
    return cuisineFirst;
  }

  const nearbyFill = await searchAmapRestaurantsByText({
    locationLabel,
    keyword,
    areaKey
  });

  return mergeRestaurantCandidates(cuisineFirst, nearbyFill);
}

async function searchRestaurantsWithAmap(input: SearchInput) {
  const areaKey =
    input.areaKey || getRestaurantAreaKey(input.locationLabel).toString();
  const radiusM = input.radiusM ?? 3000;
  const keyword = input.keyword || "餐厅";
  const presetCenter = getPresetAreaCenter(input.areaKey, input.locationLabel);

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    return searchNearbyCandidates({
      lat: input.lat,
      lng: input.lng,
      radiusM,
      keyword,
      cuisinePreference: input.cuisinePreference,
      areaKey
    });
  }

  if (presetCenter) {
    return searchNearbyCandidates({
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
      const aroundRestaurants = await searchNearbyCandidates({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radiusM,
        keyword,
        cuisinePreference: input.cuisinePreference,
        areaKey
      });

      if (aroundRestaurants.length >= MIN_REAL_RESTAURANTS) return aroundRestaurants;
    }
  }

  return searchTextCandidates({
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

async function respondWithCompletedPool({
  input,
  areaKey,
  apiRestaurants = [],
  reason,
  error,
  persist = true
}: {
  input: SearchInput;
  areaKey: string;
  apiRestaurants?: Restaurant[];
  reason?: string;
  error?: unknown;
  persist?: boolean;
}) {
  const pool = buildQualityPool(apiRestaurants, input, areaKey);
  const sourceMix =
    apiRestaurants.length === 0
      ? "local_fallback"
      : pool.summary.fallbackCount > 0
        ? "mixed"
        : "amap";
  let persisted = false;

  if (input.roomId && persist) {
    try {
      await writeRestaurantCacheForRoom(
        input.roomId,
        pool.restaurants,
        pool.summary.fallbackCount > 0 || apiRestaurants.length === 0
          ? "api_fallback"
          : "api"
      );
      persisted = true;
      await Promise.all([
        recordServerEvent({
          roomId: input.roomId,
          eventName: "restaurant_cache_written",
          metadata: {
            room_id: input.roomId,
            restaurant_count: pool.summary.finalPoolCount,
            source: sourceMix
          }
        }),
        recordServerEvent({
          roomId: input.roomId,
          eventName: "room_restaurant_pool_created",
          metadata: {
            room_id: input.roomId,
            restaurant_count: pool.summary.finalPoolCount,
            area_key: areaKey,
            location_label: input.locationLabel,
            source: sourceMix
          }
        })
      ]);
    } catch (cacheError) {
      console.error("[RestaurantAPI] completed pool cache write failed", cacheError);
    }
  }

  const qualityMetadata = {
    api_returned_count: apiRestaurants.length,
    after_filter_count: pool.summary.afterFilterCount,
    deduped_count: pool.summary.dedupedCount,
    final_pool_count: pool.summary.finalPoolCount,
    fallback_count: pool.summary.fallbackCount,
    area_key: areaKey,
    cuisine_preference: input.cuisinePreference,
    source_mix: sourceMix,
    persisted
  };

  await Promise.all([
    recordServerEvent({
      roomId: input.roomId,
      eventName: "restaurant_pool_quality_checked",
      metadata: qualityMetadata
    }),
    recordServerEvent({
      roomId: input.roomId,
      eventName: "restaurant_pool_completed",
      metadata: {
        ...qualityMetadata,
        room_id: input.roomId ?? null,
        final_count: pool.summary.finalPoolCount,
        api_count: apiRestaurants.length
      }
    }),
    ...(pool.summary.fallbackCount > 0
      ? [
          recordServerEvent({
            roomId: input.roomId,
            eventName: "fallback_restaurants_used",
            metadata: {
              requested_area_key: areaKey,
              fallback_area_key: DEFAULT_RESTAURANT_AREA,
              fallback_count: pool.summary.fallbackCount
            }
          })
        ]
      : []),
    ...(apiRestaurants.length === 0
      ? [
          recordServerEvent({
            roomId: input.roomId,
            eventName: "restaurant_pool_fallback_only",
            metadata: {
              reason: reason ?? "AMAP_NO_RESULTS",
              area_key: areaKey,
              final_count: pool.summary.finalPoolCount
            }
          })
        ]
      : [])
  ]);

  return NextResponse.json(
    {
      ok: true,
      source: apiRestaurants.length > 0 ? "amap" : "local_fallback",
      reason,
      error: error ? formatSupabaseError(error) : undefined,
      debug: getSafeErrorDebug(error),
      restaurants: pool.restaurants
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

    return respondWithCompletedPool({
      input,
      areaKey,
      reason: "AMAP_API_KEY_NOT_CONFIGURED"
    });
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

    if (restaurants.length < MIN_REAL_RESTAURANTS) {
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

      return respondWithCompletedPool({
        input,
        areaKey,
        apiRestaurants: restaurants,
        reason: "AMAP_RETURNED_TOO_FEW_RESTAURANTS"
      });
    }

    const qualityPool = buildQualityPool(restaurants, input, areaKey);
    const limitedRestaurants = qualityPool.restaurants;
    const sourceMix = qualityPool.summary.fallbackCount > 0 ? "mixed" : "amap";

    if (input.roomId) {
      try {
        await writeRestaurantCacheForRoom(
          input.roomId,
          limitedRestaurants,
          qualityPool.summary.fallbackCount > 0 ? "api_fallback" : "api"
        );
        await Promise.all([
          recordServerEvent({
            roomId: input.roomId,
            eventName: "restaurant_cache_written",
            metadata: {
              room_id: input.roomId,
              restaurant_count: limitedRestaurants.length,
              source: sourceMix
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
              source: sourceMix
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

        return respondWithCompletedPool({
          input,
          areaKey,
          apiRestaurants: restaurants,
          reason: "RESTAURANT_CACHE_WRITE_FAILED",
          error: cacheError,
          persist: false
        });
      }
    }

    await Promise.all([
      recordServerEvent({
        roomId: input.roomId,
        eventName: "restaurant_pool_quality_checked",
        metadata: {
          api_returned_count: restaurants.length,
          after_filter_count: qualityPool.summary.afterFilterCount,
          deduped_count: qualityPool.summary.dedupedCount,
          final_pool_count: qualityPool.summary.finalPoolCount,
          fallback_count: qualityPool.summary.fallbackCount,
          area_key: areaKey,
          cuisine_preference: input.cuisinePreference,
          source_mix: sourceMix
        }
      }),
      recordServerEvent({
        roomId: input.roomId,
        eventName: "restaurant_pool_completed",
        metadata: {
          room_id: input.roomId ?? null,
          final_count: qualityPool.summary.finalPoolCount,
          api_count: restaurants.length,
          fallback_count: qualityPool.summary.fallbackCount,
          area_key: areaKey,
          cuisine_preference: input.cuisinePreference,
          source_mix: sourceMix
        }
      }),
      ...(qualityPool.summary.fallbackCount > 0
        ? [
            recordServerEvent({
              roomId: input.roomId,
              eventName: "fallback_restaurants_used",
              metadata: {
                requested_area_key: areaKey,
                fallback_area_key: DEFAULT_RESTAURANT_AREA,
                fallback_count: qualityPool.summary.fallbackCount
              }
            })
          ]
        : [])
    ]);

    await recordServerEvent({
      roomId: input.roomId,
      eventName: "restaurant_api_succeeded",
      metadata: {
        returned_count: restaurants.length,
        final_count: qualityPool.summary.finalPoolCount,
        fallback_count: qualityPool.summary.fallbackCount,
        area_key: areaKey,
        source: sourceMix
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

    return respondWithCompletedPool({
      input,
      areaKey,
      reason: "AMAP_REQUEST_FAILED",
      error
    });
  }
}

export async function GET(request: Request) {
  return handleSearch(request);
}

export async function POST(request: Request) {
  return handleSearch(request);
}
