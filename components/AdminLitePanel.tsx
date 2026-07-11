"use client";

import { AppChrome } from "@/components/AppChrome";
import { BarChart3, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

type AdminData = {
  stats: {
    rooms: number;
    roomsToday: number;
    membersToday: number;
    swipesToday: number;
    matchEvents: number;
    finalEvents: number;
    feedback: number;
    amapFailures: number;
    fallbackUses: number;
  };
  feedback: Array<{ id: string; rating: string; comment: string | null; createdAt: string }>;
  events: Array<{ id: string; name: string; createdAt: string; hasRoom: boolean }>;
};

const ratingLabel: Record<string, string> = {
  good: "很好用",
  ok: "还可以",
  bad: "有点麻烦"
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminLitePanel() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const payload = (await response.json()) as AdminData & { message?: string };

      if (!response.ok) {
        if (response.status === 404) throw new Error("此页面未启用。");
        if (response.status === 401) throw new Error("密码不正确，请重试。");
        if (response.status === 503) throw new Error("调试后台尚未完成服务器配置。");
        throw new Error("数据加载失败，请稍后重试。");
      }

      setData(payload);
    } catch (error) {
      console.error("[AdminLite] request failed", error);
      setMessage(error instanceof Error ? error.message : "数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppChrome showBack title="Admin Lite">
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2 text-sm font-black text-teal-100">
            <ShieldCheck size={18} />
            Public Beta 内部数据
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
            仅展示聚合统计、最新反馈与事件名称，不展示 API key 或原始事件内容。
          </p>
        </div>

        {!data ? (
          <form onSubmit={(event) => void loadData(event)} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-teal-900/5">
            <label className="block text-sm font-black text-slate-700">
              管理员密码
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入服务器配置的密码"
                className="mt-2 h-12 w-full rounded-lg border border-teal-900/10 bg-slate-50 px-4 text-base font-bold outline-none focus:border-teal-400 focus:bg-white"
              />
            </label>
            {message ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-black text-rose-500">{message}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-black text-white disabled:bg-slate-400"
            >
              <KeyRound size={17} />
              {loading ? "正在验证" : "查看 Beta 数据"}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-700">Public Beta 概览</p>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="grid size-10 place-items-center rounded-full bg-white text-teal-700 shadow-sm ring-1 ring-teal-900/5"
                aria-label="刷新数据"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["房间总数", data.stats.rooms],
                ["今日新饭局", data.stats.roomsToday],
                ["今日加入成员", data.stats.membersToday],
                ["今日滑卡", data.stats.swipesToday],
                ["Match 事件", data.stats.matchEvents],
                ["最终决定", data.stats.finalEvents],
                ["反馈总数", data.stats.feedback],
                ["高德失败", data.stats.amapFailures],
                ["备用餐厅池", data.stats.fallbackUses]
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
                  <p className="text-xs font-black text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BarChart3 size={17} className="text-teal-600" />
                最新 20 条反馈
              </div>
              <div className="mt-3 space-y-3">
                {data.feedback.length === 0 ? <p className="text-sm font-bold text-slate-500">还没有收到反馈。</p> : null}
                {data.feedback.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-black text-teal-700">
                      <span>{ratingLabel[item.rating] ?? item.rating}</span>
                      <span className="text-slate-400">{formatTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.comment || "未填写补充说明"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-900">最近 50 条事件</p>
              <div className="mt-3 space-y-2">
                {data.events.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 text-slate-400">{formatTime(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </AppChrome>
  );
}
