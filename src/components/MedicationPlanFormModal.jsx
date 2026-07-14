import { useEffect, useState } from "react";
import AlertDialog from "./AlertDialog.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import CustomTimeAddChip from "./CustomTimeAddChip.jsx";
import Modal from "./Modal.jsx";
import MedicineChestComboField from "./MedicineChestComboField.jsx";
import PlanPeriodEndField from "./PlanPeriodEndField.jsx";
import {
  RULE_TYPES,
  TIME_PRESETS,
  WEEKDAYS,
  normalizePlanPayload,
  planMedicineLabel,
  planMedicineMeta,
  todaysDefaultDate,
  validatePlanForm,
} from "../lib/medicationPlan.js";
import { formatDose, parseDose } from "../lib/medicine.js";
import {
  formatPlanOverlapDetail,
  formatPlanOverlapWarning,
  getPlanFormOverlapSummary,
} from "../lib/smartCapture/planDuplicate.js";

const DOSE_AMOUNT_PRESETS = ["1", "2", "0.5", "1.5", "3"];
const UNIT_PRESETS = ["片", "粒", "颗", "袋", "支"];

function doseFieldsFromMedicine(medicine) {
  const parsed = parseDose(medicine?.dose || "");
  return {
    doseAmount: parsed.doseAmount || "",
    doseUnit: parsed.doseUnit || medicine?.specUnit || medicine?.stockUnit || "",
  };
}

function buildEmptyForm() {
  return {
    medicineId: "",
    medicineName: "",
    doseAmount: "",
    doseUnit: "",
    ruleType: "daily",
    times: [],
    weekdays: [],
    intervalDays: "2",
    startDate: todaysDefaultDate(),
    endDate: "",
    longTerm: true,
  };
}

