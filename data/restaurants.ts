export type RestaurantReview = {
  id: string;
  author: string;
  rating: number;
  text: string;
};

export type RestaurantAreaKey =
  | "demo"
  | "nearby"
  | "wujiaochang"
  | "jingansi"
  | "gubei"
  | "pudong"
  | "anfulu";

export type LocationOption = {
  key: RestaurantAreaKey | "custom";
  label: string;
  hint: string;
};

export type Restaurant = {
  id: string;
  name: string;
  image: string;
  images: string[];
  cuisine: string;
  price: number;
  rating: number;
  distance: string;
  tags: string[];
  area: RestaurantAreaKey;
  areas: RestaurantAreaKey[];
  areaKey?: string;
  address?: string;
  lat?: number;
  lng?: number;
  priceLevel?: string;
  source?: "amap" | "local_pack" | "api_fallback" | string;
  sourcePlaceId?: string;
  description?: string;
  recommendedReason?: string;
  bestFor?: string[];
  reviews?: RestaurantReview[];
};

type SeedRestaurant = {
  name: string;
  slug: string;
  cuisine: string;
  price: number;
  rating: number;
  distance: string;
  tags: string[];
};

export const CUSTOM_LOCATION_LABEL = "自定义地点";
export const DEFAULT_RESTAURANT_AREA: RestaurantAreaKey = "nearby";

export const locationOptions: LocationOption[] = [
  { key: "nearby", label: "当前位置附近", hint: "适合快速开一局" },
  { key: "wujiaochang", label: "五角场附近", hint: "学生党和朋友局都好用" },
  { key: "jingansi", label: "静安寺附近", hint: "下班、约会、小聚都能打" },
  { key: "gubei", label: "古北", hint: "安静一点，适合慢慢吃" },
  { key: "pudong", label: "浦东新区", hint: "办公区晚饭不再纠结" },
  { key: "anfulu", label: "安福路", hint: "轻松、好拍、适合散步后吃" },
  { key: "custom", label: CUSTOM_LOCATION_LABEL, hint: "输入你们真实集合点" }
];

const bestForPool = [
  ["朋友小聚", "不想踩雷", "边吃边聊"],
  ["下班回血", "多人局", "热闹一点"],
  ["约会轻松局", "拍照好看", "慢慢吃"],
  ["工作日快决策", "预算友好", "吃完继续安排"],
  ["想吃点特别的", "分享菜", "周末饭局"]
];

const reviewPool = [
  "体验版食评：味道很稳，适合那种大家都没主意但又想吃舒服一点的晚上。",
  "体验版食评：环境不会太吵，聊天不费嗓子，点几个招牌菜基本不出错。",
  "体验版食评：菜品记忆点够，适合发到群里让朋友秒回“可以”。",
  "体验版食评：人均和氛围都比较友好，适合临时成局。",
  "体验版食评：整体轻松不端着，适合把纠结时间省下来直接开吃。"
];

