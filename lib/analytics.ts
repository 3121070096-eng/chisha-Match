"use client";

import { getSupabaseErrorDebugPayload } from "@/lib/supabaseErrors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Database, Json } from "@/types/supabase";
import type { Restaurant } from "@/data/restaurants";
import { getRestaurantFallbackType } from "@/lib/restaurantImages";

export type AnalyticsEventName =
  | "room_created"
  | "public_beta_home_viewed"
  | "homepage_viewed"
  | "create_room_cta_clicked"
  | "demo_cta_clicked"
  | "create_page_viewed"
  | "location_prompt_shown"
  | "create_room_validation_failed"
  | "location_selected"
  | "current_location_requested"
  | "current_location_succeeded"
  | "current_location_failed"
  | "location_search_started"
  | "location_search_succeeded"
  | "location_search_failed"
  | "preset_location_selected"
  | "invite_copied"
  | "invite_link_copied"
  | "invite_hint_viewed"
  | "start_swiping_clicked"
  | "join_page_viewed"
  | "member_name_submitted"
  | "joined_decided_room"
  | "member_joined"
  | "swipe_started"
  | "restaurant_liked"
  | "restaurant_passed"
  | "restaurant_card_exposed"
  | "match_created"
  | "match_modal_viewed"
  | "match_list_cta_clicked"
  | "match_list_viewed"
  | "final_decided"
  | "feedback_submitted"
  | "image_load_failed"
  | "fallback_restaurants_used"
  | "restaurant_api_requested"
  | "restaurant_api_succeeded"
  | "restaurant_api_failed"
  | "restaurant_cache_written"
  | "room_restaurant_pool_created"
  | "restaurant_pool_quality_checked"
  | "restaurant_search_plan_created"
  | "restaurant_pool_confirmed"
  | "restaurant_pool_refresh_requested"
  | "restaurant_pool_refreshed"
  | "restaurant_pool_refresh_failed"
  | "restaurant_pool_completed"
  | "restaurant_pool_fallback_only"
  | "restaurant_image_fallback_used"
  | "decision_recommendation_viewed"
  | "decision_random_started"
  | "decision_random_result"
  | "decision_random_accepted"
  | "decision_vote_cast"
  | "decision_vote_changed"
  | "final_result_copied"
  | "share_text_copied"
  | "share_card_viewed"
  | "decided_room_viewed"
  | "decided_room_landed"
  | "room_recreated_from_previous"
  | "restart_with_new_location_clicked"
  | "swipe_tutorial_viewed"
  | "swipe_tutorial_dismissed"
  | "demo_started"
  | "demo_finished"
  | "demo_to_real_room_clicked"
  | "privacy_page_viewed"
  | "about_page_viewed"
  | "test_guide_viewed"
  | "room_not_found"
  | "invalid_room_token"
  | "restaurant_pool_load_failed"
  | "supabase_connection_failed"
  | "debug_page_viewed"
  | "debug_page_auth_failed"
  | "amap_opened";

export type TrackEventInput = {
  roomId?: string | null;
  memberId?: string | null;
  eventName: AnalyticsEventName | string;
  metadata?: Record<string, unknown>;
};

export type FeedbackRating = "good" | "ok" | "bad";

export const feedbackImprovementAreas = [
  { value: "how_it_works", label: "看不懂怎么玩" },
  { value: "create_room", label: "创建饭局" },
  { value: "location", label: "选择地点" },
  { value: "invite", label: "邀请朋友" },
  { value: "join_room", label: "加入房间" },
  { value: "swipe", label: "滑餐厅" },
  { value: "match_list", label: "查看共同心动榜" },
  { value: "decision", label: "最终决定" },
  { value: "share", label: "分享结果" },
  { value: "restaurant_quality", label: "餐厅不够准" },
  { value: "restaurant_quality_low", label: "餐厅整体质量不高" },
  { value: "restaurant_few_desirable", label: "真正想去的餐厅太少" },
  { value: "restaurant_repetitive", label: "餐厅类型太重复" },
  { value: "budget_mismatch", label: "餐厅不符合预算" },
  { value: "scenario_mismatch", label: "餐厅不符合饭局场景" },
  { value: "distance_mismatch", label: "距离不合适" },
  { value: "restaurant_info_incomplete", label: "信息不完整" },
  { value: "image_untrustworthy", label: "图片不可信" },
  { value: "final_result_unsatisfying", label: "最终结果不满意" },
  { value: "image_performance", label: "图片 / 加载太慢" },
  { value: "other", label: "其他" }
] as const;

export type FeedbackImprovementArea = (typeof feedbackImprovementAreas)[number]["value"];

export type SubmitFeedbackInput = {
  roomId?: string | null;
  rating: FeedbackRating;
  comment?: string;
  improvementArea?: FeedbackImprovementArea | null;
  decisionSatisfaction?: number | null;
};

function toJson(metadata?: Record<string, unknown>) {
  return (metadata ?? {}) as Json;
}

export async function trackEvent({
  roomId,
  memberId,
  eventName,
  metadata
}: TrackEventInput) {
  try {
    const supabase = getSupabaseClient();
    const insertPayload: Database["public"]["Tables"]["events"]["Insert"] = {
      room_id: roomId ?? null,
      member_id: memberId ?? null,
      event_name: eventName,
      metadata: toJson(metadata)
    };
    const { error } = await supabase.from("events").insert(insertPayload);

    if (error) {
      console.error("[Analytics] trackEvent failed", getSupabaseErrorDebugPayload(error));
    }
  } catch (error) {
    console.error("[Analytics] trackEvent crashed", getSupabaseErrorDebugPayload(error));
  }
}

export async function submitFeedback({ roomId, rating, comment, improvementArea, decisionSatisfaction }: SubmitFeedbackInput) {
  const supabase = getSupabaseClient();
  const insertPayload: Database["public"]["Tables"]["feedback"]["Insert"] = {
    room_id: roomId ?? null,
    rating,
    comment: comment?.trim() || null,
    improvement_area: improvementArea ?? null,
    decision_satisfaction: decisionSatisfaction ?? null
  };
  const { data, error } = await supabase
    .from("feedback")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("[Feedback] submit failed", getSupabaseErrorDebugPayload(error));
    throw error;
  }

  void trackEvent({
    roomId,
    eventName: "feedback_submitted",
    metadata: {
      rating,
      improvement_area: improvementArea ?? null,
      decision_satisfaction: decisionSatisfaction ?? null
    }
  });

  return data;
}

export function trackImageLoadFailed(restaurant: Restaurant, imageUrl: string) {
  const fallbackType = getRestaurantFallbackType(restaurant);
  const metadata = {
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    image_url: imageUrl,
    area_key: restaurant.area,
    fallback_type: fallbackType
  };

  void trackEvent({
    eventName: "image_load_failed",
    metadata
  });
  void trackEvent({
    eventName: "restaurant_image_fallback_used",
    metadata
  });
}
