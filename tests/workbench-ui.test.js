const assert = require("assert");
const fs = require("fs");
const path = require("path");

const workbench = fs.readFileSync(path.join(__dirname, "../docs/workbench/workbench.js"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "../docs/workbench/index.html"), "utf8");

assert.ok(!/(^|[^$])\$\("\[data-[^"]+\]"\)\.forEach/m.test(workbench), "Collection event bindings must use the multi-element selector.");
assert.match(workbench, /\$\$\('\[data-tab\]'\)\.forEach\(\(button\) => button\.addEventListener/, "Workflow steps must be interactive.");
assert.match(workbench, /\$\$\('\[data-open-tool\]'\)\.forEach\(\(button\) => button\.addEventListener/, "Project tools must be interactive.");
assert.match(page, /data-source-heading/, "Imported projects need a clear source-stage explanation.");
assert.match(page, /data-source-next-title/, "Imported projects need a clear next action.");

console.log("Workbench UI binding regression checks passed.");
