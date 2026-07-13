import { handleDbHealthHttpRequest } from "../../server/db/healthHandler.js";

export default async function handler(req, res) {
  await handleDbHealthHttpRequest({ method: req.method }, res);
}
