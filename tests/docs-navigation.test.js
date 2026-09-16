const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'docs/index.html',
  'docs/component-studio/index.html',
  'docs/component-studio/help.js',
  'docs/course-composer/index.html',
  'docs/user-guide/index.html',
  'docs/user-guide/course-composer.html',
];

const forbidden = [
  /href=["']\.\/["']/g,
  /href=["']\.\.\/["']/g,
  /href=["'][^"']*component-studio\/["']/g,
  /href=["'][^"']*course-composer\/["']/g,
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

for (const requiredFile of [
  'docs/course-composer/composer.js',
  'docs/course-composer/course-package.js',
  'docs/user-guide/course-composer.html',
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    failed = true;
    console.error(`Missing Course Composer file: ${requiredFile}`);
  }
}

if (failed) process.exit(1);
console.log('Static docs navigation and help-bubble alignment checks passed.');
