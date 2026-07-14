import jwt from "jsonwebtoken";

const TOKEN_TTL = "7d";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    const error = new Error("JWT_NOT_CONFIGURED");
    error.code = "JWT_NOT_CONFIGURED";
    throw error;
  }
  return secret;
}

export function signAuthToken({ userId, householdId, role, tokenVersion }) {
  return jwt.sign(
    {
      userId,
      householdId,
      role,
      tokenVersion: Number(tokenVersion) || 0,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function extractBearerToken(req) {
  const header =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    (typeof req.getHeader === "function" ? req.getHeader("authorization") : null) ||
    "";
  const value = Array.isArray(header) ? header[0] : String(header || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
