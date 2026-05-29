import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import DiseaseComboField from "./DiseaseComboField.jsx";

const emptyForm = {
  disease: "",
  date: "",
  hospital: "",
  doctor: "",
  linkUrl: "",
};

export default function AppointmentFormModal({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        disease: editing.disease,
        date: editing.date,
        hospital: editing.hospital,
        doctor: editing.doctor || "",
        linkUrl: editing.linkUrl || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  if (!open) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      disease: form.disease.trim(),
      date: form.date,
      hospital: form.hospital.trim(),
      doctor: form.doctor.trim(),
      linkUrl: form.linkUrl.trim(),
    };
    if (!payload.disease || !payload.date || !payload.hospital) {
      alert("请填写目标疾病、复诊日期和医院名称");
      return;
    }
    onSave(payload);
  }

  const inputClass =
    "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";

  return (
    <Modal title={isEdit ? "编辑复诊计划" : "添加复诊计划"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <DiseaseComboField
          label="目标疾病"
          placeholder="如：高血压 / 糖尿病"
          value={form.disease}
          onChange={(v) => update("disease", v)}
          onPick={(v) => update("disease", v)}
        />

        <div>
          <label className="mb-1 block text-xs text-[#999]">计划复诊日期</label>
          <input
            className={inputClass}
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#999]">医院名称</label>
          <input
            className={inputClass}
            placeholder="如：市第一人民医院"
            value={form.hospital}
            onChange={(e) => update("hospital", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#999]">医生姓名（可选）</label>
          <input
            className={inputClass}
            placeholder="如：张医生"
            value={form.doctor}
            onChange={(e) => update("doctor", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[#999]">线上续方链接（可选）</label>
          <input
            className={inputClass}
            type="url"
            placeholder="https://"
            value={form.linkUrl}
            onChange={(e) => update("linkUrl", e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
        >
          保存
        </button>
      </form>
    </Modal>
  );
}
