#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSION = '0.1.0';
const SCHEMA_VERSION = '0.1';

function usage() {
  console.log(`\nStoryline Normalizer v${VERSION}\n\nUsage:\n  node tools/storyline-normalizer/index.js <storyline-extracted-folder> [--output <folder>]\n\nExample:\n  npm run normalize-storyline -- ../learning-content-private/exports/image-carousel-storyline-extracted\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const input = args.find((arg, index) => !arg.startsWith('--') && arg !== '-h' && !(outputIndex >= 0 && index === outputIndex + 1));
  return {
    input,
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slug(value, fallback = 'item') {
  const result = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return result || fallback;
}

function cleanText(value) {
  if (value == null) return null;
  const text = String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return text || null;
}

function assertFile(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`${label} not found: ${file}`);
  }
}

function isLikelySystemVariable(variable) {
  const name = String(variable?.name || '');
  return (
    name.startsWith('_') ||
    /^LastSlideViewed_/i.test(name) ||
    /RetryModeInteraction/i.test(name) ||
    /^ReviewMode_/i.test(name) ||
    /^Scene\d+_/i.test(name) ||
    /^Slide\d+_/i.test(name) ||
    /_interactionID$/i.test(name) ||
    /_status$/i.test(name) ||
    /_score$/i.test(name)
  );
}

function normalizeVariable(variable, classification = null) {
  return {
    id: variable?.name || null,
    name: variable?.name || null,
    type: variable?.type || typeof variable?.value,
    initialValue: variable?.value ?? null,
    resume: variable?.resume ?? null,
    classification,
  };
}

function assetKind(asset) {
  const url = String(asset?.url || '').toLowerCase().split('?')[0];
  const ext = path.extname(url);
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'].includes(ext) || asset?.imageType) return 'image';
  if (['.mp4', '.webm', '.mov', '.m4v'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return 'audio';
  if (['.vtt', '.srt', '.xml'].includes(ext)) return 'caption';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'font';
  return 'other';
}

function normalizeAsset(asset, index) {
  return {
    id: `storyline-asset-${String(asset?.id ?? index).padStart(3, '0')}`,
    sourceId: asset?.id ?? index,
    kind: assetKind(asset),
    path: asset?.url || null,
    width: asset?.width ?? null,
    height: asset?.height ?? null,
    bytes: asset?.fileSize ?? null,
    metadata: {
      imageType: asset?.imageType || null,
      mobileOffsetX: asset?.mobiledx ?? null,
      mobileOffsetY: asset?.mobiledy ?? null,
    },
  };
}

function valueOf(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return value;
  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    return { type: value.type || null, value: value.value };
  }
  return value;
}

function refValue(ref) {
  if (ref == null) return null;
  if (typeof ref === 'string') return ref;
  return ref.value ?? ref.id ?? null;
}

function normalizeCondition(condition) {
  if (!condition) return null;
  const node = condition.statement || condition;
  if (!node || typeof node !== 'object') return node;

  if (Array.isArray(node.statements)) {
    return {
      type: node.kind || 'group',
      statements: node.statements.map(normalizeCondition),
    };
  }

  if (node.kind === 'compare') {
    return {
      type: 'compare',
      operator: node.operator || null,
      left: { type: node.typea || null, value: node.valuea ?? null },
      right: { type: node.typeb || null, value: node.valueb ?? null },
    };
  }

  return {
    type: node.kind || 'condition',
    value: node.value ?? null,
    valueType: node.type || null,
    object: refValue(node.objRef),
    state: refValue(node.stateRef),
  };
}

function normalizeAction(action) {
  if (!action || typeof action !== 'object') return action;
  const rawKind = action.kind || 'unknown';

  if (rawKind === 'if_action') {
    return {
      type: 'condition',
      condition: normalizeCondition(action.condition),
      then: (action.thenActions || []).map(normalizeAction),
      else: (action.elseActions || []).map(normalizeAction),
      rawKind,
    };
  }

  const mapping = {
    show: 'object.show',
    hide: 'object.hide',
    adjustvar: 'variable.adjust',
    setobjstate: 'object.state.set',
    exe_actiongroup: 'action-group.execute',
    trigger_next_slide: 'navigation.next',
    trigger_prev_slide: 'navigation.previous',
    history_prev: 'navigation.previous',
    trigger_slide_finish: 'navigation.finish',
    trigger_submit_slide: 'assessment.submit',
    trigger_submitall_slide: 'assessment.submit-all',
    play: 'media.play',
    pause: 'media.pause',
    stop: 'media.stop',
    launch_url: 'navigation.url',
  };

  let type = mapping[rawKind] || `storyline.${rawKind}`;
  if (/show.*layer/i.test(rawKind)) type = 'layer.show';
  if (/hide.*layer/i.test(rawKind)) type = 'layer.hide';
  if (/jump.*slide|goto.*slide/i.test(rawKind)) type = 'navigation.slide';
  if (/javascript|js_action|execjs/i.test(rawKind)) type = 'javascript.execute';

  return {
    rawKind,
    type,
    target: refValue(action.objRef) || refValue(action.layerRef) || refValue(action.slideRef) || action.id || null,
    variable: action.variable || null,
    operator: action.operator || null,
    value: valueOf(action.value),
    state: refValue(action.stateRef),
    transition: action.transition || null,
    url: action.url || null,
    javascript: action.javascript || action.script || null,
  };
}

function normalizeEvent(event, scope = null) {
  if (!event || typeof event !== 'object') return event;
  return {
    type: event.kind || 'event',
    name: event.eventName || null,
    timeMs: event.time ?? null,
    scope,
    actions: (event.actions || []).map(normalizeAction),
  };
}

function collectAssetIds(node, output = new Set()) {
  if (node == null) return output;
  if (Array.isArray(node)) {
    node.forEach((item) => collectAssetIds(item, output));
    return output;
  }
  if (typeof node !== 'object') return output;
  if (Object.prototype.hasOwnProperty.call(node, 'assetId') && Number.isFinite(Number(node.assetId))) {
    output.add(Number(node.assetId));
  }
  Object.values(node).forEach((value) => collectAssetIds(value, output));
  return output;
}

function findAltText(object) {
  return (
    object?.data?.vectorData?.altText ||
    object?.data?.textdata?.altText ||
    object?.imagelib?.[0]?.altText ||
    object?.altText ||
    null
  );
}

function findReadableText(object) {
  const candidates = [
    object?.data?.textdata?.altText,
    object?.data?.vectorData?.altText,
    object?.textLib?.[0]?.vartext,
    object?.textLib?.[0]?.vectortext?.altText,
  ];
  for (const candidate of candidates) {
    const cleaned = cleanText(candidate);
    if (cleaned) return cleaned;
  }
  return null;
}

function normalizeObject(object, index, assetLookup, layerId) {
  const sourceAssetIds = [...collectAssetIds(object)];
  const assetIds = sourceAssetIds.map((id) => assetLookup.get(id)?.id).filter(Boolean);
  const children = Array.isArray(object?.objects)
    ? object.objects.map((child, childIndex) => normalizeObject(child, childIndex, assetLookup, layerId))
    : [];

  const states = Array.isArray(object?.states)
    ? object.states.map((state) => ({
        id: state.id || state.name || null,
        name: state.name || state.id || null,
        rawKind: state.kind || null,
      }))
    : [];

  return {
    id: object?.id || `object-${index + 1}`,
    kind: object?.kind || 'object',
    role: object?.accType || null,
    referenceName: object?.referenceName || null,
    text: findReadableText(object),
    bounds: {
      x: object?.xPos ?? null,
      y: object?.yPos ?? null,
      width: object?.width ?? null,
      height: object?.height ?? null,
      rotation: object?.rotation ?? 0,
      scaleX: object?.scaleX ?? 100,
      scaleY: object?.scaleY ?? 100,
    },
    accessibility: {
      altText: findAltText(object),
      tabEnabled: object?.tabEnabled ?? null,
      tabIndex: object?.tabIndex ?? null,
      handCursor: object?.useHandCursor ?? null,
    },
    assets: assetIds,
    states,
    children,
    events: (object?.events || []).map((event) => normalizeEvent(event, `object:${object?.id || index + 1}`)),
    source: {
      platform: 'storyline',
      layerId,
      sourceKind: object?.kind || null,
    },
  };
}

function normalizeLayer(layer, index, assetLookup, sourceFile) {
  const id = layer?.id || `layer-${index + 1}`;
  const timelineEvents = (layer?.timeline?.events || []).map((event) => normalizeEvent(event, `layer:${id}:timeline`));
  const directEvents = (layer?.events || []).map((event) => normalizeEvent(event, `layer:${id}`));
  return {
    id,
    title: cleanText(layer?.name || layer?.title) || (layer?.isBaseLayer ? 'Base Layer' : `Layer ${index}`),
    kind: layer?.isBaseLayer ? 'base' : 'layer',
    timeline: {
      durationMs: layer?.timeline?.duration ?? null,
      startTimeMs: layer?.startTime ?? null,
      enableSeek: layer?.enableSeek ?? null,
      enableReplay: layer?.enableReplay ?? null,
    },
    objects: (layer?.objects || []).map((object, objectIndex) => normalizeObject(object, objectIndex, assetLookup, id)),
    events: [...timelineEvents, ...directEvents],
    source: {
      platform: 'storyline',
      sourceFile,
      rawRef: `${sourceFile}#/slideLayers/${index}`,
    },
  };
}

