const path = require('path');

const SCHEMA_VERSION = '0.1';
const NORMALIZER_VERSION = '0.2.0';

function slug(value, fallback = 'item') {
  const result = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return result || fallback;
}

function nonEmptyId(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function decodeEntities(value) {
  if (typeof value !== 'string') return value;
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', bull: '•', copy: '©', reg: '®', trade: '™',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const raw = hex ? entity.slice(2) : entity.slice(1);
      const code = Number.parseInt(raw, hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function htmlToText(value) {
  if (typeof value !== 'string') return value;
  return decodeEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n• ')
      .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' '),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeHtml(value) {
  return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);
}

function cleanRichFields(object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return object;
  const cleaned = {};
  const richText = {};

  for (const [key, value] of Object.entries(object)) {
    if (key === 'media') continue;
    if (typeof value === 'string' && looksLikeHtml(value)) {
      cleaned[key] = htmlToText(value);
      richText[`${key}Html`] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((entry) => (
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? cleanRichFields(entry)
          : entry
      ));
    } else if (value && typeof value === 'object') {
      cleaned[key] = cleanRichFields(value);
    } else {
      cleaned[key] = value;
    }
  }

  if (Object.keys(richText).length) cleaned.richText = richText;
  return cleaned;
}

function safeDecode(value) {
  let current = String(value || '');
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function assetToken(value) {
  if (!value) return '';
  return path.posix.basename(safeDecode(String(value).replace(/\\/g, '/'))).toLowerCase();
}

function buildAssetLookup(normalizedAssets = []) {
  const lookup = new Map();
  for (const asset of normalizedAssets) {
    const candidates = [asset.path, asset.fileName, asset.source?.raw?.sourcePath, asset.source?.raw?.relativePath];
    for (const candidate of candidates) {
      const token = assetToken(candidate);
      if (token && !lookup.has(token)) lookup.set(token, asset);
    }
  }
  return lookup;
}

function mediaCandidates(media) {
  const candidates = [];
  const visit = (value, key = '') => {
    if (typeof value === 'string') {
      if (/^(key|url|src|originalurl|crushedkey|thumbnail|poster)$/i.test(key)) candidates.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, key));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [nestedKey, nestedValue] of Object.entries(value)) visit(nestedValue, nestedKey);
    }
  };
  visit(media);
  return [...new Set(candidates.filter(Boolean))];
}

function resolveMediaAsset(media, assetLookup) {
  if (!media || !assetLookup) return null;
  for (const candidate of mediaCandidates(media)) {
    const match = assetLookup.get(assetToken(candidate));
    if (match) return match;
  }
  return null;
}

function mediaDescriptor(media, assetLookup) {
  if (!media || typeof media !== 'object') return null;
  const type = media.type || null;
  const matched = resolveMediaAsset(media, assetLookup);
  const candidate = media.url || media.crushedKey || media.originalUrl || media.key || null;
  const descriptor = {
    kind: type,
    asset: matched?.id || null,
    fileName: matched?.fileName || (candidate ? path.posix.basename(safeDecode(candidate)) : null),
  };

  if (typeof media.duration === 'number') descriptor.durationSeconds = media.duration;
  if (typeof media.transcript === 'string' && media.transcript.trim()) descriptor.transcript = media.transcript.trim();
  if (typeof media.alt === 'string' && media.alt.trim()) descriptor.altText = media.alt.trim();
  if (typeof media.altText === 'string' && media.altText.trim()) descriptor.altText = media.altText.trim();
  return descriptor;
}

function normalizeItem(item, assetLookup) {
  if (!item || typeof item !== 'object') return item;
  const cleaned = cleanRichFields(item);
  const mediaRoot = item.media || null;
  if (!mediaRoot || typeof mediaRoot !== 'object') return cleaned;

  const media = {};
  for (const [kind, value] of Object.entries(mediaRoot)) {
    media[kind] = mediaDescriptor(value, assetLookup);
  }
  cleaned.media = media;
  return cleaned;
}

function collectResolvedAssetIds(value, assetLookup, refs = new Set()) {
  if (!value) return refs;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectResolvedAssetIds(entry, assetLookup, refs));
    return refs;
  }
  if (value && typeof value === 'object') {
    if (value.media && typeof value.media === 'object') {
      for (const mediaValue of Object.values(value.media)) {
        const matched = resolveMediaAsset(mediaValue, assetLookup);
        if (matched?.id) refs.add(matched.id);
      }
    }
    for (const nested of Object.values(value)) collectResolvedAssetIds(nested, assetLookup, refs);
  }
  return refs;
}

