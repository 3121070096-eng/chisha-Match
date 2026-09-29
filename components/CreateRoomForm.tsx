"use client";

import {
  DEFAULT_RADIUS_M,
  makeCurrentRoomLocation,
  popularLocations,
  type RoomLocation
} from "@/data/locations";
import { FlowProgress } from "@/components/FlowProgress";
import {
  defaultDiningScenario,
  diningScenarioOptions
} from "@/data/diningScenarios";
import { cuisines } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import type { CreateRoomInput } from "@/types";
import { motion } from "framer-motion";
import {
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Users,
  Utensils,
  Wallet
} from "lucide-react";
import { FormEvent, useState } from "react";

const defaultCuisines = ["川渝火锅", "日料", "韩式烤肉"];
const featuredCuisines = ["川渝火锅", "日料", "韩式烤肉", "川菜", "本帮点心", "咖啡轻食"];

type CreateRoomFormProps = {
  onCreate: (input: CreateRoomInput) => void;
  disabled?: boolean;
  initialBudget?: number;
  initialCuisines?: string[];
  requireLocationSelection?: boolean;
};

type LocationResolvePayload =
  | {
      ok: true;
      location: RoomLocation;
    }
  | {
      ok: false;
      reason?: string;
      message?: string;
    };

export function CreateRoomForm({
  onCreate,
  disabled,
  initialBudget,
  initialCuisines,
  requireLocationSelection = false
}: CreateRoomFormProps) {
  const [name, setName] = useState("周五晚饭局");
  const [selectedLocation, setSelectedLocation] = useState<RoomLocation | null>(
    requireLocationSelection ? null : popularLocations[0]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitResolving, setSubmitResolving] = useState(false);
  const [budget, setBudget] = useState(initialBudget ?? 120);
  const [participants, setParticipants] = useState(4);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    initialCuisines && initialCuisines.length > 0 ? initialCuisines : defaultCuisines
  );
  const [showAllCuisines, setShowAllCuisines] = useState(false);
  const [diningScenario, setDiningScenario] = useState(defaultDiningScenario);
  const busy = Boolean(disabled || locating || searching || submitResolving);

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((current) =>
      current.includes(cuisine)
        ? current.filter((item) => item !== cuisine)
        : [...current, cuisine]
    );
  }

  function trackLocationSelected(location: RoomLocation) {
    void trackEvent({
      eventName: "location_selected",
      metadata: {
        location_label: location.locationLabel,
        area_key: location.areaKey,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
        radius_m: location.radiusM,
        source: location.source
      }
    });
  }

  async function resolveSearchLocation(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocationNotice("请输入地点、商场、学校或地铁站。");
      return null;
    }

    setSearching(true);
    setLocationNotice("正在查找地点...");
    void trackEvent({
      eventName: "location_search_started",
      metadata: { query: trimmed }
    });

    try {
      const response = await fetch("/api/locations/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "search",
          query: trimmed,
          radiusM: DEFAULT_RADIUS_M
        })
      });
      const payload = (await response.json()) as LocationResolvePayload;

      if (!payload.ok) {
        throw new Error(payload.message || "没有找到这个地点，可以换个关键词试试。");
      }

      setSelectedLocation(payload.location);
      setResolvedQuery(trimmed);
      setLocationNotice(`已选中：${payload.location.locationLabel}`);
      trackLocationSelected(payload.location);
      void trackEvent({
        eventName: "location_search_succeeded",
        metadata: {
          query: trimmed,
          location_label: payload.location.locationLabel,
          lat: payload.location.lat,
          lng: payload.location.lng
        }
      });
      return payload.location;
    } catch (error) {
      console.error("[CreateRoom] search location failed", error);
      setLocationNotice("没有找到这个地点，可以换个关键词试试。");
      void trackEvent({
        eventName: "location_search_failed",
        metadata: {
          query: trimmed,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    } finally {
      setSearching(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationNotice("当前浏览器不支持定位，你也可以手动搜索地点或选择热门地点。");
      return;
    }

    setLocating(true);
    setLocationNotice("正在获取当前位置...");
    void trackEvent({
      eventName: "current_location_requested",
      metadata: {}
    });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000,
          timeout: 10000
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const response = await fetch("/api/locations/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reverse",
          lat,
          lng,
          radiusM: DEFAULT_RADIUS_M
        })
      });
      const payload = (await response.json()) as LocationResolvePayload;
      const location = payload.ok
        ? payload.location
        : makeCurrentRoomLocation({ lat, lng, radiusM: DEFAULT_RADIUS_M });

      setSelectedLocation(location);
      setSearchQuery("");
      setResolvedQuery("");
      setLocationNotice(`已定位：${location.locationLabel}`);
      trackLocationSelected(location);
      void trackEvent({
        eventName: "current_location_succeeded",
        metadata: {
          location_label: location.locationLabel,
          lat,
          lng
        }
      });
    } catch (error) {
      console.error("[CreateRoom] current location failed", error);
      setLocationNotice("无法获取当前位置，你也可以手动搜索地点或选择热门地点。");
      void trackEvent({
        eventName: "current_location_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let finalLocation = selectedLocation;
    const pendingSearch = searchQuery.trim();

    if (pendingSearch && resolvedQuery !== pendingSearch) {
      setSubmitResolving(true);
      const resolvedLocation = await resolveSearchLocation(pendingSearch);
      setSubmitResolving(false);

      if (!resolvedLocation) return;
      finalLocation = resolvedLocation;
    }

    if (!finalLocation) {
      setLocationNotice("先选一个吃饭地点，这样才能帮你找附近餐厅。");
      void trackEvent({
        eventName: "create_room_validation_failed",
        metadata: { reason: "location_missing" }
      });
      return;
    }

    onCreate({
      name,
      location: finalLocation.locationLabel,
      locationMeta: finalLocation,
      budget,
      participants,
      cuisines: selectedCuisines,
      diningScenario
    });
  }

  function selectPopularLocation(location: RoomLocation) {
    setSelectedLocation(location);
    setSearchQuery("");
    setResolvedQuery("");
    setLocationNotice(`已选中：${location.locationLabel}`);
    trackLocationSelected(location);
    void trackEvent({
      eventName: "preset_location_selected",
      metadata: {
        location_label: location.locationLabel,
        area_key: location.areaKey,
        city: location.city,
        lat: location.lat,
        lng: location.lng
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-5 pb-6 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-0"
      >
        <div className="border-b border-slate-200 pb-5 pt-2">
          <FlowProgress stage="create" />
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-950">开一局，今晚吃什么？</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">选好地点与偏好，朋友们会看到同一批餐厅。</p>
        </div>

        <label className="block border-b border-slate-200 py-5 text-sm font-semibold text-slate-800">
          1. 饭局名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            className="mt-2 h-12 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-4 text-base font-medium outline-none focus:border-teal-500"
          />
        </label>

        <section className="border-b border-slate-200 py-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <MapPin size={18} className="text-teal-700" />
            2. 你想在哪附近吃？
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-semibold text-white transition enabled:active:scale-[0.98] disabled:bg-slate-300"
          >
            {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
            {locating ? "正在获取当前位置" : "使用当前位置"}
          </button>
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold text-slate-600">或搜索地点</div>
            <div className="flex min-h-12 items-center gap-2 rounded-lg border border-teal-900/10 bg-slate-50 px-3 focus-within:border-teal-400">
              <Search size={18} className="shrink-0 text-teal-500" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setResolvedQuery("");
                }}
                placeholder="输入地点、商场、学校、地铁站"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => void resolveSearchLocation(searchQuery)}
                disabled={busy || !searchQuery.trim()}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition enabled:active:scale-[0.98] disabled:bg-slate-300"
              >
                {searching ? "查找中" : "搜索"}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold text-slate-600">热门地点</div>
            <div className="flex flex-wrap gap-2">
              {popularLocations.map((location) => {
                const active =
                  selectedLocation?.source === "preset" &&
                  selectedLocation.areaKey === location.areaKey;

                return (
                  <button
                    key={location.areaKey}
                    type="button"
                    onClick={() => selectPopularLocation(location)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-teal-700 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {location.locationLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-teal-800">
            <span className="shrink-0">已选地点</span>
            <span className="min-w-0 break-words">{selectedLocation?.locationLabel ?? "还没选择地点"}</span>
          </div>
          {locationNotice ? (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
              {locationNotice}
            </div>
          ) : null}
        </section>

        <div className="border-b border-slate-200 py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
            <Utensils size={18} className="text-teal-700" />
            3. 菜系偏好 <span className="text-xs font-normal text-slate-600">可不选</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(showAllCuisines
              ? cuisines
              : Array.from(new Set([...featuredCuisines, ...selectedCuisines]))
            ).map((cuisine) => {
              const active = selectedCuisines.includes(cuisine);

              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-700 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowAllCuisines((value) => !value)}
            className="mt-3 text-xs font-semibold text-teal-800 underline-offset-4 hover:underline"
          >
            {showAllCuisines ? "收起菜系" : "查看更多菜系"}
          </button>
        </div>

        <section className="border-b border-slate-200 py-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users size={18} className="text-teal-700" />
            4. 这次是什么饭局？
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {diningScenarioOptions.map((option) => {
              const active = diningScenario === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDiningScenario(option.value)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            {diningScenarioOptions.find((item) => item.value === diningScenario)?.hint}
          </p>
        </section>

        <div className="border-b border-slate-200 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Wallet size={18} className="text-teal-500" />
              5. 人均预算
            </div>
            <div className="text-xl font-bold text-teal-800">¥{budget}</div>
          </div>
          <input
            aria-label="预算"
            type="range"
            min={40}
            max={260}
            step={10}
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
            className="mt-4 w-full accent-teal-500"
          />
          <div className="mt-2 flex justify-between text-xs text-slate-600">
            <span>¥40</span>
            <span>¥260</span>
          </div>
        </div>

        <div className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Users size={18} className="text-teal-500" />
              6. 参与人数
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="减少人数"
                onClick={() => setParticipants((value) => Math.max(2, value - 1))}
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700"
              >
                -
              </button>
              <span className="w-8 text-center text-xl font-bold">{participants}</span>
              <button
                type="button"
                aria-label="增加人数"
                onClick={() => setParticipants((value) => Math.min(7, value + 1))}
                className="grid size-9 place-items-center rounded-full bg-teal-700 text-lg font-semibold text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

      </motion.div>

      <div className="safe-bottom mt-auto pt-3">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-center text-sm font-semibold leading-5 text-white transition enabled:active:scale-[0.98] disabled:bg-slate-300"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={21} />}
          {disabled ? "正在找附近餐厅..." : "创建饭局"}
        </button>
      </div>
    </form>
  );
}
