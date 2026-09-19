const path = require("path");

const { readZipBuffer } = require("../tools/rise-inspector/lib/zip-reader");
const { decodeRuntimeData } = require("../tools/rise-inspector/lib/decoder");
const { normalizeAssets, normalizeAssessment, normalizeLesson } = require("../tools/rise-normalizer/lib/normalizer");

const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
const MAX_ENTRY_COUNT = 10000;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const MAX_PREVIEW_ASSET_BYTES = 3 * 1024 * 1024;
const MAX_PREVIEW_ASSET_TOTAL_BYTES = 12 * 1024 * 1024;

function safeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function isMacMetadata(fileName) {
  return fileName.startsWith("__MACOSX/")
    || fileName.split("/").some((part) => part.startsWith("._"))
    || fileName.split("/").includes(".DS_Store");
}

function assetKind(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"].includes(extension)) return "image";
  if (extension === ".m3u8") return "hls";
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(extension)) return "video";
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg"].includes(extension)) return "audio";
  if ([".vtt", ".srt"].includes(extension)) return "caption";
  return "other";
}

function assetMime(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const types = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".gif":"image/gif", ".webp":"image/webp", ".svg":"image/svg+xml", ".avif":"image/avif", ".mp4":"video/mp4", ".webm":"video/webm", ".mp3":"audio/mpeg", ".wav":"audio/wav", ".m4a":"audio/mp4", ".ogg":"audio/ogg" };
  return types[extension] || null;
}

function relativeAssetPath(fileName) {
  const matched = String(fileName).replace(/\\/g, "/").match(/(?:^|\/)assets\/(.+)$/i);
  return matched ? matched[1] : path.posix.basename(fileName);
}

function countKinds(items) {
  return items.reduce((counts, item) => {
    counts[item.kind] = (counts[item.kind] || 0) + 1;
    return counts;
  }, {});
}

function normalizeProjectTitle(title) {
  return safeText(title, "Imported Rise course").slice(0, 180);
}

function buildRiseCourse(runtimeData, archive, sourceName) {
  const course = runtimeData.course || {};
  const courseTitle = normalizeProjectTitle(course.title);
  const assetManifest = archive.entries
    .filter((entry) => !entry.isDirectory && !isMacMetadata(entry.fileName) && /(^|\/)assets\//i.test(entry.fileName))
    .map((entry) => ({
      sourcePath: entry.fileName,
      relativePath: relativeAssetPath(entry.fileName),
      kind: assetKind(entry.fileName),
      bytes: entry.uncompressedSize,
    }));
  const assets = normalizeAssets({ assets: assetManifest });
  const sourceLessons = Array.isArray(course.lessons) ? course.lessons : [];
  let assessmentCount = 0;
  let blockCount = 0;

  const lessons = sourceLessons.map((lesson, index) => {
    const order = index + 1;
    const sourceFile = `${lesson.type === "quiz" ? "assessments" : "lessons"}/${String(order).padStart(2, "0")}-${safeText(lesson.id, `lesson-${order}`)}.json`;
    const normalizedDocument = {
      id: lesson.id || null,
      title: lesson.title || `Lesson ${order}`,
      description: lesson.description || "",
      type: lesson.type || "unknown",
      settings: lesson.settings || {},
      media: lesson.media || null,
      metadata: lesson.metadata || null,
      items: Array.isArray(lesson.items) ? lesson.items : [],
    };
    if (lesson.type === "quiz") {
      assessmentCount += 1;
      return { kind: "assessment", ...normalizeAssessment(normalizedDocument, order, sourceFile) };
    }
    const normalized = normalizeLesson(normalizedDocument, order, sourceFile, assets);
    blockCount += normalized.blocks.length;
    return normalized;
  });

  return {
    schemaVersion: "0.1",
    id: "rise-course",
    title: courseTitle,
    type: "rise-course",
    description: safeText(course.description),
    instruction: "Review each lesson and block, then refine the learner-facing content before exporting.",
    content: { lessons },
    metadata: {
      workbenchVersion: "0.4",
      import: {
        sourceFormat: "rise-published-web",
        sourceFile: sourceName,
        sourceCourseId: course.id || null,
        importedAt: new Date().toISOString(),
        sourceFidelity: "normalized-draft",
        reviewRequired: true,
      },
      assetManifest: assets,
      importSummary: {
        lessons: lessons.filter((lesson) => lesson.kind !== "assessment").length,
        assessments: assessmentCount,
        blocks: blockCount,
        assets: assets.length,
        assetKinds: countKinds(assets),
      },
    },
  };
}

function previewAssets(archive, assets) {
  const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
  const included = [];
  let total = 0;
  for (const asset of assets) {
    if (!["image", "audio", "video"].includes(asset.kind) || !asset.path || !assetMime(asset.path)) continue;
    const entry = entryMap.get(`assets/${asset.path}`) || entryMap.get(asset.path) || archive.entries.find((item) => !item.isDirectory && item.fileName.endsWith(`/assets/${asset.path}`));
    if (!entry || entry.uncompressedSize > MAX_PREVIEW_ASSET_BYTES || total + entry.uncompressedSize > MAX_PREVIEW_ASSET_TOTAL_BYTES) continue;
    const bytes = archive.readEntry(entry);
    total += bytes.length;
    included.push({ id:asset.id, path:asset.path, kind:asset.kind, dataUrl:`data:${assetMime(asset.path)};base64,${bytes.toString("base64")}` });
  }
  return included;
}

function mediaStreams(assets) {
  return assets.filter((asset) => asset.kind === "hls" && asset.path).map((asset) => ({
    assetId:asset.id,
    kind:"hls",
    path:asset.path,
    bundleRoot:path.posix.dirname(asset.path),
  }));
}

function importRiseArchive(buffer, sourceName = "rise-export.zip") {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Choose a Rise published-web ZIP export to import.");
  if (buffer.length > MAX_ARCHIVE_BYTES) throw new Error("That ZIP is too large for an in-browser Workbench import. Keep the archive under 30 MB for now.");
  if (path.extname(sourceName).toLowerCase() !== ".zip") throw new Error("Rise import expects a published Rise .zip export.");

  const archive = readZipBuffer(buffer);
  if (archive.entries.length > MAX_ENTRY_COUNT) throw new Error("That ZIP contains too many files to inspect safely.");
  const uncompressedBytes = archive.entries.reduce((total, entry) => total + Number(entry.uncompressedSize || 0), 0);
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error("That ZIP expands beyond the current safe import limit.");

  const runtimeEntry = archive.entries.find((entry) => entry.fileName === "content/runtime-data.js")
    || archive.entries.find((entry) => /(^|\/)runtime-data\.js$/i.test(entry.fileName));
  if (!runtimeEntry) throw new Error("runtime-data.js was not found. Choose a published Rise web export, not a Rise authoring file.");

  const runtimeData = decodeRuntimeData(archive.readEntry(runtimeEntry).toString("utf8"));
  const project = buildRiseCourse(runtimeData, archive, path.basename(sourceName));
  const assets = previewAssets(archive, project.metadata.assetManifest || []);
  project.metadata.importSummary.previewAssets = assets.length;
  return { project, previewAssets:assets, mediaStreams:mediaStreams(project.metadata.assetManifest || []), mediaArchive:archive, mediaRoot:"" };
}

module.exports = { importRiseArchive, buildRiseCourse, MAX_ARCHIVE_BYTES };
