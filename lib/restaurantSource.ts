import { DEFAULT_RADIUS_M, type RoomLocation } from "@/data/locations";
import {
  DEFAULT_RESTAURANT_AREA,
  getRestaurantAreaKey,
  getRestaurantsForLocation,
  restaurantPacks,
  type Restaurant,
  type RestaurantAreaKey
} from "@/data/restaurants";
import { restaurantFromCacheRow } from "@/lib/restaurantCache";
import { getSupabaseClient } from "@/lib/supabase";
import type { Room } from "@/types";
import type { Database } from "@/types/supabase";

export type RestaurantSource = "local_pack" | "api" | "api_fallback";

export type RestaurantSourceResult = {
  restaurants: Restaurant[];
  areaKey: RestaurantAreaKey;
  requestedAreaKey: RestaurantAreaKey | "custom";
  restaurantSource: RestaurantSource;
  fallbackUsed: boolean;
  fallbackAreaKey: RestaurantAreaKey;
};

type RoomRestaurantRow = {
  rank: number | null;
  restaurant_cache:
    | Database["public"]["Tables"]["restaurant_cache"]["Row"]
    | Database["public"]["Tables"]["restaurant_cache"]["Row"][]
    | null;
};

type RoomReference = Pick<
  Room,
  "id" | "databaseId" | "location" | "locationMeta" | "restaurantSource" | "cuisines"
>;

type RoomReferenceRow = {
  id: string;
  location: string;
  restaurant_source: string | null;
  cuisine_preference: string[] | null;
  location_area_key?: string | null;
  location_city?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_radius_m?: number | null;
  location_source?: string | null;
};

export type RestaurantApiSearchResult = {
  ok: boolean;
  source: "amap" | "local_fallback";
  restaurants: Restaurant[];
  error?: string;
  reason?: string;
};

function isExplicitDefaultLocation(location?: string) {
  const normalized = (location ?? "").trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("当前") ||
    normalized.includes("附近") ||
    normalized.includes("nearby")
  );
}

function normalizeLocationSource(source?: string | null): RoomLocation["source"] {
  if (source === "current_location" || source === "search" || source === "preset") {
    return source;
  }

  return "preset";
}

function isLocationSchemaMissing(error: unknown) {
  if (!error) return false;
  const candidate = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  const message = [
    candidate.message,
    candidate.details,
    candidate.hint,
    candidate.code,
    String(error)
  ].join(" ");
  return (
    message.includes("location_area_key") ||
    message.includes("location_city") ||
    message.includes("location_lat") ||
    message.includes("location_lng") ||
    message.includes("location_radius_m") ||
    message.includes("location_source") ||
    message.includes("schema cache")
  );
}

function mapLocationMeta(row: {
  location: string;
  location_area_key?: string | null;
  location_city?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_radius_m?: number | null;
  location_source?: string | null;
}): RoomLocation {
  return {
    locationLabel: row.location,
    areaKey: row.location_area_key ?? undefined,
    city: row.location_city ?? undefined,
    lat: row.location_lat ?? undefined,
    lng: row.location_lng ?? undefined,
    radiusM: row.location_radius_m ?? DEFAULT_RADIUS_M,
    source: normalizeLocationSource(row.location_source)
  };
}

export function resolveRestaurantSourceForLocation(
  location?: string,
  source: RestaurantSource | string = "local_pack"
): RestaurantSourceResult {
  const areaKey = getRestaurantAreaKey(location);
  const fallbackUsed =
    areaKey === DEFAULT_RESTAURANT_AREA && !isExplicitDefaultLocation(location);
  const restaurants = getRestaurantsForLocation(location);

  return {
    restaurants,
    areaKey,
    requestedAreaKey: fallbackUsed ? "custom" : areaKey,
    restaurantSource: source === "api" || source === "api_fallback" ? source : "local_pack",
    fallbackUsed,
    fallbackAreaKey: DEFAULT_RESTAURANT_AREA
  };
}

export function getLocalRestaurantsForRoom(room?: Pick<Room, "location" | "restaurantSource"> | null) {
  return resolveRestaurantSourceForLocation(room?.location, room?.restaurantSource);
}

