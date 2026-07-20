"use client";

import { AppChrome } from "@/components/AppChrome";
import { trackEvent } from "@/lib/analytics";
import { ClipboardCheck, Eye, FileText, Play, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const testTasks = [
  "创建一个饭局",
  "选择真实想吃饭的位置",
  "复制链接发给 1-3 个朋友",
  "每个人滑 10-20 家餐厅",
  "查看共同心动榜",
  "用智能推荐、随机或二轮投票决定一家",
  "复制结果发到群聊",
  "提交反馈"
];

const observationPoints = [
  "是否能看懂首页，并知道该创建饭局",
  "是否知道要先选择地点",
  "是否理解要把链接发给朋友",
  "好友是否能顺利加入房间",
  "是否理解左右滑和 Match",
  "Match 后是否知道去哪里看榜",
  "是否能完成最终决定",
  "是否愿意把结果复制到群聊"
];

const recordFields = [
  "测试组编号", "人数", "地点", "是否成功创建", "是否成功邀请",
  "是否产生 Match", "是否最终决定", "卡住步骤", "用户原话", "改进建议"
];

export default function TestGuidePage() {
  useEffect(() => {
    void trackEvent({ eventName: "test_guide_viewed" });
  }, []);

  return (
    <AppChrome showBack title="真实测试指南">
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-black text-teal-100">
            <ClipboardCheck size={15} />
            Public Beta 真实测试
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight">吃啥 Match 真实测试指南</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            尽量不解释产品，让朋友自己操作；记录他们在哪一步犹豫、卡住或自然完成。
          </p>
        </div>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Play size={18} className="text-teal-600" />
            测试任务
          </div>
          <ol className="mt-3 space-y-2.5">
            {testTasks.map((task, index) => (
              <li key={task} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold leading-5 text-slate-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-600 text-xs font-black text-white">{index + 1}</span>
                {task}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Eye size={18} className="text-teal-600" />
            观察重点
          </div>
          <ul className="mt-3 space-y-2.5">
            {observationPoints.map((point) => (
              <li key={point} className="flex gap-2 text-sm font-bold leading-6 text-slate-700">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-500" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-teal-50 p-4 ring-1 ring-teal-100">
          <div className="flex items-center gap-2 text-sm font-black text-teal-950">
            <UsersRound size={18} className="text-teal-700" />
            建议测试人数
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-teal-900">每组 2-4 人，至少测试 3 组。不同朋友、不同地点的反馈更容易看出真实问题。</p>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="flex items-center gap-2 text-sm font-black text-slate-950">
            <FileText size={18} className="text-teal-600" />
            测试记录模板
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {recordFields.map((field) => (
              <div key={field} className="rounded-lg bg-slate-50 px-3 py-3 text-xs font-black text-slate-700">{field}</div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold leading-5 text-slate-500">测试后结合 admin-lite 的漏斗、错误事件和最终页反馈，决定下一版最该优先修哪一步。</p>
        </section>

        <div className="safe-bottom grid grid-cols-2 gap-3 pt-2">
          <Link href="/create" className="flex h-12 items-center justify-center rounded-full bg-teal-500 text-sm font-black text-white shadow-lg shadow-teal-500/25">
            开始创建饭局
          </Link>
          <Link href="/admin-lite" className="flex h-12 items-center justify-center rounded-full bg-white text-sm font-black text-teal-700 ring-1 ring-teal-200">
            查看测试数据
          </Link>
        </div>
      </section>
    </AppChrome>
  );
}
