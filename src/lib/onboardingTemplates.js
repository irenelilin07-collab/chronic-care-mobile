/** 新手引导：慢病选项与常用药模板 */

export const ONBOARDING_DISEASES = [
  { key: "hypertension", label: "高血压", diseases: ["高血压"] },
  { key: "diabetes", label: "糖尿病", diseases: ["糖尿病"] },
  { key: "hyperlipidemia", label: "高血脂", diseases: ["高血脂"] },
  { key: "coronary", label: "冠心病", diseases: ["冠心病"] },
  { key: "other", label: "其他", diseases: [] },
];

export const ONBOARDING_TIME_OPTIONS = [
  { key: "breakfast", label: "早餐后", time: "08:00", hint: "常见早餐用药时间" },
  { key: "lunch", label: "午餐后", time: "12:00", hint: "适合午间服用" },
  { key: "dinner", label: "晚餐后", time: "18:00", hint: "常见晚餐用药时间" },
  { key: "bedtime", label: "睡前", time: "21:00", hint: "适合睡前服用" },
];

const MEDICINE_TEMPLATES = {
  hypertension: [
    {
      key: "amlodipine",
      name: "氨氯地平片",
      specAmount: "5mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用降压药",
    },
    {
      key: "valsartan",
      name: "缬沙坦胶囊",
      specAmount: "80mg",
      specUnit: "粒",
      dose: "1粒",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用降压药",
    },
  ],
  diabetes: [
    {
      key: "metformin",
      name: "二甲双胍片",
      specAmount: "0.5g",
      specUnit: "片",
      dose: "1片",
      stock: 60,
      defaultTimes: ["08:00", "18:00"],
      hint: "常用降糖药 · 每日两次",
    },
    {
      key: "dapagliflozin",
      name: "达格列净片",
      specAmount: "10mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用降糖药",
    },
  ],
  hyperlipidemia: [
    {
      key: "atorvastatin",
      name: "阿托伐他汀钙片",
      specAmount: "20mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["21:00"],
      hint: "常用降脂药 · 建议睡前",
    },
  ],
  coronary: [
    {
      key: "aspirin",
      name: "阿司匹林肠溶片",
      specAmount: "100mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用心血管用药",
    },
    {
      key: "clopidogrel",
      name: "氯吡格雷片",
      specAmount: "75mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "抗血小板药",
    },
  ],
  other: [
    {
      key: "aspirin",
      name: "阿司匹林肠溶片",
      specAmount: "100mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用药示例",
    },
  ],
  default: [
    {
      key: "amlodipine",
      name: "氨氯地平片",
      specAmount: "5mg",
      specUnit: "片",
      dose: "1片",
      stock: 30,
      defaultTimes: ["08:00"],
      hint: "常用药示例",
    },
  ],
};

export function getMedicineTemplatesForDisease(diseaseKey) {
  if (!diseaseKey || diseaseKey === "skip") {
    return MEDICINE_TEMPLATES.default;
  }
  return MEDICINE_TEMPLATES[diseaseKey] || MEDICINE_TEMPLATES.default;
}

export function resolvePlanTimes(template, timeOptionKey) {
  const option = ONBOARDING_TIME_OPTIONS.find((item) => item.key === timeOptionKey);
  const selectedTime = option?.time || "08:00";

  if ((template.defaultTimes || []).length > 1) {
    return [...template.defaultTimes];
  }

  return [selectedTime];
}

export function defaultTimeOptionForTemplate(template) {
  const firstTime = template.defaultTimes?.[0] || "08:00";
  const matched = ONBOARDING_TIME_OPTIONS.find((item) => item.time === firstTime);
  if (matched) return matched.key;

  if (firstTime === "21:00") return "bedtime";
  if (firstTime === "18:00") return "dinner";
  if (firstTime === "12:00") return "lunch";
  return "breakfast";
}
