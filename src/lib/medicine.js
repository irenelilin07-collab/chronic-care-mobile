export function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** 单次用药量（片/粒等） */
function doseUnitsPerTake(dose) {
  const raw = String(parseDose(dose).doseAmount || "").trim();
  if (!raw || /[^\d./]/.test(raw)) return 1;
  const num = parseFloat(raw.split("/")[0]);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

/** 根据用药计划估算每日消耗量（含单次剂量） */
export function estimateDailyUseFromPlans(medicine, plans = []) {
  const medicineId = typeof medicine === "string" ? medicine : medicine?.id;
  if (!medicineId) return 0;
  const perTake =
    typeof medicine === "object" && medicine ? doseUnitsPerTake(medicine.dose) : 1;

  return plans.reduce((acc, plan) => {
    if (plan.medicineId !== medicineId) return acc;
    const times = (plan.times || []).length;
    if (times === 0) return acc;
    if (plan.ruleType === "weekly") {
      return acc + ((plan.weekdays || []).length / 7) * times * perTake;
    }
    if (plan.ruleType === "interval") {
      const every = Math.max(1, Number(plan.intervalDays) || 1);
      return acc + (times / every) * perTake;
    }
    return acc + times * perTake;
  }, 0);
}

export function stockDaysLeft(medicine, plans = []) {
  const daily = estimateDailyUseFromPlans(medicine, plans);
  if (daily <= 0) return null;
  return Number(medicine.stock) / daily;
}

export function formatStockDaysLabel(medicine, plans = []) {
  const days = stockDaysLeft(medicine, plans);
  if (days === null) return "未关联用药计划";
  if (days <= 0) return "库存已用完";
  const rounded = days >= 10 ? Math.round(days) : Number(days.toFixed(1));
  return `约可用 ${rounded} 天`;
}

/** @returns {"ok"|"mid"|"low"} */
export function stockLevel(medicine, plans = []) {
  const daily = estimateDailyUseFromPlans(medicine, plans);
  if (daily > 0) {
    const daysLeft = Number(medicine.stock) / daily;
    if (daysLeft <= 3) return "low";
    if (daysLeft < 7) return "mid";
    return "ok";
  }
  const max = Math.max(Number(medicine.initialStock) || 0, 1);
  const ratio = Number(medicine.stock) / max;
  if (ratio <= 0.2) return "low";
  if (ratio <= 0.5) return "mid";
  return "ok";
}

export function stockLabel(medicine, plans = []) {
  return formatStockDaysLabel(medicine, plans);
}

export function unitFromDose(dose) {
  const match = String(dose || "").match(/[\u4e00-\u9fa5a-zA-Zμ]+$/);
  return match ? match[0] : "份";
}

export function parseDose(dose = "") {
  const text = String(dose).trim();
  const match = text.match(/^([\d./]+)\s*(.*)$/);
  if (match && match[2]) {
    return { doseAmount: match[1], doseUnit: match[2] };
  }
  if (match && !match[2]) {
    return { doseAmount: match[1], doseUnit: "" };
  }
  return { doseAmount: text, doseUnit: "" };
}

export function formatDose(amount, unit) {
  const value = String(amount ?? "").trim();
  const u = String(unit ?? "").trim();
  if (!value) return "";
  return u ? `${value}${u}` : value;
}

export function stockUnitOf(medicine) {
  if (medicine.stockUnit) return medicine.stockUnit;
  const spec = normalizeMedicineSpec(medicine);
  if (spec.specUnit) return spec.specUnit;
  return unitFromDose(medicine.dose);
}

export function parseSpecString(spec = "") {
  const text = String(spec).trim();
  const slash = text.indexOf("/");
  if (slash > 0) {
    return {
      specAmount: text.slice(0, slash).trim(),
      specUnit: text.slice(slash + 1).trim(),
    };
  }
  return { specAmount: text, specUnit: "" };
}

export function formatSpec(medicine) {
  const amount = medicine.specAmount ?? parseSpecString(medicine.spec).specAmount;
  const unit = medicine.specUnit ?? parseSpecString(medicine.spec).specUnit;
  if (amount && unit) return `${amount}/${unit}`;
  return amount || medicine.spec || "";
}

export function normalizeMedicineSpec(medicine) {
  if (medicine.specAmount) {
    return {
      specAmount: medicine.specAmount,
      specUnit: medicine.specUnit || "",
      spec: formatSpec(medicine),
    };
  }
  const parsed = parseSpecString(medicine.spec);
  return {
    specAmount: parsed.specAmount,
    specUnit: parsed.specUnit,
    spec: formatSpec({ specAmount: parsed.specAmount, specUnit: parsed.specUnit }),
  };
}
