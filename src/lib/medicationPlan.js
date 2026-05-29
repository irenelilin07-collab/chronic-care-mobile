import { formatSpec } from "./medicine.js";

export const WEEKDAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

export const TIME_PRESETS = ["08:00", "12:00", "18:00", "20:00"];

export const RULE_TYPES = [
  { key: "daily", label: "每日" },
  { key: "weekly", label: "每周" },
  { key: "interval", label: "间隔" },
];

export function formatPlanPeriod(plan) {
  const start = plan.startDate?.replace(/-/g, ".") || "";
  if (plan.longTerm) return `${start} 起 · 长期服用`;
  const end = plan.endDate?.replace(/-/g, ".") || "";
  return end ? `${start} - ${end}` : `${start} 起`;
}

export function formatPlanRule(plan) {
  const times = (plan.times || []).join("、") || "未设时间";
  if (plan.ruleType === "weekly") {
    const days = (plan.weekdays || [])
      .sort((a, b) => a - b)
      .map((day) => WEEKDAYS.find((item) => item.value === day)?.label || day)
      .join("、");
    return days ? `每周${days} · ${times}` : `每周 · ${times}`;
  }
  if (plan.ruleType === "interval") {
    return `每 ${plan.intervalDays || 1} 天 · ${times}`;
  }
  return `每日 · ${times}`;
}

export function planMedicineLabel(plan, medicines = []) {
  if (plan.medicineId) {
    const linked = medicines.find((item) => item.id === plan.medicineId);
    if (linked) return linked.name;
  }
  return plan.medicineName || "未命名药品";
}

export function planMedicineMeta(plan, medicines = []) {
  if (!plan.medicineId) return plan.medicineName || "";
  const linked = medicines.find((item) => item.id === plan.medicineId);
  if (!linked) return plan.medicineName || "";
  return `${formatSpec(linked)} · 单次 ${linked.dose}`;
}

export function normalizePlanPayload(form, medicines = [], existingPlan = null) {
  if (existingPlan) {
    return {
      medicineId: existingPlan.medicineId ?? null,
      medicineName: existingPlan.medicineName || planMedicineLabel(existingPlan, medicines),
      ruleType: form.ruleType,
      times: [...new Set(form.times)].sort(),
      weekdays: form.ruleType === "weekly" ? [...form.weekdays].sort((a, b) => a - b) : [],
      intervalDays: form.ruleType === "interval" ? Number(form.intervalDays) : 1,
      startDate: form.startDate,
      endDate: form.longTerm ? null : form.endDate,
      longTerm: form.longTerm,
    };
  }

  const linked = medicines.find((item) => item.id === form.medicineId);
  return {
    medicineId: form.medicineId,
    medicineName: linked?.name || "",
    ruleType: form.ruleType,
    times: [...new Set(form.times)].sort(),
    weekdays: form.ruleType === "weekly" ? [...form.weekdays].sort((a, b) => a - b) : [],
    intervalDays: form.ruleType === "interval" ? Number(form.intervalDays) : 1,
    startDate: form.startDate,
    endDate: form.longTerm ? null : form.endDate,
    longTerm: form.longTerm,
  };
}

export function validatePlanForm(form, medicines = [], existingPlan = null) {
  if (!existingPlan) {
    const linked = medicines.find((item) => item.id === form.medicineId);
    if (!linked) {
      if (medicines.length === 0) return "请先在「我的药箱」添加药品";
      return "请选择药箱中的药品";
    }
  }
  if (!form.times.length) return "请至少添加一个服药时间";
  if (form.ruleType === "weekly" && !form.weekdays.length) {
    return "请选择每周服药日期";
  }
  if (form.ruleType === "interval" && Number(form.intervalDays) < 2) {
    return "间隔天数至少为 2 天";
  }
  if (!form.startDate) return "请填写开始日期";
  if (!form.longTerm && !form.endDate) return "请填写结束日期或勾选长期服用";
  if (!form.longTerm && form.endDate < form.startDate) {
    return "结束日期不能早于开始日期";
  }
  return "";
}

export function todaysDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}
