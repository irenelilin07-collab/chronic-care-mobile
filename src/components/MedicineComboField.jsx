import { useEffect, useRef, useState } from "react";
import { isCatalogMedicineName, searchMedicineNames } from "../lib/medicineCatalog.js";
import { ComboDropdownPanel, DropdownTable } from "./ComboDropdownTable.jsx";

const CUSTOM_ROW_PREFIX = "__custom__:";

export default function MedicineComboField({
  label,
  placeholder,
  value,
  onChange,
  onPickName,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  /** 本次聚焦后用户是否在输入框里改过字（用于区分「重新打开选别的」vs「正在搜索」） */
  const [typing, setTyping] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const trimmed = value.trim();
  const filterQuery = open && !typing ? "" : value;
  const catalogRows = open
    ? searchMedicineNames(filterQuery).map((name) => ({ key: name, label: name, value: name }))
    : [];
  const showCustomRow =
    open && trimmed && !isCatalogMedicineName(trimmed) && !catalogRows.some((row) => row.value === trimmed);
  const rows = showCustomRow
    ? [
        {
          key: `${CUSTOM_ROW_PREFIX}${trimmed}`,
          label: `使用「${trimmed}」`,
          value: trimmed,
          sub: "自定义药品，请填写下方单位与剂量",
        },
        ...catalogRows,
      ]
    : catalogRows;

  function closeDropdown() {
    setOpen(false);
    setTyping(false);
  }

  function confirmName(name) {
    onPickName(name);
    closeDropdown();
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      closeDropdown();
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
          setTyping(true);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setTyping(false);
          setOpen(true);
          if (value && isCatalogMedicineName(value)) e.target.select();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (trimmed) confirmName(trimmed);
          }
          if (e.key === "Escape") {
            closeDropdown();
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (panelRef.current?.contains(document.activeElement)) return;
            if (wrapRef.current?.contains(document.activeElement)) return;
            closeDropdown();
          }, 0);
        }}
      />
      <ComboDropdownPanel anchorRef={inputRef} open={open} panelRef={panelRef}>
        <DropdownTable
          header="药品名称"
          rows={rows}
          selectedKey={isCatalogMedicineName(trimmed) ? trimmed : showCustomRow ? `${CUSTOM_ROW_PREFIX}${trimmed}` : null}
          emptyText="未找到匹配项，可直接使用当前输入并填写下方信息"
          onSelect={(name) => confirmName(name)}
        />
      </ComboDropdownPanel>
    </div>
  );
}
