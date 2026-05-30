import { uid } from "./medicine.js";

export const MOOD_OPTIONS = [
  { score: 1, emoji: "😞", label: "很低落" },
  { score: 2, emoji: "😐", label: "一般" },
  { score: 3, emoji: "🙂", label: "还可以" },
  { score: 4, emoji: "😊", label: "不错" },
  { score: 5, emoji: "😄", label: "很好" },
];

export const SYMPTOM_OPTIONS = [
  "恶心",
  "呕吐",
  "头晕",
  "乏力",
  "皮疹",
  "瘙痒",
  "心悸",
  "腹泻",
  "胃部不适",
  "其他",
];

export const SEVERITY_OPTIONS = [
  { key: "mild", label: "轻" },
  { key: "moderate", label: "中" },
  { key: "severe", label: "重" },
];

export const ATTRIBUTION_OPTIONS = [
  { key: "uncertain", label: "不确定来源" },
  { key: "possible", label: "可能相关" },
  { key: "related", label: "明确相关" },
];

export function defaultDateTimeLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function buildEmptyJournalForm() {
  return {
    moodScore: null,
    note: "",
    occurredAt: defaultDateTimeLocal(),
    symptoms: [],
    severity: "mild",
    attributionType: "uncertain",
    relatedMedicineIds: [],
    adverseRemark: "",
  };
}

function emptyAdverseReaction() {
  return {
    enabled: false,
    occurredAt: new Date().toISOString(),
    symptoms: [],
    severity: "mild",
    attributionType: "uncertain",
    relatedMedicineIds: [],
    remark: "",
  };
}

export function normalizeJournalEntry(entry) {
  const symptoms = Array.isArray(entry?.adverseReaction?.symptoms)
    ? entry.adverseReaction.symptoms.filter(Boolean)
    : [];

  const adverseEnabled = Boolean(entry?.adverseReaction?.enabled ?? symptoms.length > 0);

  return {
    id: entry?.id || uid("journal"),
    dateKey: entry?.dateKey || "",
    entryType: entry?.entryType || inferEntryType(entry),
    createdAt: entry?.createdAt || new Date().toISOString(),
    moodScore: entry?.moodScore ? Number(entry.moodScore) : null,
    note: String(entry?.note ?? "").trim(),
    adverseReaction: {
      enabled: adverseEnabled,
      occurredAt: entry?.adverseReaction?.occurredAt || new Date().toISOString(),
      symptoms,
      severity: entry?.adverseReaction?.severity || "mild",
      attributionType: entry?.adverseReaction?.attributionType || "uncertain",
      relatedMedicineIds: Array.isArray(entry?.adverseReaction?.relatedMedicineIds)
        ? entry.adverseReaction.relatedMedicineIds
        : [],
      remark: String(entry?.adverseReaction?.remark ?? "").trim(),
    },
  };
}

function inferEntryType(entry) {
  if (entry?.entryType) return entry.entryType;
  const hasMood = Boolean(entry?.moodScore);
  const hasNote = Boolean(String(entry?.note ?? "").trim());
  const hasAdverse = Boolean(entry?.adverseReaction?.enabled);
  if (hasAdverse) return "adverse";
  if (hasNote) return "note";
  if (hasMood) return "mood";
  return "mixed";
}

export function normalizeJournalEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map(normalizeJournalEntry);
}

export function validateMoodModule(moodScore) {
  if (!moodScore) return "请选择今天的心情";
  return null;
}

export function validateNoteModule(note) {
  if (!String(note ?? "").trim()) return "请填写今天的整体感受";
  return null;
}

export function validateAdverseModule(form) {
  if (form.symptoms.length === 0 && !form.adverseRemark.trim()) {
    return "请至少选择一个症状，或填写不良反应备注";
  }
  return null;
}

export function createMoodEntry(moodScore, dateKey) {
  return normalizeJournalEntry({
    id: uid("journal"),
    dateKey,
    entryType: "mood",
    createdAt: new Date().toISOString(),
    moodScore,
    note: "",
    adverseReaction: emptyAdverseReaction(),
  });
}

export function createNoteEntry(note, dateKey) {
  return normalizeJournalEntry({
    id: uid("journal"),
    dateKey,
    entryType: "note",
    createdAt: new Date().toISOString(),
    moodScore: null,
    note: String(note).trim(),
    adverseReaction: emptyAdverseReaction(),
  });
}

export function createAdverseEntry(form, dateKey) {
  const occurredAt = form.occurredAt
    ? new Date(form.occurredAt).toISOString()
    : new Date().toISOString();

  return normalizeJournalEntry({
    id: uid("journal"),
    dateKey,
    entryType: "adverse",
    createdAt: new Date().toISOString(),
    moodScore: null,
    note: "",
    adverseReaction: {
      enabled: true,
      occurredAt,
      symptoms: form.symptoms,
      severity: form.severity,
      attributionType: form.attributionType,
      relatedMedicineIds:
        form.attributionType !== "uncertain" ? form.relatedMedicineIds : [],
      remark: form.adverseRemark.trim(),
    },
  });
}

export function entriesForDate(entries, dateKey) {
  return normalizeJournalEntries(entries).filter((entry) => entry.dateKey === dateKey);
}

export function severityLabel(key) {
  return SEVERITY_OPTIONS.find((item) => item.key === key)?.label || "未填写";
}

export function attributionLabel(key) {
  return ATTRIBUTION_OPTIONS.find((item) => item.key === key)?.label || "未填写";
}

export function adverseEntriesInRange(entries, startDateKey, endDateKey) {
  return normalizeJournalEntries(entries)
    .filter((entry) => entry.entryType === "adverse" && entry.adverseReaction.enabled)
    .filter((entry) => entry.dateKey >= startDateKey && entry.dateKey <= endDateKey)
    .sort((a, b) => {
      const dateOrder = a.dateKey.localeCompare(b.dateKey);
      if (dateOrder !== 0) return dateOrder;
      return a.adverseReaction.occurredAt.localeCompare(b.adverseReaction.occurredAt);
    });
}

export function formatAdverseOccurredAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function moodEmoji(score) {
  return MOOD_OPTIONS.find((item) => item.score === score)?.emoji || "";
}

export function entryTypeLabel(entryType) {
  if (entryType === "mood") return "心情";
  if (entryType === "note") return "感受";
  if (entryType === "adverse") return "不良反应";
  return "记录";
}
