import { loadEnv } from "vite";
import { handleAssistantHttpRequest } from "./assistantHandler.js";
import { handleDbHealthHttpRequest } from "./db/healthHandler.js";
import {
  handleAuthAdminRegisterHttpRequest,
  handleAuthLoginHttpRequest,
  handleAuthMeHttpRequest,
  handleAuthRegisterHttpRequest,
} from "./auth/authHandler.js";
import {
  handleAdminModeHttpRequest,
  handleInviteCodeHttpRequest,
} from "./auth/householdAdmin.js";
import { handleSyncStateHttpRequest } from "./sync/syncHandler.js";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
  "DATABASE_URL",
  "JWT_SECRET",
];

function applyEnv(env) {
  for (const key of ENV_KEYS) {
    if (env[key]) process.env[key] = env[key];
  }
}

function toAuthReq(req, body = "") {
  return {
    method: req.method,
    headers: req.headers,
    body,
  };
}

export function apiDevPlugin() {
  return {
    name: "api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      applyEnv(env);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        try {
          if (url === "/api/db/health") {
            await handleDbHealthHttpRequest({ method: req.method }, res);
            return;
          }

          if (url === "/api/auth/register") {
            const body = await readRequestBody(req);
            await handleAuthRegisterHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url === "/api/auth/login") {
            const body = await readRequestBody(req);
            await handleAuthLoginHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url === "/api/auth/admin/register") {
            const body = await readRequestBody(req);
            await handleAuthAdminRegisterHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url === "/api/auth/me") {
            await handleAuthMeHttpRequest(toAuthReq(req), res);
            return;
          }

          if (url === "/api/auth/invite-code") {
            const body =
              req.method === "GET" || req.method === "HEAD"
                ? ""
                : await readRequestBody(req);
            await handleInviteCodeHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url === "/api/household/admin-mode") {
            const body = await readRequestBody(req);
            await handleAdminModeHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url === "/api/sync/state") {
            const body =
              req.method === "GET" || req.method === "HEAD"
                ? ""
                : await readRequestBody(req);
            await handleSyncStateHttpRequest(toAuthReq(req, body), res);
            return;
          }

          if (url !== "/api/assistant") {
            return next();
          }

          const body = await readRequestBody(req);
          await handleAssistantHttpRequest(
            {
              method: req.method,
              body,
            },
            res
          );
        } catch (error) {
          console.error("api-dev middleware error:", error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "INTERNAL_ERROR", message: "服务异常" }));
          }
        }
      });
    },
  };
}
