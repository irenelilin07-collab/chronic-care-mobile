import { useEffect, useRef, useState } from "react";
import { searchMedicineNames } from "../lib/medicineCatalog.js";
import { ComboDropdownPanel, DropdownTable } from "./ComboDropdownTable.jsx";

export default function MedicineComboField({
  label,
  placeholder,
  value,
  onChange,
  onPickName,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const rows = open
    ? searchMedicineNames(value).map((name) => ({ key: name, label: name, value: name }))
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
      <label className={`mb-1 block text-[#999] ${compact ? "text-[11px]" : "text-xs"}`}>
        {label}
      </label>
      <input
        ref={inputRef}
        className={`w-full rounded-xl border border-[#eee] bg-[#fafafa] text-[#333] outline-none focus:border-[#00c896] ${
          compact ? "px-2.5 py-2 text-xs" : "px-3 py-3 text-sm"
        }`}
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
          header="药品名称"
          rows={rows}
          selectedKey={value || null}
          emptyText="未找到匹配项，可继续手动输入"
          onSelect={(name) => {
            onPickName(name);
            setOpen(false);
          }}
        />
      </ComboDropdownPanel>
    </div>
  );
}
