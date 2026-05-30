import { useMemo, useState } from "react";
import { CircleIconWrap } from "../components/CircleIconButton.jsx";
import JournalEntrySheet from "../components/JournalEntrySheet.jsx";
import ProfileSectionModal from "../components/ProfileSectionModal.jsx";
import ReminderSettingsModal from "../components/ReminderSettingsModal.jsx";
import ReportExportModal from "../components/ReportExportModal.jsx";
import { dateKeyFromDate } from "../lib/dailySchedule.js";
import { entriesForDate } from "../lib/journalEntry.js";
import { requestNotificationPermission } from "../lib/medicationReminder.js";
import {
  normalizeProfile,
  profileAvatarInitial,
  summarizeBasicInfo,
  summarizeChronicDiseases,
  summarizeDrugAllergies,
  summarizeEmergencyContact,
} from "../lib/profile.js";
import { normalizeSettings } from "../lib/settings.js";

const PROFILE_SECTIONS = [
  { key: "basic", label: "基本信息", summarize: summarizeBasicInfo, Icon: IconUser },
  { key: "diseases", label: "确诊慢病", summarize: summarizeChronicDiseases, Icon: IconHeart },
  { key: "allergies", label: "药物过敏史", summarize: summarizeDrugAllergies, Icon: IconAllergy },
  {
    key: "emergency",
    label: "紧急联系人",
    summarize: summarizeEmergencyContact,
    Icon: IconPhone,
  },
];

