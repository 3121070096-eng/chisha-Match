"use client";

import { getSupabaseErrorDebugPayload } from "@/lib/supabaseErrors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Database, Json } from "@/types/supabase";
import type { Restaurant } from "@/data/restaurants";

export type AnalyticsEventName =
  | "room_created"
  | "location_selected"
  | "invite_copied"
  | "member_joined"
  | "swipe_started"
  | "restaurant_liked"
  | "restaurant_passed"
  | "match_created"
  | "match_list_viewed"
  | "final_decided"
  | "feedback_submitted"
  | "image_load_failed"
  | "fallback_restaurants_used"
  | "restaurant_api_failed";

export type TrackEventInput = {
  roomId?: string | null;
  memberId?: string | null;
  eventName: AnalyticsEventName | string;
  metadata?: Record<string, unknown>;
};

export type FeedbackRating = "good" | "ok" | "bad";

export type SubmitFeedbackInput = {
  roomId?: string | null;
  rating: FeedbackRating;
  comment?: string;
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

export async function submitFeedback({ roomId, rating, comment }: SubmitFeedbackInput) {
  const supabase = getSupabaseClient();
  const insertPayload: Database["public"]["Tables"]["feedback"]["Insert"] = {
    room_id: roomId ?? null,
    rating,
    comment: comment?.trim() || null
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
    metadata: { rating }
  });

  return data;
}

export function trackImageLoadFailed(restaurant: Restaurant, imageUrl: string) {
  void trackEvent({
    eventName: "image_load_failed",
    metadata: {
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      image_url: imageUrl,
      area_key: restaurant.area
    }
  });
}
