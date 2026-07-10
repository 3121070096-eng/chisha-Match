"use client";

import { AppChrome } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { FinalResultCard } from "@/components/FinalResultCard";
import { findRestaurantInPool, getMatchItemsFromRestaurants } from "@/lib/match";
import {
  getRestaurantSourceForRoom,
  type RestaurantSourceResult
} from "@/lib/restaurantSource";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { clearRoomMemberSession, getRoomMemberSession } from "@/lib/storage";
import {
  clearSupabaseFinalRestaurant,
  loadSupabaseRoomStateForMember,
  subscribeToSupabaseRoom
} from "@/lib/supabaseRooms";
import type { MatchItem, Room, RoomMemberSession, SwipeState } from "@/types";
import { Home, Plus, RotateCcw, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function getRoomIdFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("roomId") ?? "";
}

export default function FinalPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<SwipeState | null>(null);
  const [restaurantSource, setRestaurantSource] = useState<RestaurantSourceResult | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinRequired, setJoinRequired] = useState(false);
  const [missingRoom, setMissingRoom] = useState(false);
  const [error, setError] = useState("");

  const refreshRoom = useCallback(async (
    code: string,
    memberSession: RoomMemberSession
  ) => {
    const remoteState = await loadSupabaseRoomStateForMember(code, memberSession);
    setRoom(remoteState.room);
    setState(remoteState.swipeState);
    return remoteState;
  }, []);

  useEffect(() => {
    const roomId = getRoomIdFromUrl();
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function loadRoom() {
      setRoomCode(roomId);

      if (!roomId) {
        setMissingRoom(true);
        return;
      }

      const memberSession = getRoomMemberSession(roomId);

      if (!memberSession) {
        setJoinRequired(true);
        return;
      }

      try {
        const remoteState = await refreshRoom(roomId, memberSession);

        if (!mounted) return;

        if (remoteState.room.databaseId) {
          unsubscribe = subscribeToSupabaseRoom({
            roomDatabaseId: remoteState.room.databaseId,
            onChange: () => {
              const latestSession = getRoomMemberSession(roomId);
              if (latestSession) void refreshRoom(roomId, latestSession);
            }
          });
        }
      } catch (loadError) {
        if (!mounted) return;
        console.error("[Final] load final result failed", loadError);
        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        if (message.includes("本地成员记录")) {
          clearRoomMemberSession(roomId);
          setError("本地成员记录已失效，请重新输入昵称加入房间。");
          setJoinRequired(true);
          return;
        }
        setError(getReadableSupabaseError(loadError, "加载最终结果失败"));
        setMissingRoom(true);
      }
    }

    void loadRoom();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [refreshRoom]);

  useEffect(() => {
    if (!room) {
      setRestaurantSource(null);
      return;
    }

    const activeRoom = room;
    let mounted = true;

    async function loadRestaurants() {
      try {
        const source = await getRestaurantSourceForRoom(activeRoom);
        if (mounted) setRestaurantSource(source);
      } catch (restaurantError) {
        if (!mounted) return;
        console.error("[Final] load restaurant source failed", restaurantError);
        setError("餐厅候选同步失败，请稍后重试。");
      }
    }

    void loadRestaurants();

    return () => {
      mounted = false;
    };
  }, [room]);

  const finalItem = useMemo<MatchItem | null>(() => {
    if (!state?.finalRestaurantId || !restaurantSource) return null;
    const matchedItem = getMatchItemsFromRestaurants(
      state.matches,
      restaurantSource.restaurants,
      {
        locationLabel: room?.location,
        cuisinePreference: room?.cuisines[0],
        budget: room?.budget
      }
    ).find(
      (item) => item.restaurant.id === state.finalRestaurantId
    );

    if (matchedItem) return matchedItem;

    const restaurant = findRestaurantInPool(
      state.finalRestaurantId,
      restaurantSource.restaurants
    );
    if (!restaurant) return null;

    return {
      restaurant,
      match: {
        restaurantId: restaurant.id,
        likedBy: ["大家"],
        likedByIds: [],
        count: 1,
        matchedAt: new Date().toISOString()
      }
    };
  }, [restaurantSource, room?.budget, room?.cuisines, room?.location, state]);

  async function resetFinal() {
    if (!room?.databaseId) return;

    try {
      await clearSupabaseFinalRestaurant(room.databaseId);
      setState((current) =>
        current ? { ...current, finalRestaurantId: undefined } : current
      );
      router.push(`/matches?roomId=${room.id}`);
    } catch (resetError) {
      console.error("[Final] reset final restaurant failed", resetError);
      setError(getReadableSupabaseError(resetError, "重置最终选择失败"));
    }
  }

  if (missingRoom) {
    return (
      <AppChrome showBack title="今晚就吃这家">
        <EmptyState
          icon={Home}
          title="还没有饭局房间"
          description={error || "最终决定会从房间里的共同心动餐厅中产生。"}
          primaryLabel="创建饭局"
          onPrimary={() => router.push("/create")}
          secondaryLabel="回到首页"
          onSecondary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (joinRequired) {
    return (
      <AppChrome showBack title="今晚就吃这家">
        <EmptyState
          icon={Home}
          title="先加入这个饭局"
          description={error || "输入昵称成为房间成员后，就能查看最终餐厅结果。"}
          primaryLabel="去房间加入"
          onPrimary={() => router.push(`/room?roomId=${roomCode}`)}
          secondaryLabel="回到首页"
          onSecondary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (!room || !state || !restaurantSource) {
    return (
      <AppChrome showBack title="今晚就吃这家">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在同步最终决定
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome
      showBack
      title="今晚就吃这家"
      rightSlot={
        <button
          type="button"
          aria-label="重新选择"
          onClick={() => void resetFinal()}
          className="grid size-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-teal-900/5"
        >
          <RotateCcw size={18} />
        </button>
      }
    >
      {error ? (
        <div className="mx-5 mb-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-black text-rose-500">
          {error}
        </div>
      ) : null}
      <section className="flex flex-1 flex-col px-5 pb-3 pt-1">
        <p className="mb-2 rounded-full bg-white/82 px-3 py-2 text-xs font-black text-slate-500 shadow-sm ring-1 ring-teal-900/5">
          饭局地点：{room.location}
        </p>
        {finalItem ? (
          <>
            <FinalResultCard item={finalItem} />
            <div className="safe-bottom mt-4 space-y-3">
              <FeedbackPanel roomId={room.id} />
              <p className="rounded-lg bg-white/88 px-4 py-3 text-center text-sm font-black text-slate-600 shadow-sm ring-1 ring-teal-900/5">
                把结果发给朋友，别再纠结啦。
              </p>
              <button
                type="button"
                onClick={() => router.push("/create")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
              >
                <Plus size={18} />
                再开一局
              </button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Trophy}
            title="还没拍板"
            description="从共同心动餐厅榜里点「就吃这家」，结果页就会亮起来。"
            primaryLabel="去榜单选择"
            onPrimary={() => router.push(`/matches?roomId=${room.id}`)}
            secondaryLabel="继续滑卡"
            onSecondary={() => router.push(`/swipe?roomId=${room.id}`)}
          />
        )}
      </section>
      <BottomNav roomId={room.id} active="final" />
    </AppChrome>
  );
}
