import { handleAssistantHttpRequest } from "../server/assistantHandler.js";

export default async function handler(req, res) {
  const body =
    typeof req.body === "string"
      ? req.body
      : req.body
        ? JSON.stringify(req.body)
        : "";
  await handleAssistantHttpRequest({ method: req.method, body }, res);
}
