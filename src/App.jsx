import { useCallback, useEffect, useMemo, useState } from "react";
import AppGuidePanel from "./components/AppGuidePanel.jsx";
import GuideHelpButton from "./components/GuideHelpButton.jsx";
import HeaderAddButton from "./components/HeaderAddButton.jsx";
import MessageBellButton from "./components/MessageBellButton.jsx";
import MessagesPanel from "./components/MessagesPanel.jsx";
import TabBar from "./components/TabBar.jsx";
import TabContent from "./components/TabContent.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import TodayPage from "./pages/TodayPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import AppointmentPage from "./pages/AppointmentPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import {
  getTodayMessageBadge,
  syncMedicationMessages,
} from "./lib/appMessages.js";
import {
  computeGuideCanAdvance,
  getGuideStep,
  getGuideStepCount,
  isSmartAddGuideStep,
  shouldAutoStartGuide,
} from "./lib/appGuide.js";
import { markOnboardingCompleted, markOnboardingSkipped } from "./lib/onboarding.js";
import { OVERDUE_REFRESH_MS } from "./lib/overdueCheckin.js";
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
          guideHighlight={guideProps.guideHighlight}
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
  const { role } = useAuth();
  const { activeTab, fontSize } = state.ui;
  const fontClass = FONT_SIZES[fontSize]?.className || FONT_SIZES.standard.className;
  const [todayAddPlan, setTodayAddPlan] = useState(null);
  const [guideActive, setGuideActive] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [autoGuideChecked, setAutoGuideChecked] = useState(false);
  const [captureGuideProgress, setCaptureGuideProgress] = useState({
    textParsed: false,
    textPreviewSeen: false,
    voiceParsed: false,
    voicePreviewSeen: false,
  });
  /** 用药计划引导步：管理页打开时引导条留在主页面不跟着进 */
  const [planManageOpen, setPlanManageOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [overdueTick, setOverdueTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOverdueTick((value) => value + 1);
    }, OVERDUE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // App 内消息：到点 / 逾期 / 过期
  useEffect(() => {
    const { messages, changed } = syncMedicationMessages(state);
    if (!changed) return;
    setState((prev) => ({ ...prev, messages }));
    // overdueTick 驱动临界时间刷新；依赖业务字段避免无关 ui 抖动反复写
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.medicationPlans,
    state.medicines,
    state.intakeRecords,
    state.messages,
    overdueTick,
  ]);

  const guideStep = getGuideStep(guideStepIndex);
  const guideCanAdvance = useMemo(
    () => computeGuideCanAdvance(guideStep, state, captureGuideProgress),
    [guideStep, state, captureGuideProgress]
  );
  const guidePanelOpen =
    guideActive && !(guideStep?.id === "plan" && planManageOpen);

  /** 用药 Tab 与铃铛共用：当天未完成次数；有待办红，全过期灰 */
  const todayMessageBadge = useMemo(
    () => getTodayMessageBadge(state.messages),
    // overdueTick：跨过临界时间时同步刷新数字与颜色
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.messages, overdueTick]
  );

  function registerTodayAddPlan(handler) {
    setTodayAddPlan(() => handler);
  }

  const headerAdd =
    activeTab === TABS.today && state.medicines.length > 0 && todayAddPlan
      ? {
          onClick: todayAddPlan,
          label: "管理用药计划",
          icon: "edit",
          highlight:
            guideActive &&
            guideStep?.highlight === "guide-add-plan" &&
            !planManageOpen &&
            !guideCanAdvance,
        }
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
    setCaptureGuideProgress({
      textParsed: false,
      textPreviewSeen: false,
      voiceParsed: false,
      voicePreviewSeen: false,
    });
    setPlanManageOpen(false);
    setGuideActive(true);
  }

  const handleGuideCaptureEvent = useCallback((event) => {
    if (!event?.type) return;
    if (event.type === "planManageOpen") {
      setPlanManageOpen(true);
      return;
    }
    if (event.type === "planManageClose") {
      setPlanManageOpen(false);
      return;
    }
    setCaptureGuideProgress((prev) => {
      if (event.type === "textParsed") {
        return { ...prev, textParsed: true };
      }
      if (event.type === "voiceParsed") {
        return { ...prev, voiceParsed: true };
      }
      if (event.type === "textPreviewSeen") {
        if (prev.textPreviewSeen) return prev;
        return { ...prev, textPreviewSeen: true };
      }
      if (event.type === "voicePreviewSeen") {
        if (prev.voicePreviewSeen) return prev;
        return { ...prev, voicePreviewSeen: true };
      }
      if (event.type === "textPreviewReset") {
        return { ...prev, textParsed: false, textPreviewSeen: false };
      }
      if (event.type === "voicePreviewReset") {
        return { ...prev, voiceParsed: false, voicePreviewSeen: false };
      }
      return prev;
    });
  }, []);

  function finishGuide() {
    setGuideActive(false);
    setGuideStepIndex(0);
    setPlanManageOpen(false);
    setState((prev) => ({
      ...prev,
      onboarding: markOnboardingCompleted("interactive-guide"),
    }));
  }

  function skipAllGuide() {
    setGuideActive(false);
    setGuideStepIndex(0);
    setPlanManageOpen(false);
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

  useEffect(() => {
    if (autoGuideChecked) return;
    // 等角色就绪后再判断一次，避免 admin 在 role 为空时被误开引导
    if (role == null) return;
    setAutoGuideChecked(true);
    if (shouldAutoStartGuide(state, { role })) {
      startGuide(0);
    }
    // 仅判定一次；role 就绪后执行，不随 state 反复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGuideChecked, role]);

  useEffect(() => {
    if (!guideActive || !guideStep?.tab) return;
    setActiveTab(guideStep.tab);
  }, [guideActive, guideStep?.id, guideStep?.tab]);

  useEffect(() => {
    if (guideStep?.id === "plan") return;
    setPlanManageOpen(false);
  }, [guideStep?.id]);

  const guideProps = {
    guideActive,
    guideStepId: guideStep?.id || null,
    guideHighlight: guideActive ? guideStep?.highlight || null : null,
    onStartGuide: () => startGuide(0),
    onGuideCaptureEvent: handleGuideCaptureEvent,
  };

  useEffect(() => {
    if (!guideActive || !guideStep?.highlight || isSmartAddGuideStep(guideStep.id)) return;
    const timer = window.setTimeout(() => {
      document.getElementById(guideStep.highlight)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
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
          {activeTab === TABS.today ? (
            <div className="flex shrink-0 items-center gap-2">
              <MessageBellButton
                unreadCount={todayMessageBadge.count}
                badgeTone={todayMessageBadge.tone}
                onClick={() => setMessagesOpen(true)}
              />
              {headerAdd ? (
                <div
                  id={headerAdd.highlight ? "guide-add-plan" : undefined}
                  className={headerAdd.highlight ? "guide-highlight rounded-full" : undefined}
                >
                  <HeaderAddButton
                    onClick={headerAdd.onClick}
                    label={headerAdd.label}
                    icon={headerAdd.icon}
                  />
                </div>
              ) : null}
            </div>
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

      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        todayBadgeCount={todayMessageBadge.count}
        todayBadgeTone={todayMessageBadge.tone}
      />

      <MessagesPanel
        open={messagesOpen}
        onClose={() => setMessagesOpen(false)}
        messages={state.messages || []}
      />

      <AppGuidePanel
        open={guidePanelOpen}
        step={guideStep}
        canAdvance={guideCanAdvance}
        canGoBack={guideStepIndex > 0}
        onNext={goNextGuideStep}
        onPrev={goPrevGuideStep}
        onSkipStep={skipOptionalGuideStep}
        onSkipAll={skipAllGuide}
        captureGuideProgress={captureGuideProgress}
      />
    </div>
  );
}
