import { buildCaptureSystemPrompt } from "./capturePrompt.js";
import { buildSystemPrompt } from "../src/lib/assistantPrompt.js";

const MAX_HISTORY = 6;
const INTENT_IDS = [
  "today-guide",
  "week-summary",
  "missed-summary",
  "stock-summary",
  "adverse-summary",
  "followup-prep",
  "profile-summary",
  "missed-dose-advice",
  "chronic-tips",
  "symptom-advice",
  "high-risk-medical",
  "out-of-scope",
  "unknown",
];

export async function runAssistantChat({ question, contextText, history = [] }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("ASSISTANT_NOT_CONFIGURED");
    error.code = "ASSISTANT_NOT_CONFIGURED";
    throw error;
  }

  const trimmedQuestion = String(question || "").trim();
  if (!trimmedQuestion) {
    const error = new Error("EMPTY_QUESTION");
    error.code = "EMPTY_QUESTION";
    throw error;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );

  const systemPrompt = buildSystemPrompt(contextText || "（暂无摘要）");

  const chatHistory = history
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: stripDisclaimer(String(item.content || "")),
    }))
    .filter((item) => item.content.trim());

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: trimmedQuestion },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 800,
      messages,
    }),
  });

  if (!response.ok) {
    const error = new Error(`LLM_HTTP_${response.status}`);
    error.code = "LLM_ERROR";
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    const error = new Error("EMPTY_LLM_RESPONSE");
    error.code = "LLM_ERROR";
    throw error;
  }

  return answer;
}

export async function runAssistantCaptureParse({ text, profileHint = "" }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("ASSISTANT_NOT_CONFIGURED");
    error.code = "ASSISTANT_NOT_CONFIGURED";
    throw error;
  }

  const trimmedText = String(text || "").trim();
  if (!trimmedText) {
    const error = new Error("EMPTY_QUESTION");
    error.code = "EMPTY_QUESTION";
    throw error;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );

  const messages = [
    { role: "system", content: buildCaptureSystemPrompt(profileHint) },
    { role: "user", content: trimmedText },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = new Error(`LLM_HTTP_${response.status}`);
    error.code = "LLM_ERROR";
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    const error = new Error("EMPTY_LLM_RESPONSE");
    error.code = "LLM_ERROR";
    throw error;
  }

  try {
    return JSON.parse(rawContent);
  } catch {
    const start = rawContent.indexOf("{");
    const end = rawContent.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(rawContent.slice(start, end + 1));
    }
    const error = new Error("INVALID_CAPTURE_RESPONSE");
    error.code = "LLM_ERROR";
    throw error;
  }
}

