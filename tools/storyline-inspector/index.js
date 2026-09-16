#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readZip } = require('../rise-inspector/lib/zip-reader');

const VERSION = '0.1.0';

const ACTION_KINDS = new Set([
  'show','hide','if_action','adjustvar','link_slide','link_url','gotoplay','history_prev',
  'exe_action','exe_actiongroup','eval_interaction','submit','branching_submit','show_prompt',
  'change_state','set_enabled','setfocus','set_volume','media_seek','media_play','media_pause',
  'control_video','control_audio','enable_window_control','set_frame_layout','set_window_control_layout',
  'pause_animations','resume_animations','timeline_pause','timeline_resume'
]);

const OBJECT_KINDS = new Set([
  'vectorshape','svgimage','image','video','audio','group','hotspot','scrollarea','textinput',
  'input','button','slider','dial','marker','droplist','checkbox','radio','webobject','shape'
]);

const SYSTEM_VAR_PATTERNS = [
  /^LastSlideViewed_/,
  /_RetryModeInteractionIncompleteOnLoad$/,
  /^PrintPrompt/,
  /^ReviewMode_/,
  /^AnsweredInt_/,
  /^DisableChoices_/
];

function usage() {
  console.log(`\nStoryline Inspector v${VERSION}\n\nUsage:\n  node tools/storyline-inspector/index.js <storyline-web.zip> [--json] [--output report.json]\n\nExamples:\n  npm run inspect-storyline -- ../learning-content-private/references/storyline-exports/sample.zip\n  npm run inspect-storyline -- sample.zip --output report.json\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outputIndex = args.indexOf('--output');
  return {
    input: args.find((arg) => !arg.startsWith('--') && arg !== '-h' && (outputIndex < 0 || arg !== args[outputIndex + 1])),
    json: args.includes('--json'),
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function isMacMetadata(name) {
  return name.startsWith('__MACOSX/') || name.split('/').some((part) => part.startsWith('._'));
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function archiveRoot(entries) {
  const files = entries.filter((entry) => !entry.isDirectory && !isMacMetadata(entry.fileName));
  if (!files.length) return '';
  const firstParts = files.map((entry) => entry.fileName.split('/')[0]);
  const candidate = firstParts[0];
  return firstParts.every((part) => part === candidate) ? candidate : '';
}

function relPath(root, relative) {
  return root ? `${root}/${relative}` : relative;
}

function makeEntryMap(archive) {
  return new Map(archive.entries.map((entry) => [entry.fileName, entry]));
}

function readText(archive, entryMap, fileName) {
  const entry = entryMap.get(fileName);
  if (!entry) return null;
  return stripBom(archive.readEntry(entry).toString('utf8'));
}

function decodeJsSingleQuotedString(source) {
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = source[++i];
    if (next === undefined) { out += '\\'; break; }
    if (next === '\\') out += '\\';
    else if (next === "'") out += "'";
    else if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === 'v') out += '\v';
    else if (next === '0') out += '\0';
    else if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(source.slice(i + 1, i + 3))) {
      out += String.fromCharCode(parseInt(source.slice(i + 1, i + 3), 16)); i += 2;
    } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(source.slice(i + 1, i + 5))) {
      out += String.fromCharCode(parseInt(source.slice(i + 1, i + 5), 16)); i += 4;
    } else {
      out += `\\${next}`;
    }
  }
  return out;
}

function extractGlobalProvideData(text, expectedKey = null) {
  const marker = 'globalProvideData(';
  const start = text.indexOf(marker);
  if (start < 0) throw new Error('globalProvideData(...) was not found.');
  const argsStart = start + marker.length;
  const keyMatch = text.slice(argsStart).match(/^\s*'([^']+)'\s*,\s*'/);
  if (!keyMatch) throw new Error('globalProvideData key could not be parsed.');
  const key = keyMatch[1];
  if (expectedKey && key !== expectedKey) throw new Error(`Expected globalProvideData('${expectedKey}', ...) but found '${key}'.`);
  const valueStart = argsStart + keyMatch[0].length;
  let escaped = false;
  let end = -1;
  for (let i = valueStart; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === "'") { end = i; break; }
  }
  if (end < 0) throw new Error('globalProvideData value string was not closed.');
  const jsonText = decodeJsSingleQuotedString(text.slice(valueStart, end));
  return { key, value: JSON.parse(jsonText) };
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

function walk(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor);
    return;
  }
  if (!value || typeof value !== 'object') return;
  visitor(value);
  for (const child of Object.values(value)) walk(child, visitor);
}

function increment(counter, key, amount = 1) {
  counter[key] = (counter[key] || 0) + amount;
}

function mergeCounts(target, source) {
  for (const [key, value] of Object.entries(source)) increment(target, key, value);
}

function classifyVariable(variable) {
  const name = variable?.name || '';
  return SYSTEM_VAR_PATTERNS.some((pattern) => pattern.test(name)) ? 'likely-system' : 'likely-author';
}

function inspectSlide(slide) {
  const objectKinds = {};
  const actionKinds = {};
  let stateCount = 0;
  let altTextCount = 0;
  let tabEnabledCount = 0;
  let conditionalCount = 0;
  let nativeEvaluationCount = 0;
  let variableActionCount = 0;
  let externalLinkCount = 0;
  let slideLinkCount = 0;

  walk(slide, (node) => {
    if (node.kind && OBJECT_KINDS.has(node.kind)) increment(objectKinds, node.kind);
    if (node.kind && ACTION_KINDS.has(node.kind)) {
      increment(actionKinds, node.kind);
      if (node.kind === 'if_action') conditionalCount += 1;
      if (node.kind === 'eval_interaction') nativeEvaluationCount += 1;
      if (node.kind === 'adjustvar') variableActionCount += 1;
      if (node.kind === 'link_url') externalLinkCount += 1;
      if (node.kind === 'link_slide' || node.kind === 'gotoplay') slideLinkCount += 1;
    }
    if (Array.isArray(node.states)) stateCount += node.states.length;
    if (typeof node.altText === 'string' && node.altText.trim()) altTextCount += 1;
    if (node.tabEnabled === true) tabEnabledCount += 1;
  });

  const layers = Array.isArray(slide.slideLayers) ? slide.slideLayers : [];
  const durations = layers.map((layer) => layer?.timeline?.duration).filter((v) => typeof v === 'number');
  const layerDurations = durations.length ? durations : [0];
  const audioCount = objectKinds.audio || 0;
  const videoCount = objectKinds.video || 0;
  const questionControlCount = ['droplist','checkbox','radio'].reduce((sum, key) => sum + (objectKinds[key] || 0), 0);

  const signals = [];
  if (nativeEvaluationCount > 0 || questionControlCount > 0) signals.push('native-assessment');
  if (layers.length > 1) signals.push('layered-interaction');
  if (conditionalCount > 0 && variableActionCount > 0) signals.push('conditional-variable-logic');
  if (videoCount > 0) signals.push('video');
  if (audioCount > 0) signals.push('audio');

  return {
    id: slide.id || null,
    title: slide.title || 'Untitled Slide',
    lmsId: slide.lmsId || null,
    slideNumberInScene: slide.slideNumberInScene || null,
    width: slide.width || null,
    height: slide.height || null,
    transition: slide.transition || null,
    resume: Boolean(slide.resume),
    layers: layers.length,
    durationMs: Math.max(...layerDurations),
    objectKinds,
    actionKinds,
    states: stateCount,
    accessibility: { altTextObjects: altTextCount, tabEnabledObjects: tabEnabledCount },
    links: { internal: slideLinkCount, external: externalLinkCount },
    interactionSignals: signals,
    nativeEvaluationActions: nativeEvaluationCount,
    variableActions: variableActionCount,
    conditionalActions: conditionalCount,
  };
}

function countCustomScripts(text) {
  if (!text) return 0;
  const body = text.match(/switch\s*\(strId\)\s*\{([\s\S]*?)\n\s*\}/);
  if (!body) return 0;
  const matches = body[1].match(/case\s+["'][^"']+["']\s*:/g);
  return matches ? matches.length : 0;
}

function mediaSummary(assetLib, realEntries, root) {
  const summary = { total: assetLib.length, images: 0, audio: 0, video: 0, svgData: 0, other: 0, captions: 0 };
  for (const asset of assetLib) {
    const url = String(asset.url || '').toLowerCase();
    if (asset.videoType || /\.(mp4|webm|mov)$/.test(url) || url.includes('.hls/')) summary.video += 1;
    else if (asset.audioType || /\.(mp3|m4a|wav|aac|ogg)$/.test(url)) summary.audio += 1;
    else if (asset.imageType || /\.(png|jpe?g|gif|svg|webp)$/.test(url)) summary.images += 1;
    else if (asset.jsType === 'jssvg') summary.svgData += 1;
    else summary.other += 1;
  }
  const prefix = root ? `${root}/` : '';
  summary.captions = realEntries.filter((entry) => entry.fileName.startsWith(prefix) && /_captions\.js$/i.test(entry.fileName)).length;
  return summary;
}

function inspect(zipPath) {
  const archive = readZip(zipPath);
  const entryMap = makeEntryMap(archive);
  const realEntries = archive.entries.filter((entry) => !entry.isDirectory && !isMacMetadata(entry.fileName));
  const root = archiveRoot(archive.entries);

  const metaText = readText(archive, entryMap, relPath(root, 'meta.xml'));
  const dataText = readText(archive, entryMap, relPath(root, 'html5/data/js/data.js'));
  if (!dataText) throw new Error('This ZIP does not look like a Storyline Web publish: html5/data/js/data.js was not found.');

  const data = extractGlobalProvideData(dataText, 'data').value;
  const meta = xmlAttributes(metaText, 'project');
  const frame = xmlAttributes(readText(archive, entryMap, relPath(root, 'story_content/frame.xml')), 'bwFrame');
  const triggerText = readText(archive, entryMap, relPath(root, 'story_content/triggers.js'));
  const userScriptText = readText(archive, entryMap, relPath(root, 'story_content/user.js'));

  const projectVariables = (data.variables || []).map((variable) => ({
    name: variable.name || '', type: variable.type || null, value: variable.value,
    resume: Boolean(variable.resume), classification: classifyVariable(variable),
  }));

  const sceneReports = [];
  const totals = {
    scenes: 0, slides: 0, layers: 0, states: 0, assets: (data.assetLib || []).length,
    variables: projectVariables.length, likelyAuthorVariables: projectVariables.filter((v) => v.classification === 'likely-author').length,
    actions: {}, objects: {}, nativeAssessmentSlides: 0, layeredInteractionSlides: 0,
    variableLogicSlides: 0, videoSlides: 0, audioSlides: 0, altTextObjects: 0,
  };

  const userScenes = (data.scenes || []).filter((scene) => !scene.isMessageScene);
  totals.scenes = userScenes.length;

  for (const scene of userScenes) {
    const slideReports = [];
    for (const slideRef of scene.slides || []) {
      const relative = slideRef.html5url;
      let report = {
        id: slideRef.id || null,
        title: slideRef.title || 'Untitled Slide',
        lmsId: slideRef.lmsId || null,
        slideNumberInScene: slideRef.slideNumberInScene || null,
        layers: null,
        parseStatus: 'metadata-only',
      };
      if (relative) {
        const slideText = readText(archive, entryMap, relPath(root, relative));
        if (slideText) {
          try {
            const slide = extractGlobalProvideData(slideText, 'slide').value;
            report = { ...inspectSlide(slide), source: relative, parseStatus: 'parsed' };
          } catch (error) {
            report.parseError = error.message;
          }
        }
      }
      slideReports.push(report);
      totals.slides += 1;
      if (typeof report.layers === 'number') totals.layers += report.layers;
      totals.states += report.states || 0;
      totals.altTextObjects += report.accessibility?.altTextObjects || 0;
      mergeCounts(totals.actions, report.actionKinds || {});
      mergeCounts(totals.objects, report.objectKinds || {});
      const signals = report.interactionSignals || [];
      if (signals.includes('native-assessment')) totals.nativeAssessmentSlides += 1;
      if (signals.includes('layered-interaction')) totals.layeredInteractionSlides += 1;
      if (signals.includes('conditional-variable-logic')) totals.variableLogicSlides += 1;
      if (signals.includes('video')) totals.videoSlides += 1;
      if (signals.includes('audio')) totals.audioSlides += 1;
    }
    sceneReports.push({
      id: scene.id || null,
      lmsId: scene.lmsId || null,
      sceneNumber: scene.sceneNumber || null,
      startingSlide: scene.startingSlide || null,
      slides: slideReports,
    });
  }

  const customScripts = countCustomScripts(triggerText) + countCustomScripts(userScriptText);

  return {
    inspectorVersion: VERSION,
    sourceFile: path.basename(zipPath),
    archiveRoot: root || null,
    project: {
      title: meta.title || path.basename(zipPath, path.extname(zipPath)),
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
        textDirection: frame.textdirection || data.textDirection || null,
      },
    },
    totals,
    media: mediaSummary(data.assetLib || [], realEntries, root),
    variables: projectVariables,
    customJavaScriptBlocks: customScripts,
    scenes: sceneReports,
    reliability: {
      high: ['project metadata','scene/slide structure','layers','timeline durations','project variables','asset library','object kinds','trigger/action kinds','caption files'],
      heuristic: ['author-vs-system variable classification','assessment detection from interaction signals','interaction type classification'],
      notGuaranteed: ['original Storyline authoring names for every object/layer','exact trigger wording/order as shown in the authoring UI','source .story file features not emitted into Web publish'],
    },
  };
}

function sortedCounts(counts, limit = 12) {
  return Object.entries(counts || {}).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

function formatCounts(counts, limit = 8) {
  const pairs = sortedCounts(counts, limit);
  return pairs.length ? pairs.map(([key,value]) => `${key} ${value}`).join(' · ') : 'none detected';
}

function printReport(report) {
  console.log('\nSTORYLINE INSPECTOR');
  console.log('===================');
  console.log(`Project: ${report.project.title}`);
  if (report.project.publishedAt) console.log(`Published: ${report.project.publishedAt}`);
  console.log(`Runtime: ${report.project.runtimeVersion || 'unknown'}`);
  console.log(`Scenes: ${report.totals.scenes}`);
  console.log(`Slides: ${report.totals.slides}`);
  console.log(`Layers: ${report.totals.layers}`);
  console.log(`Variables: ${report.totals.variables} (${report.totals.likelyAuthorVariables} likely author-defined)`);
  console.log(`Assets: ${report.totals.assets}`);
  console.log(`Media: ${report.media.images} image · ${report.media.video} video · ${report.media.audio} audio · ${report.media.captions} caption file`);
  console.log(`Custom JavaScript blocks: ${report.customJavaScriptBlocks}`);
  console.log(`Accessibility: ${report.totals.altTextObjects} objects with alt text`);
  console.log('\nINTERACTION SIGNALS');
  console.log('-------------------');
  console.log(`Native assessment slides: ${report.totals.nativeAssessmentSlides}`);
  console.log(`Layered interaction slides: ${report.totals.layeredInteractionSlides}`);
  console.log(`Conditional + variable logic slides: ${report.totals.variableLogicSlides}`);
  console.log(`Video slides: ${report.totals.videoSlides}`);
  console.log(`Audio slides: ${report.totals.audioSlides}`);
  console.log(`Top trigger actions: ${formatCounts(report.totals.actions)}`);
  console.log(`Top object kinds: ${formatCounts(report.totals.objects)}`);

  if (report.variables.length) {
    console.log('\nVARIABLES');
    console.log('---------');
    for (const variable of report.variables) {
      console.log(`- ${variable.name} [${variable.type || 'unknown'}] = ${JSON.stringify(variable.value)} · ${variable.classification}`);
    }
  }

  console.log('\nSCENES / SLIDES');
  console.log('---------------');
  for (const scene of report.scenes) {
    console.log(`${scene.sceneNumber || '?'}: ${scene.lmsId || scene.id || 'Scene'} (${scene.slides.length} slide${scene.slides.length === 1 ? '' : 's'})`);
    for (const slide of scene.slides) {
      const bits = [];
      if (typeof slide.layers === 'number') bits.push(`${slide.layers} layer${slide.layers === 1 ? '' : 's'}`);
      if (slide.durationMs) bits.push(`${(slide.durationMs / 1000).toFixed(slide.durationMs % 1000 ? 2 : 0)}s`);
      if (slide.interactionSignals?.length) bits.push(slide.interactionSignals.join(', '));
      console.log(`  ${slide.slideNumberInScene || '-'} · ${slide.title}${bits.length ? ` — ${bits.join(' · ')}` : ''}`);
    }
  }

  console.log('\nReliability: structure/counts are extracted directly from published Storyline HTML5 data; interaction and variable classifications are labeled heuristics.\n');
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help || !options.input) {
    usage();
    process.exit(options.help ? 0 : 1);
  }
  const input = path.resolve(process.cwd(), options.input);
  if (!fs.existsSync(input)) {
    console.error(`\nError: Storyline ZIP not found:\n${input}\n`);
    process.exit(1);
  }
  try {
    const report = inspect(input);
    if (options.output) {
      const output = path.resolve(process.cwd(), options.output);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    if (options.output) console.log(`JSON report: ${path.resolve(process.cwd(), options.output)}\n`);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { inspect, extractGlobalProvideData, inspectSlide };
