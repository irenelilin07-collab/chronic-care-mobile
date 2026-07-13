import { loadEnv } from "vite";
import { handleAssistantHttpRequest } from "./assistantHandler.js";
import { handleDbHealthHttpRequest } from "./db/healthHandler.js";

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

export function apiDevPlugin() {
  return {
    name: "api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      applyEnv(env);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        if (url === "/api/db/health") {
          await handleDbHealthHttpRequest({ method: req.method }, res);
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
      });
    },
  };
}
