import { buildAssistantContext } from "./assistantContext.js";
import { serializeAssistantContext } from "./assistantPrompt.js";
import {
  answerFallback,
  QUICK_PROMPTS,
  tryRuleAnswer,
  withDisclaimer,
} from "./assistantEngine.js";

export async function fetchAssistantReply({ question, contextText, history = [] }) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, contextText, history }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || "ASSISTANT_FAILED");
    error.code = data.error || "ASSISTANT_FAILED";
    throw error;
  }

  return String(data.answer || "").trim();
}

function resolveQuestionText(question, promptId) {
  const trimmed = String(question || "").trim();
  if (trimmed) return trimmed;
  return QUICK_PROMPTS.find((item) => item.id === promptId)?.label || "";
}

export function needsLlmAnswer(state, question, options = {}) {
  return tryRuleAnswer(state, question, options) === null;
}

export async function answerAssistantQuestionAsync(state, question, options = {}) {
  const ruleAnswer = tryRuleAnswer(state, question, options);
  if (ruleAnswer) return ruleAnswer;

  const context = buildAssistantContext(state);
  const contextText = serializeAssistantContext(context);
  const llmQuestion = resolveQuestionText(question, options.promptId);

  if (!llmQuestion) {
    return withDisclaimer(answerFallback(context));
  }

  try {
    const answer = await fetchAssistantReply({
      question: llmQuestion,
      contextText,
      history: options.history || [],
    });
    return withDisclaimer(answer);
  } catch (error) {
    if (error.code === "ASSISTANT_NOT_CONFIGURED") {
      return withDisclaimer(
        `智能问答服务尚未配置，目前只能使用快捷问题解读 App 内数据。\n\n${answerFallback(context, false)}`
      );
    }
    return withDisclaimer(
      `智能回答暂时不可用，请稍后再试。您也可以使用下方快捷问题。\n\n${answerFallback(context, false)}`
    );
  }
}
