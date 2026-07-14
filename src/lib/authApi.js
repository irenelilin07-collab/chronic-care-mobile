const TOKEN_KEY = "auth-token-v1";
const USER_KEY = "auth-user-v1";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredToken() {
  setStoredToken(null);
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

async function parseResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.message || "请求失败");
    error.code = payload?.error || "REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function authRegisterPatient({ username, password }) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(response);
}

export async function authLogin({ username, password, role }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  return parseResponse(response);
}

export async function authRegisterAdmin({
  username,
  password,
  inviteCode,
}) {
  const response = await fetch("/api/auth/admin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      inviteCode,
    }),
  });
  return parseResponse(response);
}

export async function authMe(token) {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
}

export async function putAdminMode(token, enabled) {
  const response = await fetch("/api/household/admin-mode", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  return parseResponse(response);
}

export async function fetchInviteCode(token) {
  const response = await fetch("/api/auth/invite-code", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
}

export async function createInviteCode(token) {
  const response = await fetch("/api/auth/invite-code", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
}
