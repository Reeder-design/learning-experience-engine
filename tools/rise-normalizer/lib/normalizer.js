const path = require('path');

const SCHEMA_VERSION = '0.1';
const NORMALIZER_VERSION = '0.1.0';

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

function pickContent(item) {
  const keys = [
    'text', 'body', 'html', 'content', 'items', 'caption', 'description',
    'media', 'image', 'video', 'audio', 'url', 'src', 'alt', 'altText',
    'label', 'heading', 'subheading', 'prompt', 'quote', 'attribution',
  ];
  const content = {};
  for (const key of keys) {
    if (item[key] !== undefined) content[key] = item[key];
  }
  return Object.keys(content).length ? content : null;
}

function collectAssetRefs(value, refs = new Set()) {
  if (typeof value === 'string') {
    const normalized = value.replace(/\\/g, '/');
    const assetMatch = normalized.match(/(?:^|\/)assets\/(.+?)(?:[?#].*)?$/i);
    if (assetMatch) refs.add(assetMatch[1]);
    return refs;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAssetRefs(item, refs);
    return refs;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectAssetRefs(nested, refs);
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

function normalizeBlock(item, index) {
  const kind = normalizeBlockKind(item);
  const sourceVariant = item?.variant || null;
  const fallbackId = `block-${String(index + 1).padStart(2, '0')}`;
  const id = nonEmptyId(item?.id, fallbackId);
  const assetRefs = [...collectAssetRefs(item)];

  const block = {
    id,
    kind,
    variant: sourceVariant,
    title: item?.title ?? null,
    content: pickContent(item),
    assets: assetRefs,
    metadata: {},
    source: {
      platform: 'rise',
      type: item?.type ?? null,
      family: item?.family ?? null,
      variant: sourceVariant,
      raw: item,
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

function normalizeLesson(document, order, sourceFile) {
  const sourceType = String(document?.type || '').toLowerCase();
  const kind = sourceType === 'section' ? 'section' : 'lesson';
  const id = nonEmptyId(document?.id, `lesson-${String(order).padStart(2, '0')}`);
  const items = Array.isArray(document?.items) ? document.items : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    title: document?.title || `Lesson ${order}`,
    kind,
    description: document?.description || null,
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
    blocks: kind === 'section' ? [] : items.map(normalizeBlock),
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
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
    return String(answer);
  }
  return answer.text ?? answer.label ?? answer.title ?? answer.value ?? answer.body ?? '';
}

function normalizeQuestion(question, index) {
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
      source: answer,
    };
  });

  return {
    id,
    type: normalizeQuestionType(question?.type),
    prompt: question?.title ?? question?.prompt ?? question?.question ?? question?.text ?? '',
    answers,
    feedback: question?.feedback ?? null,
    points: typeof question?.points === 'number' ? question.points : null,
    metadata: {},
    source: {
      platform: 'rise',
      sourceType: question?.type || null,
      raw: question,
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
    description: document?.description || null,
    passingScore: firstDefined(
      document?.passingScore,
      settings?.passingScore,
      settings?.passingPercent,
    ),
    attemptsAllowed: firstDefined(
      document?.attemptsAllowed,
      settings?.attemptsAllowed,
      settings?.attempts,
    ),
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
    questions: questions.map(normalizeQuestion),
  };
}

function mimeFromExtension(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.vtt': 'text/vtt', '.srt': 'application/x-subrip',
    '.pdf': 'application/pdf',
  };
  return types[ext] || null;
}

function normalizeAssets(assetDocument) {
  const assets = Array.isArray(assetDocument?.assets) ? assetDocument.assets : [];
  return assets.map((asset, index) => ({
    id: `${String(index + 1).padStart(3, '0')}-${slug(asset.relativePath || asset.sourcePath, 'asset')}`,
    kind: ['image', 'audio', 'video', 'caption', 'document', 'font'].includes(asset.kind)
      ? asset.kind
      : 'other',
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
    description: courseDocument?.description || null,
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
