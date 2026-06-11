export interface FlowTemplate {
  id: string;
  label: string;
  steps: string[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "shinsotsu",
    label: "新卒テンプレ",
    steps: ["ES", "適性検査", "一次面接", "二次面接", "最終面接", "内定"],
  },
  {
    id: "tenshoku",
    label: "転職テンプレ",
    steps: ["書類選考", "一次面接", "二次面接", "最終面接", "オファー"],
  },
  {
    id: "gaishi",
    label: "外資テンプレ",
    steps: ["Resume", "Webテスト", "ケース面接", "ジョブ面接", "オファー"],
  },
  {
    id: "intern",
    label: "インターン直結",
    steps: ["ES", "面接", "インターン", "早期選考", "内定"],
  },
  {
    id: "empty",
    label: "空（自分で作る）",
    steps: [],
  },
];
