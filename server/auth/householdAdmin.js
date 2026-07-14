import { query } from "../db/client.js";
import { authenticateRequest, requirePatient } from "./authHandler.js";
import { parseJsonBody } from "./validators.js";
import { jsonResponse } from "../assistantHandler.js";
import { signAuthToken } from "./jwt.js";

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function apiError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function handleError(res, error) {
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
  console.error("household/admin api error:", error);
  jsonResponse(res, 500, { error: "REQUEST_FAILED", message: "操作失败，请稍后重试" });
}

function generateInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

async function getHouseholdRow(householdId) {
  const result = await query(
    `select id, admin_mode_enabled, token_version,
            coalesce(app_state->'profile'->>'nickname', '用户') as patient_nickname
     from households
     where id = $1
     limit 1`,
    [householdId]
  );
  return result.rows[0] || null;
}

function toPublicUser(sessionUser, household) {
  return {
    ...sessionUser,
    adminModeEnabled: Boolean(household.admin_mode_enabled),
    patientNickname: household.patient_nickname || sessionUser.patientNickname || "用户",
  };
}

function issueTokenForPatient(user, household) {
  return signAuthToken({
    userId: user.id,
    householdId: household.id,
    role: "patient",
    tokenVersion: household.token_version,
  });
}

export async function handleAdminModeHttpRequest(req, res) {
  if (req.method !== "PUT") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const session = await authenticateRequest(req);
    requirePatient(session);

    const body = parseJsonBody(req.body);
    const enabled = Boolean(body.enabled);

    let household;
    if (!enabled) {
      const result = await query(
        `update households
         set admin_mode_enabled = false,
             token_version = token_version + 1
         where id = $1
         returning id, admin_mode_enabled, token_version,
                   coalesce(app_state->'profile'->>'nickname', '用户') as patient_nickname`,
        [session.householdId]
      );
      household = result.rows[0];
    } else {
      const result = await query(
        `update households
         set admin_mode_enabled = true
         where id = $1
         returning id, admin_mode_enabled, token_version,
                   coalesce(app_state->'profile'->>'nickname', '用户') as patient_nickname`,
        [session.householdId]
      );
      household = result.rows[0];
    }

    if (!household) {
      throw apiError("HOUSEHOLD_NOT_FOUND", "家庭数据不存在", 404);
    }

    const user = toPublicUser(session.user, household);
    const token = issueTokenForPatient(session.user, household);

    jsonResponse(res, 200, {
      user,
      token,
      adminModeEnabled: Boolean(household.admin_mode_enabled),
    });
  } catch (error) {
    handleError(res, error);
  }
}

async function findActiveInvite(householdId) {
  const result = await query(
    `select id, code, expires_at, created_at
     from invite_codes
     where household_id = $1
       and used_by is null
       and expires_at > now()
     order by created_at desc
     limit 1`,
    [householdId]
  );
  return result.rows[0] || null;
}

export async function handleInviteCodeHttpRequest(req, res) {
  try {
    const session = await authenticateRequest(req);
    requirePatient(session);

    if (req.method === "GET") {
      const household = await getHouseholdRow(session.householdId);
      if (!household) {
        throw apiError("HOUSEHOLD_NOT_FOUND", "家庭数据不存在", 404);
      }
      const invite = await findActiveInvite(session.householdId);
      jsonResponse(res, 200, {
        adminModeEnabled: Boolean(household.admin_mode_enabled),
        invite: invite
          ? {
              code: invite.code,
              expiresAt: invite.expires_at,
              createdAt: invite.created_at,
            }
          : null,
      });
      return;
    }

    if (req.method === "POST") {
      const household = await getHouseholdRow(session.householdId);
      if (!household) {
        throw apiError("HOUSEHOLD_NOT_FOUND", "家庭数据不存在", 404);
      }
      if (!household.admin_mode_enabled) {
        throw apiError(
          "ADMIN_MODE_DISABLED",
          "请先开启管理员模式，再生成邀请码",
          403
        );
      }

      await query(
        `update invite_codes
         set expires_at = now()
         where household_id = $1
           and used_by is null
           and expires_at > now()`,
        [session.householdId]
      );

      let invite = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateInviteCode();
        const exists = await query(
          `select 1 from invite_codes where code = $1 limit 1`,
          [code]
        );
        if (exists.rows[0]) continue;

        const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
        const inserted = await query(
          `insert into invite_codes (household_id, code, expires_at)
           values ($1, $2, $3)
           returning id, code, expires_at, created_at`,
          [session.householdId, code, expiresAt.toISOString()]
        );
        invite = inserted.rows[0];
        break;
      }

      if (!invite) {
        throw apiError("INVITE_CREATE_FAILED", "邀请码生成失败，请重试", 500);
      }

      jsonResponse(res, 201, {
        adminModeEnabled: true,
        invite: {
          code: invite.code,
          expiresAt: invite.expires_at,
          createdAt: invite.created_at,
        },
      });
      return;
    }

    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    handleError(res, error);
  }
}
