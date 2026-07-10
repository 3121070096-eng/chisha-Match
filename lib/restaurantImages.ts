import type { Restaurant } from "@/data/restaurants";

export const restaurantFallbackImage = "/restaurants/fallback.png";

export type RestaurantFallbackType =
  | "hotpot"
  | "sushi"
  | "bbq"
  | "cafe"
  | "noodle"
  | "chinese"
  | "western"
  | "dessert"
  | "default";

const fallbackImageGroups: Record<RestaurantFallbackType, string[]> = {
  hotpot: ["/restaurants/hotpot-1.png", "/restaurants/hotpot-2.png", "/restaurants/hotpot-3.png"],
  sushi: ["/restaurants/sushi-1.png", "/restaurants/sushi-2.png", "/restaurants/sushi-3.png"],
  bbq: ["/restaurants/grill-1.png", "/restaurants/grill-2.png", "/restaurants/grill-3.png"],
  cafe: ["/restaurants/cafe-1.png", "/restaurants/cafe-2.png", "/restaurants/cafe-3.png"],
  noodle: ["/restaurants/noodles-1.png", "/restaurants/noodles-2.png", "/restaurants/noodles-3.png"],
  chinese: ["/restaurants/dimsum-1.png", "/restaurants/dumpling-1.png", "/restaurants/porridge-1.png"],
  western: ["/restaurants/pizza-1.png", "/restaurants/pizza-2.png", "/restaurants/pizza-3.png"],
  dessert: ["/restaurants/dessert-1.png", "/restaurants/dessert-2.png", "/restaurants/dessert-3.png"],
  default: ["/restaurants/fallback.png", "/restaurants/thai-1.png", "/restaurants/curry-1.png"]
};

export function getRestaurantFallbackType(restaurant: Pick<Restaurant, "name" | "cuisine" | "tags">): RestaurantFallbackType {
  const text = `${restaurant.name} ${restaurant.cuisine} ${restaurant.tags.join(" ")}`;
  if (/火锅|川渝|冒菜|麻辣/.test(text)) return "hotpot";
  if (/日料|日本|寿司|刺身|烧鸟/.test(text)) return "sushi";
  if (/烤肉|烧烤|韩式|韩餐/.test(text)) return "bbq";
  if (/咖啡|轻食|沙拉|贝果|茶/.test(text)) return "cafe";
  if (/面|粉|粥|小吃|快餐/.test(text)) return "noodle";
  if (/甜品|蛋糕|冰淇淋|奶茶/.test(text)) return "dessert";
  if (/披萨|意大利|西餐|汉堡|牛排/.test(text)) return "western";
  if (/中餐|川菜|湘菜|粤菜|本帮|点心|饺子/.test(text)) return "chinese";
  return "default";
}

export function getRestaurantFallbackImages(
  restaurant: Pick<Restaurant, "name" | "cuisine" | "tags">
) {
  return fallbackImageGroups[getRestaurantFallbackType(restaurant)];
}

export function getRestaurantImages(restaurant: Restaurant) {
  const images = Array.from(new Set(restaurant.images.filter(Boolean)));
  if (images.length > 0) return images;
  if (restaurant.image) return [restaurant.image];
  return getRestaurantFallbackImages(restaurant);
}

export function getRestaurantCover(restaurant: Restaurant) {
  return getRestaurantImages(restaurant)[0] ?? restaurantFallbackImage;
}

export function useFallbackImage(
  element: HTMLImageElement,
  restaurant?: Pick<Restaurant, "name" | "cuisine" | "tags">
) {
  const fallback = restaurant
    ? getRestaurantFallbackImages(restaurant)[0]
    : restaurantFallbackImage;
  if (element.src.endsWith(fallback)) return;
  element.src = fallback;
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
