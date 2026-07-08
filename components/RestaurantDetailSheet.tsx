"use client";

import type { Restaurant } from "@/data/restaurants";
import { getRestaurantImages, preloadRestaurantImages } from "@/lib/restaurantImages";
import type { SwipeDecision } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
  UsersRound,
  Utensils,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RestaurantDetailSheetProps = {
  restaurant: Restaurant | null;
  likedBy?: string[];
  onClose: () => void;
  onDecision: (decision: SwipeDecision) => void;
};

export function RestaurantDetailSheet({
  restaurant,
  likedBy = [],
  onClose,
  onDecision
}: RestaurantDetailSheetProps) {
  const images = useMemo(
    () => (restaurant ? getRestaurantImages(restaurant) : []),
    [restaurant]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const activeImage = images[imageIndex] ?? images[0] ?? "";

  useEffect(() => {
    setImageIndex(0);
    if (restaurant) preloadRestaurantImages(restaurant, 3);
  }, [restaurant]);

  function moveImage(direction: 1 | -1) {
    if (images.length <= 1) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  function choose(decision: SwipeDecision) {
    onClose();
    onDecision(decision);
  }

  return (
    <AnimatePresence>
      {restaurant ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-0 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            initial={{ y: 520 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-[430px] overflow-hidden rounded-t-lg bg-white shadow-[0_-28px_80px_rgba(15,23,42,0.26)]"
          >
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200" />

            <div className="max-h-[calc(92dvh-6rem)] overflow-y-auto pb-4 no-scrollbar">
              <div className="relative mt-3 h-72 overflow-hidden bg-teal-50">
                <div className="absolute left-3 right-3 top-3 z-20 flex gap-1.5">
                  {images.map((image) => (
                    <span
                      key={image}
                      className={`h-1.5 flex-1 rounded-full ${
                        image === activeImage ? "bg-white" : "bg-white/42"
                      }`}
                    />
                  ))}
                </div>
                <motion.img
                  key={activeImage}
                  src={activeImage}
                  alt={restaurant.name}
                  initial={{ opacity: 0.35, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/10" />
                <button
                  type="button"
                  aria-label="上一张图片"
                  onClick={() => moveImage(-1)}
                  className="absolute inset-y-10 left-0 w-1/2"
                />
                <button
                  type="button"
                  aria-label="下一张图片"
                  onClick={() => moveImage(1)}
                  className="absolute inset-y-10 right-0 w-1/2"
                />
                <button
                  type="button"
                  aria-label="关闭详情"
                  onClick={onClose}
                  className="absolute right-4 top-7 z-30 grid size-10 place-items-center rounded-full bg-white/92 text-slate-700 shadow-sm backdrop-blur"
                >
                  <X size={18} />
                </button>
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-sm font-black backdrop-blur">
                    <Utensils size={16} />
                    {restaurant.cuisine}
                  </div>
                  <h2 className="mt-3 text-3xl font-black leading-tight">
                    {restaurant.name}
                  </h2>
                </div>
              </div>

              <div className="space-y-4 px-5 pt-5">
                <div className="grid grid-cols-3 gap-2 text-sm font-black text-slate-700">
                  <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                    <Star size={17} className="fill-amber-400 text-amber-400" />
                    <p className="mt-2">{restaurant.rating.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-teal-50 p-3 text-teal-700">
                    <Wallet size={17} />
                    <p className="mt-2">¥{restaurant.price}/人</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <MapPin size={17} />
                    <p className="mt-2">{restaurant.distance}</p>
                  </div>
                </div>

                {likedBy.length > 0 ? (
                  <div className="rounded-lg bg-rose-50 p-4 text-sm font-bold text-rose-500">
                    <div className="flex items-center gap-2 font-black">
                      <UsersRound size={17} />
                      已有 {likedBy.length} 人喜欢
                    </div>
                    <p className="mt-2 leading-6">{likedBy.join("、")}</p>
                  </div>
                ) : null}

                <section>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <Sparkles size={17} className="text-teal-500" />
                    推荐理由
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                    {restaurant.recommendedReason ?? restaurant.description}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-black text-slate-950">适合场景</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(restaurant.bestFor ?? []).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 ring-1 ring-teal-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-black text-slate-950">全部标签</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <MessageCircle size={17} className="text-teal-500" />
                      模拟食评
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                      Demo 文案
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(restaurant.reviews ?? []).map((review) => (
                      <article
                        key={review.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200/70"
                      >
                        <div className="flex items-center justify-between gap-3 font-black text-slate-700">
                          <span>{review.author}</span>
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Star size={14} className="fill-amber-400 text-amber-400" />
                            {review.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-2 font-bold leading-6 text-slate-600">
                          {review.text}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="safe-bottom grid grid-cols-2 gap-3 border-t border-slate-100 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => choose("skip")}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-rose-50 text-base font-black text-rose-500"
              >
                <X size={19} />
                不想吃
              </button>
              <button
                type="button"
                onClick={() => choose("like")}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
              >
                <Heart size={19} className="fill-white" />
                想吃
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
