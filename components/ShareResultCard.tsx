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
      className="overflow-hidden rounded-lg bg-[#143e3a] text-white shadow-[0_12px_36px_rgba(14,57,52,0.15)]"
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
        <div className="absolute left-4 top-4 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950">
          今晚就吃这家
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="break-words text-xs font-semibold text-teal-100">{locationLabel}</p>
          <h2 className="mt-1 line-clamp-2 break-words text-[27px] font-bold leading-tight">{restaurant.name}</h2>
          <p className="mt-2 text-sm font-medium text-teal-100">{restaurant.cuisine}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
            <Heart size={15} className="fill-current" />
            {match.count} 人共同喜欢
          </span>
          {decisionVoteCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950">
              <Vote size={15} />
              二轮 {decisionVoteCount} 票
            </span>
          ) : null}
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/95">
            {consensusLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-y border-white/15 py-3 text-xs font-medium text-white/90">
          <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-300 text-amber-300" />{formatRestaurantRating(restaurant)}</span>
          <span className="inline-flex items-center gap-1"><Wallet size={14} />{formatRestaurantPrice(restaurant, "人均待确认")}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={14} />{restaurant.distance || "距离待确认"}</span>
        </div>

        <p className="flex min-w-0 items-start gap-2 break-words text-sm leading-6 text-white/85">
          <MapPin size={16} className="mt-0.5 shrink-0 text-teal-200" />
          {restaurant.address || "地址待确认"}
        </p>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs font-semibold text-teal-100">一起点头的人</p>
          <p className="mt-1 break-words text-sm leading-6 text-white/90">
            {match.likedBy.join("、") || "饭局成员"}
          </p>
        </div>
        <p className="text-center text-xs font-medium text-white/70">
          来自吃啥 Match 的共同心动结果
        </p>
      </div>
    </motion.article>
  );
}
