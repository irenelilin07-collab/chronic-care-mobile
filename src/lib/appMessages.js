import {
  buildTasksForDate,
  dateKeyFromDate,
  isIntakeTaken,
} from "./dailySchedule.js";
import {
  CHECKIN_EXPIRE_MINUTES,
  OVERDUE_GRACE_MINUTES,
  minutesPastDue,
} from "./overdueCheckin.js";

export const MESSAGE_TYPES = {
  upcoming: "upcoming",
  due: "due",
  overdue: "overdue",
  expired: "expired",
};

function messageIdForTask(taskId) {
  return `intake-msg|${taskId}`;
}

function buildCopy(type, task) {
  const dosePart = task.dose ? `（${task.dose}）` : "";
  if (type === MESSAGE_TYPES.expired) {
    return {
      title: "已过期",
      body: `${task.time} 的 ${task.medicineName}${dosePart} 超过 ${CHECKIN_EXPIRE_MINUTES} 分钟未打卡，已不可打卡`,
    };
  }
  if (type === MESSAGE_TYPES.overdue) {
    return {
      title: "未打卡提醒",
      body: `${task.time} 的 ${task.medicineName}${dosePart} 已超过 ${OVERDUE_GRACE_MINUTES} 分钟未打卡`,
    };
  }
  return {
    title: "到点用药",
    body: `现在该服用 ${task.medicineName}${dosePart}（${task.time}）`,
  };
}

export function normalizeMessages(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      type: Object.values(MESSAGE_TYPES).includes(item.type) ? item.type : MESSAGE_TYPES.due,
      taskId: item.taskId || "",
      dateKey: item.dateKey || "",
      planId: item.planId || "",
      time: item.time || "",
      medicineName: item.medicineName || "",
      dose: item.dose || "",
      title: item.title || "用药消息",
      body: item.body || "",
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      readAt: item.readAt || null,
      resolvedAt: item.resolvedAt || null,
      expiredAt: item.expiredAt || null,
    }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function resolveType(task, now) {
  const mins = minutesPastDue(task.dateKey, task.time, now);
  if (mins >= CHECKIN_EXPIRE_MINUTES) return MESSAGE_TYPES.expired;
  if (mins >= OVERDUE_GRACE_MINUTES) return MESSAGE_TYPES.overdue;
  if (mins >= 0) return MESSAGE_TYPES.due;
  return null;
}

/**
 * 根据今日任务同步消息（到点 / 逾期 / 过期）
 */
export function syncMedicationMessages(state, now = new Date()) {
  const existing = normalizeMessages(state.messages);
  const byId = new Map(existing.map((item) => [item.id, { ...item }]));

  const todayKey = dateKeyFromDate(now);
  const tasks = buildTasksForDate(
    todayKey,
    state.medicationPlans || [],
    state.medicines || []
  );

  for (const task of tasks) {
    const id = messageIdForTask(task.id);
    const taken = isIntakeTaken(
      state.intakeRecords,
      task.dateKey,
      task.planId,
      task.time
    );

    if (taken) {
      const prev = byId.get(id);
      if (prev && (!prev.resolvedAt || prev.expiredAt || prev.type === MESSAGE_TYPES.expired)) {
        byId.set(id, {
          ...prev,
          resolvedAt: now.toISOString(),
          expiredAt: null,
          updatedAt: now.toISOString(),
        });
      }
      continue;
    }

    const type = resolveType(task, now);
    if (!type) continue;

    const copy = buildCopy(type, task);
    const prev = byId.get(id);
    const isExpired = type === MESSAGE_TYPES.expired;

    if (!prev) {
      byId.set(id, {
        id,
        type,
        taskId: task.id,
        dateKey: task.dateKey,
        planId: task.planId,
        time: task.time,
        medicineName: task.medicineName,
        dose: task.dose || "",
        title: copy.title,
        body: copy.body,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        readAt: null,
        resolvedAt: null,
        expiredAt: isExpired ? now.toISOString() : null,
      });
      continue;
    }

    const typeRank = {
      [MESSAGE_TYPES.upcoming]: 1,
      [MESSAGE_TYPES.due]: 2,
      [MESSAGE_TYPES.overdue]: 3,
      [MESSAGE_TYPES.expired]: 4,
    };
    const shouldUpgrade = typeRank[type] > (typeRank[prev.type] || 0);
    const shouldRefreshCopy = prev.type !== type || prev.body !== copy.body;
    const wasResolved = Boolean(prev.resolvedAt);

    if (shouldUpgrade || shouldRefreshCopy || wasResolved) {
      byId.set(id, {
        ...prev,
        type,
        title: copy.title,
        body: copy.body,
        medicineName: task.medicineName,
        dose: task.dose || "",
        updatedAt: now.toISOString(),
        resolvedAt: null,
        expiredAt: isExpired ? prev.expiredAt || now.toISOString() : null,
      });
    }
  }

  const next = Array.from(byId.values()).sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt))
  );

  return {
    messages: next,
    changed: JSON.stringify(normalizeMessages(state.messages)) !== JSON.stringify(next),
  };
}

function isExpiredMessage(item) {
  return item.type === MESSAGE_TYPES.expired || Boolean(item.expiredAt);
}

/** 铃铛 / 用药 Tab：当天尚未完成（打卡）的消息数，含已过期 */
export function getPendingMessageCount(messages = [], now = new Date()) {
  const todayKey = dateKeyFromDate(now);
  return normalizeMessages(messages).filter(
    (item) => item.dateKey === todayKey && !item.resolvedAt
  ).length;
}

/**
 * 角标展示：总数含已过期；
 * 只要还有待打卡 → 红色；仅剩已过期未打卡 → 灰色
 */
export function getTodayMessageBadge(messages = [], now = new Date()) {
  const todayKey = dateKeyFromDate(now);
  const pending = normalizeMessages(messages).filter(
    (item) => item.dateKey === todayKey && !item.resolvedAt
  );
  const count = pending.length;
  if (count === 0) return { count: 0, tone: "red" };
  const hasActionable = pending.some((item) => !isExpiredMessage(item));
  return { count, tone: hasActionable ? "red" : "gray" };
}

export function formatMessageTime(iso) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const today = dateKeyFromDate(new Date());
    const key = dateKeyFromDate(date);
    if (key === today) return `${hh}:${mm}`;
    return `${key.slice(5).replace("-", ".")} ${hh}:${mm}`;
  } catch {
    return "";
  }
}

export function messageTypeLabel(type) {
  if (type === MESSAGE_TYPES.expired) return "已过期";
  if (type === MESSAGE_TYPES.overdue) return "逾期";
  if (type === MESSAGE_TYPES.due) return "到点";
  if (type === MESSAGE_TYPES.upcoming) return "提醒";
  return "消息";
}
