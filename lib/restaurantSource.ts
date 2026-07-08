import {
  DEFAULT_RESTAURANT_AREA,
  getRestaurantAreaKey,
  getRestaurantsForLocation,
  restaurantPacks,
  type Restaurant,
  type RestaurantAreaKey
} from "@/data/restaurants";
import type { Room } from "@/types";

export type RestaurantSource = "local_pack" | "api" | "api_fallback";

export type RestaurantSourceResult = {
  restaurants: Restaurant[];
  areaKey: RestaurantAreaKey;
  requestedAreaKey: RestaurantAreaKey | "custom";
  restaurantSource: RestaurantSource;
  fallbackUsed: boolean;
  fallbackAreaKey: RestaurantAreaKey;
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

export async function getRestaurantsForRoom(room: Pick<Room, "location" | "restaurantSource">) {
  return getLocalRestaurantsForRoom(room).restaurants;
}

export function getDemoRestaurants() {
  return restaurantPacks.demo;
}
