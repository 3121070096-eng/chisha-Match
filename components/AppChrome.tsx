"use client";

import { ArrowLeft, Home, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type AppChromeProps = {
  children: ReactNode;
  showBack?: boolean;
  title?: string;
  rightSlot?: ReactNode;
};

export function AppChrome({ children, showBack, title, rightSlot }: AppChromeProps) {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-[#ecf2ee] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#fbfcfa] lg:border-x lg:border-slate-200">
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-[#fbfcfa] px-5 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            {showBack ? (
              <button
                type="button"
                aria-label="返回"
                onClick={() => router.back()}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-800"
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-700 text-white">
                <Utensils size={19} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-teal-700">
                吃啥 Match
              </p>
              {title ? (
                <h1 className="truncate text-base font-bold text-slate-950">{title}</h1>
              ) : null}
            </div>
          </div>
          {rightSlot ?? (
            <button
              type="button"
              aria-label="回到首页"
              onClick={() => router.push("/")}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            >
              <Home size={18} />
            </button>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}