export async function runAssistantIntentClassification({ question }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("ASSISTANT_NOT_CONFIGURED");
    error.code = "ASSISTANT_NOT_CONFIGURED";
    throw error;
  }

  const trimmedQuestion = String(question || "").trim();
  if (!trimmedQuestion) {
    const error = new Error("EMPTY_QUESTION");
    error.code = "EMPTY_QUESTION";
    throw error;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );

  const messages = [
    {
      role: "system",
      content: `你是「慢病用药小管家」的意图分类器，只负责把用户问题分类，不要回答用户问题。

请从以下 intent_id 中选择一个：
- today-guide：询问今天/当前还有哪些药要吃、待服/已服情况
- week-summary：询问近7天/本周用药完成情况、依从性概览
- missed-summary：询问漏服次数、漏服记录、忘记吃药统计
- stock-summary：询问药箱库存、剩余药量、是否够吃
- adverse-summary：询问已记录的不适、症状、不良反应记录
- followup-prep：询问复诊前整理、给医生看的用药/健康情况
- profile-summary：询问用户自己的慢病、过敏、档案摘要
- missed-dose-advice：询问漏服后怎么办、如何处理漏服
- chronic-tips：询问慢病日常管理、健康生活方式、通用注意事项
- symptom-advice：询问头疼、头痛、发烧、恶心、头晕、腹痛、乏力、吃药后不舒服等症状/不适该怎么办，但未出现急症或明确要求诊断/换药/停药/调药
- high-risk-medical：涉及停药、换药、加减药量、药物替代/选择、药物相互作用最终判断、诊断、急症、严重过敏等高风险医疗决策
- out-of-scope：与慢病、用药、健康记录无关
- unknown：无法判断或信息不足

输出严格 JSON，不要包含 Markdown，不要解释：
{"intent_id":"...", "route":"local|llm|safety|reject|clarify", "confidence":0.0, "risk_level":"low|medium|high", "reason":"不超过30字"}

路由规则：
- today-guide/week-summary/missed-summary/stock-summary/adverse-summary/followup-prep/profile-summary 使用 route=local
- missed-dose-advice/chronic-tips/symptom-advice 使用 route=llm
- high-risk-medical 使用 route=safety。胸痛、呼吸困难、意识不清、严重过敏、剧烈/持续加重疼痛、要求判断是否停药/换药/加减药量，一律归为 high-risk-medical
- out-of-scope 使用 route=reject
- unknown 使用 route=clarify`,
    },
    { role: "user", content: trimmedQuestion },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 200,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = new Error(`LLM_HTTP_${response.status}`);
    error.code = "LLM_ERROR";
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    const error = new Error("EMPTY_LLM_RESPONSE");
    error.code = "LLM_ERROR";
    throw error;
  }

  return normalizeIntentClassification(parseClassificationJson(rawContent));
}

function parseClassificationJson(rawContent) {
  try {
    return JSON.parse(rawContent);
  } catch {
    const start = rawContent.indexOf("{");
    const end = rawContent.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(rawContent.slice(start, end + 1));
    }
    const error = new Error("INVALID_INTENT_RESPONSE");
    error.code = "LLM_ERROR";
    throw error;
  }
}

function normalizeIntentClassification(raw) {
  const intentId = INTENT_IDS.includes(raw?.intent_id) ? raw.intent_id : "unknown";
  const confidence = Number.isFinite(Number(raw?.confidence))
    ? Math.max(0, Math.min(1, Number(raw.confidence)))
    : 0;
  const route =
    ["local", "llm", "safety", "reject", "clarify"].includes(raw?.route) && intentId !== "unknown"
      ? raw.route
      : "clarify";

  return {
    intent_id: intentId,
    route,
    confidence,
    risk_level: ["low", "medium", "high"].includes(raw?.risk_level) ? raw.risk_level : "low",
    reason: String(raw?.reason || "").slice(0, 80),
  };
}

function stripDisclaimer(text) {
  const marker = "\n\n---\n";
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(0, index).trim() : text.trim();
}

export async function parseJsonBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === "object") return rawBody;
  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("INVALID_JSON");
    error.code = "INVALID_JSON";
    throw error;
  }
}

export function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export async function handleAssistantHttpRequest(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body = await parseJsonBody(req.body);
    if (body.mode === "intent") {
      const classification = await runAssistantIntentClassification({
        question: body.question,
      });
      jsonResponse(res, 200, { classification });
      return;
    }

    if (body.mode === "capture") {
      const draft = await runAssistantCaptureParse({
        text: body.text,
        profileHint: body.profileHint,
      });
      jsonResponse(res, 200, { draft });
      return;
    }

    const answer = await runAssistantChat({
      question: body.question,
      contextText: body.contextText,
      history: body.history,
    });
    jsonResponse(res, 200, { answer });
  } catch (error) {
    if (error.code === "ASSISTANT_NOT_CONFIGURED") {
      jsonResponse(res, 503, { error: "ASSISTANT_NOT_CONFIGURED", message: "智能问答服务未配置" });
      return;
    }
    if (error.code === "EMPTY_QUESTION" || error.code === "INVALID_JSON") {
      jsonResponse(res, 400, { error: error.code, message: "请求无效" });
      return;
    }
    console.error("assistant api error:", error);
    jsonResponse(res, 500, { error: "ASSISTANT_FAILED", message: "智能问答暂时不可用" });
  }
}
