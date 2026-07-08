"use client";

import type { Restaurant } from "@/data/restaurants";
import { getRestaurantImages, preloadRestaurantImages } from "@/lib/restaurantImages";
import type { SwipeDecision } from "@/types";
import {
  ChevronRight,
  Info,
  MapPin,
  Star,
  Utensils,
  Wallet,
} from "lucide-react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform
} from "framer-motion";
import { memo, useEffect, useMemo, useState } from "react";

type RestaurantCardProps = {
  restaurant: Restaurant;
  onDecision: (decision: SwipeDecision) => void;
  onOpenDetails?: (restaurant: Restaurant) => void;
  priority?: boolean;
};

export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  onDecision,
  onOpenDetails,
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
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const images = useMemo(() => getRestaurantImages(restaurant), [restaurant]);
  const activeImage = images[imageIndex] ?? images[0] ?? "";
  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%230f766e'/%3E%3Cstop offset='0.52' stop-color='%2314b8a6'/%3E%3Cstop offset='1' stop-color='%23f59e0b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='1200' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='54' font-family='Arial, sans-serif' font-weight='700' text-anchor='middle'%3E%E5%90%83%E5%95%A5%20Match%3C/text%3E%3C/svg%3E";
  const imageSrc = imageFailed ? fallbackImage : activeImage;

  useEffect(() => {
    setImageIndex(0);
    preloadRestaurantImages(restaurant, 3);
  }, [restaurant]);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [activeImage]);

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

  function openDetails() {
    onOpenDetails?.(restaurant);
  }

  function switchImage(direction: 1 | -1) {
    if (images.length <= 1) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
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
        <div className="relative h-[78%] overflow-hidden bg-teal-100">
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
          <div
            className={`absolute inset-0 bg-gradient-to-br from-teal-100 via-white to-amber-100 transition-opacity duration-300 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />
          <motion.img
            key={imageSrc}
            src={imageSrc}
            alt={restaurant.name}
            initial={{ opacity: 0.35, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="h-full w-full object-cover"
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageFailed(true);
              setImageLoaded(true);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/76 via-slate-950/10 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 text-sm font-black text-teal-700 shadow-sm backdrop-blur">
            <Utensils size={16} />
            {restaurant.cuisine}
          </div>
          <motion.div
            style={{ opacity: likeOpacity, scale: likeScale }}
            className="pointer-events-none absolute right-5 top-20 z-30 -rotate-6 rounded-lg border-4 border-teal-400 bg-white/92 px-5 py-2 text-2xl font-black text-teal-500 shadow-lg"
          >
            想吃
          </motion.div>
          <motion.div
            style={{ opacity: skipOpacity, scale: skipScale }}
            className="pointer-events-none absolute left-5 top-20 z-30 rotate-6 rounded-lg border-4 border-rose-400 bg-white/92 px-5 py-2 text-2xl font-black text-rose-500 shadow-lg"
          >
            不想吃
          </motion.div>
          <button
            type="button"
            aria-label="上一张餐厅图片"
            onClick={(event) => {
              event.stopPropagation();
              switchImage(-1);
            }}
            className="absolute bottom-24 left-0 top-8 z-10 w-1/2"
          />
          <button
            type="button"
            aria-label="下一张餐厅图片"
            onClick={(event) => {
              event.stopPropagation();
              switchImage(1);
            }}
            className="absolute bottom-24 right-0 top-8 z-10 w-1/2"
          />
          <div className="absolute inset-x-0 bottom-4 px-5 text-white">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                openDetails();
              }}
              className="max-w-full text-left"
            >
              <h2 className="text-3xl font-black leading-tight">{restaurant.name}</h2>
            </button>
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

        <div className="flex h-[22%] flex-col justify-center gap-3 p-4">
          <div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                openDetails();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-extrabold text-slate-600 ring-1 ring-slate-200/70"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Info size={16} className="shrink-0 text-teal-500" />
                <span className="truncate">查看详情和模拟食评</span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-slate-400" />
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {restaurant.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100"
                >
                  {tag}
                </span>
              ))}
            </div>
            {restaurant.tags.length > 3 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500"
                >
                  +{restaurant.tags.length - 3} 个标签在详情里
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </motion.article>
    </div>
  );
});
