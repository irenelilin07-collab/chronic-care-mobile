import { uid } from "./medicine.js";

export { uid };

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDateString(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 距复诊日的日历天数（负数表示已过期） */
export function daysUntil(dateStr, fromDate = new Date()) {
  const today = startOfDay(fromDate);
  const target = startOfDay(parseDateString(dateStr));
  return Math.round((target - today) / 86400000);
}

export function formatAppointmentDate(dateStr) {
  const date = parseDateString(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatCountdownLabel(appointment) {
  if (appointment.completed) return "已完成";
  const days = daysUntil(appointment.date);
  const status = appointmentStatus(appointment);
  if (status === "expired") return `已逾期 ${Math.abs(days)} 天`;
  if (status === "today") return "今天复诊";
  return `${days}天后`;
}

/** @returns {"completed"|"expired"|"today"|"soon"|"upcoming"} */
export function appointmentStatus(appointment) {
  if (appointment.completed) return "completed";
  const days = daysUntil(appointment.date);
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "upcoming";
}

export function statusLabel(appointment) {
  if (appointment.completed) return "已完成";
  const days = daysUntil(appointment.date);
  const status = appointmentStatus(appointment);
  if (status === "expired") return `已逾期 ${Math.abs(days)} 天`;
  if (status === "today") return "今天复诊";
  return `还有 ${days} 天`;
}

export function statusColors(status) {
  if (status === "completed") {
    return {
      badge: "bg-[#f5f6f8] text-[#999]",
      accent: "text-[#999]",
      ring: "ring-[#eee]",
    };
  }
  if (status === "expired") {
    return {
      badge: "bg-[#fff1f0] text-[#ff4d4f]",
      accent: "text-[#ff4d4f]",
      ring: "ring-[#ffccc7]",
    };
  }
  if (status === "today") {
    return {
      badge: "bg-[#fff7e6] text-[#fa8c16]",
      accent: "text-[#fa8c16]",
      ring: "ring-[#ffd591]",
    };
  }
  if (status === "soon") {
    return {
      badge: "bg-[#fffbe6] text-[#faad14]",
      accent: "text-[#faad14]",
      ring: "ring-[#ffe58f]",
    };
  }
  return {
    badge: "bg-[#e8faf4] text-[#00a87a]",
    accent: "text-[#00a87a]",
    ring: "ring-[#b7eb8f]",
  };
}

export function sortAppointments(list = []) {
  return [...list].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    if (a.completed && b.completed) {
      return String(b.completedAt || b.date).localeCompare(String(a.completedAt || a.date));
    }
    const daysA = daysUntil(a.date);
    const daysB = daysUntil(b.date);
    const expiredA = daysA < 0;
    const expiredB = daysB < 0;
    if (expiredA && !expiredB) return -1;
    if (!expiredA && expiredB) return 1;
    return daysA - daysB;
  });
}

export function getFeaturedAppointment(list = []) {
  const active = list.filter((item) => !item.completed);
  const sorted = sortAppointments(active);
  return sorted.find((item) => daysUntil(item.date) >= 0) || sorted[0] || null;
}
