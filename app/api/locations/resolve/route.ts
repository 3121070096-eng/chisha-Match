import {
  DEFAULT_RADIUS_M,
  makeCurrentRoomLocation,
  type RoomLocation
} from "@/data/locations";
import { getRestaurantAreaKey } from "@/data/restaurants";
import {
  hasAmapApiKey,
  reverseGeocodeAmapLocation,
  resolveAmapLocationByText
} from "@/lib/server/amap";
import { NextResponse } from "next/server";

type LocationResolveResponse =
  | {
      ok: true;
      location: RoomLocation;
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

type LocationResolveInput = {
  mode?: "reverse" | "search";
  query?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
};

function getNumberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseInput(request: Request): Promise<LocationResolveInput> {
  const url = new URL(request.url);
  const fromQuery: LocationResolveInput = {
    mode: (url.searchParams.get("mode") as LocationResolveInput["mode"]) ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    lat: getNumberParam(url.searchParams.get("lat")),
    lng: getNumberParam(url.searchParams.get("lng")),
    radiusM: getNumberParam(url.searchParams.get("radiusM"))
  };

  if (request.method !== "POST") return fromQuery;

  try {
    const body = (await request.json()) as Partial<LocationResolveInput>;
    return {
      ...fromQuery,
      ...body
    };
  } catch {
    return fromQuery;
  }
}

function isCoordinate(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ok(location: RoomLocation) {
  return NextResponse.json({ ok: true, location } satisfies LocationResolveResponse);
}

function fail(reason: string, message: string) {
  return NextResponse.json(
    { ok: false, reason, message } satisfies LocationResolveResponse,
    { status: 200 }
  );
}

async function handleResolve(request: Request) {
  const input = await parseInput(request);
  const radiusM = input.radiusM ?? DEFAULT_RADIUS_M;

  if (input.mode === "reverse") {
    if (!isCoordinate(input.lat) || !isCoordinate(input.lng)) {
      return fail("INVALID_COORDINATES", "没有拿到有效定位，请换个地点试试。");
    }

    if (!hasAmapApiKey()) {
      return ok(
        makeCurrentRoomLocation({
          lat: input.lat,
          lng: input.lng,
          radiusM
        })
      );
    }

    try {
      const reversed = await reverseGeocodeAmapLocation({
        lat: input.lat,
        lng: input.lng
      });
      const shortLabel = reversed?.township || reversed?.district;

      return ok(
        makeCurrentRoomLocation({
          lat: input.lat,
          lng: input.lng,
          label: shortLabel ? `${shortLabel}附近` : "当前位置附近",
          city: reversed?.city,
          radiusM
        })
      );
    } catch (error) {
      console.error("[LocationResolve] reverse geocode failed", error);
      return ok(
        makeCurrentRoomLocation({
          lat: input.lat,
          lng: input.lng,
          radiusM
        })
      );
    }
  }

  const query = input.query?.trim();
  if (!query) return fail("EMPTY_QUERY", "请输入地点、商场、学校或地铁站。");

  if (!hasAmapApiKey()) {
    return fail("AMAP_API_KEY_NOT_CONFIGURED", "地点搜索暂时不可用，可以先选择热门地点。");
  }

  try {
    const resolved = await resolveAmapLocationByText(query);
    if (!resolved) {
      return fail("LOCATION_NOT_FOUND", "没有找到这个地点，可以换个关键词试试。");
    }

    return ok({
      locationLabel: resolved.formattedAddress || query,
      areaKey: getRestaurantAreaKey(query),
      city: resolved.city || "上海",
      lat: resolved.lat,
      lng: resolved.lng,
      radiusM,
      source: "search"
    });
  } catch (error) {
    console.error("[LocationResolve] search location failed", error);
    return fail("LOCATION_SEARCH_FAILED", "没有找到这个地点，可以换个关键词试试。");
  }
}

export async function GET(request: Request) {
  return handleResolve(request);
}

export async function POST(request: Request) {
  return handleResolve(request);
}
