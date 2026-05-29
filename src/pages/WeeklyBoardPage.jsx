import { useMemo } from "react";
import PlanEmptyState from "../components/PlanEmptyState.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import {
  addDays,
  computeRangeProgress,
  dayStatus,
  getWeekDays,
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

function DayCell({ day, status }) {
  let cellClass = "bg-transparent";
  if (day.isToday) {
    cellClass = "bg-[#e8faf4] ring-2 ring-[#00c896]";
  } else if (status.allDone) {
    cellClass = "bg-[#e8faf4]";
  } else if (status.hasTasks) {
    cellClass = "bg-[#fafafa]";
  }

  return (
    <div className={`flex flex-col items-center rounded-xl px-1 py-2.5 ${cellClass}`}>
      <span className="text-[11px] text-[#999]">{day.weekday}</span>
      <span
        className={`mt-0.5 text-base font-bold ${
          day.isToday ? "text-[#00a87a]" : "text-[#1a1a1a]"
        }`}
      >
        {day.day}
      </span>
      <span className="mt-1 min-h-[18px] text-[10px] leading-[18px]">
        {status.hasTasks ? (
          <span className="text-[#999]">{status.total}项</span>
        ) : (
          <span className="text-[#ddd]">—</span>
        )}
      </span>
    </div>
  );
}

function DaySummaryRow({ day, status }) {
  const percent = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="w-12 shrink-0 text-center">
        <p className="text-xs text-[#999]">{day.weekday}</p>
        <p className={`text-base font-bold ${day.isToday ? "text-[#00a87a]" : "text-[#1a1a1a]"}`}>
          {day.day}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        {status.hasTasks ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666]">
                已完成{" "}
                <span className="font-semibold text-[#00a87a]">
                  {status.done}/{status.total}
                </span>{" "}
                次
              </span>
              <span className="text-xs text-[#999]">{percent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                className={`h-full rounded-full ${status.allDone ? "bg-[#00c896]" : "bg-[#faad14]"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-[#ccc]">无用药任务</p>
        )}
      </div>
    </li>
  );
}

export default function WeeklyBoardPage({
  anchorDateKey,
  onAnchorChange,
  medicines,
  medicationPlans,
  intakeRecords,
  onAddPlan,
}) {
  const weekDays = useMemo(() => getWeekDays(anchorDateKey), [anchorDateKey]);

  const weekProgress = useMemo(
    () =>
      computeRangeProgress(
        weekDays.map((day) => day.dateKey),
        medicationPlans,
        medicines,
        intakeRecords
      ),
    [weekDays, medicationPlans, medicines, intakeRecords]
  );

  const dayStatuses = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        status: dayStatus(day.dateKey, medicationPlans, medicines, intakeRecords),
      })),
    [weekDays, medicationPlans, medicines, intakeRecords]
  );

  if (medicationPlans.length === 0) {
    return (
      <PlanEmptyState onAdd={onAddPlan} hasMedicines={medicines.length > 0} />
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <ProgressRing
        percent={weekProgress.percent}
        done={weekProgress.done}
        total={weekProgress.total}
        title="当周完成度"
      />

      <section className="app-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onAnchorChange(addDays(anchorDateKey, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
            aria-label="上一周"
          >
            <Chevron direction="left" />
          </button>
          <p className="text-sm font-semibold text-[#00a87a]">{weekRangeLabel(anchorDateKey)}</p>
          <button
            type="button"
            onClick={() => onAnchorChange(addDays(anchorDateKey, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f6f8] text-[#666]"
            aria-label="下一周"
          >
            <Chevron direction="right" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dayStatuses.map(({ day, status }) => (
            <DayCell key={day.dateKey} day={day} status={status} />
          ))}
        </div>
      </section>

      <section className="app-card px-4 py-3">
        <h3 className="text-sm font-semibold text-[#666]">每日概况</h3>
        <ul className="divide-y divide-[#f5f5f5]">
          {dayStatuses.map(({ day, status }) => (
            <DaySummaryRow key={day.dateKey} day={day} status={status} />
          ))}
        </ul>
      </section>
    </div>
  );
}
