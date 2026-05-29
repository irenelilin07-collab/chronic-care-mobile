import { parseDose } from "./medicine.js";
import { planMedicineLabel, WEEKDAYS } from "./medicationPlan.js";

export const TIME_SLOTS = [
  { key: "morning", label: "早上", icon: "☀️", startMin: 5 * 60, endMin: 11 * 60 + 59 },
  { key: "noon", label: "中午", icon: "🌤️", startMin: 12 * 60, endMin: 16 * 60 + 59 },
  { key: "evening", label: "晚上", icon: "🌙", startMin: 17 * 60, endMin: 23 * 60 + 59 },
];

export function dateKeyFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoWeekday(dateKey) {
  const day = parseDateKey(dateKey).getDay();
  return day === 0 ? 7 : day;
}

export function daysBetween(startKey, targetKey) {
  const start = parseDateKey(startKey);
  const target = parseDateKey(targetKey);
  return Math.round((target - start) / 86400000);
}

export function formatDateRangeLabel(startDateKey, endDateKey) {
  if (!startDateKey || !endDateKey) return "";
  const start = formatDateKeyLabel(startDateKey);
  const end = formatDateKeyLabel(endDateKey);
  return start === end ? start : `${start} - ${end}`;
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function slotForTime(time) {
  const mins = timeToMinutes(time);
  const matched = TIME_SLOTS.find((slot) => mins >= slot.startMin && mins <= slot.endMin);
  return matched || TIME_SLOTS[TIME_SLOTS.length - 1];
}

export function intakeRecordKey(dateKey, planId, time) {
  return `${dateKey}|${planId}|${time}`;
}

export function isIntakeTaken(intakeRecords, dateKey, planId, time) {
  const key = intakeRecordKey(dateKey, planId, time);
  return intakeRecords?.[key] === "taken";
}

export function planAppliesOnDate(plan, dateKey) {
  if (!plan?.startDate || dateKey < plan.startDate) return false;
  if (!plan.longTerm && plan.endDate && dateKey > plan.endDate) return false;

  if (plan.ruleType === "weekly") {
    return (plan.weekdays || []).includes(isoWeekday(dateKey));
  }
  if (plan.ruleType === "interval") {
    const every = Math.max(2, Number(plan.intervalDays) || 2);
    const diff = daysBetween(plan.startDate, dateKey);
    return diff >= 0 && diff % every === 0;
  }
  return true;
}

export function planRuleTag(plan) {
  if (plan.ruleType === "interval") {
    const every = Number(plan.intervalDays) || 2;
    return every === 2 ? "🔁 隔天吃" : `🔁 每 ${every} 天`;
  }
  if (plan.ruleType === "weekly") {
    const days = (plan.weekdays || [])
      .sort((a, b) => a - b)
      .map((day) => WEEKDAYS.find((item) => item.value === day)?.label || day)
      .join("、");
    return days ? `每周${days}` : "每周";
  }
  return "";
}

export function doseAmountOf(dose) {
  const parsed = parseDose(dose);
  const raw = String(parsed.doseAmount || "").trim();
  if (!raw || /[^\d./]/.test(raw)) return 0;
  const num = parseFloat(raw.split("/")[0]);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function buildTasksForDate(dateKey, plans = [], medicines = []) {
  const tasks = [];

  for (const plan of plans) {
    if (!planAppliesOnDate(plan, dateKey)) continue;

    const linked = medicines.find((item) => item.id === plan.medicineId);
    const medicineName = planMedicineLabel(plan, medicines);
    const dose = linked?.dose || "";
    const doseAmount = linked ? doseAmountOf(linked.dose) : 0;

    for (const time of plan.times || []) {
      const slot = slotForTime(time);
      tasks.push({
        id: intakeRecordKey(dateKey, plan.id, time),
        dateKey,
        planId: plan.id,
        medicineId: plan.medicineId || null,
        time,
        medicineName,
        dose,
        doseAmount,
        ruleTag: planRuleTag(plan),
        slotKey: slot.key,
        slotLabel: slot.label,
        slotIcon: slot.icon,
      });
    }
  }

  return tasks.sort((a, b) => a.time.localeCompare(b.time));
}

export function computeDayProgress(tasks, intakeRecords) {
  const total = tasks.length;
  if (total === 0) return { total: 0, done: 0, percent: 0 };
  const done = tasks.filter((task) => intakeRecords?.[task.id] === "taken").length;
  return {
    total,
    done,
    percent: Math.round((done / total) * 100),
  };
}

export function groupTasksBySlot(tasks) {
  const groups = TIME_SLOTS.map((slot) => ({
    ...slot,
    tasks: tasks.filter((task) => task.slotKey === slot.key),
  }));
  return groups.filter((group) => group.tasks.length > 0);
}

export function getWeekDays(anchorDateKey) {
  const anchor = parseDateKey(anchorDateKey);
  const dow = anchor.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dateKeyFromDate(date);
    return {
      dateKey: key,
      weekday: WEEKDAYS[index]?.label || "",
      day: date.getDate(),
      isToday: key === dateKeyFromDate(new Date()),
    };
  });
}

