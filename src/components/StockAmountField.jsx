export default function StockAmountField({
  label,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  amountPlaceholder = "如：30",
  unitPlaceholder = "如：片",
  amountType = "number",
  unitLocked = false,
}) {
  const inputClass =
    "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";
  const lockedClass =
    "w-full rounded-xl border border-[#eee] bg-[#f0f0f0] px-3 py-3 text-sm text-[#999] outline-none cursor-not-allowed";

  return (
    <div>
      {label ? <p className="mb-1 text-xs text-[#999]">{label}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#999]">数量</label>
          <input
            className={inputClass}
            type={amountType}
            min={amountType === "number" ? "0" : undefined}
            step={amountType === "number" ? "any" : undefined}
            placeholder={amountPlaceholder}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#999]">单位</label>
          <input
            className={unitLocked ? lockedClass : inputClass}
            placeholder={unitPlaceholder}
            value={unit}
            readOnly={unitLocked}
            onChange={unitLocked ? undefined : (e) => onUnitChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
