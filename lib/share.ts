"use client";

import { getRoomHref } from "@/lib/roomUrl";

export function getRoomInviteLink(roomId: string, shareToken?: string | null) {
  if (typeof window === "undefined" || !roomId) return "";
  return `${window.location.origin}${getRoomHref("/room", roomId, shareToken)}`;
}

export async function copyToClipboard(content: string) {
  if (!content) throw new Error("没有可复制的内容");

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("浏览器不支持复制");
}
