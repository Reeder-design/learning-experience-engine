const path = require("path");

const { readZipBuffer } = require("../tools/rise-inspector/lib/zip-reader");
const { extractGlobalProvideData } = require("../tools/storyline-inspector");

const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
const MAX_ENTRY_COUNT = 10000;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const MAX_PREVIEW_ASSET_BYTES = 3 * 1024 * 1024;
const MAX_PREVIEW_ASSET_TOTAL_BYTES = 12 * 1024 * 1024;

function cleanText(value) {
  if (value == null) return "";
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function safeSlug(value, fallback) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function isMacMetadata(fileName) {
  return fileName.startsWith("__MACOSX/")
    || fileName.split("/").some((part) => part.startsWith("._"))
    || fileName.endsWith("/.DS_Store");
}

function archiveRoot(entries) {
  const files = entries.filter((entry) => !entry.isDirectory && !isMacMetadata(entry.fileName));
  if (!files.length) return "";
  const parts = files.map((entry) => entry.fileName.split("/")[0]);
  return parts.every((part) => part === parts[0]) ? parts[0] : "";
}

function relativeEntry(entryMap, root, relativePath) {
  return entryMap.get(relativePath) || (root ? entryMap.get(`${root}/${relativePath}`) : null);
}

function assetKind(asset = {}) {
  const url = String(asset.url || "").toLowerCase().split("?")[0];
  const extension = path.extname(url);
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"].includes(extension) || asset.imageType) return "image";
  if (extension === ".m3u8" || asset.videoType === "hls") return "hls";
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(extension) || asset.videoType) return "video";
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg"].includes(extension) || asset.audioType) return "audio";
  if ([".vtt", ".srt"].includes(extension)) return "caption";
  return "other";
}

function assetMime(fileName) {
  const extension = path.extname(String(fileName || "").split("?")[0]).toLowerCase();
  const types = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".gif":"image/gif", ".webp":"image/webp", ".svg":"image/svg+xml", ".bmp":"image/bmp", ".mp4":"video/mp4", ".webm":"video/webm", ".mp3":"audio/mpeg", ".wav":"audio/wav", ".m4a":"audio/mp4", ".ogg":"audio/ogg" };
  return types[extension] || null;
}

function readableObjectText(object = {}) {
  const candidates = [
    object.data?.textdata?.altText,
    object.data?.vectorData?.altText,
    object.textLib?.[0]?.vartext,
    object.textLib?.[0]?.vectortext?.altText,
    object.altText,
    object.title,
  ];
  return candidates.map(cleanText).find(Boolean) || "";
}

function countActions(value) {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((total, item) => total + countActions(item), 0);
  const direct = Array.isArray(value.actions) ? value.actions.length : 0;
  return direct + Object.values(value).reduce((total, item) => total + (item === value.actions ? 0 : countActions(item)), 0);
}

function collectAssetIds(value, found = new Set()) {
  if (value == null) return found;
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetIds(item, found));
    return found;
  }
  if (typeof value !== "object") return found;
  if (Object.prototype.hasOwnProperty.call(value, "assetId") && Number.isFinite(Number(value.assetId))) found.add(Number(value.assetId));
  Object.values(value).forEach((item) => collectAssetIds(item, found));
  return found;
}

function normalizeObject(object, index, assetLookup) {
  const sourceAssetIds = [...collectAssetIds(object)];
  return {
    id: object?.id || `object-${index + 1}`,
    kind: object?.kind || "object",
    title: readableObjectText(object),
    bounds: {
      x: object?.xPos ?? 0,
      y: object?.yPos ?? 0,
      width: object?.width ?? 0,
      height: object?.height ?? 0,
    },
    accessibility: {
      altText: readableObjectText(object),
      tabEnabled: object?.tabEnabled ?? null,
    },
    states: (object?.states || []).map((state) => ({ id: state.id || state.name || null, name: state.name || state.id || null })),
    assets: sourceAssetIds.map((id) => assetLookup.get(id)?.id).filter(Boolean),
    source: { platform:"storyline", sourceKind:object?.kind || null },
  };
}

