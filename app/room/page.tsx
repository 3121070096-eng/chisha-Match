"use client";

import { AppChrome } from "@/components/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { FlowProgress } from "@/components/FlowProgress";
import { getRestaurantAreaKey, getRestaurantAreaLabel } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { getRoomAccessFromUrl, getRoomHref } from "@/lib/roomUrl";
import { copyToClipboard, getRoomInviteLink } from "@/lib/share";
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
  loadSupabaseRoomPreview,
  loadSupabaseRoomState,
  loadSupabaseRoomStateForMember,
  InvalidRoomTokenError,
  subscribeToSupabaseRoom
} from "@/lib/supabaseRooms";
import type { Room, RoomMember, RoomMemberSession } from "@/types";
import { motion } from "framer-motion";
import {
  CircleCheck,
  Copy,
  Home,
  Link as LinkIcon,
  MapPin,
  Play,
  Sparkles,
  UserRoundPlus,
  Users,
  Wallet
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

function markOnce(key: string) {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(key)) return false;
  window.localStorage.setItem(key, "1");
  return true;
}

export default function RoomPage() {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentMember, setCurrentMember] = useState<RoomMember | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinedNotice, setJoinedNotice] = useState(false);
  const [missingRoom, setMissingRoom] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [error, setError] = useState("");

  const refreshRoomForMember = useCallback(
    async (code: string, memberSession: RoomMemberSession) => {
      const state = await loadSupabaseRoomStateForMember(
        code,
        memberSession,
        getRoomAccessToken(code)
      );
      setRoom(state.room);
      setMembers(state.members);
      setCurrentMember(state.currentMember);
      return state;
    },
    []
  );

  useEffect(() => {
    const { roomId, token: urlToken } = getRoomAccessFromUrl();
    let mounted = true;

    async function loadRoom() {
      setRoomCode(roomId);

      if (urlToken) saveRoomAccessToken(roomId, urlToken);
      const accessToken = urlToken ?? getRoomAccessToken(roomId);

      if (!roomId) {
        setMissingRoom(true);
        return;
      }

      try {
        const loadedUser = getCurrentUser();
        setNickname(loadedUser?.nickname ?? "");

        const memberSession = getRoomMemberSession(roomId);
        if (!loadedUser && memberSession) setNickname(memberSession.nickname);

        if (memberSession) {
          try {
            await refreshRoomForMember(roomId, memberSession);

            if (!mounted) return;
            return;
          } catch (sessionError) {
            console.error("[Supabase] room member session failed", sessionError);
            clearRoomMemberSession(roomId);
            setError("本地成员记录已失效，请重新输入昵称加入房间。");
          }
        }

        const preview = await loadSupabaseRoomPreview(roomId, accessToken);

        if (!mounted) return;

        if (!preview) {
          void trackEvent({ roomId, eventName: "room_not_found" });
          setMissingRoom(true);
          return;
        }

        setRoom(preview.room);
        setMembers(preview.members);
        setCurrentMember(null);
      } catch (loadError) {
        if (!mounted) return;
        console.error("[Room] load room failed", loadError);
        if (loadError instanceof InvalidRoomTokenError) {
          void trackEvent({ roomId, eventName: "invalid_room_token" });
          setInvalidToken(true);
          return;
        }
        void trackEvent({
          roomId,
          eventName: "supabase_connection_failed",
          metadata: { entry: "room" }
        });
        setError(getReadableSupabaseError(loadError, "加载房间失败"));
        setConnectionFailed(true);
      }
    }

    void loadRoom();

    return () => {
      mounted = false;
    };
  }, [refreshRoomForMember]);

  useEffect(() => {
    if (!room?.databaseId || !roomCode) return;

    const unsubscribe = subscribeToSupabaseRoom({
      roomDatabaseId: room.databaseId,
      onChange: async () => {
        const memberSession = getRoomMemberSession(roomCode);

        try {
          if (memberSession) {
            await refreshRoomForMember(roomCode, memberSession);
            return;
          }

          const preview = await loadSupabaseRoomPreview(roomCode, getRoomAccessToken(roomCode));
          if (preview) {
            setRoom(preview.room);
            setMembers(preview.members);
          }
        } catch (refreshError) {
          console.error("[Supabase] refresh room failed", refreshError);
        }
      }
    });

    return unsubscribe;
  }, [refreshRoomForMember, room?.databaseId, roomCode]);

  const inviteLink = getRoomInviteLink(room?.id ?? "", room?.shareToken);

  useEffect(() => {
    if (!room || !currentMember || room.status !== "decided") return;

    if (markOnce(`chisha:event:decided_room_landed:${room.id}:${currentMember.id}`)) {
      void trackEvent({
        roomId: room.id,
        memberId: currentMember.id,
        eventName: "decided_room_landed",
        metadata: { restaurant_id: room.finalRestaurantId }
      });
    }
    router.replace(getRoomHref("/final", room.id, room.shareToken));
  }, [currentMember, room, router]);

  useEffect(() => {
    if (!room || currentMember) return;
    if (!markOnce(`chisha:event:join_page_viewed:${room.id}`)) return;

    void trackEvent({
      roomId: room.id,
      eventName: "join_page_viewed",
      metadata: { member_count: members.length, room_status: room.status ?? "open" }
    });
  }, [currentMember, members.length, room]);

  useEffect(() => {
    if (!room || !currentMember) return;
    if (!markOnce(`chisha:event:invite_hint_viewed:${room.id}:${currentMember.id}`)) return;

    void trackEvent({
      roomId: room.id,
      memberId: currentMember.id,
      eventName: "invite_hint_viewed",
      metadata: { member_count: members.length }
    });
  }, [currentMember, members.length, room]);

  async function handleNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) return;

    setError("");
    void trackEvent({
      roomId: room.id,
      eventName: "member_name_submitted",
      metadata: { nickname: nickname.trim() || "饭友" }
    });

    try {
      const saved = saveCurrentUser(nickname);
      const state = await loadSupabaseRoomState(
        room.id,
        saved,
        getRoomAccessToken(room.id)
      );
      saveRoomMemberSession(state.room.id, state.currentMember, saved.id);
      setRoom(state.room);
      setMembers(state.members);
      setCurrentMember(state.currentMember);
      setJoinedNotice(true);
      void trackEvent({
        roomId: state.room.id,
        memberId: state.currentMember.id,
        eventName: "member_joined",
        metadata: {
          member_name: state.currentMember.nickname,
          room_location_label: getRestaurantAreaLabel(state.room.location),
          room_area_key: getRestaurantAreaKey(state.room.location)
        }
      });
      if (state.room.status === "decided") {
        void trackEvent({
          roomId: state.room.id,
          memberId: state.currentMember.id,
          eventName: "joined_decided_room",
          metadata: { restaurant_id: state.room.finalRestaurantId }
        });
      }
    } catch (joinError) {
      console.error("[Room] join room failed", joinError);
      setError(getReadableSupabaseError(joinError, "加入房间失败"));
    }
  }

  async function handleCopy() {
    if (!inviteLink || !room) return;
    const activeRoom = room;

    try {
      await copyToClipboard(inviteLink);
      setCopied(true);
      void trackEvent({
        roomId: activeRoom.id,
        memberId: currentMember?.id,
        eventName: "invite_link_copied",
        metadata: {
          invite_url_origin: window.location.origin,
          room_status: activeRoom.status ?? "open"
        }
      });
      window.setTimeout(() => setCopied(false), 2200);
    } catch (copyError) {
      console.error("[Room] copy invite link failed", copyError);
      setCopied(false);
      setError("复制链接失败，请稍后再试。");
    }
  }

  function handleStartSwiping() {
    if (!room || !currentMember) return;
    void trackEvent({
      roomId: room.id,
      memberId: currentMember.id,
      eventName: "start_swiping_clicked",
      metadata: { member_count: members.length }
    });
    router.push(
      room.status === "decided"
        ? getRoomHref("/final", room.id, room.shareToken)
        : getRoomHref("/swipe", room.id, room.shareToken)
    );
  }

  if (invalidToken) {
    return (
      <AppChrome showBack title="饭局房间">
        <EmptyState
          icon={LinkIcon}
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
      <AppChrome showBack title="饭局房间">
        <EmptyState
          icon={Sparkles}
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
      <AppChrome showBack title="饭局房间">
        <EmptyState
          icon={Home}
          title="这个饭局好像不存在"
          description={error || "可能是链接错误，或者房间已经失效。"}
          primaryLabel="重新创建饭局"
          onPrimary={() => router.push("/create")}
          secondaryLabel="回到首页"
          onSecondary={() => router.push("/")}
        />
      </AppChrome>
    );
  }

  if (!room) {
    return (
      <AppChrome showBack title="饭局房间">
        <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
          正在连接 Supabase 房间
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome showBack title="饭局房间">
      <section className="flex flex-1 flex-col px-5 pb-6 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="overflow-hidden rounded-lg bg-teal-500 p-5 text-white shadow-[0_22px_60px_rgba(20,184,166,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-teal-100">#{room.id}</p>
                <h1 className="mt-2 text-3xl font-black leading-tight">{room.name}</h1>
              </div>
              <div className="grid size-12 place-items-center rounded-full bg-white/18">
                <Sparkles size={23} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm font-black">
              <div className="rounded-lg bg-white/14 p-3">
                <MapPin size={17} />
                <p className="mt-2 text-xs text-teal-100">饭局地点</p>
                <p className="mt-1 line-clamp-2">{room.location}</p>
              </div>
              <div className="rounded-lg bg-white/14 p-3">
                <Wallet size={17} />
                <p className="mt-2">¥{room.budget}/人</p>
              </div>
              <div className="rounded-lg bg-white/14 p-3">
                <Users size={17} />
                <p className="mt-2">{members.length} 人</p>
              </div>
            </div>
            <FlowProgress
              stage={room.status === "decided" ? "decided" : "room"}
              className="mt-4 bg-white/14 text-teal-50 shadow-none ring-white/10"
            />
          </div>

          {room.status === "decided" ? (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200">
              这局已经决定啦：今晚吃 {room.finalRestaurantId ? "最终餐厅已揭晓" : "这家"}。
            </div>
          ) : null}

          {!currentMember ? (
            <form
              onSubmit={handleNickname}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600">
                  <UserRoundPlus size={21} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-950">你被邀请加入一个饭局</p>
                  <p className="mt-1 text-sm font-bold leading-5 text-slate-500">
                    {members[0]?.nickname ? `由 ${members[0].nickname} 发起 · ` : ""}已加入 {members.length} 人
                  </p>
                </div>
              </div>
              <label className="block text-sm font-black text-slate-700">
                输入你的昵称，开始一起滑餐厅
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="比如：饭局队长"
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
                className="mt-4 h-12 w-full rounded-full bg-slate-950 text-base font-black text-white"
              >
                {room.status === "decided" ? "加入并查看结果" : "加入并开始滑卡"}
              </button>
            </form>
          ) : (
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
              <p className="text-sm font-black text-slate-500">当前身份</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {currentMember.nickname}
              </p>
            </div>
          )}

          {joinedNotice ? (
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-3 text-sm font-black text-teal-700 ring-1 ring-teal-100">
              <CircleCheck size={18} />
              加入成功！接下来左滑不想吃，右滑想吃。
            </div>
          ) : null}

          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                <LinkIcon size={17} className="text-teal-500" />
                邀请链接
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
                发给朋友
              </span>
            </div>
            <p className="mb-3 text-sm font-bold leading-6 text-slate-500">
              下一步：把链接发给朋友，大家一起滑同一批餐厅。
            </p>
            <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200/70">
              <p className="break-all text-sm font-bold leading-6 text-slate-600">
                {inviteLink}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
                aria-label="复制邀请链接"
              >
                <Copy size={17} />
                复制饭局链接
              </button>
            </div>
            {copied ? (
              <p className="mt-2 text-sm font-black text-teal-600">
                链接已复制，发到群里就可以一起选啦。
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-3 text-sm font-black text-slate-700">
              实时成员 · 已加入 {members.length} 人
            </p>
            <p className="mb-3 text-sm font-bold leading-6 text-slate-500">
              {members.length <= 1
                ? "你可以先自己滑，也可以邀请朋友一起 Match。"
                : "朋友已加入，可以开始一起滑啦。"}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="shrink-0 rounded-full bg-white py-2 pl-2 pr-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-teal-900/5"
                >
                  <span
                    className={`mr-2 inline-grid size-7 place-items-center rounded-full text-xs text-white ${
                      index === 0 ? "bg-slate-950" : "bg-teal-500"
                    }`}
                  >
                    {member.nickname.slice(0, 1)}
                  </span>
                  {member.nickname}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="safe-bottom mt-auto pt-6">
          <button
            type="button"
            disabled={!currentMember}
            onClick={handleStartSwiping}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Play size={21} className="fill-white" />
            {room.status === "decided" ? "查看最终结果" : "开始选择"}
          </button>
        </div>
      </section>
    </AppChrome>
  );
}
