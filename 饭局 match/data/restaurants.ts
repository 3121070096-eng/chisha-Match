export type Restaurant = {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  price: number;
  rating: number;
  distance: string;
  tags: string[];
};

export const restaurants: Restaurant[] = [
  {
    id: "r-001",
    name: "青柠小馆",
    image:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=82",
    cuisine: "东南亚菜",
    price: 96,
    rating: 4.7,
    distance: "1.1 km",
    tags: ["酸辣开胃", "适合聊天", "招牌咖喱"]
  },
  {
    id: "r-002",
    name: "桥边火锅社",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=82",
    cuisine: "川渝火锅",
    price: 138,
    rating: 4.8,
    distance: "2.4 km",
    tags: ["热闹", "鸳鸯锅", "夜宵友好"]
  },
  {
    id: "r-003",
    name: "禾作寿司",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=82",
    cuisine: "日料",
    price: 168,
    rating: 4.6,
    distance: "1.8 km",
    tags: ["吧台位", "刺身", "安静"]
  },
  {
    id: "r-004",
    name: "番茄星球",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82",
    cuisine: "意大利菜",
    price: 112,
    rating: 4.5,
    distance: "900 m",
    tags: ["披萨", "约会感", "芝士浓郁"]
  },
  {
    id: "r-005",
    name: "牛气汉堡局",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=82",
    cuisine: "美式简餐",
    price: 78,
    rating: 4.4,
    distance: "1.5 km",
    tags: ["大份量", "薯条", "可外带"]
  },
  {
    id: "r-006",
    name: "椰风清补凉",
    image:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=82",
    cuisine: "海南菜",
    price: 89,
    rating: 4.3,
    distance: "2.0 km",
    tags: ["清爽", "鸡饭", "甜品"]
  },
  {
    id: "r-007",
    name: "月光烧鸟",
    image:
      "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=900&q=82",
    cuisine: "烧鸟",
    price: 152,
    rating: 4.7,
    distance: "3.1 km",
    tags: ["小酌", "炭火", "下班聚"]
  },
  {
    id: "r-008",
    name: "山城小面铺",
    image:
      "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=82",
    cuisine: "重庆小面",
    price: 42,
    rating: 4.6,
    distance: "650 m",
    tags: ["快吃", "麻辣", "高性价比"]
  },
  {
    id: "r-009",
    name: "阿嬷砂锅粥",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=82",
    cuisine: "潮汕菜",
    price: 118,
    rating: 4.5,
    distance: "2.8 km",
    tags: ["暖胃", "海鲜粥", "家庭感"]
  },
  {
    id: "r-010",
    name: "桃桃烤肉研究所",
    image:
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=82",
    cuisine: "韩式烤肉",
    price: 126,
    rating: 4.8,
    distance: "1.2 km",
    tags: ["烤肉", "泡菜", "朋友局"]
  },
  {
    id: "r-011",
    name: "薄荷越粉",
    image:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=900&q=82",
    cuisine: "越南菜",
    price: 68,
    rating: 4.4,
    distance: "1.9 km",
    tags: ["河粉", "轻食", "香草"]
  },
  {
    id: "r-012",
    name: "红油冒菜厂",
    image:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=82",
    cuisine: "川菜",
    price: 72,
    rating: 4.6,
    distance: "750 m",
    tags: ["下饭", "辣度可选", "多人拼"]
  },
  {
    id: "r-013",
    name: "海盐贝果屋",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=82",
    cuisine: "咖啡轻食",
    price: 58,
    rating: 4.3,
    distance: "500 m",
    tags: ["下午饭", "贝果", "拍照好看"]
  },
  {
    id: "r-014",
    name: "大口东北菜",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82",
    cuisine: "东北菜",
    price: 92,
    rating: 4.4,
    distance: "2.2 km",
    tags: ["锅包肉", "大桌", "量足"]
  },
  {
    id: "r-015",
    name: "南巷粤点",
    image:
      "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=82",
    cuisine: "粤菜",
    price: 132,
    rating: 4.7,
    distance: "1.6 km",
    tags: ["点心", "早茶", "清淡"]
  },
  {
    id: "r-016",
    name: "咖喱电台",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=82",
    cuisine: "印度菜",
    price: 105,
    rating: 4.5,
    distance: "2.6 km",
    tags: ["香料", "烤饼", "素食友好"]
  },
  {
    id: "r-017",
    name: "鱼生有你",
    image:
      "https://images.unsplash.com/photo-1615361200141-f45040f367be?auto=format&fit=crop&w=900&q=82",
    cuisine: "新加坡菜",
    price: 116,
    rating: 4.6,
    distance: "3.0 km",
    tags: ["叻沙", "海鲜", "微辣"]
  },
  {
    id: "r-018",
    name: "十分钟牛肉饭",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=82",
    cuisine: "快餐简餐",
    price: 49,
    rating: 4.2,
    distance: "380 m",
    tags: ["很快", "牛肉饭", "工作日"]
  },
  {
    id: "r-019",
    name: "白桃甜品局",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=82",
    cuisine: "甜品",
    price: 46,
    rating: 4.5,
    distance: "1.0 km",
    tags: ["饭后", "蛋糕", "奶油"]
  },
  {
    id: "r-020",
    name: "松露煎饺铺",
    image:
      "https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?auto=format&fit=crop&w=900&q=82",
    cuisine: "创意中餐",
    price: 84,
    rating: 4.4,
    distance: "1.4 km",
    tags: ["煎饺", "新奇", "小聚"]
  }
];

export const cuisines = Array.from(
  new Set(restaurants.map((restaurant) => restaurant.cuisine))
);