function formFromPlan(plan, medicines = []) {
  const linked = medicines.find((item) => item.id === plan.medicineId);
  const doseFields = doseFieldsFromMedicine(linked);
  return {
    medicineId: plan.medicineId || "",
    medicineName: plan.medicineName || "",
    doseAmount: doseFields.doseAmount,
    doseUnit: doseFields.doseUnit,
    ruleType: plan.ruleType || "daily",
    times: plan.times?.length ? [...plan.times] : [],
    weekdays: plan.weekdays ? [...plan.weekdays] : [],
    intervalDays: String(plan.intervalDays || 2),
    startDate: plan.startDate || todaysDefaultDate(),
    endDate: plan.endDate || "",
    longTerm: Boolean(plan.longTerm ?? !plan.endDate),
  };
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

function SectionTitle({ children }) {
  return <p className="form-title mb-2 text-[#1a1a1a]">{children}</p>;
}

function FieldSubtitle({ children, className = "" }) {
  return (
    <p className={`form-subtitle mb-1.5 text-[#999] ${className}`.trim()}>{children}</p>
  );
}

function LockedMedicineField({ plan, medicines }) {
  const name = planMedicineLabel(plan, medicines);
  const meta = planMedicineMeta(plan, medicines);

  return (
    <div className="rounded-xl border border-[#eee] bg-[#f5f6f8] px-3 py-3">
      <p className="form-body text-[#333]">{name}</p>
      {meta ? <p className="form-body-muted mt-0.5">{meta}</p> : null}
    </div>
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

export default function MedicationPlanFormModal({
  open,
  editing,
  medicines,
  medicationPlans = [],
  onClose,
  onSave,
  guideHighlightSave = false,
}) {
  const [form, setForm] = useState(buildEmptyForm());
  const [newTime, setNewTime] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromPlan(editing, medicines) : buildEmptyForm());
    setNewTime("");
    setAlertMessage("");
    setDuplicateConfirmOpen(false);
    setPendingPayload(null);
  }, [open, editing, medicines]);

  if (!open) return null;

  function showAlert(message) {
    setAlertMessage(message);
  }

  const customTimes = form.times.filter((time) => !TIME_PRESETS.includes(time));
  const overlapSummary = getPlanFormOverlapSummary(form, medicationPlans, editing?.id);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDose(amount, unit = form.doseUnit) {
    setForm((prev) => ({
      ...prev,
      doseAmount: amount,
      doseUnit: unit,
    }));
  }

  function pickMedicine(picked) {
    const linked = medicines.find((item) => item.id === picked.medicineId);
    const doseFields = doseFieldsFromMedicine(linked);
    setForm((prev) => ({
      ...prev,
      medicineId: picked.medicineId || "",
      medicineName: "",
      doseAmount: doseFields.doseAmount,
      doseUnit: doseFields.doseUnit,
    }));
  }

  function toggleWeekday(day) {
    setForm((prev) => {
      const exists = prev.weekdays.includes(day);
      return {
        ...prev,
        weekdays: exists
          ? prev.weekdays.filter((item) => item !== day)
          : [...prev.weekdays, day],
      };
    });
  }

  function togglePresetTime(time) {
    setForm((prev) => {
      const exists = prev.times.includes(time);
      const times = exists ? prev.times.filter((item) => item !== time) : [...prev.times, time];
      return { ...prev, times: times.sort() };
    });
  }

  function addCustomTime() {
    if (!newTime) return;
    if (form.times.includes(newTime)) {
      showAlert("该时间已添加");
      return;
    }
    setForm((prev) => ({
      ...prev,
      times: [...prev.times, newTime].sort(),
    }));
    setNewTime("");
  }

  function removeTime(time) {
    setForm((prev) => ({
      ...prev,
      times: prev.times.filter((item) => item !== time),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const error = validatePlanForm(form, medicines, editing);
    if (error) {
      showAlert(error);
      return;
    }
    const payload = normalizePlanPayload(form, medicines, editing);
    const summary = getPlanFormOverlapSummary(form, medicationPlans, editing?.id);
    if (summary) {
      setPendingPayload(payload);
      setDuplicateConfirmOpen(true);
      return;
    }
    onSave(payload);
  }

  function finishSave(overlapAction) {
    if (!pendingPayload) return;
    onSave(pendingPayload, overlapAction);
    setPendingPayload(null);
    setDuplicateConfirmOpen(false);
  }

  return (
    <>
      <Modal title={editing ? "编辑用药计划" : "新建用药计划"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <div>
          <SectionTitle>{editing ? "药箱药品" : "选择药箱药品"}</SectionTitle>
          {editing ? (
            <LockedMedicineField plan={editing} medicines={medicines} />
          ) : medicines.length > 0 ? (
            <MedicineChestComboField
              medicines={medicines}
              medicineId={form.medicineId}
              onPickMedicine={pickMedicine}
            />
          ) : (
            <div className="form-body rounded-xl bg-[#fffbe6] px-3 py-2.5 text-[#ad8b00]">
              药箱暂无药品，请先在「我的药箱」添加药品
            </div>
          )}
        </div>

        <div className="border-t border-[#f0f0f0] pt-3">
          <SectionTitle>服药安排</SectionTitle>

          <FieldSubtitle>单次剂量</FieldSubtitle>
          <div className="flex flex-wrap items-center gap-2">
            {DOSE_AMOUNT_PRESETS.map((amount) => (
              <ChipButton
                key={amount}
                active={form.doseAmount === amount}
                onClick={() => updateDose(amount, form.doseUnit)}
              >
                {amount}
              </ChipButton>
            ))}
            <input
              className="form-body min-h-[36px] w-[4.5rem] rounded-xl border border-[#eee] bg-[#fafafa] px-2 text-center text-[#333] outline-none placeholder:text-[#c4c8ce] focus:border-[#00c896]"
              value={DOSE_AMOUNT_PRESETS.includes(form.doseAmount) ? "" : form.doseAmount}
              onChange={(e) => updateDose(e.target.value, form.doseUnit)}
              placeholder="自定义"
              inputMode="decimal"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {UNIT_PRESETS.map((unit) => (
              <ChipButton
                key={unit}
                active={form.doseUnit === unit}
                onClick={() => updateDose(form.doseAmount, unit)}
                className="min-w-[40px]"
              >
                {unit}
              </ChipButton>
            ))}
            <input
              className="form-body min-h-[36px] w-[4.5rem] rounded-xl border border-[#eee] bg-[#fafafa] px-2 text-center text-[#333] outline-none placeholder:text-[#c4c8ce] focus:border-[#00c896]"
              value={UNIT_PRESETS.includes(form.doseUnit) ? "" : form.doseUnit}
              onChange={(e) => updateDose(form.doseAmount, e.target.value)}
              placeholder="自定义"
            />
          </div>

          <FieldSubtitle className="mt-3">频率</FieldSubtitle>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f5f6f8] p-1">
            {RULE_TYPES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => update("ruleType", item.key)}
                className={`form-body rounded-xl py-1.5 ${
                  form.ruleType === item.key ? "bg-[#00c896] text-white" : "text-[#666]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {form.ruleType === "weekly" ? (
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = form.weekdays.includes(day.value);
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

          {form.ruleType === "interval" ? (
            <div className="mt-2 flex h-10 items-center justify-center rounded-xl bg-[#f5f6f8]">
              <span className="form-body-muted inline-flex items-center gap-1.5">
                <span>每</span>
                <span className="inline-flex h-8 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-[#e2e5ea]">
                  <input
                    className="form-body w-full appearance-none bg-transparent text-center font-medium text-[#00a87a] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    min="2"
                    value={form.intervalDays}
                    onChange={(e) => update("intervalDays", e.target.value)}
                    aria-label="间隔天数"
                  />
                </span>
                <span>天一次</span>
              </span>
            </div>
          ) : null}

          <FieldSubtitle className="mt-3">服药时间</FieldSubtitle>
          <div className="flex items-center gap-2">
            <div className="time-chip-row flex min-w-0 flex-1 items-center gap-2">
              {TIME_PRESETS.map((time) => {
                const active = form.times.includes(time);
                return (
                  <TimeChip
                    key={time}
                    active={active}
                    onClick={() => togglePresetTime(time)}
                  >
                    {time}
                  </TimeChip>
                );
              })}
              {customTimes.map((time) => (
                <TimeChip key={time} active onClick={() => removeTime(time)}>
                  {time}
                </TimeChip>
              ))}
            </div>
            <CustomTimeAddChip value={newTime} onChange={setNewTime} onAdd={addCustomTime} />
          </div>

          <FieldSubtitle className="mt-3">服药周期</FieldSubtitle>
          <PlanPeriodEndField
            startDate={form.startDate}
            longTerm={form.longTerm}
            endDate={form.endDate}
            minDate={form.startDate}
            onStartDateChange={(value) => update("startDate", value)}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          {overlapSummary ? (
            <p className="form-body mt-3 rounded-xl bg-[#fff7e6] px-3 py-2.5 leading-5 text-[#e67e22]">
              {formatPlanOverlapWarning(overlapSummary)}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          id={guideHighlightSave ? "guide-add-plan-save" : undefined}
          className={`form-body mt-2 w-full rounded-xl bg-[#00c896] py-3.5 font-semibold text-white ${
            guideHighlightSave ? "guide-highlight" : ""
          }`}
        >
          保存计划
        </button>
      </form>
    </Modal>

      <AlertDialog
        open={Boolean(alertMessage)}
        message={alertMessage}
        onClose={() => setAlertMessage("")}
      />

      <ConfirmDialog
        open={duplicateConfirmOpen}
        title="用药计划已存在"
        message={
          overlapSummary
            ? `以下安排与已有计划重合，是否仍要添加？\n\n${formatPlanOverlapDetail(overlapSummary)}`
            : "以下安排与已有计划重合，是否仍要添加？"
        }
        cancelText="跳过"
        confirmText="仍要添加"
        onCancel={() => finishSave("skip")}
        onConfirm={() => finishSave("force_add")}
      />
    </>
  );
}
