function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-20 w-20"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="52" fill="#e8faf4" />
      <rect x="32" y="36" width="56" height="52" rx="8" fill="#fff" stroke="#00c896" strokeWidth="2.5" />
      <path d="M32 50h56" stroke="#00c896" strokeWidth="2.5" />
      <path d="M44 36V28M76 36V28" stroke="#00c896" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="64" r="3" fill="#00c896" />
      <circle cx="60" cy="64" r="3" fill="#00c896" />
      <circle cx="72" cy="64" r="3" fill="#e8faf4" stroke="#00c896" strokeWidth="1.5" />
    </svg>
  );
}

export default function AppointmentEmptyState({ onAdd }) {
  return (
    <section className="app-card overflow-hidden px-6 py-8">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-4 text-base font-bold text-[#1a1a1a]">暂无复诊计划</h2>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 w-full rounded-xl bg-[#00c896] py-3 text-sm font-semibold text-white"
        >
          + 添加复诊计划
        </button>
      </div>
    </section>
  );
}