const packSeeds: Record<RestaurantAreaKey, SeedRestaurant[]> = {
  demo: [
    ["青柠小馆", "thai", "东南亚菜", 96, 4.7, "附近 800 m", ["酸辣开胃", "适合聊天", "招牌咖喱"]],
    ["桥边火锅社", "hotpot", "川渝火锅", 138, 4.8, "1.2 km", ["热闹", "鸳鸯锅", "夜宵友好"]],
    ["禾作寿司", "sushi", "日料", 168, 4.6, "900 m", ["吧台位", "刺身", "安静"]],
    ["番茄星球", "pizza", "意大利菜", 112, 4.5, "650 m", ["披萨", "约会感", "芝士浓郁"]],
    ["桃桃烤肉研究所", "grill", "韩式烤肉", 126, 4.8, "1.5 km", ["烤肉", "泡菜", "朋友局"]],
    ["薄荷越粉", "pho", "越南菜", 68, 4.4, "1.1 km", ["河粉", "轻食", "香草"]],
    ["红油冒菜厂", "malatang", "川菜", 72, 4.6, "750 m", ["下饭", "辣度可选", "多人拼"]],
    ["海盐贝果屋", "cafe", "咖啡轻食", 58, 4.3, "500 m", ["下午饭", "贝果", "拍照好看"]],
    ["南巷粤点", "dimsum", "粤菜", 132, 4.7, "1.6 km", ["点心", "早茶", "清淡"]],
    ["咖喱电台", "curry", "印度菜", 105, 4.5, "2.1 km", ["香料", "烤饼", "素食友好"]],
    ["白桃甜品局", "dessert", "甜品", 46, 4.5, "1.0 km", ["饭后", "蛋糕", "奶油"]],
    ["松露煎饺铺", "dumpling", "创意中餐", 84, 4.4, "1.4 km", ["煎饺", "新奇", "小聚"]]
  ].map(toSeed),
  nearby: [
    ["楼下热汤面", "noodles", "面馆", 42, 4.4, "附近 300 m", ["很近", "热汤", "快速开吃"]],
    ["巷口小火锅", "hotpot", "小火锅", 88, 4.5, "附近 520 m", ["单人锅", "不排队", "暖胃"]],
    ["小满咖喱屋", "curry", "咖喱饭", 76, 4.5, "附近 650 m", ["浓郁", "工作日晚餐", "好分账"]],
    ["今天吃烤肉", "grill", "烤肉", 118, 4.6, "850 m", ["朋友局", "热闹", "肉量足"]],
    ["阿树生滚粥", "porridge", "粤式粥粉", 64, 4.3, "1.0 km", ["清爽", "暖胃", "聊天不吵"]],
    ["春日寿司吧", "sushi", "日料", 148, 4.6, "1.3 km", ["吧台", "拼盘", "安静"]],
    ["薄荷小馆", "thai", "东南亚菜", 92, 4.4, "1.7 km", ["酸辣", "开胃", "适合拍照"]],
    ["圆桌饺子铺", "dumpling", "家常菜", 58, 4.3, "2.0 km", ["饺子", "小菜", "预算友好"]],
    ["夜光甜品铺", "dessert", "甜品", 45, 4.5, "2.2 km", ["饭后", "奶油", "轻松收尾"]],
    ["街角披萨炉", "pizza", "披萨", 98, 4.4, "2.5 km", ["芝士", "分享", "不用纠结"]]
  ].map(toSeed),
  wujiaochang: [
    ["大学路番茄炉", "pizza", "意式披萨", 92, 4.5, "350 m", ["学生党", "分享披萨", "好拍"]],
    ["创智天地冒菜", "malatang", "川味冒菜", 66, 4.4, "480 m", ["麻辣", "快吃", "高性价比"]],
    ["政通路寿司台", "sushi", "日料", 138, 4.6, "620 m", ["刺身", "吧台", "安静"]],
    ["合生汇烤肉局", "grill", "韩式烤肉", 126, 4.7, "750 m", ["多人局", "泡菜", "热闹"]],
    ["五角场椰子鸡", "hainan", "海南菜", 108, 4.5, "900 m", ["清爽", "椰子鸡", "不辣"]],
    ["淞沪路牛肉饭", "burger", "快餐简餐", 49, 4.2, "1.1 km", ["很快", "工作日", "不贵"]],
    ["大学路咖啡饭", "cafe", "咖啡轻食", 72, 4.4, "1.3 km", ["轻食", "聊天", "下午转晚饭"]],
    ["黄兴路小面", "noodles", "重庆小面", 38, 4.5, "1.6 km", ["麻辣", "快决策", "人均友好"]],
    ["杨浦小笼局", "dimsum", "点心", 86, 4.4, "2.0 km", ["点心", "小笼", "适合多人"]]
  ].map(toSeed),
  jingansi: [
    ["愚园路小酒馆", "bistro", "小酒馆", 158, 4.7, "300 m", ["下班小聚", "氛围感", "分享菜"]],
    ["静安寺寿司研究所", "sushi", "日料", 188, 4.8, "420 m", ["刺身", "约会", "吧台"]],
    ["胶州路烤鸟", "yakitori", "烧鸟", 168, 4.6, "560 m", ["小酌", "炭火", "慢慢吃"]],
    ["南京西路轻食社", "cafe", "咖啡轻食", 82, 4.3, "700 m", ["不腻", "拍照", "轻松"]],
    ["常德路热锅", "hotpot", "重庆火锅", 148, 4.6, "950 m", ["热闹", "鸳鸯锅", "多人"]],
    ["巨鹿路意面房", "pizza", "意大利菜", 128, 4.5, "1.1 km", ["意面", "披萨", "约会感"]],
    ["延平路粉汤", "pho", "越南菜", 78, 4.4, "1.4 km", ["河粉", "清爽", "香草"]],
    ["威海路甜品局", "dessert", "甜品", 52, 4.5, "1.7 km", ["饭后", "蛋糕", "奶油"]],
    ["铜仁路饺子馆", "dumpling", "北方菜", 76, 4.3, "2.0 km", ["饺子", "家常", "预算友好"]]
  ].map(toSeed),
  gubei: [
    ["黄金城道寿司", "sushi", "日料", 176, 4.7, "360 m", ["安静", "刺身", "适合慢吃"]],
    ["古北韩食屋", "grill", "韩式烤肉", 132, 4.6, "520 m", ["烤肉", "泡菜", "朋友局"]],
    ["水城路越粉", "pho", "越南菜", 72, 4.4, "680 m", ["河粉", "清爽", "香草"]],
    ["红宝石甜品桌", "dessert", "甜品", 48, 4.5, "820 m", ["饭后", "蛋糕", "轻松"]],
    ["古北小火锅", "hotpot", "火锅", 128, 4.5, "1.0 km", ["鸳鸯锅", "不太吵", "多人"]],
    ["宋园路咖喱", "curry", "咖喱饭", 86, 4.4, "1.2 km", ["香料", "烤饼", "稳妥"]],
    ["伊犁路点心铺", "dimsum", "粤式点心", 98, 4.5, "1.5 km", ["点心", "清淡", "聊天"]],
    ["虹桥路小馆", "bistro", "融合菜", 142, 4.5, "1.8 km", ["分享菜", "小聚", "氛围"]]
  ].map(toSeed),
  pudong: [
    ["陆家嘴热汤饭", "porridge", "简餐", 58, 4.3, "380 m", ["办公区", "快吃", "暖胃"]],
    ["世纪大道烤肉局", "grill", "韩式烤肉", 126, 4.6, "600 m", ["下班", "热闹", "朋友局"]],
    ["浦电路咖喱档", "curry", "咖喱饭", 78, 4.4, "800 m", ["浓郁", "不贵", "好分账"]],
    ["商城路小笼桌", "dimsum", "本帮点心", 92, 4.5, "1.0 km", ["点心", "小笼", "多人"]],
    ["张杨路火锅社", "hotpot", "川渝火锅", 138, 4.7, "1.3 km", ["鸳鸯锅", "热闹", "夜宵"]],
    ["八佰伴寿司", "sushi", "日料", 158, 4.6, "1.5 km", ["刺身", "吧台", "安静"]],
    ["源深路牛堡", "burger", "美式简餐", 82, 4.3, "1.8 km", ["汉堡", "薯条", "可外带"]],
    ["塘桥番茄炉", "pizza", "意式披萨", 105, 4.4, "2.1 km", ["披萨", "芝士", "分享"]],
    ["浦东甜品站", "dessert", "甜品", 46, 4.4, "2.3 km", ["饭后", "奶油", "轻松"]]
  ].map(toSeed),
  anfulu: [
    ["安福路小酒馆", "bistro", "小酒馆", 156, 4.7, "260 m", ["散步后", "氛围", "分享菜"]],
    ["乌鲁木齐路贝果", "cafe", "咖啡轻食", 64, 4.5, "420 m", ["贝果", "拍照", "不腻"]],
    ["湖南路寿司角", "sushi", "日料", 168, 4.7, "580 m", ["刺身", "吧台", "安静"]],
    ["永福路意面房", "pizza", "意大利菜", 128, 4.5, "720 m", ["意面", "芝士", "约会感"]],
    ["武康路甜品局", "dessert", "甜品", 58, 4.6, "900 m", ["饭后", "蛋糕", "好拍"]],
    ["复兴西路泰味", "thai", "泰国菜", 112, 4.6, "1.1 km", ["酸辣", "咖喱", "开胃"]],
    ["衡山路烧鸟", "yakitori", "烧鸟", 158, 4.6, "1.4 km", ["小酌", "炭火", "慢慢吃"]],
    ["天平路饺子", "dumpling", "创意中餐", 86, 4.4, "1.7 km", ["煎饺", "小聚", "预算友好"]]
  ].map(toSeed)
};

