"use client";

import type { MatchItem } from "@/types";
import { trackImageLoadFailed } from "@/lib/analytics";
import { formatRestaurantPrice, formatRestaurantRating } from "@/lib/restaurantDisplay";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { motion } from "framer-motion";
import { CheckCircle2, Heart, MapPin, Navigation, PartyPopper, Star, Vote, Wallet } from "lucide-react";

type FinalResultCardProps = {
  item: MatchItem;
  decisionVoteCount?: number;
  onOpenMap?: () => void;
};

export function FinalResultCard({
  item,
  decisionVoteCount = 0,
  onOpenMap
}: FinalResultCardProps) {
  const { match, restaurant } = item;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex flex-1 flex-col"
    >
      <div className="relative min-h-[540px] flex-1 overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,118,110,0.22)]">
        <img
          src={getRestaurantCover(restaurant)}
          alt={restaurant.name}
          className="absolute inset-0 h-full w-full object-cover"
          width={720}
          height={960}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={(event) => {
            trackImageLoadFailed(restaurant, getRestaurantCover(restaurant));
            useFallbackImage(event.currentTarget, restaurant);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/42 to-slate-950/5" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20">
          <PartyPopper size={18} />
          今晚就吃这家
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-sm font-black backdrop-blur">
            <Heart size={16} className="fill-white" />
            {match.count} 人共同心动
          </div>
          {decisionVoteCount > 0 ? (
            <div className="mb-4 ml-2 inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-2 text-sm font-black text-slate-950">
              <Vote size={16} />
              二轮 {decisionVoteCount} 票
            </div>
          ) : null}
          <h1 className="text-4xl font-black leading-tight">{restaurant.name}</h1>
          <p className="mt-3 text-lg font-black text-teal-100">{restaurant.cuisine}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/14 p-3 backdrop-blur">
              <Star size={17} className="fill-amber-300 text-amber-300" />
              <p className="mt-2 text-sm font-black">{formatRestaurantRating(restaurant)}</p>
            </div>
            <div className="rounded-lg bg-white/14 p-3 backdrop-blur">
              <Wallet size={17} />
              <p className="mt-2 text-sm font-black">{formatRestaurantPrice(restaurant, "")}</p>
            </div>
            <div className="rounded-lg bg-white/14 p-3 backdrop-blur">
              <MapPin size={17} />
              <p className="mt-2 text-sm font-black">{restaurant.distance}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/14 px-3 py-2 text-sm font-black backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
          {restaurant.address ? (
            <p className="mt-4 flex items-start gap-2 text-sm font-bold leading-6 text-white/80">
              <MapPin size={16} className="mt-0.5 shrink-0 text-teal-200" />
              {restaurant.address}
            </p>
          ) : null}
          {onOpenMap ? (
            <button
              type="button"
              onClick={onOpenMap}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-slate-800"
            >
              <Navigation size={17} className="text-teal-600" />
              打开高德地图
            </button>
          ) : null}
          <div className="mt-5 rounded-lg bg-white/12 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-black text-teal-100">
              <CheckCircle2 size={17} />
              已达成饭局共识
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-white/78">
              {match.likedBy.join("、")} 都点头了。
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
