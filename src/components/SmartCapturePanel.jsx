import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { TIME_PRESETS } from "../lib/medicationPlan.js";
import { searchMedicineNames } from "../lib/medicineCatalog.js";
import { formatDose, parseDose, unitFromDose } from "../lib/medicine.js";
import { matchMedicineFromCatalog } from "../lib/smartCapture/catalogResolver.js";
import {
  applyCaptureDraft,
  getAppointmentDraftIssue,
  getAppointmentFieldIssues,
  getMedicineDraftFieldIssues,
  getMedicineDraftIssue,
  validateAppointmentDrafts,
  validateMedicineDrafts,
} from "../lib/smartCapture/draftToPayload.js";
import { enrichMedicineDrafts, resolveMedicineDraft } from "../lib/smartCapture/enrichMedicineDraft.js";
import {
  findMedicineInInventory,
  getPlanInventoryStatusHint,
  getStockOnlyInventoryHint,
} from "../lib/smartCapture/inventoryMatch.js";
import {
  formatPlanOverlapDetail,
  formatPlanOverlapWarning,
  getDraftPlanOverlapSummary,
} from "../lib/smartCapture/planDuplicate.js";
import { parseCaptureText } from "../lib/smartCapture/parseCaptureText.js";
import {
  createVoiceRecognizer,
  isVoiceInputSupported,
} from "../lib/voiceInput.js";

const DOSE_AMOUNT_PRESETS = ["1", "2", "0.5", "1.5"];
const UNIT_PRESETS = ["片", "粒", "颗", "袋", "支"];
const STOCK_AMOUNT_PRESETS = ["30", "60", "90"];

const CAPTURE_INPUT_EXAMPLES = [
  {
    badge: "用药",
    badgeTone: "brand",
    example: "每天早饭后吃一片氨氯地平",
  },
  {
    badge: "库存",
    badgeTone: "brand",
    example: "氨氯地平库存加100片",
  },
  {
    badge: "复诊",
    badgeTone: "blue",
    example: "6月15号去市第一医院复查高血压",
  },
];

/** 确认卡统一字号：标题 15px / 正文与控件 13px / 辅助说明 13px 灰色 */
const captureTitleClass = "text-[15px] font-semibold leading-snug text-[#1a1a1a]";
const captureLabelClass = "mb-1.5 text-[13px] font-medium text-[#999]";
const captureHintClass = "mt-1.5 text-[13px] leading-5 text-[#999]";
const captureInputClass =
  "w-full rounded-lg border border-[#eee] bg-[#fafafa] px-3 py-2 text-[13px] text-[#333] outline-none transition-colors focus:border-[#00c896] focus:bg-white";

const fieldInvalidWrapClass = "rounded-lg ring-2 ring-[#ff4d4f]";
const fieldInvalidInputClass = "border-[#ff4d4f] focus:border-[#ff4d4f]";

const inputClass = captureInputClass;
const captureGuideTextClass = "text-[13px] leading-5";

