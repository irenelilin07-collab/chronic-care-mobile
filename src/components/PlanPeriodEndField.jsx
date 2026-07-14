import { useEffect, useMemo, useRef, useState } from "react";

const inputClass =
  "form-body w-full min-w-0 rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-[#333] outline-none focus:border-[#00c896]";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(value, emptyLabel = "选择日期") {
  if (!value) return emptyLabel;
  return String(value).replace(/-/g, "/");
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const day = prevDays - startOffset + i + 1;
    cells.push({
      key: `p-${day}`,
      day,
      dateKey: toDateKey(new Date(year, month - 1, day)),
      outside: true,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `c-${day}`,
      day,
      dateKey: toDateKey(new Date(year, month, day)),
      outside: false,
    });
  }
  while (cells.length % 7 !== 0) {
    const day = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({
      key: `n-${day}`,
      day,
      dateKey: toDateKey(new Date(year, month + 1, day)),
      outside: true,
    });
  }
  return cells;
}

function DateCalendarPanel({
  open,
  value,
  minDate,
  longTerm = false,
  showLongTerm = false,
  onSelectDate,
  onSelectLongTerm,
  onClear,
  onClose,
  align = "left",
}) {
  const rootRef = useRef(null);
  const initial = parseDateKey(value) || new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  useEffect(() => {
    if (!open) return undefined;
    const base = parseDateKey(value) || new Date();
    setCursor({ year: base.getFullYear(), month: base.getMonth() });
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) onClose?.();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose]);

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );
  const todayKey = toDateKey(new Date());
  const minKey = minDate || "";

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={`absolute top-full z-40 mt-1 w-[min(100vw-2.5rem,20rem)] overflow-hidden rounded-xl border border-[#eee] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.1)] ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="form-title text-[#1a1a1a]">
          {cursor.year}年{pad2(cursor.month + 1)}月
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#666] active:bg-[#f5f6f8]"
            onClick={() =>
              setCursor((prev) => {
                const month = prev.month - 1;
                if (month < 0) return { year: prev.year - 1, month: 11 };
                return { ...prev, month };
              })
            }
            aria-label="上一月"
          >
            ‹
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#666] active:bg-[#f5f6f8]"
            onClick={() =>
              setCursor((prev) => {
                const month = prev.month + 1;
                if (month > 11) return { year: prev.year + 1, month: 0 };
                return { ...prev, month };
              })
            }
            aria-label="下一月"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK_LABELS.map((label) => (
          <div key={label} className="form-body-muted py-1 text-center text-[12px]">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const disabled = Boolean(minKey && cell.dateKey < minKey);
          const selected = !longTerm && value === cell.dateKey;
          const isToday = cell.dateKey === todayKey;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(cell.dateKey)}
              className={`form-body flex h-9 items-center justify-center rounded-lg ${
                selected
                  ? "bg-[#00c896] font-medium text-white"
                  : isToday
                    ? "bg-[#e8faf4] text-[#00a87a]"
                    : cell.outside
                      ? "text-[#ccc]"
                      : "text-[#333] active:bg-[#f5f6f8]"
              } ${disabled ? "opacity-30" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-2.5">
        <button
          type="button"
          className="form-body text-[#666] active:opacity-70"
          onClick={onClear}
        >
          清除
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="form-body text-[#00a87a] active:opacity-70"
            onClick={() => {
              const next = minKey && todayKey < minKey ? minKey : todayKey;
              onSelectDate(next);
            }}
          >
            今天
          </button>
          {showLongTerm ? (
            <button
              type="button"
              className={`form-body rounded-full px-2.5 py-1 ${
                longTerm ? "bg-[#00c896] text-white" : "bg-[#e8faf4] text-[#00a87a]"
              }`}
              onClick={onSelectLongTerm}
            >
              长期服用
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DateFieldButton({
  value,
  display,
  open,
  onOpenChange,
  longTerm = false,
  showLongTerm = false,
  minDate,
  align = "left",
  onSelectDate,
  onSelectLongTerm,
  onClear,
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${
          longTerm ? "text-[#00a87a]" : value ? "text-[#333]" : "text-[#c4c8ce]"
        }`}
      >
        <span className="truncate">{display}</span>
        <svg
          className="h-4 w-4 shrink-0 text-[#999]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M8 3v4M16 3v4M4 10h16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <DateCalendarPanel
        open={open}
        value={value}
        minDate={minDate}
        longTerm={longTerm}
        showLongTerm={showLongTerm}
        align={align}
        onClose={() => onOpenChange(false)}
        onSelectDate={(dateKey) => {
          onSelectDate(dateKey);
          onOpenChange(false);
        }}
        onSelectLongTerm={() => {
          onSelectLongTerm?.();
          onOpenChange(false);
        }}
        onClear={() => {
          onClear();
          onOpenChange(false);
        }}
      />
    </div>
  );
}

/**
 * 服药周期：开始/结束均用同一套自定义日历；结束日历额外提供「长期服用」。
 */
export default function PlanPeriodEndField({
  startDate,
  longTerm,
  endDate,
  minDate,
  onStartDateChange,
  onChange,
  className = "",
}) {
  const [openSide, setOpenSide] = useState(null); // "start" | "end" | null

  return (
    <div className={className}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <DateFieldButton
          value={startDate}
          display={formatDisplay(startDate)}
          open={openSide === "start"}
          onOpenChange={(next) => setOpenSide(next ? "start" : null)}
          align="left"
          onSelectDate={(dateKey) => onStartDateChange?.(dateKey)}
          onClear={() => onStartDateChange?.("")}
        />
        <span className="form-body-muted shrink-0">—</span>
        <DateFieldButton
          value={endDate}
          display={longTerm ? "长期服用" : formatDisplay(endDate)}
          open={openSide === "end"}
          onOpenChange={(next) => setOpenSide(next ? "end" : null)}
          longTerm={longTerm}
          showLongTerm
          minDate={minDate || startDate}
          align="right"
          onSelectDate={(dateKey) => onChange({ longTerm: false, endDate: dateKey })}
          onSelectLongTerm={() => onChange({ longTerm: true, endDate: "" })}
          onClear={() => onChange({ longTerm: false, endDate: "" })}
        />
      </div>
    </div>
  );
}
