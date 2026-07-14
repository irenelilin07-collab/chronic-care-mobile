function EmptyIllustration() {
  return (
    <svg
      className="mx-auto h-20 w-20"
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

/** 主页空状态只提示右上角；管理页可传 onAdd 显示新建入口 */
export default function PlanEmptyState({ hasMedicines, onAdd = null }) {
  return (
    <section className="app-card overflow-hidden px-6 py-8">
      <div className="text-center">
        <EmptyIllustration />
        <h2 className="mt-4 text-base font-bold text-[#1a1a1a]">暂无用药计划</h2>
        <p className="mx-auto mt-1.5 text-sm text-[#999]">
          {hasMedicines
            ? onAdd
              ? "还没有计划，可以新建一条"
              : "点右上角管理计划"
            : "请先去药箱添加药品"}
        </p>
        {hasMedicines && onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 w-full rounded-xl bg-[#00c896] py-3 text-sm font-semibold text-white"
          >
            新建用药计划
          </button>
        ) : null}
      </div>
    </section>
  );
}
