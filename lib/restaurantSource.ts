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
  "id" | "databaseId" | "location" | "restaurantSource" | "cuisines"
>;

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
  const { data, error } = await supabase
    .from("rooms")
    .select("id, location, restaurant_source, cuisine_preference")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("[RestaurantSource] load room reference failed", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    databaseId: data.id,
    location: data.location,
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
  try {
    const response = await fetch("/api/restaurants/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId: room.databaseId ?? room.id,
        areaKey: getRestaurantAreaKey(room.location),
        locationLabel: room.location,
        keyword: "餐厅",
        radiusM: 3000,
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
