"use client";

import { AppChrome } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { MatchList } from "@/components/MatchList";
import { getRestaurantAreaKey } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRecommendedMatch } from "@/lib/decision";
import {
  castDecisionVote,
  getDecisionVoteCounts,
  loadDecisionVotes
} from "@/lib/decisionVotes";
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
import type { DecisionVote, MatchItem, Room, RoomMember, RoomMemberSession, SwipeState } from "@/types";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [currentMember, setCurrentMember] = useState<RoomMember | null>(null);
  const [state, setState] = useState<SwipeState | null>(null);
  const [decisionVotes, setDecisionVotes] = useState<DecisionVote[]>([]);
  const [restaurantSource, setRestaurantSource] = useState<RestaurantSourceResult | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinRequired, setJoinRequired] = useState(false);
  const [missingRoom, setMissingRoom] = useState(false);
  const [error, setError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [voting, setVoting] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [randomResult, setRandomResult] = useState<MatchItem | null>(null);
  const randomIntervalRef = useRef<number | null>(null);
  const randomTimeoutRef = useRef<number | null>(null);

  const refreshRoom = useCallback(async (
    code: string,
    memberSession: RoomMemberSession
  ) => {
    const remoteState = await loadSupabaseRoomStateForMember(code, memberSession);
    setRoom(remoteState.room);
    setCurrentMember(remoteState.currentMember);
    setState(remoteState.swipeState);
    return remoteState;
  }, []);

  const refreshVotes = useCallback(async (code: string) => {
    try {
      setDecisionVotes(await loadDecisionVotes(code));
      setVoteError("");
    } catch (voteLoadError) {
      console.error("[Matches] load decision votes failed", voteLoadError);
      setVoteError("二轮投票暂未启用，请确认 V3.4 migration 已执行。");
    }
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
        await refreshVotes(roomId);

        if (!mounted) return;

        if (remoteState.room.databaseId) {
          unsubscribe = subscribeToSupabaseRoom({
            roomDatabaseId: remoteState.room.databaseId,
            onChange: () => {
              const latestSession = getRoomMemberSession(roomId);
              if (latestSession) void refreshRoom(roomId, latestSession);
              void refreshVotes(roomId);
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
  }, [refreshRoom, refreshVotes]);

  useEffect(() => () => {
    if (randomIntervalRef.current) window.clearInterval(randomIntervalRef.current);
    if (randomTimeoutRef.current) window.clearTimeout(randomTimeoutRef.current);
  }, []);

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

  const decisionVoteCounts = useMemo(
    () => getDecisionVoteCounts(decisionVotes),
    [decisionVotes]
  );
  const currentVoteRestaurantId = useMemo(
    () => decisionVotes.find((vote) => vote.memberId === currentMember?.id)?.restaurantId,
    [currentMember?.id, decisionVotes]
  );

  const matchItems = useMemo(() => {
    if (!state || !restaurantSource) return [];
    return getMatchItemsFromRestaurants(state.matches, restaurantSource.restaurants, {
      locationLabel: room?.location,
      cuisinePreference: room?.cuisines[0],
      budget: room?.budget
    }, decisionVoteCounts);
  }, [decisionVoteCounts, restaurantSource, room?.budget, room?.cuisines, room?.location, state]);

  const recommendation = useMemo(
    () =>
      getRecommendedMatch(matchItems, {
        locationLabel: room?.location,
        cuisinePreference: room?.cuisines[0],
        budget: room?.budget,
        decisionVoteCounts
      }),
    [decisionVoteCounts, matchItems, room?.budget, room?.cuisines, room?.location]
  );
  const isDecided = room?.status === "decided" || Boolean(state?.finalRestaurantId);

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

  useEffect(() => {
    if (!room || !recommendation) return;
    if (!markOnce(`chisha:event:decision_recommendation_viewed:${room.id}`)) return;
    void trackEvent({
      roomId: room.id,
      memberId: currentMember?.id,
      eventName: "decision_recommendation_viewed",
      metadata: {
        restaurant_id: recommendation.item.restaurant.id,
        score: recommendation.score,
        reason_tags: recommendation.reasonTags
      }
    });
  }, [currentMember?.id, recommendation, room]);

  async function chooseFinal(restaurantId: string) {
    if (!state || !room?.databaseId || isDecided) return;

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

  async function castVote(restaurantId: string) {
    if (!room?.databaseId || !currentMember || isDecided) return;
    if (!matchItems.some((item) => item.restaurant.id === restaurantId)) return;

    setVoting(true);
    setVoteError("");
    try {
      const result = await castDecisionVote({
        roomId: room.databaseId,
        memberId: currentMember.id,
        restaurantId
      });
      setDecisionVotes((current) => [
        ...current.filter((vote) => vote.memberId !== currentMember.id),
        result.vote
      ]);
      void trackEvent({
        roomId: room.id,
        memberId: currentMember.id,
        eventName: result.changed ? "decision_vote_changed" : "decision_vote_cast",
        metadata: { restaurant_id: restaurantId }
      });
    } catch (voteCastError) {
      console.error("[Matches] cast decision vote failed", voteCastError);
      setVoteError("投票失败，请稍后再试。");
    } finally {
      setVoting(false);
    }
  }

  function startRandomDecision() {
    if (matchItems.length === 0 || !room || isDecided) return;
    if (randomIntervalRef.current) window.clearInterval(randomIntervalRef.current);
    if (randomTimeoutRef.current) window.clearTimeout(randomTimeoutRef.current);

    setRandomizing(true);
    setRandomResult(matchItems[0]);
    let cursor = 0;
    void trackEvent({ roomId: room.id, memberId: currentMember?.id, eventName: "decision_random_started" });

    randomIntervalRef.current = window.setInterval(() => {
      cursor = (cursor + 1) % matchItems.length;
      setRandomResult(matchItems[cursor]);
    }, 95);
    randomTimeoutRef.current = window.setTimeout(() => {
      if (randomIntervalRef.current) window.clearInterval(randomIntervalRef.current);
      const selected = matchItems[Math.floor(Math.random() * matchItems.length)];
      setRandomResult(selected);
      setRandomizing(false);
      void trackEvent({
        roomId: room.id,
        memberId: currentMember?.id,
        eventName: "decision_random_result",
        metadata: { restaurant_id: selected.restaurant.id }
      });
    }, 850);
  }

  function acceptRandomDecision() {
    if (!randomResult || !room) return;
    void trackEvent({
      roomId: room.id,
      memberId: currentMember?.id,
      eventName: "decision_random_accepted",
      metadata: { restaurant_id: randomResult.restaurant.id }
    });
    void chooseFinal(randomResult.restaurant.id);
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
      {voteError ? (
        <div className="mx-5 mb-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-black text-amber-700">
          {voteError}
        </div>
      ) : null}
      <section className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-1">
        <p className="mb-2 rounded-full bg-white/82 px-3 py-2 text-xs font-black text-slate-500 shadow-sm ring-1 ring-teal-900/5">
          饭局地点：{room.location}
        </p>
        <MatchList
          items={matchItems}
          qualityContext={{
            locationLabel: room.location,
            cuisinePreference: room.cuisines[0],
            budget: room.budget
          }}
          recommendation={recommendation}
          decisionVoteCounts={decisionVoteCounts}
          currentVoteRestaurantId={currentVoteRestaurantId}
          voting={voting}
          onVote={(restaurantId) => void castVote(restaurantId)}
          randomResult={randomResult}
          randomizing={randomizing}
          onRandom={startRandomDecision}
          onAcceptRandom={acceptRandomDecision}
          isDecided={isDecided}
          decidedRestaurantName={
            matchItems.find((item) => item.restaurant.id === state.finalRestaurantId)?.restaurant.name ?? null
          }
          onViewResult={() => router.push(`/final?roomId=${room.id}`)}
          onRestart={() => router.push("/create")}
          onChooseFinal={(restaurantId) => void chooseFinal(restaurantId)}
          onContinueSwipe={() => router.push(`/swipe?roomId=${room.id}`)}
        />
      </section>
      <BottomNav roomId={room.id} active="matches" />
    </AppChrome>
  );
}
