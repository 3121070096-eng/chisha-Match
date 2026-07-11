"use client";

import { RestaurantCard } from "@/components/RestaurantCard";
import { RestaurantDetailSheet } from "@/components/RestaurantDetailSheet";
import type { Restaurant } from "@/data/restaurants";
import { trackEvent, trackImageLoadFailed } from "@/lib/analytics";
import { formatRestaurantPrice } from "@/lib/restaurantDisplay";
import {
  getRestaurantCover,
  preloadRestaurantImages,
  useFallbackImage
} from "@/lib/restaurantImages";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/storage";
import type { Room, SwipeDecision, SwipeState } from "@/types";
import { motion } from "framer-motion";
import { CircleHelp, Heart, ListChecks, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

type SwipeDeckProps = {
  room: Room;
  state: SwipeState;
  currentRestaurant: Restaurant | null;
  deckRestaurants?: Restaurant[];
  totalRestaurants: number;
  onDecision: (decision: SwipeDecision) => void;
  onViewMatches: () => void;
  tutorialMode?: "room" | "demo";
};

export function SwipeDeck({
  room,
  state,
  currentRestaurant,
  deckRestaurants,
  totalRestaurants,
  onDecision,
  onViewMatches,
  tutorialMode = "room"
}: SwipeDeckProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [detailRestaurant, setDetailRestaurant] = useState<Restaurant | null>(null);
  const selectedCount = Math.min(state.seenIds.length, totalRestaurants);
  const visibleRestaurants = useMemo(() => {
    if (deckRestaurants?.length) return deckRestaurants.slice(0, 4);
    return currentRestaurant ? [currentRestaurant] : [];
  }, [currentRestaurant, deckRestaurants]);
  const primaryRestaurant = visibleRestaurants[0] ?? null;
  const queuedRestaurants = visibleRestaurants.slice(1, 3);

  useLayoutEffect(() => {
    visibleRestaurants.slice(0, 4).forEach((restaurant, index) => {
      preloadRestaurantImages(restaurant, index === 0 ? 3 : 1, index < 2);
    });
  }, [visibleRestaurants]);

  useEffect(() => {
    if (!primaryRestaurant) return;
    const tutorialKey = `swipe-tutorial:${tutorialMode}`;
    if (hasSeenOnboarding(tutorialKey)) return;

    markOnboardingSeen(tutorialKey);
    setShowTutorial(true);
    void trackEvent({
      roomId: tutorialMode === "room" ? room.id : undefined,
      eventName: "swipe_tutorial_viewed",
      metadata: { mode: tutorialMode }
    });
  }, [primaryRestaurant, room.id, tutorialMode]);

  function dismissTutorial() {
    setShowTutorial(false);
    void trackEvent({
      roomId: tutorialMode === "room" ? room.id : undefined,
      eventName: "swipe_tutorial_dismissed",
      metadata: { mode: tutorialMode }
    });
  }

  const detailLikedBy = useMemo(() => {
    if (!detailRestaurant) return [];
    return (
      state.matches.find((match) => match.restaurantId === detailRestaurant.id)?.likedBy ??
      []
    );
  }, [detailRestaurant, state.matches]);

  return (
    <section className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="min-w-0 truncate text-xs font-black text-slate-500">
          <span className="mr-1 text-teal-600">第 2 步 / 3 步</span>
          {room.location} · {room.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-black">
          <span className="rounded-full bg-white px-2.5 py-1.5 text-slate-600 ring-1 ring-teal-900/5">
            {selectedCount}/{totalRestaurants}
          </span>
          <button
            type="button"
            onClick={onViewMatches}
            className="rounded-full bg-teal-50 px-2.5 py-1.5 text-teal-700 ring-1 ring-teal-100"
          >
            {state.matches.length} 心动
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            className="grid size-7 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-teal-900/5"
            aria-label="查看滑卡玩法"
          >
            <CircleHelp size={13} />
          </button>
        </div>
      </div>

      {showHelp ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-500 ring-1 ring-teal-900/5"
        >
          <span className="inline-flex items-center gap-1"><X size={13} className="text-rose-400" /> 左滑跳过</span>
          <span className="inline-flex items-center gap-1 text-teal-700"><Heart size={13} className="fill-teal-500" /> 右滑想吃</span>
          <span className="inline-flex items-center gap-1 text-amber-700"><ListChecks size={13} /> 看榜</span>
        </motion.div>
      ) : null}

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
                onOpenDetails={setDetailRestaurant}
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

        {showTutorial ? (
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute inset-x-2 bottom-3 z-30"
          >
            <div className="pointer-events-auto relative rounded-lg bg-slate-950 p-4 text-white shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
              <button
                type="button"
                aria-label="关闭滑卡教学"
                onClick={dismissTutorial}
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/12 text-white"
              >
                <X size={15} />
              </button>
              <p className="pr-8 text-sm font-black">
                {tutorialMode === "demo" ? "这是一个模拟饭局，先试试滑卡和 Match。" : "像交友软件一样滑餐厅"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                <span className="rounded-lg bg-white/10 px-3 py-2 text-rose-200">左滑：不想吃</span>
                <span className="rounded-lg bg-teal-500 px-3 py-2">右滑：想吃</span>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-300">
                你和朋友都右滑同一家，就会 Match。
              </p>
              <button
                type="button"
                onClick={dismissTutorial}
                className="mt-3 h-10 w-full rounded-full bg-white text-sm font-black text-slate-900"
              >
                知道了，开始滑
              </button>
            </div>
          </motion.aside>
        ) : null}
      </div>

      <RestaurantDetailSheet
        restaurant={detailRestaurant}
        likedBy={detailLikedBy}
        onClose={() => setDetailRestaurant(null)}
        onDecision={onDecision}
      />
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
    <div className="relative h-full min-h-[520px]">
      <article className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_18px_50px_rgba(15,118,110,0.14)] ring-1 ring-teal-900/8">
        <div className="relative h-[78%] overflow-hidden bg-teal-50">
          <img
            src={getRestaurantCover(restaurant)}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            draggable={false}
            loading={depth === 1 ? "eager" : "lazy"}
            fetchPriority={depth === 1 ? "high" : "auto"}
            decoding="async"
            onError={(event) => {
              trackImageLoadFailed(restaurant, getRestaurantCover(restaurant));
              useFallbackImage(event.currentTarget, restaurant);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/8 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <h2 className="truncate text-2xl font-black">{restaurant.name}</h2>
            <p className="mt-2 text-sm font-black text-teal-100">
              {restaurant.cuisine} · {formatRestaurantPrice(restaurant)}
            </p>
          </div>
        </div>
        <div className="h-[22%] p-4">
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
