const jsonpatch = require("fast-json-patch");

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const MAX_CHANGES = 24;
const MAX_OPERATIONS = 60;

const operationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["op", "path", "value"],
  properties: {
    op: { type: "string", enum: ["replace", "add"] },
    path: { type: "string", minLength: 1, maxLength: 500 },
    value: {}
  }
};

const changeSetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "changes", "reviewNotes"],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 500 },
    changes: {
      type: "array",
      minItems: 1,
      maxItems: MAX_CHANGES,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "category", "label", "rationale", "scope", "operations"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 80 },
          category: { type: "string", enum: ["content", "objective", "media", "assessment", "branding", "behavior"] },
          label: { type: "string", minLength: 1, maxLength: 240 },
          rationale: { type: "string", minLength: 1, maxLength: 800 },
          scope: { type: "string", enum: ["project", "profile"] },
          operations: { type: "array", minItems: 1, maxItems: 12, items: operationSchema }
        }
      }
    },
    reviewNotes: { type: "array", maxItems: 20, items: { type: "string", maxLength: 600 } }
  }
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function escapePointerPart(value) { return String(value).replace(/~/g, "~0").replace(/\//g, "~1"); }

function decodePointer(pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("/") || pointer.includes("//")) throw new Error("Every proposed change needs a valid location.");
  return pointer.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function valueAtPointer(document, pointer) {
  const parts = decodePointer(pointer);
  let current = document;
  for (const part of parts) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, part)) return { exists:false };
    current = current[part];
  }
  return { exists:true, value:current };
}

function isAllowedProjectPath(path, type) {
  const common = /^\/(title|description|instruction|theme)$/;
  if (common.test(path)) return true;
  if (type === "branching-scenario") return /^\/content\/(nodes\/\d+\/(speaker|title|body|image|alt)|nodes\/\d+\/choices\/\d+\/(text|feedback|scoreDelta)|outcomes\/\d+\/(title|body|image|alt|summary))$/.test(path);
  if (type === "rise-course") return /^\/content\/lessons\/\d+\/(title|description|blocks\/\d+\/(title|content\/(body|text|description|caption|heading|subheading|quote|prompt))|questions\/\d+\/(prompt|answers\/\d+\/text))$/.test(path);
  if (type === "storyline-experience") return /^\/content\/scenes\/\d+\/(title|slides\/\d+\/(title|layers\/\d+\/(title|objects\/\d+\/(title|accessibility\/altText|assets\/\d+\/path))))$/.test(path);
  return false;
}

function isAllowedProfilePath(path) {
  return /^\/(learning\/(audience|purpose|duration|prerequisites|objectives\/(\d+|-))|presentation\/(accessibility|theme\/(name|brandNotes|logoTreatment|motion|layout|colors\/(primary|secondary|accent|background|text)|typography\/(heading|body)|targetNotes\/(web|rise|storyline|lms)))|behavior\/(navigation|progress|scoring|feedback)|export\/(target|notes))$/.test(path);
}

function operationIsSafe(change, operation, project, assetManifest = []) {
  if (!operation || !["replace", "add"].includes(operation.op) || typeof operation.path !== "string") throw new Error(`“${change.label}” contains an unsupported change.`);
  decodePointer(operation.path);
  const allowed = change.scope === "project"
    ? isAllowedProjectPath(operation.path, project?.type)
    : isAllowedProfilePath(operation.path);
  if (!allowed) throw new Error(`“${change.label}” tries to change protected project data.`);
  if (operation.path.endsWith("/path") && operation.value) {
    const available = new Set((assetManifest || []).map((item) => item.path));
    if (!available.has(operation.value)) throw new Error(`“${change.label}” refers to a media file that was not uploaded to this project.`);
  }
}

function validateProjectShape(project) {
  if (!project || project.schemaVersion !== "0.1") throw new Error("The proposed changes no longer point to a compatible project.");
  if (project.type === "branching-scenario") {
    if (!Array.isArray(project.content?.nodes) || !project.content.nodes.length || !Array.isArray(project.content?.outcomes) || !project.content.outcomes.length) throw new Error("The proposed changes would leave the scenario incomplete.");
  } else if (project.type === "rise-course") {
    if (!Array.isArray(project.content?.lessons) || !project.content.lessons.length) throw new Error("The proposed changes would leave the course without lessons.");
  } else if (project.type === "storyline-experience") {
    if (!Array.isArray(project.content?.scenes) || !project.content.scenes.length) throw new Error("The proposed changes would leave the experience without scenes.");
  } else {
    throw new Error("This project type is not supported by the change-review workflow yet.");
  }
}

function validateChangeSet(proposal, project, profile, assetManifest = []) {
  if (!proposal || typeof proposal.summary !== "string" || !Array.isArray(proposal.changes) || !proposal.changes.length) throw new Error("AI did not return a usable change proposal.");
  if (proposal.changes.length > MAX_CHANGES) throw new Error("AI proposed too many changes in one pass. Try a narrower request.");
  const ids = new Set();
  let operationCount = 0;
  for (const change of proposal.changes) {
    if (!change?.id || ids.has(change.id)) throw new Error("Every proposed change needs its own ID.");
    ids.add(change.id);
    if (!["project", "profile"].includes(change.scope) || !Array.isArray(change.operations) || !change.operations.length) throw new Error("Every proposed change needs a target and at least one operation.");
    operationCount += change.operations.length;
    for (const operation of change.operations) operationIsSafe(change, operation, project, assetManifest);
  }
  if (operationCount > MAX_OPERATIONS) throw new Error("AI proposed too many individual edits in one pass. Try a narrower request.");
  validateProjectShape(project);
  if (!profile || typeof profile !== "object") throw new Error("A Workbench Project Profile is required for review.");
  return true;
}

