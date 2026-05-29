/** 常见慢病用药目录（本地推荐库，支持搜索匹配） */
const RAW_CATALOG = [
  { name: "阿司匹林肠溶片", spec: "100mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "二甲双胍片", spec: "0.5g/片", dose: "1片", dailyFrequency: 3 },
  { name: "二甲双胍缓释片", spec: "0.5g/片", dose: "1片", dailyFrequency: 2 },
  { name: "格列美脲片", spec: "2mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "阿卡波糖片", spec: "50mg/片", dose: "1片", dailyFrequency: 3 },
  { name: "缬沙坦胶囊", spec: "80mg/粒", dose: "1粒", dailyFrequency: 1 },
  { name: "氨氯地平片", spec: "5mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "硝苯地平控释片", spec: "30mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "美托洛尔缓释片", spec: "47.5mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "阿托伐他汀钙片", spec: "20mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "瑞舒伐他汀钙片", spec: "10mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "氯吡格雷片", spec: "75mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "华法林钠片", spec: "3mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "单硝酸异山梨酯缓释片", spec: "40mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "呋塞米片", spec: "20mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "螺内酯片", spec: "20mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "奥美拉唑肠溶胶囊", spec: "20mg/粒", dose: "1粒", dailyFrequency: 1 },
  { name: "雷贝拉唑钠肠溶片", spec: "10mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "左甲状腺素钠片", spec: "50μg/片", dose: "1片", dailyFrequency: 1 },
  { name: "碳酸钙D3片", spec: "600mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "非布司他片", spec: "40mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "别嘌醇片", spec: "100mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "甲钴胺片", spec: "0.5mg/片", dose: "1片", dailyFrequency: 3 },
  { name: "依帕司他片", spec: "50mg/片", dose: "1片", dailyFrequency: 3 },
  { name: "沙库巴曲缬沙坦钠片", spec: "100mg/片", dose: "1片", dailyFrequency: 2 },
  { name: "达格列净片", spec: "10mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "利格列汀片", spec: "5mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "西格列汀片", spec: "100mg/片", dose: "1片", dailyFrequency: 1 },
  { name: "胰岛素甘精胰岛素", spec: "300U/支", dose: "按医嘱", dailyFrequency: 1 },
  { name: "门冬胰岛素", spec: "300U/支", dose: "按医嘱", dailyFrequency: 3 },
];

function toCatalogItem(item) {
  const slash = item.spec.indexOf("/");
  const specAmount = slash > 0 ? item.spec.slice(0, slash) : item.spec;
  const specUnit = slash > 0 ? item.spec.slice(slash + 1) : "";
  return { ...item, specAmount, specUnit };
}

export const MEDICINE_CATALOG = RAW_CATALOG.map(toCatalogItem);

export const COMMON_SPEC_UNITS = ["片", "粒", "胶囊", "支", "袋", "瓶", "贴", "喷"];

function filterByName(list, medicineName) {
  if (!medicineName) return list;
  return list.filter((item) => item.name === medicineName);
}

export function searchMedicineNames(query) {
  const q = query.trim().toLowerCase();
  const names = [
    ...new Set(
      MEDICINE_CATALOG.filter((item) => !q || item.name.toLowerCase().includes(q)).map(
        (item) => item.name
      )
    ),
  ];
  return names.slice(0, 8);
}

export function searchMedicineSpecAmounts(query, medicineName = "") {
  let list = filterByName(MEDICINE_CATALOG, medicineName);
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((item) => item.specAmount.toLowerCase().includes(q));
  }
  const seen = new Set();
  return list
    .filter((item) => {
      if (seen.has(item.specAmount)) return false;
      seen.add(item.specAmount);
      return true;
    })
    .slice(0, 8);
}

export function searchMedicineSpecUnits(query, medicineName = "", specAmount = "") {
  let list = filterByName(MEDICINE_CATALOG, medicineName);
  if (specAmount) {
    list = list.filter((item) => item.specAmount === specAmount);
  }
  const q = query.trim().toLowerCase();
  const fromCatalog = list
    .map((item) => item.specUnit)
    .filter(Boolean)
    .filter((unit) => !q || unit.toLowerCase().includes(q));
  const merged = [...new Set([...fromCatalog, ...COMMON_SPEC_UNITS])].filter(
    (unit) => !q || unit.toLowerCase().includes(q)
  );
  return merged.slice(0, 8);
}

export function findCatalogItem(medicineName, specAmount, specUnit) {
  return MEDICINE_CATALOG.find(
    (item) =>
      item.name === medicineName &&
      item.specAmount === specAmount &&
      (!specUnit || item.specUnit === specUnit)
  );
}

export function catalogKey(item) {
  return `${item.name}__${item.specAmount}__${item.specUnit}`;
}
