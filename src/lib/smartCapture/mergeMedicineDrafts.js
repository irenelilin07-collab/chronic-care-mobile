import { buildTimeLabel } from "./mealTimeMap.js";

function draftNameKey(item) {
  return String(item.name || item.rawName || "").trim();
}

function pickStockAmount(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return String(num);
  }
  for (const value of values) {
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function sortDraftsForMerge(items) {
  return [...items].sort((a, b) => {
    const aStock = a.captureMode === "stock_only" ? 1 : 0;
    const bStock = b.captureMode === "stock_only" ? 1 : 0;
    return aStock - bStock;
  });
}

function mergePlanFields(base, extra) {
  const times = [...new Set([...(base.times || []), ...(extra.times || [])])].sort();
  const mealHints = [...new Set([...(base.mealHints || []), ...(extra.mealHints || [])])];
  const merged = {
    ...base,
    times: times.length ? times : base.times,
    mealHints,
    dose: base.dose || extra.dose,
    specUnit: base.specUnit || extra.specUnit,
    stockAmount: pickStockAmount(base.stockAmount, extra.stockAmount),
    warnings: [...new Set([...(base.warnings || []), ...(extra.warnings || [])])],
    confidence: Math.max(Number(base.confidence) || 0, Number(extra.confidence) || 0),
    timeLabel: buildTimeLabel({
      frequency: base.frequency,
      times: times.length ? times : base.times,
      mealHints,
    }),
    captureMode: "plan",
  };
  return merged;
}

export function mergeTwoMedicineDrafts(primary, secondary) {
  const a = primary.captureMode === "stock_only" ? secondary : primary;
  const b = primary.captureMode === "stock_only" ? primary : secondary;

  if (a.captureMode === "stock_only" && b.captureMode === "stock_only") {
    return {
      ...a,
      stockAmount: pickStockAmount(a.stockAmount, b.stockAmount),
      specUnit: a.specUnit || b.specUnit,
      confidence: Math.max(Number(a.confidence) || 0, Number(b.confidence) || 0),
    };
  }

  if (a.captureMode === "stock_only") {
    return {
      ...b,
      captureMode: "plan",
      stockAmount: pickStockAmount(b.stockAmount, a.stockAmount),
      specUnit: b.specUnit || a.specUnit,
    };
  }

  if (b.captureMode === "stock_only") {
    return mergePlanFields(a, {
      ...b,
      stockAmount: pickStockAmount(a.stockAmount, b.stockAmount),
    });
  }

  return mergePlanFields(a, b);
}

export function mergeMedicineDrafts(drafts = []) {
  const groups = new Map();

  for (const item of drafts) {
    const key = draftNameKey(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const unnamed = drafts.filter((item) => !draftNameKey(item));
  const merged = [];

  for (const items of groups.values()) {
    if (items.length === 1) {
      merged.push(items[0]);
      continue;
    }
    const sorted = sortDraftsForMerge(items);
    let result = sorted[0];
    for (let index = 1; index < sorted.length; index += 1) {
      result = mergeTwoMedicineDrafts(result, sorted[index]);
    }
    merged.push(result);
  }

  return [...merged, ...unnamed];
}
