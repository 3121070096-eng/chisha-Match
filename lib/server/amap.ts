import {
  DEFAULT_RESTAURANT_AREA,
  getRestaurantAreaKey,
  type Restaurant,
  type RestaurantAreaKey
} from "@/data/restaurants";
import { makeAmapRestaurantId } from "@/lib/restaurantCache";

const AMAP_GEOCODE_URL = "https://restapi.amap.com/v3/geocode/geo";
const AMAP_AROUND_URL = "https://restapi.amap.com/v3/place/around";
const AMAP_TEXT_URL = "https://restapi.amap.com/v3/place/text";
const AMAP_FOOD_TYPE = "050000";

const fallbackImageGroups = {
  hotpot: [
    "/restaurants/hotpot-1.png",
    "/restaurants/hotpot-2.png",
    "/restaurants/hotpot-3.png"
  ],
  sushi: [
    "/restaurants/sushi-1.png",
    "/restaurants/sushi-2.png",
    "/restaurants/sushi-3.png"
  ],
  cafe: [
    "/restaurants/cafe-1.png",
    "/restaurants/cafe-2.png",
    "/restaurants/cafe-3.png"
  ],
  grill: [
    "/restaurants/grill-1.png",
    "/restaurants/grill-2.png",
    "/restaurants/grill-3.png"
  ],
  default: [
    "/restaurants/fallback.png",
    "/restaurants/thai-1.png",
    "/restaurants/noodles-1.png"
  ]
};

type AmapGeocodeResponse = {
  status?: string;
  info?: string;
  geocodes?: Array<{
    formatted_address?: string;
    location?: string;
  }>;
};

type AmapPoi = {
  id?: string;
  name?: string;
  type?: string;
  address?: string | string[];
  location?: string;
  distance?: string;
  biz_ext?: {
    rating?: string;
    cost?: string;
  };
  photos?: Array<{
    title?: string;
    url?: string;
  }>;
};

type AmapSearchResponse = {
  status?: string;
  info?: string;
  pois?: AmapPoi[];
};

type SearchBaseInput = {
  areaKey?: string;
  keyword?: string;
  cuisinePreference?: string;
};

type AroundSearchInput = SearchBaseInput & {
  lat: number;
  lng: number;
  radiusM?: number;
};

type TextSearchInput = SearchBaseInput & {
  locationLabel?: string;
};

export function hasAmapApiKey() {
  return Boolean(process.env.AMAP_API_KEY);
}

function getAmapApiKey() {
  const key = process.env.AMAP_API_KEY;
  if (!key) throw new Error("AMAP_API_KEY_NOT_CONFIGURED");
  return key;
}

