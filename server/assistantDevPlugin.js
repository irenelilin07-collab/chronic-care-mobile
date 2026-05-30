import { loadEnv } from "vite";
import { handleAssistantHttpRequest } from "./assistantHandler.js";

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

export function assistantApiDevPlugin() {
  return {
    name: "assistant-api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, "");
      if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
      if (env.OPENAI_MODEL) process.env.OPENAI_MODEL = env.OPENAI_MODEL;
      if (env.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = env.OPENAI_BASE_URL;

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/assistant") return next();

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
