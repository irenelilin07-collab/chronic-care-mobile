export default function BottomAddButton({ label, onClick, fixed = false }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,200,150,0.35)]"
    >
      {label}
    </button>
  );

  if (fixed) {
    return (
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
        {button}
      </div>
    );
  }

  return <div className="mt-3">{button}</div>;
}
