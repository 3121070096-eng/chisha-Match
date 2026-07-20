import { DEFAULT_RESTAURANT_AREA, getRestaurantAreaKey, type Restaurant } from "@/data/restaurants";
import { cacheInsertFromRestaurant, restaurantFromCacheRow } from "@/lib/restaurantCache";
import { buildHighQualityRestaurantPool } from "@/lib/restaurantPoolBuilder";
import { createRestaurantSearchPlan } from "@/lib/restaurantSearchPlan";
import {
  getPresetAreaCenter,
  hasAmapApiKey,
  resolveAmapLocationByText,
  searchAmapRestaurants,
  searchAmapRestaurantsByText,
} from "@/lib/server/amap";
import { getSupabaseErrorDebugPayload } from "@/lib/supabaseErrors";
import type { DiningScenario } from "@/types";
import type { Database, Json } from "@/types/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PoolAction = "generate" | "confirm" | "remove" | "refresh";

type SearchInput = {
  action?: PoolAction;
  roomId?: string;
  areaKey?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
  cuisinePreference?: string;
  cuisinePreferences?: string[];
  budget?: number;
  diningScenario?: DiningScenario;
  accessToken?: string;
  ownerMemberId?: string;
  restaurantSourcePlaceId?: string;
  confirmReset?: boolean;
  initialCount?: number;
  removedByHostCount?: number;
};

type RestaurantApiResponse = {
  ok: boolean;
  source: "amap" | "cache" | "none";
  restaurants: Restaurant[];
  reason?: string;
  requiresConfirmation?: boolean;
  refreshCount?: number;
};

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type RestaurantCacheRow = Database["public"]["Tables"]["restaurant_cache"]["Row"];

function getServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseInput(request: Request): Promise<SearchInput> {
  const url = new URL(request.url);
  const queryInput: SearchInput = {
    action: (url.searchParams.get("action") as PoolAction | null) ?? undefined,
    roomId: url.searchParams.get("roomId") ?? undefined,
    areaKey: url.searchParams.get("areaKey") ?? undefined,
    locationLabel: url.searchParams.get("locationLabel") ?? undefined,
    lat: getNumber(url.searchParams.get("lat")),
    lng: getNumber(url.searchParams.get("lng")),
    radiusM: getNumber(url.searchParams.get("radiusM")),
    cuisinePreference: url.searchParams.get("cuisinePreference") ?? undefined,
    budget: getNumber(url.searchParams.get("budget")),
  };
  if (request.method !== "POST") return queryInput;
  try {
    return { ...queryInput, ...((await request.json()) as SearchInput) };
  } catch {
    return queryInput;
  }
}

function asJson(metadata: Record<string, unknown>) {
  return metadata as Json;
}

async function recordServerEvent(
  supabase: SupabaseClient<Database>,
  roomId: string | undefined,
  eventName: string,
  metadata: Record<string, unknown>,
) {
  const { error } = await supabase.from("events").insert({
    room_id: roomId ?? null,
    event_name: eventName,
    metadata: asJson(metadata),
  });
  if (error) console.error("[RestaurantPool] event write failed", getSupabaseErrorDebugPayload(error));
}

async function loadRoom(supabase: SupabaseClient<Database>, roomId?: string) {
  if (!roomId) return null;
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as RoomRow | null;
}

function assertRoomAccess(room: RoomRow, token?: string) {
  if (!room.share_token) return;
  if (!token || token !== room.share_token) throw new Error("INVALID_ROOM_TOKEN");
}

async function assertRoomOwner(
  supabase: SupabaseClient<Database>,
  roomId: string,
  ownerMemberId?: string,
) {
  if (!ownerMemberId) throw new Error("OWNER_MEMBER_REQUIRED");
  const { data, error } = await supabase
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.id !== ownerMemberId) throw new Error("OWNER_ONLY");
}

async function loadRoomRestaurants(supabase: SupabaseClient<Database>, roomId?: string) {
  if (!roomId) return [];
  const { data, error } = await supabase
    .from("room_restaurants")
    .select("rank, restaurant_cache(*)")
    .eq("room_id", roomId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{
    rank: number | null;
    restaurant_cache: RestaurantCacheRow | RestaurantCacheRow[] | null;
  }>)
    .map((item) => {
      const row = Array.isArray(item.restaurant_cache) ? item.restaurant_cache[0] : item.restaurant_cache;
      return row ? restaurantFromCacheRow(row) : null;
    })
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}

