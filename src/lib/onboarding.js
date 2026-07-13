import { formatSpec, uid } from "./medicine.js";
import { todaysDefaultDate } from "./medicationPlan.js";

export function normalizeOnboarding(onboarding = {}) {
  const status = onboarding.status || "pending";
  return {
    status: ["pending", "completed", "skipped"].includes(status) ? status : "pending",
    completedAt: onboarding.completedAt || null,
    source: onboarding.source || null,
  };
}

export function shouldShowOnboarding(state) {
  const onboarding = normalizeOnboarding(state.onboarding);
  if (onboarding.status === "completed" || onboarding.status === "skipped") {
    return false;
  }
  return (state.medicationPlans || []).length === 0;
}

export function buildMedicineFromTemplate(template) {
  const specAmount = String(template.specAmount || "").trim();
  const specUnit = String(template.specUnit || "").trim();
  const stock = Number(template.stock) || 30;

  return {
    id: uid("med"),
    name: template.name,
    specAmount,
    specUnit,
    spec: formatSpec({ specAmount, specUnit }),
    dose: template.dose,
    stock,
    initialStock: stock,
    stockUnit: specUnit || "片",
  };
}

export function buildPlanFromOnboarding(medicine, times) {
  return {
    id: uid("plan"),
    medicineId: medicine.id,
    medicineName: medicine.name,
    ruleType: "daily",
    times: [...new Set(times)].sort(),
    weekdays: [],
    intervalDays: 1,
    startDate: todaysDefaultDate(),
    endDate: null,
    longTerm: true,
  };
}

export function buildOnboardingProfilePatch(diseaseOption) {
  if (!diseaseOption?.diseases?.length) return {};
  return {
    chronicDiseases: diseaseOption.diseases,
  };
}

export function markOnboardingCompleted(source) {
  return {
    status: "completed",
    completedAt: new Date().toISOString(),
    source: source || null,
  };
}

export function markOnboardingSkipped() {
  return {
    status: "skipped",
    completedAt: new Date().toISOString(),
    source: null,
  };
}
