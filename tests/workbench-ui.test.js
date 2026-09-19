const assert = require("assert");
const fs = require("fs");
const path = require("path");

const workbench = fs.readFileSync(path.join(__dirname, "../docs/workbench/workbench.js"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "../docs/workbench/index.html"), "utf8");
const previewServer = fs.readFileSync(path.join(__dirname, "../scripts/preview-docs.js"), "utf8");

assert.ok(!/(^|[^$])\$\("\[data-[^"]+\]"\)\.forEach/m.test(workbench), "Collection event bindings must use the multi-element selector.");
assert.match(workbench, /\$\$\('\[data-tab\]'\)\.forEach\(\(button\) => button\.addEventListener/, "Workflow steps must be interactive.");
assert.match(workbench, /\$\$\('\[data-open-tool\]'\)\.forEach\(\(button\) => button\.addEventListener/, "Project tools must be interactive.");
assert.match(page, /data-source-heading/, "Imported projects need a clear source-stage explanation.");
assert.match(page, /data-source-next-title/, "Imported projects need a clear next action.");
assert.match(page, /<strong>Review<\/strong>/, "The workflow must begin with a review stage.");
assert.match(page, /data-tab="adapt"/, "The workflow must include a focused adaptation stage.");
assert.match(workbench, /function applyThemePreset/, "Preview directions must work without opening a tool drawer.");
assert.match(workbench, /rise-player/, "Rise imports need a course-style learner preview.");
assert.match(workbench, /storyline-player/, "Storyline imports need a player-style learner preview.");
assert.match(workbench, /storyline-course-cover/, "Storyline imports with a published cover need a launch preview.");
assert.match(workbench, /NEEDS MEDIA/, "Unavailable linked Storyline media must be clearly flagged.");
assert.match(workbench, /Media library/, "Imported projects need a plain-language media inventory.");
assert.match(workbench, /HLS stream/, "The Workbench must distinguish streaming-video bundles from ordinary video files.");
assert.match(workbench, /Open the running Workbench/, "Opening the static file must explain that the private local server is required.");
assert.match(workbench, /restoreImportedMedia/, "A portable imported project must rehydrate its source media without replacing its edits.");
assert.match(workbench, /SOURCE MEDIA NOT LOADED/, "An unloaded published source must not be mislabeled as truly missing media.");
assert.match(workbench, /Attach original export to restore media/, "An existing imported draft must be able to attach its source export without replacement.");
assert.match(workbench, /storyline-slide-button/, "Detected Storyline navigation controls must render as buttons rather than raw labels.");
assert.match(workbench, /published-course-frame/, "Imported published courses must default to the original learner player when the source export is attached.");
assert.match(workbench, /View editable model/, "The editable extraction must remain clearly separate from the original published preview.");
assert.match(previewServer, /api\/workbench-published/, "The private preview server must serve the original published course archive to the learner preview.");
assert.match(previewServer, /publishedPreviewUrl/, "Published import responses must include a source-player entry point.");

console.log("Workbench UI binding regression checks passed.");
