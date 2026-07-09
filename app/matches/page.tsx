"use client";

import { AppChrome } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { MatchList } from "@/components/MatchList";
import { getRestaurantAreaKey } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getMatchItemsFromRestaurants } from "@/lib/match";
import {
  getRestaurantSourceForRoom,
  type RestaurantSourceResult
} from "@/lib/restaurantSource";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { clearRoomMemberSession, getRoomMemberSession } from "@/lib/storage";
import {
  chooseSupabaseFinalRestaurant,
  loadSupabaseRoomStateForMember,
  subscribeToSupabaseRoom
} from "@/lib/supabaseRooms";
import type { Room, RoomMemberSession, SwipeState } from "@/types";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function getRoomIdFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("roomId") ?? "";
}

function markOnce(key: string) {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(key)) return false;
  window.localStorage.setItem(key, "1");
  return true;
}

export default function MatchesPage() {
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
        console.error("[Matches] load matches failed", loadError);
        const message =
          loadError instanceof Error ? loadError.message : String(loadError);
        if (message.includes("本地成员记录")) {
          clearRoomMemberSession(roomId);
          setError("本地成员记录已失效，请重新输入昵称加入房间。");
          setJoinRequired(true);
          return;
        }
        setError(getReadableSupabaseError(loadError, "加载匹配清单失败"));
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
        console.error("[Matches] load restaurant source failed", restaurantError);
        setError("餐厅候选同步失败，请稍后重试。");
      }
    }

    void loadRestaurants();

    return () => {
      mounted = false;
    };
  }, [room]);

  const matchItems = useMemo(() => {
    if (!state || !restaurantSource) return [];
    return getMatchItemsFromRestaurants(state.matches, restaurantSource.restaurants);
  }, [restaurantSource, state]);

  useEffect(() => {
    if (!room || !state) return;
    if (!markOnce(`chisha:event:match_list_viewed:${room.id}`)) return;

    void trackEvent({
      roomId: room.id,
      eventName: "match_list_viewed",
      metadata: {
        match_count: state.matches.length,
        room_id: room.id,
        area_key: restaurantSource?.areaKey ?? getRestaurantAreaKey(room.location)
      }
    });
  }, [restaurantSource?.areaKey, room, state]);

  async function chooseFinal(restaurantId: string) {
    if (!state || !room?.databaseId) return;

    try {
      const updatedRoom = await chooseSupabaseFinalRestaurant({
        roomDatabaseId: room.databaseId,
        restaurantId
      });
      const item = matchItems.find((matchItem) => matchItem.restaurant.id === restaurantId);
      void trackEvent({
        roomId: room.id,
        eventName: "final_decided",
        metadata: {
          restaurant_id: restaurantId,
          restaurant_name: item?.restaurant.name ?? restaurantId,
          area_key: item?.restaurant.areaKey ?? item?.restaurant.area ?? getRestaurantAreaKey(room.location),
          liked_member_count: item?.match.count ?? 0
        }
      });
      setRoom(updatedRoom);
      setState({ ...state, finalRestaurantId: restaurantId });
      router.push(`/final?roomId=${room.id}`);
    } catch (chooseError) {
      console.error("[Matches] choose final restaurant failed", chooseError);
      setError(getReadableSupabaseError(chooseError, "选择最终餐厅失败"));
    }
  }

  if (missingRoom) {
    return (
      <AppChrome showBack title="共同心动餐厅榜">
        <EmptyState
          icon={Home}
          title="还没有饭局房间"
          description={error || "共同心动餐厅榜需要先加入一个饭局。"}
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
      <AppChrome showBack title="共同心动餐厅榜">
        <EmptyState
          icon={Home}
          title="先加入这个饭局"
          description={error || "输入昵称成为房间成员后，就能查看共同心动餐厅榜。"}
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
      <AppChrome showBack title="共同心动餐厅榜">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在同步共同心动榜
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome showBack title="共同心动餐厅榜">
      {error ? (
        <div className="mx-5 mb-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-black text-rose-500">
          {error}
        </div>
      ) : null}
      <section className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-1">
        <p className="mb-2 rounded-full bg-white/82 px-3 py-2 text-xs font-black text-slate-500 shadow-sm ring-1 ring-teal-900/5">
          饭局地点：{room.location}
        </p>
        <MatchList
          items={matchItems}
          onChooseFinal={(restaurantId) => void chooseFinal(restaurantId)}
          onContinueSwipe={() => router.push(`/swipe?roomId=${room.id}`)}
        />
      </section>
      <BottomNav roomId={room.id} active="matches" />
    </AppChrome>
  );
}
