"use client";

import { AppChrome } from "@/components/AppChrome";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { getRestaurantAreaKey } from "@/data/restaurants";
import { trackEvent } from "@/lib/analytics";
import { prepareRestaurantPoolForRoom } from "@/lib/restaurantSource";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { getCurrentUser, saveCurrentUser, saveRoomMemberSession } from "@/lib/storage";
import { createSupabaseRoom } from "@/lib/supabaseRooms";
import type { CreateRoomInput } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateRoomPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(input: CreateRoomInput) {
    setError("");
    setCreating(true);

    try {
      const user = getCurrentUser() ?? saveCurrentUser("饭局队长");
      const { room, member } = await createSupabaseRoom(input, user);
      const restaurantApiResult = await prepareRestaurantPoolForRoom(
        room,
        input.locationMeta
      );
      saveRoomMemberSession(room.id, member, user.id);
      void trackEvent({
        roomId: room.id,
        memberId: member.id,
        eventName: "room_created",
        metadata: {
          title: room.name,
          location_label: room.locationMeta?.locationLabel ?? room.location,
          area_key: room.locationMeta?.areaKey ?? getRestaurantAreaKey(room.location),
          location_source: room.locationMeta?.source,
          lat: room.locationMeta?.lat,
          lng: room.locationMeta?.lng,
          budget: room.budget,
          cuisine_preference: room.cuisines,
          restaurant_source:
            restaurantApiResult.source === "amap" ? "api" : "api_fallback",
          restaurant_api_reason: restaurantApiResult.reason
        }
      });
      router.push(`/room?roomId=${room.id}`);
    } catch (createError) {
      console.error("[CreateRoom] create room failed", createError);
      setError(getReadableSupabaseError(createError, "创建饭局失败"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppChrome showBack title="创建饭局">
      {error ? (
        <div className="mx-5 mt-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-black text-rose-500">
          {error}
        </div>
      ) : null}
      {creating ? (
        <div className="mx-5 mt-2 rounded-lg bg-teal-50 px-4 py-3 text-sm font-black text-teal-700">
          正在为你找附近餐厅...
        </div>
      ) : null}
      <CreateRoomForm onCreate={handleCreate} disabled={creating} />
    </AppChrome>
  );
}
