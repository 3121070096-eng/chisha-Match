"use client";

import { restaurants } from "@/data/restaurants";
import { calculateMatchesFromSwipes, sortMatches } from "@/lib/match";
import { makeRoomId } from "@/lib/mock";
import { getSupabaseClient } from "@/lib/supabase";
import {
  formatSupabaseError,
  getSupabaseErrorDebugPayload
} from "@/lib/supabaseErrors";
import type { Database } from "@/types/supabase";
import type {
  CreateRoomInput,
  CurrentUser,
  Room,
  RoomMember,
  RoomMemberSession,
  SupabaseRoomState,
  SwipeDecision,
  SwipeRecord,
  SwipeState
} from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
type SwipeRow = Database["public"]["Tables"]["swipes"]["Row"];

function throwSupabaseError(context: string, error: unknown): never {
  const message = formatSupabaseError(error);
  console.error(`[Supabase] ${context}`, getSupabaseErrorDebugPayload(error));
  const wrapped = new Error(`${context}: ${message}`);
  (wrapped as Error & { cause?: unknown }).cause = error;
  throw wrapped;
}

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function makeRoomMemberId(roomId: string, clientId: string) {
  return `${roomId}_${clientId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    databaseId: row.id,
    code: row.id,
    name: row.title,
    location: row.location,
    budget: row.budget,
    cuisines: row.cuisine_preference,
    participants: 0,
    status: row.status,
    createdAt: row.created_at,
    finalRestaurantId: row.final_restaurant_id,
    friends: []
  };
}

function mapMember(row: RoomMemberRow): RoomMember {
  return {
    id: row.id,
    roomId: row.room_id,
    clientId: row.id,
    nickname: row.name,
    avatar: row.avatar,
    createdAt: row.joined_at,
    lastSeenAt: row.joined_at
  };
}

function mapSwipe(row: SwipeRow): SwipeRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    memberId: row.member_id,
    restaurantId: row.restaurant_id,
    decision: row.choice === "pass" ? "skip" : "like",
    createdAt: row.created_at
  };
}

function buildSwipeState({
  room,
  currentMember,
  members,
  swipes
}: {
  room: Room;
  currentMember: RoomMember;
  members: RoomMember[];
  swipes: SwipeRecord[];
}): SwipeState {
  const currentMemberSwipes = swipes.filter(
    (swipe) => swipe.memberId === currentMember.id
  );
  const likedIds = currentMemberSwipes
    .filter((swipe) => swipe.decision === "like")
    .map((swipe) => swipe.restaurantId);
  const skippedIds = currentMemberSwipes
    .filter((swipe) => swipe.decision === "skip")
    .map((swipe) => swipe.restaurantId);
  const matches = calculateMatchesFromSwipes(swipes, members);

  return {
    roomId: room.id,
    likedIds,
    skippedIds,
    seenIds: Array.from(new Set([...likedIds, ...skippedIds])),
    matches: sortMatches(matches),
    finalRestaurantId: room.finalRestaurantId ?? undefined
  };
}

async function createRoomMember(roomDatabaseId: string, user: CurrentUser) {
  const supabase = getSupabaseClient();
  const memberId = makeRoomMemberId(roomDatabaseId, user.id);
  const { data, error } = await supabase
    .from("room_members")
    .upsert(
      {
        id: memberId,
        room_id: roomDatabaseId,
        name: user.nickname,
        avatar: user.nickname.slice(0, 1) || "饭"
      },
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single();

  if (error) throwSupabaseError("create or update room member failed", error);
  return mapMember(data);
}

export async function createSupabaseRoom(input: CreateRoomInput, user: CurrentUser) {
  const supabase = getSupabaseClient();
  const id = makeRoomId();
  const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .insert({
      id,
      title: input.name.trim() || "今晚吃啥局",
      location: input.location.trim() || "附近",
      budget: input.budget,
      cuisine_preference: input.cuisines,
      status: "open"
    })
    .select("*")
    .single();

  if (roomError) throwSupabaseError("create room failed", roomError);

  const member = await createRoomMember(roomData.id, user);

  return {
    room: mapRoom(roomData),
    member
  };
}

export async function getSupabaseRoomByCode(code: string) {
  const supabase = getSupabaseClient();
  const normalizedCode = normalizeRoomCode(code);
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", normalizedCode)
    .maybeSingle();

  if (error) throwSupabaseError("get room by id failed", error);
  return data ? mapRoom(data) : null;
}

export async function loadSupabaseRoomPreview(code: string) {
  const room = await getSupabaseRoomByCode(code);
  const supabase = getSupabaseClient();

  if (!room?.databaseId) return null;

  const { data, error } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", room.databaseId)
    .order("joined_at", { ascending: true });

  if (error) throwSupabaseError("load room members preview failed", error);

  return {
    room,
    members: (data ?? []).map(mapMember)
  };
}

export async function joinSupabaseRoom(code: string, user: CurrentUser) {
  const room = await getSupabaseRoomByCode(code);

  if (!room?.databaseId) {
    throw new Error("没有找到这个饭局房间");
  }

  const member = await createRoomMember(room.databaseId, user);
  return { room, member };
}

async function loadRoomCollections(room: Room) {
  const supabase = getSupabaseClient();

  if (!room.databaseId) {
    throw new Error("房间缺少数据库 ID");
  }

  const [{ data: memberRows, error: membersError }, { data: swipeRows, error: swipesError }] =
    await Promise.all([
      supabase
        .from("room_members")
        .select("*")
        .eq("room_id", room.databaseId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("swipes")
        .select("*")
        .eq("room_id", room.databaseId)
        .order("created_at", { ascending: true })
    ]);

  if (membersError) throwSupabaseError("load room members failed", membersError);
  if (swipesError) throwSupabaseError("load room swipes failed", swipesError);

  return {
    members: (memberRows ?? []).map(mapMember),
    swipes: (swipeRows ?? []).map(mapSwipe)
  };
}

export async function loadSupabaseRoomState(
  code: string,
  user: CurrentUser
): Promise<SupabaseRoomState> {
  const { room, member } = await joinSupabaseRoom(code, user);
  const { members, swipes } = await loadRoomCollections(room);

  return {
    room,
    currentMember: member,
    members,
    swipes,
    swipeState: buildSwipeState({
      room,
      currentMember: member,
      members,
      swipes
    })
  };
}

export async function loadSupabaseRoomStateForMember(
  code: string,
  memberSession: RoomMemberSession
): Promise<SupabaseRoomState> {
  const room = await getSupabaseRoomByCode(code);

  if (!room?.databaseId) {
    throw new Error("没有找到这个饭局房间");
  }

  const { members, swipes } = await loadRoomCollections(room);
  const currentMember = members.find((member) => member.id === memberSession.memberId);

  if (!currentMember) {
    throw new Error("本地成员记录已失效，请重新输入昵称加入房间");
  }

  return {
    room,
    currentMember,
    members,
    swipes,
    swipeState: buildSwipeState({
      room,
      currentMember,
      members,
      swipes
    })
  };
}

export async function writeSupabaseSwipe({
  roomDatabaseId,
  memberId,
  restaurantId,
  decision
}: {
  roomDatabaseId: string;
  memberId: string;
  restaurantId: string;
  decision: SwipeDecision;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("swipes")
    .upsert(
      {
        room_id: roomDatabaseId,
        member_id: memberId,
        restaurant_id: restaurantId,
        choice: decision === "skip" ? "pass" : "like"
      },
      {
        onConflict: "room_id,member_id,restaurant_id"
      }
    )
    .select("*")
    .single();

  if (error) throwSupabaseError("write swipe failed", error);
  return mapSwipe(data);
}

export async function clearSupabaseMemberSwipes({
  roomDatabaseId,
  memberId
}: {
  roomDatabaseId: string;
  memberId: string;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("swipes")
    .delete()
    .eq("room_id", roomDatabaseId)
    .eq("member_id", memberId);

  if (error) throwSupabaseError("clear member swipes failed", error);
}

export async function chooseSupabaseFinalRestaurant({
  roomDatabaseId,
  restaurantId
}: {
  roomDatabaseId: string;
  restaurantId: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .update({
      final_restaurant_id: restaurantId,
      status: "decided"
    })
    .eq("id", roomDatabaseId)
    .select("*")
    .single();

  if (error) throwSupabaseError("choose final restaurant failed", error);
  return mapRoom(data);
}

export async function clearSupabaseFinalRestaurant(roomDatabaseId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("rooms")
    .update({
      final_restaurant_id: null,
      status: "open"
    })
    .eq("id", roomDatabaseId)
    .select("*")
    .single();

  if (error) throwSupabaseError("clear final restaurant failed", error);
  return mapRoom(data);
}

export function subscribeToSupabaseRoom({
  roomDatabaseId,
  onChange
}: {
  roomDatabaseId: string;
  onChange: () => void;
}) {
  const supabase = getSupabaseClient();
  let timer: number | null = null;

  function scheduleRefresh() {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(onChange, 120);
  }

  const channel: RealtimeChannel = supabase
    .channel(`room:${roomDatabaseId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_members",
        filter: `room_id=eq.${roomDatabaseId}`
      },
      scheduleRefresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "swipes",
        filter: `room_id=eq.${roomDatabaseId}`
      },
      scheduleRefresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomDatabaseId}`
      },
      scheduleRefresh
    )
    .subscribe();

  return () => {
    if (timer) window.clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}

export function getNextRestaurantForMember(state: SwipeState) {
  return restaurants.find((restaurant) => !state.seenIds.includes(restaurant.id)) ?? null;
}
