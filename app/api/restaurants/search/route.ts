import { DEFAULT_RESTAURANT_AREA, getRestaurantAreaKey } from "@/data/restaurants";
import type { Database, Json } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function recordServerEvent(eventName: string, metadata: Record<string, unknown>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return;

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await supabase.from("events").insert({
      event_name: eventName,
      metadata: metadata as Json
    });

    if (error) console.error("[RestaurantAPI] record event failed", error);
  } catch (error) {
    console.error("[RestaurantAPI] record event crashed", error);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location") ?? "";
  const areaKey = getRestaurantAreaKey(location);
  const hasGoogleKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const hasAmapKey = Boolean(process.env.AMAP_API_KEY);

  if (!hasGoogleKey && !hasAmapKey) {
    await Promise.all([
      recordServerEvent("restaurant_api_failed", {
        reason: "API_KEY_NOT_CONFIGURED",
        area_key: areaKey,
        provider: "none"
      }),
      recordServerEvent("fallback_restaurants_used", {
        requested_area_key: areaKey,
        fallback_area_key: DEFAULT_RESTAURANT_AREA
      })
    ]);

    return NextResponse.json(
      {
        ok: false,
        reason: "API_KEY_NOT_CONFIGURED"
      },
      { status: 200 }
    );
  }

  await recordServerEvent("restaurant_api_failed", {
    reason: "REAL_API_NOT_ENABLED_IN_V24",
    area_key: areaKey,
    provider: hasGoogleKey ? "google_places" : "amap"
  });

  return NextResponse.json(
    {
      ok: false,
      reason: "REAL_API_NOT_ENABLED_IN_V24"
    },
    { status: 200 }
  );
}
