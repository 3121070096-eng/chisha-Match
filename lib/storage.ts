"use client";

import { buildFriends } from "@/data/mockFriends";
import { makeRoomId, makeUserId } from "@/lib/mock";
import type {
  CreateRoomInput,
  CurrentUser,
  Room,
  RoomMember,
  RoomMemberSession,
  SwipeState
} from "@/types";

const currentUserKey = "chisha-match-current-user";
const roomsKey = "chisha-match-rooms";
const swipePrefix = "chisha-match-swipe:";
const roomMemberPrefix = "chisha-match-room-member:";

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getCurrentUser() {
  return readJson<CurrentUser | null>(currentUserKey, null);
}

export function saveCurrentUser(nickname: string) {
  const normalized = nickname.trim() || "饭友";
  const existing = getCurrentUser();
  const user = {
    id: existing?.id ?? makeUserId(),
    nickname: normalized
  };

  writeJson(currentUserKey, user);
  return user;
}

export function getRoomMemberSession(roomId: string) {
  return readJson<RoomMemberSession | null>(`${roomMemberPrefix}${roomId}`, null);
}

export function saveRoomMemberSession(
  roomId: string,
  member: RoomMember,
  clientId: string
) {
  const session: RoomMemberSession = {
    roomId,
    memberId: member.id,
    nickname: member.nickname,
    clientId,
    savedAt: new Date().toISOString()
  };

  writeJson(`${roomMemberPrefix}${roomId}`, session);
  return session;
}

export function clearRoomMemberSession(roomId: string) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(`${roomMemberPrefix}${roomId}`);
}

export function getRooms() {
  return readJson<Record<string, Room>>(roomsKey, {});
}

export function getRoom(roomId: string) {
  return getRooms()[roomId] ?? null;
}

export function saveRoom(room: Room) {
  const rooms = getRooms();
  rooms[room.id] = room;
  writeJson(roomsKey, rooms);
}

export function createRoom(input: CreateRoomInput) {
  const room: Room = {
    id: makeRoomId(),
    name: input.name.trim() || "今晚吃啥局",
    location: input.location.trim() || "附近",
    budget: input.budget,
    cuisines: input.cuisines,
    participants: input.participants,
    createdAt: new Date().toISOString(),
    friends: buildFriends(input.participants)
  };

  saveRoom(room);
  return room;
}

export function createDemoRoom(roomId?: string) {
  const room: Room = {
    id: roomId?.trim().toUpperCase() || "DEMO88",
    name: "下班不纠结局",
    location: "公司附近 3km",
    budget: 120,
    cuisines: ["川渝火锅", "日料", "韩式烤肉", "东南亚菜"],
    participants: 4,
    createdAt: new Date().toISOString(),
    friends: buildFriends(4)
  };

  saveRoom(room);
  return room;
}

export function defaultSwipeState(roomId: string): SwipeState {
  return {
    roomId,
    likedIds: [],
    skippedIds: [],
    seenIds: [],
    matches: []
  };
}

export function getSwipeState(roomId: string) {
  const state = readJson<SwipeState>(`${swipePrefix}${roomId}`, defaultSwipeState(roomId));

  return {
    ...defaultSwipeState(roomId),
    ...state,
    likedIds: state.likedIds ?? [],
    skippedIds: state.skippedIds ?? [],
    seenIds: state.seenIds ?? [],
    matches: state.matches ?? []
  };
}

export function saveSwipeState(state: SwipeState) {
  writeJson(`${swipePrefix}${state.roomId}`, state);
}
