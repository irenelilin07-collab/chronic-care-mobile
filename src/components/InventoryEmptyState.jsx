function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-20 w-20"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="52" fill="#e8faf4" />
      <rect x="34" y="42" width="52" height="44" rx="8" fill="#fff" stroke="#00c896" strokeWidth="2.5" />
      <path d="M34 54h52" stroke="#00c896" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M48 42V34a12 12 0 0 1 24 0v8"
        stroke="#00c896"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="46" y="62" width="28" height="12" rx="6" fill="#e8faf4" stroke="#00c896" strokeWidth="2" />
    </svg>
  );
}

export default function InventoryEmptyState({ onAdd, guideHighlight = null }) {
  return (
    <section className="app-card overflow-hidden px-6 py-8">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-4 text-base font-bold text-[#1a1a1a]">暂无药品</h2>
        <div
          id="guide-add-medicine"
          className={`mt-5 ${guideHighlight === "guide-add-medicine" ? "guide-highlight rounded-xl" : ""}`}
        >
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-xl bg-[#00c896] py-3 text-sm font-semibold text-white"
          >
            + 添加药品
          </button>
        </div>
      </div>
    </section>
  );
}
