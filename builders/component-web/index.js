#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSION = '0.1.0';

function usage() {
  console.log(`\nComponent Web Builder v${VERSION}\n\nUsage:\n  npm run build-component -- <component.json> --output <folder> [--theme portfolio]\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const themeIndex = args.indexOf('--theme');
  const input = args.find((arg, index) => (
    !arg.startsWith('--')
    && !(outputIndex >= 0 && index === outputIndex + 1)
    && !(themeIndex >= 0 && index === themeIndex + 1)
  ));
  return {
    input,
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    theme: themeIndex >= 0 ? args[themeIndex + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isRemote(src) {
  return /^https?:\/\//i.test(src) || /^data:/i.test(src);
}

function collectAssetRefs(component) {
  const refs = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.trim() && !isRemote(value)) refs.add(value);
  };

  if (component.type === 'carousel') {
    for (const item of component.content?.items || []) add(item.image);
  }
  if (component.type === 'hotspot-reveal') {
    add(component.content?.background?.image);
    for (const hotspot of component.content?.hotspots || []) add(hotspot.image);
  }
  if (component.type === 'media-presentation') {
    for (const media of component.content?.media || []) add(media.src);
  }
  if (component.type === 'branching-scenario') {
    for (const node of component.content?.nodes || []) add(node.image);
    for (const outcome of component.content?.outcomes || []) add(outcome.image);
  }

  return [...refs];
}

function copyAssets(componentFile, outputDir, refs) {
  const sourceDir = path.dirname(componentFile);
  const copied = [];
  const assetMap = {};

  for (const ref of refs) {
    const source = path.resolve(sourceDir, ref);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      console.warn(`Warning: asset not found: ${ref}`);
      continue;
    }
    const safeName = path.basename(ref);
    const targetRelative = path.posix.join('assets', safeName);
    const target = path.join(outputDir, targetRelative);
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
    assetMap[ref] = targetRelative;
    copied.push(targetRelative);
  }

  return { copied, assetMap };
}

function validate(component) {
  const supported = new Set(['carousel', 'hotspot-reveal', 'assessment', 'media-presentation', 'branching-scenario']);
  if (!component || typeof component !== 'object') throw new Error('Component JSON must be an object.');
  if (component.schemaVersion !== '0.1') throw new Error('component.schemaVersion must be "0.1".');
  if (!component.id || !component.title || !component.type) throw new Error('Component requires id, title, and type.');
  if (!supported.has(component.type)) throw new Error(`Unsupported component type: ${component.type}`);
  if (!component.content || typeof component.content !== 'object') throw new Error('Component requires a content object.');

  if (component.type === 'carousel' && !(component.content.items || []).length) {
    throw new Error('Carousel requires content.items.');
  }
  if (component.type === 'hotspot-reveal' && !(component.content.hotspots || []).length) {
    throw new Error('Hotspot reveal requires content.hotspots.');
  }
  if (component.type === 'assessment' && !(component.content.questions || []).length) {
    throw new Error('Assessment requires content.questions.');
  }
  if (component.type === 'media-presentation' && !(component.content.media || []).length) {
    throw new Error('Media presentation requires content.media.');
  }
  if (component.type === 'branching-scenario') {
    if (!component.content.startNodeId) throw new Error('Branching scenario requires content.startNodeId.');
    if (!(component.content.nodes || []).length) throw new Error('Branching scenario requires content.nodes.');
    if (!(component.content.outcomes || []).length) throw new Error('Branching scenario requires content.outcomes.');
    const destinations = new Set([
      ...(component.content.nodes || []).map((node) => node.id),
      ...(component.content.outcomes || []).map((outcome) => outcome.id),
    ]);
    if (!destinations.has(component.content.startNodeId)) throw new Error('Branching scenario startNodeId must reference an existing node.');
    for (const node of component.content.nodes || []) {
      if (!(node.choices || []).length) throw new Error(`Scenario node ${node.id || '(untitled)'} requires at least one choice.`);
      for (const choice of node.choices || []) {
        if (!destinations.has(choice.targetId)) throw new Error(`Scenario choice ${choice.id || '(untitled)'} targets missing ID: ${choice.targetId}`);
      }
    }
  }
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help || !options.input || !options.output) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const inputFile = path.resolve(process.cwd(), options.input);
  const outputDir = path.resolve(process.cwd(), options.output);
  if (!fs.existsSync(inputFile)) {
    console.error(`\nError: component file not found:\n${inputFile}\n`);
    process.exit(1);
  }

  try {
    const component = readJson(inputFile);
    validate(component);

    const themeId = options.theme || component.theme || 'portfolio';
    const projectRoot = path.resolve(__dirname, '..', '..');
    const themeDir = path.join(projectRoot, 'themes', themeId);
    if (!fs.existsSync(themeDir)) throw new Error(`Theme not found: ${themeId}`);

    ensureDir(outputDir);
    const { copied, assetMap } = copyAssets(inputFile, outputDir, collectAssetRefs(component));
    const payload = { ...component, _assetMap: assetMap };

    const themeCss = path.join(themeDir, 'theme.css');
    const favicon = path.join(themeDir, 'favicon.svg');
    const icons = path.join(themeDir, 'icons.svg');
    if (fs.existsSync(themeCss)) fs.copyFileSync(themeCss, path.join(outputDir, 'theme.css'));
    if (fs.existsSync(favicon)) fs.copyFileSync(favicon, path.join(outputDir, 'favicon.svg'));
    if (fs.existsSync(icons)) fs.copyFileSync(icons, path.join(outputDir, 'icons.svg'));

    fs.copyFileSync(path.join(__dirname, 'component.css'), path.join(outputDir, 'component.css'));
    fs.copyFileSync(path.join(__dirname, 'scenario.css'), path.join(outputDir, 'scenario.css'));
    fs.copyFileSync(path.join(__dirname, 'runtime.js'), path.join(outputDir, 'runtime.js'));
    fs.copyFileSync(path.join(__dirname, 'scenario-runtime.js'), path.join(outputDir, 'scenario-runtime.js'));

    const json = JSON.stringify(payload).replace(/</g, '\\u003c');
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#4A4238">
  <title>${escapeHtml(component.title)}</title>
  ${fs.existsSync(favicon) ? '<link rel="icon" type="image/svg+xml" href="favicon.svg">' : ''}
  ${fs.existsSync(themeCss) ? '<link rel="stylesheet" href="theme.css">' : ''}
  <link rel="stylesheet" href="component.css">
  <link rel="stylesheet" href="scenario.css">
</head>
<body>
  <main class="component-page">
    <header class="component-header">
      <div class="component-kicker">Learning Experience Engine</div>
      <h1>${escapeHtml(component.title)}</h1>
      ${component.description ? `<p>${escapeHtml(component.description)}</p>` : ''}
    </header>
    <section class="component-shell" aria-labelledby="component-title">
      <div class="component-shell-head">
        <div>
          <span class="component-type">${escapeHtml(component.type)}</span>
          <h2 id="component-title">${escapeHtml(component.title)}</h2>
        </div>
        <div class="completion-badge" data-completion-badge>In progress</div>
      </div>
      ${component.instruction ? `<p class="component-instruction">${escapeHtml(component.instruction)}</p>` : ''}
      <div class="component-stage" data-component-stage></div>
      <div class="component-status" aria-live="polite" data-component-status></div>
    </section>
  </main>
  <script>window.__LX_COMPONENT__=${json};</script>
  <script src="runtime.js"></script>
  <script src="scenario-runtime.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'build-manifest.json'), `${JSON.stringify({
      builder: `component-web@${VERSION}`,
      builtAt: new Date().toISOString(),
      component: { id: component.id, type: component.type, title: component.title },
      theme: themeId,
      source: path.basename(inputFile),
      assetsCopied: copied,
    }, null, 2)}\n`, 'utf8');

    console.log('\nCOMPONENT WEB BUILDER');
    console.log('=====================');
    console.log(`Component: ${component.title}`);
    console.log(`Type: ${component.type}`);
    console.log(`Theme: ${themeId}`);
    console.log(`Assets copied: ${copied.length}`);
    console.log(`Output: ${outputDir}`);
    console.log('');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

main();
