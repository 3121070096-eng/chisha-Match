import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseErrorDebugPayload } from "@/lib/supabaseErrors";
import type { DecisionVote } from "@/types";
import type { Database } from "@/types/supabase";

type DecisionVoteRow = Database["public"]["Tables"]["decision_votes"]["Row"];

function mapDecisionVote(row: DecisionVoteRow): DecisionVote {
  return {
    id: row.id,
    roomId: row.room_id,
    memberId: row.member_id,
    restaurantId: row.restaurant_id,
    createdAt: row.created_at
  };
}

export function getDecisionVoteCounts(votes: DecisionVote[]) {
  return votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.restaurantId] = (counts[vote.restaurantId] ?? 0) + 1;
    return counts;
  }, {});
}

export async function loadDecisionVotes(roomId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("decision_votes")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[DecisionVotes] load failed", getSupabaseErrorDebugPayload(error));
    throw error;
  }

  return (data ?? []).map(mapDecisionVote);
}

export async function castDecisionVote({
  roomId,
  memberId,
  restaurantId
}: {
  roomId: string;
  memberId: string;
  restaurantId: string;
}) {
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("decision_votes")
    .select("*")
    .eq("room_id", roomId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (existingError) {
    console.error("[DecisionVotes] load current vote failed", getSupabaseErrorDebugPayload(existingError));
    throw existingError;
  }

  const changed = Boolean(existing && existing.restaurant_id !== restaurantId);
  if (existing?.restaurant_id === restaurantId) {
    return { vote: mapDecisionVote(existing), changed: false, unchanged: true };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("decision_votes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("[DecisionVotes] replace vote delete failed", getSupabaseErrorDebugPayload(deleteError));
      throw deleteError;
    }
  }

  const { data, error } = await supabase
    .from("decision_votes")
    .insert({ room_id: roomId, member_id: memberId, restaurant_id: restaurantId })
    .select("*")
    .single();

  if (error) {
    console.error("[DecisionVotes] cast failed", getSupabaseErrorDebugPayload(error));
    throw error;
  }

  return { vote: mapDecisionVote(data), changed, unchanged: false };
}
