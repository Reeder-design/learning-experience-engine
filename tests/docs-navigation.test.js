const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'docs/index.html',
  'docs/workbench/index.html',
  'docs/component-studio/index.html',
  'docs/component-studio/help.js',
  'docs/course-composer/index.html',
  'docs/scenario-builder/index.html',
  'docs/user-guide/index.html',
  'docs/user-guide/course-composer.html',
  'docs/user-guide/scenario-builder.html',
  'docs/user-guide/workbench.html',
];

function findHtmlFiles(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...findHtmlFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) output.push(path.relative(root, absolute).replace(/\\/g, '/'));
  }
  return output.sort();
}

const htmlPages = findHtmlFiles(path.join(root, 'docs'));

const forbidden = [
  /href=["']\.\/["']/g,
  /href=["']\.\.\/["']/g,
  /href=["'][^"']*workbench\/["']/g,
  /href=["'][^"']*component-studio\/["']/g,
  /href=["'][^"']*course-composer\/["']/g,
  /href=["'][^"']*scenario-builder\/["']/g,
  /href=["'][^"']*user-guide\/["']/g,
  /href=["'][^"']*user-guide\/#/g,
];

let failed = false;
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

for (const relative of files) {
  const source = read(relative);
  for (const pattern of forbidden) {
    const matches = source.match(pattern);
    if (matches?.length) {
      failed = true;
      console.error(`${relative}: directory-only navigation target found: ${matches.join(', ')}`);
    }
  }
}

for (const relative of htmlPages) {
  const source = read(relative);
  for (const faviconMarker of ['experience-engine-favicon.svg', 'favicon.ico', 'rel="mask-icon"']) {
    if (!source.includes(faviconMarker)) {
      failed = true;
      console.error(`${relative}: missing required favicon metadata: ${faviconMarker}`);
    }
  }
  if (source.includes('Course Composer')) {
    failed = true;
    console.error(`${relative}: legacy public name "Course Composer" found. Use "Course Builder"; keep course-composer only as the internal route/ID.`);
  }
}
if (!fs.existsSync(path.join(root, 'docs/favicon.ico'))) {
  failed = true;
  console.error('docs/favicon.ico: missing global browser favicon fallback.');
}

for (const requiredFile of [
  'docs/assets/app-registry.js',
  'docs/assets/id-workbench.css',
  'docs/assets/id-workbench.js',
  'docs/workbench/index.html',
  'docs/workbench/workbench.css',
  'docs/workbench/workbench.js',
  'docs/workbench/ai-client.js',
  'server/workbench-auth.js',
  'server/local-config.js',
  'server/workbench-ai-core.js',
  'api/workbench-ai.js',
  'docs/course-composer/composer.js',
  'docs/course-composer/course-package.js',
  'docs/component-studio/workflow-v2.css',
  'docs/scenario-builder/scenario-builder.js',
  'docs/scenario-builder/scenario-package.js',
  'docs/scenario-builder/visual-qa.css',
  'docs/scenario-builder/motion-polish.css',
  'docs/user-guide/course-composer.html',
  'docs/user-guide/scenario-builder.html',
  'docs/user-guide/workbench.html',
  'builders/component-web/scenario-runtime.js',
  'builders/component-web/scenario.css',
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    failed = true;
    console.error(`Missing authoring UI file: ${requiredFile}`);
  }
}

const appRegistry = read('docs/assets/app-registry.js');
for (const marker of [
  "'course-composer'",
  "displayName: 'Course Builder'",
  "legacyDisplayNames: ['Course Composer']",
  "'component-studio'",
  "displayName: 'Interaction Builder'",
  "'scenario-builder'",
  "displayName: 'Scenario Builder'",
]) {
  if (!appRegistry.includes(marker)) {
    failed = true;
    console.error(`App registry is missing canonical naming contract: ${marker}`);
  }
}

const helpCss = read('docs/component-studio/help.css');
const helpRule = helpCss.match(/\.help-bubble\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!helpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/component-studio/help.css: .help-bubble is missing ${requirement}`);
  }
}

const composerCss = read('docs/course-composer/composer.css');
const composerHelpRule = composerCss.match(/\.help-dot\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!composerHelpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/course-composer/composer.css: .help-dot is missing ${requirement}`);
  }
}

const scenarioCss = read('docs/scenario-builder/scenario-builder.css');
const scenarioHelpRule = scenarioCss.match(/\.help-dot\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!scenarioHelpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/scenario-builder/scenario-builder.css: .help-dot is missing ${requirement}`);
  }
}

function assertOrder(file, markers) {
  const source = read(file);
  let last = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    if (index < 0) {
      failed = true;
      console.error(`${file}: missing workflow marker ${marker}`);
      return;
    }
    if (index <= last) {
      failed = true;
      console.error(`${file}: workflow marker is out of order: ${marker}`);
      return;
    }
    last = index;
  }
}

function assertIncludes(file, markers, label = file) {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failed = true;
      console.error(`${label}: missing required human-centered UX marker: ${marker}`);
    }
  }
}

assertOrder('docs/component-studio/index.html', ['id="choose"', 'id="assets"', 'id="author"', 'id="preview"', 'id="export"']);
assertOrder('docs/course-composer/index.html', ['id="course-basics"', 'id="project-assets"', 'id="course-content"', 'id="course-preview"', 'id="course-export"']);
assertOrder('docs/scenario-builder/index.html', ['id="basics-section"', 'id="assets-section"', 'id="build-section"', 'id="preview-section"', 'id="export-section"']);

assertIncludes('docs/workbench/index.html', [
  'Learning Project Workbench',
  'Start from a template',
  'Open existing JSON',
  '1 · Source',
  '2 · Edit',
  '3 · Preview',
  '4 · AI actions',
  '5 · Save & reuse',
  'Project brief / source outline',
  'Sanitize for portfolio',
  'Create a similar version',
  'Download interaction JSON',
  'Advanced project data',
  'Generate project with AI',
  'Secure local AI',
  'data-private-settings',
  'data-workbench-logout',
  'data-header-ai-status',
  'data-header-test-ai',
  '../assets/app-registry.js',
], 'Learning Project Workbench');
const workbenchAppJs = read('docs/workbench/workbench.js');
for (const marker of ['customer-discovery', 'decision-practice', 'objection-handling', 'validScenario', 'openJson', 'renderPreview', 'importSourceFiles', 'downloadJson']) {
  if (!workbenchAppJs.includes(marker)) {
    failed = true;
    console.error(`Learning Project Workbench JS is missing: ${marker}`);
  }
}

const studioHtml = read('docs/component-studio/index.html');
for (const marker of ['data-preview-focus', 'data-preview-refresh', 'data-copy', 'data-download', 'data-export-project']) {
  if (!studioHtml.includes(marker)) {
    failed = true;
    console.error(`Interaction Builder is missing workflow action: ${marker}`);
  }
}
assertIncludes('docs/component-studio/index.html', [
  'Interaction Builder',
  'Course Builder',
  'What should the learner do?',
  'Source files & media',
  'Save & reuse',
  'Download editable project',
  'data-ux-advanced-toggle',
  '../assets/app-registry.js',
  '../assets/id-workbench.css',
  '../assets/id-workbench.js',
], 'Interaction Builder');

const composerHtml = read('docs/course-composer/index.html');
for (const marker of ['data-content-canvas', 'data-preview-start', 'data-preview-full', 'data-export-json', 'data-export-project']) {
  if (!composerHtml.includes(marker)) {
    failed = true;
    console.error(`Course Builder is missing workflow action: ${marker}`);
  }
}
assertIncludes('docs/course-composer/index.html', [
  'Course Builder',
  'Who is this for?',
  'Add source files & media',
  'Job aid / resource',
  '>Interaction<',
  'Preview as learner',
  'Save & reuse',
  'Download editable project',
  'Reusable template',
  '../assets/app-registry.js',
  '../assets/id-workbench.js',
], 'Course Builder');

const scenarioHtml = read('docs/scenario-builder/index.html');
for (const marker of ['data-choose-folder', 'data-add-node', 'data-add-outcome', 'data-preview-start', 'data-preview-focus', 'data-copy-json', 'data-export-json', 'data-export-project']) {
  if (!scenarioHtml.includes(marker)) {
    failed = true;
    console.error(`Scenario Builder is missing workflow action: ${marker}`);
  }
}
assertIncludes('docs/scenario-builder/index.html', [
  'Course Builder',
  'What is the learner practicing?',
  'First decision',
  'data-score-settings',
  'Track learner performance',
  'Show score to the learner',
  '+ Decision point',
  'data-ux-advanced-toggle',
  'Preview as learner',
  'Save & reuse',
  'Download editable project',
  '../assets/app-registry.js',
  '../assets/id-workbench.js',
], 'Scenario Builder');
for (const stylesheet of ['href="visual-qa.css"', 'href="motion-polish.css"']) {
  if (!scenarioHtml.includes(stylesheet)) {
    failed = true;
    console.error(`Scenario Builder is missing polish stylesheet: ${stylesheet}`);
  }
}

assertIncludes('docs/index.html', [
  'Open Learning Project Workbench',
  'One project workspace',
  'Course Builder',
  'AI project transformations',
  'Source template library',
  'Existing Rise content',
  'Existing Storyline content',
], 'Engine Home');

assertIncludes('docs/user-guide/index.html', ['Interaction Builder Guide', 'Course Builder', 'Source files & media', 'Save & reuse', 'Advanced project data'], 'Interaction Builder Guide');
assertIncludes('docs/user-guide/course-composer.html', ['Course Builder Guide', 'Build the course in one canvas', 'Job aid / resource', 'Save & reuse'], 'Course Builder Guide');
assertIncludes('docs/user-guide/scenario-builder.html', ['Course Builder', 'Build decision points like a simulation worksheet', 'Coaching feedback', 'Optional scoring', 'Save & reuse'], 'Scenario Builder Guide');
assertIncludes('docs/user-guide/workbench.html', ['Learning Project Workbench', 'Course Builder', 'AI transformation', 'npm run workbench', 'PBKDF2-SHA256', 'Private settings'], 'Workbench Guide');

assertIncludes('server/workbench-auth.js', ['PBKDF2_ITERATIONS = 600000', 'HttpOnly', 'SameSite=Strict', 'checkCsrf', 'SESSION_SECONDS = 8 * 60 * 60'], 'Workbench auth');
assertIncludes('scripts/preview-docs.js', ['127.0.0.1', 'trustedHost', 'workbench-login', 'workbench-setup', 'workbench-settings', 'checkCsrf', '.env.workbench'], 'Private Workbench server');
assertIncludes('server/workbench-ai-core.js', ['store: false', 'json_schema', 'validateScenario', 'gpt-5.6-terra'], 'Workbench AI core');
assertIncludes('docs/workbench/ai-client.js', ['/api/workbench-session', '/api/workbench-ai', 'X-CSRF-Token', 'Undo AI change', 'data-header-ai-status', 'data-header-test-ai'], 'Workbench AI client');

for (const [fileName, forbiddenMarker] of [
  ['docs/workbench/index.html', 'data-ai-token'],
  ['docs/workbench/index.html', 'data-ai-endpoint'],
  ['docs/workbench/ai-client.js', 'WORKBENCH_ACCESS_TOKEN'],
  ['docs/workbench/ai-client.js', 'OPENAI_API_KEY='],
]) {
  if (read(fileName).includes(forbiddenMarker)) {
    failed = true;
    console.error(`${fileName}: public Workbench code must not expose legacy token/key plumbing: ${forbiddenMarker}`);
  }
}

if (fs.existsSync(path.join(root, '.env.workbench'))) {
  failed = true;
  console.error('.env.workbench must never be committed to the repository.');
}
if (!read('.gitignore').includes('.env.*')) {
  failed = true;
  console.error('.gitignore must continue ignoring private .env.* files.');
}

const workbenchJs = read('docs/assets/id-workbench.js');
for (const marker of ['markTechnicalLabels', 'humanizeAssetDrawer', "'What happens next?'", 'courseName', 'interactionName', 'ux-technical-field']) {
  if (!workbenchJs.includes(marker)) {
    failed = true;
    console.error(`ID workbench JS is missing: ${marker}`);
  }
}
const workbenchCss = read('docs/assets/id-workbench.css');
for (const marker of ['.ux-technical-field', '.ux-advanced-settings', '.ux-advanced-data', '.ux-disabled-action']) {
  if (!workbenchCss.includes(marker)) {
    failed = true;
    console.error(`ID workbench CSS is missing: ${marker}`);
  }
}

const scenarioVisualCss = read('docs/scenario-builder/visual-qa.css');
for (const marker of [
  '.choice-card label:has(select[data-choice-field="targetId"])',
  '.choice-card select[data-choice-field="targetId"]',
  'min-height: 48px',
  'text-overflow: ellipsis',
  '@media (max-width: 600px)',
]) {
  if (!scenarioVisualCss.includes(marker)) {
    failed = true;
    console.error(`Scenario Builder visual QA stylesheet is missing: ${marker}`);
  }
}

const scenarioMotionCss = read('docs/scenario-builder/motion-polish.css');
for (const marker of ['.basics-grid .toggle-row', 'input[type="checkbox"]:checked', '@media (prefers-reduced-motion: reduce)']) {
  if (!scenarioMotionCss.includes(marker)) {
    failed = true;
    console.error(`Scenario Builder motion polish stylesheet is missing: ${marker}`);
  }
}

if (failed) process.exit(1);
console.log(`Static navigation, canonical app naming, favicon coverage for ${htmlPages.length} HTML pages, Workbench UX, visual QA, and authoring workflow checks passed.`);
