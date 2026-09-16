#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  NORMALIZER_VERSION,
  SCHEMA_VERSION,
  normalizeLesson,
  normalizeAssessment,
  normalizeAssets,
  normalizeCourse,
} = require('./lib/normalizer');

function usage() {
  console.log(`\nRise Normalizer v${NORMALIZER_VERSION}\n\nUsage:\n  node tools/rise-normalizer/index.js <extracted-course-folder> [--output <folder>]\n\nExample:\n  node tools/rise-normalizer/index.js ../learning-content-private/exports/pcn-rise-extracted\n\nDefault output:\n  <extracted-course-folder>/normalized\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const input = args.find((arg) => !arg.startsWith('--') && arg !== '-h');
  const outputIndex = args.indexOf('--output');
  return {
    input,
    output: outputIndex >= 0 ? args[outputIndex + 1] : null,
    help: args.includes('--help') || args.includes('-h'),
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertFile(file, description) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`${description} not found: ${file}`);
  }
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!options.input) {
    usage();
    process.exit(1);
  }

  const inputDir = path.resolve(process.cwd(), options.input);
  const outputDir = path.resolve(process.cwd(), options.output || path.join(inputDir, 'normalized'));

  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`\nError: extracted course folder not found:\n${inputDir}\n`);
    process.exit(1);
  }

  const courseFile = path.join(inputDir, 'course.json');
  const assetsFile = path.join(inputDir, 'assets.json');
  const sourceManifestFile = path.join(inputDir, 'source-manifest.json');

  try {
    assertFile(courseFile, 'course.json');
    assertFile(assetsFile, 'assets.json');
    assertFile(sourceManifestFile, 'source-manifest.json');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }

  let courseDocument;
  let assetDocument;
  let sourceManifest;
  try {
    courseDocument = readJson(courseFile);
    assetDocument = readJson(assetsFile);
    sourceManifest = readJson(sourceManifestFile);
  } catch (error) {
    console.error(`\nError: extracted JSON could not be read.\n${error.message}\n`);
    process.exit(1);
  }

  ensureDir(outputDir);
  ensureDir(path.join(outputDir, 'lessons'));
  ensureDir(path.join(outputDir, 'assessments'));

  const sourceUnits = Array.isArray(courseDocument.lessons) ? courseDocument.lessons : [];
  const normalizedUnitRefs = [];
  let lessonCount = 0;
  let assessmentCount = 0;
  let blockCount = 0;
  let questionCount = 0;

  for (const ref of sourceUnits) {
    if (!ref?.file) continue;
    const sourceUnitPath = path.join(inputDir, ref.file);
    if (!fs.existsSync(sourceUnitPath)) {
      console.warn(`Warning: skipped missing source unit ${ref.file}`);
      continue;
    }

    const sourceDocument = readJson(sourceUnitPath);
    const order = Number.isInteger(ref.order) ? ref.order : normalizedUnitRefs.length + 1;
    const isAssessment = ref.type === 'quiz' || ref.file.startsWith('assessments/');
    const outputSubdir = isAssessment ? 'assessments' : 'lessons';
    const outputName = path.basename(ref.file);
    const normalizedRelativePath = `${outputSubdir}/${outputName}`;

    if (isAssessment) {
      const normalized = normalizeAssessment(sourceDocument, order, ref.file);
      questionCount += normalized.questions.length;
      assessmentCount += 1;
      writeJson(path.join(outputDir, normalizedRelativePath), normalized);
      normalizedUnitRefs.push({
        id: normalized.id,
        kind: 'assessment',
        title: normalized.title,
        source: normalizedRelativePath,
      });
    } else {
      const normalized = normalizeLesson(sourceDocument, order, ref.file);
      blockCount += normalized.blocks.length;
      lessonCount += 1;
      writeJson(path.join(outputDir, normalizedRelativePath), normalized);
      normalizedUnitRefs.push({
        id: normalized.id,
        kind: normalized.kind,
        title: normalized.title,
        source: normalizedRelativePath,
      });
    }
  }

  const normalizedAssets = normalizeAssets(assetDocument);
  const normalizedCourse = normalizeCourse(courseDocument, normalizedUnitRefs, sourceManifest);

  writeJson(path.join(outputDir, 'course.json'), normalizedCourse);
  writeJson(path.join(outputDir, 'assets.json'), {
    schemaVersion: SCHEMA_VERSION,
    total: normalizedAssets.length,
    assets: normalizedAssets,
  });
  writeJson(path.join(outputDir, 'normalization-manifest.json'), {
    normalizerVersion: NORMALIZER_VERSION,
    schemaVersion: SCHEMA_VERSION,
    schemaStatus: 'draft-rise-informed',
    normalizedAt: new Date().toISOString(),
    source: {
      extractedCourseFolder: inputDir,
      sourceExport: sourceManifest?.source?.file || null,
      extractorVersion: sourceManifest?.extractorVersion || null,
    },
    output: {
      course: 'course.json',
      assets: 'assets.json',
      lessonsDirectory: 'lessons/',
      assessmentsDirectory: 'assessments/',
    },
    counts: {
      lessons: lessonCount,
      assessments: assessmentCount,
      blocks: blockCount,
      questions: questionCount,
      assets: normalizedAssets.length,
    },
    notes: [
      'This is a draft authoring-tool-neutral representation derived from a Rise export.',
      'Unknown or not-yet-normalized Rise data remains preserved under source/raw fields and in the original extracted project.',
      'The schema will be reviewed after Storyline web output is inspected.',
    ],
  });

  console.log('\nRISE NORMALIZER');
  console.log('===============');
  console.log(`Input: ${inputDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Lessons: ${lessonCount}`);
  console.log(`Assessments: ${assessmentCount}`);
  console.log(`Blocks: ${blockCount}`);
  console.log(`Questions: ${questionCount}`);
  console.log(`Assets: ${normalizedAssets.length}`);
  console.log(`Schema: ${SCHEMA_VERSION} (draft Rise-informed)\n`);
  console.log('Created:');
  console.log('  normalized/course.json');
  console.log('  normalized/lessons/');
  console.log('  normalized/assessments/');
  console.log('  normalized/assets.json');
  console.log('  normalized/normalization-manifest.json\n');
}

main();
