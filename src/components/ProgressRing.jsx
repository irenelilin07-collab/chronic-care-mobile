export default function ProgressRing({ percent, done, total, title = "当日完成度" }) {
  const safePercent = Math.min(100, Math.max(0, percent || 0));

  return (
    <section className="app-card flex flex-col items-center p-4 text-center">
      <div
        className="relative h-[88px] w-[88px] shrink-0 rounded-full"
        style={{
          background: `conic-gradient(#00c896 ${safePercent * 3.6}deg, #eef0f2 ${safePercent * 3.6}deg)`,
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white">
          <span className="text-xl font-bold text-[#00a87a]">{safePercent}%</span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-base font-bold text-[#1a1a1a]">{title}</p>
        <p className="mt-1 text-sm text-[#999]">
          已完成{" "}
          <span className="font-semibold text-[#00a87a]">
            {done}/{total}
          </span>{" "}
          次用药
        </p>
      </div>
    </section>
  );
}