function CaptureInputGuide() {
  return (
    <div className="rounded-xl border border-[#eef2f0] bg-[#f8faf9] px-3.5 py-3">
      <p className={`${captureGuideTextClass} font-semibold text-[#333]`}>
        粘贴医嘱，或按住下方按钮说话
      </p>
      <p className={`${captureGuideTextClass} mt-1 text-[#999]`}>支持一次识别多项内容</p>
      <ul className="mt-3 space-y-2">
        {CAPTURE_INPUT_EXAMPLES.map((item) => {
          const badgeClass =
            item.badgeTone === "blue"
              ? "bg-[#eef4ff] text-[#4a7fc1]"
              : "bg-[#e8faf4] text-[#00a87a]";

          return (
            <li
              key={item.badge}
              className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2"
            >
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-medium ${badgeClass}`}
              >
                {item.badge}
              </span>
              <p className={`min-w-0 flex-1 ${captureGuideTextClass} text-[#666]`}>
                {item.example}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SectionLabel({ children, warn = false }) {
  return (
    <p className={`${captureLabelClass} flex items-center gap-1`}>
      {children}
      {warn ? (
        <span
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff4d4f] text-[10px] font-bold leading-none text-white"
          aria-label="必填"
        >
          !
        </span>
      ) : null}
    </p>
  );
}

function ChipButton({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[30px] rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-[#00c896] text-white"
          : "bg-[#f5f6f8] text-[#666] active:bg-[#eee]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SegmentedOption({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
        active ? "bg-white text-[#00a87a] shadow-sm" : "text-[#666]"
      }`}
    >
      {children}
    </button>
  );
}

function CaptureCard({
  badge,
  badgeTone = "brand",
  title,
  onRemove,
  canRemove,
  children,
}) {
  const badgeClass =
    badgeTone === "blue"
      ? "bg-[#eef4ff] text-[#4a7fc1]"
      : "bg-[#e8faf4] text-[#00a87a]";

  return (
    <div className="app-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3.5 py-2.5">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-medium ${badgeClass}`}
        >
          {badge}
        </span>
        <div className="min-w-0 flex-1">{title}</div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-[13px] text-[#bbb] active:text-[#999]"
          >
            删除
          </button>
        ) : null}
      </div>
      <div className="space-y-3 px-3.5 py-3">{children}</div>
    </div>
  );
}

function CaptureConfirmFooter({ onReinput, onConfirm }) {
  return (
    <div className="border-t border-[#eee] bg-[#f5f6f8] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReinput}
          className="rounded-lg bg-white py-2.5 text-[13px] font-medium text-[#666] shadow-sm"
        >
          重新输入
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-[#00c896] py-2.5 text-[13px] font-semibold text-white"
        >
          确认添加
        </button>
      </div>
    </div>
  );
}

function FieldBlock({ label, hint, invalid = false, warn = false, children }) {
  return (
    <div>
      <SectionLabel warn={warn}>{label}</SectionLabel>
      <div className={invalid ? fieldInvalidWrapClass : undefined}>{children}</div>
      {hint ? <p className={captureHintClass}>{hint}</p> : null}
    </div>
  );
}

function InventoryStatusBanner({ children }) {
  return (
    <p className="rounded-lg bg-[#f5f6f8] px-3 py-2 text-[13px] leading-5 text-[#666]">
      {children}
    </p>
  );
}

function StockAmountRow({
  value,
  unit,
  onChange,
  presets = STOCK_AMOUNT_PRESETS,
  invalid = false,
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        invalid ? `${fieldInvalidWrapClass} p-1.5` : ""
      }`}
    >
      <input
        className={`${captureInputClass} max-w-[88px] text-center`}
        type="number"
        min="1"
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="数量"
      />
      <span className="text-[13px] text-[#999]">{unit}</span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((amount) => (
          <ChipButton
            key={amount}
            active={value === amount}
            onClick={() => onChange(amount)}
          >
            {amount}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function getDoseParts(item) {
  const parsed = parseDose(item.dose);
  return {
    amount: parsed.doseAmount || "1",
    unit: parsed.doseUnit || item.specUnit || unitFromDose(item.dose) || "片",
  };
}

function getAllTimeOptions(item) {
  const selected = item.times || [];
  const extras = selected.filter((time) => !TIME_PRESETS.includes(time));
  return [...TIME_PRESETS, ...extras];
}

function DraftItemCard({
  item,
  medicines,
  medicationPlans,
  onChange,
  onRemove,
  canRemove,
  showValidation,
}) {
  const [nameQuery, setNameQuery] = useState(item.name);
  const customTimeRef = useRef(null);
  const suggestions = searchMedicineNames(nameQuery);
  const doseParts = getDoseParts(item);
  const timeOptions = getAllTimeOptions(item);
  const existingMedicine = findMedicineInInventory(medicines, item);
  const overlapSummary = getDraftPlanOverlapSummary(item, medicines, medicationPlans);
  const stockUnit = doseParts.unit || item.specUnit || "片";
  const fieldIssues = showValidation ? getMedicineDraftFieldIssues(item) : null;

  useEffect(() => {
    setNameQuery(item.name);
  }, [item.name]);

  function update(patch) {
    onChange(resolveMedicineDraft({ ...item, ...patch }, medicines, medicationPlans));
  }

  function applyCatalogMatch(name) {
    const matched = matchMedicineFromCatalog(name);
    const parts = parseDose(matched.dose || item.dose);
    update({
      name: matched.name,
      rawName: name,
      specAmount: matched.specAmount || item.specAmount,
      specUnit: matched.specUnit || item.specUnit,
      spec: matched.spec || item.spec,
      dose: matched.dose || item.dose,
      catalogMatch: matched.catalogMatch,
      warnings: matched.catalogMatch ? [] : item.warnings,
    });
    if (!parts.doseAmount && matched.dose) {
      // dose already set via matched.dose
    }
  }

  function updateDose(amount, unit = doseParts.unit) {
    const nextUnit = unit || doseParts.unit || "片";
    update({
      dose: formatDose(amount, nextUnit),
      specUnit: nextUnit,
    });
  }

  function toggleTime(time) {
    const current = item.times || [];
    const next = current.includes(time)
      ? current.filter((entry) => entry !== time)
      : [...current, time];
    if (next.length === 0) return;
    update({
      times: [...next].sort(),
      mealHints: [],
    });
  }

  function addCustomTime(rawValue) {
    if (!rawValue) return;
    const [hour, minute] = rawValue.split(":");
    const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    const current = item.times || [];
    if (current.includes(time)) return;
    update({
      times: [...current, time].sort(),
      mealHints: [],
    });
  }

  return (
    <div id={`capture-draft-${item.id}`}>
      <CaptureCard
        badge={item.captureMode === "stock_only" ? "库存" : "用药"}
        canRemove={canRemove}
        onRemove={onRemove}
        title={
          <>
            <input
              className={`${captureTitleClass} w-full border-0 bg-transparent p-0 outline-none placeholder:text-[#ccc]`}
              value={nameQuery}
              onChange={(e) => {
                setNameQuery(e.target.value);
                update({ name: e.target.value, rawName: e.target.value });
              }}
              onBlur={() => {
                if (nameQuery.trim()) applyCatalogMatch(nameQuery.trim());
              }}
              placeholder="药品名称"
            />
            {suggestions.length > 0 && nameQuery && nameQuery !== suggestions[0] ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {suggestions.slice(0, 4).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setNameQuery(name);
                      applyCatalogMatch(name);
                    }}
                    className="rounded-md bg-[#f5f6f8] px-2 py-0.5 text-[13px] text-[#00a87a]"
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
            {item.warnings?.length ? (
              <p className="mt-1 text-[13px] leading-5 text-[#e67e22]">
                {item.warnings.join("；")}
              </p>
            ) : null}
          </>
        }
      >
        {item.captureMode === "stock_only" ? (
          <>
            <InventoryStatusBanner>
              {getStockOnlyInventoryHint(existingMedicine)}
            </InventoryStatusBanner>
            <FieldBlock
              label={existingMedicine ? "追加数量" : "药箱数量"}
              warn={fieldIssues?.stockAmount}
            >
              <StockAmountRow
                value={item.stockAmount}
                unit={stockUnit}
                onChange={(value) => update({ stockAmount: value })}
                invalid={fieldIssues?.stockAmount}
              />
            </FieldBlock>
          </>
        ) : (
          <>
            <InventoryStatusBanner>
              {getPlanInventoryStatusHint(item, existingMedicine)}
            </InventoryStatusBanner>

            {item.inventoryMode === "existing" && existingMedicine ? (
              <FieldBlock
                label="药箱"
                warn={fieldIssues?.stockAction || fieldIssues?.stockAmount}
              >
                <div
                  className={`mb-2 flex rounded-lg bg-[#eef1f3] p-0.5 ${
                    fieldIssues?.stockAction ? fieldInvalidWrapClass : ""
                  }`}
                >
                  <SegmentedOption
                    active={item.stockAction === "add_stock"}
                    onClick={() => update({ stockAction: "add_stock" })}
                  >
                    追加库存
                  </SegmentedOption>
                  <SegmentedOption
                    active={item.stockAction === "plan_only"}
                    onClick={() => update({ stockAction: "plan_only", stockAmount: "" })}
                  >
                    仅加计划
                  </SegmentedOption>
                </div>
                {item.stockAction === "add_stock" ? (
                  <StockAmountRow
                    value={item.stockAmount}
                    unit={stockUnit}
                    onChange={(value) => update({ stockAmount: value })}
                    invalid={fieldIssues?.stockAmount}
                  />
                ) : null}
              </FieldBlock>
            ) : (
              <FieldBlock label="药箱数量" warn={fieldIssues?.stockAmount}>
                <StockAmountRow
                  value={item.stockAmount}
                  unit={stockUnit}
                  onChange={(value) => update({ stockAmount: value })}
                  invalid={fieldIssues?.stockAmount}
                />
              </FieldBlock>
            )}

            <FieldBlock label="单次剂量" invalid={fieldIssues?.dose}>
              <div className="flex flex-wrap items-center gap-1.5">
                {DOSE_AMOUNT_PRESETS.map((amount) => {
                  const active = doseParts.amount === amount;
                  return (
                    <ChipButton
                      key={amount}
                      active={active}
                      onClick={() => updateDose(amount, doseParts.unit)}
                    >
                      {amount}
                    </ChipButton>
                  );
                })}
                <span className="text-[13px] text-[#ccc]">|</span>
                <input
                  className="w-11 rounded-lg border border-[#eee] bg-[#fafafa] px-1.5 py-1.5 text-center text-[13px] text-[#333] outline-none focus:border-[#00c896]"
                  value={doseParts.amount}
                  onChange={(e) => updateDose(e.target.value, doseParts.unit)}
                  placeholder="1"
                />
                {UNIT_PRESETS.map((unit) => (
                  <ChipButton
                    key={unit}
                    active={doseParts.unit === unit}
                    onClick={() => updateDose(doseParts.amount, unit)}
                    className="min-w-[30px] px-2"
                  >
                    {unit}
                  </ChipButton>
                ))}
              </div>
            </FieldBlock>

            <FieldBlock label="服药时间" invalid={fieldIssues?.times}>
              <div className="flex flex-wrap gap-1.5">
                {timeOptions.map((time) => (
                  <ChipButton
                    key={time}
                    active={item.times?.includes(time)}
                    onClick={() => toggleTime(time)}
                  >
                    {time}
                  </ChipButton>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    customTimeRef.current?.showPicker?.() || customTimeRef.current?.click()
                  }
                  className="min-h-[30px] rounded-lg border border-dashed border-[#ddd] px-2.5 text-[13px] text-[#999]"
                >
                  + 自定义
                </button>
                <input
                  ref={customTimeRef}
                  type="time"
                  className="sr-only"
                  onChange={(e) => addCustomTime(e.target.value)}
                />
              </div>
            </FieldBlock>

            {overlapSummary ? (
              <p className="rounded-lg bg-[#fff7e6] px-3 py-2 text-[13px] leading-5 text-[#e67e22]">
                {formatPlanOverlapWarning(overlapSummary)}
              </p>
            ) : null}
          </>
        )}
      </CaptureCard>
    </div>
  );
}
function AppointmentDraftCard({ item, onChange, onRemove, canRemove, showValidation }) {
  function update(patch) {
    onChange({ ...item, ...patch });
  }

  const fieldIssues = showValidation ? getAppointmentFieldIssues(item) : null;

  return (
    <div id={`capture-draft-${item.id}`}>
      <CaptureCard
        badge="复诊"
        badgeTone="blue"
        canRemove={canRemove}
        onRemove={onRemove}
        title={
          <p className={captureTitleClass}>{item.disease || "复诊计划"}</p>
        }
      >
        <FieldBlock label="目标疾病">
          <input
            className={`${inputClass} ${fieldIssues?.disease ? fieldInvalidInputClass : ""}`}
            value={item.disease}
            onChange={(e) => update({ disease: e.target.value })}
            placeholder="如：高血压"
          />
        </FieldBlock>
        <FieldBlock label="复诊日期">
          <input
            type="date"
            className={`${inputClass} ${fieldIssues?.date ? fieldInvalidInputClass : ""}`}
            value={item.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </FieldBlock>
        <FieldBlock label="医院">
          <input
            className={`${inputClass} ${fieldIssues?.hospital ? fieldInvalidInputClass : ""}`}
            value={item.hospital}
            onChange={(e) => update({ hospital: e.target.value })}
            placeholder="医院名称"
          />
        </FieldBlock>
        <FieldBlock label="医生">
          <input
            className={inputClass}
            value={item.doctor}
            onChange={(e) => update({ doctor: e.target.value })}
            placeholder="选填"
          />
        </FieldBlock>
        {item.warnings?.length ? (
          <p className="text-[13px] leading-5 text-[#e67e22]">{item.warnings.join("；")}</p>
        ) : null}
      </CaptureCard>
    </div>
  );
}

export default function SmartCaptureView({
  active = true,
  medicines,
  medicationPlans,
  appointments,
  profile,
  onMedicinesChange,
  onPlansChange,
  onAppointmentsChange,
  onSuccess,
  onFooterChange,
}) {
  const [step, setStep] = useState("input");
  const [text, setText] = useState("");
  const [draftItems, setDraftItems] = useState([]);
  const [appointmentDrafts, setAppointmentDrafts] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [riskConfirmOpen, setRiskConfirmOpen] = useState(false);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const recognizerRef = useRef(null);
  const handleConfirmRef = useRef(() => {});
  const pendingDraftItemsRef = useRef(null);

  const profileHint = (profile?.chronicDiseases || []).join("、");
  const voiceSupported = isVoiceInputSupported();

  useEffect(() => {
    if (!active) return;
    setStep("input");
    setText("");
    setDraftItems([]);
    setAppointmentDrafts([]);
    setParsing(false);
    setError("");
    setListening(false);
    setRiskConfirmOpen(false);
    setDuplicateConfirmOpen(false);
    setShowValidation(false);
  }, [active]);

  useEffect(() => {
    return () => {
      try {
        recognizerRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  function stopListening() {
    try {
      recognizerRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
  }

  function startListening() {
    if (!voiceSupported || listening) return;
    const recognizer = createVoiceRecognizer({
      onResult: (transcript, isFinal) => {
        if (transcript) setText(transcript);
        if (isFinal) stopListening();
      },
      onError: () => {
        setError("语音识别失败，请改用粘贴输入。");
        stopListening();
      },
      onEnd: () => setListening(false),
    });
    if (!recognizer) {
      setError("当前浏览器不支持语音输入，请粘贴用药说明。");
      return;
    }
    recognizerRef.current = recognizer;
    setError("");
    setListening(true);
    recognizer.start();
  }

  async function handleParse() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("请先输入或说出要添加的内容。");
      return;
    }
    setParsing(true);
    setError("");
    try {
      const result = await parseCaptureText(trimmed, { profileHint });
      if (!result.medicines?.length && !result.appointments?.length) {
        setError(result.clarify || "未能识别可添加的内容，请换一种说法试试。");
        setStep("input");
        return;
      }
      setDraftItems(enrichMedicineDrafts(result.medicines || [], medicines, medicationPlans));
      setAppointmentDrafts(result.appointments || []);
      setShowValidation(false);
      setStep("confirm");
    } catch {
      setError("识别失败，请检查网络后重试。");
    } finally {
      setParsing(false);
    }
  }

  function buildSuccessTitle(result) {
    const stockOnly =
      result.stockUpdates?.length > 0 &&
      !result.createdMedicines.length &&
      !result.planOnlyMedicines?.length;
    if (stockOnly) return "追加库存成功";
    const hasMedicine =
      result.createdMedicines.length > 0 ||
      result.stockUpdates?.length > 0 ||
      result.planOnlyMedicines?.length > 0;
    if (hasMedicine) return "添加药品成功";
    if (result.createdAppointments.length > 0) return "添加复诊成功";
    return "添加成功";
  }

  function buildSuccessMessage(result) {
    const parts = [];
    if (result.createdMedicines.length) {
      parts.push(`已添加药品：${result.createdMedicines.join("、")}`);
    }
    if (result.stockUpdates?.length) {
      parts.push(
        `已追加库存：${result.stockUpdates
          .map((entry) => `${entry.name} +${entry.amount}`)
          .join("、")}`
      );
    }
    if (result.planOnlyMedicines?.length) {
      parts.push(`已添加用药计划：${result.planOnlyMedicines.join("、")}`);
    }
    if (result.skippedDuplicatePlans?.length) {
      parts.push(
        `以下用药计划与已有计划重复，已跳过：${result.skippedDuplicatePlans.join("、")}`
      );
    }
    if (result.createdAppointments.length) {
      parts.push(`已添加复诊：${result.createdAppointments.join("、")}`);
    }
    return parts.join("\n") || "已保存识别结果。";
  }

  function resetCaptureForm() {
    setStep("input");
    setText("");
    setDraftItems([]);
    setAppointmentDrafts([]);
    setShowValidation(false);
    setError("");
    onFooterChange?.(null);
  }

  function applyDuplicatePlanAction(items, action) {
    return items.map((item) =>
      item.duplicateExistingPlanId ? { ...item, duplicatePlanAction: action } : item
    );
  }

  function buildDuplicateConfirmMessage(items) {
    const lines = items
      .filter((item) => item.duplicateExistingPlanId)
      .map((item) => {
        const summary = getDraftPlanOverlapSummary(item, medicines, medicationPlans);
        return `${item.name}：${formatPlanOverlapDetail(summary)}`;
      });
    return `以下用药计划与已有计划重合，是否仍要添加？\n\n${lines.join("\n")}`;
  }

  function finalizeCommit(items) {
    if (items.some((item) => item.needsExtraConfirm)) {
      pendingDraftItemsRef.current = items;
      setRiskConfirmOpen(true);
      return;
    }
    commitDraft(items);
  }

  function commitDraft(items = pendingDraftItemsRef.current || draftItems) {
    pendingDraftItemsRef.current = null;
    const result = applyCaptureDraft(
      medicines,
      medicationPlans,
      items,
      appointments,
      appointmentDrafts
    );
    onMedicinesChange(result.medicines);
    onPlansChange(result.medicationPlans);
    onAppointmentsChange?.(result.appointments);
    const payload = {
      title: buildSuccessTitle(result),
      message: buildSuccessMessage(result),
    };
    resetCaptureForm();
    onSuccess?.(payload);
  }

  function scrollToDraftItem(itemId) {
    window.requestAnimationFrame(() => {
      document
        .getElementById(`capture-draft-${itemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleConfirm() {
    if (!draftItems.length && !appointmentDrafts.length) return;
    setShowValidation(true);

    const medicineError = validateMedicineDrafts(draftItems);
    if (medicineError) {
      const firstBad = draftItems.find((item) => getMedicineDraftIssue(item));
      if (firstBad) scrollToDraftItem(firstBad.id);
      return;
    }
    const appointmentError = validateAppointmentDrafts(appointmentDrafts);
    if (appointmentError) {
      const firstBad = appointmentDrafts.find((item) => getAppointmentDraftIssue(item));
      if (firstBad) scrollToDraftItem(firstBad.id);
      return;
    }
    const needsRiskConfirm = draftItems.some((item) => item.needsExtraConfirm);
    const hasDuplicatePlans = draftItems.some((item) => item.duplicateExistingPlanId);
    if (hasDuplicatePlans) {
      setDuplicateConfirmOpen(true);
      return;
    }
    if (needsRiskConfirm) {
      setRiskConfirmOpen(true);
      return;
    }
    commitDraft();
  }

  handleConfirmRef.current = handleConfirm;

  const handleReinput = useCallback(() => {
    setShowValidation(false);
    setStep("input");
  }, []);

  useEffect(() => {
    if (!active || step !== "confirm") {
      onFooterChange?.(null);
      return undefined;
    }

    onFooterChange?.(
      <CaptureConfirmFooter
        onReinput={handleReinput}
        onConfirm={() => handleConfirmRef.current()}
      />
    );

    return () => onFooterChange?.(null);
  }, [active, step, handleReinput, onFooterChange]);

  const totalDraftCount = draftItems.length + appointmentDrafts.length;
  const completedDraftCount =
    draftItems.filter((item) => !getMedicineDraftIssue(item)).length +
    appointmentDrafts.filter((item) => !getAppointmentDraftIssue(item)).length;

  return (
    <>
      {step === "input" ? (
        <div className="space-y-4">
          <CaptureInputGuide />

          <textarea
            className={`${inputClass} min-h-[128px] resize-none leading-6`}
            placeholder="粘贴（或输入）文本"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {voiceSupported ? (
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                startListening();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                startListening();
              }}
              onTouchEnd={stopListening}
              onMouseUp={stopListening}
              onMouseLeave={listening ? stopListening : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                listening
                  ? "bg-[#00c896] text-white"
                  : "bg-white text-[#00a87a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {listening ? "◉" : "🎤"}
              </span>
              {listening ? "正在聆听… 松开结束" : "按住说话"}
            </button>
          ) : null}

          {error ? (
            <div className="rounded-xl bg-[#fff8f0] px-3 py-2.5 text-sm leading-6 text-[#e67e22]">{error}</div>
          ) : null}

          <button
            type="button"
            disabled={parsing}
            onClick={handleParse}
            className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.3)] disabled:opacity-50"
          >
            {parsing ? "识别中…" : "识别并预览"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#ffe8cc] bg-[#fffaf3] px-3 py-2.5">
            <p className="text-[15px] font-semibold text-[#1a1a1a]">
              识别到 {totalDraftCount} 项，请核对后添加
            </p>
            <p className={`${captureHintClass} mt-1`}>
              已完成 {completedDraftCount}/{totalDraftCount} 项
            </p>
          </div>

          <div className="space-y-3 pb-4">
            {draftItems.map((item) => (
              <DraftItemCard
                key={item.id}
                item={item}
                medicines={medicines}
                medicationPlans={medicationPlans}
                showValidation={showValidation}
                canRemove={totalDraftCount > 1}
                onChange={(next) =>
                  setDraftItems((prev) =>
                    prev.map((entry) => (entry.id === item.id ? next : entry))
                  )
                }
                onRemove={() =>
                  setDraftItems((prev) => prev.filter((entry) => entry.id !== item.id))
                }
              />
            ))}
            {appointmentDrafts.map((item) => (
              <AppointmentDraftCard
                key={item.id}
                item={item}
                canRemove={totalDraftCount > 1}
                showValidation={showValidation}
                onChange={(next) =>
                  setAppointmentDrafts((prev) =>
                    prev.map((entry) => (entry.id === item.id ? next : entry))
                  )
                }
                onRemove={() =>
                  setAppointmentDrafts((prev) => prev.filter((entry) => entry.id !== item.id))
                }
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={duplicateConfirmOpen}
        title="用药计划已存在"
        message={buildDuplicateConfirmMessage(draftItems)}
        cancelText="跳过"
        confirmText="仍要添加"
        onCancel={() => {
          setDuplicateConfirmOpen(false);
          finalizeCommit(applyDuplicatePlanAction(draftItems, "skip"));
        }}
        onConfirm={() => {
          setDuplicateConfirmOpen(false);
          finalizeCommit(applyDuplicatePlanAction(draftItems, "force_add"));
        }}
      />

      <ConfirmDialog
        open={riskConfirmOpen}
        title="请仔细核对"
        message="该药品涉及较高用药风险，请确认剂量与医嘱一致后再添加。如有疑问请咨询医生或药师。"
        cancelText="返回修改"
        confirmText="确认添加"
        onCancel={() => {
          pendingDraftItemsRef.current = null;
          setRiskConfirmOpen(false);
        }}
        onConfirm={() => {
          setRiskConfirmOpen(false);
          commitDraft();
        }}
      />

    </>
  );
}