function normalizeBlockKind(item) {
  const type = String(item?.type || '').toLowerCase();
  const family = String(item?.family || '').toLowerCase();
  const variant = String(item?.variant || '').toLowerCase();

  if (type === 'text' || family === 'text' || type === 'impact') return 'text';
  if (type === 'image' || family === 'gallery' || family === 'image') return 'image';
  if (variant === 'video' || type === 'video') return 'video';
  if (variant === 'audio' || type === 'audio') return 'audio';
  if (type === 'multimedia' && family === 'multimedia') {
    if (variant.includes('video')) return 'video';
    if (variant.includes('audio')) return 'audio';
    return 'embed';
  }
  if (type === 'interactive' || family.startsWith('interactive')) return 'interaction';
  if (type === 'divider' || family === 'divider') return 'divider';
  if (type === 'embed' || family === 'embed') return 'embed';
  if (type === 'custom' || family === 'mondrian') return 'custom';
  return 'custom';
}

function normalizeBlock(item, index, sourceFile, assetLookup) {
  const kind = normalizeBlockKind(item);
  const sourceVariant = item?.variant || null;
  const fallbackId = `block-${String(index + 1).padStart(2, '0')}`;
  const id = nonEmptyId(item?.id, fallbackId);
  const assetRefs = [...collectResolvedAssetIds(item, assetLookup)];
  const content = {};

  if (Array.isArray(item?.items)) content.items = item.items.map((entry) => normalizeItem(entry, assetLookup));
  const directFields = [
    'text', 'body', 'html', 'caption', 'description', 'label', 'heading', 'subheading',
    'prompt', 'quote', 'attribution', 'url', 'src',
  ];
  for (const key of directFields) {
    if (item?.[key] === undefined) continue;
    if (typeof item[key] === 'string' && looksLikeHtml(item[key])) {
      content[key] = htmlToText(item[key]);
      content.richText = content.richText || {};
      content.richText[`${key}Html`] = item[key];
    } else {
      content[key] = item[key];
    }
  }

  if (item?.media && typeof item.media === 'object') {
    content.media = {};
    for (const [mediaKind, mediaValue] of Object.entries(item.media)) {
      content.media[mediaKind] = mediaDescriptor(mediaValue, assetLookup);
    }
  }

  const block = {
    id,
    kind,
    variant: sourceVariant,
    title: item?.title ? htmlToText(item.title) : null,
    content: Object.keys(content).length ? content : null,
    assets: assetRefs,
    metadata: {},
    source: {
      platform: 'rise',
      type: item?.type ?? null,
      family: item?.family ?? null,
      variant: sourceVariant,
      rawRef: `${sourceFile}#/items/${index}`,
    },
  };

  if (kind === 'interaction') {
    block.interaction = {
      component: sourceVariant || item?.family || item?.type || 'interaction',
      completion: null,
    };
  }

  return block;
}

function normalizeLesson(document, order, sourceFile, normalizedAssets = []) {
  const sourceType = String(document?.type || '').toLowerCase();
  const kind = sourceType === 'section' ? 'section' : 'lesson';
  const id = nonEmptyId(document?.id, `lesson-${String(order).padStart(2, '0')}`);
  const items = Array.isArray(document?.items) ? document.items : [];
  const assetLookup = buildAssetLookup(normalizedAssets);

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    title: document?.title || `Lesson ${order}`,
    kind,
    description: document?.description ? htmlToText(document.description) : null,
    objectives: [],
    metadata: {
      order,
      sourceType: document?.type || null,
    },
    source: {
      platform: 'rise',
      sourceFile,
      sourceId: document?.id || null,
    },
    blocks: kind === 'section'
      ? []
      : items.map((item, index) => normalizeBlock(item, index, sourceFile, assetLookup)),
  };
}

function normalizeQuestionType(value) {
  const type = String(value || '').toUpperCase();
  const map = {
    MULTIPLE_CHOICE: 'multiple-choice',
    MULTIPLE_RESPONSE: 'multiple-response',
    TRUE_FALSE: 'true-false',
    MATCHING: 'matching',
    SEQUENCE: 'sequence',
    FILL_IN: 'fill-in',
    FILL_IN_THE_BLANK: 'fill-in',
    FREE_RESPONSE: 'free-response',
    SHORT_ANSWER: 'free-response',
  };
  return map[type] || 'custom';
}

function answerText(answer) {
  if (answer == null) return '';
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') return String(answer);
  const value = answer.text ?? answer.label ?? answer.title ?? answer.value ?? answer.body ?? '';
  return typeof value === 'string' ? htmlToText(value) : value;
}

