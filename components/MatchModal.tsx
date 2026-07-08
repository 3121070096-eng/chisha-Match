"use client";

import type { Restaurant } from "@/data/restaurants";
import { trackImageLoadFailed } from "@/lib/analytics";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, ListChecks, Sparkles, X } from "lucide-react";

type MatchModalProps = {
  restaurant: Restaurant | null;
  likedBy: string[];
  onContinue: () => void;
  onViewMatches: () => void;
};

export function MatchModal({
  restaurant,
  likedBy,
  onContinue,
  onViewMatches
}: MatchModalProps) {
  const count = likedBy.length;

  return (
    <AnimatePresence>
      {restaurant ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-teal-950/50 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ scale: 0.78, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.86, opacity: 0, y: 28 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-full max-w-[360px] overflow-hidden rounded-lg bg-white shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={onContinue}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm"
            >
              <X size={18} />
            </button>

            <div className="relative h-56 overflow-hidden">
              <img
                src={getRestaurantCover(restaurant)}
                alt={restaurant.name}
                className="h-full w-full object-cover"
                width={720}
                height={420}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(event) => {
                  trackImageLoadFailed(restaurant, getRestaurantCover(restaurant));
                  useFallbackImage(event.currentTarget);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/75 via-teal-900/10 to-transparent" />
              <motion.div
                initial={{ scale: 0.2, rotate: -18 }}
                animate={{ scale: [0.2, 1.08, 1], rotate: [0, -8, 0] }}
                transition={{ delay: 0.08, duration: 0.62 }}
                className="absolute left-1/2 top-8 grid size-20 -translate-x-1/2 place-items-center rounded-full bg-teal-500 text-white shadow-xl shadow-teal-950/30"
              >
                <Heart size={38} className="fill-white" />
              </motion.div>
              <div className="absolute inset-x-0 bottom-5 px-6 text-center text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-black backdrop-blur">
                  <Sparkles size={15} />
                  Match
                </div>
                <h2 className="mt-3 text-3xl font-black">{restaurant.name}</h2>
              </div>
            </div>

            <div className="p-5 text-center">
              <h3 className="text-2xl font-black text-slate-950">
                你们都想吃这家！
              </h3>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                {likedBy.join("、")} 已经达成 {count} 人共同心动
              </p>
              <button
                type="button"
                onClick={onViewMatches}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
              >
                <ListChecks size={18} />
                查看共同心动榜
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-100 text-base font-black text-slate-700"
              >
                继续滑
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
