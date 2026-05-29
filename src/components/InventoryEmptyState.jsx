function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-28 w-28"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="52" fill="#e8faf4" />
      <rect x="34" y="42" width="52" height="44" rx="8" fill="#fff" stroke="#00c896" strokeWidth="2.5" />
      <path
        d="M34 54h52"
        stroke="#00c896"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M48 42V34a12 12 0 0 1 24 0v8"
        stroke="#00c896"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="46" y="62" width="28" height="12" rx="6" fill="#e8faf4" stroke="#00c896" strokeWidth="2" />
      <circle cx="52" cy="68" r="2.5" fill="#00c896" />
      <circle cx="60" cy="68" r="2.5" fill="#00c896" />
      <circle cx="68" cy="68" r="2.5" fill="#00c896" />
      <rect x="78" y="78" width="10" height="10" rx="2" fill="#fff" stroke="#00c896" strokeWidth="2" />
      <path d="M83 81v4M81 83h4" stroke="#00c896" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function InventoryEmptyState({ onAdd }) {
  return (
    <section className="app-card overflow-hidden px-6 py-10">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-5 text-lg font-bold text-[#1a1a1a]">还没有添加药品</h2>
        <p className="mx-auto mt-2 max-w-[240px] text-sm leading-6 text-[#999]">
          把正在服用的药品放进药箱，方便查看库存和可用天数
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
        >
          + 添加第一种药品
        </button>
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-2">
        {[
          { label: "库存跟踪", desc: "随时查看余量" },
          { label: "可用天数", desc: "按计划估算" },
          { label: "低库存提醒", desc: "颜色预警" },
        ].map((item) => (
          <li
            key={item.label}
            className="rounded-xl bg-[#f8faf9] px-2 py-3 text-center"
          >
            <p className="text-xs font-semibold text-[#00a87a]">{item.label}</p>
            <p className="mt-1 text-[10px] leading-4 text-[#aaa]">{item.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
