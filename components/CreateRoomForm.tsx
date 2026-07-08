"use client";

import {
  CUSTOM_LOCATION_LABEL,
  cuisines,
  getRestaurantAreaKey,
  locationOptions
} from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import type { CreateRoomInput } from "@/types";
import { motion } from "framer-motion";
import { MapPin, Plus, SlidersHorizontal, Users, Utensils, Wallet } from "lucide-react";
import { FormEvent, useState } from "react";

const defaultCuisines = ["川渝火锅", "日料", "韩式烤肉"];

type CreateRoomFormProps = {
  onCreate: (input: CreateRoomInput) => void;
  disabled?: boolean;
};

export function CreateRoomForm({ onCreate, disabled }: CreateRoomFormProps) {
  const [name, setName] = useState("周五晚饭局");
  const [locationChoice, setLocationChoice] = useState("当前位置附近");
  const [customLocation, setCustomLocation] = useState("");
  const [budget, setBudget] = useState(120);
  const [participants, setParticipants] = useState(4);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(defaultCuisines);
  const isCustomLocation = locationChoice === CUSTOM_LOCATION_LABEL;

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((current) =>
      current.includes(cuisine)
        ? current.filter((item) => item !== cuisine)
        : [...current, cuisine]
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = isCustomLocation
      ? customLocation.trim() || "当前位置附近"
      : locationChoice;

    onCreate({
      name,
      location,
      budget,
      participants,
      cuisines: selectedCuisines
    });
  }

  function trackLocationSelected(locationLabel: string, isCustomLocation: boolean) {
    void trackEvent({
      eventName: "location_selected",
      metadata: {
        location_label: locationLabel,
        area_key: getRestaurantAreaKey(locationLabel),
        is_custom_location: isCustomLocation
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
          <h1 className="mt-4 text-3xl font-black leading-tight">先把大家的口味圈出来</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            先选集合区域，再让大家一起滑附近的体验版餐厅池。
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

        <div className="block text-sm font-black text-slate-700">
          <div className="mb-2 flex items-center gap-2">
            <MapPin size={18} className="text-teal-500" />
            饭局地点
          </div>
          <div className="grid grid-cols-2 gap-2">
            {locationOptions.map((option) => {
              const active = locationChoice === option.label;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setLocationChoice(option.label);
                    trackLocationSelected(option.label, option.key === "custom");
                  }}
                  className={`min-h-16 rounded-lg px-3 py-3 text-left transition ${
                    active
                      ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                      : "bg-white text-slate-700 ring-1 ring-teal-900/10"
                  }`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span
                    className={`mt-1 block text-[11px] font-bold leading-4 ${
                      active ? "text-teal-50" : "text-slate-400"
                    }`}
                  >
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
          {isCustomLocation ? (
            <div className="mt-3 flex h-12 items-center gap-3 rounded-lg border border-teal-900/10 bg-white px-4 shadow-sm focus-within:border-teal-400">
              <MapPin size={19} className="text-teal-500" />
              <input
                value={customLocation}
                onChange={(event) => setCustomLocation(event.target.value)}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (value) trackLocationSelected(value, true);
                }}
                placeholder="比如：新天地、徐家汇、公司楼下"
                className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none"
              />
            </div>
          ) : null}
        </div>

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
          disabled={disabled}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition enabled:active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
        >
          <Plus size={21} />
          {disabled ? "创建中" : "创建饭局"}
        </button>
      </div>
    </form>
  );
}
