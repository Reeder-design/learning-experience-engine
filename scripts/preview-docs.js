const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const aiHandler = require("../api/workbench-ai");
const { importRiseArchive, MAX_ARCHIVE_BYTES } = require("../server/rise-import");
const { importStorylineArchive, MAX_ARCHIVE_BYTES: MAX_STORYLINE_ARCHIVE_BYTES } = require("../server/storyline-import");
const {
  hashPassword,
  verifyPassword,
  makeSession,
  readSession,
  sessionCookie,
  clearSessionCookie,
  checkCsrf,
  newSessionSecret
} = require("../server/workbench-auth");
const {
  readLocalConfig,
  loadLocalConfig,
  writeLocalConfig
} = require("../server/local-config");

loadLocalConfig();

const docsRoot = path.resolve(__dirname, "..", "docs");
const startPort = Number(process.env.PORT || 4173);
const maxPort = startPort + 20;
const loginAttempts = { count: 0, blockedUntil: 0 };

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf"
};

function trustedHost(req) {
  const host = String(req.headers.host || "");
  return /^127\.0\.0\.1:\d+$/.test(host) || /^localhost:\d+$/.test(host);
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (!origin) return true;
  return origin === `http://${req.headers.host}`;
}

function authConfigured() {
  return Boolean(process.env.WORKBENCH_PASSWORD_HASH && process.env.WORKBENCH_SESSION_SECRET);
}

function currentSession(req) {
  return readSession(req, process.env.WORKBENCH_SESSION_SECRET || "");
}

function safeFile(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const resolved = path.resolve(docsRoot, `.${pathname}`);
  if (!resolved.startsWith(docsRoot + path.sep) && resolved !== path.join(docsRoot, "index.html")) return null;
  return resolved;
}

function redirect(res, location) {
  res.writeHead(303, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extraHeaders
  });
  res.end(html);
}

async function readBody(req, maxBytes = 1024 * 1024) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readForm(req) {
  const body = await readBody(req, 1024 * 1024);
  return Object.fromEntries(new URLSearchParams(body));
}

