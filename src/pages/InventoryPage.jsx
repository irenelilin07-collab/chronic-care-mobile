import { useState } from "react";
import CircleIconButton from "../components/CircleIconButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DeleteIconButton from "../components/DeleteIconButton.jsx";
import FloatingAddButton from "../components/FloatingAddButton.jsx";
import InventoryEmptyState from "../components/InventoryEmptyState.jsx";
import MedicineFormModal from "../components/MedicineFormModal.jsx";
import PlusIcon from "../components/PlusIcon.jsx";
import StockReplenishModal from "../components/StockReplenishModal.jsx";
import {
  formatStockDaysLabel,
  stockLevel,
  formatSpec,
  stockUnitOf,
  uid,
} from "../lib/medicine.js";

function MedicineCard({ medicine, medicationPlans, onReplenish, onDelete }) {
  const level = stockLevel(medicine, medicationPlans);
  const unit = stockUnitOf(medicine);
  const daysLabel = formatStockDaysLabel(medicine, medicationPlans);

  return (
    <li className="app-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[#1a1a1a]">{medicine.name}</h3>
          <p className="mt-0.5 text-sm text-[#999]">
            {formatSpec(medicine)} · 单次 {medicine.dose}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CircleIconButton
            size="sm"
            label="补充库存"
            onClick={() => onReplenish(medicine)}
          >
            <PlusIcon className="h-4 w-4" />
          </CircleIconButton>
          <DeleteIconButton onClick={() => onDelete(medicine)} />
        </div>
      </div>

      <div className="mt-3">
        <p
          className={`text-sm font-semibold ${
            level === "low"
              ? "text-[#ff4d4f]"
              : level === "mid"
                ? "text-[#faad14]"
                : "text-[#00a87a]"
          }`}
        >
          剩余 {medicine.stock}
          {unit}
        </p>
        <p className="mt-1 text-xs text-[#999]">{daysLabel}</p>
      </div>
    </li>
  );
}

export default function InventoryPage({
  medicines,
  medicationPlans,
  onChange,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [replenishTarget, setReplenishTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openAdd() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openReplenish(medicine) {
    setReplenishTarget(medicine);
  }

  function closeReplenish() {
    setReplenishTarget(null);
  }

  function handleSave(payload) {
    onChange([...medicines, { id: uid("med"), ...payload }]);
    closeModal();
  }

  function handleReplenish(medicineId, addAmount) {
    onChange(
      medicines.map((m) =>
        m.id === medicineId ? { ...m, stock: Number(m.stock) + addAmount } : m
      )
    );
    closeReplenish();
  }

  function requestDelete(medicine) {
    setDeleteTarget(medicine);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onChange(medicines.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className={medicines.length > 0 ? "pb-24" : "pb-4"}>
      {medicines.length === 0 ? (
        <InventoryEmptyState onAdd={openAdd} />
      ) : (
        <ul className="space-y-3">
          {medicines.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              medicationPlans={medicationPlans}
              onReplenish={openReplenish}
              onDelete={requestDelete}
            />
          ))}
        </ul>
      )}

      {medicines.length > 0 ? (
        <FloatingAddButton label="添加药品" onClick={openAdd} />
      ) : null}

      <MedicineFormModal open={modalOpen} onClose={closeModal} onSave={handleSave} />

      <StockReplenishModal
        open={Boolean(replenishTarget)}
        medicine={replenishTarget}
        onClose={closeReplenish}
        onSave={handleReplenish}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除药品"
        message={
          deleteTarget ? `确定删除「${deleteTarget.name}」吗？删除后无法恢复。` : ""
        }
        cancelText="取消"
        confirmText="确定删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
