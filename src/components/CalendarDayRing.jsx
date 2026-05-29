export default function CalendarDayRing({ day, percent = 0, hasTasks, isToday, allDone }) {
  if (!hasTasks) {
    return (
      <span
        className={`flex h-11 w-11 items-center justify-center text-sm font-semibold ${
          isToday ? "text-[#00a87a]" : "text-[#ccc]"
        }`}
      >
        {day}
      </span>
    );
  }

  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="relative h-11 w-11 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(#00c896 ${safePercent * 3.6}deg, #eef0f2 ${safePercent * 3.6}deg)`,
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-[3.5px] flex items-center justify-center rounded-full bg-white">
        <span
          className={`text-sm font-semibold ${
            allDone || isToday ? "text-[#00a87a]" : "text-[#666]"
          }`}
        >
          {day}
        </span>
      </div>
    </div>
  );
}
