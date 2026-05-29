import {
  addDays,
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
  stockUnitOf,
} from "./medicine.js";
import {
  ageFromBirthYear,
  genderLabel,
  normalizeProfile,
} from "./profile.js";

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

export function buildMedicationReportHtml(state, { startDateKey, endDateKey }) {
  const profile = normalizeProfile(state.profile);
  const medicines = state.medicines || [];
  const medicationPlans = state.medicationPlans || [];
  const intakeRecords = state.intakeRecords || {};

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

  let inventorySection = "";
  if (medicines.length === 0) {
    inventorySection = `<p style="margin:0;color:#999;font-size:13px;">暂无药品记录</p>`;
  } else {
    inventorySection = medicines
      .map((medicine, index) => {
        return `<div style="margin-bottom:12px;padding:12px;border:1px solid #f0f0f0;border-radius:8px;background:#fafafa;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#333;">${index + 1}. ${escapeHtml(medicine.name)}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#666;">规格：${escapeHtml(formatSpec(medicine))} · 单次 ${escapeHtml(medicine.dose)}</p>
          <p style="margin:0;font-size:12px;color:#666;">剩余：${escapeHtml(String(medicine.stock))}${escapeHtml(stockUnitOf(medicine))} · ${escapeHtml(formatStockDaysLabel(medicine, medicationPlans))}</p>
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

  const dailyRows = rangeKeys
    .map((dateKey) => {
      const dayProgress = computeRangeProgress(
        [dateKey],
        medicationPlans,
        medicines,
        intakeRecords
      );
      const label = formatDateKeyLabel(dateKey);
      const detail =
        dayProgress.total === 0
          ? "无用药任务"
          : `${dayProgress.done}/${dayProgress.total} 次（${dayProgress.percent}%）`;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;color:#666;font-size:12px;">${escapeHtml(label)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;color:#333;font-size:12px;text-align:right;">${escapeHtml(detail)}</td>
      </tr>`;
    })
    .join("");

  const intakeSection = `<div style="margin-bottom:8px;padding:10px 12px;background:#e8faf4;border-radius:8px;font-size:13px;color:#00a87a;">
    完成度：${rangeProgress.percent}%（已完成 ${rangeProgress.done}/${rangeProgress.total} 次）
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="padding:6px 10px;text-align:left;font-size:12px;color:#999;border-bottom:1px solid #eee;">日期</th>
        <th style="padding:6px 10px;text-align:right;font-size:12px;color:#999;border-bottom:1px solid #eee;">服药情况</th>
      </tr>
    </thead>
    <tbody>${dailyRows}</tbody>
  </table>`;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#333;padding:28px 24px 32px;max-width:720px;line-height:1.5;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">慢病用药报告</h1>
    <p style="margin:0 0 4px;font-size:12px;color:#999;">生成时间：${escapeHtml(formatReportTime())}</p>
    <p style="margin:0;font-size:12px;color:#999;">统计时段：${escapeHtml(rangeLabel)}</p>
    ${sectionTitle("一、用户信息")}
    ${userSection}
    ${sectionTitle("二、药箱库存")}
    ${inventorySection}
    ${sectionTitle("三、用药计划")}
    ${planSection}
    ${sectionTitle(`四、${rangeLabel} 服药情况`)}
    ${intakeSection}
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
