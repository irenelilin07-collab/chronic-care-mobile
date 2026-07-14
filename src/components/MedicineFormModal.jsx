import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import StockAmountField from "./StockAmountField.jsx";
import { findCatalogItem, MEDICINE_CATALOG } from "../lib/medicineCatalog.js";
import { formatDose, normalizeMedicineSpec, stockUnitOf } from "../lib/medicine.js";

const emptyForm = {
  name: "",
  specUnit: "",
  stockAmount: "",
};

function defaultDoseFor(name, specUnit) {
  const unit = String(specUnit || "").trim();
  const catalog =
    findCatalogItem(name, "", unit) ||
    MEDICINE_CATALOG.find((item) => item.name === name);
  if (catalog?.dose) return catalog.dose;
  return unit ? formatDose("1", unit) : "";
}

export default function MedicineFormModal({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const isEdit = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const spec = normalizeMedicineSpec(editing);
      setForm({
        name: editing.name,
        specUnit: spec.specUnit || stockUnitOf(editing) || "",
        stockAmount: "",
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
    const name = form.name.trim();
    const specUnit = form.specUnit.trim();

    if (!name || !specUnit) {
      alert(isEdit ? "请填写药品名称与单位" : "请填写药品名称与总量（数量+单位）");
      return;
    }

    const payload = {
      name,
      specAmount: "",
      specUnit,
      spec: specUnit,
      dose: isEdit
        ? editing.dose || defaultDoseFor(name, specUnit)
        : defaultDoseFor(name, specUnit),
      stockUnit: specUnit,
    };

    if (isEdit) {
      onSave(payload);
      return;
    }

    const stock = Number(form.stockAmount);
    if (!Number.isFinite(stock) || stock <= 0) {
      alert("请填写有效的总量数量");
      return;
    }

    onSave({
      ...payload,
      stock,
      initialStock: stock,
    });
  }

  return (
    <Modal title={isEdit ? "编辑药品" : "添加药品"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-[#999]">药品名称</label>
          <input
            className="w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]"
            placeholder="请输入药品名称"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        {isEdit ? (
          <div className="rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#666]">
            当前库存：{" "}
            <span className="font-semibold text-[#00a87a]">
              {editing.stock} {stockUnitOf(editing)}
            </span>
          </div>
        ) : (
          <StockAmountField
            amount={form.stockAmount}
            unit={form.specUnit}
            onAmountChange={(v) => update("stockAmount", v)}
            onUnitChange={(v) => update("specUnit", v)}
            amountPlaceholder="如：60"
            unitPlaceholder="如：片"
          />
        )}

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