function normalizeQuestion(question, index, sourceFile) {
  const fallbackId = `question-${String(index + 1).padStart(2, '0')}`;
  const id = nonEmptyId(question?.id, fallbackId);
  const rawCorrect = question?.correct;
  const correctIds = new Set(
    Array.isArray(rawCorrect)
      ? rawCorrect.map(String)
      : rawCorrect == null
        ? []
        : [String(rawCorrect)],
  );
  const rawAnswers = Array.isArray(question?.answers) ? question.answers : [];

  const answers = rawAnswers.map((answer, answerIndex) => {
    const answerId = nonEmptyId(answer?.id, `answer-${answerIndex + 1}`);
    return {
      id: answerId,
      text: answerText(answer),
      correct: answer?.correct === true || correctIds.has(String(answerId)),
    };
  });

  const rawPrompt = question?.title ?? question?.prompt ?? question?.question ?? question?.text ?? '';
  return {
    id,
    type: normalizeQuestionType(question?.type),
    prompt: typeof rawPrompt === 'string' ? htmlToText(rawPrompt) : rawPrompt,
    answers,
    feedback: question?.feedback ?? null,
    points: typeof question?.points === 'number' ? question.points : null,
    metadata: {},
    source: {
      platform: 'rise',
      sourceType: question?.type || null,
      rawRef: `${sourceFile}#/items/${index}`,
    },
  };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null) ?? null;
}

function normalizeAssessment(document, order, sourceFile) {
  const id = nonEmptyId(document?.id, `assessment-${String(order).padStart(2, '0')}`);
  const settings = document?.settings || {};
  const questions = Array.isArray(document?.items) ? document.items : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    title: document?.title || `Assessment ${order}`,
    description: document?.description ? htmlToText(document.description) : null,
    passingScore: firstDefined(document?.passingScore, settings?.passingScore, settings?.passingPercent),
    attemptsAllowed: firstDefined(document?.attemptsAllowed, settings?.attemptsAllowed, settings?.attempts),
    randomize: firstDefined(document?.randomize, settings?.randomize),
    metadata: {
      order,
      sourceType: document?.type || null,
    },
    source: {
      platform: 'rise',
      sourceFile,
      sourceId: document?.id || null,
    },
    questions: questions.map((question, index) => normalizeQuestion(question, index, sourceFile)),
  };
}

function mimeFromExtension(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.vtt': 'text/vtt', '.srt': 'application/x-subrip', '.pdf': 'application/pdf',
  };
  return types[ext] || null;
}

function normalizeAssets(assetDocument) {
  const assets = Array.isArray(assetDocument?.assets) ? assetDocument.assets : [];
  return assets.map((asset, index) => ({
    id: `${String(index + 1).padStart(3, '0')}-${slug(asset.relativePath || asset.sourcePath, 'asset')}`,
    kind: ['image', 'audio', 'video', 'caption', 'document', 'font'].includes(asset.kind) ? asset.kind : 'other',
    path: asset.relativePath || asset.sourcePath || `asset-${index + 1}`,
    fileName: path.basename(asset.relativePath || asset.sourcePath || '') || null,
    mimeType: mimeFromExtension(asset.relativePath || asset.sourcePath),
    bytes: Number.isInteger(asset.bytes) ? asset.bytes : null,
    altText: null,
    transcript: null,
    captions: [],
    metadata: {
      compressedBytes: asset.compressedBytes ?? null,
      copied: assetDocument?.copied ?? false,
    },
    source: {
      platform: 'rise',
      raw: asset,
    },
  }));
}

function normalizeCourse(courseDocument, unitRefs, sourceManifest) {
  const id = nonEmptyId(courseDocument?.id || courseDocument?.sourceCourseId, 'course');
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    title: courseDocument?.title || 'Untitled course',
    description: courseDocument?.description ? htmlToText(courseDocument.description) : null,
    audience: [],
    objectives: [],
    metadata: {
      author: courseDocument?.author || null,
      createdAt: courseDocument?.createdAt || null,
      updatedAt: courseDocument?.updatedAt || null,
      lastPublishedAt: courseDocument?.lastPublishedAt || null,
      normalizedBy: `rise-normalizer@${NORMALIZER_VERSION}`,
      schemaStatus: 'draft-rise-informed',
    },
    source: {
      platform: 'rise-published-web',
      sourceId: courseDocument?.sourceCourseId || courseDocument?.id || null,
      sourceFile: sourceManifest?.source?.file || null,
    },
    theme: courseDocument?.theme || {},
    navigation: courseDocument?.navigation || {},
    units: unitRefs,
    assets: 'assets.json',
  };
}

module.exports = {
  SCHEMA_VERSION,
  NORMALIZER_VERSION,
  normalizeLesson,
  normalizeAssessment,
  normalizeAssets,
  normalizeCourse,
};
