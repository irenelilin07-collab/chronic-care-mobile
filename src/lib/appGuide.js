import { dateKeyFromDate, buildTasksForDate, isIntakeTaken } from "./dailySchedule.js";
import { getTaskTimingStatus } from "./overdueCheckin.js";
import { TABS } from "./storage.js";

const TASK_STEP_IDS = [
  "diseases",
  "medicine",
  "plan",
  "checkin",
  "smart-add-text",
  "smart-add-voice",
];

export const SMART_ADD_GUIDE_IDS = ["smart-add-text", "smart-add-voice"];

/** 引导文字输入示例（追加库存，避免与已有计划冲突） */
export const GUIDE_CAPTURE_DEMO_TEXT = "氨氯地平库存加10片";

/** 智能添加引导时，面板滚动区底部留白（引导条 + 内嵌确认按钮） */
export const GUIDE_SMART_ADD_SCROLL_PADDING =
  "calc(12.5rem + env(safe-area-inset-bottom))";

/** 智能添加引导时，面板底部为引导条 + TabBar 预留空间 */
export const GUIDE_SMART_ADD_PANEL_BOTTOM =
  "calc(11.5rem + 56px + env(safe-area-inset-bottom))";

export function isSmartAddGuideStep(stepId) {
  return SMART_ADD_GUIDE_IDS.includes(stepId);
}

export const APP_GUIDE_STEPS = [
  {
    id: "welcome",
    title: "欢迎使用",
    description: "跟着高亮提示操作几步，就能上手。",
    tab: null,
    optional: false,
  },
  {
    id: "diseases",
    title: "确诊慢病",
    description: "点高亮区域，选择慢病。",
    tab: TABS.profile,
    highlight: "guide-diseases",
    optional: false,
    completeWhen: (state) => (state.profile?.chronicDiseases || []).length > 0,
    completeLabel: "已填写",
  },
  {
    id: "medicine",
    title: "添加药品",
    description: "点高亮按钮，填写药名和总量。",
    tab: TABS.inventory,
    highlight: "guide-add-medicine",
    optional: false,
    completeWhen: (state) => (state.medicines || []).length > 0,
    completeLabel: "已添加",
  },
  {
    id: "plan",
    title: "用药计划",
    description: "点右上角管理，新建今日可打卡的计划。",
    tab: TABS.today,
    highlight: "guide-add-plan",
    optional: false,
    // 仅有计划不够：必须能在今日看板生成任务，否则用户会看到空状态却以为已完成
    completeWhen: (state) => {
      const todayKey = dateKeyFromDate(new Date());
      return (
        buildTasksForDate(
          todayKey,
          state.medicationPlans || [],
          state.medicines || []
        ).length > 0
      );
    },
    completeLabel: "已创建",
  },
  {
    id: "checkin",
    title: "今日打卡",
    description: "点高亮卡片，完成任意一次打卡。",
    tab: TABS.today,
    highlight: "guide-checkin",
    optional: false,
    completeWhen: (state) => hasTodayValidCheckIn(state),
    completeLabel: "已打卡",
  },
  {
    id: "smart-add-text",
    title: "智能添加",
    description: "示例已填好，点「识别并预览」。",
    previewDescription: "核对结果后，点「下一步」。",
    tab: TABS.today,
    highlight: "guide-capture-parse",
    optional: false,
    completeLabel: "已识别",
  },
  {
    id: "smart-add-voice",
    title: "语音添加",
    description: "按住「语音识别」，再点「识别并预览」。",
    previewDescription: "核对结果后，点「下一步」。",
    tab: TABS.today,
    highlight: "guide-capture-parse",
    optional: true,
    completeLabel: "已识别",
  },
  {
    id: "done",
    title: "可以开始用了",
    description: "需要时点左上角「?」，可再看一遍。",
    tab: TABS.today,
    optional: false,
  },
];

export function getGuideStep(stepIndex) {
  return APP_GUIDE_STEPS[stepIndex] || null;
}

export function getGuideStepCount() {
  return APP_GUIDE_STEPS.length;
}

export function isGuideTaskStep(step) {
  return TASK_STEP_IDS.includes(step?.id);
}

export function getGuideTaskProgress(step) {
  if (!step || !isGuideTaskStep(step)) return null;
  return {
    current: TASK_STEP_IDS.indexOf(step.id) + 1,
    total: TASK_STEP_IDS.length,
  };
}

export function getGuideStepDescription(step, completed, captureGuideProgress = {}) {
  if (!step) return "";
  // 完成后只靠绿色勾 Chip +「下一步」，不再重复长文案
  if (completed && isGuideTaskStep(step)) return "";
  if (step.id === "smart-add-text" && captureGuideProgress.textParsed && step.previewDescription) {
    return step.previewDescription;
  }
  if (step.id === "smart-add-voice" && captureGuideProgress.voiceParsed && step.previewDescription) {
    return step.previewDescription;
  }
  return step.description || "";
}

export function isGuideStepComplete(step, state) {
  if (!step?.completeWhen) return true;
  return step.completeWhen(state);
}

export function hasTodayCheckIn(state) {
  const todayKey = dateKeyFromDate(new Date());
  const records = state.intakeRecords || {};
  return Object.entries(records).some(
    ([key, value]) => value === "taken" && key.startsWith(`${todayKey}|`)
  );
}

/** 引导用：今日至少完成一次「未过期」任务的打卡（过期任务不算） */
export function hasTodayValidCheckIn(state) {
  const todayKey = dateKeyFromDate(new Date());
  const tasks = buildTasksForDate(
    todayKey,
    state.medicationPlans || [],
    state.medicines || []
  );
  if (tasks.length === 0) return false;

  return tasks.some((task) => {
    if (getTaskTimingStatus(task, state.intakeRecords) === "expired") return false;
    return isIntakeTaken(state.intakeRecords, task.dateKey, task.planId, task.time);
  });
}

export function hasTodayAllCheckIns(state) {
  const todayKey = dateKeyFromDate(new Date());
  const tasks = buildTasksForDate(
    todayKey,
    state.medicationPlans || [],
    state.medicines || []
  );
  if (tasks.length === 0) return true;
  return tasks.every((task) =>
    isIntakeTaken(state.intakeRecords, task.dateKey, task.planId, task.time)
  );
}

export function shouldAutoStartGuide(state, { role } = {}) {
  // 管理员协助管理，不自动打断；仍可通过顶栏「?」手动打开
  if (role === "admin") return false;
  const onboarding = state.onboarding || {};
  if (onboarding.status === "completed" || onboarding.status === "skipped") {
    return false;
  }
  return (state.medicationPlans || []).length === 0;
}

export function guideHighlightClass(highlightId, activeHighlight) {
  if (!highlightId || highlightId !== activeHighlight) return "";
  return "guide-highlight";
}

export function getSmartAddGuidePhase(stepId) {
  if (stepId === "smart-add-text") return "text";
  if (stepId === "smart-add-voice") return "voice";
  return null;
}

export function computeGuideCanAdvance(step, state, captureGuideProgress = {}) {
  if (!step) return false;
  switch (step.id) {
    case "smart-add-text":
      return Boolean(captureGuideProgress.textParsed);
    case "smart-add-voice":
      return Boolean(captureGuideProgress.voiceParsed);
    default:
      return isGuideStepComplete(step, state);
  }
}
