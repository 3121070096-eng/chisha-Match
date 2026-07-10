import type { Restaurant } from "@/data/restaurants";

export function formatRestaurantRating(restaurant: Pick<Restaurant, "rating">) {
  return restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "评分待确认";
}

export function formatRestaurantPrice(
  restaurant: Pick<Restaurant, "price">,
  suffix = "/人"
) {
  return restaurant.price > 0 ? `¥${restaurant.price}${suffix}` : "人均待确认";
}

export function formatRestaurantPriceSource(
  restaurant: Pick<Restaurant, "price" | "source">
) {
  if (restaurant.price <= 0) {
    return restaurant.source === "amap" ? "人均待确认（高德未提供）" : "人均待确认";
  }

  return restaurant.source === "amap"
    ? `¥${restaurant.price}/人`
    : `体验版人均 ¥${restaurant.price}/人`;
}

export function getRestaurantDataSourceLabel(restaurant: Pick<Restaurant, "source">) {
  return restaurant.source === "amap" ? "来自高德地点数据" : "体验版餐厅数据";
}
