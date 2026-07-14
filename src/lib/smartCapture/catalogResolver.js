import { findCatalogItem, MEDICINE_CATALOG } from "../medicineCatalog.js";
import { formatDose, formatSpec, parseDose } from "../medicine.js";
import {
  extractDoseFromText,
  extractLikelyMedicineName,
  looksLikeClockHourDose,
} from "./medicineName.js";
import { resolveAliasName } from "./medicineAliases.js";

function scoreNameMatch(query, catalogName) {
  const q = query.trim().toLowerCase();
  const name = catalogName.toLowerCase();
  if (!q) return 0;
  if (q === name) return 1;
  if (name.includes(q) || q.includes(name)) return 0.85;
  return 0;
}

export function matchMedicineFromCatalog(rawName) {
  const aliased = resolveAliasName(rawName);
  let best = null;
  let bestScore = 0;

  for (const item of MEDICINE_CATALOG) {
    const score = Math.max(scoreNameMatch(aliased, item.name), scoreNameMatch(rawName, item.name));
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 0.5) {
    return {
      name: aliased,
      specAmount: "",
      specUnit: "",
      spec: "",
      dose: "",
      catalogMatch: false,
      matchScore: bestScore,
    };
  }

  const parsed = parseDose(best.dose);
  return {
    name: best.name,
    specAmount: best.specAmount,
    specUnit: best.specUnit,
    spec: formatSpec(best),
    dose: formatDose(parsed.doseAmount, best.specUnit || parsed.doseUnit),
    catalogMatch: true,
    matchScore: bestScore,
  };
}

export function resolveCatalogFields(rawItem) {
  const original = String(rawItem.rawName || rawItem.name || "").trim();
  const cleaned = extractLikelyMedicineName(original) || original;
  const matched = matchMedicineFromCatalog(cleaned);
  const specAmount = rawItem.specAmount || matched.specAmount;
  const specUnit = rawItem.specUnit || matched.specUnit;
  const catalogItem = findCatalogItem(matched.name, specAmount, specUnit);

  const doseFromText = extractDoseFromText(original);
  const rawDose = String(rawItem.dose || "").trim();
  const dose =
    (looksLikeClockHourDose(rawDose) && doseFromText ? doseFromText : "") ||
    rawDose ||
    doseFromText ||
    (catalogItem?.dose
      ? catalogItem.dose
      : matched.dose || (specUnit ? `1${specUnit}` : "1片"));

  return {
    rawName: original || matched.name,
    // 目录命中用标准名，否则用清洗后的药名（不强制匹配目录）
    name: matched.catalogMatch ? matched.name : cleaned || matched.name,
    specAmount: specAmount || matched.specAmount,
    specUnit: specUnit || matched.specUnit,
    spec:
      specAmount && specUnit
        ? formatSpec({ specAmount, specUnit })
        : matched.spec || rawItem.spec || "",
    dose,
    catalogMatch: matched.catalogMatch || Boolean(catalogItem),
    matchScore: matched.matchScore,
  };
}
