export async function fetchCaptureParse({ text, profileHint = "" }) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "capture",
      text,
      profileHint,
    }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || "CAPTURE_PARSE_FAILED");
    error.code = data.error || "CAPTURE_PARSE_FAILED";
    throw error;
  }

  return data.draft || data;
}
