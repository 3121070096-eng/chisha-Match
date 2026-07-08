"use client";

import { cuisines } from "@/data/restaurants";
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
  const [location, setLocation] = useState("新天地附近");
  const [budget, setBudget] = useState(120);
  const [participants, setParticipants] = useState(4);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(defaultCuisines);

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((current) =>
      current.includes(cuisine)
        ? current.filter((item) => item !== cuisine)
        : [...current, cuisine]
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name,
      location,
      budget,
      participants,
      cuisines: selectedCuisines
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
            V1 使用本地餐厅数据和模拟好友，创建后即可完整体验 Match 流程。
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

        <label className="block text-sm font-black text-slate-700">
          地点
          <div className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-teal-900/10 bg-white px-4 shadow-sm focus-within:border-teal-400">
            <MapPin size={19} className="text-teal-500" />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none"
            />
          </div>
        </label>

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