function toSeed(value: (string | number | string[])[]): SeedRestaurant {
  const [name, slug, cuisine, price, rating, distance, tags] = value as [
    string,
    string,
    string,
    number,
    number,
    string,
    string[]
  ];

  return { name, slug, cuisine, price, rating, distance, tags };
}

function imageSet(slug: string) {
  return [1, 2, 3].map((index) => `/restaurants/${slug}-${index}.png`);
}

function enrichRestaurant(
  restaurant: SeedRestaurant,
  area: RestaurantAreaKey,
  index: number
): Restaurant {
  const images = imageSet(restaurant.slug);
  const tagsText = restaurant.tags.slice(0, 2).join("、");
  const bestFor = bestForPool[index % bestForPool.length];

  return {
    id: area === "demo" ? `r-${String(index + 1).padStart(3, "0")}` : `${area}-${String(index + 1).padStart(3, "0")}`,
    ...restaurant,
    image: images[0],
    images,
    area,
    areas: [area],
    description: `${restaurant.name} 是一家偏${tagsText}的${restaurant.cuisine}小馆，适合在朋友都拿不定主意时快速达成共识。`,
    recommendedReason: `${restaurant.cuisine}辨识度够，价格在 ¥${restaurant.price}/人左右，距离 ${restaurant.distance}，属于“发到群里不会冷场”的候选。`,
    bestFor,
    reviews: [
      {
        id: `${area}-${index}-review-1`,
        author: "饭局体验官",
        rating: Math.min(5, Number((restaurant.rating + 0.1).toFixed(1))),
        text: reviewPool[index % reviewPool.length]
      },
      {
        id: `${area}-${index}-review-2`,
        author: "选择困难小分队",
        rating: restaurant.rating,
        text: `体验版食评：${bestFor[0]}的时候很合适，${restaurant.tags[0]}这个点比较加分。`
      }
    ]
  };
}

