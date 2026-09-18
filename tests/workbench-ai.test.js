const assert = require("assert");
const {
  hashPassword,
  verifyPassword,
  makeSession,
  readSession,
  checkCsrf,
  PBKDF2_ITERATIONS
} = require("../server/workbench-auth");
const {
  validateScenario,
  transformProject,
  buildInputContent
} = require("../server/workbench-ai-core");

function fakeReq(cookie = "", csrf = "") {
  return { headers: { cookie, "x-csrf-token": csrf } };
}

async function run() {
  assert.strictEqual(PBKDF2_ITERATIONS, 600000, "PBKDF2 work factor should stay at the documented security baseline.");

  const password = "test-workbench-password";
  const encoded = hashPassword(password);
  assert.ok(encoded.startsWith("pbkdf2_sha256$600000$"));
  assert.strictEqual(verifyPassword(password, encoded), true);
  assert.strictEqual(verifyPassword("wrong-password-value", encoded), false);

  const secret = "ci-session-secret-with-more-than-32-characters";
  const { token, payload } = makeSession(secret);
  const cookie = `lx_workbench_session=${encodeURIComponent(token)}`;
  const session = readSession(fakeReq(cookie), secret);
  assert.ok(session, "Signed session cookie should validate.");
  assert.strictEqual(session.csrf, payload.csrf);
  assert.strictEqual(checkCsrf(fakeReq(cookie, payload.csrf), session), true);
  assert.strictEqual(checkCsrf(fakeReq(cookie, "wrong-csrf"), session), false);
  assert.strictEqual(readSession(fakeReq(cookie), "wrong-secret"), null);

  const input = buildInputContent({
    mode: "generate",
    sourcePrompt: "Build a discovery scenario.",
    reference: [{ path: "context/notes.txt", text: "Ask about business impact." }],
    assetManifest: [{ path: "assets/images/customer.png", kind: "image" }],
    files: [
      { kind: "image", name: "customer.png", path: "assets/images/customer.png", dataUrl: "data:image/png;base64,AAAA" },
      { kind: "document", name: "brief.pdf", path: "assets/documents/brief.pdf", base64: "AAAA" }
    ]
  });
  assert.strictEqual(input[0].type, "input_text");
  assert.ok(input.some((item) => item.type === "input_image"));
  assert.ok(input.some((item) => item.type === "input_file"));

  process.env.LX_AI_MOCK = "1";
  const generated = await transformProject({
    mode: "generate",
    sourcePrompt: "Practice discovery before recommending a solution.",
    reference: [],
    assetManifest: [],
    files: []
  });
  assert.strictEqual(generated.project.type, "branching-scenario");
  assert.ok(generated.project.content.nodes.length >= 1);
  assert.ok(generated.project.content.outcomes.length >= 1);
  assert.deepStrictEqual(validateScenario(generated.project).issues, []);

  const transformed = await transformProject({
    mode: "transform",
    instruction: "Sanitize this for a public portfolio.",
    sourcePrompt: "",
    reference: [],
    assetManifest: [],
    files: [],
    currentProject: generated.project
  });
  assert.strictEqual(transformed.project.type, "branching-scenario");
  assert.deepStrictEqual(validateScenario(transformed.project).issues, []);
  assert.ok(transformed.changeSummary.length >= 1);

  delete process.env.LX_AI_MOCK;
  console.log("Workbench password/session security and AI mock transformation tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
