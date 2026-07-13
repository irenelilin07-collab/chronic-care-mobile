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

export function isSecureNotificationContext() {
  return typeof window !== "undefined" && window.isSecureContext;
}

export function notificationPermission() {
  if (!notificationSupported()) return "unsupported";
  if (!isSecureNotificationContext()) return "insecure";
  return Notification.permission;
}

export function getNotificationAvailability() {
  if (typeof window === "undefined") {
    return { canRequest: false, reason: "unsupported" };
  }
  if (!isSecureNotificationContext()) {
    return { canRequest: false, reason: "insecure" };
  }
  if (!notificationSupported()) {
    return { canRequest: false, reason: "unsupported" };
  }
  const permission = Notification.permission;
  if (permission === "denied") {
    return { canRequest: false, reason: "denied" };
  }
  if (permission === "granted") {
    return { canRequest: true, reason: "granted" };
  }
  return { canRequest: true, reason: "prompt" };
}

export async function requestNotificationPermission() {
  const availability = getNotificationAvailability();
  if (!availability.canRequest && availability.reason !== "prompt") {
    return availability.reason;
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const permission = await Notification.requestPermission();
    return permission || "default";
  } catch {
    return "unsupported";
  }
}

export function getReminderPermissionMessage(reason, { forGuide = false } = {}) {
  const skipHint = forGuide ? "或点击「跳过」继续。" : "也可稍后在浏览器设置中开启后再试。";

  if (reason === "insecure") {
    return `当前访问地址不是安全环境，浏览器不允许通知。请改用 http://localhost:5173 打开本应用后重试。${skipHint}`;
  }
  if (reason === "denied") {
    return `浏览器已拒绝通知权限。请点击地址栏左侧的站点图标，在「通知」中选择「允许」，然后重试。${skipHint}`;
  }
  if (reason === "unsupported") {
    return `当前浏览器不支持通知提醒。${forGuide ? "可点击「跳过」继续。" : "请更换 Chrome / Edge 等现代浏览器。"}`;
  }
  if (reason === "default") {
    return `未获得通知权限。请在浏览器弹窗中选择「允许」，然后重试。${skipHint}`;
  }
  return `未获得通知权限。请在浏览器弹窗中选择「允许」，然后重试。${skipHint}`;
}

export function getNotificationStatusHint() {
  const availability = getNotificationAvailability();
  if (availability.reason === "insecure") {
    return "需通过 localhost 或 HTTPS 访问，才能使用浏览器通知。";
  }
  if (availability.reason === "denied") {
    return "通知权限已被拒绝，请在浏览器站点设置中允许通知。";
  }
  if (availability.reason === "unsupported") {
    return "当前浏览器不支持浏览器通知。";
  }
  if (availability.reason === "granted") {
    return "浏览器通知权限已开启。";
  }
  return null;
}

export async function tryEnableMedicationReminder(currentSettings, onSettingsChange) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return { ok: false, reason: permission };
  }

  onSettingsChange(
    normalizeSettings({
      ...currentSettings,
      medicationReminder: {
        ...normalizeSettings(currentSettings).medicationReminder,
        enabled: true,
      },
    })
  );

  return { ok: true };
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
