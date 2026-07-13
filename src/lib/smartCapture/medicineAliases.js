/** 常见商品名 / 俗称 → 标准药名 */
export const MEDICINE_ALIASES = {
  络活喜: "氨氯地平片",
  拜新同: "硝苯地平控释片",
  格华止: "二甲双胍片",
  拜唐苹: "阿卡波糖片",
  立普妥: "阿托伐他汀钙片",
  可定: "瑞舒伐他汀钙片",
  波立维: "氯吡格雷片",
  降压药: "氨氯地平片",
  降糖药: "二甲双胍片",
  他汀: "阿托伐他汀钙片",
};

export const HIGH_RISK_MEDICINE_KEYWORDS = ["胰岛素", "华法林", "门冬胰岛素", "甘精胰岛素"];

export function resolveAliasName(rawName) {
  const text = String(rawName || "").trim();
  if (!text) return text;
  if (MEDICINE_ALIASES[text]) return MEDICINE_ALIASES[text];
  for (const [alias, name] of Object.entries(MEDICINE_ALIASES)) {
    if (text.includes(alias)) return name;
  }
  return text;
}

export function isHighRiskMedicineName(name) {
  const text = String(name || "");
  return HIGH_RISK_MEDICINE_KEYWORDS.some((keyword) => text.includes(keyword));
}
