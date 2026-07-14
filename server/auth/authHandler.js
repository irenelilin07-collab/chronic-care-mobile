import bcrypt from "bcryptjs";
import { query } from "../db/client.js";
import { signAuthToken, verifyAuthToken, extractBearerToken } from "./jwt.js";
import {
  parseJsonBody,
  validateUsername,
  validatePassword,
  validateInviteCode,
} from "./validators.js";
import { jsonResponse } from "../assistantHandler.js";
import { defaultState } from "../../src/lib/storage.js";

const BCRYPT_ROUNDS = 10;
const MAX_ADMINS_PER_HOUSEHOLD = 3;

function authError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function findUserByUsername(username) {
  const result = await query(
    `select u.id, u.household_id, u.username, u.password_hash, u.role,
            h.admin_mode_enabled, h.token_version,
            coalesce(h.app_state->'profile'->>'nickname', '用户') as patient_nickname
     from users u
     join households h on h.id = u.household_id
     where u.username = $1
     limit 1`,
    [username]
  );
  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await query(
    `select u.id, u.household_id, u.username, u.role,
            h.admin_mode_enabled, h.token_version,
            coalesce(h.app_state->'profile'->>'nickname', '用户') as patient_nickname
     from users u
     join households h on h.id = u.household_id
     where u.id = $1
     limit 1`,
    [userId]
  );
  return result.rows[0] || null;
}

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    householdId: row.household_id,
    adminModeEnabled: Boolean(row.admin_mode_enabled),
    patientNickname: row.patient_nickname || "用户",
  };
}

function issueSession(row) {
  const token = signAuthToken({
    userId: row.id,
    householdId: row.household_id,
    role: row.role,
    tokenVersion: row.token_version,
  });
  return {
    token,
    user: toPublicUser(row),
  };
}

export async function authenticateRequest(req) {
  const token = extractBearerToken(req);
  if (!token) {
    throw authError("UNAUTHORIZED", "请先登录", 401);
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw authError("UNAUTHORIZED", "登录已过期，请重新登录", 401);
  }

  const row = await findUserById(payload.userId);
  if (!row) {
    throw authError("UNAUTHORIZED", "账号不存在，请重新登录", 401);
  }

  if (Number(row.token_version) !== Number(payload.tokenVersion)) {
    throw authError("UNAUTHORIZED", "登录已失效，请重新登录", 401);
  }

  if (row.role === "admin" && !row.admin_mode_enabled) {
    throw authError("ADMIN_MODE_DISABLED", "患者尚未开启管理员模式，请联系患者", 403);
  }

  return {
    token,
    user: toPublicUser(row),
    householdId: row.household_id,
    tokenVersion: row.token_version,
  };
}

export function requirePatient(session) {
  if (session?.user?.role !== "patient") {
    throw authError("FORBIDDEN", "仅患者可进行此操作", 403);
  }
}

async function registerPatient({ username, password }) {
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) throw authError("INVALID_USERNAME", usernameCheck.message);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) throw authError("INVALID_PASSWORD", passwordCheck.message);

  const existing = await findUserByUsername(usernameCheck.value);
  if (existing) {
    throw authError("USERNAME_TAKEN", "用户名已被占用", 409);
  }

  const passwordHash = await bcrypt.hash(passwordCheck.value, BCRYPT_ROUNDS);
  const initialState = structuredClone(defaultState);
  initialState.profile.nickname = usernameCheck.value;

  const householdResult = await query(
    `insert into households (app_state, admin_mode_enabled, token_version)
     values ($1::jsonb, false, 0)
     returning id, admin_mode_enabled, token_version`,
    [JSON.stringify(initialState)]
  );
  const household = householdResult.rows[0];

  const userResult = await query(
    `insert into users (household_id, username, password_hash, role)
     values ($1, $2, $3, 'patient')
     returning id, household_id, username, role`,
    [household.id, usernameCheck.value, passwordHash]
  );
  const user = userResult.rows[0];

  return issueSession({
    ...user,
    admin_mode_enabled: household.admin_mode_enabled,
    token_version: household.token_version,
    patient_nickname: initialState.profile.nickname,
  });
}

