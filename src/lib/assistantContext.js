import { daysUntil, formatAppointmentDate } from "./appointment.js";
import {
  addDays,
  buildTasksForDate,
  computeDayProgress,
  computeRangeProgress,
  dateKeyFromDate,
  formatDateKeyLabel,
  listDateKeysInRange,
} from "./dailySchedule.js";
import {
  adverseEntriesInRange,
  attributionLabel,
  formatAdverseOccurredAt,
  severityLabel,
} from "./journalEntry.js";
import { formatStockDaysLabel } from "./medicine.js";
import { normalizeProfile, ageFromBirthYear, genderLabel } from "./profile.js";

function taskTaken(intakeRecords, task) {
  return intakeRecords?.[task.id] === "taken";
}

function buildMissedIntakes(rangeKeys, medicationPlans, medicines, intakeRecords) {
  const missed = [];
  for (const dateKey of rangeKeys) {
    const tasks = buildTasksForDate(dateKey, medicationPlans, medicines);
    for (const task of tasks) {
      if (taskTaken(intakeRecords, task)) continue;
      missed.push({
        dateKey,
        time: task.time,
        medicineName: task.medicineName,
        dose: task.dose,
      });
    }
  }
  return missed.sort((a, b) => {
    const dateOrder = a.dateKey.localeCompare(b.dateKey);
    return dateOrder || a.time.localeCompare(b.time);
  });
}

export function buildAssistantContext(state, { dateKey = dateKeyFromDate(new Date()) } = {}) {
  const profile = normalizeProfile(state.profile);
  const medicines = state.medicines || [];
  const medicationPlans = state.medicationPlans || [];
  const intakeRecords = state.intakeRecords || {};
  const journalEntries = state.journalEntries || [];
  const appointments = state.appointments || [];

  const weekStartKey = addDays(dateKey, -6);
  const weekKeys = listDateKeysInRange(weekStartKey, dateKey);

  const todayTasks = buildTasksForDate(dateKey, medicationPlans, medicines);
  const todayProgress = computeDayProgress(todayTasks, intakeRecords);
  const weekProgress = computeRangeProgress(weekKeys, medicationPlans, medicines, intakeRecords);
  const missedThisWeek = buildMissedIntakes(weekKeys, medicationPlans, medicines, intakeRecords);
  const adverseThisWeek = adverseEntriesInRange(journalEntries, weekStartKey, dateKey);

  const pendingToday = todayTasks.filter((task) => !taskTaken(intakeRecords, task));
  const doneToday = todayTasks.filter((task) => taskTaken(intakeRecords, task));

  const stockItems = medicines.map((medicine) => ({
    name: medicine.name,
    stockLabel: formatStockDaysLabel(medicine, medicationPlans),
  }));

  const upcomingAppointments = appointments
    .filter((item) => !item.completed && daysUntil(item.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const age = ageFromBirthYear(profile.birthYear);
  const gender = genderLabel(profile.gender);

  return {
    dateKey,
    dateLabel: dateKey === dateKeyFromDate(new Date()) ? "今天" : formatDateKeyLabel(dateKey),
    profile: {
      nickname: profile.nickname,
      gender: gender && gender !== "暂不填写" ? gender : "",
      age,
      chronicDiseases: profile.chronicDiseases,
      drugAllergies: profile.drugAllergies,
    },
    today: {
      tasks: todayTasks,
      pending: pendingToday,
      done: doneToday,
      progress: todayProgress,
    },
    week: {
      startKey: weekStartKey,
      endKey: dateKey,
      progress: weekProgress,
      missed: missedThisWeek,
      adverse: adverseThisWeek.map((entry) => ({
        dateKey: entry.dateKey,
        occurredAt: formatAdverseOccurredAt(entry.adverseReaction.occurredAt),
        symptoms: entry.adverseReaction.symptoms.join("、"),
        severity: severityLabel(entry.adverseReaction.severity),
        attribution: attributionLabel(entry.adverseReaction.attributionType),
        remark: entry.adverseReaction.remark,
        relatedMedicineIds: entry.adverseReaction.relatedMedicineIds,
      })),
    },
    stockItems,
    upcomingAppointments: upcomingAppointments.map((item) => ({
      disease: item.disease,
      date: item.date,
      dateLabel: formatAppointmentDate(item.date),
      hospital: item.hospital,
      daysUntil: daysUntil(item.date),
    })),
    medicines,
    medicationPlans,
  };
}

export function medicineNameById(medicines, id) {
  return medicines.find((item) => item.id === id)?.name || "未知药品";
}

export function resolveRelatedMedicineNames(context, relatedIds) {
  return (relatedIds || [])
    .map((id) => medicineNameById(context.medicines, id))
    .filter(Boolean);
}
