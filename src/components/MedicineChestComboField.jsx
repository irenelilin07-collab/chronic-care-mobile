import { useEffect, useRef, useState } from "react";
import { formatSpec } from "../lib/medicine.js";
import { ComboDropdownPanel, DropdownTable } from "./ComboDropdownTable.jsx";

export default function MedicineChestComboField({
  placeholder = "从药箱选择药品",
  medicines,
  medicineId,
  onPickMedicine,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const selected = medicines.find((item) => item.id === medicineId);

  useEffect(() => {
    setQuery(selected?.name || "");
  }, [selected?.name, medicineId]);

  const filtered = medicines.filter(
    (item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const rows = filtered.map((item) => ({
    key: item.id,
    label: item.name,
    sub: formatSpec(item),
    value: { medicineId: item.id },
  }));

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery(selected?.name || "");
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected?.name]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        className="form-body w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-[#333] outline-none focus:border-[#00c896]"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          if (medicineId && selected?.name !== next) {
            onPickMedicine({ medicineId: "" });
          }
        }}
        onFocus={() => setOpen(true)}
      />
      <ComboDropdownPanel anchorRef={inputRef} open={open && medicines.length > 0} panelRef={panelRef}>
        <DropdownTable
          rows={rows}
          selectedKey={medicineId || null}
          emptyText="药箱中未找到匹配药品"
          onSelect={(picked) => {
            onPickMedicine({ medicineId: picked.medicineId });
            setOpen(false);
          }}
        />
      </ComboDropdownPanel>
    </div>
  );
}
