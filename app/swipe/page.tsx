"use client";

import { AppChrome } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { MatchModal } from "@/components/MatchModal";
import { SwipeDeck } from "@/components/SwipeDeck";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { findRestaurantInPool } from "@/lib/match";
import { getRoomAccessFromUrl, getRoomHref } from "@/lib/roomUrl";
import {
  getRestaurantSourceForRoom,
  type RestaurantSourceResult
} from "@/lib/restaurantSource";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import {
  clearRoomMemberSession,
  getCurrentUser,
  getRoomAccessToken,
  getRoomMemberSession,
  saveCurrentUser,
  saveRoomAccessToken,
  saveRoomMemberSession
} from "@/lib/storage";
import {
  clearSupabaseMemberSwipes,
  InvalidRoomTokenError,
  loadSupabaseRoomState,
  loadSupabaseRoomStateForMember,
  loadSupabaseRoomPreview,
  subscribeToSupabaseRoom,
  writeSupabaseSwipe
} from "@/lib/supabaseRooms";
import type {
  MatchRecord,
  Room,
  RoomMember,
  RoomMemberSession,
  SwipeDecision,
  SwipeState
} from "@/types";
import { Home, MapPin, RotateCcw, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Popup = {
  restaurantId: string;
  likedBy: string[];
};

function markOnce(key: string) {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(key)) return false;
  window.localStorage.setItem(key, "1");
  return true;
}

