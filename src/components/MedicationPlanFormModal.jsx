import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlertDialog from "./AlertDialog.jsx";
import CircleIconButton from "./CircleIconButton.jsx";
import Modal from "./Modal.jsx";
import MedicineChestComboField from "./MedicineChestComboField.jsx";
import PlusIcon from "./PlusIcon.jsx";
import TimeWheelPicker from "./TimeWheelPicker.jsx";
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

function buildEmptyForm() {
  return {
    medicineId: "",
    medicineName: "",
    ruleType: "daily",
    times: [],
    weekdays: [],
    intervalDays: "2",
    startDate: todaysDefaultDate(),
    endDate: "",
    longTerm: true,
  };
}

function formFromPlan(plan) {
  return {
    medicineId: plan.medicineId || "",
    medicineName: plan.medicineName || "",
    ruleType: plan.ruleType || "daily",
    times: plan.times?.length ? [...plan.times] : [],
    weekdays: plan.weekdays ? [...plan.weekdays] : [],
    intervalDays: String(plan.intervalDays || 2),
    startDate: plan.startDate || todaysDefaultDate(),
    endDate: plan.endDate || "",
    longTerm: Boolean(plan.longTerm ?? !plan.endDate),
  };
}

function SectionTitle({ children }) {
  return <p className="form-title mb-2">{children}</p>;
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

function getPickerPosition(btn) {
  const rect = btn.getBoundingClientRect();
  const panelWidth = 240;
  const panelHeight = 244;
  const gap = 6;
  let top = rect.bottom + gap;
  if (top + panelHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - panelHeight - gap);
  }
  const left = Math.min(
    Math.max(12, rect.right - panelWidth),
    window.innerWidth - panelWidth - 12
  );
  return { top, left, width: panelWidth };
}

function CustomTimeAddChip({ value, onChange, onAdd }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      const inBtn = btnRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inBtn && !inPanel) setOpen(false);
    }

    function updatePosition() {
      const btn = btnRef.current;
      if (!btn) return;
      setPanelStyle(getPickerPosition(btn));
    }

    updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function openPicker() {
    if (!value) onChange("08:00");
    const btn = btnRef.current;
    if (btn) setPanelStyle(getPickerPosition(btn));
    setOpen(true);
  }

  function confirmAdd() {
    onAdd();
    setOpen(false);
  }

  return (
    <>
      <CircleIconButton
        ref={btnRef}
        size="xs"
        label="自定义添加时间"
        onClick={openPicker}
        className="shrink-0"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </CircleIconButton>
      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[60] overflow-hidden rounded-xl border border-[#d4f0e6] bg-white shadow-[0_4px_16px_rgba(0,200,150,0.14)]"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              <TimeWheelPicker value={value} onChange={onChange} />
              <button
                type="button"
                onClick={confirmAdd}
                className="form-body w-full border-t border-[#eef7f2] py-2.5 font-semibold text-[#00a87a] active:bg-[#f0fbf7]"
              >
                添加
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function TimeChip({ active, onClick, children, onRemove }) {
  if (active) {
    return (
      <span className="form-body inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8faf4] px-2.5 py-1 text-[#00a87a]">
        {children}
        <button
          type="button"
          className="text-[#99cbb8]"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="移除"
        >
          ×
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="form-body shrink-0 rounded-full bg-[#f5f6f8] px-2.5 py-1 text-[#666]"
    >
      {children}
    </button>
  );
}

export default function MedicationPlanFormModal({ open, editing, medicines, onClose, onSave }) {
  const [form, setForm] = useState(buildEmptyForm());
  const [newTime, setNewTime] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromPlan(editing) : buildEmptyForm());
    setNewTime("");
    setAlertMessage("");
  }, [open, editing]);

  if (!open) return null;

  function showAlert(message) {
    setAlertMessage(message);
  }

  const customTimes = form.times.filter((time) => !TIME_PRESETS.includes(time));

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickMedicine(picked) {
    setForm((prev) => ({
      ...prev,
      medicineId: picked.medicineId || "",
      medicineName: "",
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
    onSave(normalizePlanPayload(form, medicines, editing));
  }

  const inputClass =
    "form-body w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-[#333] outline-none focus:border-[#00c896]";

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

          <div className="rounded-xl border border-[#eee] bg-[#fafafa] p-1">
            <div className="grid grid-cols-3 gap-1">
              {RULE_TYPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => update("ruleType", item.key)}
                  className={`form-body rounded-lg py-1.5 ${
                    form.ruleType === item.key
                      ? "bg-[#00c896] text-white"
                      : "text-[#666]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {form.ruleType !== "daily" ? (
            <div className="relative mt-3 h-10">
              <div
                className={`absolute inset-0 flex items-center transition-opacity duration-200 ease-out ${
                  form.ruleType === "weekly"
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                aria-hidden={form.ruleType !== "weekly"}
              >
                <div className="grid w-full grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => {
                    const active = form.weekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWeekday(day.value)}
                        className={`form-body mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                          active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`absolute inset-0 flex w-full items-center transition-opacity duration-200 ease-out ${
                  form.ruleType === "interval"
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                aria-hidden={form.ruleType !== "interval"}
              >
                <div className="flex h-10 w-full items-center justify-center rounded-xl bg-[#f5f6f8]">
                  <span className="form-body-muted inline-flex items-center gap-1.5">
                    <span>每</span>
                    <span className="inline-flex h-8 w-9 items-center justify-center rounded-full bg-[#e8faf4] ring-1 ring-[#d4f0e6]">
                      <input
                        className="form-body w-full appearance-none bg-transparent text-center font-medium text-[#00a87a] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min="2"
                        value={form.intervalDays}
                        onChange={(e) => update("intervalDays", e.target.value)}
                        aria-label="间隔天数"
                      />
                    </span>
                    <span>天服药一次</span>
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <div className="time-chip-row flex min-w-0 flex-1 items-center gap-2">
              {TIME_PRESETS.map((time) => {
                const active = form.times.includes(time);
                return (
                  <TimeChip
                    key={time}
                    active={active}
                    onClick={() => togglePresetTime(time)}
                    onRemove={() => removeTime(time)}
                  >
                    {time}
                  </TimeChip>
                );
              })}
              {customTimes.map((time) => (
                <TimeChip key={time} active onRemove={() => removeTime(time)}>
                  {time}
                </TimeChip>
              ))}
            </div>
            <CustomTimeAddChip value={newTime} onChange={setNewTime} onAdd={addCustomTime} />
          </div>
        </div>

        <div className="border-t border-[#f0f0f0] pt-3">
          <SectionTitle>计划周期</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-body-muted mb-1 block">开始日期</label>
              <input
                className={inputClass}
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </div>
            <div>
              <label className="form-body-muted mb-1 block">结束日期</label>
              <input
                className={`${inputClass} disabled:bg-[#f5f6f8] disabled:text-[#bbb]`}
                type="date"
                value={form.endDate}
                disabled={form.longTerm}
                onChange={(e) => update("endDate", e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={form.longTerm}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-2.5 text-left active:opacity-90"
            onClick={() => update("longTerm", !form.longTerm)}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                form.longTerm
                  ? "border-[#00c896] bg-[#00c896] text-white"
                  : "border-[#ccc] bg-white"
              }`}
              aria-hidden="true"
            >
              {form.longTerm ? (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="form-body text-[#666]">长期服用</span>
          </button>
        </div>

        <button
          type="submit"
          className="form-body mt-2 w-full rounded-xl bg-[#00c896] py-3.5 font-semibold text-white"
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
    </>
  );
}
