import type { Restaurant } from "@/data/restaurants";
import type { DiningScenario } from "@/types";

export type RestaurantQualityContext = {
  areaKey?: string;
  locationLabel?: string;
  cuisinePreference?: string;
  cuisinePreferences?: string[];
  budget?: number | string;
  radiusM?: number;
  targetCount?: number;
  diningScenario?: DiningScenario | string | null;
};

export type RestaurantPoolSummary = {
  apiReturnedCount: number;
  afterFilterCount: number;
  dedupedCount: number;
  finalPoolCount: number;
  fallbackCount: number;
  hardRejectedCount?: number;
  qualifiedCount?: number;
  backupCount?: number;
  categoryCount?: number;
};

export type RestaurantPoolBuildResult = {
  restaurants: Restaurant[];
  summary: RestaurantPoolSummary;
};

export type RestaurantQualityBucket = "hardRejected" | "qualified" | "backup" | "rejected";

export type RestaurantQualityEvaluation = {
  bucket: RestaurantQualityBucket;
  score: number;
  category: string;
};

const hardRejectPattern =
  /便利店|超市|生鲜|食品零售|零食|副食|菜市场|烟酒|烘焙原料|自动售货|售货机|酒店|宾馆|旅馆|停车场|厕所|卫生间|银行|医院|药房|学校|写字楼|住宅|小区|地铁站|加油站|汽车|房产/;
const strictHardRejectPattern = /外卖档口|食堂窗口|食堂档口|美食广场档口/;
const teaOnlyPattern = /奶茶|茶饮|果茶|柠檬茶|手打柠檬|饮品站/;
const fastFoodPattern = /肯德基|麦当劳|汉堡王|赛百味|华莱士|快餐|炸鸡|盖饭|便当/;
const cafePattern = /咖啡|咖啡馆|咖啡店|轻食|贝果|brunch/;
const dessertPattern = /甜品|蛋糕|冰淇淋|烘焙|下午茶/;
const groupSignals = /聚餐|朋友|分享|环境|聊天|多人|小聚|约会|包间|宴会|烧烤|火锅|烤肉|酒馆|餐厅|饭店|料理/;
const dineInSignals = /餐饮|餐厅|饭店|小吃|快餐|火锅|烧烤|烤肉|咖啡|茶|甜品|面馆|粉|饭|粥|寿司|料理|披萨|西餐|中餐|早餐|食堂|酒馆|烧鸟|粤菜|川菜|湘菜|本帮菜/;

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

function getScenario(context: RestaurantQualityContext): DiningScenario {
  const value = context.diningScenario;
  return value === "casual" || value === "friends" || value === "date" || value === "colleagues" || value === "celebration" || value === "solo" || value === "late_night" || value === "afternoon_tea"
    ? value
    : "friends";
}

function preferenceTokens(preference?: string) {
  const value = preference?.trim();
  if (!value || value === "不限") return [];
  const presets: Array<[RegExp, string[]]> = [
    [/火锅|川渝/, ["火锅", "川渝", "重庆", "四川", "串串", "冒菜"]],
    [/日料|日本|寿司/, ["日料", "日本", "寿司", "刺身", "烧鸟"]],
    [/烧烤|烤肉|韩/, ["烧烤", "烤肉", "韩式", "韩餐", "烧鸟"]],
    [/咖啡|轻食/, ["咖啡", "轻食", "沙拉", "贝果", "简餐"]],
    [/粤|点心|早茶/, ["粤", "点心", "早茶", "茶餐厅"]],
    [/川|湘/, ["川", "湘", "麻辣", "冒菜", "小面"]],
  ];
  const matched = presets.find(([pattern]) => pattern.test(value));
  return Array.from(new Set([value, ...(matched?.[1] ?? [])])).map(normalizeText);
}

function allPreferenceTokens(context: RestaurantQualityContext) {
  return Array.from(new Set([
    ...preferenceTokens(context.cuisinePreference),
    ...(context.cuisinePreferences ?? []).flatMap((item) => preferenceTokens(item)),
  ]));
}

function restaurantText(restaurant: Restaurant) {
  return normalizeText([
    restaurant.name,
    restaurant.cuisine,
    restaurant.tags.join(" "),
    restaurant.address,
  ].join(" "));
}

