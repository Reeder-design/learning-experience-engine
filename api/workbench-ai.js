const { transformProject, DEFAULT_MODEL } = require("../server/workbench-ai-core");

const MAX_BODY_BYTES = 30 * 1024 * 1024;

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("AI request is too large. Keep selected source files under 30 MB total.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (!req.workbenchAuthenticated) {
    send(res, 401, { ok: false, error: "Sign in to the private Workbench first." });
    return;
  }

  if (req.method === "GET") {
    send(res, 200, {
      ok: true,
      configured: Boolean(process.env.LX_AI_MOCK === "1" || process.env.OPENAI_API_KEY),
      protected: true,
      local: true,
      model: process.env.LX_AI_MOCK === "1" ? "mock" : (process.env.OPENAI_MODEL || DEFAULT_MODEL)
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const payload = await readJson(req);
    const result = await transformProject(payload);
    send(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("Workbench AI error:", error);
    send(res, error.statusCode || 500, {
      ok: false,
      error: error.message || "Workbench AI request failed."
    });
  }
};
