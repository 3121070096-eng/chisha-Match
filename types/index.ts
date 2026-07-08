import type { Restaurant } from "@/data/restaurants";

export type SwipeDecision = "like" | "skip";

export type CurrentUser = {
  id: string;
  nickname: string;
};

export type Friend = {
  id: string;
  nickname: string;
  color: string;
  likedRestaurantIds: string[];
};

export type Room = {
  id: string;
  databaseId?: string;
  code?: string;
  name: string;
  location: string;
  budget: number;
  cuisines: string[];
  participants: number;
  status?: "open" | "choosing" | "matched" | "decided" | "closed";
  restaurantSource?: "local_pack" | "api" | "api_fallback" | string;
  createdAt: string;
  createdByMemberId?: string | null;
  finalRestaurantId?: string | null;
  finalizedAt?: string | null;
  friends: Friend[];
};

export type MatchRecord = {
  restaurantId: Restaurant["id"];
  likedBy: string[];
  likedByIds: string[];
  count: number;
  matchedAt: string;
};

export type SwipeState = {
  roomId: string;
  likedIds: string[];
  skippedIds: string[];
  seenIds: string[];
  matches: MatchRecord[];
  finalRestaurantId?: string;
};

export type CreateRoomInput = {
  name: string;
  location: string;
  budget: number;
  cuisines: string[];
  participants: number;
};

export type MatchItem = {
  match: MatchRecord;
  restaurant: Restaurant;
};

export type RoomMember = {
  id: string;
  roomId: string;
  clientId: string;
  nickname: string;
  avatar: string;
  createdAt: string;
  lastSeenAt: string;
};

export type RoomMemberSession = {
  roomId: string;
  memberId: string;
  nickname: string;
  clientId: string;
  savedAt: string;
};

export type SwipeRecord = {
  id: string;
  roomId: string;
  memberId: string;
  restaurantId: Restaurant["id"];
  decision: SwipeDecision;
  createdAt: string;
  updatedAt?: string;
};

export type SupabaseRoomState = {
  room: Room;
  currentMember: RoomMember;
  members: RoomMember[];
  swipes: SwipeRecord[];
  swipeState: SwipeState;
};
