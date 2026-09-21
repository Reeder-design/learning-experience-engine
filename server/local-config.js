const fs = require("fs");
const path = require("path");

const ENV_FILE = path.resolve(__dirname, "..", ".env.workbench");

function decodeValue(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch (_) {}
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

function readLocalConfig() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const config = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    config[trimmed.slice(0, index).trim()] = decodeValue(trimmed.slice(index + 1));
  }
  return config;
}

function loadLocalConfig() {
  const config = readLocalConfig();
  for (const [key, value] of Object.entries(config)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return config;
}

function writeLocalConfig(values) {
  const orderedKeys = [
    "WORKBENCH_PASSWORD_HASH",
    "WORKBENCH_SESSION_SECRET",
    "OPENAI_API_KEY",
    "OPENAI_MODEL"
  ];
  const lines = [
    "# Private local settings for Learning Project Workbench.",
    "# This file is Git-ignored. Never commit or share it.",
    ""
  ];
  for (const key of orderedKeys) {
    const value = values[key];
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${key}=${JSON.stringify(String(value))}`);
  }
  lines.push("");
  fs.writeFileSync(ENV_FILE, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
  try { fs.chmodSync(ENV_FILE, 0o600); } catch (_) {}
  return ENV_FILE;
}

module.exports = {
  ENV_FILE,
  readLocalConfig,
  loadLocalConfig,
  writeLocalConfig
};
