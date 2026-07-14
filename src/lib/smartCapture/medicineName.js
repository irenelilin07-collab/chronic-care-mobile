/** 从识别出的脏药名里尽量抽出真正的药品名（去掉时间、剂量等） */

const DOSE_PATTERNS = [
  /(?:每次|每次服用|服用|吃|服)\s*([一二两三四五六七八九十半\d.]+)\s*(片|粒|颗|袋|支|喷|贴|毫克|mg)/i,
  /([一二两三四五六七八九十半\d.]+)\s*(片|粒|颗|袋|支|喷|贴|毫克|mg)/i,
];

const NOISE_PATTERNS = [
  /每天|每日|一日|一天|每周|每隔一天/g,
  /早[上晨]?|中午|晚[上间]?|凌晨|上午|下午/g,
  /早饭[前后]?|早餐[前后]?|午饭[前后]?|午餐[前后]?|晚饭[前后]?|晚餐[前后]?|睡前/g,
  /\d{1,2}\s*[:：点时]\s*\d{0,2}\s*分?/g,
  /\d{1,2}\s*点半/g,
  /吃|服用|服下|一次|每次|各/g,
  /\d+(\.\d+)?\s*(片|粒|颗|袋|支|喷|贴|毫克|mg|毫升|ml)/gi,
  /[一二两三四五六七八九十半]+\s*(片|粒|颗|袋|支)/g,
];

export function cleanMedicineNameNoise(rawName) {
  let text = String(rawName || "").trim();
  if (!text) return "";

  for (const pattern of NOISE_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  return text.replace(/\s+/g, "").replace(/[，,。.、；;：:\-_/]+/g, "").trim();
}

export function extractLikelyMedicineName(rawName) {
  let cleaned = cleanMedicineNameNoise(rawName).replace(/^\d+/, "");
  if (!cleaned) return "";

  const withForm = cleaned.match(
    /([\u4e00-\u9fff]{2,}(?:丸|片|胶囊|颗粒|分散片|缓释片|肠溶片|口服液|滴丸)?)/g
  );
  if (withForm?.length) {
    return withForm.sort((a, b) => b.length - a.length)[0];
  }

  const runs = cleaned.match(/[\u4e00-\u9fff]{2,}/g);
  if (runs?.length) {
    return runs.sort((a, b) => b.length - a.length)[0];
  }

  return cleaned;
}

/** 从整句中抽剂量；要求带单位，避免误吃「9点」里的 9 */
export function extractDoseFromText(text) {
  const source = String(text || "");
  for (const pattern of DOSE_PATTERNS) {
    const match = source.match(pattern);
    if (!match) continue;
    return `${match[1]}${match[2]}`;
  }
  return "";
}

export function looksLikeClockHourDose(dose) {
  const match = String(dose || "").trim().match(/^(\d{1,2})(片|粒|颗)?$/);
  if (!match) return false;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 6 && n <= 23;
}
