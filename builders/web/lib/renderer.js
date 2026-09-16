const path = require('path');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function assetUrl(assetId, assetMap, assetsAvailable) {
  if (!assetId || !assetsAvailable) return null;
  const asset = assetMap.get(assetId);
  if (!asset?.path) return null;
  const encoded = asset.path
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `assets/${encoded}`;
}

function textWithBreaks(text) {
  if (!text) return '';
  const parts = String(text).split(/\n{2,}/).filter(Boolean);
  return parts.map((part) => {
    const lines = part.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith('• '))) {
      return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function itemTitle(item, index) {
  return item?.heading || item?.title || item?.label || item?.name || `Item ${index + 1}`;
}

function itemBody(item) {
  return item?.paragraph || item?.body || item?.description || item?.text || item?.caption || '';
}

function renderText(block) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  if (!items.length) {
    const fallback = block?.content?.text || block?.content?.body || '';
    return `<div class="block block-text">${textWithBreaks(fallback)}</div>`;
  }

  return `<div class="block block-text ${escapeHtml(block.variant || '')}">
    ${items.map((item) => {
      const heading = item.heading ? `<h3>${escapeHtml(item.heading)}</h3>` : '';
      const body = item.paragraph || item.body || item.text || item.description || '';
      return `<div class="text-item">${heading}${textWithBreaks(body)}</div>`;
    }).join('')}
  </div>`;
}

function renderImage(block, assetMap, assetsAvailable) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  const figures = items.map((item, index) => {
    const media = item?.media?.image || {};
    const src = assetUrl(media.asset, assetMap, assetsAvailable);
    const alt = media.altText || item.altText || item.caption || itemTitle(item, index);
    const image = src
      ? `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">`
      : `<div class="media-placeholder"><span>Image</span><strong>${escapeHtml(media.fileName || 'Asset not copied')}</strong></div>`;
    return `<figure>${image}${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`;
  }).join('');

  return `<div class="block block-image gallery-${escapeHtml(block.variant || 'default')}">${figures}</div>`;
}

function firstMedia(block, kind) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  for (const item of items) {
    if (item?.media?.[kind]) return item.media[kind];
  }
  return null;
}

function renderAudio(block, assetMap, assetsAvailable) {
  const media = firstMedia(block, 'audio');
  if (!media) return '<div class="block media-placeholder">Audio block</div>';
  const src = assetUrl(media.asset, assetMap, assetsAvailable);
  return `<div class="block media-card">
    <div class="eyebrow">Audio</div>
    ${src ? `<audio controls preload="metadata" src="${src}"></audio>` : `<div class="media-placeholder"><strong>${escapeHtml(media.fileName || 'Audio asset not copied')}</strong></div>`}
    ${media.transcript ? `<details class="transcript"><summary>Transcript</summary>${textWithBreaks(media.transcript)}</details>` : ''}
  </div>`;
}

function renderVideo(block, assetMap, assetsAvailable) {
  const media = firstMedia(block, 'video');
  if (!media) return '<div class="block media-placeholder">Video block</div>';
  const src = assetUrl(media.asset, assetMap, assetsAvailable);
  return `<div class="block media-card">
    <div class="eyebrow">Video</div>
    ${src ? `<video controls preload="metadata" src="${src}"></video>` : `<div class="media-placeholder"><strong>${escapeHtml(media.fileName || 'Video asset not copied')}</strong></div>`}
    ${media.transcript ? `<details class="transcript"><summary>Transcript</summary>${textWithBreaks(media.transcript)}</details>` : ''}
  </div>`;
}

function renderAccordion(block) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  return `<div class="block interaction interaction-accordion">
    <div class="eyebrow">Interaction · Accordion</div>
    ${items.map((item, index) => `<details${index === 0 ? ' open' : ''}>
      <summary>${escapeHtml(itemTitle(item, index))}</summary>
      <div class="interaction-body">${textWithBreaks(itemBody(item))}</div>
    </details>`).join('')}
  </div>`;
}

