import { buildAssistantContext } from "./assistantContext.js";
import { serializeAssistantContext } from "./assistantPrompt.js";
import {
  answerLocalIntent,
  answerFallback,
  LOCAL_INTENT_IDS,
  QUICK_PROMPTS,
  tryRuleAnswer,
  withDisclaimer,
} from "./assistantEngine.js";

const LOCAL_INTENT_CONFIDENCE = 0.75;
const OUT_OF_SCOPE_CONFIDENCE = 0.7;
const LOW_CONFIDENCE = 0.6;

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

export async function fetchAssistantIntentClassification({ question }) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "intent", question }),
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

  return data.classification || null;
}

function resolveQuestionText(question, promptId) {
  const trimmed = String(question || "").trim();
  if (trimmed) return trimmed;
  return QUICK_PROMPTS.find((item) => item.id === promptId)?.label || "";
}

function shouldSkipIntentClassification(promptId) {
  return QUICK_PROMPTS.some((item) => item.id === promptId && item.useLlm);
}

function buildSafetyAnswer() {
  return [
    "这个问题涉及具体医疗判断或用药调整，我不能替您做诊断、换药、停药、加减剂量或药物选择。",
    "",
    "建议您带上当前用药记录、不适记录、过敏史和近期监测情况，咨询医生或药师后再决定。若出现胸痛、呼吸困难、意识不清、严重过敏等急症，请立即就医或拨打 120。",
  ].join("\n");
}

function buildOutOfScopeAnswer() {
  return "我主要帮助您查看和整理 App 内的用药、库存、复诊与健康记录。这个问题超出了我的职责范围，您可以试试下方快捷问题，或提问与用药和慢病管理相关的内容。";
}

function buildClarifyAnswer() {
  return "我还不太确定您想查看哪类信息。您可以换一种说法，或直接点击下方快捷问题，例如查看今日用药、近 7 天用药情况、库存、不适记录或复诊整理。";
}

export function needsLlmAnswer(state, question, options = {}) {
  if (!options.promptId) return true;
  return tryRuleAnswer(state, question, options) === null;
}

export async function answerAssistantQuestionAsync(state, question, options = {}) {
  if (options.promptId) {
    const ruleAnswer = tryRuleAnswer(state, question, options);
    if (ruleAnswer) return ruleAnswer;
  }

  const context = buildAssistantContext(state);
  const contextText = serializeAssistantContext(context);
  const llmQuestion = resolveQuestionText(question, options.promptId);

  if (!llmQuestion) {
    return withDisclaimer(answerFallback(context));
  }

  try {
    if (!shouldSkipIntentClassification(options.promptId)) {
      const classification = await fetchAssistantIntentClassification({ question: llmQuestion });
      if (
        classification?.route === "local" &&
        LOCAL_INTENT_IDS.has(classification.intent_id) &&
        classification.confidence >= LOCAL_INTENT_CONFIDENCE
      ) {
        const localAnswer = answerLocalIntent(state, classification.intent_id);
        if (localAnswer) return localAnswer;
      }

      if (classification?.route === "safety") {
        return withDisclaimer(buildSafetyAnswer());
      }

      if (
        classification?.route === "reject" &&
        classification.confidence >= OUT_OF_SCOPE_CONFIDENCE
      ) {
        return withDisclaimer(buildOutOfScopeAnswer());
      }

      if (
        classification?.route === "clarify" ||
        classification?.confidence < LOW_CONFIDENCE
      ) {
        return withDisclaimer(buildClarifyAnswer());
      }
    }

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
