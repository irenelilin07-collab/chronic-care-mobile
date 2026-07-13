import { createPortal } from "react-dom";

export default function AlertDialog({
  open,
  title = "提示",
  message,
  confirmText = "知道了",
  onClose,
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
      >
        <h3 id="alert-dialog-title" className="text-lg font-bold text-[#1a1a1a]">
          {title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#666]">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#00c896] py-3 text-sm font-semibold text-white"
        >
          {confirmText}
        </button>
      </div>
    </div>,
    document.body
  );
}
