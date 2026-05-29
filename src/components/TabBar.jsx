import { TABS } from "../lib/storage.js";
import { IconAppointment, IconInventory, IconPlan, IconSettings } from "./TabIcons.jsx";

const TAB_ITEMS = [
  { key: TABS.today, label: "用药计划", Icon: IconPlan },
  { key: TABS.inventory, label: "我的药箱", Icon: IconInventory },
  { key: TABS.appointment, label: "复诊计划", Icon: IconAppointment },
  { key: TABS.profile, label: "设置", Icon: IconSettings },
];

export default function TabBar({ activeTab, onChange }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 px-1 pt-1">
        {TAB_ITEMS.map((tab) => {
          const active = activeTab === tab.key;
          const { Icon } = tab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className="tab-btn flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 outline-none"
            >
              <Icon active={active} />
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
