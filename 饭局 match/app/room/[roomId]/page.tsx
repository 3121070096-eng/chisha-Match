"use client";

import { AppChrome } from "@/components/AppChrome";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoomIdPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();

  useEffect(() => {
    if (!params.roomId) return;
    router.replace(`/room?roomId=${encodeURIComponent(params.roomId)}`);
  }, [params.roomId, router]);

  return (
    <AppChrome showBack title="饭局房间">
      <div className="grid flex-1 place-items-center px-5 text-sm font-bold text-slate-500">
        正在进入饭局房间
      </div>
    </AppChrome>
  );
}
