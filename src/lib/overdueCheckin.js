import {
  buildTasksForDate,
  dateKeyFromDate,
  isIntakeTaken,
  parseDateKey,
} from "./dailySchedule.js";

/** 计划时间过后多久仍未打卡，视为逾期提醒（分钟） */
export const OVERDUE_GRACE_MINUTES = 5;

/** 计划时间过后多久仍未打卡，不可再打卡（分钟） */
export const CHECKIN_EXPIRE_MINUTES = 60;

const REFRESH_MS = 30_000;

export function taskDueAt(dateKey, time) {
  const date = parseDateKey(dateKey);
  const [h, m] = String(time || "00:00").split(":").map(Number);
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
}

export function minutesPastDue(dateKey, time, now = new Date()) {
  const dueAt = taskDueAt(dateKey, time);
  return Math.floor((now.getTime() - dueAt.getTime()) / 60_000);
}

/**
 * taken | expired | overdue | due | scheduled
 */
export function getTaskTimingStatus(task, intakeRecords, now = new Date()) {
  if (isIntakeTaken(intakeRecords, task.dateKey, task.planId, task.time)) {
    return "taken";
  }
  const mins = minutesPastDue(task.dateKey, task.time, now);
  if (mins >= CHECKIN_EXPIRE_MINUTES) return "expired";
  if (mins >= OVERDUE_GRACE_MINUTES) return "overdue";
  if (mins >= 0) return "due";
  return "scheduled";
}

/** 是否允许切换打卡：已过期且未打卡时禁止 */
export function canToggleCheckin(task, intakeRecords, now = new Date()) {
  return getTaskTimingStatus(task, intakeRecords, now) !== "expired";
}

/**
 * 今日逾期但仍可打卡的任务（5–60 分钟）
 */
export function getOverdueTasks(
  { medicationPlans = [], medicines = [], intakeRecords = {} } = {},
  now = new Date(),
  graceMinutes = OVERDUE_GRACE_MINUTES
) {
  const todayKey = dateKeyFromDate(now);
  const tasks = buildTasksForDate(todayKey, medicationPlans, medicines);

  return tasks
    .filter((task) => {
      const status = getTaskTimingStatus(task, intakeRecords, now);
      if (status !== "overdue" && status !== "due") return false;
      const mins = minutesPastDue(task.dateKey, task.time, now);
      return mins >= graceMinutes && mins < CHECKIN_EXPIRE_MINUTES;
    })
    .map((task) => {
      const overdueMinutes = minutesPastDue(task.dateKey, task.time, now);
      return { ...task, overdueMinutes };
    })
    .sort((a, b) => b.overdueMinutes - a.overdueMinutes);
}

export function getExpiredTasks(
  { medicationPlans = [], medicines = [], intakeRecords = {} } = {},
  now = new Date()
) {
  const todayKey = dateKeyFromDate(now);
  const tasks = buildTasksForDate(todayKey, medicationPlans, medicines);
  return tasks.filter(
    (task) => getTaskTimingStatus(task, intakeRecords, now) === "expired"
  );
}

export function getOverdueCount(state, now = new Date()) {
  return getOverdueTasks(state, now).length;
}

export function formatOverdueBadge(count) {
  if (!count || count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

export function formatOverdueMinutesLabel(minutes) {
  if (minutes < 60) return `已逾期 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `已逾期 ${hours} 小时`;
  return `已逾期 ${hours} 小时 ${rest} 分`;
}

export const OVERDUE_REFRESH_MS = REFRESH_MS;
