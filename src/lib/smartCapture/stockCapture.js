import { uid, formatDose } from "../medicine.js";
import { resolveCatalogFields } from "./catalogResolver.js";
import { isHighRiskMedicineName, resolveAliasName } from "./medicineAliases.js";
import { MEDICINE_CATALOG } from "../medicineCatalog.js";

const CHINESE_NUM_MAP = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  半: 0.5,
};

function parseChineseNumber(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return raw;
  if (raw === "半") return "0.5";
  if (raw.length === 2 && raw[0] === "十" && CHINESE_NUM_MAP[raw[1]]) {
    return String(10 + CHINESE_NUM_MAP[raw[1]]);
  }
  if (raw.length === 2 && CHINESE_NUM_MAP[raw[0]] && raw[1] === "十") {
    return String(CHINESE_NUM_MAP[raw[0]] * 10);
  }
  if (CHINESE_NUM_MAP[raw]) return String(CHINESE_NUM_MAP[raw]);
  return null;
}

export function extractMedicineNameFromStockText(text) {
  let best = "";
  let bestLen = 0;
  for (const item of MEDICINE_CATALOG) {
    if (text.includes(item.name) && item.name.length > bestLen) {
      best = item.name;
      bestLen = item.name.length;
    }
  }
  if (best) return best;

  for (const item of MEDICINE_CATALOG) {
    const shortName = item.name.replace(/(片|胶囊|缓释片|控释片|软胶囊|颗粒|分散片|肠溶片)$/u, "");
    if (shortName.length >= 2 && text.includes(shortName) && item.name.length > bestLen) {
      best = item.name;
      bestLen = item.name.length;
    }
  }
  if (best) return best;

  const aliased = resolveAliasName(text);
  for (const item of MEDICINE_CATALOG) {
    if (aliased.includes(item.name) && item.name.length > bestLen) {
      best = item.name;
      bestLen = item.name.length;
    }
  }
  return best;
}

export function isStockOnlySegment(text) {
  const segment = String(text || "").trim();
  if (!segment) return false;
  const hasStockCue = /库存|药箱|补货|入库|买了|购入|补了|加了|新增|补充/.test(segment);
  const hasPlanCue = /(?:每天|每日|每次|每早|每晚|一顿|吃|服用|服一次|饭前|饭后|餐前|餐后|早晚各|[:：]\d{1,2})/.test(
    segment
  );
  return hasStockCue && !hasPlanCue;
}

export function extractStockFromText(text) {
  const patterns = [
    /(?:库存|药箱)(?:里|中)?(?:加|补|增加|追加|入)?\s*([一二两三四五六七八九十\d.]+)\s*(片|粒|颗|袋|支)?/,
    /(?:加|补|增加|追加|买了|购入|补充|新增)\s*([一二两三四五六七八九十\d.]+)\s*(片|粒|颗|袋|支)/,
    /([一二两三四五六七八九十\d.]+)\s*(片|粒|颗|袋|支)(?:的)?(?:库存|药)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const amount = parseChineseNumber(match[1]) || match[1];
    const unit = match[2] || "片";
    if (amount) return { amount: String(amount), unit };
  }
  return { amount: "", unit: "" };
}

export function parseStockOnlySegment(segment) {
  const name = extractMedicineNameFromStockText(segment);
  const stockInfo = extractStockFromText(segment);
  const resolved = resolveCatalogFields({
    rawName: name || segment,
    dose: stockInfo.unit ? `1${stockInfo.unit}` : "",
  });
  const unit = stockInfo.unit || resolved.specUnit || "片";

  let confidence = 0;
  if (name) confidence += 0.45;
  if (stockInfo.amount) confidence += 0.35;
  if (segment.length <= 30) confidence += 0.1;

  return {
    id: uid("capture"),
    captureMode: "stock_only",
    rawName: resolved.rawName,
    name: resolved.name,
    dose: resolved.dose || formatDose("1", unit),
    specAmount: resolved.specAmount,
    specUnit: unit,
    spec: resolved.spec,
    times: [],
    frequency: "daily",
    weekdays: [],
    intervalDays: 1,
    mealHints: [],
    timeLabel: "",
    stockAmount: stockInfo.amount || "",
    confidence,
    source: "rule",
    catalogMatch: resolved.catalogMatch,
    needsExtraConfirm: isHighRiskMedicineName(resolved.name),
    warnings: [],
  };
}

export function tryStockOnlyParse(text) {
  const segments = String(text || "")
    .split(/[\n；;]+|(?<=[，,])|(?<=[。])/)
    .map((part) => part.replace(/^[，,、\s]+/, "").trim())
    .filter(Boolean);

  const medicines = segments
    .filter(isStockOnlySegment)
    .map(parseStockOnlySegment)
    .filter((item) => item.name || item.rawName);

  if (!medicines.length) return null;

  const confidence =
    medicines.reduce((sum, item) => sum + item.confidence, 0) / medicines.length;

  return { medicines, confidence, source: "rule-stock" };
}
