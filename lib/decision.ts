import type { Restaurant } from "@/data/restaurants";
import {
  getRestaurantDistanceMeters,
  isBudgetMatch,
  isCuisineMatch,
  scoreRestaurant,
  type RestaurantQualityContext
} from "@/lib/restaurantQuality";
import type { MatchItem } from "@/types";

export type DecisionContext = RestaurantQualityContext & {
  decisionVoteCounts?: Record<string, number>;
};

export type RecommendedMatch = {
  item: MatchItem;
  score: number;
  reasonTags: string[];
  reasonText: string;
};

export function getDecisionVoteCount(
  restaurantId: string,
  voteCounts: Record<string, number> = {}
) {
  return voteCounts[restaurantId] ?? 0;
}

export function getRecommendationScore(item: MatchItem, context: DecisionContext = {}) {
  const { restaurant, match } = item;
  const votes = getDecisionVoteCount(restaurant.id, context.decisionVoteCounts);
  const distance = getRestaurantDistanceMeters(restaurant.distance);
  let score = match.count * 36 + scoreRestaurant(restaurant, context);

  score += votes * 44;
  if (restaurant.source === "amap") score += 8;
  if (restaurant.address && restaurant.images.length > 0) score += 5;
  if (distance !== null && distance <= 1000) score += 4;
  return score;
}

export function getRecommendationReasonTags(
  item: MatchItem,
  context: DecisionContext = {}
) {
  const { restaurant, match } = item;
  const tags: string[] = [];
  const votes = getDecisionVoteCount(restaurant.id, context.decisionVoteCounts);
  const distance = getRestaurantDistanceMeters(restaurant.distance);

  if (votes > 0) tags.push(`${votes} 票领先`);
  if (match.count >= 2) tags.push(`${match.count} 人共同喜欢`);
  if (distance !== null && distance <= 1000) tags.push("距离较近");
  if (isBudgetMatch(restaurant, context.budget)) tags.push("符合预算");
  if (isCuisineMatch(restaurant, context.cuisinePreference)) tags.push("菜系匹配");
  if (restaurant.source === "amap") tags.push("真实餐厅");

  return tags.slice(0, 3);
}

export function getRecommendedMatch(
  items: MatchItem[],
  context: DecisionContext = {}
): RecommendedMatch | null {
  if (items.length === 0) return null;

  const item = [...items].sort(
    (left, right) => getRecommendationScore(right, context) - getRecommendationScore(left, context)
  )[0];
  const reasonTags = getRecommendationReasonTags(item, context);
  const sentence = reasonTags.length > 0 ? reasonTags.join("，") : "大家的共同心动";

  return {
    item,
    score: getRecommendationScore(item, context),
    reasonTags,
    reasonText: `推荐理由：${sentence}。`
  };
}

export function getAmapNavigationUrl(
  restaurant: Pick<Restaurant, "name" | "address" | "lat" | "lng" | "source">
) {
  if (restaurant.source !== "amap") return null;

  if (typeof restaurant.lat === "number" && typeof restaurant.lng === "number") {
    const params = new URLSearchParams({
      position: `${restaurant.lng},${restaurant.lat}`,
      name: restaurant.name,
      callnative: "1"
    });
    return `https://uri.amap.com/marker?${params.toString()}`;
  }

  if (restaurant.address || restaurant.name) {
    const params = new URLSearchParams({
      keyword: [restaurant.name, restaurant.address].filter(Boolean).join(" "),
      callnative: "1"
    });
    return `https://uri.amap.com/search?${params.toString()}`;
  }

  return null;
}
