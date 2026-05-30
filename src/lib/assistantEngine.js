import { formatDateKeyLabel } from "./dailySchedule.js";
import {
  buildAssistantContext,
  resolveRelatedMedicineNames,
} from "./assistantContext.js";

export const ASSISTANT_DISCLAIMER =
  "以上内容基于您 App 内的记录整理，仅供参考，不能替代医生或药师建议。如有不适请及时就医。";

export const QUICK_PROMPTS = [
  { id: "today-guide", label: "今天还有哪些药要吃？", group: "medication" },
  { id: "week-summary", label: "这周用药完成得怎么样？", group: "medication" },
  { id: "missed-summary", label: "最近漏服了几次？", group: "medication" },
  { id: "stock-summary", label: "药箱库存还够吗？", group: "medication" },
  { id: "adverse-summary", label: "最近的不适记录", group: "health" },
  { id: "followup-prep", label: "复诊前帮我整理情况", group: "health" },
  { id: "missed-dose-tip", label: "漏服一次怎么办？", group: "medication", useLlm: true },
  { id: "chronic-tips", label: "慢病日常要注意什么？", group: "health", useLlm: true },
];

const PROMPT_HANDLERS = {
  "today-guide": answerTodayGuide,
  "week-summary": answerWeekSummary,
  "missed-summary": answerMissedSummary,
  "stock-summary": answerStockSummary,
  "adverse-summary": answerAdverseSummary,
  "followup-prep": answerFollowupPrep,
};

export function buildWelcomeMessage(context) {
  const name = context.profile.nickname || "您";
  const diseaseHint =
    context.profile.chronicDiseases.length > 0
      ? `已记录 ${context.profile.chronicDiseases.join("、")} 等慢病信息。`
      : "完善档案后，我可以结合您的慢病与过敏史回答。";

  return `你好，${name}！我是用药助手，可以帮你解读${context.dateLabel}的用药情况，以及最近的健康记录。\n\n${diseaseHint}\n\n点击下方快捷问题，或直接输入健康与用药相关问题（开放问题将使用 AI 结合您的档案回答）。`;
}

export function tryRuleAnswer(state, question, { promptId } = {}) {
  const context = buildAssistantContext(state);
  const trimmed = String(question || "").trim();
  const prompt = QUICK_PROMPTS.find((item) => item.id === promptId);

  if (prompt?.useLlm) return null;

  if (promptId && PROMPT_HANDLERS[promptId]) {
    return withDisclaimer(PROMPT_HANDLERS[promptId](context));
  }

  const text = trimmed;

  if (matchIntent(text, ["今天", "还剩", "哪些药", "待服", "没吃"])) {
    return withDisclaimer(answerTodayGuide(context));
  }
  if (matchIntent(text, ["这周", "本周", "完成率", "完成得怎么样", "吃得怎么样"])) {
    return withDisclaimer(answerWeekSummary(context));
  }
  if (
    matchIntent(text, ["漏服", "忘记", "漏吃", "没打卡"]) &&
    !isAdviceQuestion(text)
  ) {
    return withDisclaimer(answerMissedSummary(context));
  }
  if (matchIntent(text, ["库存", "还能吃", "药箱", "剩余", "续药"]) && !isAdviceQuestion(text)) {
    return withDisclaimer(answerStockSummary(context));
  }
  if (
    matchIntent(text, ["不适", "症状", "不良反应", "头晕", "恶心"]) &&
    !isAdviceQuestion(text)
  ) {
    return withDisclaimer(answerAdverseSummary(context));
  }
  if (matchIntent(text, ["复诊", "医生", "整理", "口述", "给医生"])) {
    return withDisclaimer(answerFollowupPrep(context));
  }
  if (matchIntent(text, ["过敏", "慢病", "档案"]) && matchIntent(text, ["摘要", "我的", "查看"])) {
    return withDisclaimer(answerProfileSummary(context));
  }

  if (!trimmed) {
    return withDisclaimer(answerFallback(context));
  }

  return null;
}

export function answerAssistantQuestion(state, question, options = {}) {
  const ruleAnswer = tryRuleAnswer(state, question, options);
  if (ruleAnswer) return ruleAnswer;

  const context = buildAssistantContext(state);
  return withDisclaimer(
    `我暂时还无法离线回答「${String(question || "").trim()}」。请配置 AI 服务后直接提问，或使用快捷问题。\n\n${answerFallback(context, false)}`
  );
}

