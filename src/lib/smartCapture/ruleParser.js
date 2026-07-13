import { uid } from "../medicine.js";
import { resolveCatalogFields } from "./catalogResolver.js";
import { buildTimeLabel, mealInfoFromText, MEAL_TIME_MAP } from "./mealTimeMap.js";
import { isHighRiskMedicineName, resolveAliasName } from "./medicineAliases.js";
import { MEDICINE_CATALOG } from "../medicineCatalog.js";
import { isStockOnlySegment, parseStockOnlySegment } from "./stockCapture.js";

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

const WEEKDAY_MAP = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
};

const RULE_CONFIDENCE_THRESHOLD = 0.8;

function splitSegments(text) {
  return String(text || "")
    .split(/[\n；;]+|(?<=[，,])|(?<=[。])/)
    .map((part) => part.replace(/^[，,、\s]+/, "").trim())
    .filter(Boolean);
}

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

function extractDose(text) {
  const match = text.match(
    /(?:每次|每次服用|服用|吃|服)?\s*([一二两三四五六七八九十半\d.]+)\s*(片|粒|颗|袋|支|喷|贴|毫克|mg)?/
  );
  if (!match) return "";
  const amount = parseChineseNumber(match[1]) || match[1];
  const unit = match[2] || "片";
  return `${amount}${unit}`;
}

function extractExplicitTimes(text) {
  const times = [];
  const patterns = [
    /(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/g,
    /(\d{1,2})\s*点半/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const hour = Number(match[1]);
      let minute = 0;
      if (pattern.source.includes("点半")) {
        minute = 30;
      } else if (match[2] != null && match[2] !== "") {
        minute = Number(match[2]);
      }
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      }
    }
  }

  return [...new Set(times)];
}

