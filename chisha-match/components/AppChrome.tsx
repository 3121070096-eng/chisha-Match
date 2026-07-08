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
    <main className="min-h-dvh bg-[linear-gradient(145deg,#f0fffb_0%,#ffffff_46%,#fff7ed_100%)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white/45 shadow-[0_20px_70px_rgba(15,118,110,0.14)]">
        <header className="flex h-16 shrink-0 items-center justify-between px-5 pt-2 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            {showBack ? (
              <button
                type="button"
                aria-label="返回"
                onClick={() => router.back()}
                className="grid size-10 place-items-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-teal-900/5"
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <div className="grid size-10 place-items-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/30">
                <Utensils size={19} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
                吃啥 Match
              </p>
              {title ? (
                <h1 className="truncate text-lg font-black text-slate-950">{title}</h1>
              ) : null}
            </div>
          </div>
          {rightSlot ?? (
            <button
              type="button"
              aria-label="回到首页"
              onClick={() => router.push("/")}
              className="grid size-10 place-items-center rounded-full bg-white/85 text-slate-700 shadow-sm ring-1 ring-teal-900/5"
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
