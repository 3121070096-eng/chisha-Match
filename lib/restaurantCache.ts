import {
  DEFAULT_RESTAURANT_AREA,
  getRestaurantAreaKey,
  type Restaurant,
  type RestaurantAreaKey
} from "@/data/restaurants";
import { restaurantFallbackImage } from "@/lib/restaurantImages";
import type { Database, Json } from "@/types/supabase";

type RestaurantCacheRow = Database["public"]["Tables"]["restaurant_cache"]["Row"];
type RestaurantCacheInsert = Database["public"]["Tables"]["restaurant_cache"]["Insert"];

export function makeAmapRestaurantId(sourcePlaceId: string) {
  return `amap_${sourcePlaceId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeArea(areaKey?: string | null): RestaurantAreaKey {
  if (!areaKey) return DEFAULT_RESTAURANT_AREA;
  return getRestaurantAreaKey(areaKey);
}

function normalizeImages(images?: string[] | null) {
  const cleaned = (images ?? []).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [restaurantFallbackImage];
}

function makeReviews(id: string, name: string, rating: number) {
  const displayRating = rating > 0 ? rating : 4.5;

  return [
    {
      id: `${id}-review-1`,
      author: "饭局体验官",
      rating: displayRating,
      text: `体验版食评：${name} 来自地点搜索结果，适合先放进候选里和朋友一起判断。`
    },
    {
      id: `${id}-review-2`,
      author: "选择困难小分队",
      rating: displayRating,
      text: "体验版食评：真实评论暂未接入，这里只提供轻量参考，最终还是看大家右滑。"
    }
  ];
}

export function restaurantFromCacheRow(row: RestaurantCacheRow): Restaurant {
  const sourcePlaceId = row.source_place_id;
  const id =
    row.source === "amap" ? makeAmapRestaurantId(sourcePlaceId) : sourcePlaceId;
  const area = normalizeArea(row.area_key);
  const images = normalizeImages(row.images);
  const tags = row.tags?.length ? row.tags : ["餐饮", "地点搜索"];
  const cuisine = row.cuisine || tags[1] || "餐厅";
  const rating = typeof row.rating === "number" ? row.rating : 0;
  const price = row.price_level ? Number.parseInt(row.price_level, 10) : 0;

  return {
    id,
    name: row.name,
    image: images[0],
    images,
    cuisine,
    price: Number.isFinite(price) ? price : 0,
    rating,
    distance: row.distance_text || "距离待确认",
    tags,
    area,
    areas: [area],
    areaKey: row.area_key ?? area,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    priceLevel: row.price_level ?? undefined,
    source: row.source,
    sourcePlaceId,
    description: row.address
      ? `${row.name} 位于 ${row.address}，来自高德地点搜索结果。`
      : `${row.name} 来自高德地点搜索结果，地址信息待确认。`,
    recommendedReason:
      "这是一条真实地点搜索候选，适合在 V3.0 Spike 中验证大家是否愿意围绕真实附近餐厅做选择。",
    bestFor: ["真实附近候选", "多人快速筛选", "先滑再决定"],
    reviews: makeReviews(id, row.name, rating)
  };
}

export function cacheInsertFromRestaurant(
  restaurant: Restaurant
): RestaurantCacheInsert {
  const sourcePlaceId = restaurant.sourcePlaceId ?? restaurant.id;

  return {
    source: restaurant.source ?? "local_pack",
    source_place_id: sourcePlaceId,
    name: restaurant.name,
    address: restaurant.address ?? null,
    lat: restaurant.lat ?? null,
    lng: restaurant.lng ?? null,
    area_key: restaurant.areaKey ?? restaurant.area,
    cuisine: restaurant.cuisine,
    price_level: restaurant.price > 0 ? String(restaurant.price) : null,
    rating: restaurant.rating > 0 ? restaurant.rating : null,
    distance_text: restaurant.distance,
    tags: restaurant.tags,
    images: restaurant.images,
    photo_refs: [],
    raw: {
      id: restaurant.id,
      source: restaurant.source,
      sourcePlaceId: restaurant.sourcePlaceId
    } as Json
  };
}
