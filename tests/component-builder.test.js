#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const builder = path.join(root, 'builders', 'component-web', 'index.js');
const demos = [
  ['carousel', 'content/demos/components/carousel.json'],
  ['hotspot', 'content/demos/components/hotspot-reveal.json'],
  ['assessment', 'content/demos/components/assessment.json'],
];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

for (const [name, relativeDemo] of demos) {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), `lx-${name}-`));
  const input = path.join(root, relativeDemo);
  const result = spawnSync(process.execPath, [builder, input, '--output', output, '--theme', 'portfolio'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    fail(`${name} demo build failed\n${result.stdout}\n${result.stderr}`);
    continue;
  }

  const expected = ['index.html', 'component.css', 'runtime.js', 'theme.css', 'build-manifest.json'];
  for (const file of expected) {
    if (!fs.existsSync(path.join(output, file))) fail(`${name}: missing ${file}`);
  }

  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  if (!html.includes('window.__LX_COMPONENT__')) fail(`${name}: component payload missing from index.html`);
  if (!html.includes('runtime.js')) fail(`${name}: runtime script missing from index.html`);

  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'build-manifest.json'), 'utf8'));
  if (manifest.builder !== 'component-web@0.1.0') fail(`${name}: unexpected builder version`);
  if (!manifest.component?.type) fail(`${name}: manifest missing component type`);

  if (failures === 0) pass(`${name} demo builds successfully`);
  fs.rmSync(output, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} component builder smoke test failure(s).`);
  process.exit(1);
}

console.log('\nComponent builder smoke tests passed.');
