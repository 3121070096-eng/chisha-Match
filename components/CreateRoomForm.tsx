"use client";

import {
  DEFAULT_RADIUS_M,
  makeCurrentRoomLocation,
  popularLocations,
  type RoomLocation
} from "@/data/locations";
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
  SlidersHorizontal,
  Users,
  Utensils,
  Wallet
} from "lucide-react";
import { FormEvent, useState } from "react";

const defaultCuisines = ["川渝火锅", "日料", "韩式烤肉"];

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
      setLocationNotice("请选择当前位置、搜索地点或热门地点后再创建饭局。");
      return;
    }

    onCreate({
      name,
      location: finalLocation.locationLabel,
      locationMeta: finalLocation,
      budget,
      participants,
      cuisines: selectedCuisines
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
        className="space-y-5"
      >
        <div className="rounded-lg bg-slate-950 p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-black text-teal-100">
            <SlidersHorizontal size={15} />
            饭局偏好
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight">先圈定集合点，再一起滑附近餐厅</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            可以用当前位置、搜商场学校地铁站，或者直接点热门地点。
          </p>
        </div>

        <label className="block text-sm font-black text-slate-700">
          饭局名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-teal-900/10 bg-white px-4 text-lg font-black outline-none shadow-sm focus:border-teal-400"
          />
        </label>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
            <MapPin size={18} className="text-teal-500" />
            你想在哪附近吃？
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-4 text-sm font-black text-white shadow-md shadow-teal-500/20 transition enabled:active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
          >
            {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
            {locating ? "正在获取当前位置" : "使用当前位置"}
          </button>

          <div className="mt-4">
            <div className="mb-2 text-xs font-black text-slate-400">或搜索地点</div>
            <div className="flex min-h-12 items-center gap-2 rounded-lg border border-teal-900/10 bg-slate-50 px-3 focus-within:border-teal-400">
              <Search size={18} className="shrink-0 text-teal-500" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setResolvedQuery("");
                }}
                placeholder="输入地点、商场、学校、地铁站"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              />
              <button
                type="button"
                onClick={() => void resolveSearchLocation(searchQuery)}
                disabled={busy || !searchQuery.trim()}
                className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition enabled:active:scale-[0.98] disabled:bg-slate-300"
              >
                {searching ? "查找中" : "搜索"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-black text-slate-400">热门地点</div>
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
                    className={`rounded-full px-3 py-2 text-xs font-black transition ${
                      active
                        ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                        : "bg-slate-50 text-slate-600 ring-1 ring-teal-900/10"
                    }`}
                  >
                    {location.locationLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs font-black leading-5 text-teal-700">
            当前选择：{selectedLocation?.locationLabel ?? "还没选择地点"}
          </div>
          {locationNotice ? (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
              {locationNotice}
            </div>
          ) : null}
        </section>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Wallet size={18} className="text-teal-500" />
              人均预算
            </div>
            <div className="text-2xl font-black text-teal-600">¥{budget}</div>
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
          <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
            <span>轻松吃</span>
            <span>认真吃</span>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <Users size={18} className="text-teal-500" />
              参与人数
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="减少人数"
                onClick={() => setParticipants((value) => Math.max(2, value - 1))}
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-700"
              >
                -
              </button>
              <span className="w-8 text-center text-xl font-black">{participants}</span>
              <button
                type="button"
                aria-label="增加人数"
                onClick={() => setParticipants((value) => Math.min(7, value + 1))}
                className="grid size-9 place-items-center rounded-full bg-teal-500 text-lg font-black text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
            <Utensils size={18} className="text-teal-500" />
            菜系偏好
          </div>
          <div className="flex max-h-[210px] flex-wrap gap-2 overflow-y-auto no-scrollbar">
            {cuisines.map((cuisine) => {
              const active = selectedCuisines.includes(cuisine);

              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    active
                      ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                      : "bg-white text-slate-600 ring-1 ring-teal-900/10"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="safe-bottom mt-auto pt-7">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-4 text-base font-black text-white shadow-lg shadow-teal-500/25 transition enabled:active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={21} />}
          {disabled ? "正在为你找附近餐厅" : "创建饭局"}
        </button>
      </div>
    </form>
  );
}
