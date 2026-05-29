import { useCallback, useEffect, useState } from "react";
import MedicationPlanFormModal from "../components/MedicationPlanFormModal.jsx";
import SlideOverPanel, {
  SLIDE_ENTER_EASE,
  SLIDE_ENTER_MS,
  SLIDE_EXIT_EASE,
  SLIDE_EXIT_MS,
} from "../components/SlideOverPanel.jsx";
import { dateKeyFromDate } from "../lib/dailySchedule.js";
import { uid } from "../lib/medicine.js";
import MedicationPlanPage from "./MedicationPlanPage.jsx";
import MonthlyBoardPage from "./MonthlyBoardPage.jsx";
import TodayBoardPage from "./TodayBoardPage.jsx";
import WeeklyBoardPage from "./WeeklyBoardPage.jsx";

const VIEW_TABS = [
  { key: "daily", label: "日" },
  { key: "weekly", label: "周" },
  { key: "monthly", label: "月" },
];

export default function TodayPage({
  medicines,
  medicationPlans,
  intakeRecords,
  onPlansChange,
  onIntakeChange,
  onMedicinesChange,
  onRegisterAddPlan,
}) {
  const [view, setView] = useState("daily");
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKeyFromDate(new Date()));
  const [weekAnchorKey, setWeekAnchorKey] = useState(() => dateKeyFromDate(new Date()));
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageAddSignal, setManageAddSignal] = useState(0);

  const openAddPlan = useCallback(() => {
    setPlanFormOpen(true);
  }, []);

  const openManage = useCallback(() => {
    setManageOpen(true);
  }, []);

  useEffect(() => {
    if (medicines.length === 0) {
      onRegisterAddPlan?.(null);
      return undefined;
    }
    onRegisterAddPlan?.(openManage);
    return () => onRegisterAddPlan?.(null);
  }, [medicines.length, onRegisterAddPlan, openManage]);

  function closePlanForm() {
    setPlanFormOpen(false);
  }

  function handlePlanSave(payload) {
    onPlansChange([...medicationPlans, { id: uid("plan"), ...payload }]);
    closePlanForm();
  }

  function closeManage() {
    setManageOpen(false);
    setManageAddSignal(0);
  }

  function openAddInManage() {
    setManageAddSignal((value) => value + 1);
  }

  function renderBoard() {
    if (view === "weekly") {
      return (
        <WeeklyBoardPage
          anchorDateKey={weekAnchorKey}
          onAnchorChange={setWeekAnchorKey}
          medicines={medicines}
          medicationPlans={medicationPlans}
          intakeRecords={intakeRecords}
          onAddPlan={openAddPlan}
        />
      );
    }
    if (view === "monthly") {
      return (
        <MonthlyBoardPage
          medicines={medicines}
          medicationPlans={medicationPlans}
          intakeRecords={intakeRecords}
          onAddPlan={openAddPlan}
        />
      );
    }
    return (
      <TodayBoardPage
        selectedDateKey={selectedDateKey}
        onDateChange={setSelectedDateKey}
        medicines={medicines}
        medicationPlans={medicationPlans}
        intakeRecords={intakeRecords}
        onIntakeChange={onIntakeChange}
        onMedicinesChange={onMedicinesChange}
        onAddPlan={openAddPlan}
      />
    );
  }

  return (
    <>
      <div
        className={`overflow-hidden [backface-visibility:hidden] ${
          manageOpen ? "pointer-events-none" : ""
        }`}
        style={{
          transform: manageOpen
            ? "translate3d(-30%, 0, 0) scale(0.94)"
            : "translate3d(0, 0, 0) scale(1)",
          opacity: manageOpen ? 0.88 : 1,
          transformOrigin: "center center",
          transitionProperty: "transform, opacity",
          transitionDuration: manageOpen ? `${SLIDE_ENTER_MS}ms` : `${SLIDE_EXIT_MS}ms`,
          transitionTimingFunction: manageOpen ? SLIDE_ENTER_EASE : SLIDE_EXIT_EASE,
          willChange: manageOpen ? "transform, opacity" : "auto",
        }}
      >
        <div className="mb-3 flex gap-1.5">
          {VIEW_TABS.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#00c896] text-white shadow-[0_2px_8px_rgba(0,200,150,0.25)]"
                    : "bg-white text-[#666] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderBoard()}
      </div>

      <MedicationPlanFormModal
        open={planFormOpen}
        editing={null}
        medicines={medicines}
        onClose={closePlanForm}
        onSave={handlePlanSave}
      />

      <SlideOverPanel
        open={manageOpen}
        onClose={closeManage}
        title="管理用药计划"
        variant="push"
        footer={
          medicationPlans.length > 0 ? (
            <div className="px-4 pb-[calc(68px+env(safe-area-inset-bottom))] pt-2">
              <button
                type="button"
                onClick={openAddInManage}
                className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
              >
                + 新建用药计划
              </button>
            </div>
          ) : null
        }
      >
        <MedicationPlanPage
          embedded
          medicines={medicines}
          medicationPlans={medicationPlans}
          onChange={onPlansChange}
          openAddSignal={manageAddSignal}
        />
      </SlideOverPanel>
    </>
  );
}
