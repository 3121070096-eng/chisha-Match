"use client";

import { getRoomAccessToken } from "@/lib/storage";

export function getRoomAccessFromUrl() {
  if (typeof window === "undefined") return { roomId: "", token: null };
  const params = new URLSearchParams(window.location.search);
  return {
    roomId: params.get("roomId") ?? "",
    token: params.get("token")
  };
}

export function getRoomHref(path: "/room" | "/swipe" | "/matches" | "/final", roomId: string, token?: string | null) {
  const activeToken = token ?? getRoomAccessToken(roomId);
  const params = new URLSearchParams({ roomId });
  if (activeToken) params.set("token", activeToken);
  return `${path}?${params.toString()}`;
}
