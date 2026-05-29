export const REMINDER_MINUTES_OPTIONS = [5, 10, 15, 30];

export const DEFAULT_SETTINGS = {
  medicationReminder: {
    enabled: false,
    minutesBefore: 10,
  },
};

export function normalizeSettings(settings = {}) {
  const reminder = settings.medicationReminder || {};
  const minutesBefore = Number(reminder.minutesBefore);
  return {
    medicationReminder: {
      enabled: Boolean(reminder.enabled),
      minutesBefore: REMINDER_MINUTES_OPTIONS.includes(minutesBefore) ? minutesBefore : 10,
    },
  };
}

export function summarizeMedicationReminder(settings) {
  const normalized = normalizeSettings(settings);
  if (!normalized.medicationReminder.enabled) return "未开启";
  return `提前 ${normalized.medicationReminder.minutesBefore} 分钟`;
}
