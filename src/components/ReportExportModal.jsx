import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { addDays, dateKeyFromDate } from "../lib/dailySchedule.js";
import { exportMedicationReportPdf } from "../lib/medicationReport.js";

const inputClass =
  "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";

const RANGE_PRESETS = [
  { key: "1m", label: "最近1个月", days: 30 },
  { key: "3m", label: "最近3个月", days: 90 },
  { key: "6m", label: "最近6个月", days: 180 },
];

function buildPresetRange(days, endKey = dateKeyFromDate(new Date())) {
  return {
    startDateKey: addDays(endKey, -(days - 1)),
    endDateKey: endKey,
  };
}

export default function ReportExportModal({ open, onClose, state }) {
  const todayKey = dateKeyFromDate(new Date());
  const minKey = useMemo(() => addDays(todayKey, -364), [todayKey]);
  const defaultRange = useMemo(() => buildPresetRange(30, todayKey), [todayKey]);

  const [startDateKey, setStartDateKey] = useState(defaultRange.startDateKey);
  const [endDateKey, setEndDateKey] = useState(defaultRange.endDateKey);
  const [activePreset, setActivePreset] = useState("1m");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStartDateKey(defaultRange.startDateKey);
    setEndDateKey(defaultRange.endDateKey);
    setActivePreset("1m");
    setExporting(false);
  }, [open, defaultRange.startDateKey, defaultRange.endDateKey]);

  if (!open) return null;

  function applyPreset(preset) {
    const range = buildPresetRange(preset.days, todayKey);
    setStartDateKey(range.startDateKey);
    setEndDateKey(range.endDateKey);
    setActivePreset(preset.key);
  }

  function handleStartChange(value) {
    setStartDateKey(value);
    setActivePreset("custom");
    if (value > endDateKey) setEndDateKey(value);
  }

  function handleEndChange(value) {
    setEndDateKey(value);
    setActivePreset("custom");
    if (value < startDateKey) setStartDateKey(value);
  }

  async function handleExport(e) {
    e.preventDefault();
    if (exporting) return;
    if (!startDateKey || !endDateKey) {
      alert("请选择完整的起止日期");
      return;
    }
    if (startDateKey > endDateKey) {
      alert("开始日期不能晚于结束日期");
      return;
    }
    setExporting(true);
    try {
      await exportMedicationReportPdf(state, { startDateKey, endDateKey });
      onClose();
    } catch (error) {
      console.error(error);
      alert("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal title="导出用药报告" onClose={onClose}>
      <form noValidate onSubmit={handleExport} className="space-y-4">
        <div>
          <label className="mb-2 block text-xs text-[#999]">快捷选择</label>
          <div className="grid grid-cols-3 gap-2">
            {RANGE_PRESETS.map((preset) => {
              const active = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`min-h-[44px] rounded-xl text-sm font-medium ${
                    active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            type="date"
            min={minKey}
            max={endDateKey || todayKey}
            value={startDateKey}
            onChange={(e) => handleStartChange(e.target.value)}
          />
          <span className="shrink-0 text-sm text-[#999]">到</span>
          <input
            className={`${inputClass} min-w-0 flex-1`}
            type="date"
            min={startDateKey || minKey}
            max={todayKey}
            value={endDateKey}
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={exporting}
          className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {exporting ? "正在生成 PDF…" : "导出 PDF 报告"}
        </button>
      </form>
    </Modal>
  );
}
