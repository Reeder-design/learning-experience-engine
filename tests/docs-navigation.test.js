const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'docs/index.html',
  'docs/component-studio/index.html',
  'docs/component-studio/help.js',
  'docs/course-composer/index.html',
  'docs/scenario-builder/index.html',
  'docs/user-guide/index.html',
  'docs/user-guide/course-composer.html',
  'docs/user-guide/scenario-builder.html',
];

const forbidden = [
  /href=["']\.\/["']/g,
  /href=["']\.\.\/["']/g,
  /href=["'][^"']*component-studio\/["']/g,
  /href=["'][^"']*course-composer\/["']/g,
  /href=["'][^"']*scenario-builder\/["']/g,
  /href=["'][^"']*user-guide\/["']/g,
  /href=["'][^"']*user-guide\/#/g,
];

let failed = false;
for (const relative of files) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const pattern of forbidden) {
    const matches = source.match(pattern);
    if (matches?.length) {
      failed = true;
      console.error(`${relative}: directory-only navigation target found: ${matches.join(', ')}`);
    }
  }
}

const helpCss = fs.readFileSync(path.join(root, 'docs/component-studio/help.css'), 'utf8');
const helpRule = helpCss.match(/\.help-bubble\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!helpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/component-studio/help.css: .help-bubble is missing ${requirement}`);
  }
}

const composerCss = fs.readFileSync(path.join(root, 'docs/course-composer/composer.css'), 'utf8');
const composerHelpRule = composerCss.match(/\.help-dot\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!composerHelpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/course-composer/composer.css: .help-dot is missing ${requirement}`);
  }
}

const scenarioCss = fs.readFileSync(path.join(root, 'docs/scenario-builder/scenario-builder.css'), 'utf8');
const scenarioHelpRule = scenarioCss.match(/\.help-dot\{([^}]*)\}/)?.[1] || '';
for (const requirement of ['display:inline-flex', 'align-items:center', 'justify-content:center', 'line-height:1']) {
  if (!scenarioHelpRule.includes(requirement)) {
    failed = true;
    console.error(`docs/scenario-builder/scenario-builder.css: .help-dot is missing ${requirement}`);
  }
}

for (const requiredFile of [
  'docs/course-composer/composer.js',
  'docs/course-composer/course-package.js',
  'docs/user-guide/course-composer.html',
  'docs/component-studio/workflow-v2.css',
  'docs/scenario-builder/scenario-builder.js',
  'docs/scenario-builder/scenario-package.js',
  'docs/scenario-builder/visual-qa.css',
  'docs/user-guide/scenario-builder.html',
  'builders/component-web/scenario-runtime.js',
  'builders/component-web/scenario.css',
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    failed = true;
    console.error(`Missing authoring UI file: ${requiredFile}`);
  }
}

function assertOrder(file, markers) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
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

assertOrder('docs/component-studio/index.html', ['id="choose"', 'id="assets"', 'id="author"', 'id="preview"', 'id="export"']);
assertOrder('docs/course-composer/index.html', ['id="course-basics"', 'id="project-assets"', 'id="course-content"', 'id="course-preview"', 'id="course-export"']);
assertOrder('docs/scenario-builder/index.html', ['id="basics-section"', 'id="assets-section"', 'id="build-section"', 'id="preview-section"', 'id="export-section"']);

const studioHtml = fs.readFileSync(path.join(root, 'docs/component-studio/index.html'), 'utf8');
for (const marker of ['data-preview-focus', 'data-preview-refresh', 'data-copy', 'data-download', 'data-export-project']) {
  if (!studioHtml.includes(marker)) {
    failed = true;
    console.error(`Component Studio is missing workflow action: ${marker}`);
  }
}

const composerHtml = fs.readFileSync(path.join(root, 'docs/course-composer/index.html'), 'utf8');
for (const marker of ['data-content-canvas', 'data-preview-start', 'data-preview-full', 'data-export-json', 'data-export-project']) {
  if (!composerHtml.includes(marker)) {
    failed = true;
    console.error(`Course Composer is missing workflow action: ${marker}`);
  }
}

const scenarioHtml = fs.readFileSync(path.join(root, 'docs/scenario-builder/index.html'), 'utf8');
for (const marker of ['data-choose-folder', 'data-add-node', 'data-add-outcome', 'data-preview-start', 'data-preview-focus', 'data-copy-json', 'data-export-json', 'data-export-project']) {
  if (!scenarioHtml.includes(marker)) {
    failed = true;
    console.error(`Scenario Builder is missing workflow action: ${marker}`);
  }
}
if (!scenarioHtml.includes('href="visual-qa.css"')) {
  failed = true;
  console.error('Scenario Builder is missing the visual QA polish stylesheet.');
}

const scenarioVisualCss = fs.readFileSync(path.join(root, 'docs/scenario-builder/visual-qa.css'), 'utf8');
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

if (failed) process.exit(1);
console.log('Static navigation, help alignment, visual QA, and authoring workflow checks passed.');
