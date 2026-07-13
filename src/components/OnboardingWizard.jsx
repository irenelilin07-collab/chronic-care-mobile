import { useEffect, useMemo, useState } from "react";
import TodayTaskCard from "./TodayTaskCard.jsx";
import {
  applyMedicineStockDelta,
  buildTasksForDate,
  dateKeyFromDate,
  toggleIntakeRecord,
} from "../lib/dailySchedule.js";
import {
  buildMedicineFromTemplate,
  buildOnboardingProfilePatch,
  buildPlanFromOnboarding,
  markOnboardingCompleted,
  markOnboardingSkipped,
} from "../lib/onboarding.js";
import {
  defaultTimeOptionForTemplate,
  getMedicineTemplatesForDisease,
  ONBOARDING_DISEASES,
  ONBOARDING_TIME_OPTIONS,
  resolvePlanTimes,
} from "../lib/onboardingTemplates.js";
import {
  notificationPermission,
  requestNotificationPermission,
} from "../lib/medicationReminder.js";

const TOTAL_STEPS = 4;

function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const current = index + 1;
        const active = current === step;
        const done = current < step;
        return (
          <span
            key={current}
            className={`h-2 rounded-full transition-all ${
              active ? "w-6 bg-[#00c896]" : done ? "w-2 bg-[#00c896]/60" : "w-2 bg-[#ddd]"
            }`}
          />
        );
      })}
    </div>
  );
}

function ChoiceButton({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
        active
          ? "border-[#00c896] bg-[#f0fdf8] text-[#00a87a]"
          : "border-[#eee] bg-white text-[#333]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function CompletionIllustration() {
  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#e8faf4] text-4xl">
      🎉
    </div>
  );
}