export const restaurantPacks = Object.fromEntries(
  Object.entries(packSeeds).map(([area, seeds]) => [
    area,
    seeds.map((restaurant, index) =>
      enrichRestaurant(restaurant, area as RestaurantAreaKey, index)
    )
  ])
) as Record<RestaurantAreaKey, Restaurant[]>;

export const restaurants = restaurantPacks.demo;

export const allRestaurants = Object.values(restaurantPacks).flat();

export const cuisines = Array.from(
  new Set(allRestaurants.map((restaurant) => restaurant.cuisine))
).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

export function getRestaurantAreaKey(location?: string): RestaurantAreaKey {
  const normalized = (location ?? "").trim().toLowerCase();

  if (!normalized) return DEFAULT_RESTAURANT_AREA;
  if (normalized.includes("体验") || normalized.includes("demo")) return "demo";
  if (normalized.includes("五角场") || normalized.includes("wujiaochang")) return "wujiaochang";
  if (normalized.includes("静安") || normalized.includes("jing")) return "jingansi";
  if (normalized.includes("古北") || normalized.includes("gubei")) return "gubei";
  if (normalized.includes("浦东") || normalized.includes("pudong")) return "pudong";
  if (normalized.includes("安福") || normalized.includes("anfu")) return "anfulu";
  if (normalized.includes("当前") || normalized.includes("附近")) return "nearby";

  return DEFAULT_RESTAURANT_AREA;
}

export function getRestaurantAreaLabel(location?: string) {
  const trimmed = (location ?? "").trim();
  const key = getRestaurantAreaKey(location);
  const preset = locationOptions.find((option) => option.key === key);

  if (trimmed && !locationOptions.some((option) => option.label === trimmed)) {
    return trimmed;
  }

  return preset?.label ?? "当前位置附近";
}

export function getRestaurantsForLocation(location?: string) {
  const key = getRestaurantAreaKey(location);
  return restaurantPacks[key] ?? restaurantPacks[DEFAULT_RESTAURANT_AREA];
}

export function findRestaurantInLocation(restaurantId: string, location?: string) {
  const localRestaurant = getRestaurantsForLocation(location).find(
    (restaurant) => restaurant.id === restaurantId
  );

  return localRestaurant ?? allRestaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
}
