"use client";

import { AppChrome } from "@/components/AppChrome";
import { AlertTriangle, BarChart3, ClipboardCheck, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

type AdminPeriod = "today" | "7d" | "all";

type AdminData = {
  period: AdminPeriod;
  periodLabel: string;
  stats: {
    rooms: number;
    members: number;
    swipes: number;
    matches: number;
    finals: number;
    feedback: number;
  };
  funnel: Array<{ key: string; label: string; count: number }>;
  conversions: Array<{ key: string; label: string; numerator: number; denominator: number; rate: number | null }>;
  errorStats: Array<{ key: string; label: string; count: number }>;
  qualityMetrics: {
    averagePoolSize: number | null;
    averageQualifiedCandidates: number | null;
    averageRejectedCandidates: number | null;
    rightSwipeRate: number | null;
    roomsWithMatchRate: number | null;
    finalDecisionRate: number | null;
    averageFinalLikedMembers: number | null;
    refreshUsageRate: number | null;
  };
  scenarioMetrics: Array<{
    scenario: string;
    rooms: number;
    exposures: number;
    likes: number;
    rightSwipeRate: number | null;
    matchedRooms: number;
    finalRooms: number;
  }>;
  feedback: Array<{
    id: string;
    rating: string;
    comment: string | null;
    improvementArea: string | null;
    decisionSatisfaction: number | null;
    createdAt: string;
  }>;
  errorEvents: Array<{ id: string; name: string; createdAt: string }>;
  events: Array<{ id: string; name: string; createdAt: string; hasRoom: boolean }>;
};

const periodOptions: Array<{ value: AdminPeriod; label: string }> = [
  { value: "today", label: "今日" },
  { value: "7d", label: "近 7 天" },
  { value: "all", label: "全部" }
];

const ratingLabel: Record<string, string> = {
  good: "很好用",
  ok: "还可以",
  bad: "有点麻烦"
};

const improvementAreaLabel: Record<string, string> = {
  how_it_works: "看不懂怎么玩",
  create_room: "创建饭局",
  location: "选择地点",
  invite: "邀请朋友",
  join_room: "加入房间",
  swipe: "滑餐厅",
  match_list: "查看共同心动榜",
  decision: "最终决定",
  share: "分享结果",
  restaurant_quality: "餐厅不够准",
  image_performance: "图片 / 加载太慢",
  restaurant_quality_low: "餐厅整体质量不高",
  restaurant_few_desirable: "真正想去的餐厅太少",
  restaurant_repetitive: "餐厅类型太重复",
  budget_mismatch: "餐厅不符合预算",
  scenario_mismatch: "餐厅不符合饭局场景",
  distance_mismatch: "距离不合适",
  restaurant_info_incomplete: "信息不完整",
  image_untrustworthy: "图片不可信",
  final_result_unsatisfying: "最终结果不满意",
  other: "其他"
};

const scenarioLabel: Record<string, string> = {
  casual: "随便吃吃",
  friends: "朋友聚餐",
  date: "约会",
  colleagues: "同事聚餐",
  celebration: "庆祝",
  solo: "一个人吃",
  late_night: "夜宵",
  afternoon_tea: "下午茶",
  "未设置": "未设置"
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
  const [period, setPeriod] = useState<AdminPeriod>("today");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData(event?: FormEvent<HTMLFormElement>, nextPeriod = period) {
    event?.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin-lite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, period: nextPeriod })
      });
      const payload = (await response.json()) as AdminData & { message?: string };

      if (!response.ok) {
        if (response.status === 404) throw new Error("此页面未启用。");
        if (response.status === 401) throw new Error("密码不正确，请重试。");
        if (response.status === 503) throw new Error("调试后台尚未完成服务器配置。");
        throw new Error("数据加载失败，请稍后重试。");
      }

      setData(payload);
      setPeriod(nextPeriod);
    } catch (error) {
      console.error("[AdminLite] request failed", error);
      setMessage(error instanceof Error ? error.message : "数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  function changePeriod(nextPeriod: AdminPeriod) {
    if (nextPeriod === period || loading) return;
    void loadData(undefined, nextPeriod);
  }

  const hasFunnelData = data?.funnel.some((item) => item.count > 0) ?? false;
  const hasErrorData = data?.errorStats.some((item) => item.count > 0) ?? false;

  return (
    <AppChrome showBack title="Admin Lite">
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2 text-sm font-black text-teal-100">
            <ShieldCheck size={18} />
            Public Beta 测试复盘
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
            聚合查看转化、反馈与异常事件；不会展示 API key 或事件原始内容。
          </p>
          <Link href="/test-guide" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-teal-100 underline decoration-teal-300/60 underline-offset-4">
            <ClipboardCheck size={14} />
            打开真实测试指南
          </Link>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">{data.periodLabel} 测试概览</p>
                <p className="mt-1 text-xs font-bold text-slate-500">按事件行为次数汇总，用于发现测试路径卡点。</p>
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-teal-700 shadow-sm ring-1 ring-teal-900/5"
                aria-label="刷新数据"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changePeriod(option.value)}
                  className={`h-9 rounded-md text-xs font-black transition ${
                    period === option.value ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {message ? <p className="rounded-lg bg-rose-50 px-3 py-3 text-sm font-black text-rose-600">{message}</p> : null}

            <div className="grid grid-cols-2 gap-3">
              {[
                ["创建房间", data.stats.rooms],
                ["成员加入", data.stats.members],
                ["餐厅滑卡", data.stats.swipes],
                ["产生 Match", data.stats.matches],
                ["最终决定", data.stats.finals],
                ["提交反馈", data.stats.feedback]
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
                  <p className="text-xs font-black text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BarChart3 size={17} className="text-teal-600" />
                测试漏斗
              </div>
              {hasFunnelData ? (
                <div className="mt-3 divide-y divide-slate-100">
                  {data.funnel.map((item, index) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="min-w-0 text-sm font-bold text-slate-700">
                        <span className="mr-2 text-xs font-black text-teal-700">{index + 1}</span>
                        {item.label}
                      </p>
                      <span className="shrink-0 text-base font-black text-slate-950">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-sm font-bold leading-6 text-slate-500">
                  当前时间范围还没有测试行为。找一组朋友走完流程后，这里会出现漏斗数据。
                </p>
              )}
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BarChart3 size={17} className="text-teal-600" />
                候选池与决策质量
              </div>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">只汇总匿名行为与候选池指标，用来判断餐厅是否够准、够多样。</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["平均候选数", data.qualityMetrics.averagePoolSize === null ? "-" : `${data.qualityMetrics.averagePoolSize} 家`],
                  ["平均合格候选", data.qualityMetrics.averageQualifiedCandidates === null ? "-" : `${data.qualityMetrics.averageQualifiedCandidates}`],
                  ["硬过滤数量", data.qualityMetrics.averageRejectedCandidates === null ? "-" : `${data.qualityMetrics.averageRejectedCandidates}`],
                  ["右滑率", data.qualityMetrics.rightSwipeRate === null ? "-" : `${data.qualityMetrics.rightSwipeRate}%`],
                  ["有 Match 的饭局", data.qualityMetrics.roomsWithMatchRate === null ? "-" : `${data.qualityMetrics.roomsWithMatchRate}%`],
                  ["最终决定率", data.qualityMetrics.finalDecisionRate === null ? "-" : `${data.qualityMetrics.finalDecisionRate}%`],
                  ["平均最终喜欢人数", data.qualityMetrics.averageFinalLikedMembers === null ? "-" : `${data.qualityMetrics.averageFinalLikedMembers}`],
                  ["换池使用率", data.qualityMetrics.refreshUsageRate === null ? "-" : `${data.qualityMetrics.refreshUsageRate}%`]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-teal-50 px-3 py-3 ring-1 ring-teal-100">
                    <p className="text-[11px] font-black text-teal-800">{label}</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              {data.scenarioMetrics.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-black text-slate-500">按饭局场景</p>
                  <div className="mt-2 space-y-2">
                    {data.scenarioMetrics.map((item) => (
                      <div key={item.scenario} className="rounded-lg bg-slate-50 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-800">{scenarioLabel[item.scenario] ?? item.scenario}</p>
                          <span className="text-xs font-black text-teal-700">{item.rooms} 局</span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          右滑 {item.rightSwipeRate === null ? "-" : `${item.rightSwipeRate}%`} · Match {item.matchedRooms} · 决定 {item.finalRooms}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-900">关键转化率</p>
              <div className="mt-3 space-y-2">
                {data.conversions.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-5 text-slate-700">{item.label}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{item.numerator} / {item.denominator}</p>
                    </div>
                    <span className="shrink-0 text-lg font-black text-teal-800">
                      {item.rate === null ? "-" : `${item.rate}%`}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <AlertTriangle size={17} className="text-amber-600" />
                错误与备用路径
              </div>
              {hasErrorData ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {data.errorStats.map((item) => (
                    <div key={item.key} className="rounded-lg bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
                      <p className="text-[11px] font-black leading-4 text-amber-800">{item.label}</p>
                      <p className="mt-1 text-lg font-black text-amber-950">{item.count}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-teal-50 px-3 py-4 text-sm font-bold text-teal-800">当前时间范围没有记录到关键错误或备用路径。</p>
              )}
              {data.errorEvents.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-black text-slate-500">最近 20 条错误事件</p>
                  <div className="mt-2 space-y-2">
                    {data.errorEvents.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                        <span className="min-w-0 truncate">{item.name}</span>
                        <span className="shrink-0 text-slate-400">{formatTime(item.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-900">最新 20 条反馈</p>
              <div className="mt-3 space-y-3">
                {data.feedback.length === 0 ? <p className="text-sm font-bold text-slate-500">当前时间范围还没有收到反馈。</p> : null}
                {data.feedback.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-black text-teal-700">
                      <span>{ratingLabel[item.rating] ?? item.rating}</span>
                      <span className="text-slate-400">{formatTime(item.createdAt)}</span>
                    </div>
                    {item.improvementArea ? (
                      <p className="mt-2 text-xs font-black text-amber-700">卡点：{improvementAreaLabel[item.improvementArea] ?? item.improvementArea}</p>
                    ) : null}
                    {item.decisionSatisfaction ? (
                      <p className="mt-1 text-xs font-black text-teal-700">最终决定满意度：{item.decisionSatisfaction} / 5</p>
                    ) : null}
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.comment || "未填写补充说明"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-900">最近 50 条事件</p>
              <div className="mt-3 space-y-2">
                {data.events.length === 0 ? <p className="text-sm font-bold text-slate-500">当前时间范围还没有事件。</p> : null}
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
