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
  buildInputContent,
  defaultWorkbenchProfile
} = require("../server/workbench-ai-core");
const {
  proposeChangeSet,
  applyApprovedChangeSet,
  validateChangeSet
} = require("../server/workbench-change-set-core");

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
  assert.strictEqual(generated.profile.experienceModel, "published-learning-web");
  assert.strictEqual(generated.profile.behavior.scoring, "none");
  assert.strictEqual(generated.project.content.score.showToLearner, false);
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
    currentProject: generated.project,
    projectProfile: { ...defaultWorkbenchProfile(), learning: { ...defaultWorkbenchProfile().learning, audience: "External partners" } }
  });
  assert.strictEqual(transformed.project.type, "branching-scenario");
  assert.strictEqual(transformed.profile.learning.audience, "External partners");
  assert.deepStrictEqual(validateScenario(transformed.project).issues, []);
  assert.ok(transformed.changeSummary.length >= 1);

  const storyline = {
    schemaVersion: "0.1",
    id: "dirty-bowl-course",
    type: "storyline-experience",
    title: "Dirty Bowl Internal Course",
    description: "Internal ceramic studio orientation.",
    instruction: "Start course",
    theme: "original",
    content: {
      scenes: [{
        id: "scene-1", title: "Welcome", slides: [{
          id: "slide-1", title: "Welcome to Dirty Bowl", layers: [{
            id: "layer-1", title: "Base layer", objects: [{
              id: "object-1", title: "Welcome to Dirty Bowl", accessibility: { altText:"Dirty Bowl studio" }, assets:[{ path:"assets/images/old-logo.jpg" }]
            }]
          }]
        }]
      }]
    }
  };
  const importedProfile = { ...defaultWorkbenchProfile(), source:{ ...defaultWorkbenchProfile().source, origin:"storyline-published-web", structureModel:"scenes-slides-layers" } };
  const proposalResult = await proposeChangeSet({
    instruction: "Sanitize this for a client.", project:storyline, profile:importedProfile, reference:[], assetManifest:[{ path:"assets/images/acme-logo.jpg", kind:"image" }]
  });
  assert.strictEqual(proposalResult.proposal.changes.length, 1, "Mock AI should produce a reviewable change, not a replacement project.");
  const approved = applyApprovedChangeSet({ project:storyline, profile:importedProfile, proposal:proposalResult.proposal, acceptedChangeIds:["change-project-title"], assetManifest:[] });
  assert.notStrictEqual(approved.project.title, storyline.title, "Applying an approved proposal should return a changed working copy.");
  assert.strictEqual(storyline.title, "Dirty Bowl Internal Course", "A proposal must not mutate the current project before approval.");

  const mediaProposal = {
    summary:"Replace an approved logo.", reviewNotes:[], changes:[{
      id:"replace-logo", category:"media", label:"Replace the old logo", rationale:"Use the uploaded client asset.", scope:"project",
      operations:[{ op:"replace", path:"/content/scenes/0/slides/0/layers/0/objects/0/assets/0/path", value:"assets/images/acme-logo.jpg" }]
    }]
  };
  validateChangeSet(mediaProposal, storyline, importedProfile, [{ path:"assets/images/acme-logo.jpg", kind:"image" }]);
  const mediaApplied = applyApprovedChangeSet({ project:storyline, profile:importedProfile, proposal:mediaProposal, acceptedChangeIds:["replace-logo"], assetManifest:[{ path:"assets/images/acme-logo.jpg", kind:"image" }] });
  assert.strictEqual(mediaApplied.project.content.scenes[0].slides[0].layers[0].objects[0].assets[0].path, "assets/images/acme-logo.jpg");
  assert.throws(() => validateChangeSet({ ...mediaProposal, changes:[{ ...mediaProposal.changes[0], operations:[{ op:"replace", path:"/metadata/import/sourceFile", value:"unsafe" }] }] }, storyline, importedProfile, []), /protected project data/);

  delete process.env.LX_AI_MOCK;
  console.log("Workbench password/session security and AI mock transformation tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
