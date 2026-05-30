import { useEffect, useState } from "react";
import AlertDialog from "./AlertDialog.jsx";
import Modal from "./Modal.jsx";
import {
  ATTRIBUTION_OPTIONS,
  buildEmptyJournalForm,
  createAdverseEntry,
  defaultDateTimeLocal,
  SEVERITY_OPTIONS,
  SYMPTOM_OPTIONS,
  validateAdverseModule,
} from "../lib/journalEntry.js";

const inputClass =
  "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";

function FormField({ label, optional, children }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="text-xs text-[#999]">{label}</span>
        {optional ? <span className="text-xs text-[#ccc]">选填</span> : null}
      </div>
      {children}
    </div>
  );
}

function OptionChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
      }`}
    >
      {children}
    </button>
  );
}

export default function JournalEntrySheet({
  open,
  dateKey,
  dateLabel,
  medicines,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(buildEmptyJournalForm);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...buildEmptyJournalForm(),
      occurredAt: defaultDateTimeLocal(),
    });
    setAlertMessage("");
  }, [open, dateKey]);

  if (!open) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSymptom(symptom) {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((item) => item !== symptom)
        : [...prev.symptoms, symptom],
    }));
  }

  function toggleMedicine(medicineId) {
    setForm((prev) => ({
      ...prev,
      relatedMedicineIds: prev.relatedMedicineIds.includes(medicineId)
        ? prev.relatedMedicineIds.filter((id) => id !== medicineId)
        : [...prev.relatedMedicineIds, medicineId],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const error = validateAdverseModule(form);
    if (error) {
      setAlertMessage(error);
      return;
    }
    onSave(createAdverseEntry(form, dateKey));
    onClose();
  }

  const showMedicinePicker =
    form.attributionType !== "uncertain" && medicines.length > 0;

  return (
    <>
      <Modal title="记录不适" onClose={onClose}>
        <form noValidate onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm leading-6 text-[#999]">记录 {dateLabel} 的不适情况</p>

          <FormField label="发生时间">
            <input
              className={inputClass}
              type="datetime-local"
              value={form.occurredAt}
              onChange={(e) => update("occurredAt", e.target.value)}
            />
          </FormField>

          <FormField label="症状">
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((symptom) => (
                <OptionChip
                  key={symptom}
                  active={form.symptoms.includes(symptom)}
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </OptionChip>
              ))}
            </div>
          </FormField>

          <FormField label="严重程度">
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((item) => (
                <OptionChip
                  key={item.key}
                  active={form.severity === item.key}
                  onClick={() => update("severity", item.key)}
                >
                  {item.label}
                </OptionChip>
              ))}
            </div>
          </FormField>

          <FormField label="与用药关系">
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTION_OPTIONS.map((item) => (
                <OptionChip
                  key={item.key}
                  active={form.attributionType === item.key}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      attributionType: item.key,
                      relatedMedicineIds:
                        item.key === "uncertain" ? [] : prev.relatedMedicineIds,
                    }));
                  }}
                >
                  {item.label}
                </OptionChip>
              ))}
            </div>
          </FormField>

          {showMedicinePicker ? (
            <FormField label="关联药品" optional>
              <div className="space-y-2">
                {medicines.map((medicine) => {
                  const active = form.relatedMedicineIds.includes(medicine.id);
                  return (
                    <button
                      key={medicine.id}
                      type="button"
                      onClick={() => toggleMedicine(medicine.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
                        active
                          ? "border-[#00c896] bg-[#f0fdf8] text-[#00a87a]"
                          : "border-[#eee] bg-[#fafafa] text-[#666]"
                      }`}
                    >
                      <span>{medicine.name}</span>
                      {active ? <span className="text-xs text-[#00a87a]">已选</span> : null}
                    </button>
                  );
                })}
              </div>
            </FormField>
          ) : null}

          <FormField label="补充说明" optional>
            <textarea
              className={`${inputClass} min-h-[72px] resize-none`}
              placeholder="可补充描述不适情况"
              value={form.adverseRemark}
              onChange={(e) => update("adverseRemark", e.target.value)}
            />
          </FormField>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
          >
            保存
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
