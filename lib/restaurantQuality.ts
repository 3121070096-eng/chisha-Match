import type { Restaurant } from "@/data/restaurants";

export type RestaurantQualityContext = {
  areaKey?: string;
  locationLabel?: string;
  cuisinePreference?: string;
  budget?: number | string;
  radiusM?: number;
  targetCount?: number;
};

export type RestaurantPoolSummary = {
  apiReturnedCount: number;
  afterFilterCount: number;
  dedupedCount: number;
  finalPoolCount: number;
  fallbackCount: number;
};

export type RestaurantPoolBuildResult = {
  restaurants: Restaurant[];
  summary: RestaurantPoolSummary;
};

const DEFAULT_TARGET_COUNT = 20;
const MIN_TARGET_COUNT = 16;
const MAX_TARGET_COUNT = 24;

const clearNonFoodPattern =
  /便利店|超市|生鲜|食品零售|零食|副食|菜市场|酒店|宾馆|旅馆|停车场|厕所|卫生间|银行|医院|药房|学校|写字楼|住宅|小区|地铁站|加油站|汽车|房产/;

const dineInSignals =
  /餐饮|餐厅|饭店|小吃|快餐|火锅|烧烤|烤肉|咖啡|茶|甜品|面馆|粉|饭|粥|寿司|料理|披萨|西餐|中餐|早餐|食堂|酒馆|烧鸟|粤菜|川菜|湘菜|本帮菜/;

const groupSignals = /聚餐|朋友|分享|环境|聊天|性价比|多人|小聚|约会/;

function normalizeText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[\s·,，.。()（）\-_/]/g, "")
    .trim();
}

function parseDistanceMeters(distance?: string) {
  const text = (distance ?? "").toLowerCase().replace(/\s/g, "");
  const kilometer = text.match(/(\d+(?:\.\d+)?)km/);
  if (kilometer) return Math.round(Number(kilometer[1]) * 1000);

  const meter = text.match(/(\d+(?:\.\d+)?)m/);
  if (meter) return Math.round(Number(meter[1]));

  return null;
}