async function loadRoomReference(roomId: string): Promise<RoomReference | null> {
  const supabase = getSupabaseClient();
  const extendedSelect =
    "id, location, restaurant_source, cuisine_preference, location_area_key, location_city, location_lat, location_lng, location_radius_m, location_source";
  const legacySelect = "id, location, restaurant_source, cuisine_preference";
  const extendedResult = await supabase
    .from("rooms")
    .select(extendedSelect)
    .eq("id", roomId)
    .maybeSingle();
  let data = extendedResult.data as RoomReferenceRow | null;
  let error = extendedResult.error;

  if (error && isLocationSchemaMissing(error)) {
    console.warn("[RestaurantSource] location columns missing, retrying legacy room select", error);
    const legacyResult = await supabase
      .from("rooms")
      .select(legacySelect)
      .eq("id", roomId)
      .maybeSingle();

    data = legacyResult.data as RoomReferenceRow | null;
    error = legacyResult.error;
  }

  if (error) {
    console.error("[RestaurantSource] load room reference failed", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    databaseId: data.id,
    location: data.location,
    locationMeta: mapLocationMeta(data),
    restaurantSource: data.restaurant_source ?? "local_pack",
    cuisines: data.cuisine_preference ?? []
  };
}

async function normalizeRoomReference(roomOrId: string | RoomReference) {
  if (typeof roomOrId !== "string") return roomOrId;
  return loadRoomReference(roomOrId);
}

async function loadCachedRestaurantsForRoom(roomId?: string) {
  if (!roomId) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("room_restaurants")
    .select("rank, restaurant_cache(*)")
    .eq("room_id", roomId)
    .order("rank", { ascending: true });

  if (error) {
    console.error("[RestaurantSource] load cached room restaurants failed", error);
    return [];
  }

  return ((data ?? []) as unknown as RoomRestaurantRow[])
    .map((item) => {
      const row = Array.isArray(item.restaurant_cache)
        ? item.restaurant_cache[0]
        : item.restaurant_cache;
      return row ? restaurantFromCacheRow(row) : null;
    })
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}

export async function getRestaurantSourceForRoom(
  roomOrId: string | RoomReference
): Promise<RestaurantSourceResult> {
  const room = await normalizeRoomReference(roomOrId);

  if (!room) {
    return resolveRestaurantSourceForLocation(undefined, "local_pack");
  }

  const cachedRestaurants = await loadCachedRestaurantsForRoom(
    room.databaseId ?? room.id
  );

  if (cachedRestaurants.length > 0) {
    const areaKey = getRestaurantAreaKey(room.location);

    return {
      restaurants: cachedRestaurants,
      areaKey,
      requestedAreaKey: areaKey,
      restaurantSource: "api",
      fallbackUsed: false,
      fallbackAreaKey: DEFAULT_RESTAURANT_AREA
    };
  }

  return getLocalRestaurantsForRoom(room);
}

export async function getRestaurantsForRoom(roomOrId: string | RoomReference) {
  return (await getRestaurantSourceForRoom(roomOrId)).restaurants;
}

export async function prepareRestaurantPoolForRoom(room: RoomReference) {
  const locationMeta = room.locationMeta;
  const areaKey = locationMeta?.areaKey ?? getRestaurantAreaKey(room.location);

  try {
    const response = await fetch("/api/restaurants/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId: room.databaseId ?? room.id,
        areaKey,
        locationLabel: locationMeta?.locationLabel ?? room.location,
        lat: locationMeta?.lat,
        lng: locationMeta?.lng,
        keyword: "餐厅",
        radiusM: locationMeta?.radiusM ?? DEFAULT_RADIUS_M,
        cuisinePreference: room.cuisines?.[0]
      })
    });
    const payload = (await response.json()) as RestaurantApiSearchResult;

    if (!response.ok || !payload.ok) {
      console.info("[RestaurantSource] use local restaurant fallback", {
        status: response.status,
        reason: payload.reason,
        error: payload.error
      });
    }

    return payload;
  } catch (error) {
    console.error("[RestaurantSource] prepare restaurant pool failed", error);
    return {
      ok: false,
      source: "local_fallback",
      reason: "RESTAURANT_API_ROUTE_FAILED",
      restaurants: []
    } satisfies RestaurantApiSearchResult;
  }
}

export function getDemoRestaurants() {
  return restaurantPacks.demo;
}
