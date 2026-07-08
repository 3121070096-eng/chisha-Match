import { restaurants } from "@/data/restaurants";
import type {
  CurrentUser,
  MatchItem,
  MatchRecord,
  RoomMember,
  Room,
  SwipeDecision,
  SwipeRecord,
  SwipeState
} from "@/types";

export function sortMatches(matches: MatchRecord[]) {
  return [...matches].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(a.matchedAt).getTime() - new Date(b.matchedAt).getTime();
  });
}

export function findRestaurant(restaurantId: string) {
  return restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
}

export function getMatchItems(matches: MatchRecord[]): MatchItem[] {
  return sortMatches(matches)
    .map((match) => {
      const restaurant = findRestaurant(match.restaurantId);
      return restaurant ? { match, restaurant } : null;
    })
    .filter((item): item is MatchItem => item !== null);
}

export function buildMatchRecord(
  room: Room,
  restaurantId: string,
  currentUser: CurrentUser,
  existing?: MatchRecord
) {
  const friendMatches = room.friends.filter((friend) =>
    friend.likedRestaurantIds.includes(restaurantId)
  );

  if (friendMatches.length === 0) return null;

  const likedBy = [
    currentUser.nickname,
    ...friendMatches.map((friend) => friend.nickname)
  ];

  return {
    restaurantId,
    likedBy,
    likedByIds: [currentUser.id, ...friendMatches.map((friend) => friend.id)],
    count: likedBy.length,
    matchedAt: existing?.matchedAt ?? new Date().toISOString()
  } satisfies MatchRecord;
}

export function hydrateMatches(room: Room, state: SwipeState, currentUser: CurrentUser) {
  const userLiked = new Set(state.likedIds);
  const existingByRestaurant = new Map(
    state.matches.map((match) => [match.restaurantId, match])
  );

  const matches = restaurants.flatMap((restaurant) => {
    if (!userLiked.has(restaurant.id)) return [];

    const match = buildMatchRecord(
      room,
      restaurant.id,
      currentUser,
      existingByRestaurant.get(restaurant.id)
    );

    return match ? [match] : [];
  });

  return {
    ...state,
    matches: sortMatches(matches)
  };
}

export function calculateMatchesFromSwipes(
  swipes: SwipeRecord[],
  members: RoomMember[],
  existingMatches: MatchRecord[] = []
) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const existingByRestaurant = new Map(
    existingMatches.map((match) => [match.restaurantId, match])
  );
  const likesByRestaurant = new Map<string, SwipeRecord[]>();

  swipes.forEach((swipe) => {
    if (swipe.decision !== "like") return;

    const current = likesByRestaurant.get(swipe.restaurantId) ?? [];
    current.push(swipe);
    likesByRestaurant.set(swipe.restaurantId, current);
  });

  const matches = Array.from(likesByRestaurant.entries()).flatMap(
    ([restaurantId, likes]) => {
      const uniqueMemberIds = Array.from(new Set(likes.map((like) => like.memberId)));

      if (uniqueMemberIds.length < 2) return [];

      const likedBy = uniqueMemberIds.map(
        (memberId) => memberById.get(memberId)?.nickname ?? "饭友"
      );
      const matchedAt =
        existingByRestaurant.get(restaurantId)?.matchedAt ??
        likes
          .map((like) => like.createdAt)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ??
        new Date().toISOString();

      return [
        {
          restaurantId,
          likedBy,
          likedByIds: uniqueMemberIds,
          count: uniqueMemberIds.length,
          matchedAt
        } satisfies MatchRecord
      ];
    }
  );

  return sortMatches(matches);
}

export function applySwipeDecision({
  room,
  state,
  currentUser,
  restaurantId,
  decision
}: {
  room: Room;
  state: SwipeState;
  currentUser: CurrentUser;
  restaurantId: string;
  decision: SwipeDecision;
}) {
  const seenIds = Array.from(new Set([...state.seenIds, restaurantId]));
  const likedIds =
    decision === "like"
      ? Array.from(new Set([...state.likedIds, restaurantId]))
      : state.likedIds;
  const skippedIds =
    decision === "skip"
      ? Array.from(new Set([...state.skippedIds, restaurantId]))
      : state.skippedIds;
  const existingMatch = state.matches.find((match) => match.restaurantId === restaurantId);
  let newMatch: MatchRecord | null = null;
  let matches = state.matches;

  if (decision === "like" && !existingMatch) {
    newMatch = buildMatchRecord(room, restaurantId, currentUser);
    if (newMatch) {
      matches = sortMatches([...state.matches, newMatch]);
    }
  }

  return {
    state: {
      ...state,
      seenIds,
      likedIds,
      skippedIds,
      matches
    },
    newMatch
  };
}
