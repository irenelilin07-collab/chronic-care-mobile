import { useEffect, useMemo, useState } from "react";
import PlanEmptyState from "../components/PlanEmptyState.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import TodayTaskCard from "../components/TodayTaskCard.jsx";
import WeekStripe from "../components/WeekStripe.jsx";
import {
  addDays,
  applyMedicineStockDelta,
  buildTasksForDate,
  computeDayProgress,
  dateKeyFromDate,
  groupTasksBySlot,
  isIntakeTaken,
  toggleIntakeRecord,
} from "../lib/dailySchedule.js";
import { entriesForDate } from "../lib/journalEntry.js";
import {
  canToggleCheckin,
  getTaskTimingStatus,
  OVERDUE_REFRESH_MS,
} from "../lib/overdueCheckin.js";

function formatSelectedDate(dateKey) {
  const today = dateKeyFromDate(new Date());
  if (dateKey === today) return "今天";
  return dateKey.replace(/-/g, ".");
}

export default function TodayBoardPage({
  selectedDateKey,
  onDateChange,
  medicines,
  medicationPlans,
  intakeRecords,
  journalEntries,
  onIntakeChange,
  onMedicinesChange,
  guideHighlight = null,
}) {
  const todayKey = dateKeyFromDate(new Date());
  const [overdueTick, setOverdueTick] = useState(0);

  useEffect(() => {
    if (selectedDateKey !== todayKey) return undefined;
    const timer = window.setInterval(() => {
      setOverdueTick((value) => value + 1);
    }, OVERDUE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [selectedDateKey, todayKey]);

  const tasks = useMemo(
    () => buildTasksForDate(selectedDateKey, medicationPlans, medicines),
    [selectedDateKey, medicationPlans, medicines]
  );

  const progress = useMemo(
    () => computeDayProgress(tasks, intakeRecords),
    [tasks, intakeRecords]
  );

  const slotGroups = useMemo(() => groupTasksBySlot(tasks), [tasks]);

  const firstPendingTask = useMemo(
    () =>
      tasks.find((task) => {
        if (selectedDateKey === todayKey) {
          return canToggleCheckin(task, intakeRecords) && !isIntakeTaken(
            intakeRecords,
            task.dateKey,
            task.planId,
            task.time
          );
        }
        return !isIntakeTaken(intakeRecords, task.dateKey, task.planId, task.time);
      }) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, intakeRecords, selectedDateKey, todayKey, overdueTick]
  );

  const [guideCheckinTargetId, setGuideCheckinTargetId] = useState(null);

  useEffect(() => {
    if (guideHighlight !== "guide-checkin") {
      setGuideCheckinTargetId(null);
      return;
    }
    if (guideCheckinTargetId) return;
    if (firstPendingTask) {
      setGuideCheckinTargetId(firstPendingTask.id);
    }
  }, [guideHighlight, guideCheckinTargetId, firstPendingTask]);

  const highlightCheckin = guideHighlight === "guide-checkin" && Boolean(guideCheckinTargetId);

  const dayAdverseEntries = useMemo(
    () =>
      entriesForDate(journalEntries, selectedDateKey).filter(
        (entry) => entry.entryType === "adverse"
      ),
    [journalEntries, selectedDateKey]
  );

  const dateLabel = formatSelectedDate(selectedDateKey);

  function handleToggle(task, nextTaken) {
    const currentlyTaken = isIntakeTaken(intakeRecords, task.dateKey, task.planId, task.time);
    if (currentlyTaken === nextTaken) return;
    // 超过 1 小时未打卡：不可再打卡；已打卡的仍可取消
    if (nextTaken && !canToggleCheckin(task, intakeRecords)) return;

    onIntakeChange(toggleIntakeRecord(intakeRecords, task.id, nextTaken));

    if (task.medicineId && task.doseAmount > 0) {
      const delta = nextTaken ? -task.doseAmount : task.doseAmount;
      onMedicinesChange((prev) => applyMedicineStockDelta(prev, task.medicineId, delta));
    }
  }

  function shiftWeek(direction) {
    onDateChange(addDays(selectedDateKey, direction * 7));
  }

  if (medicationPlans.length === 0) {
    return <PlanEmptyState hasMedicines={medicines.length > 0} />;
  }

  const taskList = (
    <>
      {tasks.length === 0 ? (
        <section className="app-card px-4 py-8 text-center">
          <p className="text-sm text-[#999]">今日暂无用药任务</p>
        </section>
      ) : (
        slotGroups.map((group, index) => (
          <section key={group.key} className={index > 0 ? "mt-3" : ""}>
            <div className="mb-2 flex items-center gap-3 px-0.5">
              <span className="shrink-0 text-sm leading-snug text-[#999]">{group.label}</span>
              <span className="h-px flex-1 bg-[#eee]" aria-hidden="true" />
            </div>
            <ul className="space-y-2">
              {group.tasks.map((task) => {
                const taken = isIntakeTaken(intakeRecords, task.dateKey, task.planId, task.time);
                const timingStatus =
                  selectedDateKey === todayKey
                    ? getTaskTimingStatus(task, intakeRecords)
                    : taken
                      ? "taken"
                      : "scheduled";
                const showGuideHighlight =
                  highlightCheckin && guideCheckinTargetId === task.id && !taken;
                return (
                  <TodayTaskCard
                    key={task.id}
                    task={task}
                    taken={taken}
                    onToggle={handleToggle}
                    guideHighlight={showGuideHighlight}
                    timingStatus={timingStatus}
                  />
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );

  return (
    <div className="space-y-3 pb-24">
      <ProgressRing percent={progress.percent} done={progress.done} total={progress.total} />

      <WeekStripe
        selectedDateKey={selectedDateKey}
        onSelect={onDateChange}
        onWeekShift={shiftWeek}
        plans={medicationPlans}
        medicines={medicines}
        intakeRecords={intakeRecords}
      />

      <div className="px-0.5">
        <h3 className="text-base font-bold leading-snug text-[#1a1a1a]">
          {dateLabel}的用药任务
        </h3>
        {dayAdverseEntries.length > 0 ? (
          <p className="mt-1 text-sm text-[#999]">已记 {dayAdverseEntries.length} 次不适</p>
        ) : null}
      </div>

      {taskList}
    </div>
  );
}
