import { buildSystemPrompt } from "../src/lib/assistantPrompt.js";

const MAX_HISTORY = 6;

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
