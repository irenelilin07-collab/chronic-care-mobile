export default function ConfirmDialog({
  open,
  title = "提示",
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-bold text-[#1a1a1a]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#666]">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-[#f5f6f8] py-3 text-sm font-medium text-[#666]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl py-3 text-sm font-semibold text-white ${
              danger ? "bg-[#ff4d4f]" : "bg-[#00c896]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
