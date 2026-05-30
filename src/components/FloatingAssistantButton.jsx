import CircleIconButton from "./CircleIconButton.jsx";

function IconVoiceService({ className = "h-9 w-9" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 11.5a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect
        x="5.25"
        y="11.5"
        width="2.75"
        height="5"
        rx="1.375"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="16"
        y="11.5"
        width="2.75"
        height="5"
        rx="1.375"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M17.375 16.5 12.5 19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="19" r="1.1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export default function FloatingAssistantButton({ onClick, label = "用药助手" }) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 justify-end px-4">
      <CircleIconButton
        size="lg"
        variant="primary"
        label={label}
        onClick={onClick}
        className="pointer-events-auto"
      >
        <IconVoiceService />
      </CircleIconButton>
    </div>
  );
}
