import {
  getGuideStepDescription,
  getGuideTaskProgress,
  isGuideTaskStep,
  isSmartAddGuideStep,
} from "../lib/appGuide.js";

const BTN_BASE =
  "rounded-xl py-2.5 text-sm font-semibold transition-opacity active:opacity-90";
const BTN_PRIMARY = `${BTN_BASE} bg-[#00c896] text-white disabled:opacity-40`;
const BTN_SECONDARY = `${BTN_BASE} border border-[#e8ecea] bg-white text-[#555]`;

export default function AppGuidePanel({
  open,
  step,
  canAdvance,
  canGoBack = false,
  onNext,
  onPrev,
  onSkipStep,
  onSkipAll,
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
  const showCompleteChip = canAdvance && isTaskStep && step.completeLabel;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] mx-auto w-full max-w-md px-3 ${
        isSmartAddGuideStep(step.id) ? "z-[60]" : "z-40"
      }`}
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[#e2f3ec] bg-white shadow-[0_10px_28px_rgba(15,40,30,0.1)]">
        <div className="border-b border-[#e8f5ef] bg-[#f5fbf8] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-[#00a87a]">
              {isDone
                ? "引导完成"
                : isWelcome
                  ? "新手引导"
                  : taskProgress
                    ? `步骤 ${taskProgress.current}/${taskProgress.total}`
                    : "新手引导"}
            </p>
            {!isDone ? (
              <button
                type="button"
                onClick={onSkipAll}
                aria-label="退出引导"
                title="退出引导"
                className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition-colors active:bg-[#e8f0ec] active:text-[#666]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
          {taskProgress ? (
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#dcefe7]">
              <div
                className="h-full rounded-full bg-[#00c896] transition-all duration-300"
                style={{ width: `${(taskProgress.current / taskProgress.total) * 100}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-3.5 pt-3.5">
          <h3 className="text-base font-bold leading-6 text-[#1a1a1a]">{step.title}</h3>
          {description ? (
            <p className="mt-1.5 text-sm leading-6 text-[#666]">{description}</p>
          ) : null}

          {showCompleteChip ? (
            <p className="mt-2.5 inline-flex items-center rounded-lg bg-[#e8faf4] px-2.5 py-1 text-xs font-semibold leading-4 text-[#00a87a]">
              ✓ {step.completeLabel}，点「下一步」
            </p>
          ) : null}

          <div className={description || showCompleteChip ? "mt-3.5" : "mt-3"}>
            {isDone ? (
              <button type="button" onClick={onNext} className={`w-full ${BTN_PRIMARY}`}>
                开始使用
              </button>
            ) : isWelcome ? (
              <button type="button" onClick={onNext} className={`w-full ${BTN_PRIMARY}`}>
                开始
              </button>
            ) : step.optional && canGoBack ? (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={onPrev} className={BTN_SECONDARY}>
                  上一步
                </button>
                <button type="button" onClick={onSkipStep} className={BTN_SECONDARY}>
                  跳过
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canAdvance}
                  className={BTN_PRIMARY}
                >
                  下一步
                </button>
              </div>
            ) : canGoBack ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onPrev} className={BTN_SECONDARY}>
                  上一步
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canAdvance}
                  className={BTN_PRIMARY}
                >
                  下一步
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={!canAdvance}
                className={`w-full ${BTN_PRIMARY}`}
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
