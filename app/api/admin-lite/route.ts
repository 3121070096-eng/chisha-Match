import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type AdminRequest = {
  password?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function readRequest(request: Request) {
  try {
    return (await request.json()) as AdminRequest;
  } catch {
    return {} as AdminRequest;
  }
}

async function recordAdminEvent(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  eventName: "debug_page_viewed" | "debug_page_auth_failed"
) {
  const { error } = await client.from("events").insert({ event_name: eventName });
  if (error) console.error("[AdminLite] record event failed", error);
}

export async function POST(request: Request) {
  if (process.env.ENABLE_DEBUG_PAGE !== "true") {
    return NextResponse.json({ message: "NOT_ENABLED" }, { status: 404 });
  }

  const expectedPassword = process.env.DEBUG_ADMIN_PASSWORD;
  const client = getAdminClient();

  if (!expectedPassword || !client) {
    console.error("[AdminLite] missing server-only debug configuration");
    return NextResponse.json({ message: "DEBUG_NOT_CONFIGURED" }, { status: 503 });
  }

  const { password } = await readRequest(request);
  if (!password || password !== expectedPassword) {
    await recordAdminEvent(client, "debug_page_auth_failed");
    return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const today = todayStart.toISOString();

    const [
      rooms,
      roomsToday,
      membersToday,
      swipesToday,
      matchEvents,
      finalEvents,
      feedbackCount,
      amapFailures,
      fallbackUses,
      feedback,
      events
    ] = await Promise.all([
      client.from("rooms").select("id", { count: "exact", head: true }),
      client.from("rooms").select("id", { count: "exact", head: true }).gte("created_at", today),
      client.from("room_members").select("id", { count: "exact", head: true }).gte("joined_at", today),
      client.from("swipes").select("id", { count: "exact", head: true }).gte("created_at", today),
      client.from("events").select("id", { count: "exact", head: true }).eq("event_name", "match_created"),
      client.from("events").select("id", { count: "exact", head: true }).eq("event_name", "final_decided"),
      client.from("feedback").select("id", { count: "exact", head: true }),
      client.from("events").select("id", { count: "exact", head: true }).eq("event_name", "restaurant_api_failed"),
      client.from("events").select("id", { count: "exact", head: true }).eq("event_name", "fallback_restaurants_used"),
      client
        .from("feedback")
        .select("id, rating, comment, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("events")
        .select("id, event_name, created_at, room_id")
        .order("created_at", { ascending: false })
        .limit(50)
    ]);

    const failures = [
      rooms.error,
      roomsToday.error,
      membersToday.error,
      swipesToday.error,
      matchEvents.error,
      finalEvents.error,
      feedbackCount.error,
      amapFailures.error,
      fallbackUses.error,
      feedback.error,
      events.error
    ].filter(Boolean);

    if (failures.length > 0) {
      console.error("[AdminLite] load stats failed", failures);
      return NextResponse.json({ message: "LOAD_FAILED" }, { status: 500 });
    }

    await recordAdminEvent(client, "debug_page_viewed");

    return NextResponse.json({
      stats: {
        rooms: rooms.count ?? 0,
        roomsToday: roomsToday.count ?? 0,
        membersToday: membersToday.count ?? 0,
        swipesToday: swipesToday.count ?? 0,
        matchEvents: matchEvents.count ?? 0,
        finalEvents: finalEvents.count ?? 0,
        feedback: feedbackCount.count ?? 0,
        amapFailures: amapFailures.count ?? 0,
        fallbackUses: fallbackUses.count ?? 0
      },
      feedback: (feedback.data ?? []).map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.created_at
      })),
      events: (events.data ?? []).map((item) => ({
        id: item.id,
        name: item.event_name,
        createdAt: item.created_at,
        hasRoom: Boolean(item.room_id)
      }))
    });
  } catch (error) {
    console.error("[AdminLite] route crashed", error);
    return NextResponse.json({ message: "LOAD_FAILED" }, { status: 500 });
  }
}
