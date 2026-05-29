function CheckCircle({ checked }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked
          ? "border-[#00c896] bg-[#00c896] text-white"
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

export default function TodayTaskCard({ task, taken, onToggle }) {
  const meta = [task.time, task.dose ? `单次 ${task.dose}` : ""].filter(Boolean).join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(task, !taken)}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
          taken ? "border-[#b7eb8f] bg-[#f0fdf8]" : "border-[#f0f0f0] bg-white"
        }`}
      >
        <CheckCircle checked={taken} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-base font-bold leading-snug ${
              taken ? "text-[#666]" : "text-[#1a1a1a]"
            }`}
          >
            {task.medicineName}
          </p>
          <p className="mt-1 text-sm leading-snug text-[#999]">{meta}</p>
        </div>
      </button>
    </li>
  );
}
