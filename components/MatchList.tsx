"use client";

import type { MatchItem } from "@/types";
import { getRestaurantCover } from "@/lib/restaurantImages";
import { motion } from "framer-motion";
import { Crown, Heart, MapPin, Star, Trophy, UsersRound, Wallet } from "lucide-react";

type MatchListProps = {
  items: MatchItem[];
  onChooseFinal: (restaurantId: string) => void;
  onContinueSwipe: () => void;
};

export function MatchList({ items, onChooseFinal, onContinueSwipe }: MatchListProps) {
  if (items.length === 0) {
    return (
      <div className="grid flex-1 place-items-center text-center">
        <div className="w-full rounded-lg bg-white p-6 shadow-[0_18px_50px_rgba(15,118,110,0.12)] ring-1 ring-teal-900/5">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-rose-50 text-rose-400">
            <Heart size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-950">榜单还空着</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            还没有共同喜欢的餐厅，继续滑滑看。
          </p>
          <button
            type="button"
            onClick={onContinueSwipe}
            className="mt-5 h-12 w-full rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
          >
            去滑卡
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-3 no-scrollbar">
      <div className="mb-4 overflow-hidden rounded-lg bg-slate-950 p-5 text-white shadow-[0_20px_56px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-teal-200">共同心动餐厅榜</p>
            <h1 className="mt-1 text-3xl font-black">{items.length} 家入围</h1>
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-amber-400 text-slate-950">
            <Crown size={24} className="fill-slate-950" />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          按共同喜欢人数排序，越靠前越不容易吵起来。
        </p>
      </div>

      <div className="space-y-3">
        {items.map(({ match, restaurant }, index) => {
          const rank = index + 1;
          const isTop = rank === 1;

          return (
            <motion.article
              key={match.restaurantId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`overflow-hidden rounded-lg bg-white shadow-sm ring-1 ${
                isTop
                  ? "ring-amber-300 shadow-[0_20px_56px_rgba(245,158,11,0.16)]"
                  : "ring-teal-900/5"
              }`}
            >
              <div className="relative h-40">
                <img
                  src={getRestaurantCover(restaurant)}
                  alt={restaurant.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                <div
                  className={`absolute left-3 top-3 rounded-full px-3 py-2 text-sm font-black ${
                    isTop ? "bg-amber-400 text-slate-950" : "bg-white text-slate-800"
                  }`}
                >
                  {isTop ? "最高共识" : `TOP ${rank}`}
                </div>
                {isTop ? (
                  <div className="absolute right-3 top-3 rounded-full bg-white/92 px-3 py-2 text-xs font-black text-amber-700 backdrop-blur">
                    TOP 1
                  </div>
                ) : null}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="truncate text-2xl font-black">{restaurant.name}</h2>
                  <p className="mt-1 text-sm font-black text-teal-100">
                    {restaurant.cuisine}
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-4 gap-2 text-xs font-black text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-2 text-teal-700">
                    <UsersRound size={14} />
                    {match.count} 人
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-2 text-amber-700">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {restaurant.rating.toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2">
                    <Wallet size={14} />
                    ¥{restaurant.price}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2">
                    <MapPin size={14} />
                    {restaurant.distance}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {match.likedBy.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChooseFinal(restaurant.id)}
                className="flex h-12 w-full items-center justify-center gap-2 border-t border-teal-900/5 bg-teal-50 text-sm font-black text-teal-700"
              >
                <Trophy size={17} />
                就吃这家
              </button>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
