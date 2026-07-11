"use client";

import { AppChrome } from "@/components/AppChrome";
import { trackEvent } from "@/lib/analytics";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const sections = [
  ["不需要注册", "吃啥 Match 当前不需要注册登录。你输入的昵称只用于当前饭局里展示。"],
  ["地点只为找餐厅", "使用当前位置时，定位只用于查找附近餐厅。你可以拒绝定位，改用地点搜索或热门地点。"],
  ["匿名体验数据", "项目会记录匿名使用事件来改进体验，例如创建饭局、复制链接、滑卡、Match 和最终决定。"],
  ["主动反馈", "你主动提交的反馈会用于了解产品哪里还需要改进。反馈不影响饭局结果。"],
  ["餐厅与食评", "餐厅地点数据来自高德 API 或本地体验数据。模拟食评仅用于体验，不代表真实平台评论。"],
  ["请保护自己", "不要在昵称或反馈里填写手机号、住址、身份证号等敏感个人信息。"],
  ["测试数据处理", "Public Beta 阶段如需删除测试数据，可联系项目作者协助处理。"]
];

export default function PrivacyPage() {
  useEffect(() => {
    void trackEvent({ eventName: "privacy_page_viewed" });
  }, []);

  return (
    <AppChrome showBack title="隐私与数据说明">
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-2 no-scrollbar">
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-2 text-sm font-black text-teal-100">
            <ShieldCheck size={18} />
            Public Beta 的简单说明
          </div>
          <h1 className="mt-3 text-3xl font-black">放心一起选，少收集一点</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            我们只保留让饭局正常运转、帮助产品继续变好的必要数据。
          </p>
        </div>

        {sections.map(([title, text]) => (
          <section key={title} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
            <h2 className="text-base font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{text}</p>
          </section>
        ))}
      </section>
    </AppChrome>
  );
}
