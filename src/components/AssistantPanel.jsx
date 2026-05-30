import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import SlideOverPanel from "./SlideOverPanel.jsx";
import {
  answerAssistantQuestionAsync,
  needsLlmAnswer,
} from "../lib/assistantApi.js";
import { hasAssistantConsent, setAssistantConsent } from "../lib/assistantConsent.js";
import { buildAssistantContext } from "../lib/assistantContext.js";
import {
  buildWelcomeMessage,
  QUICK_PROMPTS,
} from "../lib/assistantEngine.js";

function uid() {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function ChatBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "rounded-br-md bg-[#00c896] text-white"
            : "rounded-bl-md bg-white text-[#333] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function QuickPromptChip({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-[#d4f0e6] bg-white px-3 py-1.5 text-xs text-[#00a87a] active:bg-[#f0fdf8]"
    >
      {label}
    </button>
  );
}

const SWIPE_THRESHOLD_PX = 36;

function CollapsibleQuickPrompts({
  open,
  thinking,
  collapsed,
  onCollapsedChange,
  medicationPrompts,
  healthPrompts,
  onSelect,
}) {
  const dragStartY = useRef(null);
  const didSwipe = useRef(false);

  if (thinking) return null;

  function handleTouchStart(event) {
    dragStartY.current = event.touches[0].clientY;
  }

  function handleTouchEnd(event) {
    if (dragStartY.current == null) return;
    const deltaY = event.changedTouches[0].clientY - dragStartY.current;
    if (Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
      didSwipe.current = true;
      if (deltaY > 0) onCollapsedChange(true);
      else onCollapsedChange(false);
    }
    dragStartY.current = null;
  }

  function handleToggle() {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    onCollapsedChange(!collapsed);
  }

  return (
    <div className="border-b border-[#eee] bg-[#f5f6f8]">
      <button
        type="button"
        className="flex w-full touch-none flex-col items-center gap-1 px-4 py-2.5 active:bg-[#eef2f4]"
        onClick={handleToggle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "上滑展开快捷问题" : "下滑隐藏快捷问题"}
      >
        <span className="h-1 w-10 rounded-full bg-[#d4f0e6]" aria-hidden="true" />
        <span className="flex items-center gap-1 text-xs text-[#999]">
          {collapsed ? "上滑展开快捷问题" : "快捷问题"}
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
          collapsed ? "max-h-0" : "max-h-[280px]"
        }`}
      >
        <div className="space-y-2 px-4 pb-3">
          <p className="text-xs font-medium text-[#999]">用药情况</p>
          <div className="flex flex-wrap gap-2">
            {medicationPrompts.map((item) => (
              <QuickPromptChip
                key={item.id}
                label={item.label}
                onClick={() => onSelect(item.label, { promptId: item.id })}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-[#999]">健康状况</p>
          <div className="flex flex-wrap gap-2">
            {healthPrompts.map((item) => (
              <QuickPromptChip
                key={item.id}
                label={item.label}
                onClick={() => onSelect(item.label, { promptId: item.id })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPanel({ open, onClose, state }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [quickPromptsCollapsed, setQuickPromptsCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const submitRef = useRef(() => {});
  const pendingQuestionRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const context = buildAssistantContext(state);
    setMessages([{ id: uid(), role: "assistant", content: buildWelcomeMessage(context) }]);
    setInput("");
    setThinking(false);
    setConsentOpen(false);
    setQuickPromptsCollapsed(false);
    pendingQuestionRef.current = null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => window.clearTimeout(timer);
  }, [open, state]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  function appendMessage(role, content) {
    setMessages((prev) => [...prev, { id: uid(), role, content }]);
  }

  async function runAnswer(question, options = {}) {
    const history = messages.map((item) => ({ role: item.role, content: item.content }));
    const answer = await answerAssistantQuestionAsync(state, question, {
      ...options,
      history,
    });
    appendMessage("assistant", answer);
    setThinking(false);
  }

  function submitQuestion(question, { promptId } = {}) {
    const trimmed = String(question || "").trim();
    if (!trimmed && !promptId) return;
    if (thinking) return;

    const displayText = trimmed || QUICK_PROMPTS.find((item) => item.id === promptId)?.label || "";
    if (displayText) {
      appendMessage("user", displayText);
    }

    setQuickPromptsCollapsed(true);

    if (needsLlmAnswer(state, trimmed, { promptId }) && !hasAssistantConsent()) {
      pendingQuestionRef.current = { question: trimmed, promptId };
      setConsentOpen(true);
      return;
    }

    setThinking(true);
    runAnswer(trimmed, { promptId }).catch(() => {
      appendMessage("assistant", "请求失败，请稍后再试。");
      setThinking(false);
    });
  }

  function handleConsentConfirm() {
    setAssistantConsent();
    setConsentOpen(false);
    const pending = pendingQuestionRef.current;
    pendingQuestionRef.current = null;
    if (!pending) return;
    setThinking(true);
    runAnswer(pending.question, { promptId: pending.promptId }).catch(() => {
      appendMessage("assistant", "请求失败，请稍后再试。");
      setThinking(false);
    });
  }

  function handleConsentCancel() {
    setConsentOpen(false);
    pendingQuestionRef.current = null;
    appendMessage("assistant", "已取消。您仍可使用快捷问题查看 App 内的用药与健康数据。");
  }

  submitRef.current = submitQuestion;

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || thinking) return;
    setInput("");
    submitQuestion(trimmed);
  }

  const medicationPrompts = QUICK_PROMPTS.filter((item) => item.group === "medication");
  const healthPrompts = QUICK_PROMPTS.filter((item) => item.group === "health");

  return (
    <>
      <SlideOverPanel
      open={open}
      onClose={onClose}
      title="用药助手"
      footer={
        <div className="border-t border-[#eee] bg-[#f5f6f8]">
          <CollapsibleQuickPrompts
            open={open}
            thinking={thinking}
            collapsed={quickPromptsCollapsed}
            onCollapsedChange={setQuickPromptsCollapsed}
            medicationPrompts={medicationPrompts}
            healthPrompts={healthPrompts}
            onSelect={(question, options) => submitRef.current(question, options)}
          />
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入健康或用药相关问题…"
              className="min-w-0 flex-1 rounded-xl border border-[#eee] bg-white px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="shrink-0 rounded-xl bg-[#00c896] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              发送
            </button>
          </form>
        </div>
      }
    >
      <div className="mb-3 rounded-xl bg-[#fff8e6] px-3 py-2 text-xs leading-5 text-[#996600]">
        基于您的档案与用药记录回答，仅供参考，不能替代医生或药师建议。
      </div>

      <div ref={scrollRef} className="space-y-3">
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} content={message.content} />
        ))}
        {thinking ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-[#999] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              正在整理…
            </div>
          </div>
        ) : null}
      </div>
      </SlideOverPanel>

      <ConfirmDialog
        open={consentOpen}
        title="使用智能问答"
        message="开放问题将通过 AI 结合您的档案与用药摘要回答，内容仅供参考，不会替代医生。问答内容会发送至配置的大模型服务。是否继续？"
        confirmText="同意并继续"
        cancelText="暂不"
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
      />
    </>
  );
}