function parseAmapLocation(location?: string) {
  if (!location) return null;
  const [lngValue, latValue] = location.split(",");
  const lng = Number(lngValue);
  const lat = Number(latValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getAddressText(address?: string | string[]) {
  if (Array.isArray(address)) return address.filter(Boolean).join("");
  return address || undefined;
}

function formatDistance(distance?: string) {
  const meters = Number(distance);
  if (!Number.isFinite(meters) || meters <= 0) return "距离待确认";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

function parseNumber(value?: string) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildKeyword(keyword?: string, cuisinePreference?: string) {
  const cuisine = cuisinePreference?.trim();
  const base = keyword?.trim() || "餐厅";
  if (!cuisine || cuisine === "不限" || base.includes(cuisine)) return base;
  return `${cuisine} ${base}`;
}

function inferCuisine({
  name,
  type,
  cuisinePreference,
  keyword
}: {
  name: string;
  type?: string;
  cuisinePreference?: string;
  keyword?: string;
}) {
  const text = `${name} ${type ?? ""} ${keyword ?? ""}`;
  const preference = cuisinePreference?.trim();

  if (preference && preference !== "不限") return preference;
  if (/火锅/.test(text)) return "火锅";
  if (/日本|日料|寿司|刺身|烧鸟/.test(text)) return "日料";
  if (/咖啡|茶|甜品|面包|轻食/.test(text)) return "咖啡轻食";
  if (/烧烤|烤肉|韩/.test(text)) return "烧烤烤肉";
  if (/川|湘|冒菜|麻辣/.test(text)) return "川湘菜";
  if (/粤|茶餐厅|点心/.test(text)) return "粤菜";
  if (/面|粉|小吃|快餐/.test(text)) return "小吃快餐";
  return "餐厅";
}

function getFallbackImages(cuisine: string, index: number) {
  if (/火锅/.test(cuisine)) return fallbackImageGroups.hotpot;
  if (/日料|寿司/.test(cuisine)) return fallbackImageGroups.sushi;
  if (/咖啡|轻食|甜品/.test(cuisine)) return fallbackImageGroups.cafe;
  if (/烤/.test(cuisine)) return fallbackImageGroups.grill;

  const defaults = fallbackImageGroups.default;
  return [
    defaults[index % defaults.length],
    defaults[(index + 1) % defaults.length],
    defaults[(index + 2) % defaults.length]
  ];
}

function getPoiImages(poi: AmapPoi, cuisine: string, index: number) {
  const photos =
    poi.photos
      ?.map((photo) => photo.url?.trim())
      .filter((url): url is string => Boolean(url && /^https?:\/\//.test(url)))
      .map((url) => url.replace(/^http:\/\//, "https://")) ?? [];

  if (photos.length > 0) return photos.slice(0, 3);
  return getFallbackImages(cuisine, index);
}

function getTags(type?: string, cuisine?: string) {
  const typeTags =
    type
      ?.split(";")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];
  const tags = ["餐饮", cuisine, ...typeTags, "适合聚餐"].filter(
    (tag): tag is string => Boolean(tag)
  );
  return Array.from(new Set(tags)).slice(0, 5);
}

function makeAmapReviews(id: string, name: string, rating: number) {
  const displayRating = rating > 0 ? rating : 4.5;

  return [
    {
      id: `${id}-amap-review-1`,
      author: "饭局体验官",
      rating: displayRating,
      text: `体验版食评：${name} 是高德地点搜索返回的候选，真实评论暂未接入。`
    },
    {
      id: `${id}-amap-review-2`,
      author: "选择困难小分队",
      rating: displayRating,
      text: "体验版食评：先看距离和菜系是否合拍，再交给朋友们一起右滑。"
    }
  ];
}

function normalizePoiToRestaurant({
  poi,
  areaKey,
  locationLabel,
  cuisinePreference,
  keyword,
  index
}: {
  poi: AmapPoi;
  areaKey?: string;
  locationLabel?: string;
  cuisinePreference?: string;
  keyword?: string;
  index: number;
}): Restaurant | null {
  if (!poi.id || !poi.name) return null;

  const coordinates = parseAmapLocation(poi.location);
  const id = makeAmapRestaurantId(poi.id);
  const area = getRestaurantAreaKey(areaKey || locationLabel);
  const cuisine = inferCuisine({
    name: poi.name,
    type: poi.type,
    cuisinePreference,
    keyword
  });
  const images = getPoiImages(poi, cuisine, index);
  const rating = parseNumber(poi.biz_ext?.rating);
  const cost = Math.round(parseNumber(poi.biz_ext?.cost));
  const address = getAddressText(poi.address);

  return {
    id,
    name: poi.name,
    image: images[0],
    images,
    cuisine,
    price: cost > 0 ? cost : 0,
    rating: rating > 0 ? Number(rating.toFixed(1)) : 0,
    distance: formatDistance(poi.distance),
    tags: getTags(poi.type, cuisine),
    area: area || DEFAULT_RESTAURANT_AREA,
    areas: [area || DEFAULT_RESTAURANT_AREA],
    areaKey: areaKey || area || DEFAULT_RESTAURANT_AREA,
    address,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    priceLevel: cost > 0 ? String(cost) : undefined,
    source: "amap",
    sourcePlaceId: poi.id,
    description: address
      ? `${poi.name} 位于 ${address}，来自高德 Web 服务 API 的餐饮地点搜索结果。`
      : `${poi.name} 来自高德 Web 服务 API 的餐饮地点搜索结果。`,
    recommendedReason:
      "这条候选来自真实地点搜索。评分、人均和图片可能不完整，所以这版主要验证“真实附近餐厅进入滑卡流程”的体验。",
    bestFor: ["真实附近候选", "多人一起筛", "先滑再决定"],
    reviews: makeAmapReviews(id, poi.name, rating)
  };
}

async function fetchAmapJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`AMAP_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

export async function geocodeAmapLocation(locationLabel: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress?: string;
} | null> {
  const label = locationLabel.trim();
  if (!label) return null;

  const url = new URL(AMAP_GEOCODE_URL);
  url.searchParams.set("key", getAmapApiKey());
  url.searchParams.set("address", label);

  const payload = await fetchAmapJson<AmapGeocodeResponse>(url.toString());

  if (payload.status !== "1") {
    console.error("[Amap] geocode failed", payload);
    return null;
  }

  const first = payload.geocodes?.[0];
  const coordinates = parseAmapLocation(first?.location);

  if (!coordinates) return null;

  return {
    ...coordinates,
    formattedAddress: first?.formatted_address
  };
}

export async function searchAmapRestaurants({
  lat,
  lng,
  radiusM = 3000,
  keyword,
  cuisinePreference,
  areaKey
}: AroundSearchInput): Promise<Restaurant[]> {
  const query = buildKeyword(keyword, cuisinePreference);
  const url = new URL(AMAP_AROUND_URL);
  url.searchParams.set("key", getAmapApiKey());
  url.searchParams.set("location", `${lng},${lat}`);
  url.searchParams.set("keywords", query);
  url.searchParams.set("types", AMAP_FOOD_TYPE);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("offset", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "all");

  const payload = await fetchAmapJson<AmapSearchResponse>(url.toString());

  if (payload.status !== "1") {
    throw new Error(`AMAP_AROUND_FAILED:${payload.info ?? "unknown"}`);
  }

  return (payload.pois ?? [])
    .map((poi, index) =>
      normalizePoiToRestaurant({
        poi,
        areaKey,
        cuisinePreference,
        keyword: query,
        index
      })
    )
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}

export async function searchAmapRestaurantsByText({
  locationLabel,
  keyword,
  cuisinePreference,
  areaKey
}: TextSearchInput): Promise<Restaurant[]> {
  const location = locationLabel?.trim();
  const query = [location, buildKeyword(keyword, cuisinePreference)]
    .filter(Boolean)
    .join(" ");
  const url = new URL(AMAP_TEXT_URL);
  url.searchParams.set("key", getAmapApiKey());
  url.searchParams.set("keywords", query || "餐厅");
  url.searchParams.set("types", AMAP_FOOD_TYPE);
  url.searchParams.set("offset", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "all");

  const payload = await fetchAmapJson<AmapSearchResponse>(url.toString());

  if (payload.status !== "1") {
    throw new Error(`AMAP_TEXT_FAILED:${payload.info ?? "unknown"}`);
  }

  return (payload.pois ?? [])
    .map((poi, index) =>
      normalizePoiToRestaurant({
        poi,
        areaKey,
        locationLabel,
        cuisinePreference,
        keyword: query,
        index
      })
    )
    .filter((restaurant): restaurant is Restaurant => restaurant !== null);
}
