import { uid } from "../medicine.js";
import { formatSpec } from "../medicine.js";
import { normalizePlanPayload, todaysDefaultDate } from "../medicationPlan.js";
import { buildTimeLabel } from "./mealTimeMap.js";
import { findMedicineInInventory } from "./inventoryMatch.js";
import {
  findDuplicatePlanForDraft,
  mergeOverlappingPlanTimes,
  shouldAddPlanFromDraft,
  shouldMergeOverlappingPlan,
} from "./planDuplicate.js";

export function applyCaptureDraft(
  medicines,
  medicationPlans,
  medicineDrafts = [],
  appointments = [],
  appointmentDrafts = []
) {
  let nextMedicines = [...medicines];
  let nextPlans = [...medicationPlans];
  let nextAppointments = [...appointments];
  const createdMedicines = [];
  const stockUpdates = [];
  const planOnlyMedicines = [];
  const skippedDuplicatePlans = [];
  const addedPlans = [];

  for (const item of medicineDrafts) {
    const existingMedicine = findMedicineInInventory(nextMedicines, item);
    const isExisting = item.inventoryMode === "existing" && existingMedicine;
    const shouldAddStock =
      !isExisting || item.stockAction === "add_stock";
    const stockDelta = shouldAddStock ? Number(item.stockAmount) : 0;

    let medicineId = existingMedicine?.id;

    if (!medicineId) {
      const specUnit = String(item.specUnit || "").trim() || "片";
      const specAmount = item.specAmount || "—";
      const stock = stockDelta;
      const medicine = {
        id: uid("med"),
        name: item.name,
        specAmount,
        specUnit,
        spec: item.spec || formatSpec({ specAmount, specUnit }),
        dose: item.dose,
        stock,
        initialStock: stock,
        stockUnit: specUnit,
      };
      nextMedicines = [...nextMedicines, medicine];
      medicineId = medicine.id;
      createdMedicines.push(item.name);
    } else if (shouldAddStock && stockDelta > 0) {
      // 同药追加只加数量，单位强制沿用原药箱
      nextMedicines = nextMedicines.map((medicine) =>
        medicine.id === medicineId
          ? { ...medicine, stock: Number(medicine.stock) + stockDelta }
          : medicine
      );
      stockUpdates.push({ name: item.name, amount: stockDelta });
    }

    const duplicatePlan = findDuplicatePlanForDraft(item, nextMedicines, nextPlans);
    const addPlan = shouldAddPlanFromDraft(item, duplicatePlan);

    if (isExisting && item.stockAction === "plan_only" && addPlan) {
      planOnlyMedicines.push(item.name);
    }

    if (duplicatePlan && !addPlan && item.captureMode !== "stock_only") {
      skippedDuplicatePlans.push(item.name);
    }

    if (addPlan && item.captureMode !== "stock_only") {
      if (shouldMergeOverlappingPlan(item, duplicatePlan)) {
        const mergedTimes = mergeOverlappingPlanTimes(duplicatePlan, item);
        nextPlans = nextPlans.map((plan) =>
          plan.id === duplicatePlan.id ? { ...plan, times: mergedTimes } : plan
        );
        addedPlans.push(item.name);
      } else {
        const planPayload = normalizePlanPayload(
          {
            medicineId,
            ruleType: item.frequency,
            times: item.times,
            weekdays: item.weekdays || [],
            intervalDays: String(item.intervalDays || 2),
            startDate: item.startDate || todaysDefaultDate(),
            endDate: item.longTerm ? "" : item.endDate || "",
            longTerm: typeof item.longTerm === "boolean" ? item.longTerm : true,
          },
          nextMedicines
        );
        nextPlans = [...nextPlans, { id: uid("plan"), ...planPayload }];
        addedPlans.push(item.name);
      }
    }
  }

  const createdAppointments = [];
  for (const item of appointmentDrafts) {
    if (!item.disease?.trim() || !item.date || !item.hospital?.trim()) continue;
    const duplicate = nextAppointments.find(
      (entry) =>
        entry.disease === item.disease &&
        entry.date === item.date &&
        entry.hospital === item.hospital
    );
    if (duplicate) continue;

    nextAppointments = [
      ...nextAppointments,
      {
        id: uid("appt"),
        disease: item.disease.trim(),
        date: item.date,
        hospital: item.hospital.trim(),
        doctor: item.doctor?.trim() || "",
        linkUrl: item.linkUrl?.trim() || "",
        completed: false,
      },
    ];
    createdAppointments.push(`${item.disease}复诊`);
  }

  return {
    medicines: nextMedicines,
    medicationPlans: nextPlans,
    appointments: nextAppointments,
    createdMedicines,
    stockUpdates,
    planOnlyMedicines,
    skippedDuplicatePlans,
    addedPlans,
    createdAppointments,
  };
}

