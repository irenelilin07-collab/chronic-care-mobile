function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-28 w-28"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="52" fill="#e8faf4" />
      <rect x="30" y="34" width="60" height="52" rx="8" fill="#fff" stroke="#00c896" strokeWidth="2.5" />
      <path d="M30 48h60" stroke="#00c896" strokeWidth="2.5" />
      <circle cx="44" cy="41" r="2" fill="#00c896" />
      <circle cx="52" cy="41" r="2" fill="#00c896" />
      <path d="M42 62h14M42 72h20" stroke="#00c896" strokeWidth="2" strokeLinecap="round" />
      <circle cx="78" cy="66" r="12" fill="#fff" stroke="#00c896" strokeWidth="2" />
      <path d="M78 60v12M72 66h12" stroke="#00c896" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PlanEmptyState({ onAdd, hasMedicines }) {
  return (
    <section className="app-card overflow-hidden px-6 py-10">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-5 text-lg font-bold text-[#1a1a1a]">还没有用药计划</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-[#999]">
          {hasMedicines
            ? "创建服药计划，自定义每日、每周或间隔用药规则"
            : "建议先在「我的药箱」添加药品，再创建用药计划"}
        </p>
        {hasMedicines ? (
          <button
            type="button"
            onClick={onAdd}
            className="mt-6 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
          >
            添加用药计划
          </button>
        ) : null}
      </div>
    </section>
  );
}
