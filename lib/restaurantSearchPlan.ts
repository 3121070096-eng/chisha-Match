import type { DiningScenario } from "@/types";

export type RestaurantSearchPlanInput = {
  diningScenario?: DiningScenario | string | null;
  cuisinePreferences?: string[];
  budget?: number;
  radiusM?: number;
  refreshIndex?: number;
};

export type RestaurantSearchPlan = {
  keywords: string[];
  radiusM: number;
  maxRequests: number;
};

const scenarioKeywords: Record<DiningScenario, string[]> = {
  casual: ["餐厅", "家常菜", "面馆", "小馆"],
  friends: ["聚餐餐厅", "火锅", "烧烤", "本帮菜", "川菜", "日料"],
  date: ["西餐", "日料", "环境好的餐厅", "创意菜", "咖啡馆"],
  colleagues: ["商务餐厅", "中餐", "本帮菜", "火锅", "聚餐餐厅"],
  celebration: ["宴会餐厅", "特色餐厅", "西餐", "日料", "本帮菜"],
  solo: ["一人食", "面馆", "简餐", "日料", "小馆"],
  late_night: ["夜宵", "烧烤", "小龙虾", "火锅", "小吃"],
  afternoon_tea: ["咖啡馆", "甜品", "下午茶", "轻食", "蛋糕"],
};

function normalizeScenario(value?: string | null): DiningScenario {
  if (value && value in scenarioKeywords) return value as DiningScenario;
  return "friends";
}

function expandCuisine(cuisine: string) {
  const normalized = cuisine.trim();
  if (!normalized || normalized === "不限") return [];
  const variants: Array<[RegExp, string[]]> = [
    [/火锅|川渝/, ["火锅", "川菜"]],
    [/日料|寿司|日本/, ["日料", "寿司"]],
    [/烧烤|烤肉|韩/, ["烧烤", "韩式烤肉"]],
    [/本帮|江浙/, ["本帮菜", "江浙菜"]],
    [/粤|早茶|点心/, ["粤菜", "早茶"]],
    [/咖啡|甜品|下午茶/, ["咖啡馆", "甜品"]],
    [/西餐|意大利|法餐/, ["西餐", "意大利菜"]],
  ];
  const match = variants.find(([pattern]) => pattern.test(normalized));
  return [normalized, ...(match?.[1] ?? [])];
}

export function createRestaurantSearchPlan(input: RestaurantSearchPlanInput): RestaurantSearchPlan {
  const scenario = normalizeScenario(input.diningScenario);
  const cuisineKeywords = (input.cuisinePreferences ?? []).flatMap(expandCuisine);
  const ordered = [
    ...cuisineKeywords,
    ...scenarioKeywords[scenario],
    "餐厅",
  ];

  const unique = Array.from(new Set(ordered.map((item) => item.trim()).filter(Boolean)));
  const refreshOffset = Math.max(0, input.refreshIndex ?? 0) % Math.max(unique.length, 1);
  const rotated = [...unique.slice(refreshOffset), ...unique.slice(0, refreshOffset)];

  return {
    keywords: rotated.slice(0, 6),
    radiusM: Math.min(6000, Math.max(1200, input.radiusM ?? 3000) + (input.refreshIndex ? 500 : 0)),
    maxRequests: 6,
  };
}
