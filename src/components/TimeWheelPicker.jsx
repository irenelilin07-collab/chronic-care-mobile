import { useCallback, useEffect, useRef, useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

function parseTime(value) {
  const [hour = "08", minute = "00"] = (value || "08:00").split(":");
  return { hour, minute };
}

function WheelColumn({ items, value, onChange, ariaLabel }) {
  const listRef = useRef(null);
  const scrollEndTimer = useRef(null);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, items.indexOf(value)));

  const scrollToIndex = useCallback(
    (index, behavior = "auto") => {
      const node = listRef.current;
      if (!node) return;
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      node.scrollTo({ top: clamped * ITEM_HEIGHT, behavior });
      setActiveIndex(clamped);
    },
    [items.length]
  );

  useEffect(() => {
    const index = items.indexOf(value);
    if (index >= 0) scrollToIndex(index);
  }, [value, items, scrollToIndex]);

  function emitSelection(index) {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    const next = items[clamped];
    if (next !== value) onChange(next);
    scrollToIndex(clamped, "smooth");
  }

  function handleScroll() {
    const node = listRef.current;
    if (!node) return;
    const index = Math.round(node.scrollTop / ITEM_HEIGHT);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));

    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      emitSelection(Math.round(node.scrollTop / ITEM_HEIGHT));
    }, 80);
  }

  useEffect(
    () => () => {
      if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    },
    []
  );

  return (
    <ul
      ref={listRef}
      aria-label={ariaLabel}
      className="time-wheel-scroll m-0 flex-1 list-none overflow-y-auto overscroll-contain p-0"
      style={{ height: PICKER_HEIGHT, scrollSnapType: "y mandatory" }}
      onScroll={handleScroll}
    >
      <li aria-hidden="true" className="shrink-0" style={{ height: PADDING }} />
      {items.map((item, index) => {
        const distance = Math.abs(index - activeIndex);
        const opacity = distance === 0 ? 1 : distance === 1 ? 0.38 : 0.2;
        const scale = distance === 0 ? 1 : 0.94;
        const selected = index === activeIndex;

        return (
          <li
            key={item}
            className="flex shrink-0 items-center justify-center"
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
          >
            <button
              type="button"
              onClick={() => emitSelection(index)}
              className={`w-full text-center transition-all duration-150 ${
                selected ? "form-title text-[#1a1a1a]" : "form-body text-[#666]"
              }`}
              style={{ opacity, transform: `scale(${scale})` }}
            >
              {item}
            </button>
          </li>
        );
      })}
      <li aria-hidden="true" className="shrink-0" style={{ height: PADDING }} />
    </ul>
  );
}

export default function TimeWheelPicker({ value, onChange }) {
  const { hour, minute } = parseTime(value);

  function update(nextHour, nextMinute) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div className="relative bg-white px-1 py-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 z-10 rounded-lg border-y border-[#ddd] bg-[#f5f6f8]/55"
        style={{ top: PADDING, height: ITEM_HEIGHT }}
      />
      <div className="relative z-0 flex" style={{ height: PICKER_HEIGHT }}>
        <WheelColumn
          ariaLabel="小时"
          items={HOURS}
          value={hour}
          onChange={(nextHour) => update(nextHour, minute)}
        />
        <div
          className="form-title flex w-4 shrink-0 items-center justify-center text-[#1a1a1a]"
          aria-hidden="true"
        >
          :
        </div>
        <WheelColumn
          ariaLabel="分钟"
          items={MINUTES}
          value={minute}
          onChange={(nextMinute) => update(hour, nextMinute)}
        />
      </div>
    </div>
  );
}

/** @deprecated use default export TimeWheelPicker */
export function TimePickerPanel(props) {
  return <TimeWheelPicker {...props} />;
}