function extractMedicineName(text) {
  let best = "";
  let bestLen = 0;
  for (const item of MEDICINE_CATALOG) {
    if (text.includes(item.name) && item.name.length > bestLen) {
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

function extractFrequency(text) {
  if (/每周|每个周/.test(text)) {
    const weekdays = [];
    const matches = text.matchAll(/周([一二三四五六日天])/g);
    for (const match of matches) {
      const day = WEEKDAY_MAP[match[1]];
      if (day && !weekdays.includes(day)) weekdays.push(day);
    }
    return { frequency: "weekly", weekdays, intervalDays: 1 };
  }

  if (/每隔?\s*([一二两三四五六七八九十\d]+)\s*天/.test(text)) {
    const match = text.match(/每隔?\s*([一二两三四五六七八九十\d]+)\s*天/);
    const every = parseChineseNumber(match?.[1]) || match?.[1] || "2";
    return { frequency: "interval", weekdays: [], intervalDays: Math.max(2, Number(every) || 2) };
  }

  return { frequency: "daily", weekdays: [], intervalDays: 1 };
}

function extractTimes(text) {
  const times = [];
  const mealHints = [];

  if (/早晚各|早晚一次|早上和晚上|早一晚一/.test(text)) {
    times.push("08:30", "20:00");
    mealHints.push("after_breakfast", "after_dinner");
    return { times: [...new Set(times)], mealHints };
  }

  const mealMatches = [...text.matchAll(/(早饭前|早餐后|早饭后|早餐前|午饭前|午餐后|午饭后|午餐前|晚饭前|晚餐后|晚饭后|晚餐前|睡前|早上|中午|晚上)/g)];
  for (const match of mealMatches) {
    const info = mealInfoFromText(match[0]);
    if (info) {
      times.push(info.time);
      mealHints.push(info.mealHint);
    }
  }

  if (times.length === 0) {
    times.push(...extractExplicitTimes(text));
  }

  if (times.length === 0 && /每天|每日|一天一次|一日一次/.test(text)) {
    const meal = mealInfoFromText(text);
    if (meal) {
      times.push(meal.time);
      mealHints.push(meal.mealHint);
    } else {
      times.push("08:00");
    }
  }

  return { times: [...new Set(times)], mealHints: [...new Set(mealHints)] };
}

function parseSegment(segment) {
  if (isStockOnlySegment(segment)) {
    return parseStockOnlySegment(segment);
  }

  const rawName = extractMedicineName(segment) || segment.replace(/每天|每日|吃|服用|一次|片|粒/g, "").trim();
  const dose = extractDose(segment);
  const { frequency, weekdays, intervalDays } = extractFrequency(segment);
  const { times, mealHints } = extractTimes(segment);

  let confidence = 0;
  if (extractMedicineName(segment)) confidence += 0.4;
  if (dose) confidence += 0.2;
  if (times.length > 0) confidence += 0.3;
  if (segment.length <= 40) confidence += 0.1;

  const resolved = resolveCatalogFields({ rawName, dose });
  return {
    id: uid("capture"),
    rawName: resolved.rawName,
    name: resolved.name,
    dose: resolved.dose || dose || "1片",
    specAmount: resolved.specAmount,
    specUnit: resolved.specUnit,
    spec: resolved.spec,
    times: times.length ? times : ["08:00"],
    frequency,
    weekdays,
    intervalDays,
    mealHints,
    timeLabel: buildTimeLabel({
      frequency,
      times: times.length ? times : ["08:00"],
      mealHints,
    }),
    confidence,
    source: "rule",
    catalogMatch: resolved.catalogMatch,
    needsExtraConfirm: isHighRiskMedicineName(resolved.name),
    warnings: resolved.catalogMatch ? [] : ["药名未完全匹配目录，请确认"],
  };
}

export function tryRuleParse(text) {
  const segments = splitSegments(text);
  if (!segments.length) return null;

  const medicines = segments.map(parseSegment).filter((item) => item.name || item.rawName);
  if (!medicines.length) return null;

  const confidence =
    medicines.reduce((sum, item) => sum + item.confidence, 0) / medicines.length;

  return {
    medicines,
    confidence,
    source: "rule",
  };
}

export function isRuleParseConfident(result) {
  return Boolean(result && result.confidence >= RULE_CONFIDENCE_THRESHOLD);
}

export function normalizeLlmCaptureResult(raw) {
  const medicines = Array.isArray(raw?.medicines) ? raw.medicines : [];
  if (!medicines.length) {
    return {
      clarify: raw?.clarify || "未能识别药品信息，请补充药名和服药时间。",
      medicines: [],
      confidence: 0,
      source: "llm",
    };
  }

  const normalized = medicines.map((item) => {
    const resolved = resolveCatalogFields(item);
    const frequency = ["daily", "weekly", "interval"].includes(item.frequency)
      ? item.frequency
      : "daily";
    const mealHint = item.mealHint || "";
    const mealHints = mealHint ? [mealHint] : [];
    const mealEntry = mealHint
      ? Object.values(MEAL_TIME_MAP).find((entry) => entry.mealHint === mealHint)
      : null;
    const times =
      Array.isArray(item.times) && item.times.length
        ? item.times.map((time) => String(time).trim()).filter(Boolean)
        : mealEntry
          ? [mealEntry.time]
          : ["08:00"];

    return {
      id: uid("capture"),
      captureMode: item.captureMode === "stock_only" ? "stock_only" : "plan",
      rawName: resolved.rawName,
      name: resolved.name,
      dose: resolved.dose || item.dose || "1片",
      specAmount: resolved.specAmount,
      specUnit: resolved.specUnit || item.specUnit,
      spec: resolved.spec,
      times: item.captureMode === "stock_only" ? [] : times,
      frequency,
      weekdays: Array.isArray(item.weekdays) ? item.weekdays : [],
      intervalDays: Number(item.intervalDays) > 1 ? Number(item.intervalDays) : 2,
      mealHints,
      timeLabel:
        item.captureMode === "stock_only"
          ? ""
          : buildTimeLabel({
              frequency,
              times,
              mealHints,
            }),
      stockAmount: item.captureMode === "stock_only" ? String(item.stockAmount || "") : "",
      confidence: Number(item.confidence) || 0.75,
      source: "llm",
      catalogMatch: resolved.catalogMatch,
      needsExtraConfirm: isHighRiskMedicineName(resolved.name),
      warnings: resolved.catalogMatch ? [] : ["药名未完全匹配目录，请确认"],
    };
  });

  return {
    medicines: normalized,
    clarify: raw?.clarify || "",
    confidence:
      normalized.reduce((sum, item) => sum + item.confidence, 0) / normalized.length,
    source: "llm",
  };
}
