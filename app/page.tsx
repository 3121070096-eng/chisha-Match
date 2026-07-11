"use client";

import { AppChrome } from "@/components/AppChrome";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import {
  getCurrentUser,
  hasSeenOnboarding,
  markOnboardingSeen,
  saveCurrentUser,
  saveRoomMemberSession
} from "@/lib/storage";
import { joinSupabaseRoom } from "@/lib/supabaseRooms";
import { getDemoRestaurants } from "@/lib/restaurantSource";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  LogIn,
  MapPin,
  Play,
  Plus,
  Sparkles,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const steps = [
    { title: "创建饭局", detail: "选地点和预算", icon: MapPin },
    { title: "发给朋友", detail: "一起滑同一批", icon: Users },
    { title: "自动 Match", detail: "最后一起决定", icon: Heart }
  ];
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
      setError("请输入邀请码");
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
      router.push(`/room?roomId=${room.id}`);
    } catch (joinError) {
      console.error("[Home] join room failed", joinError);
      setError(getReadableSupabaseError(joinError, "加入饭局失败"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <AppChrome
      rightSlot={
        <div className="rounded-full bg-white/85 px-3 py-2 text-xs font-black text-teal-700 shadow-sm">
          V3.6
        </div>
      }
    >
      <section className="flex flex-1 flex-col px-5 pb-7 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-1 flex-col justify-between"
        >
          <div>
            <div className="relative min-h-[350px] overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,118,110,0.22)]">
              <img
                src={getRestaurantCover(homeRestaurants[9])}
                alt="朋友聚餐"
                className="absolute inset-0 h-full w-full object-cover"
                width={720}
                height={960}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(event) => useFallbackImage(event.currentTarget, homeRestaurants[9])}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/48 to-slate-950/10" />
              <div className="absolute right-5 top-5 flex rotate-[-6deg] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-teal-600 shadow-lg">
                <Sparkles size={16} />
                Match!
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-xs font-black tracking-[0.12em] text-teal-100">吃啥 Match · V3.6</p>
                <h1 className="mt-3 max-w-[11ch] text-[2rem] font-black leading-[1.08]">
                  像交友软件一样，和朋友一起滑餐厅
                </h1>
                <p className="mt-3 max-w-[19rem] text-sm font-semibold leading-6 text-white/82">
                  左滑不想吃，右滑想吃。你和朋友都喜欢的餐厅会自动 Match，再也不用群里问“吃什么”。
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="min-w-0 rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-teal-900/5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-teal-500 text-[10px] text-white">
                        {index + 1}
                      </span>
                      <Icon size={13} className="text-teal-600" />
                    </div>
                    <p className="mt-2 truncate text-xs font-black text-slate-800">{step.title}</p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-slate-400">{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="safe-bottom mt-7 space-y-3">
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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-black text-teal-700 shadow-sm ring-1 ring-teal-200 transition active:scale-[0.98]"
            >
              <Play size={20} className="fill-teal-500 text-teal-500" />
              快速体验
            </button>
            <button
              type="button"
              onClick={() => setJoinOpen((value) => !value)}
              className="flex h-10 w-full items-center justify-center gap-2 text-sm font-black text-slate-600 transition active:scale-[0.98]"
            >
              <LogIn size={16} />
              已有饭局？加入饭局
            </button>
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
            {error ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-black text-rose-500">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={joining}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
            >
              <Users size={20} />
              {joining ? "进入中" : "进入房间"}
            </button>
          </motion.form>
        ) : null}
      </section>
    </AppChrome>
  );
}
