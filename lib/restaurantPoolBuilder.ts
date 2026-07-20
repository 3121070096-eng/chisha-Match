import type { Restaurant } from "@/data/restaurants";
import {
  classifyRestaurant,
  dedupeRestaurants,
  evaluateRestaurantQuality,
  rankRestaurants,
  type RestaurantQualityContext,
} from "@/lib/restaurantQuality";

export type RestaurantPoolBuildStats = {
  totalApiResults: number;
  hardRejectedCount: number;
  qualifiedCount: number;
  backupCount: number;
  dedupedCount: number;
  finalPoolCount: number;
  categoryCount: number;
  sourceMix: "amap" | "mixed" | "cache" | "none";
};

export type HighQualityRestaurantPool = {
  restaurants: Restaurant[];
  stats: RestaurantPoolBuildStats;
};

function getBrandKey(restaurant: Restaurant) {
  return restaurant.name
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/(旗舰店|总店|分店|店|餐厅|饭店|小馆|酒家|料理|烤肉|火锅)$/g, "")
    .replace(/[\s·,，.。\-_/]/g, "")
    .trim();
}

export function selectDiverseRestaurantPool(
  restaurants: Restaurant[],
  context: RestaurantQualityContext = {},
) {
  const target = Math.min(18, Math.max(10, context.targetCount ?? 14));
  const categoryLimit = Math.max(2, Math.ceil(target * 0.35));
  const ranked = rankRestaurants(restaurants, context);
  const selected: Restaurant[] = [];
  const brands = new Map<string, number>();
  const categories = new Map<string, number>();
  const hasExplicitCuisine = Boolean(context.cuisinePreference || context.cuisinePreferences?.length);
  const dessertFriendly = context.diningScenario === "afternoon_tea" || context.diningScenario === "late_night";

  for (const restaurant of ranked) {
    const category = classifyRestaurant(restaurant);
    const brand = getBrandKey(restaurant);
    const categoryCount = categories.get(category) ?? 0;
    const brandCount = brands.get(brand) ?? 0;
    const isLight = category === "cafe" || category === "dessert" || category === "tea";
    const maxBrandCount = (restaurant.qualityScore ?? 0) >= 58 ? 2 : 1;

    if (brand && brandCount >= maxBrandCount) continue;
    if (categoryCount >= categoryLimit) continue;
    if (!dessertFriendly && isLight && selected.filter((item) => {
      const selectedCategory = classifyRestaurant(item);
      return selectedCategory === "cafe" || selectedCategory === "dessert" || selectedCategory === "tea";
    }).length >= 1) continue;
    if (category === "fast_food" && selected.filter((item) => classifyRestaurant(item) === "fast_food").length >= 2) continue;

    selected.push(restaurant);
    if (brand) brands.set(brand, brandCount + 1);
    categories.set(category, categoryCount + 1);
    if (selected.length >= target) break;
  }

  // When cuisine is unconstrained, reserve enough variety without sacrificing quality.
  if (!hasExplicitCuisine && new Set(selected.map(classifyRestaurant)).size < 4) {
    for (const restaurant of ranked) {
      if (selected.some((item) => item.id === restaurant.id)) continue;
      const category = classifyRestaurant(restaurant);
      if (new Set(selected.map(classifyRestaurant)).has(category)) continue;
      selected.push(restaurant);
      if (selected.length >= target) break;
    }
  }

  return selected;
}

export function buildHighQualityRestaurantPool(
  apiRestaurants: Restaurant[],
  cachedRestaurants: Restaurant[] = [],
  context: RestaurantQualityContext = {},
): HighQualityRestaurantPool {
  const combined = [...apiRestaurants, ...cachedRestaurants];
  const evaluations = combined.map((restaurant) => ({
    restaurant,
    evaluation: evaluateRestaurantQuality(restaurant, context),
  }));
  const hardRejectedCount = evaluations.filter((item) => item.evaluation.bucket === "hardRejected").length;
  const qualified = evaluations
    .filter((item) => item.evaluation.bucket === "qualified")
    .map((item) => ({ ...item.restaurant, qualityScore: item.evaluation.score }));
  const backup = evaluations
    .filter((item) => item.evaluation.bucket === "backup")
    .map((item) => ({ ...item.restaurant, qualityScore: item.evaluation.score }));
  const dedupedQualified = dedupeRestaurants(qualified, context);
  const dedupedBackup = dedupeRestaurants(backup, context)
    .filter((restaurant) => !dedupedQualified.some((item) => item.id === restaurant.id));
  const candidates = dedupedQualified.length >= 10
    ? dedupedQualified
    : [...dedupedQualified, ...dedupedBackup];
  const finalRestaurants = selectDiverseRestaurantPool(candidates, context);

  return {
    restaurants: finalRestaurants,
    stats: {
      totalApiResults: apiRestaurants.length,
      hardRejectedCount,
      qualifiedCount: dedupedQualified.length,
      backupCount: dedupedBackup.length,
      dedupedCount: candidates.length,
      finalPoolCount: finalRestaurants.length,
      categoryCount: new Set(finalRestaurants.map(classifyRestaurant)).size,
      sourceMix: apiRestaurants.length > 0 ? (cachedRestaurants.length > 0 ? "mixed" : "amap") : cachedRestaurants.length > 0 ? "cache" : "none",
    },
  };
}