export function classifyRestaurant(restaurant: Restaurant) {
  const text = restaurantText(restaurant);
  if (teaOnlyPattern.test(text)) return "tea";
  if (cafePattern.test(text)) return "cafe";
  if (dessertPattern.test(text)) return "dessert";
  if (fastFoodPattern.test(text)) return "fast_food";
  if (/火锅/.test(text)) return "hotpot";
  if (/烧烤|烤肉|烧鸟/.test(text)) return "grill";
  if (/日料|寿司|刺身|日本料理/.test(text)) return "japanese";
  if (/西餐|披萨|意大利|牛排|法餐/.test(text)) return "western";
  if (/川|湘|本帮|粤|中餐|家常|江浙|东北|新疆|云南|菜/.test(text)) return "chinese";
  if (/面|粉|粥|饺子|小吃/.test(text)) return "snack";
  return "restaurant";
}

export function isCuisineMatch(restaurant: Restaurant, cuisinePreference?: string) {
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
  const images = Array.from(new Set([...(raw.images ?? []), raw.image].filter(Boolean)));
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
    distance: raw.distance || "距离待确认",
  };
}

export function evaluateRestaurantQuality(raw: Restaurant, context: RestaurantQualityContext = {}): RestaurantQualityEvaluation {
  const restaurant = normalizeRestaurant(raw);
  const scenario = getScenario(context);
  const text = restaurantText(restaurant);
  const category = classifyRestaurant(restaurant);
  const distance = parseDistanceMeters(restaurant.distance);
  const maxDistance = context.radiusM ? Math.max(context.radiusM * 1.5, 4500) : 6000;
  const isTeaAllowed = scenario === "afternoon_tea" || scenario === "late_night" || scenario === "casual";
  const isLightAllowed = scenario === "afternoon_tea" || scenario === "solo" || scenario === "casual";
  const hasPlace = Boolean(restaurant.address || (restaurant.lat && restaurant.lng));

  if (!restaurant.name || (restaurant.source === "amap" && !hasPlace)) {
    return { bucket: "hardRejected", score: -100, category };
  }
  if (strictHardRejectPattern.test(text) || (hardRejectPattern.test(text) && !dineInSignals.test(text))) {
    return { bucket: "hardRejected", score: -90, category };
  }
  if (distance !== null && distance > maxDistance) {
    return { bucket: "hardRejected", score: -70, category };
  }
  if (!isTeaAllowed && category === "tea") {
    return { bucket: "hardRejected", score: -65, category };
  }

  let score = restaurant.source === "amap" ? 14 : 7;
  if (restaurant.address) score += 7;
  if (restaurant.lat && restaurant.lng) score += 4;
  if (restaurant.rating > 0) score += Math.min(10, Math.round(restaurant.rating * 2));
  if (restaurant.cuisine && restaurant.cuisine !== "餐厅") score += 4;
  if (restaurant.images.length > 0) score += restaurant.images.some((image) => image.includes("/api/restaurants/photo")) ? 7 : 3;
  else score -= 5;
  if (distance !== null) {
    if (distance <= 600) score += 12;
    else if (distance <= 1200) score += 9;
    else if (distance <= 2500) score += 5;
    else if (distance > 4500) score -= 7;
  }

  const tokens = allPreferenceTokens(context);
  if (tokens.length > 0) score += tokens.some((token) => text.includes(token)) ? 14 : -2;

  const budget = getBudgetValue(context.budget);
  if (budget && restaurant.price > 0) {
    const gap = Math.abs(restaurant.price - budget) / budget;
    if (gap <= 0.25) score += 10;
    else if (gap <= 0.5) score += 4;
    else if (restaurant.price > budget * 1.6) score -= 9;
  }

  if (scenario === "friends" || scenario === "colleagues" || scenario === "celebration") {
    if (groupSignals.test(text)) score += 10;
    if (category === "hotpot" || category === "grill" || category === "chinese") score += 6;
    if (!isLightAllowed && (category === "cafe" || category === "dessert")) score -= 12;
  }
  if (scenario === "date" && (category === "western" || category === "japanese" || category === "cafe" || category === "chinese")) score += 8;
  if (scenario === "late_night" && (category === "hotpot" || category === "grill" || category === "snack")) score += 10;
  if (scenario === "afternoon_tea" && (category === "cafe" || category === "dessert" || category === "tea")) score += 14;
  if (scenario === "solo" && (category === "snack" || category === "japanese" || category === "cafe")) score += 6;
  if (category === "fast_food") score -= scenario === "solo" || scenario === "casual" ? 4 : 16;

  const bucket: RestaurantQualityBucket = score >= 30 ? "qualified" : score >= 18 ? "backup" : "rejected";
  return { bucket, score, category };
}