export default function SwipePage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentMember, setCurrentMember] = useState<RoomMember | null>(null);
  const [state, setState] = useState<SwipeState | null>(null);
  const [restaurantSource, setRestaurantSource] = useState<RestaurantSourceResult | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [needsJoin, setNeedsJoin] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [nickname, setNickname] = useState("");
  const [popup, setPopup] = useState<Popup | null>(null);
  const [missingRoom, setMissingRoom] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [error, setError] = useState("");
  const [restaurantLoadFailed, setRestaurantLoadFailed] = useState(false);
  const [restaurantReloadKey, setRestaurantReloadKey] = useState(0);

  const refreshRoomForMember = useCallback(async (
    code: string,
    memberSession: RoomMemberSession
  ) => {
    const remoteState = await loadSupabaseRoomStateForMember(
      code,
      memberSession,
      getRoomAccessToken(code)
    );
    setRoom(remoteState.room);
    setCurrentMember(remoteState.currentMember);
    setState(remoteState.swipeState);
    return remoteState;
  }, []);

  useEffect(() => {
    const { roomId, token: urlToken } = getRoomAccessFromUrl();
    let mounted = true;

    async function loadRoom() {
      setRoomCode(roomId);

      if (urlToken) saveRoomAccessToken(roomId, urlToken);
      const accessToken = urlToken ?? getRoomAccessToken(roomId);

      if (!roomId) {
        setMissingRoom(true);
        setBootstrapped(true);
        return;
      }

      const loadedUser = getCurrentUser();
      setNickname(loadedUser?.nickname ?? "");

      try {
        const memberSession = getRoomMemberSession(roomId);

        if (!memberSession) {
          const preview = await loadSupabaseRoomPreview(roomId, accessToken);
          if (!mounted) return;

          if (!preview) {
            void trackEvent({ roomId, eventName: "room_not_found", metadata: { entry: "swipe" } });
            setMissingRoom(true);
            setBootstrapped(true);
            return;
          }

          setRoom(preview.room);
          setNeedsJoin(true);
          setBootstrapped(true);
          return;
        }

        if (!loadedUser) {
          setNickname(memberSession.nickname);
        }

        try {
          await refreshRoomForMember(roomId, memberSession);
          if (!mounted) return;
          setNeedsJoin(false);
          setBootstrapped(true);
        } catch (sessionError) {
          console.error("[Supabase] swipe member session failed", sessionError);
          clearRoomMemberSession(roomId);
          const preview = await loadSupabaseRoomPreview(roomId, accessToken);
          if (!mounted) return;

          if (!preview) {
            void trackEvent({ roomId, eventName: "room_not_found", metadata: { entry: "swipe" } });
            setMissingRoom(true);
            setBootstrapped(true);
            return;
          }

          setRoom(preview.room);
          setNeedsJoin(true);
          setError("本地成员记录已失效，请重新输入昵称进入选择。");
          setBootstrapped(true);
        }
      } catch (loadError) {
        if (!mounted) return;
        console.error("[Swipe] load room failed", loadError);
        if (loadError instanceof InvalidRoomTokenError) {
          void trackEvent({ roomId, eventName: "invalid_room_token", metadata: { entry: "swipe" } });
          setInvalidToken(true);
          setBootstrapped(true);
          return;
        }
        void trackEvent({
          roomId,
          eventName: "supabase_connection_failed",
          metadata: { entry: "swipe" }
        });
        setError(getReadableSupabaseError(loadError, "加载房间失败"));
        setConnectionFailed(true);
        setBootstrapped(true);
      }
    }

    void loadRoom();

    return () => {
      mounted = false;
    };
  }, [refreshRoomForMember]);

  useEffect(() => {
    if (!room?.databaseId || !roomCode || !currentMember) return;

    const unsubscribe = subscribeToSupabaseRoom({
      roomDatabaseId: room.databaseId,
      onChange: async () => {
        const memberSession = getRoomMemberSession(roomCode);
        if (!memberSession) return;

        try {
          await refreshRoomForMember(roomCode, memberSession);
        } catch (refreshError) {
          console.error("[Supabase] refresh swipe room failed", refreshError);
        }
      }
    });

    return unsubscribe;
  }, [currentMember?.id, refreshRoomForMember, room?.databaseId, roomCode]);

  useEffect(() => {
    if (!room || !currentMember || room.status !== "decided") return;

    if (markOnce(`chisha:event:decided_room_landed:${room.id}:${currentMember.id}`)) {
      void trackEvent({
        roomId: room.id,
        memberId: currentMember.id,
        eventName: "decided_room_landed",
        metadata: { restaurant_id: room.finalRestaurantId, entry: "swipe" }
      });
    }
    router.replace(getRoomHref("/final", room.id, room.shareToken));
  }, [currentMember, room, router]);

  useEffect(() => {
    if (!room) {
      setRestaurantSource(null);
      return;
    }

    const activeRoom = room;
    let mounted = true;

    async function loadRestaurants() {
      setRestaurantLoadFailed(false);
      try {
        const source = await getRestaurantSourceForRoom(activeRoom);
        if (!mounted) return;
        setRestaurantSource(source);
        if (source.restaurants.length === 0) {
          setRestaurantLoadFailed(true);
          setError("附近餐厅暂时没有加载出来。");
          void trackEvent({
            roomId: activeRoom.id,
            eventName: "restaurant_pool_load_failed",
            metadata: { reason: "empty_pool" }
          });
        }
      } catch (restaurantError) {
        if (!mounted) return;
        console.error("[Swipe] load restaurant source failed", restaurantError);
        setRestaurantLoadFailed(true);
        setError("附近餐厅加载失败了。");
        void trackEvent({
          roomId: activeRoom.id,
          eventName: "restaurant_pool_load_failed",
          metadata: { reason: "load_error" }
        });
      }
    }

    void loadRestaurants();

    return () => {
      mounted = false;
    };
  }, [restaurantReloadKey, room]);

  const deckRestaurants = useMemo(() => {
    if (!state || !restaurantSource) return [];
    const seenIds = new Set(state.seenIds);
    return restaurantSource.restaurants
      .filter((restaurant) => !seenIds.has(restaurant.id))
      .slice(0, 4);
  }, [restaurantSource, state]);
  const currentRestaurant = deckRestaurants[0] ?? null;

  useEffect(() => {
    if (!room || !currentMember || !currentRestaurant) return;
    const exposureKey = "chisha:event:restaurant-exposed:" + room.id + ":" + currentMember.id + ":" + currentRestaurant.id;
    if (!markOnce(exposureKey)) return;
    void trackEvent({
      roomId: room.id,
      memberId: currentMember.id,
      eventName: "restaurant_card_exposed",
      metadata: {
        restaurant_id: currentRestaurant.id,
        restaurant_name: currentRestaurant.name,
        dining_scenario: room.diningScenario ?? "friends",
      },
    });
  }, [currentMember, currentRestaurant, room]);

  useEffect(() => {
    if (!room || !currentMember || !restaurantSource) return;

    if (markOnce(`chisha:event:swipe_started:${room.id}:${currentMember.id}`)) {
      void trackEvent({
        roomId: room.id,
        memberId: currentMember.id,
        eventName: "swipe_started",
        metadata: {
          restaurant_count: restaurantSource.restaurants.length,
          area_key: restaurantSource.areaKey,
          restaurant_source: restaurantSource.restaurantSource
        }
      });
    }

    if (
      restaurantSource.fallbackUsed &&
      markOnce(`chisha:event:fallback_restaurants_used:${room.id}:${restaurantSource.requestedAreaKey}`)
    ) {
      void trackEvent({
        roomId: room.id,
        memberId: currentMember.id,
        eventName: "fallback_restaurants_used",
        metadata: {
          requested_area_key: restaurantSource.requestedAreaKey,
          fallback_area_key: restaurantSource.fallbackAreaKey
        }
      });
    }
  }, [currentMember, restaurantSource, room]);

  async function handleNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { roomId } = getRoomAccessFromUrl();
    setError("");

    try {
      const saved = saveCurrentUser(nickname || "饭友");
      const remoteState = await loadSupabaseRoomState(
        roomId,
        saved,
        getRoomAccessToken(roomId)
      );
      saveRoomMemberSession(remoteState.room.id, remoteState.currentMember, saved.id);
      setRoom(remoteState.room);
      setCurrentMember(remoteState.currentMember);
      setState(remoteState.swipeState);
      void trackEvent({
        roomId: remoteState.room.id,
        memberId: remoteState.currentMember.id,
        eventName: "member_joined",
        metadata: {
          member_name: remoteState.currentMember.nickname,
          room_location_label: getRestaurantAreaLabel(remoteState.room.location),
          room_area_key: getRestaurantAreaKey(remoteState.room.location)
        }
      });
      setNeedsJoin(false);
      setBootstrapped(true);
    } catch (joinError) {
      console.error("[Swipe] join room failed", joinError);
      setError(getReadableSupabaseError(joinError, "进入选择失败"));
    }
  }

  async function handleDecision(decision: SwipeDecision) {
    if (!room?.databaseId || !state || !currentMember || !currentRestaurant) return;

    if (room.status === "decided") {
      setError("这局已经决定啦，不能再修改滑卡结果。");
      router.replace(getRoomHref("/final", room.id, room.shareToken));
      return;
    }

    const previousMatches = state.matches;
    const restaurantId = currentRestaurant.id;
    const memberSession = getRoomMemberSession(room.id);

    if (!memberSession) {
      setNeedsJoin(true);
      setCurrentMember(null);
      setError("请先输入昵称加入这个饭局，再开始选择。");
      return;
    }

    setState((current) =>
      current
        ? applyOptimisticSwipe({
            state: current,
            restaurantId,
            decision
          })
        : current
    );

    void trackEvent({
      roomId: room.id,
      memberId: currentMember.id,
      eventName: decision === "like" ? "restaurant_liked" : "restaurant_passed",
      metadata: {
        restaurant_id: currentRestaurant.id,
        restaurant_name: currentRestaurant.name,
        area_key: currentRestaurant.area
      }
    });

    try {
      await writeSupabaseSwipe({
        roomDatabaseId: room.databaseId,
        memberId: currentMember.id,
        restaurantId,
        decision,
        accessToken: room.shareToken ?? getRoomAccessToken(room.id)
      });

      const remoteState = await refreshRoomForMember(room.id, memberSession);
      const newMatch = getNewMatchForSwipe({
        decision,
        restaurantId,
        memberId: currentMember.id,
        previousMatches,
        nextMatches: remoteState.swipeState.matches
      });

      if (newMatch) {
        const matchedRestaurant = findRestaurantInPool(
          newMatch.restaurantId,
          restaurantSource?.restaurants ?? []
        );
        void trackEvent({
          roomId: room.id,
          memberId: currentMember.id,
          eventName: "match_created",
          metadata: {
            restaurant_id: newMatch.restaurantId,
            restaurant_name: matchedRestaurant?.name ?? currentRestaurant.name,
            matched_member_count: newMatch.count,
            area_key: matchedRestaurant?.area ?? getRestaurantAreaKey(room.location)
          }
        });
        setPopup({
          restaurantId: newMatch.restaurantId,
          likedBy: newMatch.likedBy
        });
      }
    } catch (swipeError) {
      console.error("[Swipe] write swipe failed", swipeError);
      setError(getReadableSupabaseError(swipeError, "写入选择失败"));
    }
  }

  async function resetDeck() {
    if (!room?.databaseId || !currentMember) return;

    if (room.status === "decided") {
      setError("这局已经决定啦，不能再重置选择。");
      router.replace(getRoomHref("/final", room.id, room.shareToken));
      return;
    }

    try {
      setPopup(null);
      await clearSupabaseMemberSwipes({
        roomDatabaseId: room.databaseId,
        memberId: currentMember.id,
        accessToken: room.shareToken ?? getRoomAccessToken(room.id)
      });
      const memberSession = getRoomMemberSession(room.id);
      if (memberSession) {
        await refreshRoomForMember(room.id, memberSession);
      }
    } catch (resetError) {
      console.error("[Swipe] reset deck failed", resetError);
      setError(getReadableSupabaseError(resetError, "重置失败"));
    }
  }

  if (invalidToken) {
    return (
      <AppChrome showBack title="开始选择">
        <EmptyState
          icon={Home}
          title="这个饭局链接可能不完整"
          description="请让朋友重新发你一次邀请链接。"
          primaryLabel="返回首页"
          onPrimary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (connectionFailed) {
    return (
      <AppChrome showBack title="开始选择">
        <EmptyState
          icon={Home}
          title="连接有点不稳定"
          description="请刷新页面重试。"
          primaryLabel="刷新页面"
          onPrimary={() => window.location.reload()}
          secondaryLabel="返回首页"
          onSecondary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (missingRoom) {
    return (
      <AppChrome showBack title="开始选择">
        <EmptyState
          icon={Home}
          title="还没有饭局房间"
          description={error || "先创建一个饭局，或者从首页输入邀请码加入已有房间。"}
          primaryLabel="创建饭局"
          onPrimary={() => router.push("/create")}
          secondaryLabel="回到首页"
          onSecondary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (!bootstrapped) {
    return (
      <AppChrome showBack title="开始选择">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在同步饭局选择
        </div>
      </AppChrome>
    );
  }

  if (needsJoin || !currentMember) {
    return (
      <AppChrome showBack title="开始选择">
        <form onSubmit={handleNickname} className="flex flex-1 flex-col justify-center px-5">
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-teal-900/5">
            <div className="mb-4 grid size-12 place-items-center rounded-full bg-teal-50 text-teal-500">
              <UserRoundPlus size={24} />
            </div>
            <label className="block text-sm font-black text-slate-700">
              你的昵称
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="比如：饭搭子"
                className="mt-2 h-12 w-full rounded-lg border border-teal-900/10 bg-teal-50/70 px-4 text-base font-bold outline-none focus:border-teal-400 focus:bg-white"
              />
            </label>
            {error ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-black text-rose-500">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-4 h-12 w-full rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
            >
              进入选择
            </button>
          </div>
        </form>
      </AppChrome>
    );
  }

  if (!room || !state) {
    return (
      <AppChrome showBack title="开始选择">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在同步饭局选择
        </div>
      </AppChrome>
    );
  }

  if (restaurantLoadFailed || (restaurantSource && restaurantSource.restaurants.length === 0)) {
    return (
      <AppChrome showBack title="滑卡选择">
        <EmptyState
          icon={MapPin}
          title="附近餐厅加载失败了"
          description="可以换个地点，或稍后再试。"
          primaryLabel="换个地点"
          onPrimary={() => router.push("/create")}
          secondaryLabel="重新加载"
          onSecondary={() => {
            setError("");
            setRestaurantReloadKey((value) => value + 1);
          }}
        />
      </AppChrome>
    );
  }

  if (!restaurantSource) {
    return (
      <AppChrome showBack title="开始选择">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在准备这局的餐厅候选
        </div>
      </AppChrome>
    );
  }

  const roomRestaurants = restaurantSource?.restaurants ?? [];
  const popupRestaurant = popup
    ? findRestaurantInPool(popup.restaurantId, roomRestaurants)
    : null;

  return (
    <AppChrome
      showBack
      title="滑卡选择"
      rightSlot={
        <button
          type="button"
          aria-label="重置选择"
          onClick={() => void resetDeck()}
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
      <SwipeDeck
        room={room}
        state={state}
        currentRestaurant={currentRestaurant}
        deckRestaurants={deckRestaurants}
        totalRestaurants={roomRestaurants.length}
        onDecision={handleDecision}
        onViewMatches={() => {
          void trackEvent({
            roomId: room.id,
            memberId: currentMember.id,
            eventName: "match_list_cta_clicked",
            metadata: { entry: "swipe_deck" }
          });
          router.push(getRoomHref("/matches", room.id, room.shareToken));
        }}
      />
      <BottomNav roomId={room.id} active="swipe" />
      <MatchModal
        restaurant={popupRestaurant}
        likedBy={popup?.likedBy ?? []}
        roomId={room.id}
        memberId={currentMember.id}
        onContinue={() => setPopup(null)}
        onViewMatches={() => {
          setPopup(null);
          void trackEvent({
            roomId: room.id,
            memberId: currentMember.id,
            eventName: "match_list_cta_clicked",
            metadata: { entry: "match_modal" }
          });
          router.push(getRoomHref("/matches", room.id, room.shareToken));
        }}
      />
    </AppChrome>
  );
}

function getNewMatchForSwipe({
  decision,
  restaurantId,
  memberId,
  previousMatches,
  nextMatches
}: {
  decision: SwipeDecision;
  restaurantId: string;
  memberId: string;
  previousMatches: MatchRecord[];
  nextMatches: MatchRecord[];
}) {
  if (decision !== "like") return null;

  const hadMatch = previousMatches.some((match) => match.restaurantId === restaurantId);
  if (hadMatch) return null;

  const newMatch = nextMatches.find((match) => match.restaurantId === restaurantId);
  if (!newMatch?.likedByIds.includes(memberId)) return null;

  return newMatch;
}

function applyOptimisticSwipe({
  state,
  restaurantId,
  decision
}: {
  state: SwipeState;
  restaurantId: string;
  decision: SwipeDecision;
}) {
  return {
    ...state,
    seenIds: Array.from(new Set([...state.seenIds, restaurantId])),
    likedIds:
      decision === "like"
        ? Array.from(new Set([...state.likedIds, restaurantId]))
        : state.likedIds,
    skippedIds:
      decision === "skip"
        ? Array.from(new Set([...state.skippedIds, restaurantId]))
        : state.skippedIds
  };
}
