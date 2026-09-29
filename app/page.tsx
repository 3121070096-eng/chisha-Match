"use client";

import { AppChrome } from "@/components/AppChrome";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRoomHref } from "@/lib/roomUrl";
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
import { ArrowUpRight, Heart, LogIn, MapPin, Play, Plus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const steps = [
  { title: "选地点", icon: MapPin },
  { title: "发链接", icon: Users },
  { title: "一起 Match", icon: Heart }
];

export default function HomePage() {
  const router = useRouter();
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
        <div className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800">
          V4.2 · BETA
        </div>
      }
    >
      <section className="flex flex-1 flex-col pb-7">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-1 flex-col"
        >
          <div className="home-cover relative h-[min(54dvh,460px)] min-h-[370px] overflow-hidden bg-slate-900 text-white">
            <img
              src="/restaurants/home-cover-v2.jpg"
              alt="朋友围坐分享晚餐"
              className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
              width={1122}
              height={1402}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/5" />
            <div className="relative flex h-full flex-col justify-between px-6 pb-7 pt-5">
              <span className="w-fit rounded-full border border-white/40 bg-slate-950/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                朋友一起选，更容易吃到想吃的
              </span>
              <div>
                <p className="text-xs font-semibold text-teal-100">吃啥 Match · V4.2</p>
                <h1 className="mt-2 text-[34px] font-extrabold leading-[1.13] text-white">
                  今天吃什么，<br />不用再吵了。
                </h1>
                <p className="mt-3 max-w-[18rem] text-sm font-medium leading-6 text-white/95">
                  和朋友一起滑餐厅，喜欢同一家，就 Match。
                </p>
              </div>
            </div>
          </div>

          <div className="safe-bottom px-5 pt-5">
            <button
              type="button"
              onClick={startCreateRoom}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-base font-bold text-white transition active:scale-[0.98]"
            >
              <Plus size={20} />
              创建饭局
              <ArrowUpRight size={18} />
            </button>
            <button
              type="button"
              onClick={startDemo}
              className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition active:scale-[0.98]"
            >
              <Play size={17} className="text-teal-700" />
              快速体验
            </button>
            <p className="mt-2 text-center text-xs text-slate-600">左滑跳过 · 右滑想吃 · 共同喜欢自动入榜</p>

            <div className="mt-6 grid grid-cols-3 border-y border-slate-200 py-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <Icon size={18} className="text-teal-700" />
                    <span className="text-xs font-semibold text-slate-700">{index + 1}. {step.title}</span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setJoinOpen((value) => !value)}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-slate-700"
            >
              <LogIn size={16} />
              已有邀请？加入饭局
            </button>
            <div className="flex items-center justify-center gap-5 pt-2 text-xs font-medium text-slate-600">
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
