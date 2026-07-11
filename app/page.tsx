"use client";

import { AppChrome } from "@/components/AppChrome";
import type { Restaurant } from "@/data/restaurants";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { getRoomHref } from "@/lib/roomUrl";
import { getDemoRestaurants } from "@/lib/restaurantSource";
import {
  getReadableSupabaseError
} from "@/lib/supabaseErrors";
import {
  getCurrentUser,
  hasSeenOnboarding,
  markOnboardingSeen,
  saveCurrentUser,
  saveRoomAccessToken,
  saveRoomMemberSession
} from "@/lib/storage";
import { InvalidRoomTokenError, joinSupabaseRoom } from "@/lib/supabaseRooms";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Heart,
  LogIn,
  MapPin,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const steps = [
  { title: "创建饭局", detail: "选地点、预算和想吃的类型", icon: MapPin },
  { title: "邀请朋友", detail: "发链接，一起看同一批餐厅", icon: Users },
  { title: "自动 Match", detail: "都右滑的餐厅进入心动榜", icon: Heart }
];

const scenes = ["朋友聚餐前", "下课 / 下班后约饭", "旅行时临时找餐厅", "情侣或小队伍纠结吃什么"];

export default function HomePage() {
  const router = useRouter();
  const homeRestaurants = getDemoRestaurants();
  const [joinOpen, setJoinOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.nickname) setNickname(user.nickname);

    if (!hasSeenOnboarding("homepage-viewed")) {
      markOnboardingSeen("homepage-viewed");
      void trackEvent({ eventName: "homepage_viewed" });
      void trackEvent({ eventName: "public_beta_home_viewed" });
    }
  }, []);

  function startCreateRoom() {
    void trackEvent({ eventName: "create_room_cta_clicked", metadata: { entry: "homepage" } });
    router.push("/create");
  }

  function startDemo() {
    void trackEvent({ eventName: "demo_cta_clicked", metadata: { entry: "homepage" } });
    router.push("/demo");
  }

  function scrollToHow() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("请输入旧房间邀请码，或直接打开朋友发来的邀请链接。");
      return;
    }

    setJoining(true);

    try {
      void trackEvent({
        eventName: "member_name_submitted",
        metadata: { entry: "homepage_join", nickname: nickname.trim() || "饭友" }
      });
      const user = saveCurrentUser(nickname || "饭友");
      const { room, member } = await joinSupabaseRoom(code, user);
      saveRoomMemberSession(room.id, member, user.id);
      saveRoomAccessToken(room.id, room.shareToken);
      void trackEvent({
        roomId: room.id,
        memberId: member.id,
        eventName: "member_joined",
        metadata: {
          member_name: member.nickname,
          room_location_label: getRestaurantAreaLabel(room.location),
          room_area_key: getRestaurantAreaKey(room.location)
        }
      });
      if (room.status === "decided") {
        void trackEvent({
          roomId: room.id,
          memberId: member.id,
          eventName: "joined_decided_room",
          metadata: { restaurant_id: room.finalRestaurantId, entry: "homepage_join" }
        });
      }
      router.push(getRoomHref("/room", room.id, room.shareToken));
    } catch (joinError) {
      console.error("[Home] join room failed", joinError);
      if (joinError instanceof InvalidRoomTokenError) {
        void trackEvent({ eventName: "invalid_room_token", metadata: { entry: "homepage_join" } });
        setError("新饭局需要通过朋友发来的完整邀请链接加入。");
        return;
      }
      setError(getReadableSupabaseError(joinError, "加入饭局失败"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <AppChrome
      rightSlot={
        <div className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 ring-1 ring-teal-100">
          Public Beta
        </div>
      }
    >
      <section className="flex min-h-0 flex-1 flex-col px-5 pb-7 pt-3">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-teal-100">
            <Sparkles size={14} />
            吃啥 Match · Beta
          </div>
          <h1 className="mt-4 text-4xl font-black leading-[1.08] text-slate-950">
            像交友软件一样，
            <span className="block text-teal-600">和朋友一起滑餐厅</span>
          </h1>
          <p className="mt-4 max-w-[23rem] text-base font-semibold leading-7 text-slate-600">
            左滑不想吃，右滑想吃。你和朋友都喜欢的餐厅会自动 Match，再也不用群里问“吃什么”。
          </p>
          <p className="mt-3 text-sm font-bold text-slate-400">适合朋友聚餐、约饭前快速达成共识。</p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={startCreateRoom}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition active:scale-[0.98]"
            >
              <Plus size={21} />
              创建饭局
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={startDemo}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-black text-teal-700 shadow-sm ring-1 ring-teal-200 transition active:scale-[0.98]"
            >
              <Play size={19} className="fill-teal-500 text-teal-500" />
              快速体验
            </button>
            <button
              type="button"
              onClick={scrollToHow}
              className="flex h-9 w-full items-center justify-center gap-1.5 text-sm font-black text-slate-500"
            >
              先看看怎么玩 <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>

        <ProductPreview restaurants={homeRestaurants} />

        <section id="how-it-works" className="scroll-mt-4 pt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-teal-600">三步搞定</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">不用再在群里投票</h2>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">一起滑就好</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="flex min-h-24 items-center gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600">
                    <Icon size={19} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-teal-600">{index + 1}. {step.title}</p>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">{step.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-7 border-t border-teal-900/8 pt-6">
          <p className="text-sm font-black text-slate-800">适合这些时候</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {scenes.map((scene) => (
              <span key={scene} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-teal-900/5">
                {scene}
              </span>
            ))}
          </div>
        </section>

        <div className="safe-bottom mt-8 space-y-3 text-center">
          <button
            type="button"
            onClick={() => setJoinOpen((value) => !value)}
            className="inline-flex h-10 items-center justify-center gap-2 text-sm font-black text-slate-600"
          >
            <LogIn size={16} />
            已有旧饭局？输入邀请码加入
          </button>
          <div className="flex items-center justify-center gap-4 text-xs font-black text-slate-400">
            <Link href="/about">关于项目</Link>
            <Link href="/privacy" className="inline-flex items-center gap-1"><ShieldCheck size={13} />隐私说明</Link>
          </div>
        </div>
      </section>

      {joinOpen ? (
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleJoin}
          className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] rounded-t-lg bg-white px-5 pb-5 pt-4 shadow-[0_-18px_60px_rgba(15,118,110,0.16)] ring-1 ring-teal-900/5"
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
          <p className="text-lg font-black text-slate-950">加入旧版饭局</p>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-500">新饭局请直接打开朋友发来的完整邀请链接。</p>
          <label className="mt-4 block text-sm font-black text-slate-700">
            昵称
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="比如：阿陈"
              className="mt-2 h-12 w-full rounded-lg border border-teal-900/10 bg-teal-50/60 px-4 text-base font-bold outline-none focus:border-teal-400 focus:bg-white"
            />
          </label>
          <label className="mt-4 block text-sm font-black text-slate-700">
            邀请码
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="比如：A1B2C3"
              className="mt-2 h-12 w-full rounded-lg border border-teal-900/10 bg-teal-50/60 px-4 text-base font-bold tracking-[0.16em] outline-none focus:border-teal-400 focus:bg-white"
            />
          </label>
          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-black text-rose-500">{error}</p> : null}
          <button type="submit" disabled={joining} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25">
            <Users size={20} />
            {joining ? "进入中" : "进入房间"}
          </button>
        </motion.form>
      ) : null}
    </AppChrome>
  );
}