function flattenActions(actions, output = []) {
  for (const action of actions || []) {
    output.push(action);
    if (action?.then) flattenActions(action.then, output);
    if (action?.else) flattenActions(action.else, output);
  }
  return output;
}

function collectEventActions(events) {
  const actions = [];
  for (const event of events || []) flattenActions(event.actions, actions);
  return actions;
}

function normalizeActionGroups(actionGroups) {
  const output = {};
  for (const [id, group] of Object.entries(actionGroups || {})) {
    output[id] = { id, actions: (group?.actions || []).map(normalizeAction) };
  }
  return output;
}

function inferInteraction(slide, layers, normalizedActionGroups) {
  const layerEvents = layers.flatMap((layer) => layer.events || []);
  const objectEvents = layers.flatMap((layer) => layer.objects || []).flatMap((object) => object.events || []);
  const slideEvents = (slide?.events || []).map((event) => normalizeEvent(event, 'slide'));
  const actionGroupActions = Object.values(normalizedActionGroups || {}).flatMap((group) => group.actions || []);
  const actions = [
    ...collectEventActions(layerEvents),
    ...collectEventActions(objectEvents),
    ...collectEventActions(slideEvents),
    ...flattenActions(actionGroupActions),
  ];
  const rawKinds = actions.map((action) => action?.rawKind).filter(Boolean);
  const sourceText = JSON.stringify(slide);
  return {
    layered: layers.length > 1,
    conditionalLogic: rawKinds.includes('if_action') || actions.some((action) => action?.type === 'condition'),
    variableDriven: actions.some((action) => action?.type === 'variable.adjust'),
    nativeAssessment: /eval_interaction|submitinteraction|quizdata|results/i.test(sourceText),
    javascript: /javascript.execute/.test(JSON.stringify(actions)),
    actionCount: actions.length,
  };
}

