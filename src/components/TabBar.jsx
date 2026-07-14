import { TABS } from "../lib/storage.js";
import { formatOverdueBadge } from "../lib/overdueCheckin.js";
import { IconAppointment, IconInventory, IconPlan, IconSettings } from "./TabIcons.jsx";

const TAB_ITEMS = [
  { key: TABS.today, label: "用药", Icon: IconPlan },
  { key: TABS.inventory, label: "药箱", Icon: IconInventory },
  { key: TABS.appointment, label: "复诊", Icon: IconAppointment },
  { key: TABS.profile, label: "设置", Icon: IconSettings },
];

const BADGE_TONE = {
  red: "bg-[#e74c3c] text-white shadow-[0_1px_3px_rgba(231,76,60,0.45)]",
  gray: "bg-[#c5c8cd] text-white",
};

function TabBadge({ count, tone = "red" }) {
  const text = formatOverdueBadge(count);
  if (!text) return null;
  const toneClass = BADGE_TONE[tone] || BADGE_TONE.red;
  return (
    <span
      className={`absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full px-1 py-px text-center text-[10px] font-bold leading-[14px] ${toneClass}`}
      aria-label={`${count} 条未完成用药`}
    >
      {text}
    </span>
  );
}

export default function TabBar({
  activeTab,
  onChange,
  todayBadgeCount = 0,
  todayBadgeTone = "red",
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 px-1 pt-1">
        {TAB_ITEMS.map((tab) => {
          const active = activeTab === tab.key;
          const { Icon } = tab;
          const showBadge = tab.key === TABS.today && todayBadgeCount > 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className="tab-btn flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 outline-none"
            >
              <span className="relative inline-flex">
                <Icon active={active} />
                {showBadge ? (
                  <TabBadge count={todayBadgeCount} tone={todayBadgeTone} />
                ) : null}
              </span>
              <span
                className={`text-sm font-medium ${
                  active ? "text-[#00c896]" : "text-[#999]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