function normalizeLayer(layer, index, sourceFile, assetLookup) {
  const id = layer?.id || `layer-${index + 1}`;
  const objects = (layer?.objects || []).map((object, objectIndex) => normalizeObject(object, objectIndex, assetLookup));
  return {
    id,
    title: cleanText(layer?.name || layer?.title) || (layer?.isBaseLayer ? "Base layer" : `Layer ${index + 1}`),
    kind: layer?.isBaseLayer ? "base" : "layer",
    objects,
    metadata: {
      durationMs: layer?.timeline?.duration ?? null,
      pauseParent: layer?.pauseParent ?? null,
      modal: layer?.modal ?? null,
      actionCount: countActions(layer?.events) + countActions(layer?.actionGroups) + countActions(layer?.timeline?.events),
    },
    source: { platform:"storyline", sourceFile, rawRef:`${sourceFile}#/slideLayers/${index}` },
  };
}

function normalizeSlide(raw, ref, sceneIndex, slideIndex, assetLookup) {
  const sourceFile = ref.html5url || null;
  const layers = raw ? (raw.slideLayers || []).map((layer, index) => normalizeLayer(layer, index, sourceFile, assetLookup)) : [];
  const objectCount = layers.reduce((total, layer) => total + layer.objects.length, 0);
  const stateCount = layers.reduce((total, layer) => total + layer.objects.reduce((subtotal, object) => subtotal + object.states.length, 0), 0);
  return {
    id: raw?.id || ref.id || `scene-${sceneIndex + 1}-slide-${slideIndex + 1}`,
    title: cleanText(raw?.title || ref.title) || `Slide ${slideIndex + 1}`,
    kind: "slide",
    canvas: { width: raw?.width ?? null, height: raw?.height ?? null },
    layers,
    metadata: {
      parseStatus: raw ? "parsed" : "metadata-only",
      transition: raw?.transition || null,
      resume: raw?.resume ?? null,
      objectCount,
      stateCount,
      actionCount: countActions(raw?.events) + countActions(raw?.actionGroups) + layers.reduce((total, layer) => total + layer.metadata.actionCount, 0),
    },
    source: { platform:"storyline", sourceFile, sourceId:raw?.id || ref.id || null, lmsId:raw?.lmsId || ref.lmsId || null },
  };
}

function buildStorylineProject(data, archive, sourceName, root, courseCover = null) {
  const userScenes = (data.scenes || []).filter((scene) => !scene.isMessageScene);
  const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
  const assets = (data.assetLib || []).map((asset, index) => ({
    id: `storyline-asset-${String(asset.id ?? index + 1).padStart(3, "0")}`,
    sourceId:asset.id ?? index + 1,
    kind: assetKind(asset),
    path: asset.url || null,
    bytes: asset.fileSize ?? null,
  }));
  const assetLookup = new Map(assets.map((asset) => [Number(asset.sourceId), asset]));
  let parsedSlides = 0;
  let layers = 0;
  let objects = 0;
  let actions = 0;
  const scenes = userScenes.map((scene, sceneIndex) => {
    const slides = (scene.slides || []).map((ref, slideIndex) => {
      let raw = null;
      if (ref.html5url) {
        const entry = relativeEntry(entryMap, root, ref.html5url);
        if (entry) {
          try { raw = extractGlobalProvideData(archive.readEntry(entry).toString("utf8"), "slide").value; } catch (_) { raw = null; }
        }
      }
      const normalized = normalizeSlide(raw, ref, sceneIndex, slideIndex, assetLookup);
      if (raw) parsedSlides += 1;
      layers += normalized.layers.length;
      objects += normalized.metadata.objectCount;
      actions += normalized.metadata.actionCount;
      return normalized;
    });
    return {
      id: scene.id || `scene-${sceneIndex + 1}`,
      title: cleanText(scene.lmsId || scene.title) || `Scene ${scene.sceneNumber || sceneIndex + 1}`,
      kind: "scene",
      order: scene.sceneNumber || sceneIndex + 1,
      slides,
      source: { platform:"storyline", sourceId:scene.id || null, lmsId:scene.lmsId || null },
    };
  });
  const projectTitle = cleanText(data.title) || path.basename(sourceName, path.extname(sourceName)) || "Imported Storyline experience";
  return {
    schemaVersion: "0.1",
    id: safeSlug(data.projectId || projectTitle, "storyline-experience"),
    title: projectTitle,
    type: "storyline-experience",
    description: "",
    instruction: "Review scenes, slides, layers, and exposed learner-facing text before exporting or reusing this normalized draft.",
    content: { scenes },
    metadata: {
      workbenchVersion: "0.4",
      import: {
        sourceFormat:"storyline-published-web",
        sourceFile:sourceName,
        sourceProjectId:data.projectId || null,
        importedAt:new Date().toISOString(),
        sourceFidelity:"normalized-draft",
        reviewRequired:true,
      },
      assetManifest:assets,
      courseCover,
      variables:(data.variables || []).map((variable) => ({ name:variable.name || null, type:variable.type || null, initialValue:variable.value ?? null })),
      importSummary:{ scenes:scenes.length, slides:scenes.reduce((total, scene) => total + scene.slides.length, 0), parsedSlides, layers, objects, actions, assets:assets.length },
    },
  };
}

