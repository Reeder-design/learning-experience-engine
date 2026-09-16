#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { renderCourse } = require('./lib/renderer');

const BUILDER_VERSION = '0.2.0';

function usage() {
  console.log(`\nWeb Builder v${BUILDER_VERSION}\n\nUsage:\n  node builders/web/index.js <normalized-course-folder> --output <folder> [--theme <theme-id>]\n\nExample:\n  node builders/web/index.js ../learning-content-private/exports/pcn-rise-extracted/normalized --output ../learning-content-private/exports/pcn-web-preview --theme portfolio\n\nDefault theme:\n  portfolio\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const input = args.find((arg) => !arg.startsWith('--') && arg !== '-h');
  const outputIndex = args.indexOf('--output');
  const themeIndex = args.indexOf('--theme');
  return {
    input,
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    theme: themeIndex >= 0 ? args[themeIndex + 1] : 'portfolio',
    help: args.includes('--help') || args.includes('-h'),
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function assertFile(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`${label} not found: ${file}`);
  }
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!options.input || !options.output) {
    usage();
    process.exit(1);
  }

  const inputDir = path.resolve(process.cwd(), options.input);
  const outputDir = path.resolve(process.cwd(), options.output);
  const themeDir = path.resolve(__dirname, '..', '..', 'themes', options.theme);

  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`\nError: normalized course folder not found:\n${inputDir}\n`);
    process.exit(1);
  }
  if (!fs.existsSync(themeDir) || !fs.statSync(themeDir).isDirectory()) {
    console.error(`\nError: theme not found:\n${themeDir}\n`);
    process.exit(1);
  }

  const courseFile = path.join(inputDir, 'course.json');
  const assetsFile = path.join(inputDir, 'assets.json');
  const themeFile = path.join(themeDir, 'theme.json');
  const themeCss = path.join(themeDir, 'theme.css');
  const themeIcons = path.join(themeDir, 'icons.svg');
  const themeFavicon = path.join(themeDir, 'favicon.svg');

  try {
    assertFile(courseFile, 'course.json');
    assertFile(assetsFile, 'assets.json');
    assertFile(themeFile, 'theme.json');
    assertFile(themeCss, 'theme.css');
    assertFile(themeIcons, 'icons.svg');
    assertFile(themeFavicon, 'favicon.svg');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }

  let course;
  let assetDocument;
  let theme;
  try {
    course = readJson(courseFile);
    assetDocument = readJson(assetsFile);
    theme = readJson(themeFile);
  } catch (error) {
    console.error(`\nError: course, asset, or theme JSON could not be read.\n${error.message}\n`);
    process.exit(1);
  }

  const units = [];
  for (const ref of course.units || []) {
    if (!ref?.source) continue;
    const unitFile = path.join(inputDir, ref.source);
    if (!fs.existsSync(unitFile)) {
      console.warn(`Warning: skipped missing unit ${ref.source}`);
      continue;
    }
    units.push({
      kind: ref.kind || (ref.source.startsWith('assessments/') ? 'assessment' : 'lesson'),
      data: readJson(unitFile),
    });
  }

  const extractedDir = path.dirname(inputDir);
  const sourceAssetsDir = path.join(extractedDir, 'assets');
  const assetsAvailable = fs.existsSync(sourceAssetsDir) && fs.statSync(sourceAssetsDir).isDirectory();

  ensureDir(outputDir);

  if (assetsAvailable) {
    copyRecursive(sourceAssetsDir, path.join(outputDir, 'assets'));
  }

  const html = renderCourse({
    course,
    units,
    assets: Array.isArray(assetDocument.assets) ? assetDocument.assets : [],
    assetsAvailable,
    theme,
  });

  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
  fs.copyFileSync(path.join(__dirname, 'course.css'), path.join(outputDir, 'course.css'));
  fs.copyFileSync(path.join(__dirname, 'course.js'), path.join(outputDir, 'course.js'));
  fs.copyFileSync(themeCss, path.join(outputDir, 'theme.css'));
  fs.copyFileSync(themeIcons, path.join(outputDir, 'icons.svg'));
  fs.copyFileSync(themeFavicon, path.join(outputDir, 'favicon.svg'));

  fs.writeFileSync(path.join(outputDir, 'build-manifest.json'), `${JSON.stringify({
    builder: `web@${BUILDER_VERSION}`,
    builtAt: new Date().toISOString(),
    schemaVersion: course.schemaVersion || null,
    source: inputDir,
    theme: {
      id: theme.id || options.theme,
      name: theme.name || options.theme,
      version: theme.version || null,
    },
    assetsAvailable,
    counts: {
      units: units.length,
      assets: Array.isArray(assetDocument.assets) ? assetDocument.assets.length : 0,
    },
  }, null, 2)}\n`, 'utf8');

  console.log('\nWEB COURSE BUILDER');
  console.log('==================');
  console.log(`Input: ${inputDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Theme: ${theme.name || options.theme} (${theme.id || options.theme})`);
  console.log(`Units: ${units.length}`);
  console.log(`Assets indexed: ${Array.isArray(assetDocument.assets) ? assetDocument.assets.length : 0}`);
  console.log(`Media files available: ${assetsAvailable ? 'yes' : 'no (themed placeholders will be shown)'}`);
  console.log('\nCreated:');
  console.log('  index.html');
  console.log('  course.css');
  console.log('  theme.css');
  console.log('  course.js');
  console.log('  icons.svg');
  console.log('  favicon.svg');
  console.log('  build-manifest.json');
  if (assetsAvailable) console.log('  assets/');
  console.log('');
}

main();