export function updateDraftItemTimeLabel(item) {
  return {
    ...item,
    timeLabel: buildTimeLabel({
      frequency: item.frequency,
      times: item.times,
      mealHints: item.mealHints || [],
    }),
  };
}

export function getMedicineDraftFieldIssues(item) {
  const issues = {
    dose: false,
    times: false,
    stockAction: false,
    stockAmount: false,
    stockUnit: false,
    planPeriod: false,
  };

  const stockOnly = item.captureMode === "stock_only";
  const needsNewStockUnit =
    item.inventoryMode === "new" || (stockOnly && item.inventoryMode !== "existing");

  if (!stockOnly) {
    if (!item.times?.length) issues.times = true;
    if (!String(item.dose || "").trim()) issues.dose = true;
    if (!item.startDate) issues.planPeriod = true;
    else if (!item.longTerm) {
      if (!item.endDate) issues.planPeriod = true;
      else if (item.endDate < item.startDate) issues.planPeriod = true;
    }
  }

  if (item.inventoryMode === "new" || stockOnly) {
    const stock = Number(item.stockAmount);
    if (!Number.isFinite(stock) || stock <= 0) issues.stockAmount = true;
  } else if (item.inventoryMode === "existing") {
    if (!stockOnly && !item.stockAction) issues.stockAction = true;
    else if (item.stockAction === "add_stock" || stockOnly) {
      const stock = Number(item.stockAmount);
      if (!Number.isFinite(stock) || stock <= 0) issues.stockAmount = true;
    }
  }

  if (needsNewStockUnit && !String(item.specUnit || "").trim()) {
    issues.stockUnit = true;
  }

  return issues;
}

export function getMedicineDraftIssue(item) {
  const issues = getMedicineDraftFieldIssues(item);
  if (issues.times) return "请选择服药时间";
  if (issues.dose) return "请填写单次剂量";
  if (issues.planPeriod) {
    if (!item.startDate) return "请填写开始日期";
    if (!item.longTerm && !item.endDate) return "请填写结束日期或勾选长期服用";
    return "结束日期不能早于开始日期";
  }
  if (issues.stockAction) return "请选择库存处理方式";
  if (issues.stockAmount) {
    return item.inventoryMode === "existing" ? "请填写追加数量" : "请填写药箱数量";
  }
  if (issues.stockUnit) return "请填写剂量单位";
  return "";
}

export function getAppointmentFieldIssues(item) {
  return {
    disease: !item.disease?.trim(),
    date: !item.date,
    hospital: !item.hospital?.trim(),
  };
}

export function getAppointmentDraftIssue(item) {
  const issues = getAppointmentFieldIssues(item);
  if (issues.disease || issues.date || issues.hospital) {
    return "请补全复诊信息";
  }
  return "";
}
export function validateMedicineDrafts(draftItems) {
  for (const item of draftItems) {
    const issue = getMedicineDraftIssue(item);
    if (issue) return issue;
  }
  return "";
}

export function validateAppointmentDrafts(draftItems) {
  for (const item of draftItems) {
    const issue = getAppointmentDraftIssue(item);
    if (issue) return issue;
  }
  return "";
}
