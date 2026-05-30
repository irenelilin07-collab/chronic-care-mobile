import { formatDateKeyLabel } from "./dailySchedule.js";
import { resolveRelatedMedicineNames } from "./assistantContext.js";

export function serializeAssistantContext(context) {
  const lines = [];

  const { profile, dateLabel, today, week, stockItems, upcomingAppointments } = context;

  lines.push(`称呼：${profile.nickname || "用户"}`);
  if (profile.gender) lines.push(`性别：${profile.gender}`);
  if (profile.age !== null) lines.push(`年龄：${profile.age} 岁`);
  lines.push(
    `确诊慢病：${profile.chronicDiseases.length ? profile.chronicDiseases.join("、") : "未填写"}`,
    `药物过敏史：${profile.drugAllergies.length ? profile.drugAllergies.join("、") : "未填写"}`
  );

  lines.push("", `【${dateLabel}用药】`);
  if (today.tasks.length === 0) {
    lines.push("今日无用药任务");
  } else {
    lines.push(`进度：${today.progress.done}/${today.progress.total}（${today.progress.percent}%）`);
    if (today.pending.length) {
      lines.push(
        "待服：" +
          today.pending
            .map((t) => `${t.time} ${t.medicineName}${t.dose ? `(${t.dose})` : ""}`)
            .join("；")
      );
    }
    if (today.done.length) {
      lines.push(
        "已服：" +
          today.done
            .map((t) => `${t.time} ${t.medicineName}`)
            .join("；")
      );
    }
  }

  lines.push("", "【近7天】");
  lines.push(
    `用药完成率：${week.progress.percent}%（${week.progress.done}/${week.progress.total}）`,
    `漏服：${week.missed.length} 次`
  );

  if (week.adverse.length) {
    lines.push(`不适记录：${week.adverse.length} 次`);
    for (const item of week.adverse.slice(-3)) {
      const related = resolveRelatedMedicineNames(context, item.relatedMedicineIds);
      lines.push(
        `- ${item.occurredAt || formatDateKeyLabel(item.dateKey)} ${item.symptoms}（${item.severity}，${item.attribution}${related.length ? `，关联${related.join("、")}` : ""}）`
      );
    }
  } else {
    lines.push("不适记录：无");
  }

  if (stockItems.length) {
    lines.push("", "【药箱库存】");
    for (const item of stockItems) {
      lines.push(`- ${item.name}：${item.stockLabel}`);
    }
  }

  if (upcomingAppointments.length) {
    lines.push("", "【复诊计划】");
    for (const item of upcomingAppointments) {
      lines.push(`- ${item.disease} ${item.dateLabel} ${item.hospital}（${item.daysUntil}天后）`);
    }
  }

  const medicineNames = (context.medicines || []).map((m) => m.name).filter(Boolean);
  if (medicineNames.length) {
    lines.push("", `当前药箱药品：${medicineNames.join("、")}`);
  }

  return lines.join("\n");
}

export function buildSystemPrompt(contextText) {
  return `你是「慢病用药小管家」App 内的 AI 用药助手，专门回答用户的健康状况与用药相关问题。

【用户档案与 App 记录摘要】
${contextText}

【必须遵守】
1. 优先依据上方摘要中的事实回答；摘要没有的不要编造用户数据。
2. 药物过敏史必须优先考虑，涉及过敏药物一律提醒避免使用并建议咨询医生/药师。
3. 你不是医生：不得诊断疾病、不得建议自行增减药量、停药或换药。
4. 不得对药物相互作用给出「一定可以/绝对不可以同服」的最终结论；可给一般性提示并建议咨询专业人士。
5. 涉及急症（如胸痛、呼吸困难、意识不清等）必须建议立即就医或拨打 120。
6. 用简体中文，语气温和，结构清晰，适当分点，控制在 300 字以内（除非用户需要详细列表）。
7. 若问题超出健康/用药范围，礼貌说明你的职责范围并引导用户使用 App 快捷问题。`;
}
