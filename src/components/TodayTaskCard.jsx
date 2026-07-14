function CheckCircle({ checked, disabled = false }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked
          ? "border-[#00c896] bg-[#00c896] text-white"
          : disabled
            ? "border-[#ddd] bg-[#f3f4f5] text-transparent"
            : "border-[#ddd] bg-white text-transparent"
      }`}
      aria-hidden="true"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 12.5 10 16.5 18 8.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function StatusMark({ variant }) {
  if (variant === "expired") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-sm font-bold leading-none text-[#999]"
        title="已超过 1 小时，不可打卡"
        aria-label="已超过 1 小时，不可打卡"
      >
        !
      </span>
    );
  }
  if (variant === "overdue") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffe9e6] text-sm font-bold leading-none text-[#e74c3c]"
        title="已超过计划时间 5 分钟未打卡"
        aria-label="已超过计划时间 5 分钟未打卡"
      >
        !
      </span>
    );
  }
  return null;
}

export default function TodayTaskCard({
  task,
  taken,
  onToggle,
  guideHighlight = false,
  timingStatus = "scheduled",
}) {
  const meta = [task.time, task.dose ? `单次 ${task.dose}` : ""].filter(Boolean).join(" · ");
  const expired = timingStatus === "expired" && !taken;
  const overdue = timingStatus === "overdue" && !taken;
  const disabled = expired;

  return (
    <li>
      <button
        type="button"
        id={guideHighlight ? "guide-checkin" : undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onToggle(task, !taken);
        }}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
          taken
            ? "border-[#b7eb8f] bg-[#f0fdf8]"
            : expired
              ? "border-[#eee] bg-[#f7f7f8] opacity-80"
              : "border-[#f0f0f0] bg-white"
        } ${guideHighlight ? "guide-highlight" : ""} ${
          disabled ? "cursor-not-allowed" : ""
        }`}
      >
        <CheckCircle checked={taken} disabled={expired} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-base font-bold leading-snug ${
              taken || expired ? "text-[#666]" : "text-[#1a1a1a]"
            }`}
          >
            {task.medicineName}
          </p>
          <p className="mt-1 text-sm leading-snug text-[#999]">
            {meta}
            {expired ? " · 已过期" : ""}
          </p>
        </div>
        <StatusMark variant={expired ? "expired" : overdue ? "overdue" : null} />
      </button>
    </li>
  );
}
