import {
  addDays,
  buildTasksForDate,
  dateKeyFromDate,
  isIntakeTaken,
  parseDateKey,
} from "./dailySchedule.js";
import { normalizeSettings } from "./settings.js";

let timers = [];

export function notificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function clearMedicationReminders() {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
}

function scheduleTaskReminder(task, minutesBefore) {
  const [hour, minute] = task.time.split(":").map(Number);
  const taskAt = parseDateKey(task.dateKey);
  taskAt.setHours(hour, minute || 0, 0, 0);

  const remindAt = taskAt.getTime() - minutesBefore * 60 * 1000;
  const delay = remindAt - Date.now();
  if (delay <= 0 || delay > 48 * 60 * 60 * 1000) return;

  const timer = setTimeout(() => {
    if (notificationPermission() !== "granted") return;

    const leadText =
      minutesBefore > 0 ? `还有 ${minutesBefore} 分钟，` : "";
    const body = `${leadText}请服用 ${task.medicineName}（${task.dose}，${task.time}）`;

    new Notification("用药提醒", {
      body,
      tag: task.id,
    });
  }, delay);

  timers.push(timer);
}

export function scheduleMedicationReminders(state) {
  clearMedicationReminders();

  const settings = normalizeSettings(state.settings);
  if (!settings.medicationReminder.enabled) return;
  if (notificationPermission() !== "granted") return;

  const { minutesBefore } = settings.medicationReminder;
  const todayKey = dateKeyFromDate(new Date());
  const dateKeys = [todayKey, addDays(todayKey, 1)];

  for (const dateKey of dateKeys) {
    const tasks = buildTasksForDate(dateKey, state.medicationPlans || [], state.medicines || []);
    for (const task of tasks) {
      if (isIntakeTaken(state.intakeRecords, dateKey, task.planId, task.time)) continue;
      scheduleTaskReminder(task, minutesBefore);
    }
  }
}
