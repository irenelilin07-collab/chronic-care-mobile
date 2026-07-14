async function parseResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.message || "同步失败");
    error.code = payload?.error || "SYNC_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function fetchSyncState(token) {
  const response = await fetch("/api/sync/state", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
}

export async function putSyncState(token, state) {
  const response = await fetch("/api/sync/state", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state }),
  });
  return parseResponse(response);
}
