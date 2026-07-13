export default function GuideHelpButton({ onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="使用引导"
      title="使用引导"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-[#00c896] bg-[#e8faf4] text-[#00a87a]"
          : "border-[#eee] bg-white text-[#666]"
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9.5 9.25a2.75 2.75 0 1 1 4.2 2.3c-.85.5-1.2 1-1.2 1.95V14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.25" r="1" fill="currentColor" />
      </svg>
    </button>
  );
}
