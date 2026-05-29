import { useEffect, useRef, useState } from "react";
import { searchMedicineSpecUnits } from "../lib/medicineCatalog.js";
import { ComboDropdownPanel, DropdownTable } from "./ComboDropdownTable.jsx";

export default function UnitComboField({
  label,
  placeholder,
  value,
  medicineName = "",
  specAmount = "",
  onChange,
  onPick,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const rows = open
    ? searchMedicineSpecUnits(value, medicineName, specAmount).map((unit) => ({
        key: unit,
        label: unit,
        value: unit,
      }))
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-1 block text-xs text-[#999]">{label}</label>
      <input
        ref={inputRef}
        className="w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <ComboDropdownPanel anchorRef={inputRef} open={open} panelRef={panelRef}>
        <DropdownTable
          header="规格单位"
          rows={rows}
          selectedKey={value || null}
          emptyText="未找到匹配项，可继续手动输入"
          onSelect={(unit) => {
            onPick(unit);
            setOpen(false);
          }}
        />
      </ComboDropdownPanel>
    </div>
  );
}
