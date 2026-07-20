import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type AdminPeriod = "today" | "7d" | "all";

type AdminRequest = {
  password?: string;
  period?: AdminPeriod;
};

type FunnelDefinition = {
  key: string;
  label: string;
  eventNames: string[];
  countMode?: "sum" | "max" | "primaryFallback";
};

const funnelDefinitions: FunnelDefinition[] = [
  { key: "home", label: "首页访问", eventNames: ["homepage_viewed", "public_beta_home_viewed"], countMode: "max" },
  { key: "createCta", label: "创建饭局点击", eventNames: ["create_room_cta_clicked"] },
  { key: "roomCreated", label: "创建房间成功", eventNames: ["room_created"] },
  {
    key: "locationSelected",
    label: "地点选择成功",
    eventNames: ["location_selected", "location_search_succeeded", "preset_location_selected", "current_location_succeeded"],
    countMode: "primaryFallback"
  },
  { key: "inviteCopied", label: "复制邀请链接", eventNames: ["invite_link_copied"] },
  { key: "memberJoined", label: "成员加入", eventNames: ["member_joined"] },
  { key: "swipeStarted", label: "开始滑卡", eventNames: ["start_swiping_clicked", "swipe_started"], countMode: "primaryFallback" },
  { key: "liked", label: "餐厅右滑", eventNames: ["restaurant_liked"] },
  { key: "passed", label: "餐厅左滑", eventNames: ["restaurant_passed"] },
  { key: "matchCreated", label: "产生 Match", eventNames: ["match_created"] },
  { key: "matchListViewed", label: "查看共同心动榜", eventNames: ["match_list_viewed"] },
  { key: "recommendationViewed", label: "查看智能推荐", eventNames: ["decision_recommendation_viewed"] },
  { key: "randomStarted", label: "使用随机决定", eventNames: ["decision_random_started"] },
  { key: "voteCast", label: "二轮投票", eventNames: ["decision_vote_cast"] },
  { key: "finalDecided", label: "最终决定", eventNames: ["final_decided"] },
  { key: "shareTextCopied", label: "复制群聊文案", eventNames: ["share_text_copied"] },
  { key: "amapOpened", label: "打开高德地图", eventNames: ["amap_opened"] },
  { key: "feedbackSubmitted", label: "提交反馈", eventNames: ["feedback_submitted"] }
];

const conversionDefinitions = [
  ["homeToCreate", "首页访问 → 创建饭局点击", "home", "createCta"],
  ["createToRoom", "创建饭局点击 → 房间创建成功", "createCta", "roomCreated"],
  ["roomToInvite", "房间创建成功 → 复制邀请链接", "roomCreated", "inviteCopied"],
  ["inviteToMember", "复制邀请链接 → 成员加入", "inviteCopied", "memberJoined"],
  ["memberToSwipe", "成员加入 → 开始滑卡", "memberJoined", "swipeStarted"],
  ["swipeToMatch", "开始滑卡 → 产生 Match", "swipeStarted", "matchCreated"],
  ["matchToList", "产生 Match → 查看共同心动榜", "matchCreated", "matchListViewed"],
  ["listToFinal", "查看共同心动榜 → 最终决定", "matchListViewed", "finalDecided"],
  ["finalToShare", "最终决定 → 复制群聊文案", "finalDecided", "shareTextCopied"],
  ["finalToFeedback", "最终决定 → 提交反馈", "finalDecided", "feedbackSubmitted"]
] as const;

const errorDefinitions = [
  ["current_location_failed", "定位失败"],
  ["location_search_failed", "地点搜索失败"],
  ["restaurant_api_failed", "餐厅 API 失败"],
  ["fallback_restaurants_used", "启用备用餐厅池"],
  ["restaurant_pool_load_failed", "餐厅池加载失败"],
  ["supabase_connection_failed", "Supabase 连接失败"],
  ["image_load_failed", "图片加载失败"],
  ["invalid_room_token", "邀请链接无效"],
  ["room_not_found", "房间不存在"]
] as const;

const qualityEventNames = [
  "restaurant_pool_quality_checked",
  "restaurant_card_exposed",
  "restaurant_liked",
  "match_created",
  "final_decided",
  "restaurant_pool_refreshed"
] as const;

