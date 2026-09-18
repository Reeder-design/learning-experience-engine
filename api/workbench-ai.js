const { transformProject, DEFAULT_MODEL } = require("../server/workbench-ai-core");

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const LOCAL_ORIGINS = new Set(["http://127.0.0.1:4173", "http://localhost:4173"]);

function allowedOrigins() {
  const configured = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(["https://reeder-design.github.io", ...LOCAL_ORIGINS, ...configured]);
}

function isLocalRequest(req) {
  const host = String(req.headers.host || "");
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = allowedOrigins();
  if (origin && allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function authorized(req) {
  if (isLocalRequest(req) && !process.env.WORKBENCH_ACCESS_TOKEN) return true;
  const expected = process.env.WORKBENCH_ACCESS_TOKEN;
  if (!expected) return false;
  const header = String(req.headers.authorization || "");
  return header === `Bearer ${expected}`;
}

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
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    const local = isLocalRequest(req);
    send(res, 200, {
      ok: true,
      configured: Boolean(process.env.LX_AI_MOCK === "1" || process.env.OPENAI_API_KEY),
      protected: Boolean(process.env.WORKBENCH_ACCESS_TOKEN),
      local,
      model: process.env.LX_AI_MOCK === "1" ? "mock" : (process.env.OPENAI_MODEL || DEFAULT_MODEL)
    });
    return;
  }

  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!authorized(req)) {
    send(res, 401, { ok: false, error: "Workbench AI access token is missing or invalid." });
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
