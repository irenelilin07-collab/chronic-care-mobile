import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { requestNotificationPermission } from "../lib/medicationReminder.js";
import {
  normalizeSettings,
  REMINDER_MINUTES_OPTIONS,
} from "../lib/settings.js";

export default function ReminderSettingsModal({
  open,
  settings,
  onClose,
  onSave,
  minutesOnly = false,
}) {
  const [form, setForm] = useState(() => normalizeSettings(settings));

  useEffect(() => {
    if (!open) return;
    setForm(normalizeSettings(settings));
  }, [open, settings]);

  if (!open) return null;

  function updateReminder(field, value) {
    setForm((prev) => ({
      ...prev,
      medicationReminder: {
        ...prev.medicationReminder,
        [field]: value,
      },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!minutesOnly && form.medicationReminder.enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        alert("请允许浏览器通知权限，才能接收用药提醒");
        return;
      }
    }

    onSave(normalizeSettings(form));
  }

  return (
    <Modal title={minutesOnly ? "提前时间" : "用药提醒"} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {!minutesOnly ? (
          <div>
            <label className="mb-2 block text-xs text-[#999]">提醒开关</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: false, label: "关闭" },
                { key: true, label: "开启" },
              ].map((option) => {
                const active = form.medicationReminder.enabled === option.key;
                return (
                  <button
                    key={String(option.key)}
                    type="button"
                    onClick={() => updateReminder("enabled", option.key)}
                    className={`min-h-[44px] rounded-xl text-sm font-medium ${
                      active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {(minutesOnly || form.medicationReminder.enabled) ? (
          <div>
            <label className="mb-2 block text-xs text-[#999]">每个任务提前提醒</label>
            <div className="grid grid-cols-4 gap-2">
              {REMINDER_MINUTES_OPTIONS.map((minutes) => {
                const active = form.medicationReminder.minutesBefore === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => updateReminder("minutesBefore", minutes)}
                    className={`min-h-[44px] rounded-xl text-sm font-medium ${
                      active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                    }`}
                  >
                    {minutes} 分钟
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#999]">
              将在每次用药任务开始前 {form.medicationReminder.minutesBefore} 分钟发送浏览器通知。
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
        >
          保存
        </button>
      </form>
    </Modal>
  );
}