function metadataNumber(metadata: Database["public"]["Tables"]["events"]["Row"]["metadata"], key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return 0;
  const value = (metadata as Record<string, unknown>)[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getPeriodStart(period: AdminPeriod) {
  if (period === "all") return null;

  const now = new Date();

  if (period === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }

  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function getPeriodLabel(period: AdminPeriod) {
  if (period === "today") return "今日";
  if (period === "7d") return "近 7 天";
  return "全部数据";
}

function getFunnelCount(definition: FunnelDefinition, eventCounts: Record<string, number>) {
  const counts = definition.eventNames.map((name) => eventCounts[name] ?? 0);

  if (definition.countMode === "max") return Math.max(...counts);
  if (definition.countMode === "primaryFallback") {
    return counts[0] > 0 ? counts[0] : counts.slice(1).reduce((total, count) => total + count, 0);
  }

  return counts.reduce((total, count) => total + count, 0);
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

  const { password, period: requestedPeriod } = await readRequest(request);
  if (!password || password !== expectedPassword) {
    await recordAdminEvent(client, "debug_page_auth_failed");
    return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401 });
  }

  const period: AdminPeriod = requestedPeriod === "today" || requestedPeriod === "7d" || requestedPeriod === "all"
    ? requestedPeriod
    : "today";
  const periodStart = getPeriodStart(period);

  try {
    const allEventNames = Array.from(new Set([
      ...funnelDefinitions.flatMap((definition) => definition.eventNames),
      ...errorDefinitions.map(([eventName]) => eventName),
      ...qualityEventNames
    ]));

    const countEvent = async (eventName: string) => {
      let query = client.from("events").select("id", { count: "exact", head: true }).eq("event_name", eventName);
      if (periodStart) query = query.gte("created_at", periodStart);
      const { count, error } = await query;
      if (error) throw error;
      return [eventName, count ?? 0] as const;
    };

    let roomsQuery = client.from("rooms").select("id", { count: "exact", head: true });
    let membersQuery = client.from("room_members").select("id", { count: "exact", head: true });
    let swipesQuery = client.from("swipes").select("id", { count: "exact", head: true });
    let feedbackCountQuery = client.from("feedback").select("id", { count: "exact", head: true });
    let feedbackQuery = client
      .from("feedback")
      .select("id, rating, comment, improvement_area, decision_satisfaction, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    let eventsQuery = client
      .from("events")
      .select("id, event_name, created_at, room_id")
      .order("created_at", { ascending: false })
      .limit(50);
    let errorEventsQuery = client
      .from("events")
      .select("id, event_name, created_at")
      .in("event_name", errorDefinitions.map(([eventName]) => eventName))
      .order("created_at", { ascending: false })
      .limit(20);
    let qualityEventsQuery = client
      .from("events")
      .select("id, event_name, room_id, metadata, created_at")
      .in("event_name", qualityEventNames)
      .order("created_at", { ascending: false })
      .limit(3000);
    let scenarioRoomsQuery = client
      .from("rooms")
      .select("id, dining_scenario, created_at")
      .order("created_at", { ascending: false })
      .limit(3000);

    if (periodStart) {
      roomsQuery = roomsQuery.gte("created_at", periodStart);
      membersQuery = membersQuery.gte("joined_at", periodStart);
      swipesQuery = swipesQuery.gte("created_at", periodStart);
      feedbackCountQuery = feedbackCountQuery.gte("created_at", periodStart);
      feedbackQuery = feedbackQuery.gte("created_at", periodStart);
      eventsQuery = eventsQuery.gte("created_at", periodStart);
      errorEventsQuery = errorEventsQuery.gte("created_at", periodStart);
      qualityEventsQuery = qualityEventsQuery.gte("created_at", periodStart);
      scenarioRoomsQuery = scenarioRoomsQuery.gte("created_at", periodStart);
    }

    const [rooms, members, swipes, feedbackCount, feedback, events, errorEvents, qualityEvents, scenarioRooms, eventCountEntries] = await Promise.all([
      roomsQuery,
      membersQuery,
      swipesQuery,
      feedbackCountQuery,
      feedbackQuery,
      eventsQuery,
      errorEventsQuery,
      qualityEventsQuery,
      scenarioRoomsQuery,
      Promise.all(allEventNames.map(countEvent))
    ]);

    const failures = [
      rooms.error,
      members.error,
      swipes.error,
      feedbackCount.error,
      feedback.error,
      events.error,
      errorEvents.error,
      qualityEvents.error,
      scenarioRooms.error
    ].filter(Boolean);

    if (failures.length > 0) throw failures;

    const eventCounts = Object.fromEntries(eventCountEntries);
    const funnel = funnelDefinitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      count: getFunnelCount(definition, eventCounts)
    }));
    const funnelCounts = Object.fromEntries(funnel.map((item) => [item.key, item.count]));
    const conversions = conversionDefinitions.map(([key, label, fromKey, toKey]) => {
      const denominator = funnelCounts[fromKey] ?? 0;
      const numerator = funnelCounts[toKey] ?? 0;

      return {
        key,
        label,
        numerator,
        denominator,
        rate: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null
      };
    });
    const errorStats = errorDefinitions.map(([eventName, label]) => ({
      key: eventName,
      label,
      count: eventCounts[eventName] ?? 0
    }));
    const qualityRows = qualityEvents.data ?? [];
    const poolQualityRows = qualityRows.filter((item) => item.event_name === "restaurant_pool_quality_checked");
    const exposedRows = qualityRows.filter((item) => item.event_name === "restaurant_card_exposed");
    const likedRows = qualityRows.filter((item) => item.event_name === "restaurant_liked");
    const matchedRows = qualityRows.filter((item) => item.event_name === "match_created");
    const finalRows = qualityRows.filter((item) => item.event_name === "final_decided");
    const refreshedRows = qualityRows.filter((item) => item.event_name === "restaurant_pool_refreshed");
    const scenarioByRoom = new Map((scenarioRooms.data ?? []).map((room) => [room.id, room.dining_scenario || "未设置"]));
    const uniqueMatchedRooms = new Set(matchedRows.map((item) => item.room_id).filter(Boolean));
    const uniqueFinalRooms = new Set(finalRows.map((item) => item.room_id).filter(Boolean));
    const qualityMetrics = {
      averagePoolSize: average(poolQualityRows.map((item) => metadataNumber(item.metadata, "final_pool_count"))),
      averageQualifiedCandidates: average(poolQualityRows.map((item) => metadataNumber(item.metadata, "qualified_count"))),
      averageRejectedCandidates: average(poolQualityRows.map((item) => metadataNumber(item.metadata, "hard_rejected_count"))),
      rightSwipeRate: exposedRows.length > 0 ? Math.round((likedRows.length / exposedRows.length) * 1000) / 10 : null,
      roomsWithMatchRate: scenarioByRoom.size > 0 ? Math.round((uniqueMatchedRooms.size / scenarioByRoom.size) * 1000) / 10 : null,
      finalDecisionRate: scenarioByRoom.size > 0 ? Math.round((uniqueFinalRooms.size / scenarioByRoom.size) * 1000) / 10 : null,
      averageFinalLikedMembers: average(finalRows.map((item) => metadataNumber(item.metadata, "liked_member_count"))),
      refreshUsageRate: scenarioByRoom.size > 0 ? Math.round((refreshedRows.length / scenarioByRoom.size) * 1000) / 10 : null
    };
    const scenarioMetrics = Array.from(new Set(scenarioByRoom.values())).map((scenario) => {
      const roomIds = new Set(Array.from(scenarioByRoom.entries()).filter(([, value]) => value === scenario).map(([roomId]) => roomId));
      const scenarioExposures = exposedRows.filter((item) => item.room_id && roomIds.has(item.room_id));
      const scenarioLikes = likedRows.filter((item) => item.room_id && roomIds.has(item.room_id));
      const scenarioMatches = new Set(matchedRows.map((item) => item.room_id).filter((roomId): roomId is string => {
        if (!roomId) return false;
        return roomIds.has(roomId);
      }));
      const scenarioFinals = new Set(finalRows.map((item) => item.room_id).filter((roomId): roomId is string => {
        if (!roomId) return false;
        return roomIds.has(roomId);
      }));

      return {
        scenario,
        rooms: roomIds.size,
        exposures: scenarioExposures.length,
        likes: scenarioLikes.length,
        rightSwipeRate: scenarioExposures.length > 0 ? Math.round((scenarioLikes.length / scenarioExposures.length) * 1000) / 10 : null,
        matchedRooms: scenarioMatches.size,
        finalRooms: scenarioFinals.size
      };
    }).sort((left, right) => right.rooms - left.rooms);

    await recordAdminEvent(client, "debug_page_viewed");

    return NextResponse.json({
      period,
      periodLabel: getPeriodLabel(period),
      stats: {
        rooms: rooms.count ?? 0,
        members: members.count ?? 0,
        swipes: swipes.count ?? 0,
        matches: funnelCounts.matchCreated ?? 0,
        finals: funnelCounts.finalDecided ?? 0,
        feedback: feedbackCount.count ?? 0
      },
      funnel,
      conversions,
      errorStats,
      qualityMetrics,
      scenarioMetrics,
      feedback: (feedback.data ?? []).map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        improvementArea: item.improvement_area,
        decisionSatisfaction: item.decision_satisfaction,
        createdAt: item.created_at
      })),
      errorEvents: (errorEvents.data ?? []).map((item) => ({
        id: item.id,
        name: item.event_name,
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
    console.error("[AdminLite] load stats failed", error);
    return NextResponse.json({ message: "LOAD_FAILED" }, { status: 500 });
  }
}
