"use client";

import type { MatchItem } from "@/types";
import { trackImageLoadFailed } from "@/lib/analytics";
import { formatRestaurantPrice, formatRestaurantRating } from "@/lib/restaurantDisplay";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { motion } from "framer-motion";
import { Heart, MapPin, Star, Vote, Wallet } from "lucide-react";

type ShareResultCardProps = {
  item: MatchItem;
  locationLabel: string;
  decisionVoteCount?: number;
};

export function ShareResultCard({
  item,
  locationLabel,
  decisionVoteCount = 0
}: ShareResultCardProps) {
  const { match, restaurant } = item;
  const consensusLabel =
    decisionVoteCount > 0
      ? "当前领先"
      : match.count >= 3
        ? "最高共识"
        : "共同心动";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,118,110,0.24)]"
    >
      <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden">
        <img
          src={getRestaurantCover(restaurant)}
          alt={restaurant.name}
          className="absolute inset-0 h-full w-full object-cover"
          width={720}
          height={540}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={(event) => {
            trackImageLoadFailed(restaurant, getRestaurantCover(restaurant));
            useFallbackImage(event.currentTarget, restaurant);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-slate-950/20">
          今晚就吃这家
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-xs font-black text-teal-100">{locationLabel}</p>
          <h2 className="mt-1 text-3xl font-black leading-tight">{restaurant.name}</h2>
          <p className="mt-2 text-base font-black text-teal-100">{restaurant.cuisine}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/18 px-3 py-2 text-sm font-black text-teal-100">
            <Heart size={15} className="fill-current" />
            {match.count} 人共同喜欢
          </span>
          {decisionVoteCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-sm font-black text-slate-950">
              <Vote size={15} />
              二轮 {decisionVoteCount} 票
            </span>
          ) : null}
          <span className="rounded-full bg-white/12 px-3 py-2 text-sm font-black text-white/90">
            {consensusLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/10 p-3">
            <Star size={16} className="fill-amber-300 text-amber-300" />
            <p className="mt-2 text-sm font-black">{formatRestaurantRating(restaurant)}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <Wallet size={16} className="text-teal-100" />
            <p className="mt-2 text-sm font-black">{formatRestaurantPrice(restaurant, "人均待确认")}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <MapPin size={16} className="text-teal-100" />
            <p className="mt-2 text-sm font-black">{restaurant.distance || "距离待确认"}</p>
          </div>
        </div>

        <p className="flex items-start gap-2 text-sm font-bold leading-6 text-white/76">
          <MapPin size={16} className="mt-0.5 shrink-0 text-teal-200" />
          {restaurant.address || "地址待确认"}
        </p>

        {restaurant.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {restaurant.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/80">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs font-black text-teal-100">一起点头的人</p>
          <p className="mt-1 text-sm font-bold leading-6 text-white/84">
            {match.likedBy.join("、") || "饭局成员"}
          </p>
        </div>
        <p className="text-center text-xs font-black text-white/45">
          来自吃啥 Match 的共同心动结果
        </p>
      </div>
    </motion.article>
  );
}
