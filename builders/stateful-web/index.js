#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSION = '0.2.0';
const COMPONENTS = ['carousel', 'hotspot-reveal', 'assessment-shell', 'media-presentation'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(source, destination) {
  if (!fs.existsSync(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(destination);
    for (const name of fs.readdirSync(source)) {
      copyRecursive(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const assetsIndex = args.indexOf('--assets');
  const themeIndex = args.indexOf('--theme');
  const input = args.find((arg, index) => (
    !arg.startsWith('--')
    && !(outputIndex >= 0 && index === outputIndex + 1)
    && !(assetsIndex >= 0 && index === assetsIndex + 1)
    && !(themeIndex >= 0 && index === themeIndex + 1)
  ));
  return {
    input,
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    assets: assetsIndex >= 0 ? args[assetsIndex + 1] : null,
    theme: themeIndex >= 0 ? args[themeIndex + 1] : 'portfolio',
  };
}

function main() {
  const options = parseArgs(process.argv);
  if (!options.input || !options.output) {
    console.error('Usage: node builders/stateful-web/index.js <normalized-experience> --output <folder> [--assets <folder>] [--theme <theme-id>]');
    process.exit(1);
  }

  const inputDir = path.resolve(options.input);
  const outputDir = path.resolve(options.output);
  const projectRoot = path.resolve(__dirname, '..', '..');
  const themeDir = path.join(projectRoot, 'themes', options.theme);
  const componentDir = path.join(projectRoot, 'components', 'stateful');

  const experience = readJson(path.join(inputDir, 'experience.json'));
  const variables = readJson(path.join(inputDir, 'variables.json'));
  const assetDocument = readJson(path.join(inputDir, 'assets.json'));

  const scenes = [];
  const slides = {};
  for (const sceneRef of experience.scenes || []) {
    const scene = readJson(path.join(inputDir, sceneRef.source));
    scenes.push(scene);
    for (const slideRef of scene.slides || []) {
      slides[slideRef.id] = readJson(path.join(inputDir, slideRef.source));
    }
  }

  const payload = {
    experience,
    variables,
    assets: assetDocument.assets || [],
    scenes,
    slides,
  };

  ensureDir(outputDir);
  if (options.assets) copyRecursive(path.resolve(options.assets), path.join(outputDir, 'assets'));

  const themeCss = path.join(themeDir, 'theme.css');
  const themeFavicon = path.join(themeDir, 'favicon.svg');
  const themeIcons = path.join(themeDir, 'icons.svg');
  const componentJs = path.join(componentDir, 'components.js');
  const componentCss = path.join(componentDir, 'components.css');

  if (fs.existsSync(themeFavicon)) fs.copyFileSync(themeFavicon, path.join(outputDir, 'favicon.svg'));
  if (fs.existsSync(themeIcons)) fs.copyFileSync(themeIcons, path.join(outputDir, 'icons.svg'));
  if (fs.existsSync(themeCss)) fs.copyFileSync(themeCss, path.join(outputDir, 'theme.css'));
  if (fs.existsSync(componentJs)) fs.copyFileSync(componentJs, path.join(outputDir, 'components.js'));
  if (fs.existsSync(componentCss)) fs.copyFileSync(componentCss, path.join(outputDir, 'components.css'));

  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#4A4238">
  <title>${escapeHtml(experience.title)}</title>
  ${fs.existsSync(themeFavicon) ? '<link rel="icon" type="image/svg+xml" href="favicon.svg">' : ''}
  <link rel="stylesheet" href="experience.css">
  ${fs.existsSync(themeCss) ? '<link rel="stylesheet" href="theme.css">' : ''}
  ${fs.existsSync(componentCss) ? '<link rel="stylesheet" href="components.css">' : ''}
</head>
<body>
  <div class="experience-app">
    <header class="topbar">
      <div>
        <div class="eyebrow">Stateful learning experience</div>
        <h1>${escapeHtml(experience.title)}</h1>
      </div>
      <button class="contents-button" data-contents>Contents</button>
    </header>
    <div class="layout">
      <aside class="contents" data-contents-panel>
        <div class="contents-head"><strong>Experience map</strong><button data-close-contents aria-label="Close contents">×</button></div>
        <nav data-slide-nav></nav>
        <details class="debug"><summary>Variables</summary><div data-variable-debug></div></details>
      </aside>
      <main class="stage-column">
        <div class="statusbar"><span data-scene-label></span><span data-slide-label></span><span data-progress></span></div>
        <div class="stage-frame" data-stage-frame><div class="stage" data-stage></div></div>
        <div class="controls">
          <button data-prev>← Previous</button>
          <button data-restart>Restart slide</button>
          <button class="primary" data-next>Next →</button>
        </div>
        <div class="runtime-note" data-runtime-note></div>
      </main>
    </div>
    <div class="scrim" data-scrim></div>
  </div>
  <script>window.__LX_EXPERIENCE__=${json};</script>
  ${fs.existsSync(componentJs) ? '<script src="components.js"></script>' : ''}
  <script src="runtime.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
  fs.copyFileSync(path.join(__dirname, 'experience.css'), path.join(outputDir, 'experience.css'));
  fs.copyFileSync(path.join(__dirname, 'runtime.js'), path.join(outputDir, 'runtime.js'));
  fs.writeFileSync(path.join(outputDir, 'build-manifest.json'), `${JSON.stringify({
    builder: `stateful-web@${VERSION}`,
    builtAt: new Date().toISOString(),
    source: inputDir,
    theme: options.theme,
    components: fs.existsSync(componentJs) ? COMPONENTS : [],
    scenes: scenes.length,
    slides: Object.keys(slides).length,
    assets: (assetDocument.assets || []).length,
  }, null, 2)}\n`, 'utf8');

  console.log(`Built ${Object.keys(slides).length} slide(s) -> ${outputDir}`);
  console.log(`Theme: ${options.theme}`);
  console.log(`Components: ${fs.existsSync(componentJs) ? COMPONENTS.join(', ') : 'none'}`);
}

main();
