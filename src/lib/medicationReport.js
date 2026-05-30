import {
  addDays,
  buildTasksForDate,
  computeRangeProgress,
  dateKeyFromDate,
  formatDateKeyLabel,
  formatDateRangeLabel,
  listDateKeysInRange,
} from "./dailySchedule.js";
import {
  formatPlanPeriod,
  formatPlanRule,
  planMedicineLabel,
  planMedicineMeta,
} from "./medicationPlan.js";
import {
  formatSpec,
  formatStockDaysLabel,
  stockLevel,
  stockUnitOf,
} from "./medicine.js";
import {
  ageFromBirthYear,
  genderLabel,
  normalizeProfile,
} from "./profile.js";
import {
  adverseEntriesInRange,
  attributionLabel,
  formatAdverseOccurredAt,
  severityLabel,
} from "./journalEntry.js";

function formatReportTime(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text || "未填写";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionTitle(title) {
  return `<h2 style="margin:24px 0 12px;padding:8px 12px;background:#e8faf4;color:#00a87a;font-size:15px;font-weight:600;border-radius:8px;">${escapeHtml(title)}</h2>`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:8px 12px;width:28%;color:#666;border-bottom:1px solid #f0f0f0;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;color:#333;border-bottom:1px solid #f0f0f0;">${escapeHtml(displayValue(value))}</td>
  </tr>`;
}

function infoTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">${rows.join("")}</table>`;
}

function emptyText(text) {
  return `<p style="margin:0;color:#999;font-size:13px;">${escapeHtml(text)}</p>`;
}

function summaryCard(title, value, desc = "") {
  return `<div style="flex:1;min-width:160px;padding:14px 12px;background:#f6fffb;border:1px solid #d4f0e6;border-radius:10px;">
    <p style="margin:0 0 6px;font-size:12px;color:#00a87a;">${escapeHtml(title)}</p>
    <p style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;">${escapeHtml(value)}</p>
    ${desc ? `<p style="margin:6px 0 0;font-size:12px;color:#999;">${escapeHtml(desc)}</p>` : ""}
  </div>`;
}

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

export function buildMedicationReportHtml(state, { startDateKey, endDateKey }) {
  const profile = normalizeProfile(state.profile);
  const medicines = state.medicines || [];
  const medicationPlans = state.medicationPlans || [];
  const intakeRecords = state.intakeRecords || {};
  const journalEntries = state.journalEntries || [];

  const rangeKeys = listDateKeysInRange(startDateKey, endDateKey);
  const rangeProgress = computeRangeProgress(
    rangeKeys,
    medicationPlans,
    medicines,
    intakeRecords
  );
  const rangeLabel = formatDateRangeLabel(startDateKey, endDateKey);

  const emergencyContact = [
    profile.emergencyContact.name,
    profile.emergencyContact.relation,
    profile.emergencyContact.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  const userSection = infoTable([
    infoRow("称呼", profile.nickname),
    infoRow("性别", genderLabel(profile.gender) || "未填写"),
    infoRow(
      "年龄",
      ageFromBirthYear(profile.birthYear) !== null
        ? `${ageFromBirthYear(profile.birthYear)} 岁`
        : ""
    ),
    infoRow(
      "确诊慢病",
      profile.chronicDiseases.length > 0 ? profile.chronicDiseases.join("、") : ""
    ),
    infoRow(
      "药物过敏史",
      profile.drugAllergies.length > 0 ? profile.drugAllergies.join("、") : ""
    ),
    infoRow("紧急联系人", emergencyContact),
  ]);

  const missedIntakes = buildMissedIntakes(
    rangeKeys,
    medicationPlans,
    medicines,
    intakeRecords
  );

  const adverseEntries = adverseEntriesInRange(journalEntries, startDateKey, endDateKey);

  function relatedMedicineNames(relatedMedicineIds) {
    if (!relatedMedicineIds.length) return "—";
    const names = relatedMedicineIds
      .map((id) => medicines.find((medicine) => medicine.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join("、") : "—";
  }

  let adverseSection = "";
  if (adverseEntries.length === 0) {
    adverseSection = emptyText("统计时段内暂无不适记录");
  } else {
    adverseSection = `<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">日期</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">发生时间</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">症状</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">程度</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">与用药关系</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">关联药品</th>
        </tr>
      </thead>
      <tbody>
        ${adverseEntries
          .map((entry) => {
            const reaction = entry.adverseReaction;
            const symptoms =
              reaction.symptoms.length > 0 ? reaction.symptoms.join("、") : "—";
            const remark = reaction.remark
              ? `<p style="margin:4px 0 0;font-size:11px;color:#999;">备注：${escapeHtml(reaction.remark)}</p>`
              : "";
            return `<tr>
            <td style="padding:8px 10px;color:#333;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(formatDateKeyLabel(entry.dateKey))}</td>
            <td style="padding:8px 10px;color:#666;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(formatAdverseOccurredAt(reaction.occurredAt))}</td>
            <td style="padding:8px 10px;color:#333;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(symptoms)}${remark}</td>
            <td style="padding:8px 10px;color:#666;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(severityLabel(reaction.severity))}</td>
            <td style="padding:8px 10px;color:#666;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(attributionLabel(reaction.attributionType))}</td>
            <td style="padding:8px 10px;color:#666;border-bottom:1px solid #f5f5f5;vertical-align:top;">${escapeHtml(relatedMedicineNames(reaction.relatedMedicineIds))}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
  }

  const completionSection = `<div style="display:flex;gap:12px;flex-wrap:wrap;">
    ${summaryCard("服药完成率", `${rangeProgress.percent}%`, `已完成 ${rangeProgress.done}/${rangeProgress.total} 次`)}
    ${summaryCard("漏服次数", `${Math.max(rangeProgress.total - rangeProgress.done, 0)} 次`, rangeProgress.total > 0 ? "按计划任务统计" : "统计时段内暂无用药任务")}
  </div>`;

  let missedSection = "";
  if (rangeProgress.total === 0) {
    missedSection = emptyText("统计时段内暂无用药任务");
  } else if (missedIntakes.length === 0) {
    missedSection = emptyText("统计时段内暂无漏服记录");
  } else {
    missedSection = `<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">日期</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">时间</th>
          <th style="padding:8px 10px;text-align:left;color:#999;border-bottom:1px solid #eee;">漏服药品</th>
        </tr>
      </thead>
      <tbody>
        ${missedIntakes
          .map((item) => `<tr>
            <td style="padding:8px 10px;color:#333;border-bottom:1px solid #f5f5f5;">${escapeHtml(formatDateKeyLabel(item.dateKey))}</td>
            <td style="padding:8px 10px;color:#666;border-bottom:1px solid #f5f5f5;">${escapeHtml(item.time)}</td>
            <td style="padding:8px 10px;color:#ff4d4f;border-bottom:1px solid #f5f5f5;">${escapeHtml(`${item.medicineName}${item.dose ? `（${item.dose}）` : ""}`)}</td>
          </tr>`)
          .join("")}
      </tbody>
    </table>`;
  }

  let inventorySection = "";
  if (medicines.length === 0) {
    inventorySection = emptyText("暂无药品记录");
  } else {
    inventorySection = medicines
      .map((medicine, index) => {
        const level = stockLevel(medicine, medicationPlans);
        const levelLabel =
          level === "low" ? "库存紧张" : level === "mid" ? "库存偏低" : "库存充足";
        const levelColor =
          level === "low" ? "#ff4d4f" : level === "mid" ? "#faad14" : "#00a87a";
        return `<div style="margin-bottom:12px;padding:12px;border:1px solid #f0f0f0;border-radius:8px;background:#fafafa;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#333;">${index + 1}. ${escapeHtml(medicine.name)}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#666;">规格：${escapeHtml(formatSpec(medicine))} · 单次 ${escapeHtml(medicine.dose)}</p>
          <p style="margin:0 0 4px;font-size:12px;color:${levelColor};">剩余：${escapeHtml(String(medicine.stock))}${escapeHtml(stockUnitOf(medicine))} · ${escapeHtml(formatStockDaysLabel(medicine, medicationPlans))}</p>
          <p style="margin:0;font-size:12px;color:#999;">状态：${escapeHtml(levelLabel)}</p>
        </div>`;
      })
      .join("");
  }

  let planSection = "";
  if (medicationPlans.length === 0) {
    planSection = `<p style="margin:0;color:#999;font-size:13px;">暂无用药计划</p>`;
  } else {
    planSection = medicationPlans
      .map((plan, index) => {
        const meta = planMedicineMeta(plan, medicines);
        return `<div style="margin-bottom:12px;padding:12px;border:1px solid #f0f0f0;border-radius:8px;background:#fafafa;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#333;">${index + 1}. ${escapeHtml(planMedicineLabel(plan, medicines))}</p>
          ${meta ? `<p style="margin:0 0 4px;font-size:12px;color:#666;">${escapeHtml(meta)}</p>` : ""}
          <p style="margin:0 0 4px;font-size:12px;color:#666;">规则：${escapeHtml(formatPlanRule(plan))}</p>
          <p style="margin:0;font-size:12px;color:#666;">周期：${escapeHtml(formatPlanPeriod(plan))}</p>
        </div>`;
      })
      .join("");
  }

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#333;padding:28px 24px 32px;max-width:720px;line-height:1.5;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">慢病用药报告</h1>
    <p style="margin:0 0 4px;font-size:12px;color:#999;">生成时间：${escapeHtml(formatReportTime())}</p>
    <p style="margin:0;font-size:12px;color:#999;">统计时段：${escapeHtml(rangeLabel)}</p>
    ${sectionTitle("一、用户信息")}
    ${userSection}
    ${sectionTitle(`二、${rangeLabel} 服药完成率`)}
    ${completionSection}
    ${sectionTitle("三、漏服记录")}
    ${missedSection}
    ${sectionTitle("四、不适记录")}
    ${adverseSection}
    ${sectionTitle("五、药品库存")}
    ${inventorySection}
    ${sectionTitle("六、当前用药清单")}
    ${planSection}
    <p style="margin:28px 0 0;text-align:center;font-size:12px;color:#ccc;">—— 报告结束 ——</p>
  </div>`;
}

export async function exportMedicationReportPdf(state, { startDateKey, endDateKey }) {
  if (!startDateKey || !endDateKey || startDateKey > endDateKey) {
    throw new Error("Invalid date range");
  }

  const html = buildMedicationReportHtml(state, { startDateKey, endDateKey });
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "720px";
  container.innerHTML = html;
  document.body.appendChild(container);

  const filename = `用药报告-${startDateKey}_${endDateKey}.pdf`;

  try {
    const { default: html2pdf } = await import("html2pdf.js");
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(container.firstElementChild)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

// 兼容旧调用：默认最近 7 天 PDF
export async function exportMedicationReport(state) {
  const endDateKey = dateKeyFromDate(new Date());
  const startDateKey = addDays(endDateKey, -6);
  return exportMedicationReportPdf(state, { startDateKey, endDateKey });
}
