import { createPortal } from "react-dom";
import { useLayoutEffect, useState } from "react";

const PANEL_MAX_HEIGHT = 240;
const PANEL_GAP = 4;

export function ComboDropdownPanel({
  anchorRef,
  open,
  panelRef,
  children,
  className = "",
}) {
  const [placement, setPlacement] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setPlacement(null);
      return undefined;
    }

    function updatePlacement() {
      const rect = anchorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
      const spaceAbove = rect.top - PANEL_GAP;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;

      setPlacement({
        left: rect.left,
        width: rect.width,
        top: openUp ? undefined : rect.bottom + PANEL_GAP,
        bottom: openUp ? window.innerHeight - rect.top + PANEL_GAP : undefined,
        maxHeight: Math.min(PANEL_MAX_HEIGHT, Math.max(available, 120)),
      });
    }

    function handleScroll(e) {
      if (panelRef?.current?.contains(e.target)) return;
      updatePlacement();
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, anchorRef, panelRef]);

  if (!open || !placement) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        left: placement.left,
        width: placement.width,
        top: placement.top,
        bottom: placement.bottom,
        maxHeight: placement.maxHeight,
      }}
      className={`fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-[#d4f0e6] bg-white shadow-[0_4px_16px_rgba(0,200,150,0.14)] ${className}`}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownEmptyHint({ text }) {
  return <div className="form-body-muted shrink-0 px-3 py-4 text-center">{text}</div>;
}

export function DropdownTable({ header, rows, onSelect, emptyText, selectedKey }) {
  if (rows.length === 0) {
    return <DropdownEmptyHint text={emptyText || "未找到匹配项"} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header ? (
        <div className="form-title shrink-0 border-b border-[#eef7f2] bg-[#e8faf4] px-3 py-2 text-[#00a87a]">
          {header}
        </div>
      ) : null}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="form-body w-full text-left">
          <tbody>
            {rows.map((row) => {
              const selected = selectedKey != null && row.key === selectedKey;
              return (
                <tr
                  key={row.key}
                  className={`cursor-pointer border-t border-[#eef7f2] transition-colors first:border-t-0 ${
                    selected
                      ? "bg-[#00c896] text-white"
                      : "text-[#333] active:bg-[#e8faf4] hover:bg-[#f0fbf7]"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(row.value);
                  }}
                >
                  <td className="px-3 py-2.5">
                    <p className={selected ? "font-medium" : ""}>{row.label}</p>
                    {row.sub ? (
                      <p className={`form-body-muted mt-0.5 ${selected ? "text-white/80" : ""}`}>
                        {row.sub}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
