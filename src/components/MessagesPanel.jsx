import SlideOverPanel from "./SlideOverPanel.jsx";
import {
  formatMessageTime,
  MESSAGE_TYPES,
  messageTypeLabel,
} from "../lib/appMessages.js";

function TypeChip({ type }) {
  const styles = {
    [MESSAGE_TYPES.expired]: "bg-[#f0f1f3] text-[#888]",
    [MESSAGE_TYPES.overdue]: "bg-[#ffe9e6] text-[#e74c3c]",
    [MESSAGE_TYPES.due]: "bg-[#fff4e8] text-[#c47a2c]",
    [MESSAGE_TYPES.upcoming]: "bg-[#e8faf4] text-[#00a87a]",
  };
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
        styles[type] || "bg-[#f0f1f3] text-[#666]"
      }`}
    >
      {messageTypeLabel(type)}
    </span>
  );
}

function MessageList({ items, muted = false }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-2xl border px-3.5 py-3 ${
            muted
              ? "border-[#f0f0f0] bg-[#fafafa] opacity-80"
              : "border-[#f0f0f0] bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p
                className={`truncate text-sm font-bold ${
                  muted ? "text-[#888]" : "text-[#1a1a1a]"
                }`}
              >
                {item.title}
              </p>
              <TypeChip type={item.type} />
            </div>
            <span className="shrink-0 text-[11px] text-[#aaa]">
              {formatMessageTime(item.updatedAt)}
            </span>
          </div>
          <p className={`mt-1.5 text-sm leading-5 ${muted ? "text-[#aaa]" : "text-[#666]"}`}>
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function MessagesPanel({ open, onClose, messages = [] }) {
  const pendingItems = messages.filter(
    (item) => !item.resolvedAt && item.type !== MESSAGE_TYPES.expired && !item.expiredAt
  );
  const expiredItems = messages.filter(
    (item) => !item.resolvedAt && (item.type === MESSAGE_TYPES.expired || item.expiredAt)
  );
  const doneItems = messages.filter((item) => item.resolvedAt);

  return (
    <SlideOverPanel open={open} onClose={onClose} title="消息中心" variant="push">
      {messages.length === 0 ? (
        <section className="app-card px-4 py-10 text-center">
          <p className="text-sm text-[#999]">暂无消息</p>
          <p className="mt-1.5 text-xs leading-5 text-[#bbb]">
            到点或超时未打卡时，会在这里提醒
          </p>
        </section>
      ) : (
        <div className="space-y-4 pb-6">
          {pendingItems.length > 0 ? (
            <section>
              <p className="mb-2 px-0.5 text-xs font-medium text-[#999]">待打卡</p>
              <MessageList items={pendingItems} />
            </section>
          ) : null}

          {expiredItems.length > 0 ? (
            <section>
              <p className="mb-2 px-0.5 text-xs font-medium text-[#999]">已过期</p>
              <MessageList items={expiredItems} muted />
            </section>
          ) : null}

          {doneItems.length > 0 ? (
            <section>
              <p className="mb-2 px-0.5 text-xs font-medium text-[#999]">已打卡</p>
              <MessageList items={doneItems.slice(0, 20)} muted />
            </section>
          ) : null}
        </div>
      )}
    </SlideOverPanel>
  );
}