function matchIntent(text, keywords) {
  return keywords.some((word) => text.includes(word));
}

/** 用户在求建议/处置，应走 AI 而非本地数据摘要 */
function isAdviceQuestion(text) {
  return matchIntent(text, [
    "怎么办",
    "如何",
    "该怎么",
    "应该",
    "要注意",
    "该注意",
    "怎么处理",
    "什么原因",
    "为什么",
    "正常吗",
    "要紧吗",
    "严重吗",
  ]);
}

export function withDisclaimer(body) {
  return `${body}\n\n---\n${ASSISTANT_DISCLAIMER}`;
}

function answerTodayGuide(context) {
  const { pending, done, progress, tasks } = context.today;

  if (tasks.length === 0) {
    return `${context.dateLabel}没有安排用药任务。可以在「管理用药计划」中添加计划。`;
  }

  const lines = [
    `【${context.dateLabel}用药指引】`,
    `进度：已完成 ${progress.done}/${progress.total}（${progress.percent}%）`,
    "",
  ];

  if (done.length > 0) {
    lines.push("✅ 已服用：");
    for (const task of done) {
      lines.push(`· ${task.time} ${task.medicineName}${task.dose ? `（${task.dose}）` : ""}`);
    }
    lines.push("");
  }

  if (pending.length > 0) {
    lines.push("⏳ 待服用：");
    for (const task of pending) {
      lines.push(`· ${task.time} ${task.medicineName}${task.dose ? `（${task.dose}）` : ""}`);
    }
  } else {
    lines.push("🎉 今天的用药任务已全部完成！");
  }

  return lines.join("\n");
}

function answerWeekSummary(context) {
  const { progress, missed } = context.week;
  const rangeLabel = `${formatDateKeyLabel(context.week.startKey)} - ${formatDateKeyLabel(context.week.endKey)}`;

  if (progress.total === 0) {
    return `近 7 天（${rangeLabel}）没有用药任务记录。`;
  }

  const lines = [
    "【近 7 天用药情况】",
    `统计时段：${rangeLabel}`,
    `完成率：${progress.percent}%（${progress.done}/${progress.total} 次）`,
    `漏服：${missed.length} 次`,
  ];

  if (progress.percent >= 90) {
    lines.push("", "坚持得很好，请继续保持规律用药。");
  } else if (progress.percent >= 70) {
    lines.push("", "整体还不错，留意漏服的时间点，尽量固定提醒。");
  } else {
    lines.push("", "完成率偏低，建议检查提醒设置，或把用药时间固定在早/中/晚。");
  }

  return lines.join("\n");
}

function answerMissedSummary(context) {
  const { missed } = context.week;

  if (context.week.progress.total === 0) {
    return "近 7 天没有用药任务，暂无漏服统计。";
  }

  if (missed.length === 0) {
    return "【漏服统计】\n\n近 7 天没有漏服记录，很棒！";
  }

  const lines = [
    `【漏服统计】近 7 天共漏服 ${missed.length} 次：`,
    "",
  ];

  const preview = missed.slice(0, 8);
  for (const item of preview) {
    lines.push(
      `· ${formatDateKeyLabel(item.dateKey)} ${item.time} ${item.medicineName}`
    );
  }

  if (missed.length > preview.length) {
    lines.push(`· … 还有 ${missed.length - preview.length} 次`);
  }

  return lines.join("\n");
}

function answerStockSummary(context) {
  if (context.stockItems.length === 0) {
    return "药箱还没有药品。添加药品并关联用药计划后，我可以估算剩余天数。";
  }

  const lines = ["【药箱库存】", ""];

  for (const item of context.stockItems) {
    lines.push(`· ${item.name}：${item.stockLabel}`);
  }

  const lowItems = context.stockItems.filter(
    (item) => item.stockLabel.includes("已用完") || item.stockLabel.includes("约可用")
  );

  if (lowItems.some((item) => item.stockLabel.includes("已用完"))) {
    lines.push("", "⚠️ 有药品库存已用完，请尽快补充。");
  } else if (
    lowItems.some((item) => {
      const match = item.stockLabel.match(/约可用 (\d+)/);
      return match && Number(match[1]) <= 7;
    })
  ) {
    lines.push("", "⚠️ 部分药品剩余不足 7 天，建议提前续药。");
  }

  return lines.join("\n");
}

