export function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function makeUserId() {
  return `u_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeRoomShareToken() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(4);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join("");
  }

  // This is only a compatibility fallback for older browsers. Public Beta still
  // relies on RLS and must move to authenticated access before production use.
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
