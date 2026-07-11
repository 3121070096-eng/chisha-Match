"use client";

import { AppChrome } from "@/components/AppChrome";
import { trackEvent } from "@/lib/analytics";
import { Play, Plus, Sparkles } from "lucide-react";
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
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="rounded-lg bg-teal-500 p-5 text-white shadow-[0_20px_56px_rgba(13,148,136,0.24)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-xs font-black text-teal-50">
            <Sparkles size={15} />
            吃啥 Match · Public Beta
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight">像交友软件一样，和朋友一起滑餐厅</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-teal-50">
            吃啥 Match 是一个让朋友快速达成聚餐共识的决策工具。
          </p>
        </div>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <h2 className="text-lg font-black text-slate-950">为什么做它</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            朋友聚餐时，大家常常在群里反复问“吃什么”。吃啥 Match 用左右滑和共同 Match 的方式，把模糊偏好变成共同选择。
          </p>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <h2 className="text-lg font-black text-slate-950">核心功能</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {features.map((feature) => (
              <span key={feature} className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">
                {feature}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <h2 className="text-lg font-black text-slate-950">技术栈</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-black text-slate-600">
            <span className="rounded-lg bg-slate-50 p-3">Next.js · TypeScript</span>
            <span className="rounded-lg bg-slate-50 p-3">Tailwind · Framer Motion</span>
            <span className="rounded-lg bg-slate-50 p-3">Supabase · Vercel</span>
            <span className="rounded-lg bg-slate-50 p-3">高德地点数据</span>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <h2 className="text-lg font-black text-slate-950">版本路线</h2>
          <div className="mt-3 space-y-2">
            {roadmap.map(([version, detail]) => (
              <div key={version} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <span className="grid size-9 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{version}</span>
                <p className="text-sm font-black text-slate-700">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="safe-bottom grid grid-cols-2 gap-3 pt-2">
          <button type="button" onClick={createRoom} className="flex h-12 items-center justify-center gap-2 rounded-full bg-teal-500 text-sm font-black text-white shadow-lg shadow-teal-500/25">
            <Plus size={17} /> 创建饭局
          </button>
          <button type="button" onClick={startDemo} className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-teal-700 ring-1 ring-teal-200">
            <Play size={17} className="fill-teal-500" /> 快速体验
          </button>
        </div>
      </section>
    </AppChrome>
  );
}
