import type { Friend } from "@/types";

export const mockFriends: Friend[] = [
  {
    id: "friend-lin",
    nickname: "小林",
    color: "bg-teal-500",
    likedRestaurantIds: [
      "r-001",
      "r-003",
      "r-004",
      "r-007",
      "r-010",
      "r-012",
      "r-015",
      "r-018"
    ]
  },
  {
    id: "friend-bei",
    nickname: "阿北",
    color: "bg-orange-400",
    likedRestaurantIds: [
      "r-002",
      "r-004",
      "r-005",
      "r-008",
      "r-010",
      "r-013",
      "r-016",
      "r-019"
    ]
  },
  {
    id: "friend-keke",
    nickname: "可可",
    color: "bg-amber-400",
    likedRestaurantIds: [
      "r-001",
      "r-006",
      "r-008",
      "r-009",
      "r-012",
      "r-014",
      "r-017",
      "r-020"
    ]
  },
  {
    id: "friend-zhou",
    nickname: "周周",
    color: "bg-emerald-500",
    likedRestaurantIds: [
      "r-003",
      "r-005",
      "r-007",
      "r-011",
      "r-013",
      "r-015",
      "r-018",
      "r-020"
    ]
  },
  {
    id: "friend-tian",
    nickname: "甜甜",
    color: "bg-rose-400",
    likedRestaurantIds: [
      "r-002",
      "r-006",
      "r-009",
      "r-010",
      "r-014",
      "r-016",
      "r-017",
      "r-019"
    ]
  },
  {
    id: "friend-yu",
    nickname: "宇航",
    color: "bg-sky-500",
    likedRestaurantIds: [
      "r-001",
      "r-005",
      "r-008",
      "r-011",
      "r-012",
      "r-015",
      "r-017",
      "r-020"
    ]
  }
];

export function buildFriends(participants: number) {
  const friendCount = Math.max(1, Math.min(participants - 1, mockFriends.length));
  return mockFriends.slice(0, friendCount);
}
