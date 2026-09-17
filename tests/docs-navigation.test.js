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
];

const htmlPages = [
  'docs/index.html',
  'docs/workbench/index.html',
  'docs/component-studio/index.html',
  'docs/course-composer/index.html',
  'docs/scenario-builder/index.html',
  'docs/user-guide/index.html',
  'docs/user-guide/course-composer.html',
  'docs/user-guide/scenario-builder.html',
];

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
  if (!source.includes('experience-engine-favicon.svg')) {
    failed = true;
    console.error(`${relative}: missing Learning Experience Engine favicon metadata.`);
  }
}
if (!fs.existsSync(path.join(root, 'docs/favicon.ico'))) {
  failed = true;
  console.error('docs/favicon.ico: missing global browser favicon fallback.');
}

for (const requiredFile of [
  'docs/assets/id-workbench.css',
  'docs/assets/id-workbench.js',
  'docs/workbench/index.html',
  'docs/workbench/workbench.css',
  'docs/workbench/workbench.js',
  'docs/course-composer/composer.js',
  'docs/course-composer/course-package.js',
  'docs/component-studio/workflow-v2.css',
  'docs/scenario-builder/scenario-builder.js',
  'docs/scenario-builder/scenario-package.js',
  'docs/scenario-builder/visual-qa.css',
  'docs/scenario-builder/motion-polish.css',
  'docs/user-guide/course-composer.html',
  'docs/user-guide/scenario-builder.html',
  'builders/component-web/scenario-runtime.js',
  'builders/component-web/scenario.css',
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    failed = true;
    console.error(`Missing authoring UI file: ${requiredFile}`);
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
  'What should the learner do?',
  'Source files & media',
  'Save & reuse',
  'Download editable project',
  'data-ux-advanced-toggle',
  '../assets/id-workbench.css',
  '../assets/id-workbench.js',
], 'Interaction Builder');

const composerHtml = read('docs/course-composer/index.html');
for (const marker of ['data-content-canvas', 'data-preview-start', 'data-preview-full', 'data-export-json', 'data-export-project']) {
  if (!composerHtml.includes(marker)) {
    failed = true;
    console.error(`Course Composer is missing workflow action: ${marker}`);
  }
}
assertIncludes('docs/course-composer/index.html', [
  'Who is this for?',
  'Add source files & media',
  'Job aid / resource',
  '>Interaction<',
  'Preview as learner',
  'Save & reuse',
  'Download editable project',
  'Reusable template',
  '../assets/id-workbench.js',
], 'Course Composer');

const scenarioHtml = read('docs/scenario-builder/index.html');
for (const marker of ['data-choose-folder', 'data-add-node', 'data-add-outcome', 'data-preview-start', 'data-preview-focus', 'data-copy-json', 'data-export-json', 'data-export-project']) {
  if (!scenarioHtml.includes(marker)) {
    failed = true;
    console.error(`Scenario Builder is missing workflow action: ${marker}`);
  }
}
assertIncludes('docs/scenario-builder/index.html', [
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
  'AI project transformations',
  'Source template library',
  'Existing Rise content',
  'Existing Storyline content',
], 'Engine Home');

assertIncludes('docs/user-guide/index.html', ['Interaction Builder Guide', 'Source files & media', 'Save & reuse', 'Advanced project data'], 'Interaction Builder Guide');
assertIncludes('docs/user-guide/course-composer.html', ['Build the course in one canvas', 'Job aid / resource', 'Save & reuse'], 'Course Composer Guide');
assertIncludes('docs/user-guide/scenario-builder.html', ['Build decision points like a simulation worksheet', 'Coaching feedback', 'Optional scoring', 'Save & reuse'], 'Scenario Builder Guide');

const workbenchJs = read('docs/assets/id-workbench.js');
for (const marker of ['markTechnicalLabels', 'humanizeAssetDrawer', "'What happens next?'", 'Interaction Builder', 'ux-technical-field']) {
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
console.log('Static navigation, favicon, Learning Project Workbench, human-centered ID UX, visual QA, and authoring workflow checks passed.');
