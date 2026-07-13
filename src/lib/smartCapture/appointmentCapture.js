import { uid } from "../medicine.js";

const DISEASE_KEYWORDS = ["高血压", "糖尿病", "冠心病", "高血脂", "痛风", "甲状腺"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseDateFromText(text) {
  const isoMatch = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (isoMatch) {
    return toDateKey(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const monthDayMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[号日]?/);
  if (monthDayMatch) {
    const now = new Date();
    let year = now.getFullYear();
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    if (month < now.getMonth() + 1) year += 1;
    return toDateKey(year, month, day);
  }

  if (/下(?:个)?月/.test(text)) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return toDateKey(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 15);
  }

  return "";
}

export function parseHospitalFromText(text) {
  const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9]{2,30}医院)/);
  return match?.[1]?.trim() || "";
}

export function parseDiseaseFromText(text, profileHint = "") {
  for (const disease of DISEASE_KEYWORDS) {
    if (text.includes(disease)) return disease;
  }
  const fromProfile = profileHint.split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
  return fromProfile[0] || "";
}

export function tryParseAppointments(text, profileHint = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const hasAppointmentCue = /复诊|复查|门诊|挂号|去医院|随访|就诊/.test(trimmed);
  const date = parseDateFromText(trimmed);
  const hospital = parseHospitalFromText(trimmed);
  const disease = parseDiseaseFromText(trimmed, profileHint);

  if (!hasAppointmentCue && !date) return [];
  if (!date && !hospital && !disease) return [];

  let confidence = 0;
  if (date) confidence += 0.35;
  if (hospital) confidence += 0.35;
  if (disease) confidence += 0.2;
  if (hasAppointmentCue) confidence += 0.1;

  if (confidence < 0.5) return [];

  return [
    {
      id: uid("capture-appt"),
      disease: disease || "慢病复诊",
      date: date || "",
      hospital: hospital || "",
      doctor: "",
      linkUrl: "",
      confidence,
      source: "rule",
      warnings: [
        !date ? "未识别复诊日期，请补充" : null,
        !hospital ? "未识别医院名称，请补充" : null,
      ].filter(Boolean),
    },
  ];
}

export function normalizeLlmAppointments(rawList = []) {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((item) => ({
      id: uid("capture-appt"),
      disease: String(item.disease || item.targetDisease || "").trim(),
      date: String(item.date || "").trim(),
      hospital: String(item.hospital || "").trim(),
      doctor: String(item.doctor || "").trim(),
      linkUrl: String(item.linkUrl || "").trim(),
      confidence: Number(item.confidence) || 0.75,
      source: "llm",
      warnings: [
        !String(item.date || "").trim() ? "未识别复诊日期，请补充" : null,
        !String(item.hospital || "").trim() ? "未识别医院名称，请补充" : null,
      ].filter(Boolean),
    }))
    .filter((item) => item.disease || item.date || item.hospital);
}
