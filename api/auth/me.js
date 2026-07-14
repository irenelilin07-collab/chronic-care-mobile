import { handleAuthMeHttpRequest } from "../../server/auth/authHandler.js";

export default async function handler(req, res) {
  await handleAuthMeHttpRequest(
    { method: req.method, headers: req.headers, body: "" },
    res
  );
}
