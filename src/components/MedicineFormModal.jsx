import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import MedicineComboField from "./MedicineComboField.jsx";
import StockAmountField from "./StockAmountField.jsx";
import UnitComboField from "./UnitComboField.jsx";
import { findCatalogItem, MEDICINE_CATALOG } from "../lib/medicineCatalog.js";
import {
  formatDose,
  formatSpec,
  normalizeMedicineSpec,
  parseDose,
  stockUnitOf,
} from "../lib/medicine.js";

const emptyForm = {
  name: "",
  specAmount: "",
  specUnit: "",
  doseAmount: "",
  stockAmount: "",
};

export default function MedicineFormModal({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const isEdit = Boolean(editing);
  const lockedUnit = form.specUnit.trim();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const spec = normalizeMedicineSpec(editing);
      const parsed = parseDose(editing.dose);
      setForm({
        name: editing.name,
        specAmount: spec.specAmount,
        specUnit: spec.specUnit,
        doseAmount: parsed.doseAmount,
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

  function pickName(name) {
    const catalog = MEDICINE_CATALOG.find((item) => item.name === name);
    const parsed = catalog?.dose ? parseDose(catalog.dose) : { doseAmount: "", doseUnit: "" };
    setForm((prev) => ({
      ...prev,
      name,
      specAmount: catalog?.specAmount ?? (prev.name === name ? prev.specAmount : ""),
      specUnit: catalog?.specUnit ?? (prev.name === name ? prev.specUnit : ""),
      doseAmount: catalog ? parsed.doseAmount : prev.name === name ? prev.doseAmount : "",
    }));
  }

  function pickSpecUnit(unit) {
    setForm((prev) => {
      const next = { ...prev, specUnit: unit };
      const catalog = findCatalogItem(prev.name, prev.specAmount, unit);
      if (catalog?.dose) {
        next.doseAmount = parseDose(catalog.dose).doseAmount;
      }
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const specUnit = form.specUnit.trim();
    const payload = {
      name: form.name.trim(),
      specAmount: form.specAmount.trim(),
      specUnit,
      spec: formatSpec({ specAmount: form.specAmount.trim(), specUnit }),
      dose: formatDose(form.doseAmount.trim(), specUnit),
    };

    if (!payload.name || !payload.specAmount || !specUnit || !payload.dose) {
      alert("请完整填写药品信息（含规格、单次剂量与添加量）");
      return;
    }

    if (isEdit) {
      onSave({
        ...payload,
        stockUnit: specUnit,
      });
      return;
    }

    const stock = Number(form.stockAmount);
    if (!Number.isFinite(stock) || stock <= 0) {
      alert("请填写有效的添加药品量");
      return;
    }

    onSave({
      ...payload,
      stock,
      initialStock: stock,
      stockUnit: specUnit,
    });
  }

  const inputClass =
    "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";

  return (
    <Modal title={isEdit ? "编辑药品" : "添加药品"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <MedicineComboField
          label="药品名称"
          placeholder="输入药品名称，下拉推荐匹配"
          value={form.name}
          onChange={(v) => update("name", v)}
          onPickName={pickName}
        />

        <div>
          <p className="mb-1 text-xs text-[#999]">规格</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[#999]">数量</label>
              <input
                className={inputClass}
                placeholder="如：100 / 50"
                value={form.specAmount}
                onChange={(e) => update("specAmount", e.target.value)}
              />
            </div>
            <UnitComboField
              label="单位"
              placeholder="如：片 / mg"
              value={form.specUnit}
              medicineName={form.name}
              specAmount={form.specAmount}
              onChange={(v) => update("specUnit", v)}
              onPick={pickSpecUnit}
            />
          </div>
        </div>

        <StockAmountField
          label="单次剂量"
          amount={form.doseAmount}
          unit={lockedUnit}
          onAmountChange={(v) => update("doseAmount", v)}
          onUnitChange={() => {}}
          amountType="text"
          amountPlaceholder="如：1"
          unitPlaceholder="先填规格单位"
          unitLocked={Boolean(lockedUnit)}
        />

        {isEdit ? (
          <div className="rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm text-[#666]">
            当前库存：{" "}
            <span className="font-semibold text-[#00a87a]">
              {editing.stock} {stockUnitOf(editing)}
            </span>
          </div>
        ) : (
          <StockAmountField
            label="添加药品量"
            amount={form.stockAmount}
            unit={lockedUnit}
            onAmountChange={(v) => update("stockAmount", v)}
            onUnitChange={() => {}}
            amountPlaceholder="如：60"
            unitPlaceholder="先填规格单位"
            unitLocked={Boolean(lockedUnit)}
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
