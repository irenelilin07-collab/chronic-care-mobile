export const COMMON_ALLERGIES = [
  "青霉素",
  "头孢类抗生素",
  "磺胺类药物",
  "阿司匹林",
  "布洛芬",
  "对乙酰氨基酚",
  "碘造影剂",
  "麻醉药物",
  "胰岛素",
  "其他",
];

export function searchAllergies(query = "") {
  const q = query.trim().toLowerCase();
  return COMMON_ALLERGIES.filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 8);
}
