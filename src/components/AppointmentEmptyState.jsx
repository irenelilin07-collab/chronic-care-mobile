function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-28 w-28"
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
      <rect x="44" y="76" width="16" height="4" rx="2" fill="#e8faf4" />
    </svg>
  );
}

export default function AppointmentEmptyState({ onAdd }) {
  return (
    <section className="app-card overflow-hidden px-6 py-10">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-5 text-lg font-bold text-[#1a1a1a]">还没有复诊计划</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-[#999]">
          添加下次复诊时间，系统会提醒你按时续方和就医
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
        >
          + 添加复诊计划
        </button>
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-2">
        {[
          { label: "复诊倒计时", desc: "提前知晓" },
          { label: "过期提醒", desc: "避免遗漏" },
          { label: "线上续方", desc: "一键跳转" },
        ].map((item) => (
          <li key={item.label} className="rounded-xl bg-[#f8faf9] px-2 py-3 text-center">
            <p className="text-xs font-semibold text-[#00a87a]">{item.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-[#aaa]">{item.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
