import { useEffect, useMemo, useState } from "react";
import JournalEntrySheet from "../components/JournalEntrySheet.jsx";
import ProfileSectionModal from "../components/ProfileSectionModal.jsx";
import ReportExportModal from "../components/ReportExportModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { guideHighlightClass } from "../lib/appGuide.js";
import { dateKeyFromDate } from "../lib/dailySchedule.js";
import { entriesForDate } from "../lib/journalEntry.js";
import {
  normalizeProfile,
  summarizeBasicInfo,
  summarizeChronicDiseases,
  summarizeDrugAllergies,
  summarizeEmergencyContact,
} from "../lib/profile.js";
const ICON_TONES = {
  green: "bg-[#e8faf4] text-[#00a87a]",
  mint: "bg-[#e6f7f2] text-[#1aad7a]",
  blue: "bg-[#eef5ff] text-[#4a8fe2]",
  peach: "bg-[#fff3eb] text-[#e08a4c]",
  rose: "bg-[#ffeef2] text-[#d66a86]",
  sand: "bg-[#fff8e8] text-[#c49a3c]",
};

const PROFILE_SECTIONS = [
  { key: "basic", label: "基本信息", summarize: summarizeBasicInfo, Icon: IconUser, tone: "blue" },
  {
    key: "diseases",
    label: "确诊慢病",
    summarize: summarizeChronicDiseases,
    Icon: IconHeart,
    tone: "rose",
  },
  {
    key: "allergies",
    label: "药物过敏史",
    summarize: summarizeDrugAllergies,
    Icon: IconAllergy,
    tone: "peach",
  },
  {
    key: "emergency",
    label: "紧急联系人",
    summarize: summarizeEmergencyContact,
    Icon: IconPhone,
    tone: "green",
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
    <svg className="h-4 w-4 shrink-0 text-[#c8ccd2]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SoftIcon({ tone = "green", children }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ICON_TONES[tone] || ICON_TONES.green}`}
    >
      {children}
    </span>
  );
}

