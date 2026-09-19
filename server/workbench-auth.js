const crypto = require("crypto");

const COOKIE_NAME = "lx_workbench_session";
const PBKDF2_ITERATIONS = 600000;
const SESSION_SECONDS = 8 * 60 * 60;

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function hashPassword(password, salt = crypto.randomBytes(16), iterations = PBKDF2_ITERATIONS) {
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Workbench password must be at least 12 characters.");
  }
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2_sha256$${iterations}$${base64url(salt)}$${base64url(derived)}`;
}

function verifyPassword(password, encoded) {
  try {
    const [algorithm, iterationText, saltText, expectedText] = String(encoded || "").split("$");
    if (algorithm !== "pbkdf2_sha256") return false;
    const iterations = Number(iterationText);
    if (!Number.isInteger(iterations) || iterations < 100000) return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(expectedText, "base64url");
    const actual = crypto.pbkdf2Sync(String(password || ""), salt, iterations, expected.length, "sha256");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

function sign(value, secret) {
  return base64url(crypto.createHmac("sha256", secret).update(value).digest());
}

function makeSession(secret) {
  const payload = {
    exp: Date.now() + SESSION_SECONDS * 1000,
    csrf: base64url(crypto.randomBytes(24)),
    nonce: base64url(crypto.randomBytes(18))
  };
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return { token: `${body}.${sign(body, secret)}`, payload };
}

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function readSession(req, secret) {
  if (!secret) return null;
  const token = readCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now() || !payload.csrf) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function checkCsrf(req, session) {
  if (!session) return false;
  const supplied = String(req.headers["x-csrf-token"] || "");
  const expected = String(session.csrf || "");
  if (!supplied || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function newSessionSecret() {
  return base64url(crypto.randomBytes(32));
}

module.exports = {
  COOKIE_NAME,
  PBKDF2_ITERATIONS,
  SESSION_SECONDS,
  hashPassword,
  verifyPassword,
  makeSession,
  readSession,
  sessionCookie,
  clearSessionCookie,
  checkCsrf,
  newSessionSecret
};
