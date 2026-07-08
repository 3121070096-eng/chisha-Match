import type { Restaurant } from "@/data/restaurants";

export function getRestaurantImages(restaurant: Restaurant) {
  if (restaurant.images.length > 0) return restaurant.images;
  return restaurant.image ? [restaurant.image] : [];
}

export function getRestaurantCover(restaurant: Restaurant) {
  return getRestaurantImages(restaurant)[0] ?? "";
}

export function preloadRestaurantImages(restaurant: Restaurant, limit = 2) {
  if (typeof window === "undefined") return;

  getRestaurantImages(restaurant)
    .slice(0, limit)
    .forEach((src) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = src;
    });
}
