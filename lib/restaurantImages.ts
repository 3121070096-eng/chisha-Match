import type { Restaurant } from "@/data/restaurants";

export const restaurantFallbackImage = "/restaurants/fallback.png";

export function getRestaurantImages(restaurant: Restaurant) {
  if (restaurant.images.length > 0) return restaurant.images;
  return restaurant.image ? [restaurant.image] : [restaurantFallbackImage];
}

export function getRestaurantCover(restaurant: Restaurant) {
  return getRestaurantImages(restaurant)[0] ?? restaurantFallbackImage;
}

export function useFallbackImage(element: HTMLImageElement) {
  if (element.src.endsWith(restaurantFallbackImage)) return;
  element.src = restaurantFallbackImage;
}

export function preloadRestaurantImages(
  restaurant: Restaurant,
  limit = 2,
  highPriority = false
) {
  if (typeof window === "undefined") return;

  getRestaurantImages(restaurant)
    .slice(0, limit)
    .forEach((src, index) => {
      const image = new window.Image();
      image.decoding = "async";
      image.loading = index === 0 && highPriority ? "eager" : "lazy";
      image.fetchPriority = index === 0 && highPriority ? "high" : "auto";
      image.src = src;
    });
}
