import {
  getGuideStepDescription,
  getGuideTaskProgress,
  isGuideTaskStep,
  isSmartAddGuideStep,
} from "../lib/appGuide.js";

export default function AppGuidePanel({
  open,
  step,
  canAdvance,
  canGoBack = false,
  onNext,
  onPrev,
  onSkipStep,
  onSkipAll,
  onEnableReminder,
  reminderEnableError,
  captureGuideProgress = {},
}) {
  if (!open || !step) return null;

  const isWelcome = step.id === "welcome";
  const isDone = step.id === "done";
  const isTaskStep = isGuideTaskStep(step);
  const taskProgress = getGuideTaskProgress(step);
  const description = getGuideStepDescription(
    step,
    canAdvance && isTaskStep,
    captureGuideProgress
  );

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] mx-auto w-full max-w-md px-3 ${
        isSmartAddGuideStep(step.id) ? "z-[60]" : "z-40"
      }`}
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[#d4f0e6] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        <div className="bg-[#f0fdf8] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#00a87a]">
              {isDone
                ? "引导完成"
                : isWelcome
                  ? "新手引导"
                  : taskProgress
                    ? `步骤 ${taskProgress.current}/${taskProgress.total}`
                    : "新手引导"}
            </p>
            {!isDone ? (
              <button type="button" onClick={onSkipAll} className="text-xs text-[#999]">
                退出
              </button>
            ) : null}
          </div>
          {taskProgress ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#d4f0e6]">
              <div
                className="h-full rounded-full bg-[#00c896] transition-all"
                style={{ width: `${(taskProgress.current / taskProgress.total) * 100}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="px-4 py-3">
          <h3 className="text-base font-bold text-[#1a1a1a]">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-[#666]">{description}</p>

          {canAdvance && isTaskStep && step.completeLabel ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e8faf4] px-2.5 py-1 text-xs font-medium text-[#00a87a]">
              ✓ {step.completeLabel}
            </p>
          ) : null}

          {step.id === "reminder" && !canAdvance && onEnableReminder ? (
            <button
              type="button"
              onClick={onEnableReminder}
              className="mt-3 w-full rounded-xl border border-[#00c896] bg-[#f0fdf8] py-2.5 text-sm font-semibold text-[#00a87a]"
            >
              开启用药提醒
            </button>
          ) : null}

          {reminderEnableError ? (
            <p className="mt-2 text-xs leading-5 text-[#e67e22]">{reminderEnableError}</p>
          ) : null}

          <div className="mt-3">
            {isDone ? (
              <button
                type="button"
                onClick={onNext}
                className="w-full rounded-xl bg-[#00c896] py-2.5 text-sm font-semibold text-white"
              >
                开始使用
              </button>
            ) : isWelcome ? (
              <button
                type="button"
                onClick={onNext}
                className="w-full rounded-xl bg-[#00c896] py-2.5 text-sm font-semibold text-white"
              >
                开始引导
              </button>
            ) : step.optional && canGoBack ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  className="rounded-xl border border-[#eee] py-2.5 text-sm font-medium text-[#666]"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={onSkipStep}
                  className="rounded-xl border border-[#eee] py-2.5 text-sm text-[#666]"
                >
                  跳过
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canAdvance}
                  className="rounded-xl bg-[#00c896] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  下一步
                </button>
              </div>
            ) : canGoBack ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  className="rounded-xl border border-[#eee] py-2.5 text-sm font-medium text-[#666]"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canAdvance}
                  className="rounded-xl bg-[#00c896] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  下一步
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={!canAdvance}
                className="w-full rounded-xl bg-[#00c896] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
