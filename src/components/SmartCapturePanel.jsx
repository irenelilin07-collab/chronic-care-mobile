import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import CustomTimeAddChip from "./CustomTimeAddChip.jsx";
import PlanPeriodEndField from "./PlanPeriodEndField.jsx";
import StockAmountField from "./StockAmountField.jsx";
import {
  RULE_TYPES,
  TIME_PRESETS,
  WEEKDAYS,
  todaysDefaultDate,
} from "../lib/medicationPlan.js";
import { formatDose, parseDose, stockUnitOf, unitFromDose } from "../lib/medicine.js";
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
import { GUIDE_CAPTURE_DEMO_TEXT } from "../lib/appGuide.js";
import {
  createVoiceRecognizer,
  isVoiceInputSupported,
} from "../lib/voiceInput.js";

const DOSE_AMOUNT_PRESETS = ["1", "2", "0.5", "1.5", "3"];
const UNIT_PRESETS = ["片", "粒", "颗", "袋", "支"];

function getAssistantScrollRoot() {
  return document.querySelector("[data-assistant-scroll]");
}

function scrollAssistantPanelToTop(behavior = "auto") {
  const scrollRoot = getAssistantScrollRoot();
  if (!scrollRoot) return false;
  scrollRoot.scrollTo({ top: 0, behavior });
  return true;
}

function scrollElementInAssistantPanel(
  elementId,
  { offsetTop = 12, behavior = "smooth" } = {}
) {
  const scrollRoot = getAssistantScrollRoot();
  const target = document.getElementById(elementId);
  if (!scrollRoot || !target) return false;

  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop = scrollRoot.scrollTop + (targetRect.top - rootRect.top) - offsetTop;
  scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior });
  return true;
}

function scrollPreviewIntoAssistantPanel(behavior = "auto") {
  const scrollRoot = getAssistantScrollRoot();
  const previewEl = document.getElementById("guide-capture-preview");
  if (!scrollRoot || !previewEl) return false;

  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = previewEl.getBoundingClientRect();
  const nextTop = scrollRoot.scrollTop + (targetRect.top - rootRect.top) - 8;
  scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior });
  return true;
}

/** 确认卡对齐手动表单：form-title / form-body + 分区分隔 */
const captureTitleClass = "form-title text-[#1a1a1a]";
const captureInputClass =
  "form-body w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-[#333] outline-none transition-colors focus:border-[#00c896]";

const fieldInvalidWrapClass = "rounded-xl ring-2 ring-[#ff4d4f]";
const fieldInvalidInputClass = "border-[#ff4d4f] focus:border-[#ff4d4f]";

const inputClass = captureInputClass;

