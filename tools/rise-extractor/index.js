#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readZip } = require('../rise-inspector/lib/zip-reader');
const { decodeRuntimeData } = require('../rise-inspector/lib/decoder');

const EXTRACTOR_VERSION = '0.1.0';
const DRAFT_SCHEMA_VERSION = '0.1.0-rise-draft';

function printUsage() {
  console.log(`\nRise Extractor v${EXTRACTOR_VERSION}\n\nUsage:\n  node tools/rise-extractor/index.js <rise-export.zip> --output <folder> [--copy-assets]\n\nExample:\n  node tools/rise-extractor/index.js ../learning-content-private/references/rise-exports/pcn-rise-export.zip --output ../learning-content-private/exports/pcn-rise-extracted\n\nOptions:\n  --output <folder>  Required destination folder. Keep private course output outside the public repo.\n  --copy-assets      Copy learning assets from the ZIP into <output>/assets/.\n  --help, -h         Show this help.\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const input = args.find((arg) => !arg.startsWith('--') && arg !== '-h');
  const outputIndex = args.indexOf('--output');
  const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
  return {
    input,
    output,
    copyAssets: args.includes('--copy-assets'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function safeSlug(value, fallback) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return slug || fallback;
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isMacMetadata(fileName) {
  const normalized = fileName.replace(/\\/g, '/');
  return normalized.includes('/__MACOSX/')
    || normalized.startsWith('__MACOSX/')
    || path.posix.basename(normalized).startsWith('._')
    || path.posix.basename(normalized) === '.DS_Store';
}

function isLearningAsset(entry) {
  return !entry.isDirectory
    && /(^|\/)assets\//i.test(entry.fileName)
    && !isMacMetadata(entry.fileName);
}

function assetKind(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.m4v'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return 'audio';
  if (['.vtt', '.srt'].includes(ext)) return 'caption';
  return 'other';
}

function stripAssetPrefix(fileName) {
  const normalized = fileName.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)assets\/(.+)$/i);
  return match ? match[1] : path.posix.basename(normalized);
}

function makeCourseDocument(runtimeData, lessonFiles) {
  const course = runtimeData.course || {};
  return {
    schemaStatus: 'draft-rise-informed',
    schemaVersion: DRAFT_SCHEMA_VERSION,
    sourceFormat: 'rise-published-web',
    sourceCourseId: course.id || null,
    id: course.id || null,
    title: course.title || '',
    description: course.description || '',
    author: course.author || null,
    createdAt: course.createdAt || null,
    updatedAt: course.updatedAt || null,
    lastPublishedAt: course.lastPublishedAt || null,
    navigation: {
      mode: course.navigationMode || null,
      sidebarMode: course.sidebarMode || null,
      showLessonCount: course.showLessonCount ?? null,
      showNavigationButtons: course.showNavigationButtons ?? null,
      allowSearch: course.allowSearch ?? null,
    },
    theme: course.theme || null,
    fonts: course.fonts || null,
    coverImage: course.coverImage || null,
    cardImage: course.cardImage || null,
    exportSettings: course.exportSettings || null,
    lmsOptions: course.lmsOptions || null,
    lessons: lessonFiles,
    source: {
      note: 'This document is a draft normalized view. Lossless Rise source data is preserved under _source/runtime-data.decoded.json.',
    },
  };
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printUsage();
    process.exit(0);
  }
  if (!options.input || !options.output) {
    printUsage();
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.input);
  const outputPath = path.resolve(process.cwd(), options.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`\nError: source ZIP not found:\n${inputPath}\n`);
    process.exit(1);
  }
  if (!fs.statSync(inputPath).isFile()) {
    console.error(`\nError: source path is not a file:\n${inputPath}\n`);
    process.exit(1);
  }
  if (path.extname(inputPath).toLowerCase() !== '.zip') {
    console.error('\nError: Rise Extractor expects a published Rise .zip export.\n');
    process.exit(1);
  }

  let archive;
  try {
    archive = readZip(inputPath);
  } catch (error) {
    console.error(`\nError: could not read ZIP file.\n${error.message}\n`);
    process.exit(1);
  }

  const runtimeEntry = archive.entries.find((entry) => entry.fileName === 'content/runtime-data.js')
    || archive.entries.find((entry) => /(^|\/)runtime-data\.js$/i.test(entry.fileName));

  if (!runtimeEntry) {
    console.error('\nError: runtime-data.js was not found. This may not be a compatible Rise web export.\n');
    process.exit(1);
  }

  let runtimeData;
  try {
    runtimeData = decodeRuntimeData(archive.readEntry(runtimeEntry).toString('utf8'));
  } catch (error) {
    console.error(`\nError: runtime-data.js could not be decoded.\n${error.message}\n`);
    process.exit(1);
  }

  ensureDir(outputPath);
  ensureDir(path.join(outputPath, 'lessons'));
  ensureDir(path.join(outputPath, 'assessments'));
  ensureDir(path.join(outputPath, '_source'));

  const lessons = Array.isArray(runtimeData.course?.lessons) ? runtimeData.course.lessons : [];
  const lessonFiles = [];
  const assessmentFiles = [];

  lessons.forEach((lesson, index) => {
    const number = index + 1;
    const slug = safeSlug(lesson.title, `lesson-${number}`);
    const baseName = `${pad(number)}-${slug}.json`;
    const isQuiz = lesson.type === 'quiz';
    const relativeFile = `${isQuiz ? 'assessments' : 'lessons'}/${baseName}`;

    const document = {
      schemaStatus: 'draft-rise-informed',
      schemaVersion: DRAFT_SCHEMA_VERSION,
      sourceFormat: 'rise-published-web',
      order: number,
      id: lesson.id || null,
      title: lesson.title || '',
      description: lesson.description || '',
      type: lesson.type || 'unknown',
      settings: lesson.settings || {},
      media: lesson.media || null,
      metadata: lesson.metadata || null,
      items: Array.isArray(lesson.items) ? lesson.items : [],
      _riseSource: lesson,
    };

    writeJson(path.join(outputPath, relativeFile), document);

    const ref = {
      order: number,
      id: lesson.id || null,
      title: lesson.title || '',
      type: lesson.type || 'unknown',
      itemCount: Array.isArray(lesson.items) ? lesson.items.length : 0,
      file: relativeFile,
    };

    if (isQuiz) assessmentFiles.push(ref);
    else lessonFiles.push(ref);
  });

  const assetEntries = archive.entries.filter(isLearningAsset);
  const assets = assetEntries.map((entry) => ({
    sourcePath: entry.fileName,
    relativePath: stripAssetPrefix(entry.fileName),
    kind: assetKind(entry.fileName),
    extension: path.extname(entry.fileName).toLowerCase(),
    compressedBytes: entry.compressedSize,
    bytes: entry.uncompressedSize,
  }));

  const assetCounts = assets.reduce((counts, asset) => {
    counts[asset.kind] = (counts[asset.kind] || 0) + 1;
    return counts;
  }, {});

  if (options.copyAssets) {
    for (const entry of assetEntries) {
      const destination = path.join(outputPath, 'assets', stripAssetPrefix(entry.fileName));
      ensureDir(path.dirname(destination));
      fs.writeFileSync(destination, archive.readEntry(entry));
    }
  }

  writeJson(path.join(outputPath, 'course.json'), makeCourseDocument(runtimeData, [...lessonFiles, ...assessmentFiles].sort((a, b) => a.order - b.order)));
  writeJson(path.join(outputPath, 'assets.json'), {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    copied: options.copyAssets,
    total: assets.length,
    counts: assetCounts,
    assets,
  });

  writeJson(path.join(outputPath, '_source', 'runtime-data.decoded.json'), runtimeData);
  writeJson(path.join(outputPath, '_source', 'rise-config.json'), {
    labelSet: runtimeData.labelSet ?? null,
    settings: runtimeData.settings ?? null,
    deliveryPolicy: runtimeData.deliveryPolicy ?? null,
    exportAggregate: runtimeData.exportAggregate ?? null,
    fonts: runtimeData.fonts ?? null,
    partnerContent: runtimeData.partnerContent ?? null,
  });

  const manifest = {
    extractorVersion: EXTRACTOR_VERSION,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    schemaStatus: 'draft-rise-informed',
    extractedAt: new Date().toISOString(),
    source: {
      file: path.basename(inputPath),
      runtimePath: runtimeEntry.fileName,
    },
    output: {
      course: 'course.json',
      lessons: lessonFiles,
      assessments: assessmentFiles,
      assetManifest: 'assets.json',
      assetsCopied: options.copyAssets,
      losslessRuntime: '_source/runtime-data.decoded.json',
      riseConfig: '_source/rise-config.json',
    },
    counts: {
      lessons: lessonFiles.length,
      assessments: assessmentFiles.length,
      assets: assets.length,
    },
    notes: [
      'This schema is intentionally marked draft until Storyline output has been inspected and the shared authoring-tool-neutral schema is finalized.',
      'The _source directory preserves lossless decoded Rise data for comparison and future rebuilding.',
    ],
  };
  writeJson(path.join(outputPath, 'source-manifest.json'), manifest);

  console.log('\nRISE EXTRACTOR');
  console.log('==============');
  console.log(`Source: ${path.basename(inputPath)}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Lessons: ${lessonFiles.length}`);
  console.log(`Assessments: ${assessmentFiles.length}`);
  console.log(`Assets indexed: ${assets.length}`);
  console.log(`Assets copied: ${options.copyAssets ? 'yes' : 'no'}`);
  console.log('\nCreated:');
  console.log('  course.json');
  console.log('  lessons/');
  console.log('  assessments/');
  console.log('  assets.json');
  console.log('  source-manifest.json');
  console.log('  _source/runtime-data.decoded.json');
  console.log('  _source/rise-config.json\n');
}

main();
