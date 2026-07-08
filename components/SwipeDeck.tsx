"use client";

import { RestaurantCard } from "@/components/RestaurantCard";
import type { Restaurant } from "@/data/restaurants";
import type { Room, SwipeDecision, SwipeState } from "@/types";
import { motion } from "framer-motion";
import { Heart, ListChecks, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useMemo } from "react";

type SwipeDeckProps = {
  room: Room;
  state: SwipeState;
  currentRestaurant: Restaurant | null;
  deckRestaurants?: Restaurant[];
  totalRestaurants: number;
  onDecision: (decision: SwipeDecision) => void;
  onViewMatches: () => void;
};

export function SwipeDeck({
  room,
  state,
  currentRestaurant,
  deckRestaurants,
  totalRestaurants,
  onDecision,
  onViewMatches
}: SwipeDeckProps) {
  const selectedCount = Math.min(state.seenIds.length, totalRestaurants);
  const progress = totalRestaurants
    ? Math.round((selectedCount / totalRestaurants) * 100)
    : 0;
  const visibleRestaurants = useMemo(() => {
    if (deckRestaurants?.length) return deckRestaurants.slice(0, 4);
    return currentRestaurant ? [currentRestaurant] : [];
  }, [currentRestaurant, deckRestaurants]);
  const primaryRestaurant = visibleRestaurants[0] ?? null;
  const queuedRestaurants = visibleRestaurants.slice(1, 3);

  useEffect(() => {
    visibleRestaurants.slice(0, 4).forEach((restaurant) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = restaurant.image;
    });
  }, [visibleRestaurants]);

  return (
    <section className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-1">
      <div className="mb-4 rounded-lg bg-white/80 p-3 shadow-sm ring-1 ring-teal-900/5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="max-w-[13rem] truncate text-sm font-black text-slate-700">
              {room.name}
            </p>
            <p className="mt-1 text-xs font-black text-slate-500">
              已选择 {selectedCount} / {totalRestaurants} 家
            </p>
          </div>
          <div className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">
            已有 {state.matches.length} 个共同心动
          </div>
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
        {primaryRestaurant ? (
          <div className="absolute inset-0">
            {queuedRestaurants
              .slice()
              .reverse()
              .map((restaurant, reverseIndex) => {
                const depth = queuedRestaurants.length - reverseIndex;

                return (
                  <motion.div
                    key={restaurant.id}
                    initial={false}
                    animate={{
                      y: depth * 14,
                      scale: 1 - depth * 0.035,
                      opacity: 1 - depth * 0.12
                    }}
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="pointer-events-none absolute inset-0"
                    style={{ zIndex: 10 - depth }}
                  >
                    <RestaurantStackPreview restaurant={restaurant} depth={depth} />
                  </motion.div>
                );
              })}
            <motion.div
              key={primaryRestaurant.id}
              initial={{ opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "tween", duration: 0.12, ease: "easeOut" }}
              className="absolute inset-0 z-20"
            >
              <RestaurantCard
                restaurant={primaryRestaurant}
                onDecision={onDecision}
                priority
              />
            </motion.div>
          </div>
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
              <h2 className="mt-5 text-2xl font-black text-slate-950">滑完啦</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                你已经滑完啦，去看看你们的共同心动餐厅吧。
              </p>
              <button
                type="button"
                onClick={onViewMatches}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
              >
                <ListChecks size={19} />
                查看共同心动榜
              </button>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs font-black text-rose-400">
                <Heart size={14} className="fill-rose-400" />
                {state.likedIds.length} 家被你右滑
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function RestaurantStackPreview({
  restaurant,
  depth
}: {
  restaurant: Restaurant;
  depth: number;
}) {
  return (
    <div className="relative h-full min-h-[560px]">
      <article className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_18px_50px_rgba(15,118,110,0.14)] ring-1 ring-teal-900/8">
        <div className="relative h-[64%] overflow-hidden bg-teal-50">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            draggable={false}
            loading={depth === 1 ? "eager" : "lazy"}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/8 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <h2 className="truncate text-2xl font-black">{restaurant.name}</h2>
            <p className="mt-2 text-sm font-black text-teal-100">
              {restaurant.cuisine} · ¥{restaurant.price}/人
            </p>
          </div>
        </div>
        <div className="h-[36%] p-5">
          <div className="h-4 w-24 rounded-full bg-slate-100" />
          <div className="mt-4 flex gap-2">
            {restaurant.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
