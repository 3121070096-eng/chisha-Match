export type LocationSource = "current_location" | "search" | "preset";

export type RoomLocation = {
  locationLabel: string;
  areaKey?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusM?: number;
  source: LocationSource;
};

export type PopularLocation = RoomLocation & {
  hint: string;
};

export const DEFAULT_RADIUS_M = 3000;

export const popularLocations: PopularLocation[] = [
  {
    locationLabel: "人民广场",
    areaKey: "peoples_square",
    city: "上海",
    lat: 31.2304,
    lng: 121.4737,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "市中心集合点"
  },
  {
    locationLabel: "静安寺",
    areaKey: "jingan_temple",
    city: "上海",
    lat: 31.223,
    lng: 121.4454,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "下班小聚"
  },
  {
    locationLabel: "徐家汇",
    areaKey: "xujiahui",
    city: "上海",
    lat: 31.1836,
    lng: 121.4368,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "商圈饭局"
  },
  {
    locationLabel: "陆家嘴",
    areaKey: "lujiazui",
    city: "上海",
    lat: 31.2397,
    lng: 121.4998,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "浦东下班"
  },
  {
    locationLabel: "五角场",
    areaKey: "wujiaochang",
    city: "上海",
    lat: 31.3039,
    lng: 121.5146,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "学生党友好"
  },
  {
    locationLabel: "大学路",
    areaKey: "daxuelu",
    city: "上海",
    lat: 31.3067,
    lng: 121.506,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "轻松好逛"
  },
  {
    locationLabel: "南京西路",
    areaKey: "nanjing_west_road",
    city: "上海",
    lat: 31.2296,
    lng: 121.4591,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "约会小聚"
  },
  {
    locationLabel: "淮海中路",
    areaKey: "huaihai_middle_road",
    city: "上海",
    lat: 31.2196,
    lng: 121.4682,
    radiusM: DEFAULT_RADIUS_M,
    source: "preset",
    hint: "逛完就吃"
  }
];

export function makeCurrentRoomLocation({
  lat,
  lng,
  label = "当前位置附近",
  city,
  areaKey = "current_location",
  radiusM = DEFAULT_RADIUS_M
}: {
  lat: number;
  lng: number;
  label?: string;
  city?: string;
  areaKey?: string;
  radiusM?: number;
}): RoomLocation {
  return {
    locationLabel: label,
    areaKey,
    city,
    lat,
    lng,
    radiusM,
    source: "current_location"
  };
}