export function weekProgressForDay(dateKey, plans, medicines, intakeRecords) {
  const tasks = buildTasksForDate(dateKey, plans, medicines);
  return computeDayProgress(tasks, intakeRecords);
}

export function toggleIntakeRecord(intakeRecords, key, taken) {
  const next = { ...(intakeRecords || {}) };
  if (taken) next[key] = "taken";
  else delete next[key];
  return next;
}

export function applyMedicineStockDelta(medicines, medicineId, delta) {
  if (!medicineId || !delta) return medicines;
  return medicines.map((medicine) => {
    if (medicine.id !== medicineId) return medicine;
    const stock = Math.max(0, Number(medicine.stock) + delta);
    return { ...medicine, stock };
  });
}

export function addDays(dateKey, offset) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return dateKeyFromDate(date);
}

export function listDateKeysInRange(startDateKey, endDateKey) {
  if (!startDateKey || !endDateKey || startDateKey > endDateKey) return [];
  const keys = [];
  let current = startDateKey;
  while (current <= endDateKey) {
    keys.push(current);
    current = addDays(current, 1);
  }
  return keys;
}

export function formatDateKeyLabel(dateKey) {
  return dateKey.replace(/-/g, ".");
}

export function formatMonthLabel(year, month) {
  return `${year}年${month}月`;
}

export function getMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startDow = first.getDay();
  const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() + mondayOffset);

  const todayKey = dateKeyFromDate(new Date());
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const dateKey = dateKeyFromDate(date);
    cells.push({
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isToday: dateKey === todayKey,
    });
  }

  while (cells.length > 35) {
    const lastRow = cells.slice(-7);
    if (lastRow.every((cell) => !cell.inMonth)) cells.splice(-7, 7);
    else break;
  }

  return cells;
}

export function dayStatus(dateKey, plans, medicines, intakeRecords) {
  const tasks = buildTasksForDate(dateKey, plans, medicines);
  const progress = computeDayProgress(tasks, intakeRecords);
  return {
    ...progress,
    hasTasks: progress.total > 0,
    allDone: progress.total > 0 && progress.done === progress.total,
  };
}

export function weekRangeLabel(anchorDateKey) {
  const days = getWeekDays(anchorDateKey);
  const start = days[0].dateKey.slice(5).replace("-", ".");
  const end = days[6].dateKey.slice(5).replace("-", ".");
  return `${start} - ${end}`;
}

export function computeRangeProgress(dateKeys, plans, medicines, intakeRecords) {
  let total = 0;
  let done = 0;
  for (const dateKey of dateKeys) {
    const tasks = buildTasksForDate(dateKey, plans, medicines);
    const progress = computeDayProgress(tasks, intakeRecords);
    total += progress.total;
    done += progress.done;
  }
  return {
    total,
    done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