function ProductPreview({ restaurants }: { restaurants: Restaurant[] }) {
  const primary = restaurants[0];
  const next = restaurants[1] ?? restaurants[0];
  if (!primary || !next) return null;

  return (
    <section className="relative mt-7 h-[300px] overflow-visible rounded-lg bg-teal-50/75 p-5 ring-1 ring-teal-100">
      <div className="absolute left-5 top-5 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
        朋友都右滑，自动 Match
      </div>
      <motion.article
        initial={{ rotate: -6, y: 10, opacity: 0.7 }}
        animate={{ rotate: -5, y: 0, opacity: 1 }}
        className="absolute bottom-5 left-7 right-9 top-14 overflow-hidden rounded-lg bg-white shadow-[0_18px_42px_rgba(15,118,110,0.14)]"
      >
        <img
          src={getRestaurantCover(next)}
          alt="下一家餐厅"
          className="h-32 w-full object-cover opacity-80"
          loading="eager"
          decoding="async"
          onError={(event) => useFallbackImage(event.currentTarget, next)}
        />
        <p className="px-4 pt-3 text-base font-black text-slate-700">{next.name}</p>
      </motion.article>
      <motion.article
        initial={{ rotate: 5, y: 20, opacity: 0 }}
        animate={{ rotate: 4, y: 0, opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="absolute bottom-3 left-11 right-4 top-11 overflow-hidden rounded-lg bg-white shadow-[0_22px_54px_rgba(15,118,110,0.2)] ring-1 ring-teal-900/5"
      >
        <div className="relative h-[73%]">
          <img
            src={getRestaurantCover(primary)}
            alt={primary.name}
            className="h-full w-full object-cover"
            width={640}
            height={360}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={(event) => useFallbackImage(event.currentTarget, primary)}
          />
          <div className="absolute left-4 top-4 -rotate-6 rounded-lg border-[3px] border-teal-500 px-3 py-1 text-lg font-black text-teal-600">
            想吃
          </div>
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-lg">
            <Users size={13} /> 阿陈也喜欢
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-950">{primary.name}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{primary.cuisine} · {primary.distance}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-500">
            <Heart size={13} className="fill-rose-500" /> Match!
          </span>
        </div>
      </motion.article>
    </section>
  );
}