function IconUser({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHeart({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-6.5-4.2-8.5-8.2C2.2 8.8 3.6 6 6.4 6c1.6 0 3 1 3.6 2.2C10.6 7 12 6 13.6 6 16.4 6 17.8 8.8 16.5 11.8 14.5 15.8 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAllergy({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 4 19h16L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.5 5.5h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 16H6l1.2-1.6A4 4 0 0 0 8 11.2V9a4 4 0 1 1 8 0v2.2a4 4 0 0 0 .8 2.4L18 16Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconDownload({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10M8.5 10.5 12 14l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconAdverse({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12h2.5l2-4 2.5 8 2.5-5 2 3H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[#ccc]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="app-card overflow-hidden">
      <p className="px-5 pt-4 pb-1 text-sm font-bold text-[#1a1a1a]">{title}</p>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#00c896]" : "bg-[#ddd]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsListRow({ icon, label, summary, onClick, bordered }) {
  const hasSummary = summary != null;
  const filled =
    hasSummary &&
    summary !== "点击填写" &&
    summary !== "未开启";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-4 text-left active:bg-[#fafafa] ${
        bordered ? "border-t border-[#f0f0f0]" : ""
      }`}
    >
      {icon ? <CircleIconWrap>{icon}</CircleIconWrap> : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#333]">{label}</p>
        {hasSummary ? (
          <p className={`mt-0.5 truncate text-xs ${filled ? "text-[#999]" : "text-[#ccc]"}`}>
            {summary}
          </p>
        ) : (
          <p className="mt-0.5 min-h-[18px] text-xs leading-[18px]" aria-hidden="true" />
        )}
      </div>
      <ChevronRight />
    </button>
  );
}

export default function SettingsPage({
  profile,
  settings,
  medicines,
  medicationPlans,
  intakeRecords,
  journalEntries,
  onProfileChange,
  onSettingsChange,
  onJournalChange,
}) {
  const normalizedProfile = normalizeProfile(profile);
  const normalizedSettings = normalizeSettings(settings);
  const [activeSection, setActiveSection] = useState(null);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  const todayDateKey = dateKeyFromDate(new Date());
  const todayAdverseCount = useMemo(
    () =>
      entriesForDate(journalEntries, todayDateKey).filter(
        (entry) => entry.entryType === "adverse"
      ).length,
    [journalEntries, todayDateKey]
  );

  const adverseSummary =
    todayAdverseCount > 0 ? `今天已记 ${todayAdverseCount} 次` : "记录用药相关不适";

  const { enabled, minutesBefore } = normalizedSettings.medicationReminder;

  function closeSection() {
    setActiveSection(null);
  }

  function handleProfileSave(nextProfile) {
    onProfileChange(normalizeProfile(nextProfile));
    closeSection();
  }

  function handleSettingsSave(nextSettings) {
    onSettingsChange(normalizeSettings(nextSettings));
    setMinutesOpen(false);
  }

  async function handleReminderToggle(nextEnabled) {
    if (nextEnabled) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        alert("请允许浏览器通知权限，才能接收用药提醒");
        return;
      }
    }
    onSettingsChange(
      normalizeSettings({
        ...normalizedSettings,
        medicationReminder: {
          ...normalizedSettings.medicationReminder,
          enabled: nextEnabled,
        },
      })
    );
  }

  return (
    <section className="space-y-3 pb-4">
      <div className="app-card flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#b8f0dc] to-[#00c896] text-2xl text-white">
          {profileAvatarInitial(normalizedProfile)}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#1a1a1a]">{normalizedProfile.nickname}</h2>
          <p className="mt-0.5 text-sm text-[#999]">{normalizedProfile.encouragement}</p>
        </div>
      </div>

      <SettingsSection title="我的档案">
        {PROFILE_SECTIONS.map((item, index) => {
          const { Icon } = item;
          return (
            <SettingsListRow
              key={item.key}
              icon={<Icon />}
              label={item.label}
              summary={item.summarize(normalizedProfile)}
              onClick={() => setActiveSection(item.key)}
              bordered={index > 0}
            />
          );
        })}
      </SettingsSection>

      <SettingsSection title="日常使用">
        <div className="flex items-center gap-3 px-5 py-4">
          <CircleIconWrap>
            <IconBell />
          </CircleIconWrap>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#333]">用药提醒</p>
            <p className="mt-0.5 text-xs text-[#999]">通过浏览器通知提醒您用药</p>
          </div>
          <ToggleSwitch checked={enabled} onChange={handleReminderToggle} />
        </div>
        <button
          type="button"
          onClick={() => setMinutesOpen(true)}
          className="flex w-full items-center gap-3 border-t border-[#f0f0f0] px-5 py-4 text-left active:bg-[#fafafa]"
        >
          <CircleIconWrap>
            <IconClock />
          </CircleIconWrap>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#333]">提前时间</p>
          </div>
          <span className="shrink-0 text-sm text-[#999]">提前 {minutesBefore} 分钟</span>
          <ChevronRight />
        </button>
        <SettingsListRow
          icon={<IconAdverse />}
          label="记录不适"
          summary={adverseSummary}
          onClick={() => setJournalOpen(true)}
          bordered
        />
      </SettingsSection>

      <SettingsSection title="就医备查">
        <SettingsListRow
          icon={<IconDownload />}
          label="导出用药报告"
          summary="含完成率、漏服、不适记录与用药清单"
          onClick={() => setReportOpen(true)}
        />
      </SettingsSection>

      <ProfileSectionModal
        open={Boolean(activeSection)}
        section={activeSection}
        profile={normalizedProfile}
        onClose={closeSection}
        onSave={handleProfileSave}
      />

      <ReminderSettingsModal
        open={minutesOpen}
        settings={normalizedSettings}
        minutesOnly
        onClose={() => setMinutesOpen(false)}
        onSave={handleSettingsSave}
      />

      <ReportExportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        state={{
          profile: normalizedProfile,
          medicines,
          medicationPlans,
          intakeRecords,
          journalEntries,
        }}
      />

      <JournalEntrySheet
        open={journalOpen}
        dateKey={todayDateKey}
        dateLabel="今天"
        medicines={medicines}
        onClose={() => setJournalOpen(false)}
        onSave={(entry) => onJournalChange([...(journalEntries || []), entry])}
      />
    </section>
  );
}
