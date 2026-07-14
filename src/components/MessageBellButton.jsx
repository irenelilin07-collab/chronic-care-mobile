import { formatOverdueBadge } from "../lib/overdueCheckin.js";

const BADGE_TONE = {
  red: "bg-[#e74c3c] text-white",
  gray: "bg-[#c5c8cd] text-white",
};

export default function MessageBellButton({ onClick, unreadCount = 0, badgeTone = "red" }) {
  const badge = formatOverdueBadge(unreadCount);
  const toneClass = BADGE_TONE[badgeTone] || BADGE_TONE.red;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0 ? `消息中心，今天还有 ${unreadCount} 次未完成` : "消息中心"
      }
      title="消息中心"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#eee] bg-white text-[#666] transition-colors active:bg-[#f5f6f8]"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 9.5a6 6 0 1 1 12 0c0 3.2.8 4.6 1.4 5.5.3.4 0 1-.5 1H5.1c-.5 0-.8-.6-.5-1 .6-.9 1.4-2.3 1.4-5.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M10 18.5a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {badge ? (
        <span
          className={`absolute -right-1 -top-1 min-w-[16px] rounded-full px-1 py-px text-center text-[10px] font-bold leading-[14px] ${toneClass}`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
