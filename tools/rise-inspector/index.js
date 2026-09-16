#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readZip } = require('./lib/zip-reader');
const { decodeRuntimeData } = require('./lib/decoder');
const { analyzeCourse } = require('./lib/analyzer');
const { formatReport } = require('./lib/reporter');

function printUsage() {
  console.log(`\nRise Inspector v0.1\n\nUsage:\n  node tools/rise-inspector/index.js <path-to-rise-export.zip> [--json]\n\nExample:\n  node tools/rise-inspector/index.js ../learning-content-private/references/rise-exports/course.zip\n`);
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const inputPath = args.find((arg) => !arg.startsWith('--'));

  if (!inputPath || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(inputPath ? 0 : 1);
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nError: file not found\n${resolvedPath}\n`);
    process.exit(1);
  }

  if (path.extname(resolvedPath).toLowerCase() !== '.zip') {
    console.error('\nError: Rise Inspector currently expects a published Rise .zip export.\n');
    process.exit(1);
  }

  let archive;
  try {
    archive = readZip(resolvedPath);
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
    const runtimeSource = archive.readEntry(runtimeEntry).toString('utf8');
    runtimeData = decodeRuntimeData(runtimeSource);
  } catch (error) {
    console.error(`\nError: runtime-data.js could not be decoded.\n${error.message}\n`);
    process.exit(1);
  }

  const assetPaths = archive.entries
    .filter((entry) => !entry.isDirectory && /(^|\/)assets\//i.test(entry.fileName))
    .map((entry) => entry.fileName);

  const result = analyzeCourse(runtimeData, assetPaths, {
    sourceFile: path.basename(resolvedPath),
    runtimePath: runtimeEntry.fileName,
  });

  console.log(jsonMode ? JSON.stringify(result, null, 2) : formatReport(result));
}

main();
