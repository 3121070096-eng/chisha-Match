import { Check, ChevronRight } from "lucide-react";

type FlowStage = "create" | "room" | "swipe" | "decided";

type FlowProgressProps = {
  stage: FlowStage;
  className?: string;
};

const labels: Record<Exclude<FlowStage, "decided">, string> = {
  create: "第 1 步 / 3 步：创建饭局",
  room: "第 2 步 / 3 步：邀请朋友",
  swipe: "第 2 步 / 3 步：一起滑餐厅"
};

export function FlowProgress({ stage, className = "" }: FlowProgressProps) {
  if (stage === "decided") {
    return (
      <p className={`inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 ${className}`}>
        <Check size={14} />
        已完成：今晚就吃这家
      </p>
    );
  }

  return (
    <p className={`inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 ${className}`}>
      {labels[stage]}
      <ChevronRight size={13} className="text-teal-700" />
    </p>
  );
}