function SectionTitle({ children, warn = false }) {
  return (
    <p className="form-title mb-2 flex items-center gap-1.5 text-[#1a1a1a]">
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

function FieldSubtitle({ children, className = "" }) {
  return (
    <p className={`form-subtitle mb-1.5 text-[#999] ${className}`.trim()}>{children}</p>
  );
}

function FormSection({ title, warn = false, bordered = false, children }) {
  return (
    <div className={bordered ? "border-t border-[#f0f0f0] pt-3" : ""}>
      {title ? <SectionTitle warn={warn}>{title}</SectionTitle> : null}
      {children}
    </div>
  );
}

function ChipButton({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`form-body min-h-[36px] rounded-xl px-3 font-medium transition-colors ${
        active
          ? "bg-[#00c896] text-white"
          : "bg-[#f5f6f8] text-[#666] active:bg-[#eee]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function TimeChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`form-body shrink-0 rounded-xl px-2.5 py-1.5 ${
        active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
      }`}
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
      className={`form-body flex-1 rounded-lg py-2 font-medium transition-colors ${
        active ? "bg-[#00c896] text-white" : "text-[#666]"
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
    <div className="app-card overflow-hidden px-4 py-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold ${badgeClass}`}
        >
          {badge}
        </span>
        <div className="min-w-0 flex-1">{title}</div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="form-body-muted shrink-0 pt-0.5 active:text-[#666]"
          >
            删除
          </button>
        ) : null}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function CaptureConfirmFooter({ onReinput, onConfirm, embedded = false }) {
  const buttons = (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onReinput}
        className="form-body rounded-xl bg-[#f5f6f8] py-3.5 font-medium text-[#666]"
      >
        清空结果
      </button>
      <button
        type="button"
        id="guide-capture-confirm"
        onClick={onConfirm}
        className="form-body rounded-xl bg-[#00c896] py-3.5 font-semibold text-white"
      >
        确认添加
      </button>
    </div>
  );

  if (embedded) {
    return <div className="pt-1">{buttons}</div>;
  }

  return (
    <div className="border-t border-[#eee] bg-[#f5f6f8] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      {buttons}
    </div>
  );
}

function FieldHint({ children }) {
  return <p className="form-body-muted mb-2">{children}</p>;
}

function getDoseParts(item) {
  const parsed = parseDose(item.dose);
  return {
    amount: parsed.doseAmount || "",
    // 允许清空以便自定义；不强制回退成「片」
    unit: parsed.doseUnit || item.specUnit || unitFromDose(item.dose) || "",
  };
}

function IconEditPen({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.2 4.8a1.8 1.8 0 0 1 2.5 2.5L8.5 16.5 5 17.5l1-3.5L15.2 4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [newTime, setNewTime] = useState("");
  const nameInputRef = useRef(null);
  const doseParts = getDoseParts(item);
  const customTimes = (item.times || []).filter((time) => !TIME_PRESETS.includes(time));
  const existingMedicine = findMedicineInInventory(medicines, item);
  const overlapSummary = getDraftPlanOverlapSummary(item, medicines, medicationPlans);
  const stockUnitLocked = Boolean(existingMedicine);
  // 新药单位可自由输入；用 ?? 避免清空时又回退成「片」
  const stockUnit = stockUnitLocked
    ? stockUnitOf(existingMedicine)
    : item.specUnit ?? doseParts.unit ?? "片";
  const frequency = item.frequency || "daily";
  const fieldIssues = showValidation ? getMedicineDraftFieldIssues(item) : null;
  const visibleWarnings = (item.warnings || []).filter(
    (warning) => !String(warning).includes("目录")
  );

  useEffect(() => {
    setNameQuery(item.name);
  }, [item.name]);

  function update(patch) {
    onChange(resolveMedicineDraft({ ...item, ...patch }, medicines, medicationPlans));
  }

  function updateDose(amount, unit = doseParts.unit) {
    const nextUnit = String(unit ?? doseParts.unit ?? "").trim();
    update({
      dose: formatDose(amount, nextUnit),
      specUnit: nextUnit,
    });
  }

  function updateStockUnit(unit) {
    const nextUnit = String(unit ?? "");
    const patch = { specUnit: nextUnit };
    if (doseParts.amount) {
      patch.dose = formatDose(doseParts.amount, nextUnit.trim());
    }
    update(patch);
  }

  function setFrequency(nextFrequency) {
    update({
      frequency: nextFrequency,
      weekdays: nextFrequency === "weekly" ? item.weekdays || [] : [],
      intervalDays:
        nextFrequency === "interval"
          ? Math.max(2, Number(item.intervalDays) || 2)
          : item.intervalDays || 1,
    });
  }

  function toggleWeekday(day) {
    const current = item.weekdays || [];
    const exists = current.includes(day);
    update({
      weekdays: exists
        ? current.filter((entry) => entry !== day)
        : [...current, day],
    });
  }

  function togglePresetTime(time) {
    const current = item.times || [];
    const next = current.includes(time)
      ? current.filter((entry) => entry !== time)
      : [...current, time];
    update({
      times: [...next].sort(),
      mealHints: [],
    });
  }

  function addCustomTime() {
    if (!newTime) return;
    const current = item.times || [];
    if (current.includes(newTime)) return;
    update({
      times: [...current, newTime].sort(),
      mealHints: [],
    });
    setNewTime("");
  }

  function removeTime(time) {
    update({
      times: (item.times || []).filter((entry) => entry !== time),
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
            <div className="inline-flex max-w-full items-center gap-0.5">
              <input
                ref={nameInputRef}
                size={1}
                className={`${captureTitleClass} max-w-full min-w-0 border-0 bg-transparent p-0 outline-none placeholder:text-[#ccc]`}
                style={{
                  width: `${Math.max([...(nameQuery || "药品名称")].length, 2) + 0.2}em`,
                }}
                value={nameQuery}
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  update({
                    name: e.target.value,
                    rawName: e.target.value,
                    catalogMatch: true,
                    warnings: [],
                  });
                }}
                placeholder="药品名称"
              />
              <button
                type="button"
                className="shrink-0 text-[#c4c8ce] active:text-[#999]"
                aria-label="编辑药名"
                onClick={() => nameInputRef.current?.focus?.()}
              >
                <IconEditPen />
              </button>
            </div>
            {visibleWarnings.length ? (
              <p className="form-body mt-1.5 text-[#e67e22]">{visibleWarnings.join("；")}</p>
            ) : null}
          </>
        }
      >
        {item.captureMode === "stock_only" ? (
          <FormSection
            title={existingMedicine ? "追加库存" : "药箱数量"}
            warn={fieldIssues?.stockAmount || fieldIssues?.stockUnit}
          >
            <FieldHint>{getStockOnlyInventoryHint(existingMedicine)}</FieldHint>
            <StockAmountField
              amount={item.stockAmount}
              unit={stockUnit}
              onAmountChange={(value) => update({ stockAmount: value })}
              onUnitChange={updateStockUnit}
              unitLocked={stockUnitLocked}
              invalid={fieldIssues?.stockAmount || fieldIssues?.stockUnit}
              amountPlaceholder="如：60"
              unitPlaceholder="如：片"
            />
          </FormSection>
        ) : (
          <>
            <FormSection
              title="药箱"
              warn={
                fieldIssues?.stockAction ||
                fieldIssues?.stockAmount ||
                fieldIssues?.stockUnit
              }
            >
              <FieldHint>{getPlanInventoryStatusHint(item, existingMedicine)}</FieldHint>

              {item.inventoryMode === "existing" && existingMedicine ? (
                <>
                  <div
                    className={`rounded-xl border border-[#eee] bg-[#fafafa] p-1 ${
                      fieldIssues?.stockAction ? fieldInvalidWrapClass : ""
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      <SegmentedOption
                        active={item.stockAction === "add_stock"}
                        onClick={() => update({ stockAction: "add_stock" })}
                      >
                        追加库存
                      </SegmentedOption>
                      <SegmentedOption
                        active={item.stockAction === "plan_only"}
                        onClick={() =>
                          update({ stockAction: "plan_only", stockAmount: "" })
                        }
                      >
                        仅加计划
                      </SegmentedOption>
                    </div>
                  </div>
                  {item.stockAction === "add_stock" ? (
                    <div className="mt-3">
                      <StockAmountField
                        amount={item.stockAmount}
                        unit={stockUnit}
                        onAmountChange={(value) => update({ stockAmount: value })}
                        onUnitChange={updateStockUnit}
                        unitLocked
                        invalid={fieldIssues?.stockAmount}
                        amountPlaceholder="如：30"
                        unitPlaceholder="如：片"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <StockAmountField
                  amount={item.stockAmount}
                  unit={stockUnit}
                  onAmountChange={(value) => update({ stockAmount: value })}
                  onUnitChange={updateStockUnit}
                  invalid={fieldIssues?.stockAmount || fieldIssues?.stockUnit}
                  amountPlaceholder="如：60"
                  unitPlaceholder="如：片"
                />
              )}
            </FormSection>

            <FormSection
              title="服药安排"
              bordered
              warn={fieldIssues?.dose || fieldIssues?.times || fieldIssues?.planPeriod}
            >
              <FieldSubtitle>单次剂量</FieldSubtitle>
              <div
                className={`flex flex-wrap items-center gap-2 ${
                  fieldIssues?.dose ? `${fieldInvalidWrapClass} p-1.5` : ""
                }`}
              >
                {DOSE_AMOUNT_PRESETS.map((amount) => (
                  <ChipButton
                    key={amount}
                    active={doseParts.amount === amount}
                    onClick={() => updateDose(amount, doseParts.unit)}
                  >
                    {amount}
                  </ChipButton>
                ))}
                <input
                  className="form-body min-h-[36px] w-[4.5rem] rounded-xl border border-[#eee] bg-[#fafafa] px-2 text-center text-[#333] outline-none placeholder:text-[#c4c8ce] focus:border-[#00c896]"
                  value={
                    DOSE_AMOUNT_PRESETS.includes(doseParts.amount) ? "" : doseParts.amount
                  }
                  onChange={(e) => updateDose(e.target.value, doseParts.unit)}
                  placeholder="自定义"
                  inputMode="decimal"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {UNIT_PRESETS.map((unit) => (
                  <ChipButton
                    key={unit}
                    active={doseParts.unit === unit}
                    onClick={() => updateDose(doseParts.amount, unit)}
                    className="min-w-[40px]"
                  >
                    {unit}
                  </ChipButton>
                ))}
                <input
                  className="form-body min-h-[36px] w-[4.5rem] rounded-xl border border-[#eee] bg-[#fafafa] px-2 text-center text-[#333] outline-none placeholder:text-[#c4c8ce] focus:border-[#00c896]"
                  value={UNIT_PRESETS.includes(doseParts.unit) ? "" : doseParts.unit}
                  onChange={(e) => updateDose(doseParts.amount, e.target.value)}
                  placeholder="自定义"
                />
              </div>

              <FieldSubtitle className="mt-3">频率</FieldSubtitle>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f5f6f8] p-1">
                {RULE_TYPES.map((rule) => (
                  <button
                    key={rule.key}
                    type="button"
                    onClick={() => setFrequency(rule.key)}
                    className={`form-body rounded-xl py-1.5 ${
                      frequency === rule.key ? "bg-[#00c896] text-white" : "text-[#666]"
                    }`}
                  >
                    {rule.label}
                  </button>
                ))}
              </div>

              {frequency === "weekly" ? (
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const active = (item.weekdays || []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWeekday(day.value)}
                        className={`form-body mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${
                          active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {frequency === "interval" ? (
                <div className="mt-2 flex h-10 items-center justify-center rounded-xl bg-[#f5f6f8]">
                  <span className="form-body-muted inline-flex items-center gap-1.5">
                    <span>每</span>
                    <span className="inline-flex h-8 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-[#e2e5ea]">
                      <input
                        className="form-body w-full appearance-none bg-transparent text-center font-medium text-[#00a87a] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min="2"
                        value={item.intervalDays || 2}
                        onChange={(e) =>
                          update({
                            intervalDays: Math.max(2, Number(e.target.value) || 2),
                          })
                        }
                        aria-label="间隔天数"
                      />
                    </span>
                    <span>天一次</span>
                  </span>
                </div>
              ) : null}

              <FieldSubtitle className="mt-3">服药时间</FieldSubtitle>
              <div
                className={`flex items-center gap-2 ${
                  fieldIssues?.times ? `${fieldInvalidWrapClass} p-1.5` : ""
                }`}
              >
                <div className="time-chip-row flex min-w-0 flex-1 items-center gap-2">
                  {TIME_PRESETS.map((time) => (
                    <TimeChip
                      key={time}
                      active={(item.times || []).includes(time)}
                      onClick={() => togglePresetTime(time)}
                    >
                      {time}
                    </TimeChip>
                  ))}
                  {customTimes.map((time) => (
                    <TimeChip key={time} active onClick={() => removeTime(time)}>
                      {time}
                    </TimeChip>
                  ))}
                </div>
                <CustomTimeAddChip
                  value={newTime}
                  onChange={setNewTime}
                  onAdd={addCustomTime}
                />
              </div>

              <FieldSubtitle className="mt-3">服药周期</FieldSubtitle>
              <div className={fieldIssues?.planPeriod ? fieldInvalidWrapClass : undefined}>
                <PlanPeriodEndField
                  startDate={item.startDate || todaysDefaultDate()}
                  longTerm={Boolean(item.longTerm)}
                  endDate={item.endDate || ""}
                  minDate={item.startDate || todaysDefaultDate()}
                  onStartDateChange={(value) => update({ startDate: value })}
                  onChange={(patch) => update(patch)}
                />
              </div>

              {overlapSummary ? (
                <p className="form-body mt-3 rounded-xl bg-[#fff7e6] px-3 py-2.5 leading-5 text-[#e67e22]">
                  {formatPlanOverlapWarning(overlapSummary)}
                </p>
              ) : null}
            </FormSection>
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
        title={<p className={captureTitleClass}>{item.disease || "复诊计划"}</p>}
      >
        <FormSection title="复诊信息" warn={fieldIssues?.disease || fieldIssues?.date}>
          <label className="form-body-muted mb-1 block">目标疾病</label>
          <input
            className={`${inputClass} ${fieldIssues?.disease ? fieldInvalidInputClass : ""}`}
            value={item.disease}
            onChange={(e) => update({ disease: e.target.value })}
            placeholder="如：高血压"
          />
          <label className="form-body-muted mb-1 mt-3 block">复诊日期</label>
          <input
            type="date"
            className={`${inputClass} ${fieldIssues?.date ? fieldInvalidInputClass : ""}`}
            value={item.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </FormSection>

        <FormSection title="就诊地点" bordered warn={fieldIssues?.hospital}>
          <label className="form-body-muted mb-1 block">医院</label>
          <input
            className={`${inputClass} ${fieldIssues?.hospital ? fieldInvalidInputClass : ""}`}
            value={item.hospital}
            onChange={(e) => update({ hospital: e.target.value })}
            placeholder="医院名称"
          />
          <label className="form-body-muted mb-1 mt-3 block">医生</label>
          <input
            className={inputClass}
            value={item.doctor}
            onChange={(e) => update({ doctor: e.target.value })}
            placeholder="选填"
          />
          {item.warnings?.length ? (
            <p className="form-body mt-3 text-[#e67e22]">{item.warnings.join("；")}</p>
          ) : null}
        </FormSection>
      </CaptureCard>
    </div>
  );
}

export default function SmartCaptureView({
  panelOpen = true,
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
  guidePhase = null,
  onGuideCaptureEvent,
}) {
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
  const textareaRef = useRef(null);
  const handleConfirmRef = useRef(() => {});
  const pendingDraftItemsRef = useRef(null);
  const prevGuidePhaseRef = useRef(null);
  const previewDraftRef = useRef({ draftItems: [], appointmentDrafts: [] });
  const previewScrollDoneRef = useRef(false);
  const inputGuideScrollDoneRef = useRef(false);
  const onGuideCaptureEventRef = useRef(onGuideCaptureEvent);

  const totalDraftCount = draftItems.length + appointmentDrafts.length;
  const hasResults = totalDraftCount > 0;

  useEffect(() => {
    onGuideCaptureEventRef.current = onGuideCaptureEvent;
  }, [onGuideCaptureEvent]);

  const profileHint = (profile?.chronicDiseases || []).join("、");
  const voiceSupported = isVoiceInputSupported();

  // 仅在关闭整个助手面板时清空；在「智能添加 / 问答」间切换时保留草稿
  useEffect(() => {
    if (panelOpen) return;
    setText("");
    setDraftItems([]);
    setAppointmentDrafts([]);
    setParsing(false);
    setError("");
    setListening(false);
    setRiskConfirmOpen(false);
    setDuplicateConfirmOpen(false);
    setShowValidation(false);
    prevGuidePhaseRef.current = null;
    previewDraftRef.current = { draftItems: [], appointmentDrafts: [] };
    previewScrollDoneRef.current = false;
    inputGuideScrollDoneRef.current = false;
  }, [panelOpen]);

  useEffect(() => {
    if (active) return;
    stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在切走智能添加时停语音
  }, [active]);

  useEffect(() => {
    if (!hasResults) {
      previewScrollDoneRef.current = false;
    } else {
      inputGuideScrollDoneRef.current = false;
    }
  }, [hasResults]);

  useEffect(() => {
    if (!active || !guidePhase || guidePhase === prevGuidePhaseRef.current) return;
    prevGuidePhaseRef.current = guidePhase;
    setError("");
    stopListening();

    if (guidePhase === "text") {
      setText(GUIDE_CAPTURE_DEMO_TEXT);
      setDraftItems([]);
      setAppointmentDrafts([]);
      previewDraftRef.current = { draftItems: [], appointmentDrafts: [] };
      previewScrollDoneRef.current = false;
      inputGuideScrollDoneRef.current = false;
      onFooterChange?.(null);
      onGuideCaptureEvent?.({ type: "textPreviewReset" });
      window.requestAnimationFrame(() => {
        scrollAssistantPanelToTop("auto");
      });
      return;
    }

    if (guidePhase === "voice") {
      setText("");
      setDraftItems([]);
      setAppointmentDrafts([]);
      previewScrollDoneRef.current = false;
      inputGuideScrollDoneRef.current = false;
      onFooterChange?.(null);
      onGuideCaptureEvent?.({ type: "voicePreviewReset" });
      window.requestAnimationFrame(() => {
        scrollAssistantPanelToTop("auto");
      });
    }
  }, [active, guidePhase, onFooterChange, onGuideCaptureEvent]);

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
        setDraftItems([]);
        setAppointmentDrafts([]);
        previewDraftRef.current = { draftItems: [], appointmentDrafts: [] };
        return;
      }
      const enriched = enrichMedicineDrafts(result.medicines || [], medicines, medicationPlans);
      setDraftItems(enriched);
      setAppointmentDrafts(result.appointments || []);
      previewDraftRef.current = {
        draftItems: enriched,
        appointmentDrafts: result.appointments || [],
      };
      setShowValidation(false);
      previewScrollDoneRef.current = false;
      if (guidePhase === "text") {
        onGuideCaptureEvent?.({ type: "textParsed" });
      }
      if (guidePhase === "voice") {
        onGuideCaptureEvent?.({ type: "voiceParsed" });
      }
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
    setDraftItems([]);
    setAppointmentDrafts([]);
    setError("");
    inputGuideScrollDoneRef.current = false;
    previewScrollDoneRef.current = false;
    onFooterChange?.(null);
    window.requestAnimationFrame(() => {
      scrollAssistantPanelToTop("auto");
      textareaRef.current?.focus?.();
    });
    if (guidePhase === "text") {
      onGuideCaptureEvent?.({ type: "textPreviewReset" });
    } else if (guidePhase === "voice") {
      onGuideCaptureEvent?.({ type: "voicePreviewReset" });
    }
  }, [guidePhase, onGuideCaptureEvent, onFooterChange]);

  useEffect(() => {
    if (!active || !guidePhase || hasResults || inputGuideScrollDoneRef.current) {
      return undefined;
    }

    inputGuideScrollDoneRef.current = true;
    const timer = window.setTimeout(() => {
      scrollAssistantPanelToTop("auto");
    }, 380);

    return () => window.clearTimeout(timer);
  }, [active, guidePhase, hasResults]);

  useLayoutEffect(() => {
    if (!active || !hasResults || previewScrollDoneRef.current) return undefined;

    previewScrollDoneRef.current = true;

    let cancelled = false;
    let seenTimer = null;
    const seenType =
      guidePhase === "text"
        ? "textPreviewSeen"
        : guidePhase === "voice"
          ? "voicePreviewSeen"
          : null;

    function markPreviewSeen() {
      if (!cancelled && seenType) {
        onGuideCaptureEventRef.current?.({ type: seenType });
      }
    }

    const timer = window.setTimeout(() => {
      if (scrollPreviewIntoAssistantPanel("auto")) {
        seenTimer = window.setTimeout(markPreviewSeen, 120);
      } else {
        window.requestAnimationFrame(() => {
          if (scrollPreviewIntoAssistantPanel("auto")) {
            seenTimer = window.setTimeout(markPreviewSeen, 120);
          } else if (seenType) {
            markPreviewSeen();
          }
        });
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (seenTimer) window.clearTimeout(seenTimer);
    };
  }, [active, hasResults, guidePhase, totalDraftCount]);

  useEffect(() => {
    if (!active || !hasResults || guidePhase) {
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
  }, [active, hasResults, guidePhase, handleReinput, onFooterChange]);

  return (
    <>
      <div className="space-y-4">
        <div className="sticky top-0 z-20 overflow-hidden rounded-xl border-2 border-[#8fdcc0] bg-white shadow-[0_4px_12px_rgba(245,246,248,0.95)]">
          <div className="flex items-center gap-2 border-b border-[#eef7f2] px-3.5 py-2.5">
            <svg
              className="h-4 w-4 shrink-0 text-[#00a87a]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 5h8M8 19h8M5 8v8M19 8v8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div className="min-w-0">
              <p className="form-title text-[#00a87a]">智能识别</p>
              <p className="form-body-muted mt-0.5 text-[12px]">
                支持用药、库存、复诊信息的输入和识别
              </p>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id="guide-capture-textarea"
            className="form-body min-h-[88px] w-full resize-none border-0 bg-white px-3.5 py-3 leading-6 text-[#333] outline-none placeholder:text-[#c4c8ce]"
            placeholder={`例如：
每天早饭后吃一片氨氯地平
氨氯地平库存加100片
6月15号去市第一医院复查高血压`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex items-center justify-between gap-2 border-t border-[#f0f0f0] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {voiceSupported ? (
                <button
                  type="button"
                  id="guide-capture-voice"
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
                  className={`form-body inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-medium ${
                    listening
                      ? "bg-[#00c896] text-white"
                      : "bg-[#f5f6f8] text-[#666]"
                  } ${guidePhase === "voice" ? "guide-highlight" : ""}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="9"
                      y="3"
                      width="6"
                      height="11"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M6 11a6 6 0 0 0 12 0M12 17v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  {listening ? "聆听中…" : "语音识别"}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              id="guide-capture-parse"
              disabled={parsing}
              onClick={handleParse}
              className={`form-body shrink-0 rounded-full bg-[#00c896] px-4 py-2 font-semibold text-white disabled:opacity-50 ${
                guidePhase === "text" || guidePhase === "voice" ? "guide-highlight" : ""
              }`}
            >
              {parsing ? "识别中…" : hasResults ? "重新识别" : "识别并预览"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl bg-[#fff8f0] px-3 py-2.5 text-sm leading-6 text-[#e67e22]">
            {error}
          </div>
        ) : null}

        {hasResults ? (
          <>
            <div id="guide-capture-preview" className="space-y-3 pb-4">
              <p className="form-body-muted px-0.5">
                已识别 {totalDraftCount} 项，请核对
              </p>
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
                    setAppointmentDrafts((prev) =>
                      prev.filter((entry) => entry.id !== item.id)
                    )
                  }
                />
              ))}
            </div>

            {guidePhase ? (
              <CaptureConfirmFooter
                embedded
                onReinput={handleReinput}
                onConfirm={() => handleConfirmRef.current()}
              />
            ) : null}
          </>
        ) : null}
      </div>

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
