"use client";

import { ListChecks, Trophy, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";

type BottomNavProps = {
  roomId: string;
  active: "swipe" | "matches" | "final";
};

export function BottomNav({ roomId, active }: BottomNavProps) {
  const router = useRouter();
  const items = [
    {
      key: "swipe",
      label: "选择",
      icon: Utensils,
      href: `/swipe?roomId=${roomId}`
    },
    {
      key: "matches",
      label: "清单",
      icon: ListChecks,
      href: `/matches?roomId=${roomId}`
    },
    {
      key: "final",
      label: "结果",
      icon: Trophy,
      href: `/final?roomId=${roomId}`
    }
  ] as const;

  return (
    <nav className="safe-bottom grid grid-cols-3 gap-2 border-t border-teal-900/5 bg-white/85 px-4 pt-3 backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex h-12 items-center justify-center gap-2 rounded-full text-sm font-extrabold transition ${
              isActive
                ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <Icon size={17} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
