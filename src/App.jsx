import { useEffect, useState } from "react";
import AppGuidePanel from "./components/AppGuidePanel.jsx";
import GuideHelpButton from "./components/GuideHelpButton.jsx";
import HeaderAddButton from "./components/HeaderAddButton.jsx";
import TabBar from "./components/TabBar.jsx";
import TabContent from "./components/TabContent.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import AppointmentPage from "./pages/AppointmentPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import {
  getGuideStep,
  getGuideStepCount,
  isGuideStepComplete,
  shouldAutoStartGuide,
} from "./lib/appGuide.js";
import { markOnboardingCompleted, markOnboardingSkipped } from "./lib/onboarding.js";
import {
  getReminderPermissionMessage,
  scheduleMedicationReminders,
  clearMedicationReminders,
  tryEnableMedicationReminder,
} from "./lib/medicationReminder.js";
import { FONT_SIZES, TABS } from "./lib/storage.js";

const TAB_TITLES = {
  [TABS.today]: "用药计划",
  [TABS.inventory]: "我的药箱",
  [TABS.appointment]: "复诊计划",
  [TABS.profile]: "设置",
};

function renderPage(
  activeTab,
  medicines,
  medicationPlans,
  intakeRecords,
  appointments,
  setMedicines,
  setAppointments,
  setMedicationPlans,
  setIntakeRecords,
  profile,
  settings,
  setProfile,
  setSettings,
  journalEntries,
  setJournalEntries,
  onRegisterTodayAddPlan,
  guideProps
) {
  switch (activeTab) {
    case TABS.inventory:
      return (
        <InventoryPage
          medicines={medicines}
          medicationPlans={medicationPlans}
          onChange={setMedicines}
          onPlansChange={setMedicationPlans}
          {...guideProps}
        />
      );
    case TABS.appointment:
      return (
        <AppointmentPage appointments={appointments} onChange={setAppointments} />
      );
    case TABS.profile:
      return (
        <SettingsPage
          profile={profile}
          settings={settings}
          medicines={medicines}
          medicationPlans={medicationPlans}
          intakeRecords={intakeRecords}
          journalEntries={journalEntries}
          onProfileChange={setProfile}
          onSettingsChange={setSettings}
          onJournalChange={setJournalEntries}
          onStartGuide={guideProps.onStartGuide}
          {...guideProps}
        />
      );
    default:
      return (
        <TodayPage
          medicines={medicines}
          medicationPlans={medicationPlans}
          intakeRecords={intakeRecords}
          journalEntries={journalEntries}
          profile={profile}
          appointments={appointments}
          onPlansChange={setMedicationPlans}
          onIntakeChange={setIntakeRecords}
          onMedicinesChange={setMedicines}
          onJournalChange={setJournalEntries}
          onRegisterAddPlan={onRegisterTodayAddPlan}
          onAppointmentsChange={setAppointments}
          {...guideProps}
        />
      );
  }
}

