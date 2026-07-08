"use client";

import { AppChrome } from "@/components/AppChrome";
import { restaurants } from "@/data/restaurants";
import { getRestaurantCover } from "@/lib/restaurantImages";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { getCurrentUser, saveCurrentUser, saveRoomMemberSession } from "@/lib/storage";
import { joinSupabaseRoom } from "@/lib/supabaseRooms";
import { motion } from "framer-motion";
import { ChevronRight, Heart, LogIn, Play, Plus, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const steps = ["创建饭局", "发链接给朋友", "一起左右滑餐厅", "自动 Match 那家"];
  const [joinOpen, setJoinOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.nickname) setNickname(user.nickname);
  }, []);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("请输入邀请码");
      return;
    }

    setJoining(true);

    try {
      const user = saveCurrentUser(nickname || "饭友");
      const { room, member } = await joinSupabaseRoom(code, user);
      saveRoomMemberSession(room.id, member, user.id);
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
          Beta
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
            <div className="relative min-h-[430px] overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,118,110,0.22)]">
              <img
                src={getRestaurantCover(restaurants[9])}
                alt="朋友聚餐"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/48 to-slate-950/10" />
              <div className="absolute right-5 top-5 flex rotate-[-6deg] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-teal-600 shadow-lg">
                <Sparkles size={16} />
                Match!
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-100">
                  Eat Together
                </p>
                <h1 className="mt-6 max-w-[10ch] text-5xl font-black leading-[0.98]">
                  今天吃什么，不用再吵了。
                </h1>
                <p className="mt-5 max-w-[19rem] text-base font-semibold leading-7 text-white/82">
                  创建饭局，邀请朋友，一起左右滑餐厅，自动匹配大家都想吃的那家。
                </p>
                <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {restaurants.slice(0, 4).map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="shrink-0 rounded-full bg-white/14 px-3 py-2 text-xs font-black backdrop-blur"
                    >
                      {restaurant.cuisine}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/88 px-3 py-4 text-center shadow-sm ring-1 ring-teal-900/5">
                <p className="text-xl font-black text-slate-950">20</p>
                <p className="mt-1 text-xs font-black text-slate-500">候选餐厅</p>
              </div>
              <div className="rounded-lg bg-white/88 px-3 py-4 text-center shadow-sm ring-1 ring-teal-900/5">
                <Heart size={21} className="mx-auto fill-rose-400 text-rose-400" />
                <p className="mt-1 text-xs font-black text-slate-500">共同心动</p>
              </div>
              <div className="rounded-lg bg-white/88 px-3 py-4 text-center shadow-sm ring-1 ring-teal-900/5">
                <p className="text-xl font-black text-teal-600">V2</p>
                <p className="mt-1 text-xs font-black text-slate-500">实时多人</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white/88 p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-800">
                第一次用？流程很简单
              </p>
              <div className="mt-3 grid gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-lg bg-teal-50/70 px-3 py-2 text-sm font-black text-slate-700"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-500 text-xs text-white">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="safe-bottom mt-7 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition active:scale-[0.98]"
            >
              <Plus size={21} />
              创建饭局
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/demo")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-black text-teal-700 shadow-sm ring-1 ring-teal-200 transition active:scale-[0.98]"
            >
              <Play size={20} className="fill-teal-500 text-teal-500" />
              先自己体验一下
            </button>
            <button
              type="button"
              onClick={() => setJoinOpen((value) => !value)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-black text-slate-800 shadow-sm ring-1 ring-teal-900/10 transition active:scale-[0.98]"
            >
              <LogIn size={20} />
              加入饭局
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
