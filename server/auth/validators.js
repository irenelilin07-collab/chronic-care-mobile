const USERNAME_RE = /^[a-zA-Z0-9]{4,20}$/;
const PASSWORD_HAS_LETTER = /[a-zA-Z]/;
const PASSWORD_HAS_DIGIT = /[0-9]/;

export function validateUsername(username) {
  const value = String(username || "").trim();
  if (!USERNAME_RE.test(value)) {
    return {
      ok: false,
      message: "用户名需为 4–20 位英文或数字",
    };
  }
  return { ok: true, value };
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 6 || value.length > 32) {
    return {
      ok: false,
      message: "密码需为 6–32 位",
    };
  }
  if (!PASSWORD_HAS_LETTER.test(value) || !PASSWORD_HAS_DIGIT.test(value)) {
    return {
      ok: false,
      message: "密码需同时包含字母和数字",
    };
  }
  return { ok: true, value };
}

export function validateInviteCode(code) {
  const value = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(value)) {
    return {
      ok: false,
      message: "邀请码需为 6 位字母或数字",
    };
  }
  return { ok: true, value };
}

export function parseJsonBody(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("INVALID_JSON");
    error.code = "INVALID_JSON";
    throw error;
  }
}
