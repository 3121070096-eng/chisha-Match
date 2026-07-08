export function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function makeUserId() {
  return `u_${Math.random().toString(36).slice(2, 10)}`;
}
