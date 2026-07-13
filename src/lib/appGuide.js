import { dateKeyFromDate, buildTasksForDate, isIntakeTaken } from "./dailySchedule.js";
import { TABS } from "./storage.js";

const TASK_STEP_IDS = [
  "diseases",
  "medicine",
  "plan",
  "reminder",
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
    title: "欢迎使用慢病用药小管家",
    description:
      "接下来会带您使用 App 的真实功能：录入慢病、添加药品、创建计划、完成打卡，并体验智能添加。",
    tab: null,
    optional: false,
  },
  {
    id: "diseases",
    title: "填写确诊慢病",
    description: "请点击页面中高亮的「确诊慢病」，选择您的慢病类型。",
    completedDescription: "慢病信息已保存，点击「下一步」继续。",
    tab: TABS.profile,
    highlight: "guide-diseases",
    optional: false,
    completeWhen: (state) => (state.profile?.chronicDiseases || []).length > 0,
    completeLabel: "已填写慢病信息",
  },
  {
    id: "medicine",
    title: "添加药品到药箱",
    description: "请点击页面中高亮的「添加药品」，录入药物名称、规格和库存。",
    completedDescription: "药品已添加，点击「下一步」继续。",
    tab: TABS.inventory,
    highlight: "guide-add-medicine",
    optional: false,
    completeWhen: (state) => (state.medicines || []).length > 0,
    completeLabel: "已添加药品",
  },
  {
    id: "plan",
    title: "创建用药计划",
    description: "请点击页面中高亮的按钮，设置每日服药时间与规则。",
    completedDescription: "用药计划已创建，点击「下一步」继续。",
    tab: TABS.today,
    highlight: "guide-add-plan",
    optional: false,
    completeWhen: (state) => (state.medicationPlans || []).length > 0,
    completeLabel: "已创建用药计划",
  },
  {
    id: "reminder",
    title: "开启用药提醒",
    description:
      "点击下方「开启用药提醒」按钮，或在页面中高亮处打开开关。浏览器会请求通知权限，请选择「允许」。",
    completedDescription: "提醒已开启，点击「下一步」继续。",
    tab: TABS.profile,
    highlight: "guide-reminder",
    optional: true,
    completeWhen: (state) => Boolean(state.settings?.medicationReminder?.enabled),
    completeLabel: "已开启提醒",
  },
  {
    id: "checkin",
    title: "完成今日打卡",
    description: "请点击页面中高亮的用药任务卡片完成打卡，直至今日全部任务打卡完成。",
    completedDescription: "今日用药已全部打卡，点击「下一步」继续。",
    tab: TABS.today,
    highlight: "guide-checkin",
    optional: false,
    completeWhen: (state) => {
      const todayKey = dateKeyFromDate(new Date());
      const tasks = buildTasksForDate(
        todayKey,
        state.medicationPlans || [],
        state.medicines || []
      );
      if (tasks.length === 0) return true;
      return hasTodayAllCheckIns(state);
    },
    completeLabel: "已完成打卡",
  },
  {
    id: "smart-add-text",
    title: "智能添加：文字输入",
    description:
      "已在输入框填入示例文字。请点击高亮的「识别并预览」，浏览识别结果后点「下一步」继续。",
    previewDescription: "请浏览上方识别结果，确认无误后点「下一步」继续。",
    completedDescription: "已看到识别预览，点击「下一步」继续。",
    tab: TABS.today,
    highlight: "guide-capture-parse",
    optional: false,
    completeLabel: "已完成文字识别",
  },
  {
    id: "smart-add-voice",
    title: "智能添加：语音输入",
    description:
      "请按住「按住说话」录入，例如：「每天早饭后吃一片氨氯地平」。录完后点击高亮的「识别并预览」查看结果，再点「下一步」。也可点「跳过」。",
    previewDescription: "请浏览上方识别结果，确认无误后点「下一步」继续。",
    completedDescription: "已完成语音识别预览，点击「下一步」继续。",
    tab: TABS.today,
    highlight: "guide-capture-parse",
    optional: true,
    completeLabel: "已完成语音识别",
  },
  {
    id: "done",
    title: "引导完成",
    description: "您已掌握 App 的核心用法。随时点击左上角「?」可重新查看引导。",
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
  if (completed && step.completedDescription) return step.completedDescription;
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

export function shouldAutoStartGuide(state) {
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

