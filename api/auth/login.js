import { handleAuthLoginHttpRequest } from "../../server/auth/authHandler.js";

export default async function handler(req, res) {
  const body =
    typeof req.body === "string"
      ? req.body
      : req.body
        ? JSON.stringify(req.body)
        : "";
  await handleAuthLoginHttpRequest(
    { method: req.method, headers: req.headers, body },
    res
  );
}
