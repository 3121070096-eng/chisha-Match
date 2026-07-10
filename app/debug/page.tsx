"use client";

import { AppChrome } from "@/components/AppChrome";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { getSupabaseClient } from "@/lib/supabase";
import { BarChart3, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type DebugState = {
  counts: Record<string, number>;
  apiCheck: {
    ok: boolean;
    source: string;
    reason?: string;
    error?: string;
    restaurantCount: number;
    sampleNames: string[];
  };
  feedback: Array<{ id: string; rating: string; comment: string | null; created_at: string }>;
  events: Array<{ id: string; event_name: string; metadata: unknown; created_at: string }>;
};

async function countRows(
  table:
    | "rooms"
    | "room_members"
    | "swipes"
    | "feedback"
    | "restaurant_cache"
    | "room_restaurants"
) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

async function optionalCountRows(
  table: "restaurant_cache" | "room_restaurants"
) {
  try {
    return await countRows(table);
  } catch (error) {
    console.error(`[Debug] optional count ${table} failed`, error);
    return -1;
  }
}

async function countEvents(eventName: string) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", eventName);

  if (error) throw error;
  return count ?? 0;
}

async function checkAmapApiRoute() {
  try {
    const response = await fetch(
      "/api/restaurants/search?locationLabel=%E5%BD%93%E5%89%8D%E4%BD%8D%E7%BD%AE%E9%99%84%E8%BF%91&areaKey=nearby&keyword=%E9%A4%90%E5%8E%85",
      { cache: "no-store" }
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      source?: string;
      reason?: string;
      error?: string;
      restaurants?: Array<{ name?: string }>;
    };

    return {
      ok: Boolean(payload.ok),
      source: payload.source ?? "unknown",
      reason: payload.reason,
      error: payload.error,
      restaurantCount: payload.restaurants?.length ?? 0,
      sampleNames:
        payload.restaurants
          ?.slice(0, 3)
          .map((restaurant) => restaurant.name)
          .filter((name): name is string => Boolean(name)) ?? []
    };
  } catch (error) {
    console.error("[Debug] amap api route check failed", error);
    return {
      ok: false,
      source: "unknown",
      reason: "DEBUG_API_CHECK_FAILED",
      error: error instanceof Error ? error.message : String(error),
      restaurantCount: 0,
      sampleNames: []
    };
  }
}

async function loadDebugState(): Promise<DebugState> {
  const supabase = getSupabaseClient();
  const [
    rooms,
    members,
    swipes,
    feedbackCount,
    restaurantCache,
    roomRestaurants,
    matchCreated,
    finalDecided,
    restaurantApiRequested,
    restaurantApiSucceeded,
    restaurantApiFailed,
    restaurantCacheWritten,
    roomRestaurantPoolCreated,
    currentLocationSucceeded,
    locationSearchSucceeded,
    presetLocationSelected,
    apiCheck
  ] =
    await Promise.all([
      countRows("rooms"),
      countRows("room_members"),
      countRows("swipes"),
      countRows("feedback"),
      optionalCountRows("restaurant_cache"),
      optionalCountRows("room_restaurants"),
      countEvents("match_created"),
      countEvents("final_decided"),
      countEvents("restaurant_api_requested"),
      countEvents("restaurant_api_succeeded"),
      countEvents("restaurant_api_failed"),
      countEvents("restaurant_cache_written"),
      countEvents("room_restaurant_pool_created"),
      countEvents("current_location_succeeded"),
      countEvents("location_search_succeeded"),
      countEvents("preset_location_selected"),
      checkAmapApiRoute()
    ]);
  const [{ data: feedback, error: feedbackError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from("feedback")
        .select("id,rating,comment,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("events")
        .select("id,event_name,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

  if (feedbackError) throw feedbackError;
  if (eventsError) throw eventsError;

  return {
    counts: {
      rooms,
      members,
      swipes,
      restaurantCache,
      roomRestaurants,
      matchCreated,
      finalDecided,
      restaurantApiRequested,
      restaurantApiSucceeded,
      restaurantApiFailed,
      restaurantCacheWritten,
      roomRestaurantPoolCreated,
      currentLocationSucceeded,
      locationSearchSucceeded,
      presetLocationSelected,
      feedback: feedbackCount
    },
    apiCheck,
    feedback: feedback ?? [],
    events: events ?? []
  };
}

export default function DebugPage() {
  const [state, setState] = useState<DebugState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setState(await loadDebugState());
    } catch (debugError) {
      console.error("[Debug] load failed", debugError);
      setError(getReadableSupabaseError(debugError, "加载 Debug 数据失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AppChrome
      showBack
      title="Beta Debug"
      rightSlot={
        <button
          type="button"
          onClick={() => void refresh()}
          className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-teal-900/5"
          aria-label="刷新 Debug 数据"
        >
          <RefreshCw size={17} />
        </button>
      }
    >
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2 no-scrollbar">
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2 text-sm font-black text-teal-100">
            <BarChart3 size={18} />
            Beta 测试数据
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
            隐藏调试页，仅用于查看 Demo 测试反馈、事件和 V3.2 高德 API / 地点状态，不暴露 Supabase key 或高德 key。
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-black text-rose-500">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="rounded-lg bg-white p-5 text-sm font-black text-slate-500 shadow-sm ring-1 ring-teal-900/5">
            正在加载 Debug 数据
          </div>
        ) : null}

        {state ? (
          <>
            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">
                    V3.2 Amap API
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    {state.apiCheck.ok ? "高德接口已返回餐厅" : "当前使用本地餐厅兜底"}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    state.apiCheck.ok
                      ? "bg-teal-50 text-teal-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {state.apiCheck.source}
                </span>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
                <p>返回数量：{state.apiCheck.restaurantCount}</p>
                {state.apiCheck.reason ? <p>reason：{state.apiCheck.reason}</p> : null}
                {state.apiCheck.error ? <p>error：{state.apiCheck.error}</p> : null}
                {state.apiCheck.sampleNames.length > 0 ? (
                  <p>样例：{state.apiCheck.sampleNames.join("、")}</p>
                ) : null}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(state.counts).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
                  <p className="text-xs font-black uppercase text-slate-400">{key}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <h2 className="text-sm font-black text-slate-950">最新 20 条反馈</h2>
              <div className="mt-3 space-y-2">
                {state.feedback.map((item) => (
                  <article key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-black text-teal-700">{item.rating}</p>
                    <p className="mt-1 font-bold leading-6 text-slate-600">
                      {item.comment || "无评论"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{item.created_at}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <h2 className="text-sm font-black text-slate-950">最近 30 条 events</h2>
              <div className="mt-3 space-y-2">
                {state.events.map((item) => (
                  <article key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-black text-slate-900">{item.event_name}</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] font-bold leading-5 text-slate-500">
                      {JSON.stringify(item.metadata, null, 2)}
                    </pre>
                    <p className="mt-1 font-bold text-slate-400">{item.created_at}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AppChrome>
  );
}
