import { useState } from "react";
import AppointmentEmptyState from "../components/AppointmentEmptyState.jsx";
import AppointmentFormModal from "../components/AppointmentFormModal.jsx";
import FloatingAddButton from "../components/FloatingAddButton.jsx";
import CircleIconButton from "../components/CircleIconButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DeleteIconButton from "../components/DeleteIconButton.jsx";
import EditIcon from "../components/EditIcon.jsx";
import {
  appointmentStatus,
  formatCountdownLabel,
  getFeaturedAppointment,
  sortAppointments,
  statusColors,
  uid,
} from "../lib/appointment.js";

function IconClock({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLocation({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconPerson({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DetailRow({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-[#666]">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#bbb]">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function CompleteToggle({ appointment, onToggle }) {
  const checked = Boolean(appointment.completed);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-[#f8faf9] px-3 py-2.5 text-left active:opacity-90"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(appointment);
      }}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? "border-[#00c896] bg-[#00c896] text-white" : "border-[#ccc] bg-white"
        }`}
        aria-hidden="true"
      >
        {checked ? (
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
      <span className="text-sm text-[#666]">复诊已完成</span>
    </button>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-3 text-base font-bold text-[#999]">{children}</h2>;
}

function AppointmentInfo({ appointment }) {
  const status = appointmentStatus(appointment);
  const colors = statusColors(status);

  return (
    <div className="min-w-0 flex-1">
      <h3 className="text-lg font-bold text-[#1a1a1a]">{appointment.disease}</h3>
      <div className={`mt-1.5 flex items-center gap-1.5 text-sm ${colors.accent}`}>
        <IconClock />
        <span className="font-bold">{formatCountdownLabel(appointment)}</span>
      </div>
      <div className="mt-3 space-y-2">
        <DetailRow icon={<IconCalendar />}>{appointment.date}</DetailRow>
        <DetailRow icon={<IconLocation />}>{appointment.hospital}</DetailRow>
        {appointment.doctor ? (
          <DetailRow icon={<IconPerson />}>{appointment.doctor}</DetailRow>
        ) : null}
      </div>
    </div>
  );
}

function FeaturedCard({ appointment, onEdit, onDelete, onToggleComplete }) {
  const status = appointmentStatus(appointment);
  const colors = statusColors(status);

  return (
    <section className={`app-card overflow-hidden p-4 ring-1 ${colors.ring}`}>
      <div className="flex items-start justify-between gap-2">
        <AppointmentInfo appointment={appointment} />
        <div className="flex shrink-0 items-center gap-2">
          <CircleIconButton size="sm" label="编辑" onClick={() => onEdit(appointment)}>
            <EditIcon />
          </CircleIconButton>
          <DeleteIconButton onClick={() => onDelete(appointment)} />
        </div>
      </div>
      <CompleteToggle appointment={appointment} onToggle={onToggleComplete} />
      {!appointment.completed && appointment.linkUrl ? (
        <a
          href={appointment.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#00c896] py-3 text-sm font-semibold text-white"
        >
          去线上复诊 / 续方
        </a>
      ) : null}
    </section>
  );
}

function AppointmentCard({ appointment, onEdit, onDelete, onToggleComplete }) {
  return (
    <li className="app-card p-4">
      <div className="flex items-start justify-between gap-2">
        <AppointmentInfo appointment={appointment} />
        <div className="flex shrink-0 items-center gap-2">
          <CircleIconButton size="sm" label="编辑" onClick={() => onEdit(appointment)}>
            <EditIcon />
          </CircleIconButton>
          <DeleteIconButton onClick={() => onDelete(appointment)} />
        </div>
      </div>

      <CompleteToggle appointment={appointment} onToggle={onToggleComplete} />

      {!appointment.completed && appointment.linkUrl ? (
        <a
          href={appointment.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#00c896] bg-[#e8faf4] py-2.5 text-sm font-semibold text-[#00a87a]"
        >
          去线上复诊 / 续方
        </a>
      ) : null}
    </li>
  );
}

export default function AppointmentPage({ appointments, onChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sorted = sortAppointments(appointments);
  const featured = getFeaturedAppointment(appointments);
  const list = sorted.filter((item) => item.id !== featured?.id);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(appointment) {
    setEditing(appointment);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSave(payload) {
    if (editing) {
      onChange(
        appointments.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                ...payload,
                completed: editing.completed,
                completedAt: editing.completedAt,
              }
            : item
        )
      );
    } else {
      onChange([...appointments, { id: uid("appt"), completed: false, ...payload }]);
    }
    closeModal();
  }

  function toggleComplete(appointment) {
    onChange(
      appointments.map((item) => {
        if (item.id !== appointment.id) return item;
        const completed = !item.completed;
        return {
          ...item,
          completed,
          completedAt: completed ? new Date().toISOString().slice(0, 10) : undefined,
        };
      })
    );
  }

  function requestDelete(appointment) {
    setDeleteTarget(appointment);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onChange(appointments.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className={appointments.length > 0 ? "pb-24" : "pb-4"}>
      {appointments.length === 0 ? (
        <AppointmentEmptyState onAdd={openAdd} />
      ) : (
        <div className="space-y-5">
          {featured ? (
            <section>
              <SectionTitle>最近复诊</SectionTitle>
              <FeaturedCard
                appointment={featured}
                onEdit={openEdit}
                onDelete={requestDelete}
                onToggleComplete={toggleComplete}
              />
            </section>
          ) : null}
          {list.length > 0 ? (
            <section>
              <SectionTitle>全部复诊</SectionTitle>
              <ul className="space-y-3">
                {list.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                    onToggleComplete={toggleComplete}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {appointments.length > 0 ? (
        <FloatingAddButton label="添加复诊计划" onClick={openAdd} />
      ) : null}

      <AppointmentFormModal
        open={modalOpen}
        editing={editing}
        onClose={closeModal}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除复诊计划"
        message={
          deleteTarget
            ? `确定删除「${deleteTarget.disease}」的复诊计划吗？删除后无法恢复。`
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
