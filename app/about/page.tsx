"use client";

import { AppChrome } from "@/components/AppChrome";
import { trackEvent } from "@/lib/analytics";
import { ChevronRight, ClipboardCheck, Play, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const features = [
  "创建饭局", "邀请朋友", "真实地点餐厅", "左右滑", "共同 Match", "智能推荐", "一键随机", "二轮投票", "结果分享"
];

const roadmap = [
  ["V1", "前端 Demo"],
  ["V2", "Supabase 多人 Match"],
  ["V3", "高德真实餐厅与决策增强"],
  ["V4", "Public Beta 产品化"]
];

export default function AboutPage() {
  const router = useRouter();

  useEffect(() => {
    void trackEvent({ eventName: "about_page_viewed" });
  }, []);

  function createRoom() {
    void trackEvent({ eventName: "create_room_cta_clicked", metadata: { entry: "about" } });
    router.push("/create");
  }

  function startDemo() {
    void trackEvent({ eventName: "demo_cta_clicked", metadata: { entry: "about" } });
    router.push("/demo");
  }

  return (
    <AppChrome showBack title="关于吃啥 Match">
      <section className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="border-b border-slate-200 pb-5 pt-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800">
            <Sparkles size={15} />
            吃啥 Match · Public Beta
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-950">像交友软件一样，<br />和朋友一起滑餐厅</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            吃啥 Match 是一个让朋友快速达成聚餐共识的决策工具。
          </p>
        </div>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-bold text-slate-950">为什么做它</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            朋友聚餐时，大家常常在群里反复问“吃什么”。吃啥 Match 用左右滑和共同 Match 的方式，把模糊偏好变成共同选择。
          </p>
        </section>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-bold text-slate-950">核心功能</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {features.map((feature) => (
              <span key={feature} className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800">
                {feature}
              </span>
            ))}
          </div>
        </section>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-bold text-slate-950">技术栈</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-medium text-slate-600">
            <span>Next.js · TypeScript</span>
            <span>Tailwind · Framer Motion</span>
            <span>Supabase · Vercel</span>
            <span>高德地点数据</span>
          </div>
        </section>

        <section className="border-b border-slate-200 pb-5">
          <h2 className="text-base font-bold text-slate-950">版本路线</h2>
          <div className="mt-3 space-y-3">
            {roadmap.map(([version, detail]) => (
              <div key={version} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 font-bold text-teal-800">{version}</span>
                <p className="min-w-0 text-slate-700">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/test-guide"
          className="flex items-center gap-3 rounded-lg border border-teal-100 bg-teal-50 p-4 text-teal-950 transition active:scale-[0.99]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-teal-700 shadow-sm">
            <ClipboardCheck size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">正在做真实用户测试？</span>
            <span className="mt-1 block text-xs text-teal-800">查看测试任务、观察重点和记录模板</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-teal-700" />
        </Link>

        <div className="safe-bottom grid grid-cols-2 gap-3 pt-2">
          <button type="button" onClick={createRoom} className="flex h-12 items-center justify-center gap-2 rounded-full bg-teal-700 text-sm font-semibold text-white">
            <Plus size={17} /> 创建饭局
          </button>
          <button type="button" onClick={startDemo} className="flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-teal-800">
            <Play size={17} className="fill-teal-500" /> 快速体验
          </button>
        </div>
      </section>
    </AppChrome>
  );
}