async function loginUser({ username, password, expectedRole }) {
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) throw authError("INVALID_USERNAME", usernameCheck.message);

  const passwordValue = String(password || "");
  if (!passwordValue) {
    throw authError("INVALID_PASSWORD", "请输入密码");
  }

  const row = await findUserByUsername(usernameCheck.value);
  if (!row) {
    throw authError("INVALID_CREDENTIALS", "用户名或密码错误", 401);
  }

  const matched = await bcrypt.compare(passwordValue, row.password_hash);
  if (!matched) {
    throw authError("INVALID_CREDENTIALS", "用户名或密码错误", 401);
  }

  if (expectedRole && row.role !== expectedRole) {
    throw authError(
      "ROLE_MISMATCH",
      expectedRole === "patient"
        ? "请使用患者账号登录"
        : "请使用管理员账号登录",
      403
    );
  }

  if (row.role === "admin" && !row.admin_mode_enabled) {
    throw authError("ADMIN_MODE_DISABLED", "患者尚未开启管理员模式，请联系患者", 403);
  }

  return issueSession(row);
}

async function registerAdmin({ username, password, inviteCode }) {
  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) throw authError("INVALID_USERNAME", usernameCheck.message);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) throw authError("INVALID_PASSWORD", passwordCheck.message);

  const codeCheck = validateInviteCode(inviteCode);
  if (!codeCheck.ok) throw authError("INVALID_INVITE_CODE", codeCheck.message);

  const existing = await findUserByUsername(usernameCheck.value);
  if (existing) {
    throw authError("USERNAME_TAKEN", "用户名已被占用", 409);
  }

  const inviteResult = await query(
    `select ic.id, ic.household_id, ic.expires_at, ic.used_by,
            h.admin_mode_enabled, h.token_version,
            coalesce(h.app_state->'profile'->>'nickname', '用户') as patient_nickname
     from invite_codes ic
     join households h on h.id = ic.household_id
     where ic.code = $1
     limit 1`,
    [codeCheck.value]
  );
  const invite = inviteResult.rows[0];
  if (!invite) {
    throw authError("INVALID_INVITE_CODE", "邀请码无效", 400);
  }
  if (invite.used_by) {
    throw authError("INVITE_CODE_USED", "邀请码已被使用", 400);
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw authError("INVITE_CODE_EXPIRED", "邀请码已过期，请联系患者重新生成", 400);
  }
  if (!invite.admin_mode_enabled) {
    throw authError("ADMIN_MODE_DISABLED", "患者尚未开启管理员模式，请联系患者", 403);
  }

  const adminCountResult = await query(
    `select count(*)::int as count
     from users
     where household_id = $1 and role = 'admin'`,
    [invite.household_id]
  );
  if ((adminCountResult.rows[0]?.count || 0) >= MAX_ADMINS_PER_HOUSEHOLD) {
    throw authError("ADMIN_LIMIT", "该患者家庭已达管理员上限（最多 3 个）", 403);
  }

  const passwordHash = await bcrypt.hash(passwordCheck.value, BCRYPT_ROUNDS);
  const userResult = await query(
    `insert into users (household_id, username, password_hash, role)
     values ($1, $2, $3, 'admin')
     returning id, household_id, username, role`,
    [invite.household_id, usernameCheck.value, passwordHash]
  );
  const user = userResult.rows[0];

  await query(
    `update invite_codes
     set used_by = $1
     where id = $2`,
    [user.id, invite.id]
  );

  return issueSession({
    ...user,
    admin_mode_enabled: invite.admin_mode_enabled,
    token_version: invite.token_version,
    patient_nickname: invite.patient_nickname,
  });
}

function handleAuthError(res, error) {
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
  console.error("auth api error:", error);
  jsonResponse(res, 500, { error: "AUTH_FAILED", message: "认证服务暂时不可用" });
}

export async function handleAuthRegisterHttpRequest(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }
  try {
    const body = parseJsonBody(req.body);
    const session = await registerPatient({
      username: body.username,
      password: body.password,
    });
    jsonResponse(res, 201, session);
  } catch (error) {
    handleAuthError(res, error);
  }
}

export async function handleAuthLoginHttpRequest(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }
  try {
    const body = parseJsonBody(req.body);
    const role = body.role === "admin" ? "admin" : "patient";
    const session = await loginUser({
      username: body.username,
      password: body.password,
      expectedRole: role,
    });
    jsonResponse(res, 200, session);
  } catch (error) {
    handleAuthError(res, error);
  }
}

export async function handleAuthAdminRegisterHttpRequest(req, res) {
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }
  try {
    const body = parseJsonBody(req.body);
    const session = await registerAdmin({
      username: body.username,
      password: body.password,
      inviteCode: body.inviteCode,
    });
    jsonResponse(res, 201, session);
  } catch (error) {
    handleAuthError(res, error);
  }
}

export async function handleAuthMeHttpRequest(req, res) {
  if (req.method !== "GET") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }
  try {
    const session = await authenticateRequest(req);
    jsonResponse(res, 200, { user: session.user });
  } catch (error) {
    handleAuthError(res, error);
  }
}
