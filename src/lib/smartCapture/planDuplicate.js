import { findMedicineInInventory } from "./inventoryMatch.js";
import { formatPlanRule } from "../medicationPlan.js";

function sortedJson(values = []) {
  return JSON.stringify([...values].sort());
}

function schedulesCompatible(plan, item) {
  if (plan.ruleType !== item.frequency) return false;
  if (item.frequency === "weekly") {
    return sortedJson(plan.weekdays) === sortedJson(item.weekdays);
  }
  if (item.frequency === "interval") {
    return Number(plan.intervalDays) === Number(item.intervalDays || 2);
  }
  return true;
}

export function getOverlappingTimes(plan, item) {
  const planTimes = new Set(plan.times || []);
  return [...(item.times || [])].filter((time) => planTimes.has(time)).sort();
}

export function plansOverlapSchedule(plan, item) {
  if (!schedulesCompatible(plan, item)) return false;
  return getOverlappingTimes(plan, item).length > 0;
}

export function plansMatchSchedule(plan, item) {
  if (!schedulesCompatible(plan, item)) return false;
  return sortedJson(plan.times) === sortedJson(item.times);
}

export function buildScheduleItem({
  medicineId,
  ruleType,
  frequency,
  times,
  weekdays,
  intervalDays,
}) {
  return {
    medicineId,
    frequency: frequency || ruleType || "daily",
    times: times || [],
    weekdays: weekdays || [],
    intervalDays: intervalDays || 2,
  };
}

function buildOverlapSummary(overlappingPlans, item) {
  if (!overlappingPlans.length) return null;

  const overlapTimes = [
    ...new Set(overlappingPlans.flatMap((plan) => getOverlappingTimes(plan, item))),
  ].sort();

  return {
    primaryPlan: overlappingPlans[0],
    overlappingPlans,
    overlapTimes,
    exact: overlappingPlans.some((plan) => plansMatchSchedule(plan, item)),
  };
}

export function findOverlappingPlansForSchedule(item, medicationPlans = [], excludePlanId = null) {
  if (!item.medicineId || !item.times?.length) return [];

  return medicationPlans.filter(
    (plan) =>
      plan.id !== excludePlanId &&
      plan.medicineId === item.medicineId &&
      plansOverlapSchedule(plan, item)
  );
}

export function getPlanFormOverlapSummary(form, medicationPlans = [], excludePlanId = null) {
  const item = buildScheduleItem(form);
  const overlappingPlans = findOverlappingPlansForSchedule(
    item,
    medicationPlans,
    excludePlanId
  );
  return buildOverlapSummary(overlappingPlans, item);
}

export function findOverlappingPlansForDraft(item, medicines, medicationPlans = []) {
  if (item.captureMode === "stock_only") return [];
  if (!item.times?.length || !item.name?.trim()) return [];

  const existingMedicine = findMedicineInInventory(medicines, item);
  if (!existingMedicine) return [];

  return findOverlappingPlansForSchedule(
    buildScheduleItem({
      medicineId: existingMedicine.id,
      frequency: item.frequency,
      times: item.times,
      weekdays: item.weekdays,
      intervalDays: item.intervalDays,
    }),
    medicationPlans
  );
}

/** @deprecated alias — returns first overlapping plan */
export function findDuplicatePlanForDraft(item, medicines, medicationPlans = []) {
  return findOverlappingPlansForDraft(item, medicines, medicationPlans)[0] || null;
}

export function getDraftPlanOverlapSummary(item, medicines, medicationPlans = []) {
  if (item.captureMode === "stock_only") return null;
  if (!item.times?.length || !item.name?.trim()) return null;

  const existingMedicine = findMedicineInInventory(medicines, item);
  if (!existingMedicine) return null;

  return getPlanFormOverlapSummary(
    {
      medicineId: existingMedicine.id,
      frequency: item.frequency,
      times: item.times,
      weekdays: item.weekdays,
      intervalDays: item.intervalDays,
    },
    medicationPlans
  );
}

export function formatPlanOverlapWarning(summary) {
  if (!summary) return "";
  if (summary.exact) {
    return `与已有计划重复：${formatPlanRule(summary.primaryPlan)}`;
  }
  const times = summary.overlapTimes.join("、");
  return `与已有计划部分重合：${times}（已有 ${formatPlanRule(summary.primaryPlan)}）`;
}

export function formatPlanOverlapDetail(summary) {
  if (!summary) return "已有相同计划";
  if (summary.exact) return formatPlanRule(summary.primaryPlan);
  return `部分重合 ${summary.overlapTimes.join("、")}（已有 ${formatPlanRule(summary.primaryPlan)}）`;
}

export function mergeOverlappingPlanTimes(plan, item) {
  return [...new Set([...(plan.times || []), ...(item.times || [])])].sort();
}

export function resolveDraftDuplicatePlan(item, medicines, medicationPlans = []) {
  const summary = getDraftPlanOverlapSummary(item, medicines, medicationPlans);

  if (!summary) {
    return {
      ...item,
      duplicateExistingPlanId: null,
      duplicatePlanAction: "",
    };
  }

  const sameDuplicate = item.duplicateExistingPlanId === summary.primaryPlan.id;

  return {
    ...item,
    duplicateExistingPlanId: summary.primaryPlan.id,
    duplicatePlanAction: sameDuplicate ? item.duplicatePlanAction || "" : "",
  };
}

export function shouldAddPlanFromDraft(item, duplicatePlan) {
  if (item.captureMode === "stock_only") return false;
  if (!duplicatePlan) return true;
  return item.duplicatePlanAction === "force_add";
}

export function shouldMergeOverlappingPlan(item, duplicatePlan) {
  return (
    Boolean(duplicatePlan) &&
    item.duplicatePlanAction === "force_add" &&
    !plansMatchSchedule(duplicatePlan, item)
  );
}

export function applyManualPlanSave({
  medicationPlans,
  payload,
  editingPlanId = null,
  overlapAction = null,
  newPlanId,
}) {
  const item = buildScheduleItem(payload);
  const summary = getPlanFormOverlapSummary(payload, medicationPlans, editingPlanId);

  if (summary && overlapAction === "skip") {
    return { medicationPlans, skipped: true };
  }

  if (editingPlanId) {
    if (
      summary &&
      overlapAction === "force_add" &&
      !plansMatchSchedule(summary.primaryPlan, item)
    ) {
      let nextPlans = medicationPlans.map((plan) => {
        if (plan.id === summary.primaryPlan.id) {
          return { ...plan, times: mergeOverlappingPlanTimes(plan, item) };
        }
        return plan;
      });

      if (editingPlanId !== summary.primaryPlan.id) {
        nextPlans = nextPlans.filter((plan) => plan.id !== editingPlanId);
      } else {
        nextPlans = nextPlans.map((plan) =>
          plan.id === editingPlanId ? { ...plan, ...payload } : plan
        );
      }

      return { medicationPlans: nextPlans, skipped: false };
    }

    return {
      medicationPlans: medicationPlans.map((plan) =>
        plan.id === editingPlanId ? { ...plan, ...payload } : plan
      ),
      skipped: false,
    };
  }

  if (
    summary &&
    overlapAction === "force_add" &&
    !plansMatchSchedule(summary.primaryPlan, item)
  ) {
    return {
      medicationPlans: medicationPlans.map((plan) =>
        plan.id === summary.primaryPlan.id
          ? { ...plan, times: mergeOverlappingPlanTimes(plan, item) }
          : plan
      ),
      skipped: false,
    };
  }

  return {
    medicationPlans: [...medicationPlans, { id: newPlanId, ...payload }],
    skipped: false,
  };
}
