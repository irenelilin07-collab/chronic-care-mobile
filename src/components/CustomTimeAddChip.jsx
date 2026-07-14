import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CircleIconButton from "./CircleIconButton.jsx";
import PlusIcon from "./PlusIcon.jsx";
import TimeWheelPicker from "./TimeWheelPicker.jsx";

function getPickerPosition(btn) {
  const rect = btn.getBoundingClientRect();
  const panelWidth = 240;
  const panelHeight = 244;
  const gap = 6;
  let top = rect.bottom + gap;
  if (top + panelHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - panelHeight - gap);
  }
  const left = Math.min(
    Math.max(12, rect.right - panelWidth),
    window.innerWidth - panelWidth - 12
  );
  return { top, left, width: panelWidth };
}

export default function CustomTimeAddChip({ value, onChange, onAdd }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      const inBtn = btnRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inBtn && !inPanel) setOpen(false);
    }

    function updatePosition() {
      const btn = btnRef.current;
      if (!btn) return;
      setPanelStyle(getPickerPosition(btn));
    }

    updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function openPicker() {
    if (!value) onChange("08:00");
    const btn = btnRef.current;
    if (btn) setPanelStyle(getPickerPosition(btn));
    setOpen(true);
  }

  function confirmAdd() {
    onAdd();
    setOpen(false);
  }

  return (
    <>
      <CircleIconButton
        ref={btnRef}
        size="xs"
        label="自定义添加时间"
        onClick={openPicker}
        className="shrink-0"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </CircleIconButton>
      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[60] overflow-hidden rounded-xl border border-[#d4f0e6] bg-white shadow-[0_4px_16px_rgba(0,200,150,0.14)]"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              <TimeWheelPicker value={value} onChange={onChange} />
              <button
                type="button"
                onClick={confirmAdd}
                className="form-body w-full border-t border-[#eef7f2] py-2.5 font-semibold text-[#00a87a] active:bg-[#f0fbf7]"
              >
                添加
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
