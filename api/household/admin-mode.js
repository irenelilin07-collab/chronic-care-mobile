import { handleAdminModeHttpRequest } from "../../server/auth/householdAdmin.js";

export default async function handler(req, res) {
  const body =
    typeof req.body === "string"
      ? req.body
      : req.body
        ? JSON.stringify(req.body)
        : "";
  await handleAdminModeHttpRequest(
    { method: req.method, headers: req.headers, body },
    res
  );
}
