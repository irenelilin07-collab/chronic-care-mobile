import { query } from "../db/client.js";
import { authenticateRequest } from "../auth/authHandler.js";
import { parseJsonBody } from "../auth/validators.js";
import { jsonResponse } from "../assistantHandler.js";
import { normalizeAppState } from "../../src/lib/storage.js";

function handleSyncError(res, error) {
  if (error.code === "DATABASE_NOT_CONFIGURED" || error.code === "JWT_NOT_CONFIGURED") {
    jsonResponse(res, 503, {
      error: error.code,
      message:
        error.code === "JWT_NOT_CONFIGURED"
          ? "未配置 JWT_SECRET"
          : "未配置 DATABASE_URL",
    });
    return;
  }
  if (error.code === "INVALID_JSON") {
    jsonResponse(res, 400, { error: "INVALID_JSON", message: "请求无效" });
    return;
  }
  if (error.status) {
    jsonResponse(res, error.status, { error: error.code, message: error.message });
    return;
  }
  console.error("sync api error:", error);
  jsonResponse(res, 500, { error: "SYNC_FAILED", message: "数据同步暂时不可用" });
}

async function readHouseholdState(householdId) {
  const result = await query(
    `select app_state, updated_at
     from households
     where id = $1
     limit 1`,
    [householdId]
  );
  const row = result.rows[0];
  if (!row) {
    const error = new Error("家庭数据不存在");
    error.code = "HOUSEHOLD_NOT_FOUND";
    error.status = 404;
    throw error;
  }
  return {
    state: normalizeAppState(row.app_state || {}),
    updatedAt: row.updated_at,
  };
}

async function writeHouseholdState(householdId, state) {
  const normalized = normalizeAppState(state);
  const result = await query(
    `update households
     set app_state = $2::jsonb
     where id = $1
     returning updated_at`,
    [householdId, JSON.stringify(normalized)]
  );
  if (!result.rows[0]) {
    const error = new Error("家庭数据不存在");
    error.code = "HOUSEHOLD_NOT_FOUND";
    error.status = 404;
    throw error;
  }
  return {
    state: normalized,
    updatedAt: result.rows[0].updated_at,
  };
}

export async function handleSyncStateHttpRequest(req, res) {
  try {
    const session = await authenticateRequest(req);

    if (req.method === "GET") {
      const payload = await readHouseholdState(session.householdId);
      jsonResponse(res, 200, payload);
      return;
    }

    if (req.method === "PUT") {
      const body = parseJsonBody(req.body);
      if (!body || typeof body.state !== "object" || body.state == null) {
        jsonResponse(res, 400, {
          error: "INVALID_STATE",
          message: "缺少有效的 state",
        });
        return;
      }
      const payload = await writeHouseholdState(session.householdId, body.state);
      jsonResponse(res, 200, payload);
      return;
    }

    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    handleSyncError(res, error);
  }
}