function findCourseCover(archive, root) {
  const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
  const candidates = ["story_content/thumbnail.jpg", "story_content/thumbnail.jpeg", "story_content/thumbnail.png"];
  for (const candidate of candidates) {
    const entry = relativeEntry(entryMap, root, candidate);
    if (entry && assetMime(candidate)) return { id:"storyline-course-cover", kind:"image", path:candidate, bytes:entry.uncompressedSize || null };
  }
  return null;
}

function previewAssets(archive, root, assets, courseCover = null) {
  const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
  const included = [];
  let total = 0;
  for (const asset of [...(courseCover ? [courseCover] : []), ...assets]) {
    if (!["image", "audio", "video"].includes(asset.kind) || !asset.path || !assetMime(asset.path)) continue;
    const entry = relativeEntry(entryMap, root, asset.path) || archive.entries.find((item) => !item.isDirectory && item.fileName.endsWith(`/${asset.path}`));
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

function importStorylineArchive(buffer, sourceName = "storyline-web.zip") {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Choose a Storyline published-web ZIP export to import.");
  if (buffer.length > MAX_ARCHIVE_BYTES) throw new Error("That ZIP is too large for the current private Workbench import limit.");
  if (path.extname(sourceName).toLowerCase() !== ".zip") throw new Error("Storyline import expects a published Storyline .zip export.");
  const archive = readZipBuffer(buffer);
  if (archive.entries.length > MAX_ENTRY_COUNT) throw new Error("That ZIP contains too many files to inspect safely.");
  const uncompressedBytes = archive.entries.reduce((total, entry) => total + Number(entry.uncompressedSize || 0), 0);
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error("That ZIP expands beyond the current safe import limit.");
  const root = archiveRoot(archive.entries);
  const entryMap = new Map(archive.entries.map((entry) => [entry.fileName, entry]));
  const dataEntry = relativeEntry(entryMap, root, "html5/data/js/data.js");
  if (!dataEntry) throw new Error("html5/data/js/data.js was not found. Choose a published Storyline web export, not a .story authoring file.");
  const data = extractGlobalProvideData(archive.readEntry(dataEntry).toString("utf8"), "data").value;
  const courseCover = findCourseCover(archive, root);
  const project = buildStorylineProject(data, archive, path.basename(sourceName), root, courseCover);
  const assets = previewAssets(archive, root, project.metadata.assetManifest || [], courseCover);
  project.metadata.importSummary.previewAssets = assets.length;
  return { project, previewAssets:assets, mediaStreams:mediaStreams(project.metadata.assetManifest || []), mediaArchive:archive, mediaRoot:root };
}

module.exports = { importStorylineArchive, buildStorylineProject, MAX_ARCHIVE_BYTES };
