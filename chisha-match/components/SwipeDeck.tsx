"use client";

import { RestaurantCard } from "@/components/RestaurantCard";
import type { Restaurant } from "@/data/restaurants";
import type { Room, SwipeDecision, SwipeState } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, ListChecks, UtensilsCrossed, X } from "lucide-react";

type SwipeDeckProps = {
  room: Room;
  state: SwipeState;
  currentRestaurant: Restaurant | null;
  totalRestaurants: number;
  onDecision: (decision: SwipeDecision) => void;
  onViewMatches: () => void;
};

export function SwipeDeck({
  room,
  state,
  currentRestaurant,
  totalRestaurants,
  onDecision,
  onViewMatches
}: SwipeDeckProps) {
  const progress = Math.round((state.seenIds.length / totalRestaurants) * 100);

  return (
    <section className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-1">
      <div className="mb-4 rounded-lg bg-white/80 p-3 shadow-sm ring-1 ring-teal-900/5">
        <div className="mb-2 flex items-center justify-between text-sm font-black">
          <span className="max-w-[13rem] truncate text-slate-700">{room.name}</span>
          <span className="text-teal-600">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 shadow-inner">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#f59e0b)]"
            initial={false}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black text-slate-500">
          <div className="flex items-center justify-center gap-1 rounded-full bg-slate-50 px-2 py-2">
            <X size={13} className="text-rose-400" />
            左滑 不想吃
          </div>
          <div className="flex items-center justify-center gap-1 rounded-full bg-teal-50 px-2 py-2 text-teal-700">
            <Heart size={13} className="fill-teal-500 text-teal-500" />
            右滑 想吃
          </div>
          <div className="flex items-center justify-center gap-1 rounded-full bg-amber-50 px-2 py-2 text-amber-700">
            <ListChecks size={13} />
            Match 看榜
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="popLayout">
          {currentRestaurant ? (
            <motion.div
              key={currentRestaurant.id}
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ type: "tween", duration: 0.16, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <div className="absolute inset-x-4 top-5 h-[88%] rounded-lg bg-white/60 shadow-sm" />
              <div className="absolute inset-x-8 top-9 h-[84%] rounded-lg bg-white/35 shadow-sm" />
              <RestaurantCard restaurant={currentRestaurant} onDecision={onDecision} />
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid h-full place-items-center"
            >
              <div className="w-full rounded-lg bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,118,110,0.13)] ring-1 ring-teal-900/5">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-teal-50 text-teal-500">
                  <UtensilsCrossed size={30} />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">这轮滑完啦</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                  已经收集到 {state.matches.length} 个共同心动，看看今晚谁上榜。
                </p>
                <button
                  type="button"
                  onClick={onViewMatches}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
                >
                  <ListChecks size={19} />
                  查看匹配清单
                </button>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs font-black text-rose-400">
                  <Heart size={14} className="fill-rose-400" />
                  {state.likedIds.length} 家被你右滑
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
