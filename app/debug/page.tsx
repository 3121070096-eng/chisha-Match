"use client";

import { AppChrome } from "@/components/AppChrome";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { getSupabaseClient } from "@/lib/supabase";
import { BarChart3, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type DebugState = {
  counts: Record<string, number>;
  feedback: Array<{ id: string; rating: string; comment: string | null; created_at: string }>;
  events: Array<{ id: string; event_name: string; metadata: unknown; created_at: string }>;
};

async function countRows(table: "rooms" | "room_members" | "swipes" | "feedback") {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
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

async function loadDebugState(): Promise<DebugState> {
  const supabase = getSupabaseClient();
  const [rooms, members, swipes, feedbackCount, matchCreated, finalDecided] =
    await Promise.all([
      countRows("rooms"),
      countRows("room_members"),
      countRows("swipes"),
      countRows("feedback"),
      countEvents("match_created"),
      countEvents("final_decided")
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
      matchCreated,
      finalDecided,
      feedback: feedbackCount
    },
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
            隐藏调试页，仅用于查看 Demo 测试反馈和事件，不暴露 Supabase key。
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
