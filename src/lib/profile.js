export const GENDER_OPTIONS = [
  { key: "male", label: "男" },
  { key: "female", label: "女" },
  { key: "", label: "暂不填写" },
];

export const RELATION_OPTIONS = ["配偶", "子女", "父母", "亲友", "其他"];

function normalizeDrugAllergies(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  if (text === "无") return ["无"];
  return text
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeProfile(profile = {}) {
  return {
    nickname: profile.nickname ?? "用户",
    encouragement: profile.encouragement ?? "今天也要记得按时服药哦",
    gender: profile.gender ?? "",
    birthYear: profile.birthYear ?? "",
    chronicDiseases: Array.isArray(profile.chronicDiseases) ? profile.chronicDiseases : [],
    drugAllergies: normalizeDrugAllergies(profile.drugAllergies),
    emergencyContact: {
      name: profile.emergencyContact?.name ?? "",
      phone: profile.emergencyContact?.phone ?? "",
      relation: profile.emergencyContact?.relation ?? "",
    },
  };
}

export function profileAvatarInitial(profile) {
  const name = String(profile?.nickname || "用").trim();
  return name.slice(0, 1) || "用";
}

export function genderLabel(gender) {
  return GENDER_OPTIONS.find((item) => item.key === gender)?.label || "";
}

export function ageFromBirthYear(birthYear) {
  const year = Number(birthYear);
  if (!Number.isFinite(year) || year < 1900) return null;
  const age = new Date().getFullYear() - year;
  return age >= 0 && age <= 120 ? age : null;
}

export function summarizeBasicInfo(profile) {
  const parts = [];
  if (profile.nickname?.trim()) parts.push(profile.nickname.trim());
  const gender = genderLabel(profile.gender);
  if (gender && gender !== "暂不填写") parts.push(gender);
  const age = ageFromBirthYear(profile.birthYear);
  if (age !== null) parts.push(`${age} 岁`);
  return parts.length > 0 ? parts.join(" · ") : "点击填写";
}

export function summarizeChronicDiseases(profile) {
  const list = profile.chronicDiseases || [];
  if (list.length === 0) return "点击填写";
  if (list.length <= 2) return list.join("、");
  return `${list.slice(0, 2).join("、")} 等 ${list.length} 项`;
}

export function summarizeDrugAllergies(profile) {
  const list = profile.drugAllergies || [];
  if (list.length === 0) return "点击填写";
  if (list.length === 1 && list[0] === "无") return "无已知过敏";
  if (list.length <= 2) return list.join("、");
  return `${list.slice(0, 2).join("、")} 等 ${list.length} 项`;
}

export function summarizeEmergencyContact(profile) {
  const { name, phone, relation } = profile.emergencyContact || {};
  if (!name?.trim() && !phone?.trim()) return "点击填写";
  const parts = [name?.trim(), relation?.trim(), phone?.trim()].filter(Boolean);
  return parts.join(" · ");
}

export function summarizeProfileOverview(profile) {
  const parts = [];
  const diseases = summarizeChronicDiseases(profile);
  const allergies = summarizeDrugAllergies(profile);
  if (diseases !== "点击填写") parts.push(diseases);
  if (allergies !== "点击填写") parts.push(allergies);
  if (parts.length === 0) return "点击完善档案";
  return parts.join(" · ");
}