export default function OnboardingWizard({ onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [diseaseKey, setDiseaseKey] = useState(null);
  const [medicineTemplateKey, setMedicineTemplateKey] = useState(null);
  const [timeOptionKey, setTimeOptionKey] = useState("breakfast");
  const [phase, setPhase] = useState("reminder");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [draftMedicine, setDraftMedicine] = useState(null);
  const [draftPlan, setDraftPlan] = useState(null);
  const [intakeRecords, setIntakeRecords] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const diseaseOption = ONBOARDING_DISEASES.find((item) => item.key === diseaseKey) || null;
  const medicineTemplates = useMemo(
    () => getMedicineTemplatesForDisease(diseaseKey || "skip"),
    [diseaseKey]
  );
  const selectedTemplate = medicineTemplates.find((item) => item.key === medicineTemplateKey) || null;

  useEffect(() => {
    if (!medicineTemplates.length) return;
    if (!medicineTemplates.some((item) => item.key === medicineTemplateKey)) {
      const first = medicineTemplates[0];
      setMedicineTemplateKey(first.key);
      setTimeOptionKey(defaultTimeOptionForTemplate(first));
    }
  }, [medicineTemplates, medicineTemplateKey]);

  useEffect(() => {
    if (step !== 4 || phase !== "checkin" || draftMedicine || !selectedTemplate) return;
    const medicine = buildMedicineFromTemplate(selectedTemplate);
    const times = resolvePlanTimes(selectedTemplate, timeOptionKey);
    const plan = buildPlanFromOnboarding(medicine, times);
    setDraftMedicine(medicine);
    setDraftPlan(plan);
  }, [step, phase, draftMedicine, selectedTemplate, timeOptionKey]);

  const todayKey = dateKeyFromDate(new Date());
  const previewTasks = useMemo(() => {
    if (!draftPlan || !draftMedicine) return [];
    return buildTasksForDate(todayKey, [draftPlan], [draftMedicine]);
  }, [draftMedicine, draftPlan, todayKey]);

  const checkedCount = previewTasks.filter((task) => intakeRecords[task.id] === "taken").length;
  const allChecked = previewTasks.length > 0 && checkedCount === previewTasks.length;

  function handleTemplateSelect(template) {
    setMedicineTemplateKey(template.key);
    setTimeOptionKey(defaultTimeOptionForTemplate(template));
  }

  function goNext() {
    setStep((value) => Math.min(TOTAL_STEPS, value + 1));
  }

  function goBack() {
    if (step === 4 && phase === "checkin") {
      setPhase("reminder");
      setDraftMedicine(null);
      setDraftPlan(null);
      setIntakeRecords({});
      return;
    }
    setStep((value) => Math.max(1, value - 1));
  }

  async function handleEnableReminder() {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      setReminderEnabled(true);
      setPhase("checkin");
      return;
    }
    alert("请允许浏览器通知权限，才能接收用药提醒。您也可以稍后在设置中开启。");
  }

  function handleSkipReminder() {
    setReminderEnabled(false);
    setPhase("checkin");
  }

  function handleToggleTask(task, nextTaken) {
    setIntakeRecords((prev) => toggleIntakeRecord(prev, task.id, nextTaken));
  }

  function finishOnboarding() {
    if (!draftMedicine || !draftPlan || submitting) return;
    setSubmitting(true);

    let medicines = [draftMedicine];
    for (const task of previewTasks) {
      if (intakeRecords[task.id] === "taken" && task.medicineId && task.doseAmount > 0) {
        medicines = applyMedicineStockDelta(medicines, task.medicineId, -task.doseAmount);
      }
    }

    onComplete({
      profile: buildOnboardingProfilePatch(diseaseOption),
      medicines,
      medicationPlans: [draftPlan],
      intakeRecords,
      settings: {
        medicationReminder: {
          enabled: reminderEnabled,
          minutesBefore: 10,
        },
      },
      onboarding: markOnboardingCompleted(diseaseKey || "skip"),
      ui: { activeTab: "today" },
    });
  }

  function handleSkipAll() {
    onSkip({ onboarding: markOnboardingSkipped() });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f5f6f8]">
      <header className="shrink-0 border-b border-[#eee] bg-white px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          {step > 1 && phase !== "done" ? (
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-[#666]"
            >
              返回
            </button>
          ) : (
            <span className="w-10" />
          )}
          <div className="text-center">
            <p className="text-xs text-[#999]">新手引导</p>
            {phase !== "done" ? (
              <p className="mt-0.5 text-sm font-medium text-[#333]">
                第 {step} / {TOTAL_STEPS} 步
              </p>
            ) : null}
          </div>
          {step === 1 ? (
            <button type="button" onClick={handleSkipAll} className="text-sm text-[#999]">
              跳过
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>
        {phase !== "done" ? (
          <div className="mt-4">
            <StepDots step={step} />
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {step === 1 ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">您主要管理哪种慢病？</h1>
              <p className="mt-2 text-sm leading-6 text-[#999]">
                我们将为您推荐常用用药方案，稍后也可在设置中修改。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ONBOARDING_DISEASES.map((item) => (
                <ChoiceButton
                  key={item.key}
                  active={diseaseKey === item.key}
                  onClick={() => setDiseaseKey(item.key)}
                  className="text-center"
                >
                  {item.label}
                </ChoiceButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">添加您正在服用的药物</h1>
              <p className="mt-2 text-sm leading-6 text-[#999]">
                {diseaseOption?.label
                  ? `已为「${diseaseOption.label}」推荐常用药，您也可以稍后自行修改。`
                  : "选择一种药物开始，稍后可在药箱中补充。"}
              </p>
            </div>
            <div className="space-y-3">
              {medicineTemplates.map((template) => (
                <ChoiceButton
                  key={template.key}
                  active={medicineTemplateKey === template.key}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1a1a1a]">{template.name}</p>
                      <p className="mt-1 text-xs text-[#999]">
                        {template.specAmount}/{template.specUnit} · 单次 {template.dose}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#00a87a]">{template.hint}</span>
                  </div>
                </ChoiceButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">您通常什么时候吃药？</h1>
              <p className="mt-2 text-sm leading-6 text-[#999]">
                {selectedTemplate?.defaultTimes?.length > 1
                  ? `「${selectedTemplate.name}」建议每日 ${selectedTemplate.defaultTimes.join("、")} 服用。`
                  : `将每天提醒您服用 ${selectedTemplate?.name || "药物"}。`}
              </p>
            </div>
            {selectedTemplate?.defaultTimes?.length > 1 ? (
              <div className="app-card px-4 py-4 text-sm leading-6 text-[#666]">
                已为您设置每日两次服药：
                <span className="font-semibold text-[#00a87a]">
                  {" "}
                  {selectedTemplate.defaultTimes.join("、")}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {ONBOARDING_TIME_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.key}
                    active={timeOptionKey === option.key}
                    onClick={() => setTimeOptionKey(option.key)}
                  >
                    <div>
                      <p className="font-semibold text-[#1a1a1a]">
                        {option.label}（{option.time}）
                      </p>
                      <p className="mt-1 text-xs text-[#999]">{option.hint}</p>
                    </div>
                  </ChoiceButton>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {step === 4 && phase === "reminder" ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">开启用药提醒</h1>
              <p className="mt-2 text-sm leading-6 text-[#999]">
                我们会在服药前 10 分钟提醒您，帮助养成按时用药习惯。
              </p>
            </div>
            <div className="app-card space-y-3 px-5 py-6 text-center">
              <div className="text-4xl">⏰</div>
              <p className="text-sm leading-6 text-[#666]">
                开启后将在每次用药前收到浏览器通知。
                {notificationPermission() === "denied"
                  ? " 当前浏览器已拒绝通知，请先在系统设置中允许。"
                  : ""}
              </p>
              <button
                type="button"
                onClick={handleEnableReminder}
                className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
              >
                开启用药提醒
              </button>
              <button
                type="button"
                onClick={handleSkipReminder}
                className="w-full py-2 text-sm text-[#999]"
              >
                稍后再说
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 && phase === "checkin" ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">完成第一次打卡</h1>
              <p className="mt-2 text-sm leading-6 text-[#999]">
                点击今日用药任务试一试，体验打卡后药箱库存会自动扣减。
              </p>
            </div>
            {previewTasks.length === 0 ? (
              <div className="app-card px-4 py-5 text-sm leading-6 text-[#666]">
                今日暂无待服任务。用药计划已创建，明天会在这里看到提醒。
              </div>
            ) : (
              <ul className="space-y-3">
                {previewTasks.map((task) => (
                  <TodayTaskCard
                    key={task.id}
                    task={task}
                    taken={intakeRecords[task.id] === "taken"}
                    onToggle={handleToggleTask}
                  />
                ))}
              </ul>
            )}
            {allChecked ? (
              <div className="app-card px-4 py-4 text-center">
                <p className="text-base font-bold text-[#00a87a]">太棒了！已完成首次打卡</p>
                <p className="mt-1 text-sm text-[#999]">
                  今天进度 {checkedCount}/{previewTasks.length}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 4 && phase === "done" ? (
          <section className="space-y-5 py-6 text-center">
            <CompletionIllustration />
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">设置完成！</h1>
              <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-[#999]">
                {allChecked
                  ? "您已完成首次打卡，接下来可以在首页查看每日用药任务。"
                  : "用药计划已创建，接下来可以在首页查看每日用药任务。"}
              </p>
            </div>
            <div className="app-card px-4 py-4 text-left text-sm text-[#666]">
              <p>✓ 已添加 {draftMedicine?.name}</p>
              <p className="mt-2">✓ 已创建每日用药计划</p>
              <p className="mt-2">
                {reminderEnabled ? "✓ 已开启用药提醒" : "○ 可在设置中开启用药提醒"}
              </p>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="shrink-0 border-t border-[#eee] bg-white px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {step < 4 ? (
          <button
            type="button"
            disabled={(step === 1 && !diseaseKey) || (step === 2 && !medicineTemplateKey)}
            onClick={goNext}
            className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            继续
          </button>
        ) : null}

        {step === 4 && phase === "checkin" ? (
          <button
            type="button"
            onClick={() => setPhase("done")}
            className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
          >
            {allChecked ? "完成引导" : previewTasks.length === 0 ? "完成引导" : "先体验一下，稍后打卡"}
          </button>
        ) : null}

        {step === 4 && phase === "done" ? (
          <button
            type="button"
            disabled={submitting}
            onClick={finishOnboarding}
            className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            进入首页
          </button>
        ) : null}
      </footer>
    </div>
  );
}