function renderTabs(block, blockIndex) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  const group = `tabs-${blockIndex}-${slug(block.id, 'block')}`;
  return `<div class="block interaction interaction-tabs" data-tabs="${group}">
    <div class="eyebrow">Interaction · Tabs</div>
    <div class="tab-list" role="tablist">
      ${items.map((item, index) => `<button type="button" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" data-tab-target="${group}-${index}">${escapeHtml(itemTitle(item, index))}</button>`).join('')}
    </div>
    ${items.map((item, index) => `<section id="${group}-${index}" class="tab-panel${index === 0 ? ' active' : ''}" role="tabpanel">${textWithBreaks(itemBody(item))}</section>`).join('')}
  </div>`;
}

function renderGenericInteraction(block) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  return `<div class="block interaction interaction-generic">
    <div class="eyebrow">Interaction · ${escapeHtml(block.variant || block?.interaction?.component || 'Custom')}</div>
    ${items.length ? `<div class="interaction-grid">${items.map((item, index) => `<article><h4>${escapeHtml(itemTitle(item, index))}</h4>${textWithBreaks(itemBody(item))}</article>`).join('')}</div>` : '<p>Interaction data preserved and ready for a dedicated component renderer.</p>'}
  </div>`;
}

function renderInteraction(block, blockIndex) {
  const variant = String(block.variant || block?.interaction?.component || '').toLowerCase();
  if (variant.includes('accordion')) return renderAccordion(block);
  if (variant.includes('tab')) return renderTabs(block, blockIndex);
  return renderGenericInteraction(block);
}

function renderCustom(block) {
  return `<div class="block custom-block">
    <div class="eyebrow">Custom block · ${escapeHtml(block.variant || 'unmapped')}</div>
    <p>This content is preserved but does not have a dedicated web component yet.</p>
  </div>`;
}

function renderBlock(block, index, assetMap, assetsAvailable) {
  switch (block.kind) {
    case 'text': return renderText(block);
    case 'image': return renderImage(block, assetMap, assetsAvailable);
    case 'audio': return renderAudio(block, assetMap, assetsAvailable);
    case 'video': return renderVideo(block, assetMap, assetsAvailable);
    case 'interaction': return renderInteraction(block, index);
    case 'divider': return '<hr class="block divider">';
    case 'embed': return `<div class="block custom-block"><div class="eyebrow">Embed</div><p>Embed preserved for a future renderer.</p></div>`;
    default: return renderCustom(block);
  }
}

function renderLesson(lesson, assetMap, assetsAvailable) {
  const sectionId = `unit-${slug(lesson.id || lesson.title, 'lesson')}`;
  if (lesson.kind === 'section') {
    return `<section class="course-section section-divider" id="${sectionId}"><div class="section-number">Section</div><h2>${escapeHtml(lesson.title)}</h2>${lesson.description ? `<p>${escapeHtml(lesson.description)}</p>` : ''}</section>`;
  }
  return `<section class="course-section lesson" id="${sectionId}">
    <div class="section-number">Lesson ${escapeHtml(lesson?.metadata?.order || '')}</div>
    <h2>${escapeHtml(lesson.title)}</h2>
    ${lesson.description ? `<p class="lede">${escapeHtml(lesson.description)}</p>` : ''}
    <div class="blocks">${(lesson.blocks || []).map((block, index) => renderBlock(block, index, assetMap, assetsAvailable)).join('')}</div>
  </section>`;
}

function renderAssessment(assessment) {
  const sectionId = `unit-${slug(assessment.id || assessment.title, 'assessment')}`;
  return `<section class="course-section assessment" id="${sectionId}">
    <div class="section-number">Assessment</div>
    <h2>${escapeHtml(assessment.title)}</h2>
    ${assessment.description ? `<p class="lede">${escapeHtml(assessment.description)}</p>` : ''}
    <div class="questions">${(assessment.questions || []).map((question, index) => `<article class="question">
      <div class="eyebrow">Question ${index + 1} · ${escapeHtml(question.type)}</div>
      <h3>${escapeHtml(question.prompt || '')}</h3>
      <div class="answers">${(question.answers || []).map((answer) => `<div class="answer">${escapeHtml(answer.text || '')}</div>`).join('')}</div>
    </article>`).join('')}</div>
  </section>`;
}

function renderCourse({ course, units, assets, assetsAvailable }) {
  const assetMap = new Map((assets || []).map((asset) => [asset.id, asset]));
  const nav = units.map((unit) => {
    const data = unit.data;
    const anchor = `unit-${slug(data.id || data.title, unit.kind)}`;
    return `<a href="#${anchor}"><span>${unit.kind === 'assessment' ? 'Assessment' : data.kind === 'section' ? 'Section' : 'Lesson'}</span>${escapeHtml(data.title)}</a>`;
  }).join('');

  const body = units.map((unit) => unit.kind === 'assessment'
    ? renderAssessment(unit.data)
    : renderLesson(unit.data, assetMap, assetsAvailable)).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(course.title)}</title>
  <link rel="stylesheet" href="course.css">
</head>
<body>
  <div class="app-shell">
    <aside class="course-nav">
      <div class="brand">Learning Experience Engine</div>
      <h1>${escapeHtml(course.title)}</h1>
      ${course.description ? `<p>${escapeHtml(course.description)}</p>` : ''}
      <nav>${nav}</nav>
    </aside>
    <main>
      <header class="course-hero">
        <div class="eyebrow">Web Preview · Schema ${escapeHtml(course.schemaVersion || '')}</div>
        <h1>${escapeHtml(course.title)}</h1>
        <p>This preview was generated from normalized course JSON.</p>
        ${!assetsAvailable ? '<div class="notice">Media files were not copied into the extracted project yet, so media placeholders are shown.</div>' : ''}
      </header>
      ${body}
    </main>
  </div>
  <script src="course.js"></script>
</body>
</html>`;
}

module.exports = { renderCourse };
