import { handleSyncStateHttpRequest } from "../../server/sync/syncHandler.js";

export default async function handler(req, res) {
  const body =
    typeof req.body === "string"
      ? req.body
      : req.body
        ? JSON.stringify(req.body)
        : "";
  await handleSyncStateHttpRequest(
    { method: req.method, headers: req.headers, body },
    res
  );
}
