import { useEffect, useState } from "react";
import HeaderAddButton from "./components/HeaderAddButton.jsx";
import TabBar from "./components/TabBar.jsx";
import TabContent from "./components/TabContent.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import AppointmentPage from "./pages/AppointmentPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { scheduleMedicationReminders, clearMedicationReminders } from "./lib/medicationReminder.js";
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
  onRegisterTodayAddPlan
) {
  switch (activeTab) {
    case TABS.inventory:
      return (
        <InventoryPage
          medicines={medicines}
          medicationPlans={medicationPlans}
          onChange={setMedicines}
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
        />
      );
  }
}

export default function App({ state, setState }) {
  const { activeTab, fontSize } = state.ui;
  const fontClass = FONT_SIZES[fontSize]?.className || FONT_SIZES.standard.className;
  const [todayAddPlan, setTodayAddPlan] = useState(null);

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

  return (
    <div className={`mx-auto flex min-h-full w-full max-w-md flex-col bg-[#f5f6f8] ${fontClass}`}>
      <header className="sticky top-0 z-10 bg-[#f5f6f8] px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-[#1a1a1a]">{TAB_TITLES[activeTab]}</h1>
          {headerAdd ? (
            <HeaderAddButton
              onClick={headerAdd.onClick}
              label={headerAdd.label}
              icon={headerAdd.icon}
            />
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-20 pt-1">
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
            registerTodayAddPlan
          )}
        </TabContent>
      </main>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
