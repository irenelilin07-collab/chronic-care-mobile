export default function Modal({ title, onClose, children, compact = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        className={`flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl ${
          compact ? "max-h-[94vh] p-4" : "max-h-[85vh] p-5"
        }`}
      >
        <div className={`flex shrink-0 items-center justify-between ${compact ? "mb-2" : "mb-4"}`}>
          <h3 className="form-title text-[#1a1a1a]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`form-body rounded-full bg-[#f5f6f8] text-[#666] ${
              compact ? "px-2.5 py-0.5" : "px-3 py-1"
            }`}
          >
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