function SettingsCard({ children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-[22px] bg-white shadow-[0_4px_20px_rgba(31,41,55,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <SettingsCard>
      {title ? (
        <p className="px-5 pt-4 pb-1 text-[13px] font-semibold text-[#9aa0a6]">{title}</p>
      ) : null}
      {children}
    </SettingsCard>
  );
}

function ToggleSwitch({ checked, onChange, disabled = false, variant = "default" }) {
  const onBanner = variant === "onBanner";
  const trackClass = onBanner
    ? checked
      ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-2 ring-white/80"
      : "bg-white/35 ring-1 ring-white/50"
    : checked
      ? "bg-[#00c896]"
      : "bg-[#e2e5ea]";
  const knobClass = onBanner
    ? checked
      ? "bg-[#2a9a74]"
      : "bg-white"
    : "bg-white";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${trackClass}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-transform ${knobClass} ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsListRow({ icon, label, summary, onClick, bordered, trailing = null }) {
  const hasSummary = summary != null;
  const filled =
    hasSummary && summary !== "点击填写" && summary !== "未开启";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 px-5 py-3.5 text-left active:bg-[#fafbfc] ${
        bordered ? "border-t border-[#f2f3f5]" : ""
      }`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[#2b2f36]">{label}</p>
        {hasSummary ? (
          <p className={`mt-0.5 truncate text-[12px] ${filled ? "text-[#9aa0a6]" : "text-[#c4c8ce]"}`}>
            {summary}
          </p>
        ) : null}
      </div>
      {trailing}
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
  guideHighlight = null,
}) {
  const {
    user,
    role,
    patientNickname,
    logout,
    setAdminModeEnabled,
    loadInviteCode,
    regenerateInviteCode,
  } = useAuth();
  const isPatient = role === "patient";
  const isAdmin = role === "admin";
  const [adminModeBusy, setAdminModeBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [invite, setInvite] = useState(null);
  const [adminError, setAdminError] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const normalizedProfile = normalizeProfile(profile);
  const [activeSection, setActiveSection] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const avatarLetter = String(user?.username || "用").slice(0, 1).toUpperCase();

  function closeSection() {
    setActiveSection(null);
  }

  function handleProfileSave(nextProfile) {
    onProfileChange(normalizeProfile(nextProfile));
    closeSection();
  }

  const adminModeEnabled = Boolean(user?.adminModeEnabled);

  useEffect(() => {
    if (!isPatient || !adminModeEnabled) {
      setInvite(null);
      return;
    }

    let cancelled = false;
    setAdminError("");
    void loadInviteCode()
      .then((result) => {
        if (cancelled) return;
        setInvite(result.invite || null);
      })
      .catch((error) => {
        if (cancelled) return;
        setAdminError(error.message || "加载邀请码失败");
      });

    return () => {
      cancelled = true;
    };
  }, [isPatient, adminModeEnabled, loadInviteCode]);

  async function handleAdminModeToggle(nextEnabled) {
    if (adminModeBusy) return;
    setAdminError("");
    setCopyHint("");
    setAdminModeBusy(true);
    try {
      await setAdminModeEnabled(nextEnabled);
      if (!nextEnabled) {
        setInvite(null);
      }
    } catch (error) {
      setAdminError(error.message || "更新管理员模式失败");
    } finally {
      setAdminModeBusy(false);
    }
  }

  async function handleGenerateInvite() {
    if (inviteBusy) return;
    setAdminError("");
    setCopyHint("");
    setInviteBusy(true);
    try {
      const result = await regenerateInviteCode();
      setInvite(result.invite || null);
    } catch (error) {
      setAdminError(error.message || "生成邀请码失败");
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleCopyInvite() {
    if (!invite?.code) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopyHint("已复制");
      window.setTimeout(() => setCopyHint(""), 1500);
    } catch {
      setCopyHint("复制失败，请手动长按选中");
    }
  }

  function formatInviteExpiry(expiresAt) {
    if (!expiresAt) return "";
    try {
      return new Date(expiresAt).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <section className="space-y-4 pb-5">
      {/* 账号头区 */}
      <div className="flex items-center gap-3.5 px-1 pt-1">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8fe3c4] to-[#00c896] text-xl font-bold text-white shadow-[0_6px_16px_rgba(0,200,150,0.28)]">
          {avatarLetter}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="truncate text-lg font-bold text-[#2b2f36]">{user?.username || "—"}</p>
          {isAdmin ? (
            <span className="shrink-0 rounded-full bg-[#e8faf4] px-2.5 py-0.5 text-[11px] font-semibold text-[#00a87a]">
              管理 {patientNickname || "患者"}
            </span>
          ) : null}
        </div>
      </div>

      {/* 管理员模式：深绿高级色卡 + 简洁分区 */}
      {isPatient ? (
        <SettingsCard className="bg-gradient-to-br from-[#1f6b55] via-[#248066] to-[#2a9a74] text-white shadow-[0_8px_24px_rgba(31,107,85,0.22)]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-none">允许开启管理员模式</p>
                <p className="mt-2 text-[12px] leading-5 text-white/70">
                  开启后可为家属生成邀请码
                </p>
              </div>
              <ToggleSwitch
                checked={adminModeEnabled}
                disabled={adminModeBusy}
                onChange={handleAdminModeToggle}
                variant="onBanner"
              />
            </div>

            {adminModeEnabled ? (
              <div className="mt-4 border-t border-white/15 pt-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] text-white/65">邀请码</p>
                    <p className="mt-1.5 font-mono text-[28px] font-bold leading-none tracking-[0.18em]">
                      {invite?.code || "------"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/60">
                  {invite?.expiresAt
                    ? `有效期至 ${formatInviteExpiry(invite.expiresAt)} · 一码一用`
                    : "尚未生成，点击下方按钮获取"}
                </p>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!invite?.code}
                    onClick={handleCopyInvite}
                    className="rounded-full bg-white/15 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {copyHint || "复制"}
                  </button>
                  <button
                    type="button"
                    disabled={inviteBusy}
                    onClick={handleGenerateInvite}
                    className="rounded-full bg-[#b8f5dc] py-2.5 text-sm font-semibold text-[#145c45] disabled:opacity-50"
                  >
                    {inviteBusy ? "生成中…" : invite?.code ? "重新生成" : "生成邀请码"}
                  </button>
                </div>
              </div>
            ) : null}

            {adminError ? (
              <p className="mt-3 text-[12px] leading-5 text-[#ffe1e1]">{adminError}</p>
            ) : null}
          </div>
        </SettingsCard>
      ) : null}

      <SettingsSection title={isAdmin ? "患者档案" : "我的档案"}>
        {PROFILE_SECTIONS.map((item, index) => {
          const { Icon } = item;
          const row = (
            <SettingsListRow
              key={item.key}
              icon={
                <SoftIcon tone={item.tone}>
                  <Icon />
                </SoftIcon>
              }
              label={item.label}
              summary={item.summarize(normalizedProfile)}
              onClick={() => setActiveSection(item.key)}
              bordered={index > 0}
            />
          );

          if (item.key === "diseases") {
            return (
              <div
                key={item.key}
                id="guide-diseases"
                className={guideHighlightClass("guide-diseases", guideHighlight)}
              >
                {row}
              </div>
            );
          }

          return row;
        })}
      </SettingsSection>

      <SettingsCard>
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left active:bg-[#fafbfc]"
          aria-expanded={moreOpen}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[#2b2f36]">更多</p>
            <p className="mt-0.5 text-[12px] text-[#9aa0a6]">记录不适、导出用药报告</p>
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-[#c8ccd2] transition-transform ${
              moreOpen ? "rotate-90" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m10 6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {moreOpen ? (
          <>
            <SettingsListRow
              icon={
                <SoftIcon tone="peach">
                  <IconAdverse />
                </SoftIcon>
              }
              label="记录不适"
              summary={adverseSummary}
              onClick={() => setJournalOpen(true)}
              bordered
            />
            <SettingsListRow
              icon={
                <SoftIcon tone="blue">
                  <IconDownload />
                </SoftIcon>
              }
              label="导出用药报告"
              summary="含完成率、漏服、不适记录与用药清单"
              onClick={() => setReportOpen(true)}
              bordered
            />
          </>
        ) : null}
      </SettingsCard>

      <SettingsCard>
        <button
          type="button"
          onClick={logout}
          className="w-full px-5 py-4 text-center text-[15px] font-medium text-[#e05b5b] active:bg-[#fff7f7]"
        >
          退出登录
        </button>
      </SettingsCard>

      <ProfileSectionModal
        open={Boolean(activeSection)}
        section={activeSection}
        profile={normalizedProfile}
        onClose={closeSection}
        onSave={handleProfileSave}
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
