import { useEffect, useRef, useState } from "react";
import CircleIconButton from "../components/CircleIconButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DeleteIconButton from "../components/DeleteIconButton.jsx";
import EditIcon from "../components/EditIcon.jsx";
import MedicationPlanFormModal from "../components/MedicationPlanFormModal.jsx";
import PlanEmptyState from "../components/PlanEmptyState.jsx";
import { uid } from "../lib/medicine.js";
import {
  formatPlanPeriod,
  formatPlanRule,
  planMedicineLabel,
  planMedicineMeta,
} from "../lib/medicationPlan.js";

function PlanCard({ plan, medicines, onEdit, onDelete }) {
  return (
    <li className="app-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-[#1a1a1a]">{planMedicineLabel(plan, medicines)}</h3>
          {planMedicineMeta(plan, medicines) ? (
            <p className="mt-0.5 text-sm text-[#999]">{planMedicineMeta(plan, medicines)}</p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-[#00a87a]">{formatPlanRule(plan)}</p>
          <p className="mt-1 text-xs text-[#999]">{formatPlanPeriod(plan)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CircleIconButton size="sm" label="编辑" onClick={() => onEdit(plan)}>
            <EditIcon />
          </CircleIconButton>
          <DeleteIconButton onClick={() => onDelete(plan)} />
        </div>
      </div>
    </li>
  );
}

export default function MedicationPlanPage({
  medicines,
  medicationPlans,
  onChange,
  openAddSignal = 0,
  embedded = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const lastAddSignal = useRef(openAddSignal);

  useEffect(() => {
    if (openAddSignal !== lastAddSignal.current) {
      lastAddSignal.current = openAddSignal;
      setEditing(null);
      setModalOpen(true);
    }
  }, [openAddSignal]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(plan) {
    setEditing(plan);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSave(payload) {
    if (editing) {
      onChange(
        medicationPlans.map((plan) => (plan.id === editing.id ? { ...plan, ...payload } : plan))
      );
    } else {
      onChange([...medicationPlans, { id: uid("plan"), ...payload }]);
    }
    closeModal();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onChange(medicationPlans.filter((plan) => plan.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className={embedded ? "pb-4" : "pb-16"}>
      {medicationPlans.length === 0 ? (
        <PlanEmptyState onAdd={openAdd} hasMedicines={medicines.length > 0} />
      ) : (
        <>
          <ul className="space-y-3">
            {medicationPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                medicines={medicines}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </>
      )}

      {medicationPlans.length > 0 && !embedded && (
        <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-4 pb-2">
          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
          >
            + 新建用药计划
          </button>
        </div>
      )}

      <MedicationPlanFormModal
        open={modalOpen}
        editing={editing}
        medicines={medicines}
        onClose={closeModal}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除用药计划"
        message={
          deleteTarget
            ? `确定删除「${planMedicineLabel(deleteTarget, medicines)}」的用药计划吗？`
            : ""
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
