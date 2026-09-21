const { proposeChangeSet, applyApprovedChangeSet } = require("../server/workbench-change-set-core");

const MAX_BODY_BYTES = 30 * 1024 * 1024;

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("Change request is too large. Keep selected source files under 30 MB total.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function send(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (!req.workbenchAuthenticated) return send(res, 401, { ok:false, error:"Sign in to the private Workbench first." });
  if (req.method !== "POST") return send(res, 405, { ok:false, error:"Method not allowed." });
  try {
    const payload = await readJson(req);
    if (payload.action === "propose") return send(res, 200, { ok:true, ...(await proposeChangeSet(payload)) });
    if (payload.action === "apply") return send(res, 200, { ok:true, ...(applyApprovedChangeSet(payload)) });
    return send(res, 400, { ok:false, error:"Change-set action must be propose or apply." });
  } catch (error) {
    send(res, error.statusCode || 400, { ok:false, error:error.message || "Change set could not be processed." });
  }
};
