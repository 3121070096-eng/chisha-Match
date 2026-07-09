import type { Restaurant } from "@/data/restaurants";

export function formatRestaurantRating(restaurant: Pick<Restaurant, "rating">) {
  return restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "暂无评分";
}

export function formatRestaurantPrice(
  restaurant: Pick<Restaurant, "price">,
  suffix = "/人"
) {
  return restaurant.price > 0 ? `¥${restaurant.price}${suffix}` : "人均待确认";
}