export function filterRestaurants(restaurants: Restaurant[], context: RestaurantQualityContext = {}) {
  return restaurants
    .map(normalizeRestaurant)
    .filter((restaurant) => evaluateRestaurantQuality(restaurant, context).bucket !== "hardRejected");
}

export function scoreRestaurant(restaurant: Restaurant, context: RestaurantQualityContext = {}) {
  return evaluateRestaurantQuality(restaurant, context).score;
}

function dedupeKey(restaurant: Restaurant) {
  if (restaurant.sourcePlaceId) return `${restaurant.source ?? "unknown"}:${restaurant.sourcePlaceId}`;
  return `${normalizeText(restaurant.name)}:${normalizeText(restaurant.address)}`;
}

export function dedupeRestaurants(restaurants: Restaurant[], context: RestaurantQualityContext = {}) {
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

export function rankRestaurants(restaurants: Restaurant[], context: RestaurantQualityContext = {}) {
  return [...restaurants]
    .map((restaurant) => ({ ...restaurant, qualityScore: scoreRestaurant(restaurant, context) }))
    .sort((left, right) => {
      if ((right.qualityScore ?? 0) !== (left.qualityScore ?? 0)) return (right.qualityScore ?? 0) - (left.qualityScore ?? 0);
      return (parseDistanceMeters(left.distance) ?? Number.POSITIVE_INFINITY) - (parseDistanceMeters(right.distance) ?? Number.POSITIVE_INFINITY);
    });
}

export function buildRestaurantPool(restaurants: Restaurant[], fallbackRestaurants: Restaurant[], context: RestaurantQualityContext = {}): RestaurantPoolBuildResult {
  const target = Math.min(18, Math.max(10, context.targetCount ?? 14));
  const primary = dedupeRestaurants(filterRestaurants(restaurants, context), context);
  const fallback = dedupeRestaurants(filterRestaurants(fallbackRestaurants, context), context);
  const merged = dedupeRestaurants([...primary, ...fallback], context);
  const finalRestaurants = rankRestaurants(merged, context).slice(0, target);
  const fallbackKeys = new Set(fallback.map(dedupeKey));
  const hardRejectedCount = restaurants.filter((restaurant) => evaluateRestaurantQuality(restaurant, context).bucket === "hardRejected").length;
  const qualifiedCount = restaurants.filter((restaurant) => evaluateRestaurantQuality(restaurant, context).bucket === "qualified").length;
  const backupCount = restaurants.filter((restaurant) => evaluateRestaurantQuality(restaurant, context).bucket === "backup").length;
  return {
    restaurants: finalRestaurants,
    summary: {
      apiReturnedCount: restaurants.length,
      afterFilterCount: primary.length,
      dedupedCount: merged.length,
      finalPoolCount: finalRestaurants.length,
      fallbackCount: finalRestaurants.filter((restaurant) => fallbackKeys.has(dedupeKey(restaurant))).length,
      hardRejectedCount,
      qualifiedCount,
      backupCount,
      categoryCount: new Set(finalRestaurants.map(classifyRestaurant)).size,
    },
  };
}

export function getRestaurantQualityHighlights(restaurant: Restaurant, context: RestaurantQualityContext = {}) {
  const highlights: string[] = [];
  const distance = parseDistanceMeters(restaurant.distance);
  if (distance !== null && distance <= 900) highlights.push("最近");
  if (allPreferenceTokens(context).some((token) => restaurantText(restaurant).includes(token))) highlights.push("菜系匹配");
  if (isBudgetMatch(restaurant, context.budget)) highlights.push("预算友好");
  if (restaurant.address && restaurant.images.length > 0 && restaurant.rating > 0) highlights.push("信息完整");
  return highlights.slice(0, 2);
}

export function getRestaurantDistanceMeters(distance?: string) {
  return parseDistanceMeters(distance);
}
