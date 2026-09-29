"use client";

import { ListChecks, Trophy, Utensils } from "lucide-react";
import { getRoomHref } from "@/lib/roomUrl";
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
      href: getRoomHref("/swipe", roomId)
    },
    {
      key: "matches",
      label: "清单",
      icon: ListChecks,
      href: getRoomHref("/matches", roomId)
    },
    {
      key: "final",
      label: "结果",
      icon: Trophy,
      href: getRoomHref("/final", roomId)
    }
  ] as const;

  return (
    <nav className="safe-bottom grid grid-cols-3 gap-1 border-t border-slate-200 bg-[#fbfcfa] px-4 pt-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition ${
              isActive
                ? "bg-teal-700 text-white"
                : "text-slate-600"
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
