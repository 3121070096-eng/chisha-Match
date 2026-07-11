"use client";

import { AppChrome } from "@/components/AppChrome";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ShareResultCard } from "@/components/ShareResultCard";
import { getAmapNavigationUrl } from "@/lib/decision";
import { getDecisionVoteCounts, loadDecisionVotes } from "@/lib/decisionVotes";
import { trackEvent } from "@/lib/analytics";
import { findRestaurantInPool, getMatchItemsFromRestaurants } from "@/lib/match";
import {
  prepareRestaurantPoolForRoom,
  getRestaurantSourceForRoom,
  type RestaurantSourceResult
} from "@/lib/restaurantSource";
import { copyToClipboard, getRoomInviteLink } from "@/lib/share";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import {
  clearRoomMemberSession,
  getCurrentUser,
  getRoomMemberSession,
  saveCurrentUser,
  saveRoomMemberSession
} from "@/lib/storage";
import {
  createSupabaseRoom,
  loadSupabaseRoomStateForMember,
  subscribeToSupabaseRoom
} from "@/lib/supabaseRooms";
import type {
  CreateRoomInput,
  DecisionVote,
  MatchItem,
  Room,
  RoomMemberSession,
  SwipeState
} from "@/types";
import { Copy, Home, Link as LinkIcon, MapPinned, Plus, Trophy } from "lucide-react";
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

