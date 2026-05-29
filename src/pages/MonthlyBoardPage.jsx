import { useMemo, useState } from "react";
import CalendarDayRing from "../components/CalendarDayRing.jsx";
import PlanEmptyState from "../components/PlanEmptyState.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import {
  computeRangeProgress,
  dayStatus,
  formatMonthLabel,
  getMonthGrid,
} from "../lib/dailySchedule.js";
import { WEEKDAYS } from "../lib/medicationPlan.js";

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

function LegendRing({ percent }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 rounded-full"
      style={{
        background: `conic-gradient(#00c896 ${percent * 3.6}deg, #eef0f2 ${percent * 3.6}deg)`,
      }}
      aria-hidden="true"
    />
  );
}

export default function MonthlyBoardPage({
  medicines,
  medicationPlans,
  intakeRecords,
  onAddPlan,
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthCells = useMemo(() => getMonthGrid(year, month), [year, month]);

  const monthProgress = useMemo(
    () =>
      computeRangeProgress(
        monthCells.filter((cell) => cell.inMonth).map((cell) => cell.dateKey),
        medicationPlans,
        medicines,
        intakeRecords
      ),
    [monthCells, medicationPlans, medicines, intakeRecords]
  );

  function shiftMonth(delta) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  if (medicationPlans.length === 0) {
    return (
      <PlanEmptyState onAdd={onAddPlan} hasMedicines={medicines.length > 0} />
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <ProgressRing
        percent={monthProgress.percent}
        done={monthProgress.done}
        total={monthProgress.total}
        title="当月完成度"
      />

      <section className="app-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
            aria-label="上一月"
          >
            <Chevron direction="left" />
          </button>
          <p className="text-sm font-semibold text-[#00a87a]">{formatMonthLabel(year, month)}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
            aria-label="下一月"
          >
            <Chevron direction="right" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((item) => (
            <span key={item.value} className="py-1 text-center text-[11px] text-[#999]">
              {item.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((cell) => {
            const status = dayStatus(cell.dateKey, medicationPlans, medicines, intakeRecords);
            const percent =
              status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;

            return (
              <div
                key={cell.dateKey}
                className={`flex aspect-square items-center justify-center ${
                  cell.inMonth ? "" : "opacity-0"
                }`}
              >
                {cell.inMonth ? (
                  <CalendarDayRing
                    day={cell.day}
                    percent={percent}
                    hasTasks={status.hasTasks}
                    isToday={cell.isToday}
                    allDone={status.allDone}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#999]">
          <span className="flex items-center gap-1.5">
            <LegendRing percent={0} />
            有任务
          </span>
          <span className="flex items-center gap-1.5">
            <LegendRing percent={50} />
            进行中
          </span>
          <span className="flex items-center gap-1.5">
            <LegendRing percent={100} />
            全部完成
          </span>
        </div>
      </section>
    </div>
  );
}
