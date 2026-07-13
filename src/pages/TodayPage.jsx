import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AssistantPanel from "../components/AssistantPanel.jsx";
import FloatingAssistantButton from "../components/FloatingAssistantButton.jsx";
import MedicationPlanFormModal from "../components/MedicationPlanFormModal.jsx";
import SlideOverPanel, {
  SLIDE_ENTER_EASE,
  SLIDE_ENTER_MS,
  SLIDE_EXIT_EASE,
  SLIDE_EXIT_MS,
} from "../components/SlideOverPanel.jsx";
import {
  GUIDE_SMART_ADD_PANEL_BOTTOM,
  GUIDE_SMART_ADD_SCROLL_PADDING,
  isSmartAddGuideStep,
} from "../lib/appGuide.js";
import { dateKeyFromDate } from "../lib/dailySchedule.js";
import { uid } from "../lib/medicine.js";
import { applyManualPlanSave } from "../lib/smartCapture/planDuplicate.js";
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
  journalEntries,
  profile,
  appointments,
  onPlansChange,
  onIntakeChange,
  onMedicinesChange,
  onJournalChange,
  onRegisterAddPlan,
  onAppointmentsChange,
  guideActive = false,
  guideHighlight = null,
  guideStepId = null,
  onGuideCaptureEvent,
}) {
  const [view, setView] = useState("daily");
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKeyFromDate(new Date()));
  const [weekAnchorKey, setWeekAnchorKey] = useState(() => dateKeyFromDate(new Date()));
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageAddSignal, setManageAddSignal] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const guideSmartAddIntro = guideActive && isSmartAddGuideStep(guideStepId);
  const prevGuideSmartAddIntroRef = useRef(false);

  const assistantState = useMemo(
    () => ({
      profile,
      medicines,
      medicationPlans,
      intakeRecords,
      journalEntries,
      appointments,
    }),
    [profile, medicines, medicationPlans, intakeRecords, journalEntries, appointments]
  );

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

  useEffect(() => {
    if (guideSmartAddIntro) {
      setAssistantOpen(true);
    } else if (prevGuideSmartAddIntroRef.current) {
      setAssistantOpen(false);
    }
    prevGuideSmartAddIntroRef.current = guideSmartAddIntro;
  }, [guideSmartAddIntro]);

  function closePlanForm() {
    setPlanFormOpen(false);
  }

  function handlePlanSave(payload, overlapAction = null) {
    const result = applyManualPlanSave({
      medicationPlans,
      payload,
      overlapAction,
      newPlanId: uid("plan"),
    });
    if (result.skipped) {
      closePlanForm();
      return;
    }
    onPlansChange(result.medicationPlans);
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
        journalEntries={journalEntries}
        onIntakeChange={onIntakeChange}
        onMedicinesChange={onMedicinesChange}
        onAddPlan={openAddPlan}
        guideHighlight={guideHighlight}
      />
    );
  }

  return (
    <>
      <div
        className={`overflow-hidden [backface-visibility:hidden] ${
          manageOpen || assistantOpen ? "pointer-events-none" : ""
        } ${guideSmartAddIntro ? "invisible" : ""}`}
        style={
          guideSmartAddIntro
            ? undefined
            : {
                transform: manageOpen
                  ? "translate3d(-30%, 0, 0) scale(0.94)"
                  : assistantOpen
                    ? "translate3d(-8%, 0, 0) scale(0.98)"
                    : "translate3d(0, 0, 0) scale(1)",
                opacity: manageOpen ? 0.88 : assistantOpen ? 0.95 : 1,
                transformOrigin: "center center",
                transitionProperty: "transform, opacity",
                transitionDuration:
                  manageOpen || assistantOpen ? `${SLIDE_ENTER_MS}ms` : `${SLIDE_EXIT_MS}ms`,
                transitionTimingFunction:
                  manageOpen || assistantOpen ? SLIDE_ENTER_EASE : SLIDE_EXIT_EASE,
                willChange: manageOpen || assistantOpen ? "transform, opacity" : "auto",
              }
        }
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

      {!manageOpen && !assistantOpen && !guideSmartAddIntro ? (
        <FloatingAssistantButton onClick={() => setAssistantOpen(true)} />
      ) : null}

      {guideSmartAddIntro ? (
        <div
          className="pointer-events-none fixed inset-0 z-40 mx-auto max-w-md bg-[#f5f6f8]"
          aria-hidden
        />
      ) : null}

      <AssistantPanel
        open={assistantOpen}
        onClose={() => {
          if (!guideSmartAddIntro) setAssistantOpen(false);
        }}
        initialMode="capture"
        guideHighlightSmartAdd={guideHighlight === "guide-smart-add-tab" && guideSmartAddIntro}
        elevated={guideSmartAddIntro && assistantOpen}
        reserveBottom={guideSmartAddIntro ? GUIDE_SMART_ADD_PANEL_BOTTOM : null}
        solidBackdrop={guideSmartAddIntro}
        contentBottomPadding={guideSmartAddIntro ? GUIDE_SMART_ADD_SCROLL_PADDING : null}
        disableBackdropClose={guideSmartAddIntro}
        disableHeaderClose={guideSmartAddIntro}
        guideStepId={guideStepId}
        onGuideCaptureEvent={onGuideCaptureEvent}
        state={assistantState}
        onMedicinesChange={onMedicinesChange}
        onPlansChange={onPlansChange}
        onAppointmentsChange={onAppointmentsChange}
      />

      <MedicationPlanFormModal
        open={planFormOpen}
        editing={null}
        medicines={medicines}
        medicationPlans={medicationPlans}
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