function shell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#4A4238">
  <title>${title} · Learning Project Workbench</title>
  <link rel="icon" type="image/svg+xml" href="/assets/experience-engine-favicon.svg">
  <style>
    :root{--taupe:#4A4238;--pine:#508484;--mint:#79C99E;--lime:#97DB4F;--ink:#24302D;--muted:#68726f;--line:rgba(80,132,132,.24)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:radial-gradient(circle at 15% 10%,rgba(121,201,158,.22),transparent 30rem),linear-gradient(145deg,#f8fbf9,#eef3ef)}
    .card{width:min(100%,520px);padding:28px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.96);box-shadow:0 24px 60px rgba(43,62,55,.14)}
    .mark{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:linear-gradient(135deg,var(--pine),var(--mint));color:#fff;font-weight:900;letter-spacing:-.04em}
    .eyebrow{display:block;margin-top:18px;color:var(--pine);font-size:.7rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:7px 0 8px;font-size:2rem;letter-spacing:-.04em}p{margin:0;color:var(--muted);line-height:1.6}
    form{display:grid;gap:14px;margin-top:22px}label{display:grid;gap:7px;font-size:.76rem;font-weight:800}input,select{width:100%;padding:12px 13px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font:inherit;outline:none}input:focus,select:focus{border-color:var(--mint);box-shadow:0 0 0 3px rgba(121,201,158,.18)}
    button{padding:12px 15px;border:0;border-radius:11px;background:linear-gradient(135deg,var(--pine),#3f6868);color:#fff;font:inherit;font-weight:800;cursor:pointer}.note{margin-top:16px;padding:12px;border-radius:12px;background:#f1f7f3;font-size:.78rem;line-height:1.55}.error{margin-top:14px;padding:11px 12px;border-radius:11px;background:#fff1e8;color:#8a4f25;font-size:.8rem;font-weight:700}.optional{font-weight:500;color:var(--muted)}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:560px){.row{grid-template-columns:1fr}}
  </style>
</head>
<body><main class="card"><div class="mark">LX</div>${body}</main></body></html>`;
}

function loginPage(error = "") {
  return shell("Sign in", `
    <span class="eyebrow">Private local workspace</span>
    <h1>Open Learning Project Workbench</h1>
    <p>Your private source files, AI tools, and local project workspace are protected by the password you created during setup.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="post" action="/api/workbench-login">
      <label>Workbench password<input type="password" name="password" autocomplete="current-password" required autofocus></label>
      <button type="submit">Open Workbench →</button>
    </form>
    <div class="note">The password itself is never stored. The local configuration contains only a salted PBKDF2 hash. Your login session expires after 8 hours.</div>
  `);
}

function setupPage(error = "") {
  return shell("First-time setup", `
    <span class="eyebrow">One-time local setup</span>
    <h1>Secure your Workbench</h1>
    <p>Create the password you will use to open the private local Workbench. You can also add the separate OpenAI API key for AI generation now, or leave it blank and add it later.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="post" action="/api/workbench-setup">
      <div class="row">
        <label>Workbench password<input type="password" name="password" minlength="12" autocomplete="new-password" required></label>
        <label>Confirm password<input type="password" name="confirm" minlength="12" autocomplete="new-password" required></label>
      </div>
      <label>OpenAI API key <span class="optional">optional for now</span><input type="password" name="openaiKey" autocomplete="off" placeholder="sk-…"></label>
      <label>AI model
        <select name="model">
          <option value="gpt-5.6-terra" selected>GPT-5.6 Terra · balanced</option>
          <option value="gpt-5.6-sol">GPT-5.6 Sol · strongest</option>
          <option value="gpt-5.6-luna">GPT-5.6 Luna · economy</option>
        </select>
      </label>
      <button type="submit">Secure Workbench →</button>
    </form>
    <div class="note">These settings are written only to <strong>.env.workbench</strong> on this Mac. That file is Git-ignored and should never be committed or shared.</div>
  `);
}

function settingsPage(session, error = "", success = "") {
  const currentModel = process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const keyConfigured = Boolean(process.env.OPENAI_API_KEY);
  return shell("Private settings", `
    <span class="eyebrow">Private local settings</span>
    <h1>Workbench settings</h1>
    <p>Manage the AI connection and local password without exposing secrets in the public site or repository.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    ${success ? `<div class="note"><strong>${escapeHtml(success)}</strong></div>` : ""}
    <form method="post" action="/api/workbench-settings">
      <input type="hidden" name="csrf" value="${escapeHtml(session.csrf)}">
      <label>OpenAI API key <span class="optional">${keyConfigured ? "configured · leave blank to keep current key" : "not configured"}</span><input type="password" name="openaiKey" autocomplete="off" placeholder="${keyConfigured ? "••••••••••••••••" : "sk-…"}"></label>
      <label>AI model
        <select name="model">
          <option value="gpt-5.6-terra"${currentModel === "gpt-5.6-terra" ? " selected" : ""}>GPT-5.6 Terra · balanced</option>
          <option value="gpt-5.6-sol"${currentModel === "gpt-5.6-sol" ? " selected" : ""}>GPT-5.6 Sol · strongest</option>
          <option value="gpt-5.6-luna"${currentModel === "gpt-5.6-luna" ? " selected" : ""}>GPT-5.6 Luna · economy</option>
        </select>
      </label>
      <div class="note"><strong>Change password</strong><br><span class="optional">Leave these fields blank if you only want to update AI settings.</span></div>
      <label>Current password <input type="password" name="currentPassword" autocomplete="current-password"></label>
      <div class="row">
        <label>New password <input type="password" name="newPassword" minlength="12" autocomplete="new-password"></label>
        <label>Confirm new password <input type="password" name="confirmPassword" minlength="12" autocomplete="new-password"></label>
      </div>
      <button type="submit">Save private settings</button>
    </form>
    <div class="note"><a href="/workbench/" style="color:#315c55;font-weight:800;text-decoration:none">← Back to Workbench</a></div>
  `);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[char]));
}

function applyConfig(config) {
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== null && value !== "") process.env[key] = String(value);
  }
}

async function handleSetup(req, res) {
  if (authConfigured()) {
    redirect(res, "/workbench/");
    return;
  }
  if (req.method === "GET") {
    sendHtml(res, 200, setupPage());
    return;
  }
  if (req.method !== "POST" || !sameOrigin(req)) {
    sendHtml(res, 400, setupPage("Setup request was not accepted."));
    return;
  }
  try {
    const form = await readForm(req);
    if (form.password !== form.confirm) throw new Error("The two passwords do not match.");
    if (String(form.password || "").length < 12) throw new Error("Use a Workbench password with at least 12 characters.");
    const existing = readLocalConfig();
    const config = {
      ...existing,
      WORKBENCH_PASSWORD_HASH: hashPassword(form.password),
      WORKBENCH_SESSION_SECRET: newSessionSecret(),
      OPENAI_API_KEY: String(form.openaiKey || existing.OPENAI_API_KEY || "").trim(),
      OPENAI_MODEL: ["gpt-5.6-terra","gpt-5.6-sol","gpt-5.6-luna"].includes(form.model) ? form.model : "gpt-5.6-terra"
    };
    writeLocalConfig(config);
    applyConfig(config);
    const { token } = makeSession(process.env.WORKBENCH_SESSION_SECRET);
    redirectWithCookie(res, "/workbench/", sessionCookie(token));
  } catch (error) {
    sendHtml(res, 400, setupPage(error.message));
  }
}

function redirectWithCookie(res, location, cookie) {
  res.writeHead(303, { Location: location, "Set-Cookie": cookie, "Cache-Control": "no-store" });
  res.end();
}

async function handleLogin(req, res) {
  if (!authConfigured()) {
    redirect(res, "/workbench-setup");
    return;
  }
  if (req.method === "GET") {
    if (currentSession(req)) {
      redirect(res, "/workbench/");
      return;
    }
    sendHtml(res, 200, loginPage());
    return;
  }
  if (req.method !== "POST" || !sameOrigin(req)) {
    sendHtml(res, 400, loginPage("Login request was not accepted."));
    return;
  }
  if (Date.now() < loginAttempts.blockedUntil) {
    sendHtml(res, 429, loginPage("Too many incorrect attempts. Try again in about a minute."));
    return;
  }
  const form = await readForm(req);
  if (!verifyPassword(form.password, process.env.WORKBENCH_PASSWORD_HASH)) {
    loginAttempts.count += 1;
    if (loginAttempts.count >= 8) {
      loginAttempts.count = 0;
      loginAttempts.blockedUntil = Date.now() + 60 * 1000;
    }
    sendHtml(res, 401, loginPage("That password did not match."));
    return;
  }
  loginAttempts.count = 0;
  loginAttempts.blockedUntil = 0;
  const { token } = makeSession(process.env.WORKBENCH_SESSION_SECRET);
  redirectWithCookie(res, "/workbench/", sessionCookie(token));
}

async function handleSettings(req, res) {
  const session = currentSession(req);
  if (!session) {
    redirect(res, "/workbench-login");
    return;
  }
  if (req.method === "GET") {
    sendHtml(res, 200, settingsPage(session));
    return;
  }
  if (req.method !== "POST" || !sameOrigin(req)) {
    sendHtml(res, 400, settingsPage(session, "Settings request was not accepted."));
    return;
  }
  try {
    const form = await readForm(req);
    if (form.csrf !== session.csrf) throw new Error("Session check failed. Refresh and try again.");
    const existing = readLocalConfig();
    const config = { ...existing };
    if (String(form.openaiKey || "").trim()) config.OPENAI_API_KEY = String(form.openaiKey).trim();
    config.OPENAI_MODEL = ["gpt-5.6-terra","gpt-5.6-sol","gpt-5.6-luna"].includes(form.model) ? form.model : "gpt-5.6-terra";

    const changingPassword = Boolean(form.currentPassword || form.newPassword || form.confirmPassword);
    if (changingPassword) {
      if (!verifyPassword(form.currentPassword, process.env.WORKBENCH_PASSWORD_HASH)) throw new Error("Current password did not match.");
      if (form.newPassword !== form.confirmPassword) throw new Error("The new passwords do not match.");
      if (String(form.newPassword || "").length < 12) throw new Error("New password must be at least 12 characters.");
      config.WORKBENCH_PASSWORD_HASH = hashPassword(form.newPassword);
    }

    writeLocalConfig(config);
    applyConfig(config);
    sendHtml(res, 200, settingsPage(session, "", "Private settings saved."));
  } catch (error) {
    sendHtml(res, 400, settingsPage(session, error.message));
  }
}

async function handleSession(req, res) {
  const session = currentSession(req);
  if (!session) {
    sendJson(res, 401, { ok:false, authenticated:false });
    return;
  }
  sendJson(res, 200, {
    ok:true,
    authenticated:true,
    csrf:session.csrf,
    aiConfigured:Boolean(process.env.LX_AI_MOCK === "1" || process.env.OPENAI_API_KEY),
    model:process.env.LX_AI_MOCK === "1" ? "mock" : (process.env.OPENAI_MODEL || "gpt-5.6-terra")
  });
}

async function handleLogout(req, res) {
  const session = currentSession(req);
  if (req.method !== "POST" || !session || !checkCsrf(req, session)) {
    sendJson(res, 403, { ok:false, error:"Invalid logout request." });
    return;
  }
  sendJson(res, 200, { ok:true }, { "Set-Cookie": clearSessionCookie() });
}

function decodeBase64File(value) {
  const text = String(value || "");
  if (!text || !/^[A-Za-z0-9+/]+={0,2}$/.test(text) || text.length % 4 === 1) {
    throw new Error("The selected file could not be read.");
  }
  return Buffer.from(text, "base64");
}

async function handleRiseImport(req, res) {
  const session = currentSession(req);
  if (!session) {
    sendJson(res, 401, { ok:false, error:"Sign in to the private Workbench first." });
    return;
  }
  if (req.method !== "POST" || !checkCsrf(req, session)) {
    sendJson(res, 403, { ok:false, error:"Workbench session check failed. Refresh and sign in again." });
    return;
  }
  try {
    const raw = await readBody(req, Math.ceil(MAX_ARCHIVE_BYTES * 1.37) + 1024 * 1024);
    const payload = JSON.parse(raw);
    const sourceName = String(payload?.name || "rise-export.zip").replace(/[\\/]/g, "_");
    const archive = decodeBase64File(payload?.base64);
    if (archive.length > MAX_ARCHIVE_BYTES) throw new Error("That ZIP is too large for the current private Workbench import limit.");
    const imported = importRiseArchive(archive, sourceName);
    sendJson(res, 200, { ok:true, project:imported.project, previewAssets:imported.previewAssets });
  } catch (error) {
    sendJson(res, 400, { ok:false, error:error.message || "Rise import could not be completed." });
  }
}

async function handleStorylineImport(req, res) {
  const session = currentSession(req);
  if (!session) {
    sendJson(res, 401, { ok:false, error:"Sign in to the private Workbench first." });
    return;
  }
  if (req.method !== "POST" || !checkCsrf(req, session)) {
    sendJson(res, 403, { ok:false, error:"Workbench session check failed. Refresh and sign in again." });
    return;
  }
  try {
    const raw = await readBody(req, Math.ceil(MAX_STORYLINE_ARCHIVE_BYTES * 1.37) + 1024 * 1024);
    const payload = JSON.parse(raw);
    const sourceName = String(payload?.name || "storyline-web.zip").replace(/[\\/]/g, "_");
    const archive = decodeBase64File(payload?.base64);
    if (archive.length > MAX_STORYLINE_ARCHIVE_BYTES) throw new Error("That ZIP is too large for the current private Workbench import limit.");
    const imported = importStorylineArchive(archive, sourceName);
    sendJson(res, 200, { ok:true, project:imported.project, previewAssets:imported.previewAssets });
  } catch (error) {
    sendJson(res, 400, { ok:false, error:error.message || "Storyline import could not be completed." });
  }
}

async function handler(req, res) {
  if (!trustedHost(req)) {
    res.writeHead(400, { "Content-Type":"text/plain; charset=utf-8" });
    res.end("Bad host");
    return;
  }

  const requestUrl = new URL(req.url || "/", "http://localhost");
  const pathname = requestUrl.pathname;

  if (pathname === "/workbench-setup" || pathname === "/api/workbench-setup") {
    await handleSetup(req, res);
    return;
  }
  if (pathname === "/workbench-login" || pathname === "/api/workbench-login") {
    await handleLogin(req, res);
    return;
  }
  if (pathname === "/workbench-settings" || pathname === "/api/workbench-settings") {
    await handleSettings(req, res);
    return;
  }
  if (pathname === "/api/workbench-session") {
    await handleSession(req, res);
    return;
  }
  if (pathname === "/api/workbench-logout") {
    await handleLogout(req, res);
    return;
  }
  if (pathname === "/api/workbench-rise-import") {
    await handleRiseImport(req, res);
    return;
  }
  if (pathname === "/api/workbench-storyline-import") {
    await handleStorylineImport(req, res);
    return;
  }

  if (pathname === "/api/workbench-ai") {
    const session = currentSession(req);
    if (!session) {
      sendJson(res, 401, { ok:false, error:"Sign in to the private Workbench first." });
      return;
    }
    if (req.method === "POST" && !checkCsrf(req, session)) {
      sendJson(res, 403, { ok:false, error:"Workbench session check failed. Refresh and sign in again." });
      return;
    }
    req.workbenchAuthenticated = true;
    await aiHandler(req, res);
    return;
  }

  if (pathname === "/workbench" || pathname.startsWith("/workbench/")) {
    if (!authConfigured()) {
      redirect(res, "/workbench-setup");
      return;
    }
    if (!currentSession(req)) {
      redirect(res, "/workbench-login");
      return;
    }
  }

  const file = safeFile(req.url || "/");
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { "Content-Type":"text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control":"no-store, max-age=0"
    });
    fs.createReadStream(file).pipe(res);
  });
}

function openBrowser(url) {
  if (process.env.PREVIEW_NO_OPEN === "1") return;
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c","start","",url] : [url];
  const child = spawn(command, args, { detached:true, stdio:"ignore" });
  child.on("error", () => {});
  child.unref();
}

function start(port) {
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error);
      if (!res.headersSent) res.writeHead(500, { "Content-Type":"text/plain; charset=utf-8" });
      res.end("Preview server error");
    });
  });

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < maxPort) {
      start(port + 1);
      return;
    }
    console.error(error.message);
    process.exitCode = 1;
  });

  server.listen(port, "127.0.0.1", () => {
    const rootUrl = `http://127.0.0.1:${port}/`;
    const workbenchUrl = `http://127.0.0.1:${port}/workbench/`;
    console.log(`Learning Experience Engine: ${rootUrl}`);
    console.log(`Private Learning Project Workbench: ${workbenchUrl}`);
    console.log(authConfigured()
      ? "Workbench security: password protected"
      : "Workbench security: first-time setup required");
    console.log(process.env.OPENAI_API_KEY
      ? `Workbench AI: configured (${process.env.OPENAI_MODEL || "gpt-5.6-terra"})`
      : process.env.LX_AI_MOCK === "1"
        ? "Workbench AI: mock mode"
        : "Workbench AI: API key not configured yet");
    console.log("Press Control+C in this Terminal when you are finished.");
    openBrowser(workbenchUrl);
  });
}

start(startPort);
