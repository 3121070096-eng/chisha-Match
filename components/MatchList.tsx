"use client";

import type { MatchItem } from "@/types";
import { trackImageLoadFailed } from "@/lib/analytics";
import { formatRestaurantPrice, formatRestaurantRating } from "@/lib/restaurantDisplay";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import type { RecommendedMatch } from "@/lib/decision";
import {
  getRestaurantQualityHighlights,
  type RestaurantQualityContext
} from "@/lib/restaurantQuality";
import { motion } from "framer-motion";
import {
  Check,
  Crown,
  Dices,
  Heart,
  MapPin,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  Vote,
  Wallet
} from "lucide-react";

type MatchListProps = {
  items: MatchItem[];
  onChooseFinal: (restaurantId: string) => void;
  onContinueSwipe: () => void;
  qualityContext?: RestaurantQualityContext;
  recommendation?: RecommendedMatch | null;
  decisionVoteCounts?: Record<string, number>;
  currentVoteRestaurantId?: string;
  voting?: boolean;
  onVote?: (restaurantId: string) => void;
  randomResult?: MatchItem | null;
  randomizing?: boolean;
  onRandom?: () => void;
  onAcceptRandom?: () => void;
  isDecided?: boolean;
  decidedRestaurantName?: string | null;
  onViewResult?: () => void;
  onRestart?: () => void;
};

export function MatchList({
  items,
  onChooseFinal,
  onContinueSwipe,
  qualityContext,
  recommendation,
  decisionVoteCounts = {},
  currentVoteRestaurantId,
  voting = false,
  onVote,
  randomResult,
  randomizing = false,
  onRandom,
  onAcceptRandom,
  isDecided = false,
  decidedRestaurantName,
  onViewResult,
  onRestart
}: MatchListProps) {
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
          这些是你们都愿意去的餐厅，选一家就可以出发啦。
        </p>
      </div>

      {isDecided ? (
        <section className="mb-4 rounded-lg bg-teal-600 p-4 text-white shadow-[0_16px_38px_rgba(13,148,136,0.22)]">
          <p className="text-xs font-black text-teal-100">饭局已决定</p>
          <h2 className="mt-1 text-xl font-black">今晚就吃 {decidedRestaurantName ?? "这家"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onViewResult}
              className="h-11 rounded-full bg-white text-sm font-black text-teal-700"
            >
              查看结果
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="h-11 rounded-full bg-teal-500 text-sm font-black text-white ring-1 ring-white/40"
            >
              再开一局
            </button>
          </div>
        </section>
      ) : null}

      {!isDecided && recommendation ? (
        <section className="mb-4 overflow-hidden rounded-lg bg-teal-50 p-4 ring-1 ring-teal-100">
          <div className="flex items-center gap-2 text-sm font-black text-teal-700">
            <Sparkles size={17} />
            最推荐今晚吃这家
          </div>
          <div className="mt-3 flex items-center gap-3">
            <img
              src={getRestaurantCover(recommendation.item.restaurant)}
              alt={recommendation.item.restaurant.name}
              className="size-16 shrink-0 rounded-lg object-cover"
              onError={(event) => useFallbackImage(event.currentTarget, recommendation.item.restaurant)}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-black text-slate-950">
                {recommendation.item.restaurant.name}
              </h2>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                {recommendation.reasonText}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendation.reasonTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-teal-700">
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChooseFinal(recommendation.item.restaurant.id)}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-600 text-sm font-black text-white"
          >
            <Trophy size={16} />
            就吃这家
          </button>
        </section>
      ) : null}

      {!isDecided ? (
        <section className="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <p className="text-sm font-black text-slate-900">还纠结的话，每个人再投一票，票数最高的优先。</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">每位成员最多 1 票，可以随时改投。</p>
          {onRandom ? (
            <button
              type="button"
              onClick={onRandom}
              disabled={randomizing}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-black text-white disabled:bg-slate-400"
            >
              <Dices size={17} />
              {randomizing ? "正在替你们决定..." : items.length > 1 ? "帮我们随机一家" : "就这一家"}
            </button>
          ) : null}
          {randomResult ? (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
              <p className="text-xs font-black text-amber-700">别纠结了，今晚就它吧！</p>
              <p className="mt-1 text-lg font-black text-slate-950">{randomResult.restaurant.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onAcceptRandom}
                  className="h-10 rounded-full bg-amber-400 text-sm font-black text-slate-950"
                >
                  就吃这家
                </button>
                <button
                  type="button"
                  onClick={onRandom}
                  className="h-10 rounded-full bg-white text-sm font-black text-slate-700 ring-1 ring-amber-200"
                >
                  再随机一次
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="space-y-3">
        {items.map(({ match, restaurant }, index) => {
          const rank = index + 1;
          const isTop = rank === 1;
          const highlights = getRestaurantQualityHighlights(restaurant, qualityContext);
          const voteCount = decisionVoteCounts[restaurant.id] ?? 0;
          const topVoteCount = Math.max(...items.map((item) => decisionVoteCounts[item.restaurant.id] ?? 0));
          const labels = [
            ...(isTop ? ["最高共识"] : []),
            ...(voteCount > 0 && voteCount === topVoteCount ? ["当前领先"] : []),
            ...(recommendation?.item.restaurant.id === restaurant.id ? ["最推荐"] : []),
            ...(restaurant.source === "amap" ? ["真实餐厅"] : []),
            ...highlights
          ].filter((label, labelIndex, all) => all.indexOf(label) === labelIndex).slice(0, 3);

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
                  width={720}
                  height={420}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  onError={(event) => {
                    trackImageLoadFailed(restaurant, getRestaurantCover(restaurant));
                    useFallbackImage(event.currentTarget, restaurant);
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-2 text-sm font-black ${isTop ? "bg-amber-400 text-slate-950" : "bg-white text-slate-800"}`}>
                    TOP {rank}
                  </span>
                  {labels.slice(0, 2).map((label) => (
                    <span key={label} className="rounded-full bg-white/92 px-3 py-2 text-xs font-black text-teal-700 backdrop-blur">
                      {label}
                    </span>
                  ))}
                </div>
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
                    {formatRestaurantRating(restaurant)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2">
                    <Wallet size={14} />
                    {formatRestaurantPrice(restaurant, "")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-2">
                    <MapPin size={14} />
                    {restaurant.distance}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {labels.slice(2).map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700"
                    >
                      {highlight}
                    </span>
                  ))}
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

              {!isDecided && onVote ? (
                <div className="flex items-center justify-between gap-3 border-t border-teal-900/5 px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-sm font-black text-slate-600">
                    <Vote size={16} className="text-teal-600" />
                    二轮票数：{voteCount}
                  </span>
                  <button
                    type="button"
                    disabled={voting || currentVoteRestaurantId === restaurant.id}
                    onClick={() => onVote(restaurant.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-teal-50 px-4 text-xs font-black text-teal-700 ring-1 ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {currentVoteRestaurantId === restaurant.id ? <Check size={15} /> : <Vote size={15} />}
                    {currentVoteRestaurantId === restaurant.id ? "已投" : "投它一票"}
                  </button>
                </div>
              ) : null}

              {!isDecided ? (
                <button
                  type="button"
                  onClick={() => onChooseFinal(restaurant.id)}
                  className="flex h-12 w-full items-center justify-center gap-2 border-t border-teal-900/5 bg-teal-50 text-sm font-black text-teal-700"
                >
                  <Trophy size={17} />
                  就吃这家
                </button>
              ) : null}
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
