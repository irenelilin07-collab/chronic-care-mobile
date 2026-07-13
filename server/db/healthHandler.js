import { jsonResponse } from "../assistantHandler.js";
import { isDatabaseConfigured, pingDatabase } from "./client.js";

export async function handleDbHealthHttpRequest(req, res) {
  if (req.method !== "GET") {
    jsonResponse(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  if (!isDatabaseConfigured()) {
    jsonResponse(res, 503, {
      ok: false,
      error: "DATABASE_NOT_CONFIGURED",
      message: "未配置 DATABASE_URL，请在 .env 与 Vercel 环境变量中设置 Supabase 连接串",
    });
    return;
  }

  try {
    const connected = await pingDatabase();
    if (!connected) {
      jsonResponse(res, 503, {
        ok: false,
        error: "DATABASE_UNREACHABLE",
        message: "无法连接数据库，请检查 DATABASE_URL 与 Supabase 项目状态",
      });
      return;
    }

    jsonResponse(res, 200, {
      ok: true,
      db: "connected",
    });
  } catch (error) {
    console.error("db health check error:", error);
    jsonResponse(res, 503, {
      ok: false,
      error: "DATABASE_UNREACHABLE",
      message: error.message || "数据库连接失败",
    });
  }
}
