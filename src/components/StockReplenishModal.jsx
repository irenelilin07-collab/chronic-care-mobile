import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import StockAmountField from "./StockAmountField.jsx";
import { stockUnitOf } from "../lib/medicine.js";

export default function StockReplenishModal({ open, medicine, onClose, onSave }) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) setAmount("");
  }, [open, medicine?.id]);

  if (!open || !medicine) return null;

  const unit = stockUnitOf(medicine);

  function handleSubmit(e) {
    e.preventDefault();
    const add = Number(amount);
    if (!Number.isFinite(add) || add <= 0) {
      alert("请填写有效的补充数量");
      return;
    }
    onSave(medicine.id, add);
  }

  return (
    <Modal title="补充库存" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-xl bg-[#f5f6f8] px-4 py-3">
          <p className="text-sm font-semibold text-[#1a1a1a]">{medicine.name}</p>
          <p className="mt-1 text-sm text-[#666]">
            当前库存：
            <span className="font-semibold text-[#00a87a]">
              {medicine.stock} {unit}
            </span>
          </p>
        </div>

        <StockAmountField
          label="补充数量"
          amount={amount}
          unit={unit}
          onAmountChange={setAmount}
          onUnitChange={() => {}}
          amountPlaceholder="如：30"
          unitLocked
        />

        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
        >
          确认补充
        </button>
      </form>
    </Modal>
  );
}
