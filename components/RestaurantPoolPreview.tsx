"use client";

import { getDiningScenarioOption } from "@/data/diningScenarios";
import { getRestaurantCover, useFallbackImage } from "@/lib/restaurantImages";
import { getRestaurantSourceForRoom } from "@/lib/restaurantSource";
import type { Room, RoomMember } from "@/types";
import { Check, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PoolRestaurant = Awaited<ReturnType<typeof getRestaurantSourceForRoom>>["restaurants"][number];
type PoolResponse = {
  ok: boolean;
  restaurants: PoolRestaurant[];
  reason?: string;
  requiresConfirmation?: boolean;
  refreshCount?: number;
};

type RestaurantPoolPreviewProps = {
  room: Room;
  currentMember: RoomMember;
  isOwner: boolean;
  onRoomChanged: () => void;
};

export function RestaurantPoolPreview({
  room,
  currentMember,
  isOwner,
  onRoomChanged,
}: RestaurantPoolPreviewProps) {
  const [restaurants, setRestaurants] = useState<PoolRestaurant[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"remove" | "confirm" | "refresh" | null>(null);
  const [message, setMessage] = useState("");
  const confirmed = Boolean(room.restaurantPoolConfirmedAt);
  const scenario = getDiningScenarioOption(room.diningScenario);
  const refreshCount = room.restaurantPoolRefreshCount ?? 0;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getRestaurantSourceForRoom(room).then((source) => {
      if (!mounted) return;
      setRestaurants(source.restaurants);
      setInitialCount(source.restaurants.length);
      setLoading(false);
    }).catch((error) => {
      console.error("[RestaurantPoolPreview] load failed", error);
      if (!mounted) return;
      setMessage("候选餐厅暂时没有加载出来，可以稍后重新进入房间。");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [room]);

  const removedCount = Math.max(0, initialCount - restaurants.length);
  const canConfirm = restaurants.length >= 8;
  const requestPayload = useMemo(() => ({
    roomId: room.databaseId ?? room.id,
    areaKey: room.locationMeta?.areaKey,
    locationLabel: room.locationMeta?.locationLabel ?? room.location,
    lat: room.locationMeta?.lat,
    lng: room.locationMeta?.lng,
    radiusM: room.locationMeta?.radiusM,
    cuisinePreferences: room.cuisines,
    budget: room.budget,
    diningScenario: room.diningScenario,
    accessToken: room.shareToken,
    ownerMemberId: currentMember.id,
  }), [currentMember.id, room]);

  async function send(action: "remove" | "confirm" | "refresh", extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/restaurants/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestPayload, ...extra, action }),
    });
    const payload = (await response.json()) as PoolResponse;
    return { response, payload };
  }

  async function removeRestaurant(sourcePlaceId?: string) {
    if (!sourcePlaceId || !isOwner || pending) return;
    setPending("remove");
    setMessage("");
    try {
      const { response, payload } = await send("remove", { restaurantSourcePlaceId: sourcePlaceId });
      if (!response.ok || !payload.ok) throw new Error(payload.reason ?? "REMOVE_FAILED");
      setRestaurants(payload.restaurants);
      onRoomChanged();
    } catch (error) {
      console.error("[RestaurantPoolPreview] remove failed", error);
      setMessage("至少保留 8 家餐厅，或稍后再试。");
    } finally {
      setPending(null);
    }
  }

  async function confirmPool() {
    if (!isOwner || !canConfirm || pending) return;
    setPending("confirm");
    setMessage("");
    try {
      const { response, payload } = await send("confirm", {
        initialCount,
        removedByHostCount: removedCount,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.reason ?? "CONFIRM_FAILED");
      setMessage("已确认这批餐厅，现在可以放心邀请朋友一起滑啦。");
      onRoomChanged();
    } catch (error) {
      console.error("[RestaurantPoolPreview] confirm failed", error);
      setMessage("确认失败，请稍后再试。");
    } finally {
      setPending(null);
    }
  }

  async function refreshPool(confirmReset = false) {
    if (!isOwner || pending || refreshCount >= 2) return;
    setPending("refresh");
    setMessage("");
    try {
      let result = await send("refresh", { confirmReset });
      if (result.response.status === 409 && result.payload.requiresConfirmation && !confirmReset) {
        const approved = window.confirm("换一批会清空当前滑卡记录，确定继续吗？");
        if (!approved) return;
        result = await send("refresh", { confirmReset: true });
      }
      if (!result.response.ok || !result.payload.ok) {
        throw new Error(result.payload.reason ?? "REFRESH_FAILED");
      }
      setRestaurants(result.payload.restaurants);
      setInitialCount(result.payload.restaurants.length);
      setMessage("已换成一批新的真实餐厅，旧的滑卡记录已清空。");
      onRoomChanged();
    } catch (error) {
      console.error("[RestaurantPoolPreview] refresh failed", error);
      setMessage("暂时没能换到更合适的一批，请稍后再试。");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Sparkles size={18} className="text-teal-500" />
            餐厅池预览
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {loading ? "正在读取候选餐厅..." : "已为" + scenario.shortLabel + "挑出 " + restaurants.length + " 家真实餐厅"}
          </p>
        </div>
        <span className={confirmed ? "rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700"}>
          {confirmed ? "已确认" : "待确认"}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 grid min-h-24 place-items-center rounded-lg bg-slate-50 text-xs font-black text-slate-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : restaurants.length === 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-3 text-sm font-bold leading-6 text-amber-800">
          暂时没有足够的高质量真实餐厅。可以换一批，或回到创建页换个地点。
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {restaurants.slice(0, 8).map((restaurant) => (
            <div key={restaurant.id} className="overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200/70">
              <img
                src={getRestaurantCover(restaurant)}
                alt={restaurant.name}
                className="h-20 w-full object-cover"
                loading="lazy"
                onError={(event) => useFallbackImage(event.currentTarget, restaurant)}
              />
              <div className="p-2.5">
                <p className="truncate text-xs font-black text-slate-900">{restaurant.name}</p>
                <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{restaurant.cuisine} · {restaurant.distance}</p>
                {isOwner && !confirmed ? (
                  <button
                    type="button"
                    disabled={pending !== null || restaurants.length <= 8}
                    onClick={() => void removeRestaurant(restaurant.sourcePlaceId)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-rose-500 disabled:text-slate-300"
                  >
                    <Trash2 size={12} /> 删除
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {restaurants.length > 8 ? <p className="mt-3 text-xs font-bold text-slate-400">另有 {restaurants.length - 8} 家，会在滑卡页按同一顺序展示。</p> : null}
      {message ? <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-black leading-5 text-teal-700">{message}</p> : null}

      {isOwner ? (
        <div className={confirmed ? "mt-4" : "mt-4 grid grid-cols-2 gap-2"}>
          <button
            type="button"
            disabled={pending !== null || refreshCount >= 2}
            onClick={() => void refreshPool()}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 text-xs font-black text-slate-700 disabled:text-slate-300"
          >
            <RefreshCw size={15} className={pending === "refresh" ? "animate-spin" : ""} />
            {refreshCount >= 2 ? "已到换批上限" : "这批不太合适，换一批"}
          </button>
          {!confirmed ? (
            <button
              type="button"
              disabled={pending !== null || !canConfirm}
              onClick={() => void confirmPool()}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-teal-500 text-xs font-black text-white shadow-md shadow-teal-500/20 disabled:bg-slate-300"
            >
              <Check size={15} /> 确认这批餐厅
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
