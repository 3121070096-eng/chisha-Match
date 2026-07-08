"use client";

import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary
}: EmptyStateProps) {
  return (
    <div className="grid flex-1 place-items-center px-5 text-center">
      <div className="w-full rounded-lg border border-teal-900/5 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,118,110,0.10)]">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-teal-50 text-teal-500">
          <Icon size={30} />
        </div>
        <h1 className="mt-5 text-2xl font-black leading-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{description}</p>
        <button
          type="button"
          onClick={onPrimary}
          className="mt-5 h-12 w-full rounded-full bg-teal-500 text-base font-black text-white shadow-lg shadow-teal-500/25 transition active:scale-[0.98]"
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-3 h-12 w-full rounded-full bg-slate-100 text-base font-black text-slate-700 transition active:scale-[0.98]"
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