async function loadCachedAmapRestaurants(
  supabase: SupabaseClient<Database>,
  areaKey: string,
  excluded: Set<string>,
) {
  const { data, error } = await supabase
    .from("restaurant_cache")
    .select("*")
    .eq("source", "amap")
    .eq("area_key", areaKey)
    .order("updated_at", { ascending: false })
    .limit(48);
  if (error) {
    console.error("[RestaurantPool] cached amap load failed", getSupabaseErrorDebugPayload(error));
    return [];
  }
  return (data ?? [])
    .map(restaurantFromCacheRow)
    .filter((restaurant) => !excluded.has(restaurant.sourcePlaceId ?? restaurant.id));
}

async function writeRoomPool(
  supabase: SupabaseClient<Database>,
  roomId: string,
  restaurants: Restaurant[],
  replace = false,
) {
  const cachePayload = restaurants.map(cacheInsertFromRestaurant);
  const { data: cacheRows, error: cacheError } = await supabase
    .from("restaurant_cache")
    .upsert(cachePayload, { onConflict: "source,source_place_id" })
    .select("*");
  if (cacheError) throw cacheError;

  const cacheBySource = new Map(
    (cacheRows ?? []).map((row) => [`${row.source}:${row.source_place_id}`, row.id]),
  );
  const roomRows = restaurants.flatMap((restaurant, index) => {
    const sourcePlaceId = restaurant.sourcePlaceId ?? restaurant.id;
    const cacheId = cacheBySource.get(`${restaurant.source ?? "amap"}:${sourcePlaceId}`);
    return cacheId ? [{ room_id: roomId, restaurant_id: cacheId, rank: index + 1 }] : [];
  });
  if (roomRows.length === 0) throw new Error("NO_CACHE_ROWS_RETURNED");

  if (replace) {
    const { error } = await supabase.from("room_restaurants").delete().eq("room_id", roomId);
    if (error) throw error;
  }
  const { error: roomError } = await supabase
    .from("room_restaurants")
    .upsert(roomRows, { onConflict: "room_id,restaurant_id" });
  if (roomError) throw roomError;
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 8000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runConcurrent<T>(tasks: Array<() => Promise<T>>, concurrency = 2) {
  const results: T[] = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        results.push(await tasks[index]());
      } catch (error) {
        console.error("[RestaurantPool] keyword request failed", error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

function mergeCandidates(candidates: Restaurant[][], excluded: Set<string>) {
  const seen = new Set<string>();
  return candidates.flat().filter((restaurant) => {
    const key = restaurant.sourcePlaceId ?? restaurant.id;
    if (excluded.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchCandidates(input: SearchInput, refreshIndex = 0) {
  const areaKey = input.areaKey || getRestaurantAreaKey(input.locationLabel);
  const plan = createRestaurantSearchPlan({
    diningScenario: input.diningScenario,
    cuisinePreferences: input.cuisinePreferences ?? (input.cuisinePreference ? [input.cuisinePreference] : []),
    budget: input.budget,
    radiusM: input.radiusM,
    refreshIndex,
  });
  const center = typeof input.lat === "number" && typeof input.lng === "number"
    ? { lat: input.lat, lng: input.lng }
    : getPresetAreaCenter(areaKey, input.locationLabel) ?? await resolveAmapLocationByText(input.locationLabel ?? "");
  const tasks = plan.keywords.map((keyword) => async () => {
    if (center) {
      return withTimeout(searchAmapRestaurants({
        lat: center.lat,
        lng: center.lng,
        radiusM: plan.radiusM,
        keyword,
        areaKey,
      }), `AMAP_${keyword}`);
    }
    return withTimeout(searchAmapRestaurantsByText({
      locationLabel: input.locationLabel,
      keyword,
      areaKey,
    }), `AMAP_TEXT_${keyword}`);
  });
  const candidates = await runConcurrent(tasks.slice(0, plan.maxRequests));
  return { candidates, plan, areaKey };
}

async function generatePool(
  supabase: SupabaseClient<Database>,
  input: SearchInput,
  room: RoomRow,
  options: { replace?: boolean; refreshIndex?: number; excluded?: Set<string> } = {},
) {
  const refreshIndex = options.refreshIndex ?? 0;
  const { candidates, plan, areaKey } = await searchCandidates(input, refreshIndex);
  const excluded = options.excluded ?? new Set<string>();
  const apiRestaurants = mergeCandidates(candidates, excluded);
  const cachedRestaurants = await loadCachedAmapRestaurants(supabase, areaKey, excluded);
  const context = {
    areaKey,
    locationLabel: input.locationLabel ?? room.location,
    cuisinePreferences: input.cuisinePreferences ?? room.cuisine_preference ?? [],
    cuisinePreference: input.cuisinePreference,
    budget: input.budget ?? room.budget,
    radiusM: input.radiusM ?? room.location_radius_m ?? 3000,
    diningScenario: input.diningScenario ?? room.dining_scenario ?? "friends",
    targetCount: 14,
  };
  const pool = buildHighQualityRestaurantPool(apiRestaurants, cachedRestaurants, context);
  const metadata = {
    keywords: plan.keywords,
    dining_scenario: context.diningScenario,
    cuisine_preference: context.cuisinePreferences,
    budget: context.budget,
    radius_m: plan.radiusM,
    total_api_results: pool.stats.totalApiResults,
    hard_rejected_count: pool.stats.hardRejectedCount,
    qualified_count: pool.stats.qualifiedCount,
    backup_count: pool.stats.backupCount,
    deduped_count: pool.stats.dedupedCount,
    final_pool_count: pool.stats.finalPoolCount,
    category_count: pool.stats.categoryCount,
    source_mix: pool.stats.sourceMix,
    refresh_index: refreshIndex,
  };

  await Promise.all([
    recordServerEvent(supabase, room.id, "restaurant_search_plan_created", {
      keywords: plan.keywords,
      dining_scenario: context.diningScenario,
      cuisine_preference: context.cuisinePreferences,
      budget: context.budget,
      radius_m: plan.radiusM,
    }),
    recordServerEvent(supabase, room.id, "restaurant_pool_quality_checked", metadata),
  ]);

  if (pool.restaurants.length < 8) {
    await recordServerEvent(supabase, room.id, "restaurant_api_failed", {
      reason: "AMAP_QUALITY_POOL_TOO_SMALL",
      ...metadata,
    });
    return { pool, metadata, areaKey, persisted: false, reason: "QUALITY_POOL_TOO_SMALL" };
  }

  await writeRoomPool(supabase, room.id, pool.restaurants, options.replace);
  const { error: sourceError } = await supabase
    .from("rooms")
    .update({ restaurant_source: "api" })
    .eq("id", room.id);
  if (sourceError) console.error("[RestaurantPool] room source update failed", getSupabaseErrorDebugPayload(sourceError));

  await Promise.all([
    recordServerEvent(supabase, room.id, "restaurant_api_succeeded", {
      returned_count: apiRestaurants.length,
      final_count: pool.stats.finalPoolCount,
      source: pool.stats.sourceMix,
    }),
    recordServerEvent(supabase, room.id, "restaurant_cache_written", {
      restaurant_count: pool.stats.finalPoolCount,
      source: pool.stats.sourceMix,
    }),
    recordServerEvent(supabase, room.id, "room_restaurant_pool_created", {
      restaurant_count: pool.stats.finalPoolCount,
      area_key: areaKey,
      location_label: context.locationLabel,
      source: pool.stats.sourceMix,
    }),
  ]);
  return { pool, metadata, areaKey, persisted: true };
}

async function handleRemove(supabase: SupabaseClient<Database>, input: SearchInput, room: RoomRow) {
  await assertRoomOwner(supabase, room.id, input.ownerMemberId);
  const current = await loadRoomRestaurants(supabase, room.id);
  if (current.length <= 8) {
    return NextResponse.json({ ok: false, source: "amap", restaurants: current, reason: "MINIMUM_POOL_SIZE" } satisfies RestaurantApiResponse, { status: 400 });
  }
  const target = current.find((item) => (item.sourcePlaceId ?? item.id) === input.restaurantSourcePlaceId);
  if (!target?.sourcePlaceId) {
    return NextResponse.json({ ok: false, source: "amap", restaurants: current, reason: "RESTAURANT_NOT_FOUND" } satisfies RestaurantApiResponse, { status: 404 });
  }
  const { data: cacheRow, error: cacheError } = await supabase
    .from("restaurant_cache")
    .select("id")
    .eq("source", target.source ?? "amap")
    .eq("source_place_id", target.sourcePlaceId)
    .maybeSingle();
  if (cacheError) throw cacheError;
  if (!cacheRow) throw new Error("ROOM_RESTAURANT_CACHE_NOT_FOUND");
  const { error } = await supabase
    .from("room_restaurants")
    .delete()
    .eq("room_id", room.id)
    .eq("restaurant_id", cacheRow.id);
  if (error) throw error;
  return NextResponse.json({ ok: true, source: "amap", restaurants: await loadRoomRestaurants(supabase, room.id) } satisfies RestaurantApiResponse);
}

async function handleConfirm(supabase: SupabaseClient<Database>, input: SearchInput, room: RoomRow) {
  await assertRoomOwner(supabase, room.id, input.ownerMemberId);
  const current = await loadRoomRestaurants(supabase, room.id);
  if (current.length < 8) {
    return NextResponse.json({ ok: false, source: "amap", restaurants: current, reason: "MINIMUM_POOL_SIZE" } satisfies RestaurantApiResponse, { status: 400 });
  }
  const { error } = await supabase
    .from("rooms")
    .update({ restaurant_pool_confirmed_at: new Date().toISOString() })
    .eq("id", room.id);
  if (error) throw error;
  await recordServerEvent(supabase, room.id, "restaurant_pool_confirmed", {
    initial_count: input.initialCount ?? current.length,
    removed_by_host_count: input.removedByHostCount ?? 0,
    final_count: current.length,
  });
  return NextResponse.json({ ok: true, source: "amap", restaurants: current } satisfies RestaurantApiResponse);
}

async function handleRefresh(supabase: SupabaseClient<Database>, input: SearchInput, room: RoomRow) {
  await assertRoomOwner(supabase, room.id, input.ownerMemberId);
  const refreshCount = room.restaurant_pool_refresh_count ?? 0;
  if (refreshCount >= 2) {
    return NextResponse.json({ ok: false, source: "amap", restaurants: await loadRoomRestaurants(supabase, room.id), reason: "REFRESH_LIMIT_REACHED", refreshCount } satisfies RestaurantApiResponse, { status: 400 });
  }
  await recordServerEvent(supabase, room.id, "restaurant_pool_refresh_requested", { refresh_index: refreshCount + 1 });
  const { count: swipeCount, error: swipeError } = await supabase
    .from("swipes")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if (swipeError) throw swipeError;
  if ((swipeCount ?? 0) > 0 && !input.confirmReset) {
    return NextResponse.json({
      ok: false,
      source: "amap",
      restaurants: await loadRoomRestaurants(supabase, room.id),
      reason: "SWIPES_EXIST",
      requiresConfirmation: true,
      refreshCount,
    } satisfies RestaurantApiResponse, { status: 409 });
  }

  const previous = await loadRoomRestaurants(supabase, room.id);
  const excluded = new Set(previous.map((item) => item.sourcePlaceId ?? item.id));
  const result = await generatePool(supabase, input, room, {
    replace: true,
    refreshIndex: refreshCount + 1,
    excluded,
  });
  if (!result.persisted) {
    await recordServerEvent(supabase, room.id, "restaurant_pool_refresh_failed", {
      previous_count: previous.length,
      reason: result.reason,
    });
    return NextResponse.json({
      ok: false,
      source: "amap",
      restaurants: previous,
      reason: result.reason,
      refreshCount,
    } satisfies RestaurantApiResponse, { status: 400 });
  }

  const [{ error: swipeDeleteError }, { error: votesDeleteError }] = await Promise.all([
    supabase.from("swipes").delete().eq("room_id", room.id),
    supabase.from("decision_votes").delete().eq("room_id", room.id),
  ]);
  if (swipeDeleteError) throw swipeDeleteError;
  if (votesDeleteError) console.error("[RestaurantPool] clear decision votes failed", getSupabaseErrorDebugPayload(votesDeleteError));
  const nextRefreshCount = refreshCount + 1;
  const { error: roomError } = await supabase
    .from("rooms")
    .update({
      restaurant_pool_confirmed_at: null,
      restaurant_pool_refresh_count: nextRefreshCount,
      status: "open",
      final_restaurant_id: null,
    })
    .eq("id", room.id);
  if (roomError) throw roomError;
  await recordServerEvent(supabase, room.id, "restaurant_pool_refreshed", {
    previous_count: previous.length,
    new_count: result.pool.restaurants.length,
    repeated_count: 0,
    refresh_index: nextRefreshCount,
  });
  return NextResponse.json({
    ok: true,
    source: "amap",
    restaurants: result.pool.restaurants,
    refreshCount: nextRefreshCount,
  } satisfies RestaurantApiResponse);
}

async function handleSearch(request: Request) {
  const input = await parseInput(request);
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    console.error("[RestaurantPool] SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED");
    return NextResponse.json({ ok: false, source: "none", restaurants: [], reason: "SERVER_NOT_CONFIGURED" } satisfies RestaurantApiResponse, { status: 503 });
  }
  if (!input.roomId) {
    return NextResponse.json({ ok: false, source: "none", restaurants: [], reason: "ROOM_REQUIRED" } satisfies RestaurantApiResponse, { status: 400 });
  }
  try {
    const room = await loadRoom(supabase, input.roomId);
    if (!room) return NextResponse.json({ ok: false, source: "none", restaurants: [], reason: "ROOM_NOT_FOUND" } satisfies RestaurantApiResponse, { status: 404 });
    assertRoomAccess(room, input.accessToken);
    const action = input.action ?? "generate";
    if (action === "remove") return handleRemove(supabase, input, room);
    if (action === "confirm") return handleConfirm(supabase, input, room);
    if (action === "refresh") return handleRefresh(supabase, input, room);

    const existing = await loadRoomRestaurants(supabase, room.id);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, source: "amap", restaurants: existing, refreshCount: room.restaurant_pool_refresh_count ?? 0 } satisfies RestaurantApiResponse);
    }
    if (!hasAmapApiKey()) {
      await recordServerEvent(supabase, room.id, "restaurant_api_failed", { reason: "AMAP_API_KEY_NOT_CONFIGURED" });
      const { error } = await supabase.from("rooms").update({ restaurant_source: "api_unavailable" }).eq("id", room.id);
      if (error) console.error("[RestaurantPool] api unavailable source update failed", getSupabaseErrorDebugPayload(error));
      return NextResponse.json({ ok: false, source: "none", restaurants: [], reason: "AMAP_API_KEY_NOT_CONFIGURED" } satisfies RestaurantApiResponse, { status: 503 });
    }
    await recordServerEvent(supabase, room.id, "restaurant_api_requested", {
      area_key: input.areaKey ?? getRestaurantAreaKey(input.locationLabel ?? room.location),
      dining_scenario: input.diningScenario ?? room.dining_scenario ?? "friends",
    });
    const result = await generatePool(supabase, input, room);
    if (!result.persisted) {
      const { error } = await supabase.from("rooms").update({ restaurant_source: "api_unavailable" }).eq("id", room.id);
      if (error) console.error("[RestaurantPool] empty pool source update failed", getSupabaseErrorDebugPayload(error));
    }
    return NextResponse.json({
      ok: result.persisted,
      source: result.pool.stats.sourceMix === "cache" ? "cache" : "amap",
      restaurants: result.persisted ? result.pool.restaurants : [],
      reason: result.persisted ? undefined : result.reason,
      refreshCount: room.restaurant_pool_refresh_count ?? 0,
    } satisfies RestaurantApiResponse, { status: result.persisted ? 200 : 400 });
  } catch (error) {
    console.error("[RestaurantPool] search failed", getSupabaseErrorDebugPayload(error));
    if (input.roomId) {
      const { error: sourceError } = await supabase
        .from("rooms")
        .update({ restaurant_source: "api_unavailable" })
        .eq("id", input.roomId);
      if (sourceError) console.error("[RestaurantPool] failed source update failed", getSupabaseErrorDebugPayload(sourceError));
    }
    return NextResponse.json({ ok: false, source: "none", restaurants: [], reason: error instanceof Error ? error.message : "RESTAURANT_POOL_FAILED" } satisfies RestaurantApiResponse, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSearch(request);
}

export async function POST(request: Request) {
  return handleSearch(request);
}
