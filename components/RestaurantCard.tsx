"use client";

import type { Restaurant } from "@/data/restaurants";
import type { SwipeDecision } from "@/types";
import {
  Clock3,
  Heart,
  MapPin,
  Star,
  Utensils,
  Wallet,
  X
} from "lucide-react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform
} from "framer-motion";
import { memo, useState } from "react";

type RestaurantCardProps = {
  restaurant: Restaurant;
  onDecision: (decision: SwipeDecision) => void;
  priority?: boolean;
};

export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  onDecision,
  priority = false
}: RestaurantCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const skipOpacity = useTransform(x, [-130, -30], [1, 0]);
  const likeScale = useTransform(x, [30, 140], [0.86, 1]);
  const skipScale = useTransform(x, [-140, -30], [1, 0.86]);
  const controls = useAnimationControls();
  const [busy, setBusy] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  function finish(decision: SwipeDecision) {
    if (busy) return;
    setBusy(true);

    const direction = decision === "like" ? 1 : -1;
    void controls.start({
      x: direction * 520,
      rotate: direction * 16,
      opacity: 0,
      scale: 0.94,
      transition: { type: "tween", duration: 0.18, ease: "easeOut" }
    });

    window.setTimeout(() => {
      onDecision(decision);
    }, 70);
  }

  return (
    <div className="relative h-full min-h-[560px]">
      <motion.article
        drag="x"
        dragElastic={0.18}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 112 || info.velocity.x > 650) {
            void finish("like");
            return;
          }

          if (info.offset.x < -112 || info.velocity.x < -650) {
            void finish("skip");
            return;
          }

          void controls.start({
            x: 0,
            rotate: 0,
            transition: { type: "spring", stiffness: 420, damping: 28 }
          });
        }}
        animate={controls}
        style={{ x, rotate }}
        className="absolute inset-0 overflow-hidden rounded-lg bg-white shadow-[0_26px_70px_rgba(15,118,110,0.22)] ring-1 ring-teal-900/10"
      >
        <div className="relative h-[64%] overflow-hidden bg-teal-100">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-teal-100 via-white to-amber-100 transition-opacity duration-300 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/76 via-slate-950/10 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 text-sm font-black text-teal-700 shadow-sm backdrop-blur">
            <Utensils size={16} />
            {restaurant.cuisine}
          </div>
          <motion.div
            style={{ opacity: likeOpacity, scale: likeScale }}
            className="absolute right-5 top-20 -rotate-6 rounded-lg border-4 border-teal-400 bg-white/92 px-5 py-2 text-2xl font-black text-teal-500 shadow-lg"
          >
            想吃
          </motion.div>
          <motion.div
            style={{ opacity: skipOpacity, scale: skipScale }}
            className="absolute left-5 top-20 rotate-6 rounded-lg border-4 border-rose-400 bg-white/92 px-5 py-2 text-2xl font-black text-rose-500 shadow-lg"
          >
            不想吃
          </motion.div>
          <div className="absolute inset-x-0 bottom-4 px-5 text-white">
            <h2 className="text-3xl font-black leading-tight">{restaurant.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-white/92">
              <span className="inline-flex items-center gap-1">
                <Star size={16} className="fill-amber-300 text-amber-300" />
                {restaurant.rating.toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={16} />
                {restaurant.distance}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet size={16} />
                ¥{restaurant.price}/人
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-[36%] flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500">
              <Clock3 size={16} />
              饭局候选
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {restaurant.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700 ring-1 ring-teal-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => finish("skip")}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-rose-50 text-base font-black text-rose-500 transition active:scale-[0.97]"
            >
              <X size={21} />
              不想吃
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => finish("like")}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition active:scale-[0.97]"
            >
              <Heart size={21} className="fill-white" />
              想吃
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
});