function getBudgetValue(budget?: number | string) {
  const parsed = typeof budget === "number" ? budget : Number.parseFloat(budget ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function preferenceTokens(preference?: string) {
  const value = preference?.trim();
  if (!value || value === "不限") return [];

  const presetTokens: Array<[RegExp, string[]]> = [
    [/火锅|川渝/, ["火锅", "川渝", "重庆", "四川", "串串", "冒菜"]],
    [/日料|日本|寿司/, ["日料", "日本", "寿司", "刺身", "烧鸟"]],
    [/烧烤|烤肉|韩/, ["烧烤", "烤肉", "韩式", "韩餐", "烧鸟"]],
    [/咖啡|轻食/, ["咖啡", "轻食", "沙拉", "贝果", "简餐"]],
    [/粤|点心|早茶/, ["粤", "点心", "早茶", "茶餐厅"]],
    [/川|湘/, ["川", "湘", "麻辣", "冒菜", "小面"]]
  ];
  const matched = presetTokens.find(([pattern]) => pattern.test(value));
  return Array.from(new Set([value, ...(matched?.[1] ?? [])])).map(normalizeText);
}

function restaurantText(restaurant: Restaurant) {
  return normalizeText(
    [restaurant.name, restaurant.cuisine, restaurant.tags.join(" "), restaurant.address].join(" ")
  );
}

export function isCuisineMatch(
  restaurant: Restaurant,
  cuisinePreference?: string
) {
  const tokens = preferenceTokens(cuisinePreference);
  if (tokens.length === 0) return false;
  const text = restaurantText(restaurant);
  return tokens.some((token) => text.includes(token));
}

export function isBudgetMatch(restaurant: Restaurant, budget?: number | string) {
  const target = getBudgetValue(budget);
  if (!target || restaurant.price <= 0) return false;
  return Math.abs(restaurant.price - target) / target <= 0.35;
}

export function normalizeRestaurant(raw: Restaurant): Restaurant {
  const name = raw.name.trim() || "未命名餐厅";
  const images = Array.from(
    new Set([...(raw.images ?? []), raw.image].filter(Boolean))
  );
  const tags = Array.from(new Set(raw.tags.map((tag) => tag.trim()).filter(Boolean)));

  return {
    ...raw,
    name,
    image: images[0] ?? raw.image,
    images,
    cuisine: raw.cuisine.trim() || "餐厅",
    tags,
    source: raw.source ?? "local_pack",
    price: Number.isFinite(raw.price) && raw.price > 0 ? Math.round(raw.price) : 0,
    rating: Number.isFinite(raw.rating) && raw.rating > 0 ? raw.rating : 0,
    distance: raw.distance || "距离待确认"
  };
}

export function filterRestaurants(
  restaurants: Restaurant[],
  context: RestaurantQualityContext = {}
) {
  const maxDistance = context.radiusM ? Math.max(context.radiusM * 1.8, 6000) : null;

  return restaurants
    .map(normalizeRestaurant)
    .filter((restaurant) => {
      const text = restaurantText(restaurant);
      const hasLocation = Boolean(restaurant.address || (restaurant.lat && restaurant.lng));
      const isApiRestaurant = restaurant.source === "amap";
      const distance = parseDistanceMeters(restaurant.distance);

      if (!restaurant.name || (isApiRestaurant && !hasLocation)) return false;
      if (clearNonFoodPattern.test(text) && !dineInSignals.test(text)) return false;
      if (maxDistance && distance && distance > maxDistance) return false;
      return true;
    });
}

export function scoreRestaurant(
  restaurant: Restaurant,
  context: RestaurantQualityContext = {}
) {
  let score = restaurant.source === "amap" ? 12 : 8;
  const distance = parseDistanceMeters(restaurant.distance);
  const text = restaurantText(restaurant);
  const hasApiImage = restaurant.images.some((image) => image.includes("/api/restaurants/photo"));
  const hasLocalImage = restaurant.images.some((image) => image.startsWith("/restaurants/"));

  if (restaurant.address) score += 8;
  if (restaurant.lat && restaurant.lng) score += 4;
  if (restaurant.rating > 0) score += Math.min(10, Math.round(restaurant.rating * 2));
  if (restaurant.cuisine && restaurant.cuisine !== "餐厅") score += 5;
  if (hasApiImage) score += 7;
  else if (hasLocalImage) score += 3;
  else score -= 5;

  if (distance !== null) {
    if (distance <= 600) score += 12;
    else if (distance <= 1200) score += 9;
    else if (distance <= 2500) score += 5;
    else if (distance > 5000) score -= 8;
  }

  if (isCuisineMatch(restaurant, context.cuisinePreference)) score += 14;
  else if (preferenceTokens(context.cuisinePreference).length > 0) score -= 3;

  const budget = getBudgetValue(context.budget);
  if (budget && restaurant.price > 0) {
    const gap = Math.abs(restaurant.price - budget) / budget;
    if (gap <= 0.25) score += 10;
    else if (gap <= 0.5) score += 5;
    else if (restaurant.price > budget * 1.6) score -= 8;
  } else if (budget && restaurant.source === "amap") {
    score -= 1;
  }

  if (groupSignals.test(text)) score += 5;
  if (clearNonFoodPattern.test(text)) score -= 30;
  return score;
}

function dedupeKey(restaurant: Restaurant) {
  if (restaurant.sourcePlaceId) return `${restaurant.source ?? "unknown"}:${restaurant.sourcePlaceId}`;
  return `${normalizeText(restaurant.name)}:${normalizeText(restaurant.address)}`;
}

export function dedupeRestaurants(
  restaurants: Restaurant[],
  context: RestaurantQualityContext = {}
) {
  const bestByKey = new Map<string, Restaurant>();

  restaurants.forEach((restaurant) => {
    const normalized = normalizeRestaurant(restaurant);
    const key = dedupeKey(normalized);
    const existing = bestByKey.get(key);

    if (!existing || scoreRestaurant(normalized, context) > scoreRestaurant(existing, context)) {
      bestByKey.set(key, normalized);
    }
  });

  return Array.from(bestByKey.values());
}

export function rankRestaurants(
  restaurants: Restaurant[],
  context: RestaurantQualityContext = {}
) {
  return [...restaurants]
    .map((restaurant) => ({ ...restaurant, qualityScore: scoreRestaurant(restaurant, context) }))
    .sort((left, right) => {
      if ((right.qualityScore ?? 0) !== (left.qualityScore ?? 0)) {
        return (right.qualityScore ?? 0) - (left.qualityScore ?? 0);
      }

      const leftDistance = parseDistanceMeters(left.distance) ?? Number.POSITIVE_INFINITY;
      const rightDistance = parseDistanceMeters(right.distance) ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
}

export function completeRestaurantPool(
  restaurants: Restaurant[],
  fallbackRestaurants: Restaurant[],
  context: RestaurantQualityContext = {}
) {
  const targetCount = Math.min(
    MAX_TARGET_COUNT,
    Math.max(MIN_TARGET_COUNT, context.targetCount ?? DEFAULT_TARGET_COUNT)
  );
  const primary = rankRestaurants(dedupeRestaurants(filterRestaurants(restaurants, context), context), context);
  const fallback = rankRestaurants(
    dedupeRestaurants(filterRestaurants(fallbackRestaurants, context), context),
    context
  );
  const seen = new Set(primary.map(dedupeKey));
  const additions = fallback.filter((restaurant) => {
    const key = dedupeKey(restaurant);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return rankRestaurants([...primary, ...additions].slice(0, targetCount), context);
}

export function buildRestaurantPool(
  restaurants: Restaurant[],
  fallbackRestaurants: Restaurant[],
  context: RestaurantQualityContext = {}
): RestaurantPoolBuildResult {
  const filtered = filterRestaurants(restaurants, context);
  const deduped = dedupeRestaurants(filtered, context);
  const finalRestaurants = completeRestaurantPool(deduped, fallbackRestaurants, context);
  const fallbackIds = new Set(
    fallbackRestaurants.map((restaurant) => dedupeKey(normalizeRestaurant(restaurant)))
  );
  const fallbackCount = finalRestaurants.filter((restaurant) =>
    fallbackIds.has(dedupeKey(restaurant))
  ).length;

  return {
    restaurants: finalRestaurants,
    summary: {
      apiReturnedCount: restaurants.length,
      afterFilterCount: filtered.length,
      dedupedCount: deduped.length,
      finalPoolCount: finalRestaurants.length,
      fallbackCount
    }
  };
}

export function getRestaurantQualityHighlights(
  restaurant: Restaurant,
  context: RestaurantQualityContext = {}
) {
  const highlights: string[] = [];
  const distance = parseDistanceMeters(restaurant.distance);

  if (distance !== null && distance <= 900) highlights.push("最近");
  if (isCuisineMatch(restaurant, context.cuisinePreference)) highlights.push("菜系匹配");
  if (isBudgetMatch(restaurant, context.budget)) highlights.push("预算友好");
  if (restaurant.address && restaurant.images.length > 0 && restaurant.rating > 0) {
    highlights.push("信息完整");
  }

  return highlights.slice(0, 2);
}

export function getRestaurantDistanceMeters(distance?: string) {
  return parseDistanceMeters(distance);
}
