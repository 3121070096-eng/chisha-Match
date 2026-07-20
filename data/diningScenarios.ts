import type { DiningScenario } from "@/types";

export type DiningScenarioOption = {
  value: DiningScenario;
  label: string;
  shortLabel: string;
  hint: string;
};

export const diningScenarioOptions: DiningScenarioOption[] = [
  { value: "friends", label: "朋友聚餐", shortLabel: "朋友局", hint: "热闹、好点菜、适合聊天" },
  { value: "casual", label: "随便吃吃", shortLabel: "随便吃", hint: "不费脑，附近有好选择就行" },
  { value: "date", label: "约会", shortLabel: "约会", hint: "氛围和环境也很重要" },
  { value: "colleagues", label: "同事聚餐", shortLabel: "同事局", hint: "方便聊天，照顾不同口味" },
  { value: "celebration", label: "生日 / 庆祝", shortLabel: "庆祝", hint: "值得专程去一趟" },
  { value: "solo", label: "一个人吃", shortLabel: "一个人", hint: "舒适、方便、一个人也合适" },
  { value: "late_night", label: "夜宵", shortLabel: "夜宵", hint: "晚一点也能吃得尽兴" },
  { value: "afternoon_tea", label: "下午茶", shortLabel: "下午茶", hint: "咖啡、甜品和轻食优先" }
];

export const defaultDiningScenario: DiningScenario = "friends";

export function getDiningScenarioOption(value?: string | null) {
  return diningScenarioOptions.find((item) => item.value === value) ?? diningScenarioOptions[0];
}
