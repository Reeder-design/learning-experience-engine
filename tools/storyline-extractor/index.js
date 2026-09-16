#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readZip } = require('../rise-inspector/lib/zip-reader');
const { extractGlobalProvideData } = require('../storyline-inspector');

const VERSION = '0.1.0';

function usage() {
  console.log(`\nStoryline Extractor v${VERSION}\n\nUsage:\n  node tools/storyline-extractor/index.js <storyline-web.zip> --output <folder>\n\nExample:\n  npm run extract-storyline -- ../learning-content-private/references/storyline-exports/sample.zip --output ../learning-content-private/exports/sample-storyline-extracted\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outputIndex = args.indexOf('--output');
  return {
    input: args.find((arg) => !arg.startsWith('--') && arg !== '-h' && (outputIndex < 0 || arg !== args[outputIndex + 1])),
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function isMacMetadata(name) {
  return name.startsWith('__MACOSX/') || name.split('/').some((part) => part.startsWith('._'));
}

function stripBom(text) {
  return text && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function archiveRoot(entries) {
  const files = entries.filter((entry) => !entry.isDirectory && !isMacMetadata(entry.fileName));
  if (!files.length) return '';
  const parts = files.map((entry) => entry.fileName.split('/')[0]);
  return parts.every((part) => part === parts[0]) ? parts[0] : '';
}

function relPath(root, relative) {
  return root ? `${root}/${relative}` : relative;
}

function slug(value, fallback = 'item') {
  const result = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return result || fallback;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(file, value) {
  if (value == null) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, 'utf8');
}

function xmlAttributes(text, elementName) {
  if (!text) return {};
  const match = text.match(new RegExp(`<${elementName}\\b([^>]*)>`, 'i'));
  if (!match) return {};
  const attrs = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(match[1]))) attrs[m[1]] = m[2];
  return attrs;
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help || !options.input || !options.output) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const input = path.resolve(process.cwd(), options.input);
  const output = path.resolve(process.cwd(), options.output);
  if (!fs.existsSync(input)) {
    console.error(`\nError: Storyline ZIP not found:\n${input}\n`);
    process.exit(1);
  }

  try {
    const archive = readZip(input);
    const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
    const root = archiveRoot(archive.entries);
    const readText = (relative) => {
      const entry = entryMap.get(relPath(root, relative));
      if (!entry) return null;
      return stripBom(archive.readEntry(entry).toString('utf8'));
    };

    const dataText = readText('html5/data/js/data.js');
    if (!dataText) throw new Error('html5/data/js/data.js was not found. This does not look like a Storyline Web publish.');
    const data = extractGlobalProvideData(dataText, 'data').value;
    const metaText = readText('meta.xml');
    const frameText = readText('story_content/frame.xml');
    const meta = xmlAttributes(metaText, 'project');
    const frame = xmlAttributes(frameText, 'bwFrame');
    const userScenes = (data.scenes || []).filter((scene) => !scene.isMessageScene);

    fs.mkdirSync(output, { recursive: true });
    fs.mkdirSync(path.join(output, 'scenes'), { recursive: true });
    fs.mkdirSync(path.join(output, 'slides'), { recursive: true });
    fs.mkdirSync(path.join(output, '_source'), { recursive: true });

    const sceneRefs = [];
    let slideCount = 0;
    let parsedSlideCount = 0;

    userScenes.forEach((scene, sceneIndex) => {
      const sceneNumber = scene.sceneNumber || sceneIndex + 1;
      const sceneSlug = `${String(sceneNumber).padStart(2, '0')}-${slug(scene.lmsId || scene.id, `scene-${sceneNumber}`)}`;
      const slideRefs = [];
      const sceneSlideDir = path.join(output, 'slides', sceneSlug);
      fs.mkdirSync(sceneSlideDir, { recursive: true });

      (scene.slides || []).forEach((slideRef, slideIndex) => {
        slideCount += 1;
        const slideNumber = slideRef.slideNumberInScene || slideIndex + 1;
        const slideSlug = `${String(slideNumber).padStart(2, '0')}-${slug(slideRef.title, 'untitled-slide')}`;
        const outputRelative = `slides/${sceneSlug}/${slideSlug}.json`;
        let parseStatus = 'metadata-only';
        let parsed = null;
        if (slideRef.html5url) {
          const slideText = readText(slideRef.html5url);
          if (slideText) {
            try {
              parsed = extractGlobalProvideData(slideText, 'slide').value;
              parseStatus = 'parsed';
              parsedSlideCount += 1;
              writeJson(path.join(output, outputRelative), parsed);
            } catch (error) {
              parseStatus = `parse-error: ${error.message}`;
            }
          }
        }
        slideRefs.push({
          id: slideRef.id || parsed?.id || null,
          title: slideRef.title || parsed?.title || 'Untitled Slide',
          lmsId: slideRef.lmsId || parsed?.lmsId || null,
          slideNumberInScene: slideNumber,
          source: outputRelative,
          publishedDataSource: slideRef.html5url || null,
          parseStatus,
        });
      });

      const sceneFile = `scenes/${sceneSlug}.json`;
      writeJson(path.join(output, sceneFile), {
        schema: 'storyline-extracted-scene@0.1',
        id: scene.id || null,
        lmsId: scene.lmsId || null,
        sceneNumber,
        startingSlide: scene.startingSlide || null,
        slides: slideRefs,
      });
      sceneRefs.push({ id: scene.id || null, sceneNumber, lmsId: scene.lmsId || null, source: sceneFile });
    });

    writeJson(path.join(output, 'project.json'), {
      schema: 'storyline-extracted-project@0.1',
      title: meta.title || path.basename(input, path.extname(input)),
      projectId: data.projectId || meta.id || null,
      courseId: data.courseId || meta.courseid || null,
      publishedAt: meta.datepublished || null,
      runtimeVersion: data.version || null,
      bwVersion: data.bwVersion || null,
      slideCountDeclared: data.slideCount ?? null,
      player: {
        chromeless: frame.chromeless === 'true',
        skipNavigationEnabled: frame.skip_nav_enabled === 'true',
        preventUpscale: frame.preventUpscale === 'true',
        defaultLayout: frame.default_layout || null,
        textDirection: frame.textdirection || data.textDirection || null,
      },
      scenes: sceneRefs,
    });

    writeJson(path.join(output, 'variables.json'), {
      projectVariables: data.variables || [],
      playerVariables: data.playervars || [],
    });
    writeJson(path.join(output, 'assets.json'), { assets: data.assetLib || [] });
    writeJson(path.join(output, 'source-manifest.json'), {
      extractor: `storyline-extractor@${VERSION}`,
      sourceZip: path.basename(input),
      archiveRoot: root || null,
      extractedAt: new Date().toISOString(),
      counts: {
        scenes: userScenes.length,
        slides: slideCount,
        parsedSlides: parsedSlideCount,
        projectVariables: (data.variables || []).length,
        playerVariables: (data.playervars || []).length,
        assets: (data.assetLib || []).length,
      },
      note: 'Published Storyline data is preserved for analysis. This is not a reconstruction of the original .story authoring file.',
    });

    writeJson(path.join(output, '_source', 'data.decoded.json'), data);
    writeText(path.join(output, '_source', 'meta.xml'), metaText);
    writeText(path.join(output, '_source', 'frame.xml'), frameText);
    writeText(path.join(output, '_source', 'triggers.js'), readText('story_content/triggers.js'));
    writeText(path.join(output, '_source', 'user.js'), readText('story_content/user.js'));

    console.log('\nSTORYLINE EXTRACTOR');
    console.log('===================');
    console.log(`Source: ${path.basename(input)}`);
    console.log(`Output: ${output}`);
    console.log(`Scenes: ${userScenes.length}`);
    console.log(`Slides: ${slideCount} (${parsedSlideCount} parsed)`);
    console.log(`Project variables: ${(data.variables || []).length}`);
    console.log(`Assets indexed: ${(data.assetLib || []).length}`);
    console.log('\nCreated:');
    console.log('  project.json');
    console.log('  scenes/');
    console.log('  slides/');
    console.log('  variables.json');
    console.log('  assets.json');
    console.log('  source-manifest.json');
    console.log('  _source/');
    console.log('');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

main();