function applyApprovedChangeSet({ project, profile, proposal, acceptedChangeIds, assetManifest = [] }) {
  validateChangeSet(proposal, project, profile, assetManifest);
  const accepted = new Set(Array.isArray(acceptedChangeIds) && acceptedChangeIds.length ? acceptedChangeIds : proposal.changes.map((change) => change.id));
  const nextProject = clone(project);
  const nextProfile = clone(profile);
  const appliedChanges = [];
  for (const change of proposal.changes) {
    if (!accepted.has(change.id)) continue;
    const target = change.scope === "project" ? nextProject : nextProfile;
    for (const operation of change.operations) {
      operationIsSafe(change, operation, nextProject, assetManifest);
      const before = valueAtPointer(target, operation.path);
      if (operation.op === "replace" && !before.exists) throw new Error(`“${change.label}” no longer matches the current project. Ask AI to refresh its proposal.`);
      if (operation.op === "add" && before.exists) throw new Error(`“${change.label}” would overwrite existing content. Ask AI to refresh its proposal.`);
      const guarded = operation.op === "replace" ? [{ op:"test", path:operation.path, value:clone(before.value) }, clone(operation)] : [clone(operation)];
      jsonpatch.applyPatch(target, guarded, true, true, true);
    }
    appliedChanges.push({ id:change.id, category:change.category, label:change.label, rationale:change.rationale });
  }
  validateProjectShape(nextProject);
  return { project:nextProject, profile:nextProfile, appliedChanges };
}

function buildTaskText(payload) {
  const assets = (payload.assetManifest || []).map((item) => `- ${item.path} (${item.kind})`).join("\n") || "(none)";
  return [
    "You propose safe, reviewable edits for a learning-experience JSON project.",
    "Return a change set, never a complete replacement project and never prose outside the required JSON.",
    "Use only replace or add operations on exposed learner-facing text, objectives, approved presentation settings, assessment wording, and uploaded media paths.",
    "Do not alter IDs, source mappings, runtime actions, variables, archive metadata, security settings, or any path not explicitly represented in the current project/profile.",
    "Each change must be small enough for an instructional designer to approve or reject independently.",
    "If a requested media file is unavailable, add a review note rather than inventing a file path.",
    "Preserve learning structure unless the user explicitly asks to alter it.",
    "",
    "USER REQUEST:", payload.instruction || "Review this project and propose the most useful safe edits.",
    "",
    "CURRENT PROJECT:", JSON.stringify(payload.project),
    "",
    "PROJECT PROFILE:", JSON.stringify(payload.profile),
    "",
    "AVAILABLE UPLOADED MEDIA:", assets,
    "",
    "READABLE SOURCE NOTES:", (payload.reference || []).map((item) => `${item.path}: ${item.text}`).join("\n\n").slice(0, 80000) || "(none)"
  ].join("\n");
}

function extractResponseText(response) {
  for (const item of response?.output || []) for (const part of item.content || []) {
    if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    if (part?.type === "refusal") throw new Error(part.refusal || "The model declined this change request.");
  }
  throw new Error("AI returned no change proposal.");
}

function firstReplaceableText(project) {
  if (typeof project?.title === "string" && project.title) return { path:"/title", value:project.title };
  return null;
}

function mockProposal(payload) {
  const source = firstReplaceableText(payload.project);
  if (!source) throw new Error("This project does not contain learner-facing text for a test proposal.");
  const sanitized = /sanit|portfolio|client/i.test(payload.instruction || "");
  const nextValue = sanitized ? source.value.replace(/dirty bowl/ig, "Sample Learning Studio") : `${source.value} — revised`;
  return {
    summary: "A small reviewable proposal is ready.",
    changes: [{
      id: "change-project-title",
      category: sanitized ? "branding" : "content",
      label: sanitized ? "Replace the course name for a safe version" : "Update the course title",
      rationale: "This is a reversible mock proposal used to test the review workflow.",
      scope: "project",
      operations: [{ op:"replace", path:source.path, value:nextValue }]
    }],
    reviewNotes: ["Mock AI mode is on, so no external AI request was made."]
  };
}

async function proposeChangeSet(payload) {
  if (!payload?.project || !payload?.profile) throw new Error("A current project and Project Profile are required.");
  if (process.env.LX_AI_MOCK === "1") {
    const proposal = mockProposal(payload);
    validateChangeSet(proposal, payload.project, payload.profile, payload.assetManifest);
    return { proposal, model:"mock", responseId:"mock-change-set" };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server.");
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      model:process.env.OPENAI_MODEL || DEFAULT_MODEL,
      store:false,
      input:[{ role:"user", content:[{ type:"input_text", text:buildTaskText(payload) }] }],
      text:{ format:{ type:"json_schema", name:"learning_change_set", strict:true, schema:changeSetSchema } },
      max_output_tokens:12000
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json?.error?.message || `OpenAI request failed with status ${response.status}.`);
    error.statusCode = response.status;
    throw error;
  }
  const proposal = JSON.parse(extractResponseText(json));
  validateChangeSet(proposal, payload.project, payload.profile, payload.assetManifest);
  return { proposal, model:json.model || DEFAULT_MODEL, responseId:json.id || "" };
}

module.exports = {
  changeSetSchema,
  validateChangeSet,
  applyApprovedChangeSet,
  proposeChangeSet,
  isAllowedProjectPath,
  isAllowedProfilePath,
  escapePointerPart
};
