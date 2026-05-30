import { useMemo, useRef } from "react";
import {
  dayStatus,
  getWeekDays,
  weekProgressForDay,
  weekRangeLabel,
} from "../lib/dailySchedule.js";

function Chevron({ direction }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {direction === "left" ? (
        <path d="M14 6 8 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function WeekStripe({
  selectedDateKey,
  onSelect,
  onWeekShift,
  plans,
  medicines,
  intakeRecords,
}) {
  const days = getWeekDays(selectedDateKey);
  const touchStart = useRef({ x: 0, y: 0 });

  const dayStatuses = useMemo(
    () =>
      days.map((day) => ({
        day,
        status: dayStatus(day.dateKey, plans, medicines, intakeRecords),
      })),
    [days, plans, medicines, intakeRecords]
  );

  function handleTouchStart(event) {
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  function handleTouchEnd(event) {
    if (!onWeekShift) return;
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
    onWeekShift(dx > 0 ? -1 : 1);
  }

  return (
    <section className="app-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onWeekShift?.(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
          aria-label="上一周"
        >
          <Chevron direction="left" />
        </button>
        <p className="text-sm font-semibold text-[#00a87a]">{weekRangeLabel(selectedDateKey)}</p>
        <button
          type="button"
          onClick={() => onWeekShift?.(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
          aria-label="下一周"
        >
          <Chevron direction="right" />
        </button>
      </div>

      <div
        className="grid grid-cols-7 gap-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {dayStatuses.map(({ day, status }) => {
          const selected = day.dateKey === selectedDateKey;
          const progress = weekProgressForDay(day.dateKey, plans, medicines, intakeRecords);

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelect(day.dateKey)}
              className={`flex flex-col items-center rounded-xl px-1 py-2.5 transition-colors ${
                selected ? "bg-[#e8faf4] ring-2 ring-[#00c896]" : "bg-transparent"
              }`}
            >
              <span className="text-[11px] text-[#999]">{day.weekday}</span>
              <span
                className={`mt-0.5 text-base font-bold ${
                  selected ? "text-[#00a87a]" : "text-[#1a1a1a]"
                }`}
              >
                {day.day}
              </span>
              <span className="mt-1 min-h-[18px] text-[10px] leading-[18px]">
                {status.hasTasks ? (
                  <span className="text-[#999]">{progress.total}项</span>
                ) : (
                  <span className="text-[#ddd]">—</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