function normalizeSlide(slide, sourceFile, assetLookup) {
  const layers = (slide?.slideLayers || []).map((layer, index) => normalizeLayer(layer, index, assetLookup, sourceFile));
  const actionGroups = normalizeActionGroups(slide?.actionGroups || {});
  const durationMs = Math.max(0, ...layers.map((layer) => Number(layer.timeline?.durationMs || 0)));
  return {
    schemaVersion: SCHEMA_VERSION,
    id: slide?.id || slug(slide?.title, 'slide'),
    title: cleanText(slide?.title) || 'Untitled Slide',
    kind: 'slide',
    canvas: { width: slide?.width ?? null, height: slide?.height ?? null },
    timeline: { durationMs: durationMs || null, transition: slide?.transition || null },
    layers,
    events: (slide?.events || []).map((event) => normalizeEvent(event, 'slide')),
    actionGroups,
    interaction: inferInteraction(slide, layers, actionGroups),
    source: {
      platform: 'storyline',
      sourceFile,
      sourceId: slide?.id || null,
      lmsId: slide?.lmsId || null,
    },
    metadata: {
      slideNumberInScene: slide?.slideNumberInScene ?? null,
      includeInSlideCounts: slide?.includeInSlideCounts ?? null,
      trackViews: slide?.trackViews ?? null,
      resume: slide?.resume ?? null,
    },
  };
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help || !options.input) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const inputDir = path.resolve(process.cwd(), options.input);
  const outputDir = path.resolve(process.cwd(), options.output || path.join(options.input, 'normalized'));

  try {
    assertFile(path.join(inputDir, 'project.json'), 'project.json');
    assertFile(path.join(inputDir, 'variables.json'), 'variables.json');
    assertFile(path.join(inputDir, 'assets.json'), 'assets.json');

    const project = readJson(path.join(inputDir, 'project.json'));
    const variablesDoc = readJson(path.join(inputDir, 'variables.json'));
    const assetsDoc = readJson(path.join(inputDir, 'assets.json'));

    const normalizedAssets = (assetsDoc.assets || []).map(normalizeAsset);
    const assetLookup = new Map(normalizedAssets.map((asset) => [Number(asset.sourceId), asset]));

    const projectVariables = variablesDoc.projectVariables || [];
    const authorVariables = projectVariables.filter((variable) => !isLikelySystemVariable(variable)).map((variable) => normalizeVariable(variable, 'author'));
    const systemVariables = projectVariables.filter(isLikelySystemVariable).map((variable) => normalizeVariable(variable, 'system'));

    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'scenes'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'slides'), { recursive: true });

    const sceneRefs = [];
    let normalizedSlideCount = 0;
    let layeredSlideCount = 0;
    let variableDrivenSlideCount = 0;
    let assessmentSlideCount = 0;

    for (const sceneRef of project.scenes || []) {
      const sceneSource = sceneRef.source;
      if (!sceneSource) continue;
      const sceneInputFile = path.join(inputDir, sceneSource);
      if (!fs.existsSync(sceneInputFile)) continue;
      const scene = readJson(sceneInputFile);
      const sceneSlug = path.basename(sceneSource, '.json');
      const normalizedSlideRefs = [];

      for (const slideRef of scene.slides || []) {
        if (!slideRef.source) continue;
        const slideInputFile = path.join(inputDir, slideRef.source);
        if (!fs.existsSync(slideInputFile)) continue;
        const rawSlide = readJson(slideInputFile);
        const normalizedSlide = normalizeSlide(rawSlide, slideRef.source, assetLookup);
        normalizedSlideCount += 1;
        if (normalizedSlide.interaction.layered) layeredSlideCount += 1;
        if (normalizedSlide.interaction.variableDriven) variableDrivenSlideCount += 1;
        if (normalizedSlide.interaction.nativeAssessment) assessmentSlideCount += 1;

        const relativeOutput = slideRef.source;
        writeJson(path.join(outputDir, relativeOutput), normalizedSlide);
        normalizedSlideRefs.push({
          id: normalizedSlide.id,
          title: normalizedSlide.title,
          order: slideRef.slideNumberInScene ?? null,
          source: relativeOutput,
          interaction: normalizedSlide.interaction,
        });
      }

      const normalizedScene = {
        schemaVersion: SCHEMA_VERSION,
        id: scene.id || sceneRef.id || sceneSlug,
        title: scene.lmsId || sceneRef.lmsId || `Scene ${scene.sceneNumber || sceneRef.sceneNumber || ''}`.trim(),
        kind: 'scene',
        order: scene.sceneNumber ?? sceneRef.sceneNumber ?? null,
        startingSlide: scene.startingSlide || null,
        slides: normalizedSlideRefs,
        source: {
          platform: 'storyline',
          sourceFile: sceneSource,
          sourceId: scene.id || null,
        },
      };
      const normalizedSceneSource = `scenes/${sceneSlug}.json`;
      writeJson(path.join(outputDir, normalizedSceneSource), normalizedScene);
      sceneRefs.push({ id: normalizedScene.id, title: normalizedScene.title, order: normalizedScene.order, source: normalizedSceneSource });
    }

    const firstSlideRef = sceneRefs.length ? readJson(path.join(outputDir, sceneRefs[0].source)).slides?.[0] : null;
    const firstSlide = firstSlideRef?.source && fs.existsSync(path.join(outputDir, firstSlideRef.source))
      ? readJson(path.join(outputDir, firstSlideRef.source))
      : null;

    const experience = {
      schemaVersion: SCHEMA_VERSION,
      id: project.projectId || slug(project.title, 'storyline-experience'),
      title: project.title || 'Storyline Experience',
      kind: 'stateful-experience',
      description: null,
      canvas: { width: firstSlide?.canvas?.width ?? null, height: firstSlide?.canvas?.height ?? null },
      variables: { author: authorVariables, system: systemVariables },
      scenes: sceneRefs,
      assets: 'assets.json',
      source: {
        platform: 'storyline',
        sourceFile: 'project.json',
        sourceId: project.projectId || null,
        runtimeVersion: project.runtimeVersion || null,
      },
      metadata: {
        publishedAt: project.publishedAt || null,
        courseId: project.courseId || null,
        player: project.player || {},
      },
    };

    writeJson(path.join(outputDir, 'experience.json'), experience);
    writeJson(path.join(outputDir, 'variables.json'), {
      schemaVersion: SCHEMA_VERSION,
      author: authorVariables,
      system: systemVariables,
      player: (variablesDoc.playerVariables || []).map((variable) => normalizeVariable(variable, 'player')),
    });
    writeJson(path.join(outputDir, 'assets.json'), { schemaVersion: SCHEMA_VERSION, assets: normalizedAssets });
    writeJson(path.join(outputDir, 'normalization-manifest.json'), {
      normalizer: `storyline-normalizer@${VERSION}`,
      schemaVersion: SCHEMA_VERSION,
      source: inputDir,
      normalizedAt: new Date().toISOString(),
      counts: {
        scenes: sceneRefs.length,
        slides: normalizedSlideCount,
        layeredSlides: layeredSlideCount,
        variableDrivenSlides: variableDrivenSlideCount,
        nativeAssessmentSlides: assessmentSlideCount,
        authorVariables: authorVariables.length,
        systemVariables: systemVariables.length,
        assets: normalizedAssets.length,
      },
      note: 'Draft stateful-experience normalization. Source Storyline runtime structures remain available in the extracted folder and are not replaced by this model.',
    });

    console.log('\nSTORYLINE NORMALIZER');
    console.log('====================');
    console.log(`Input: ${inputDir}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Scenes: ${sceneRefs.length}`);
    console.log(`Slides: ${normalizedSlideCount}`);
    console.log(`Layered slides: ${layeredSlideCount}`);
    console.log(`Variable-driven slides: ${variableDrivenSlideCount}`);
    console.log(`Native assessment slides: ${assessmentSlideCount}`);
    console.log(`Author variables: ${authorVariables.length}`);
    console.log(`Assets: ${normalizedAssets.length}`);
    console.log(`Schema: ${SCHEMA_VERSION} (draft stateful-experience)`);
    console.log('\nCreated:');
    console.log('  normalized/experience.json');
    console.log('  normalized/scenes/');
    console.log('  normalized/slides/');
    console.log('  normalized/variables.json');
    console.log('  normalized/assets.json');
    console.log('  normalized/normalization-manifest.json');
    console.log('');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

main();
