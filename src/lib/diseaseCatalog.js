export const COMMON_DISEASES = [
  "高血压",
  "糖尿病",
  "高血脂",
  "冠心病",
  "慢阻肺",
  "甲状腺疾病",
  "痛风",
  "慢性肾病",
  "类风湿关节炎",
  "其他",
];

export function searchDiseases(query = "") {
  const q = query.trim().toLowerCase();
  return COMMON_DISEASES.filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 8);
}