export default function App({ state, setState }) {
  const { activeTab, fontSize } = state.ui;
  const fontClass = FONT_SIZES[fontSize]?.className || FONT_SIZES.standard.className;
  const [todayAddPlan, setTodayAddPlan] = useState(null);
  const [guideActive, setGuideActive] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [autoGuideChecked, setAutoGuideChecked] = useState(false);
  const [reminderEnableError, setReminderEnableError] = useState(null);

  const guideStep = getGuideStep(guideStepIndex);
  const guideCanAdvance = guideStep ? isGuideStepComplete(guideStep, state) : false;

  function registerTodayAddPlan(handler) {
    setTodayAddPlan(() => handler);
  }

  const headerAdd =
    activeTab === TABS.today && state.medicines.length > 0 && todayAddPlan
      ? { onClick: todayAddPlan, label: "管理用药计划", icon: "edit" }
      : null;

  function setActiveTab(tab) {
    if (tab === activeTab) return;
    setTodayAddPlan(() => null);
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, activeTab: tab },
    }));
  }

  function setMedicines(next) {
    setState((prev) => ({
      ...prev,
      medicines: typeof next === "function" ? next(prev.medicines) : next,
    }));
  }

  function setAppointments(next) {
    setState((prev) => ({
      ...prev,
      appointments: typeof next === "function" ? next(prev.appointments) : next,
    }));
  }

  function setMedicationPlans(next) {
    setState((prev) => ({
      ...prev,
      medicationPlans: typeof next === "function" ? next(prev.medicationPlans) : next,
    }));
  }

  function setIntakeRecords(next) {
    setState((prev) => ({
      ...prev,
      intakeRecords: typeof next === "function" ? next(prev.intakeRecords) : next,
    }));
  }

  function setJournalEntries(next) {
    setState((prev) => ({
      ...prev,
      journalEntries: typeof next === "function" ? next(prev.journalEntries || []) : next,
    }));
  }

  function setProfile(next) {
    setState((prev) => ({
      ...prev,
      profile: typeof next === "function" ? next(prev.profile) : next,
    }));
  }

  function setSettings(next) {
    setState((prev) => ({
      ...prev,
      settings: typeof next === "function" ? next(prev.settings) : next,
    }));
  }

  function startGuide(fromStep = 0) {
    setGuideStepIndex(fromStep);
    setGuideActive(true);
  }

  function finishGuide() {
    setGuideActive(false);
    setGuideStepIndex(0);
    setState((prev) => ({
      ...prev,
      onboarding: markOnboardingCompleted("interactive-guide"),
    }));
  }

  function skipAllGuide() {
    setGuideActive(false);
    setGuideStepIndex(0);
    setState((prev) => ({
      ...prev,
      onboarding: markOnboardingSkipped(),
    }));
  }

  function goNextGuideStep() {
    if (!guideStep) return;

    if (guideStep.id === "done") {
      finishGuide();
      return;
    }

    if (guideStep.id !== "welcome" && !guideCanAdvance) return;

    setGuideStepIndex((value) => Math.min(value + 1, getGuideStepCount() - 1));
  }

  function goPrevGuideStep() {
    if (guideStepIndex <= 0) return;
    setGuideStepIndex((value) => Math.max(value - 1, 0));
  }

  function skipOptionalGuideStep() {
    if (!guideStep?.optional) return;
    setGuideStepIndex((value) => Math.min(value + 1, getGuideStepCount() - 1));
  }

  async function handleGuideEnableReminder() {
    setReminderEnableError(null);
    const result = await tryEnableMedicationReminder(state.settings, setSettings);
    if (!result.ok) {
      setReminderEnableError(getReminderPermissionMessage(result.reason, { forGuide: true }));
    }
  }

  useEffect(() => {
    if (guideStep?.id !== "reminder") {
      setReminderEnableError(null);
    }
  }, [guideStep?.id]);

  useEffect(() => {
    if (autoGuideChecked) return;
    setAutoGuideChecked(true);
    if (shouldAutoStartGuide(state)) {
      startGuide(0);
    }
    // Only evaluate auto-start once on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGuideChecked]);

  useEffect(() => {
    if (!guideActive || !guideStep?.tab) return;
    setActiveTab(guideStep.tab);
  }, [guideActive, guideStep?.id, guideStep?.tab]);

  useEffect(() => {
    const reminderState = {
      settings: state.settings,
      medicationPlans: state.medicationPlans,
      medicines: state.medicines,
      intakeRecords: state.intakeRecords,
    };
    scheduleMedicationReminders(reminderState);
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleMedicationReminders(reminderState);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearMedicationReminders();
    };
  }, [state.settings, state.medicationPlans, state.medicines, state.intakeRecords]);

  const guideProps = {
    guideActive,
    guideHighlight: guideActive ? guideStep?.highlight || null : null,
    onStartGuide: () => startGuide(0),
  };

  useEffect(() => {
    if (!guideActive || !guideStep?.highlight) return;
    const timer = window.setTimeout(() => {
      document.getElementById(guideStep.highlight)?.scrollIntoView({
        behavior: "smooth",
        block: guideStep.id === "reminder" ? "start" : "center",
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [guideActive, guideStep?.highlight, guideStep?.id, guideStepIndex]);

  return (
    <div className={`mx-auto flex min-h-full w-full max-w-md flex-col bg-[#f5f6f8] ${fontClass}`}>

      <header className="sticky top-0 z-10 bg-[#f5f6f8] px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <GuideHelpButton onClick={() => startGuide(0)} active={guideActive} />
            <h1 className="truncate text-[22px] font-bold text-[#1a1a1a]">{TAB_TITLES[activeTab]}</h1>
          </div>
          {headerAdd ? (
            <HeaderAddButton
              onClick={headerAdd.onClick}
              label={headerAdd.label}
              icon={headerAdd.icon}
            />
          ) : null}
        </div>
      </header>

      <main
        className={`flex-1 overflow-y-auto overflow-x-hidden px-4 pt-1 ${
          guideActive ? "guide-main-offset pb-20" : "pb-20"
        }`}
      >
        <TabContent tabKey={activeTab}>
          {renderPage(
            activeTab,
            state.medicines,
            state.medicationPlans,
            state.intakeRecords,
            state.appointments,
            setMedicines,
            setAppointments,
            setMedicationPlans,
            setIntakeRecords,
            state.profile,
            state.settings,
            setProfile,
            setSettings,
            state.journalEntries || [],
            setJournalEntries,
            registerTodayAddPlan,
            guideProps
          )}
        </TabContent>
      </main>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <AppGuidePanel
        open={guideActive}
        step={guideStep}
        canAdvance={guideCanAdvance}
        canGoBack={guideStepIndex > 0}
        onNext={goNextGuideStep}
        onPrev={goPrevGuideStep}
        onSkipStep={skipOptionalGuideStep}
        onSkipAll={skipAllGuide}
        onEnableReminder={handleGuideEnableReminder}
        reminderEnableError={reminderEnableError}
      />
    </div>
  );
}
