const CONSENT_KEY = "assistant-ai-consent-v1";

export function hasAssistantConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAssistantConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    // ignore
  }
}
