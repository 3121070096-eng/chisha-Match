"use client";

import { AppChrome } from "@/components/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { FinalResultCard } from "@/components/FinalResultCard";
import { MatchList } from "@/components/MatchList";
import { MatchModal } from "@/components/MatchModal";
import { SwipeDeck } from "@/components/SwipeDeck";
import { trackEvent } from "@/lib/analytics";
import { calculateMatchesFromSwipes, findRestaurant, getMatchItems } from "@/lib/match";
import { getDemoRestaurants } from "@/lib/restaurantSource";
import type { MatchRecord, Room, RoomMember, SwipeDecision, SwipeRecord } from "@/types";
import { motion } from "framer-motion";
import { PartyPopper, Plus, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DemoView = "swipe" | "matches" | "final";

const demoRoom: Room = {
  id: "demo-room",
  name: "体验饭局",
  location: "体验餐厅池",
  budget: 120,
  cuisines: ["东南亚菜", "川渝火锅", "日料"],
  participants: 3,
  status: "choosing",
  createdAt: "2026-07-08T00:00:00.000Z",
  friends: []
};

const demoMembers: RoomMember[] = [
  {
    id: "demo-you",
    roomId: demoRoom.id,
    clientId: "demo-you-client",
    nickname: "你",
    avatar: "你",
    createdAt: demoRoom.createdAt,
    lastSeenAt: demoRoom.createdAt
  },
  {
    id: "demo-friend-a",
    roomId: demoRoom.id,
    clientId: "demo-friend-a-client",
    nickname: "阿陈",
    avatar: "陈",
    createdAt: demoRoom.createdAt,
    lastSeenAt: demoRoom.createdAt
  },
  {
    id: "demo-friend-b",
    roomId: demoRoom.id,
    clientId: "demo-friend-b-client",
    nickname: "小林",
    avatar: "林",
    createdAt: demoRoom.createdAt,
    lastSeenAt: demoRoom.createdAt
  }
];

const demoFriendLikes: Record<string, string[]> = {
  "demo-friend-a": ["r-001", "r-002", "r-008", "r-012"],
  "demo-friend-b": ["r-003", "r-004", "r-009", "r-010"]
};

const demoRestaurants = getDemoRestaurants();

function createDemoFriendSwipes() {
  return Object.entries(demoFriendLikes).flatMap(([memberId, restaurantIds]) =>
    restaurantIds.map((restaurantId, index) => ({
      id: `demo-${memberId}-${restaurantId}`,
      roomId: demoRoom.id,
      memberId,
      restaurantId,
      decision: "like" as const,
      createdAt: new Date(2026, 6, 8, 19, index).toISOString()
    }))
  );
}

function upsertSwipe(swipes: SwipeRecord[], swipe: SwipeRecord) {
  const exists = swipes.some(
    (item) =>
      item.roomId === swipe.roomId &&
      item.memberId === swipe.memberId &&
      item.restaurantId === swipe.restaurantId
  );

  if (!exists) return [...swipes, swipe];

  return swipes.map((item) =>
    item.roomId === swipe.roomId &&
    item.memberId === swipe.memberId &&
    item.restaurantId === swipe.restaurantId
      ? { ...item, decision: swipe.decision, updatedAt: swipe.createdAt }
      : item
  );
}

function getNewDemoMatch({
  decision,
  restaurantId,
  previousMatches,
  nextMatches,
  shownMatchIds
}: {
  decision: SwipeDecision;
  restaurantId: string;
  previousMatches: MatchRecord[];
  nextMatches: MatchRecord[];
  shownMatchIds: string[];
}) {
  if (decision !== "like") return null;
  if (shownMatchIds.includes(restaurantId)) return null;
  if (previousMatches.some((match) => match.restaurantId === restaurantId)) return null;
  return nextMatches.find((match) => match.restaurantId === restaurantId) ?? null;
}

export default function DemoPage() {
  const router = useRouter();
  const [view, setView] = useState<DemoView>("swipe");
  const [swipes, setSwipes] = useState<SwipeRecord[]>(() => createDemoFriendSwipes());
  const [finalRestaurantId, setFinalRestaurantId] = useState<string | null>(null);
  const [shownMatchIds, setShownMatchIds] = useState<string[]>([]);
  const [popup, setPopup] = useState<MatchRecord | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    void trackEvent({ eventName: "demo_started" });
  }, []);

  useEffect(() => {
    if (view !== "final" || finishedRef.current) return;
    finishedRef.current = true;
    void trackEvent({ eventName: "demo_finished" });
  }, [view]);

  function startRealRoom(entry: string) {
    void trackEvent({ eventName: "demo_to_real_room_clicked", metadata: { entry } });
    router.push("/create");
  }

  const swipeState = useMemo(() => {
    const userSwipes = swipes.filter((swipe) => swipe.memberId === demoMembers[0].id);
    const likedIds = userSwipes
      .filter((swipe) => swipe.decision === "like")
      .map((swipe) => swipe.restaurantId);
    const skippedIds = userSwipes
      .filter((swipe) => swipe.decision === "skip")
      .map((swipe) => swipe.restaurantId);

    return {
      roomId: demoRoom.id,
      likedIds,
      skippedIds,
      seenIds: Array.from(new Set(userSwipes.map((swipe) => swipe.restaurantId))),
      matches: calculateMatchesFromSwipes(swipes, demoMembers),
      finalRestaurantId: finalRestaurantId ?? undefined
    };
  }, [finalRestaurantId, swipes]);

  const deckRestaurants = useMemo(() => {
    const seenIds = new Set(swipeState.seenIds);
    return demoRestaurants
      .filter((restaurant) => !seenIds.has(restaurant.id))
      .slice(0, 4);
  }, [swipeState.seenIds]);
  const matchItems = useMemo(
    () =>
      getMatchItems(swipeState.matches, demoRoom.location, {
        locationLabel: demoRoom.location,
        cuisinePreference: demoRoom.cuisines[0],
        budget: demoRoom.budget
      }),
    [swipeState.matches]
  );
  const finalItem = useMemo(() => {
    if (!finalRestaurantId) return null;
    return matchItems.find((item) => item.restaurant.id === finalRestaurantId) ?? null;
  }, [finalRestaurantId, matchItems]);
  const popupRestaurant = popup ? findRestaurant(popup.restaurantId, demoRoom.location) : null;

  function handleDecision(decision: SwipeDecision) {
    const restaurant = deckRestaurants[0];
    if (!restaurant) return;

    const createdAt = new Date().toISOString();
    const nextSwipes = upsertSwipe(swipes, {
      id: `demo-${demoMembers[0].id}-${restaurant.id}`,
      roomId: demoRoom.id,
      memberId: demoMembers[0].id,
      restaurantId: restaurant.id,
      decision,
      createdAt
    });
    const nextMatches = calculateMatchesFromSwipes(
      nextSwipes,
      demoMembers,
      swipeState.matches
    );
    const newMatch = getNewDemoMatch({
      decision,
      restaurantId: restaurant.id,
      previousMatches: swipeState.matches,
      nextMatches,
      shownMatchIds
    });

    setSwipes(nextSwipes);
    void trackEvent({
      eventName: decision === "like" ? "restaurant_liked" : "restaurant_passed",
      metadata: {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        area_key: restaurant.area,
        mode: "demo"
      }
    });

    if (newMatch) {
      setShownMatchIds((current) => [...current, newMatch.restaurantId]);
      void trackEvent({
        eventName: "match_created",
        metadata: {
          restaurant_id: newMatch.restaurantId,
          restaurant_name: restaurant.name,
          matched_member_count: newMatch.count,
          area_key: restaurant.area,
          mode: "demo"
        }
      });
      setPopup(newMatch);
    }
  }

  function restartDemo() {
    setSwipes(createDemoFriendSwipes());
    setFinalRestaurantId(null);
    setShownMatchIds([]);
    setPopup(null);
    finishedRef.current = false;
    setView("swipe");
  }

  return (
    <AppChrome
      showBack
      title={view === "matches" ? "共同心动餐厅榜" : view === "final" ? "今晚就吃这家" : "体验模式"}
      rightSlot={
        <button
          type="button"
          onClick={() => startRealRoom("demo_header")}
          className="rounded-full bg-white px-3 py-2 text-xs font-black text-teal-700 shadow-sm ring-1 ring-teal-900/5"
        >
          创建真实饭局
        </button>
      }
    >
      <section className="flex min-h-0 flex-1 flex-col">
        {view === "swipe" ? (
          <SwipeDeck
            room={demoRoom}
            state={swipeState}
            currentRestaurant={deckRestaurants[0] ?? null}
            deckRestaurants={deckRestaurants}
            totalRestaurants={demoRestaurants.length}
            onDecision={handleDecision}
            onViewMatches={() => setView("matches")}
            tutorialMode="demo"
          />
        ) : null}

        {view === "matches" ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-1">
            <MatchList
              items={matchItems}
              qualityContext={{
                locationLabel: demoRoom.location,
                cuisinePreference: demoRoom.cuisines[0],
                budget: demoRoom.budget
              }}
              memberCount={demoMembers.length}
              onChooseFinal={(restaurantId) => {
                const item = matchItems.find((matchItem) => matchItem.restaurant.id === restaurantId);
                void trackEvent({
                  eventName: "final_decided",
                  metadata: {
                    restaurant_id: restaurantId,
                    restaurant_name: item?.restaurant.name ?? restaurantId,
                    area_key: item?.restaurant.area ?? "demo",
                    liked_member_count: item?.match.count ?? 0,
                    mode: "demo"
                  }
                });
                setFinalRestaurantId(restaurantId);
                setView("final");
              }}
              onContinueSwipe={() => setView("swipe")}
            />
          </div>
        ) : null}

        {view === "final" ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-1">
            {finalItem ? (
              <>
                <FinalResultCard item={finalItem} />
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="safe-bottom mt-4 space-y-3"
                >
                  <p className="rounded-lg bg-white/88 px-4 py-3 text-center text-sm font-black text-slate-600 shadow-sm ring-1 ring-teal-900/5">
                    想和朋友真的试一次？创建饭局后，把链接发给大家一起滑。
                  </p>
                  <button
                    type="button"
                    onClick={restartDemo}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25"
                  >
                    <PartyPopper size={18} />
                    再开一局
                  </button>
                  <button
                    type="button"
                    onClick={() => startRealRoom("demo_final")}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-base font-black text-slate-800 shadow-sm ring-1 ring-teal-900/10"
                  >
                    <Plus size={18} />
                    创建真实饭局
                  </button>
                </motion.div>
              </>
            ) : (
              <EmptyState
                icon={Trophy}
                title="先从榜单里选一家"
                description="体验模式也会从共同心动餐厅里产生最终结果。"
                primaryLabel="去榜单选择"
                onPrimary={() => setView("matches")}
                secondaryLabel="继续滑"
                onSecondary={() => setView("swipe")}
              />
            )}
          </div>
        ) : null}
      </section>

      <MatchModal
        restaurant={popupRestaurant}
        likedBy={popup?.likedBy ?? []}
        onContinue={() => setPopup(null)}
        onViewMatches={() => {
          setPopup(null);
          void trackEvent({
            eventName: "match_list_cta_clicked",
            metadata: { entry: "demo_match_modal", mode: "demo" }
          });
          setView("matches");
        }}
      />
    </AppChrome>
  );
}
