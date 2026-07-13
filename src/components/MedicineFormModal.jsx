import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import MedicineComboField from "./MedicineComboField.jsx";
import StockAmountField from "./StockAmountField.jsx";
import UnitComboField from "./UnitComboField.jsx";
import { findCatalogItem, isCatalogMedicineName, MEDICINE_CATALOG } from "../lib/medicineCatalog.js";
import {
  formatDose,
  normalizeMedicineSpec,
  parseDose,
  stockUnitOf,
} from "../lib/medicine.js";

const emptyForm = {
  name: "",
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

  function handleNameChange(name) {
    setForm((prev) => {
      const next = { ...prev, name };
      const wasCatalog = isCatalogMedicineName(prev.name);
      const nowCatalog = isCatalogMedicineName(name);
      if (wasCatalog && !nowCatalog) {
        next.specUnit = "";
        next.doseAmount = "";
      }
      return next;
    });
  }

  function pickName(name) {
    const catalog = MEDICINE_CATALOG.find((item) => item.name === name);
    if (!catalog) {
      setForm((prev) => ({ ...prev, name }));
      return;
    }
    const parsed = parseDose(catalog.dose);
    setForm((prev) => ({
      ...prev,
      name,
      specUnit: catalog.specUnit ?? "",
      doseAmount: parsed.doseAmount,
    }));
  }

  function pickSpecUnit(unit) {
    setForm((prev) => {
      const next = { ...prev, specUnit: unit };
      const catalog = findCatalogItem(prev.name, "", unit);
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
      specAmount: "",
      specUnit,
      spec: specUnit,
      dose: formatDose(form.doseAmount.trim(), specUnit),
    };

    if (!payload.name || !specUnit || !payload.dose) {
      alert("请完整填写药品名称、单位、单次剂量与添加量");
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

  return (
    <Modal title={isEdit ? "编辑药品" : "添加药品"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <MedicineComboField
          label="药品名称"
          placeholder="输入药品名称，可选推荐项或自定义"
          value={form.name}
          onChange={handleNameChange}
          onPickName={pickName}
        />
        <p className="-mt-1 text-xs leading-5 text-[#999]">
          推荐列表外的药品可直接输入名称，再填写单位、剂量与库存
        </p>

        <UnitComboField
          label="单位"
          placeholder="如：片 / 粒 / 支"
          value={form.specUnit}
          medicineName={form.name}
          onChange={(v) => update("specUnit", v)}
          onPick={pickSpecUnit}
        />

        <StockAmountField
          label="单次剂量"
          amount={form.doseAmount}
          unit={lockedUnit}
          onAmountChange={(v) => update("doseAmount", v)}
          onUnitChange={() => {}}
          amountType="text"
          amountPlaceholder="如：1"
          unitPlaceholder="先填单位"
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
            unitPlaceholder="先填单位"
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
