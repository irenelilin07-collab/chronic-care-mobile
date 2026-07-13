import { fetchCaptureParse } from "../smartCaptureApi.js";
import {
  normalizeLlmAppointments,
  tryParseAppointments,
} from "./appointmentCapture.js";
import {
  isRuleParseConfident,
  normalizeLlmCaptureResult,
  tryRuleParse,
} from "./ruleParser.js";

function mergeCaptureResult({ medicines = [], appointments = [], clarify = "", source = "rule" }) {
  return {
    medicines,
    appointments,
    clarify,
    source,
  };
}

export async function parseCaptureText(text, { profileHint = "" } = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return mergeCaptureResult({
      clarify: "请输入或说出要添加的内容，例如用药说明或复诊安排。",
    });
  }

  const ruleMedicines = tryRuleParse(trimmed);
  const ruleAppointments = tryParseAppointments(trimmed, profileHint);

  if (isRuleParseConfident(ruleMedicines) && ruleAppointments.length > 0) {
    return mergeCaptureResult({
      medicines: ruleMedicines.medicines,
      appointments: ruleAppointments,
      source: "rule",
    });
  }

  if (isRuleParseConfident(ruleMedicines) && !/复诊|复查|门诊|去医院/.test(trimmed)) {
    return mergeCaptureResult({
      medicines: ruleMedicines.medicines,
      source: "rule",
    });
  }

  if (ruleAppointments.length > 0 && !ruleMedicines?.medicines?.length && /复诊|复查|门诊|去医院/.test(trimmed)) {
    return mergeCaptureResult({
      appointments: ruleAppointments,
      source: "rule",
    });
  }

  try {
    const llmRaw = await fetchCaptureParse({ text: trimmed, profileHint });
    const medicineResult = normalizeLlmCaptureResult(llmRaw);
    const appointmentResult = normalizeLlmAppointments(llmRaw?.appointments);

    if (medicineResult.medicines.length > 0 || appointmentResult.length > 0) {
      return mergeCaptureResult({
        medicines: medicineResult.medicines,
        appointments: appointmentResult,
        clarify: medicineResult.clarify || "",
        source: "llm",
      });
    }

    if (ruleMedicines?.medicines?.length || ruleAppointments.length > 0) {
      return mergeCaptureResult({
        medicines: ruleMedicines?.medicines || [],
        appointments: ruleAppointments,
        clarify: medicineResult.clarify || "",
        source: "rule",
      });
    }

    return mergeCaptureResult({
      clarify: medicineResult.clarify || "未能识别可添加的内容，请换一种说法试试。",
      source: "llm",
    });
  } catch {
    if (ruleMedicines?.medicines?.length || ruleAppointments.length > 0) {
      return mergeCaptureResult({
        medicines: ruleMedicines?.medicines || [],
        appointments: ruleAppointments,
        source: "rule",
      });
    }
    throw new Error("CAPTURE_PARSE_FAILED");
  }
}
