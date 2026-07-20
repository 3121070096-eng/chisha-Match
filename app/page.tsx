"use client";

import { AppChrome } from "@/components/AppChrome";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { getRoomHref } from "@/lib/roomUrl";
import { getDemoRestaurants } from "@/lib/restaurantSource";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
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
import { ChevronRight, Heart, LogIn, MapPin, Play, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const steps = [
  { title: "创建饭局", detail: "选地点和预算", icon: MapPin },
  { title: "发给朋友", detail: "一起滑同一批", icon: Users },
  { title: "自动 Match", detail: "最后一起决定", icon: Heart }
];

export default function HomePage() {
  const router = useRouter();
  const homeRestaurants = getDemoRestaurants();
  const heroRestaurant = homeRestaurants[9] ?? homeRestaurants[0];
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

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("请输入邀请码，或直接打开朋友发来的邀请链接。");
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
      router.push(getRoomHref("/room", room.id, room.shareToken));
    } catch (joinError) {
      console.error("[Home] join room failed", joinError);
      if (joinError instanceof InvalidRoomTokenError) {
        void trackEvent({ eventName: "invalid_room_token", metadata: { entry: "homepage_join" } });
        setError("新饭局需要通过朋友发来的完整邀请链接加入。");
      } else {
        setError(getReadableSupabaseError(joinError, "加入饭局失败"));
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <AppChrome
      rightSlot={
        <div className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 ring-1 ring-teal-200">
          V4.2 Beta
        </div>
      }
    >
      <section className="flex flex-1 flex-col px-5 pb-7 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="flex flex-1 flex-col"
        >
          <div className="relative min-h-[390px] overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,118,110,0.22)]">
            {heroRestaurant ? (
              <img
                src={getRestaurantCover(heroRestaurant)}
                alt="朋友一起选择餐厅"
                className="absolute inset-0 h-full w-full object-cover"
                width={720}
                height={960}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(event) => useFallbackImage(event.currentTarget, heroRestaurant)}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/18" />
            <div className="absolute right-5 top-5 flex rotate-[-5deg] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-teal-600 shadow-lg">
              <Sparkles size={16} />
              Match!
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-xs font-black tracking-[0.12em] text-teal-50">吃啥 Match · V4.2 Beta</p>
              <h1 className="mt-3 text-4xl font-black leading-[1.06] text-white">
                像交友软件一样，
                <span className="block">和朋友一起滑餐厅</span>
              </h1>
              <p className="mt-4 max-w-[19rem] text-sm font-bold leading-6 text-white/95">
                左滑不想吃，右滑想吃。你和朋友都喜欢的餐厅会自动 Match。
              </p>
              <p className="mt-2 text-xs font-black text-teal-50">适合朋友聚餐、约饭前快速达成共识。</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="min-w-0 rounded-lg border border-teal-200/80 bg-teal-50 px-3 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-teal-700 text-[10px] font-black text-white shadow-sm">{index + 1}</span>
                    <span className="text-[10px] font-black text-teal-950">第 {index + 1} 步</span>
                    <Icon size={13} className="ml-auto shrink-0 text-teal-700" />
                  </div>
                  <p className="mt-2 truncate text-xs font-black text-teal-950">{step.title}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-teal-800">{step.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="safe-bottom mt-6 space-y-3">
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
              onClick={() => setJoinOpen((value) => !value)}
              className="flex h-10 w-full items-center justify-center gap-2 text-sm font-black text-slate-700"
            >
              <LogIn size={16} />
              已有旧饭局？加入饭局
            </button>
            <div className="flex items-center justify-center gap-4 pt-1 text-xs font-black text-slate-600">
              <Link href="/about">关于项目</Link>
              <Link href="/privacy" className="inline-flex items-center gap-1"><ShieldCheck size={13} />隐私说明</Link>
            </div>
          </div>
        </motion.div>

        {joinOpen ? (
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleJoin}
            className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] rounded-t-lg bg-white px-5 pb-5 pt-4 shadow-[0_-18px_60px_rgba(15,118,110,0.16)] ring-1 ring-teal-900/5"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />
            <label className="block text-sm font-black text-slate-700">
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
      </section>
    </AppChrome>
  );
}