function answerAdverseSummary(context) {
  const { adverse } = context.week;

  if (adverse.length === 0) {
    return "【不适记录】\n\n近 7 天暂无不适记录。如有不适，可在「设置 → 记录不适」中保存。";
  }

  const lines = [`【不适记录】近 7 天共 ${adverse.length} 次：`, ""];

  for (const item of adverse.slice(0, 6)) {
    const related = resolveRelatedMedicineNames(context, item.relatedMedicineIds);
    lines.push(
      `· ${item.occurredAt || formatDateKeyLabel(item.dateKey)}`,
      `  症状：${item.symptoms || "未填写"}（${item.severity}）`,
      `  与用药关系：${item.attribution}${related.length ? `，关联：${related.join("、")}` : ""}`
    );
    if (item.remark) {
      lines.push(`  补充：${item.remark}`);
    }
    lines.push("");
  }

  if (adverse.length > 6) {
    lines.push(`… 还有 ${adverse.length - 6} 条记录，可在导出报告中查看完整内容。`);
  }

  lines.push("如症状反复或加重，请及时联系医生。");

  return lines.join("\n");
}

function answerFollowupPrep(context) {
  const { progress, missed, adverse } = context.week;
  const appt = context.upcomingAppointments[0];

  const lines = ["【复诊口述摘要】", ""];

  if (appt) {
    lines.push(
      `📅 即将复诊：${appt.disease}，${appt.dateLabel}（${appt.hospital}），还有 ${appt.daysUntil} 天。`,
      ""
    );
  }

  const profileParts = [];
  if (context.profile.chronicDiseases.length) {
    profileParts.push(`确诊：${context.profile.chronicDiseases.join("、")}`);
  }
  if (context.profile.drugAllergies.length) {
    profileParts.push(`过敏史：${context.profile.drugAllergies.join("、")}`);
  }
  if (profileParts.length) {
    lines.push(`1. ${profileParts.join("；")}`);
  } else {
    lines.push("1. 档案信息尚未完善，建议补充慢病与过敏史。");
  }

  if (context.week.progress.total > 0) {
    lines.push(
      `2. 近 7 天用药完成率 ${context.week.progress.percent}%，漏服 ${missed.length} 次。`
    );
  } else {
    lines.push("2. 近 7 天暂无用药打卡数据。");
  }

  if (adverse.length > 0) {
    const latest = adverse[adverse.length - 1];
    lines.push(
      `3. 近期不适 ${adverse.length} 次，最近：${latest.symptoms}（${latest.severity}，${latest.occurredAt || latest.dateKey}）。`
    );
  } else {
    lines.push("3. 近 7 天未记录不适。");
  }

  lines.push("", "💡 以上可直接口述给医生，详细数据可在「设置 → 导出用药报告」下载 PDF。");

  return lines.join("\n");
}

function answerProfileSummary(context) {
  const { profile } = context;
  const lines = ["【健康档案摘要】", ""];

  const basic = [profile.nickname];
  if (profile.gender) basic.push(profile.gender);
  if (profile.age !== null) basic.push(`${profile.age} 岁`);
  lines.push(`· 基本信息：${basic.join(" · ")}`);

  lines.push(
    `· 确诊慢病：${profile.chronicDiseases.length ? profile.chronicDiseases.join("、") : "未填写"}`,
    `· 药物过敏：${profile.drugAllergies.length ? profile.drugAllergies.join("、") : "未填写"}`
  );

  if (profile.drugAllergies.length) {
    lines.push("", "⚠️ 涉及用药问题时，我会优先参考您的过敏史。");
  }

  return lines.join("\n");
}

export function answerFallback(context, includeIntro = true) {
  const intro = includeIntro
    ? "我可以帮你解答这些方面的问题：\n"
    : "您可以问我：\n";

  return (
    intro +
    [
      "· 今天还有哪些药要吃？",
      "· 这周用药完成得怎么样？",
      "· 最近漏服了几次？",
      "· 药箱库存还够吗？",
      "· 最近的不适记录",
      "· 复诊前帮我整理情况",
      "· 漏服一次怎么办？",
      "· 慢病日常要注意什么？",
    ].join("\n")
  );
}