export default function FinalPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<SwipeState | null>(null);
  const [decisionVotes, setDecisionVotes] = useState<DecisionVote[]>([]);
  const [restaurantSource, setRestaurantSource] = useState<RestaurantSourceResult | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinRequired, setJoinRequired] = useState(false);
  const [missingRoom, setMissingRoom] = useState(false);
  const [error, setError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [recreating, setRecreating] = useState(false);

  const refreshRoom = useCallback(async (
    code: string,
    memberSession: RoomMemberSession
  ) => {
    const remoteState = await loadSupabaseRoomStateForMember(code, memberSession);
    setRoom(remoteState.room);
    setState(remoteState.swipeState);
    try {
      setDecisionVotes(await loadDecisionVotes(code));
    } catch (voteError) {
      console.error("[Final] load decision votes failed", voteError);
    }
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

  const decisionVoteCounts = useMemo(
    () => getDecisionVoteCounts(decisionVotes),
    [decisionVotes]
  );
  const amapUrl = finalItem ? getAmapNavigationUrl(finalItem.restaurant) : null;
  const inviteLink = useMemo(() => getRoomInviteLink(room?.id ?? ""), [room?.id]);

  useEffect(() => {
    if (!room || !finalItem) return;
    if (!markOnce(`chisha:event:share_card_viewed:${room.id}`)) return;

    void trackEvent({
      roomId: room.id,
      eventName: "share_card_viewed",
      metadata: { restaurant_id: finalItem.restaurant.id }
    });
    void trackEvent({
      roomId: room.id,
      eventName: "decided_room_viewed",
      metadata: { restaurant_id: finalItem.restaurant.id }
    });
  }, [finalItem, room]);

  async function copyGroupMessage() {
    if (!finalItem || !room) return;
    const { restaurant, match } = finalItem;
    const price = restaurant.price > 0 ? `约 ¥${restaurant.price} / 人` : "人均待确认";
    const content = [
      `今晚吃：${restaurant.name}`,
      `地点：${room.location}`,
      `人均：${price}`,
      `菜系：${restaurant.cuisine}`,
      restaurant.address ? `地址：${restaurant.address}` : "",
      `共同喜欢人数：${match.count} 人`,
      decisionVoteCounts[restaurant.id] > 0
        ? `二轮票数：${decisionVoteCounts[restaurant.id]} 票`
        : "",
      amapUrl ? `地图：${amapUrl}` : "",
      "大家一起用吃啥 Match 选出来的，出发！"
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await copyToClipboard(content);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2400);
      void trackEvent({
        roomId: room.id,
        eventName: "share_text_copied",
        metadata: {
          room_id: room.id,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          has_amap_url: Boolean(amapUrl)
        }
      });
    } catch (copyError) {
      console.error("[Final] copy group message failed", copyError);
      setError("复制失败，可以手动截图分享。");
    }
  }

  async function copyInviteLink() {
    if (!room || !inviteLink) return;

    try {
      await copyToClipboard(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2400);
      void trackEvent({
        roomId: room.id,
        eventName: "invite_link_copied",
        metadata: { invite_url_origin: window.location.origin, room_status: room.status ?? "open" }
      });
    } catch (copyError) {
      console.error("[Final] copy invite link failed", copyError);
      setError("复制链接失败，请稍后再试。");
    }
  }

  function openAmap() {
    if (!amapUrl || !finalItem || !room) return;
    window.open(amapUrl, "_blank", "noopener,noreferrer");
    void trackEvent({
      roomId: room.id,
      eventName: "amap_opened",
      metadata: { restaurant_id: finalItem.restaurant.id, entry: "final_result" }
    });
  }

  async function recreateRoom() {
    if (!room) return;
    setRecreating(true);
    setError("");

    const locationName = room.location.replace(/附近$/, "") || "新的饭局";
    const input: CreateRoomInput = {
      name: `再来一局 · ${locationName}`,
      location: room.location,
      locationMeta: room.locationMeta,
      budget: room.budget,
      cuisines: room.cuisines,
      participants: room.participants || 4
    };

    try {
      const user = getCurrentUser() ?? saveCurrentUser("饭局队长");
      const { room: nextRoom, member } = await createSupabaseRoom(input, user);
      const poolResult = await prepareRestaurantPoolForRoom(nextRoom, input.locationMeta);
      saveRoomMemberSession(nextRoom.id, member, user.id);
      void trackEvent({
        roomId: nextRoom.id,
        memberId: member.id,
        eventName: "room_recreated_from_previous",
        metadata: {
          previous_room_id: room.id,
          new_room_id: nextRoom.id,
          area_key: nextRoom.locationMeta?.areaKey,
          location_label: nextRoom.location,
          cuisine_preference: nextRoom.cuisines,
          budget: nextRoom.budget,
          restaurant_source: poolResult.source
        }
      });
      router.push(`/room?roomId=${nextRoom.id}`);
    } catch (recreateError) {
      console.error("[Final] recreate room failed", recreateError);
      setError(getReadableSupabaseError(recreateError, "再开一局失败"));
    } finally {
      setRecreating(false);
    }
  }

  function restartWithNewLocation() {
    if (!room) return;
    void trackEvent({
      roomId: room.id,
      eventName: "restart_with_new_location_clicked",
      metadata: { budget: room.budget, cuisine_preference: room.cuisines }
    });
    const params = new URLSearchParams({
      restart: "1",
      budget: String(room.budget),
      cuisines: room.cuisines.join(",")
    });
    router.push(`/create?${params.toString()}`);
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
    <AppChrome showBack title="今晚就吃这家">
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
            <ShareResultCard
              item={finalItem}
              locationLabel={room.location}
              decisionVoteCount={decisionVoteCounts[finalItem.restaurant.id] ?? 0}
            />
            <div className="safe-bottom mt-4 space-y-3">
              <FeedbackPanel roomId={room.id} />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void copyGroupMessage()}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-3 text-sm font-black text-white shadow-sm"
                >
                  <Copy size={17} />
                  {shareCopied ? "已复制，出发！" : "复制群聊文案"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyInviteLink()}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-teal-900/10"
                >
                  <LinkIcon size={17} className="text-teal-600" />
                  {inviteCopied ? "链接已复制" : "复制饭局链接"}
                </button>
              </div>
              {shareCopied ? (
                <p className="text-center text-sm font-black text-teal-600">已复制，发到群里就能出发！</p>
              ) : null}
              {inviteCopied ? (
                <p className="text-center text-sm font-black text-teal-600">链接已复制，发给朋友一起看。</p>
              ) : null}
              {amapUrl ? (
                <button
                  type="button"
                  onClick={openAmap}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-50 text-sm font-black text-teal-700 ring-1 ring-teal-100"
                >
                  <MapPinned size={18} />
                  打开高德地图
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void recreateRoom()}
                disabled={recreating}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 disabled:bg-slate-300 disabled:shadow-none"
              >
                <Plus size={18} />
                {recreating ? "正在准备新一局" : "按这次设置再开一局"}
              </button>
              <button
                type="button"
                onClick={restartWithNewLocation}
                className="flex h-11 w-full items-center justify-center text-sm font-black text-slate-500"
              >
                换个地点再开一局
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
