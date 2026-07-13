import { findCatalogItem, MEDICINE_CATALOG } from "../medicineCatalog.js";
import { formatDose, formatSpec, parseDose } from "../medicine.js";
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
  const matched = matchMedicineFromCatalog(rawItem.rawName || rawItem.name || "");
  const specAmount = rawItem.specAmount || matched.specAmount;
  const specUnit = rawItem.specUnit || matched.specUnit;
  const catalogItem = findCatalogItem(matched.name, specAmount, specUnit);

  const dose =
    rawItem.dose ||
    (catalogItem?.dose
      ? catalogItem.dose
      : matched.dose || (specUnit ? `1${specUnit}` : "1片"));

  return {
    rawName: rawItem.rawName || rawItem.name || matched.name,
    name: matched.name,
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
