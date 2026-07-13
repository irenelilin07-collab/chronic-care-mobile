const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function isVoiceInputSupported() {
  return Boolean(SpeechRecognition);
}

export function createVoiceRecognizer({ onResult, onError, onEnd }) {
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }
    onResult?.(transcript.trim(), event.results[event.results.length - 1]?.isFinal);
  };

  recognition.onerror = (event) => {
    onError?.(event.error || "voice-error");
  };

  recognition.onend = () => {
    onEnd?.();
  };

  return recognition;
}
