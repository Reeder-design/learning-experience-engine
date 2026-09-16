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

function icon(theme, key, className = 'block-icon') {
  const id = theme?.icons?.[key] || theme?.icons?.custom || 'icon-learning-design';
  return `<span class="${escapeHtml(className)}" aria-hidden="true"><svg><use href="icons.svg#${escapeHtml(id)}"></use></svg></span>`;
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

function blockHeading(theme, key, label) {
  return `<div class="block-heading">${icon(theme, key)}<span class="block-label">${escapeHtml(label)}</span></div>`;
}

function renderText(block, theme) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  if (!items.length) {
    const fallback = block?.content?.text || block?.content?.body || '';
    return `<article class="block block-text">${textWithBreaks(fallback)}</article>`;
  }

  return `<article class="block block-text ${escapeHtml(block.variant || '')}">
    ${items.map((item) => {
      const heading = item.heading ? `<h3>${escapeHtml(item.heading)}</h3>` : '';
      const body = item.paragraph || item.body || item.text || item.description || '';
      return `<div class="text-item">${heading}${textWithBreaks(body)}</div>`;
    }).join('')}
  </article>`;
}

function renderImage(block, assetMap, assetsAvailable, theme) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  const figures = items.map((item, index) => {
    const media = item?.media?.image || {};
    const src = assetUrl(media.asset, assetMap, assetsAvailable);
    const alt = media.altText || item.altText || item.caption || itemTitle(item, index);
    const image = src
      ? `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">`
      : `<div class="media-placeholder">${icon(theme, 'image', 'placeholder-icon')}<strong>${escapeHtml(media.fileName || 'Image asset')}</strong><span>Media will appear when assets are copied.</span></div>`;
    return `<figure>${image}${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}</figure>`;
  }).join('');

  return `<article class="block image-card">${blockHeading(theme, 'image', 'Visual')}<div class="block-image gallery-${escapeHtml(block.variant || 'default')}">${figures}</div></article>`;
}

function firstMedia(block, kind) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  for (const item of items) {
    if (item?.media?.[kind]) return item.media[kind];
  }
  return null;
}

function renderAudio(block, assetMap, assetsAvailable, theme) {
  const media = firstMedia(block, 'audio');
  if (!media) return `<article class="block media-card">${blockHeading(theme, 'audio', 'Audio')}<div class="media-placeholder">Audio block</div></article>`;
  const src = assetUrl(media.asset, assetMap, assetsAvailable);
  return `<article class="block media-card">
    ${blockHeading(theme, 'audio', 'Listen')}
    ${src ? `<audio controls preload="metadata" src="${src}"></audio>` : `<div class="media-placeholder">${icon(theme, 'audio', 'placeholder-icon')}<strong>${escapeHtml(media.fileName || 'Audio asset')}</strong><span>Audio will appear when media assets are copied.</span></div>`}
    ${media.transcript ? `<details class="transcript"><summary>Read transcript</summary><div class="transcript-body">${textWithBreaks(media.transcript)}</div></details>` : ''}
  </article>`;
}

function renderVideo(block, assetMap, assetsAvailable, theme) {
  const media = firstMedia(block, 'video');
  if (!media) return `<article class="block media-card">${blockHeading(theme, 'video', 'Video')}<div class="media-placeholder">Video block</div></article>`;
  const src = assetUrl(media.asset, assetMap, assetsAvailable);
  return `<article class="block media-card">
    ${blockHeading(theme, 'video', 'Watch')}
    ${src ? `<video controls preload="metadata" src="${src}"></video>` : `<div class="media-placeholder">${icon(theme, 'video', 'placeholder-icon')}<strong>${escapeHtml(media.fileName || 'Video asset')}</strong><span>Video will appear when media assets are copied.</span></div>`}
    ${media.transcript ? `<details class="transcript"><summary>Read transcript</summary><div class="transcript-body">${textWithBreaks(media.transcript)}</div></details>` : ''}
  </article>`;
}

function renderAccordion(block, theme) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  return `<article class="block interaction interaction-accordion">
    ${blockHeading(theme, 'interaction', 'Explore · Accordion')}
    <div class="interaction-instruction">Select each topic to reveal more information.</div>
    <div class="accordion-list">${items.map((item, index) => `<details>
      <summary><span>${escapeHtml(itemTitle(item, index))}</span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="interaction-body">${textWithBreaks(itemBody(item))}</div>
    </details>`).join('')}</div>
  </article>`;
}

function renderTabs(block, blockIndex, theme) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  const group = `tabs-${blockIndex}-${slug(block.id, 'block')}`;
  return `<article class="block interaction interaction-tabs" data-tabs="${group}">
    ${blockHeading(theme, 'interaction', 'Explore · Tabs')}
    <div class="interaction-instruction">Choose a tab to compare the information.</div>
    <div class="tab-list" role="tablist" aria-label="Learning topics">
      ${items.map((item, index) => `<button type="button" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" aria-controls="${group}-${index}" data-tab-target="${group}-${index}">${escapeHtml(itemTitle(item, index))}</button>`).join('')}
    </div>
    ${items.map((item, index) => `<section id="${group}-${index}" class="tab-panel${index === 0 ? ' active' : ''}" role="tabpanel">${textWithBreaks(itemBody(item))}</section>`).join('')}
  </article>`;
}

function renderGenericInteraction(block, theme) {
  const items = Array.isArray(block?.content?.items) ? block.content.items : [];
  return `<article class="block interaction interaction-generic">
    ${blockHeading(theme, 'interaction', `Explore · ${block.variant || block?.interaction?.component || 'Interaction'}`)}
    ${items.length ? `<div class="interaction-grid">${items.map((item, index) => `<article><h4>${escapeHtml(itemTitle(item, index))}</h4>${textWithBreaks(itemBody(item))}</article>`).join('')}</div>` : '<p>Interaction data is preserved and ready for a dedicated component renderer.</p>'}
  </article>`;
}

function renderInteraction(block, blockIndex, theme) {
  const variant = String(block.variant || block?.interaction?.component || '').toLowerCase();
  if (variant.includes('accordion')) return renderAccordion(block, theme);
  if (variant.includes('tab')) return renderTabs(block, blockIndex, theme);
  return renderGenericInteraction(block, theme);
}

function renderCustom(block, theme) {
  return `<article class="block custom-block">
    ${blockHeading(theme, 'custom', `Custom · ${block.variant || 'Unmapped'}`)}
    <p>This source content is preserved. A dedicated Learning Experience Engine component can replace this placeholder.</p>
  </article>`;
}

function renderBlock(block, index, assetMap, assetsAvailable, theme) {
  switch (block.kind) {
    case 'text': return renderText(block, theme);
    case 'image': return renderImage(block, assetMap, assetsAvailable, theme);
    case 'audio': return renderAudio(block, assetMap, assetsAvailable, theme);
    case 'video': return renderVideo(block, assetMap, assetsAvailable, theme);
    case 'interaction': return renderInteraction(block, index, theme);
    case 'divider': return '<hr class="block divider">';
    case 'embed': return `<article class="block custom-block">${blockHeading(theme, 'custom', 'Embedded content')}<p>Embed preserved for a future renderer.</p></article>`;
    default: return renderCustom(block, theme);
  }
}

function unitIconKey(unitKind, data) {
  if (unitKind === 'assessment') return 'assessment';
  if (data?.kind === 'section') return 'section';
  return 'lesson';
}

function unitLabel(unitKind, data) {
  if (unitKind === 'assessment') return 'Assessment';
  if (data?.kind === 'section') return 'Section';
  return `Lesson ${data?.metadata?.order || ''}`.trim();
}

function renderUnitHeader(data, unitKind, theme) {
  const key = unitIconKey(unitKind, data);
  return `<header class="unit-header">
    ${icon(theme, key, 'unit-icon')}
    <div><div class="section-number">${escapeHtml(unitLabel(unitKind, data))}</div><h2>${escapeHtml(data.title)}</h2>${data.description ? `<p class="lede">${escapeHtml(data.description)}</p>` : ''}</div>
  </header>`;
}

function renderUnitFooter(nextUnit, theme) {
  if (!nextUnit) return `<footer class="unit-footer course-complete">${icon(theme, 'feedback', 'unit-icon')}<div><span class="section-number">Course preview complete</span><strong>You reached the end of this learning path.</strong></div><a class="pill-link" href="#course-start">Back to top ↑</a></footer>`;
  const next = nextUnit.data;
  const anchor = `unit-${slug(next.id || next.title, nextUnit.kind)}`;
  return `<footer class="unit-footer"><div><span class="section-number">Continue</span><strong>${escapeHtml(next.title)}</strong></div><a class="unit-next primary-action" href="#${anchor}">Next ${icon(theme, unitIconKey(nextUnit.kind, next), 'inline-icon')}</a></footer>`;
}

function renderLesson(lesson, assetMap, assetsAvailable, theme, nextUnit) {
  const sectionId = `unit-${slug(lesson.id || lesson.title, 'lesson')}`;
  if (lesson.kind === 'section') {
    return `<section class="course-section section-divider observed-unit" id="${sectionId}" data-unit><div class="section-callout">${renderUnitHeader(lesson, 'section', theme)}${renderUnitFooter(nextUnit, theme)}</div></section>`;
  }
  return `<section class="course-section lesson observed-unit" id="${sectionId}" data-unit>
    ${renderUnitHeader(lesson, 'lesson', theme)}
    <div class="blocks">${(lesson.blocks || []).map((block, index) => renderBlock(block, index, assetMap, assetsAvailable, theme)).join('')}</div>
    ${renderUnitFooter(nextUnit, theme)}
  </section>`;
}

function renderAssessment(assessment, theme, nextUnit) {
  const sectionId = `unit-${slug(assessment.id || assessment.title, 'assessment')}`;
  return `<section class="course-section assessment observed-unit" id="${sectionId}" data-unit>
    ${renderUnitHeader(assessment, 'assessment', theme)}
    <div class="assessment-intro">${icon(theme, 'assessment', 'block-icon')}<p>This preview shows the imported assessment structure. Scoring behavior comes next in the assessment component layer.</p></div>
    <div class="questions">${(assessment.questions || []).map((question, index) => `<article class="question">
      <div class="question-meta"><span>Question ${index + 1}</span><span>${escapeHtml(question.type)}</span></div>
      <h3>${escapeHtml(question.prompt || '')}</h3>
      <div class="answers">${(question.answers || []).map((answer) => `<div class="answer"><span class="choice-dot" aria-hidden="true"></span>${escapeHtml(answer.text || '')}</div>`).join('')}</div>
    </article>`).join('')}</div>
    ${renderUnitFooter(nextUnit, theme)}
  </section>`;
}

function renderHero(theme, course, firstAnchor, assetsAvailable) {
  return `<header class="course-hero" id="course-start">
    <div class="hero-grid">
      <div class="hero-copy">
        <div class="eyebrow">Learning Experience</div>
        <h1>${escapeHtml(course.title)}</h1>
        ${course.description ? `<p class="hero-lede">${escapeHtml(course.description)}</p>` : '<p class="hero-lede">A structured learning experience generated from reusable course content.</p>'}
        <div class="hero-actions"><a class="primary-action" href="#${firstAnchor}">Start learning →</a><span class="hero-meta">${escapeHtml(String(course.units?.length || 0))} learning units</span></div>
        ${!assetsAvailable ? '<div class="notice"><strong>Preview mode:</strong> media files have not been copied yet, so polished placeholders are shown in their place.</div>' : ''}
      </div>
      <div class="hero-visual" aria-hidden="true">
        <span class="visual-ring"></span>
        ${icon(theme, 'course', 'hero-icon visual-core')}
        ${icon(theme, 'multimedia', 'hero-icon visual-node node-a')}
        ${icon(theme, 'interaction', 'hero-icon visual-node node-b')}
        ${icon(theme, 'assessment', 'hero-icon visual-node node-c')}
        ${icon(theme, 'analytics', 'hero-icon visual-node node-d')}
      </div>
    </div>
  </header>`;
}

function renderCourse({ course, units, assets, assetsAvailable, theme = {} }) {
  const assetMap = new Map((assets || []).map((asset) => [asset.id, asset]));
  const first = units[0]?.data;
  const firstAnchor = first ? `unit-${slug(first.id || first.title, units[0].kind)}` : 'course-start';

  const nav = units.map((unit, index) => {
    const data = unit.data;
    const anchor = `unit-${slug(data.id || data.title, unit.kind)}`;
    const key = unitIconKey(unit.kind, data);
    return `<a href="#${anchor}" data-nav-unit="${anchor}"${index === 0 ? ' class="active"' : ''}>${icon(theme, key, 'nav-icon')}<span class="nav-copy"><small>${escapeHtml(unitLabel(unit.kind, data))}</small><strong>${escapeHtml(data.title)}</strong></span><span class="nav-status" aria-hidden="true">○</span></a>`;
  }).join('');

  const body = units.map((unit, index) => {
    const nextUnit = units[index + 1] || null;
    return unit.kind === 'assessment'
      ? renderAssessment(unit.data, theme, nextUnit)
      : renderLesson(unit.data, assetMap, assetsAvailable, theme, nextUnit);
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#4A4238">
  <title>${escapeHtml(course.title)}</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="stylesheet" href="course.css">
  <link rel="stylesheet" href="theme.css">
</head>
<body>
  <a class="skip-link" href="#course-start">Skip to course content</a>
  <header class="mobile-header"><div class="mobile-brand">${icon(theme, 'course', 'brand-mark')}<span>${escapeHtml(course.title)}</span></div><button class="menu-button" type="button" aria-expanded="false" aria-controls="course-navigation">Contents</button></header>
  <div class="app-shell">
    <aside class="course-nav" id="course-navigation">
      <div class="nav-brand">${icon(theme, 'course', 'brand-mark')}<div><div class="brand">Learning Experience</div><strong>${escapeHtml(course.title)}</strong></div></div>
      <div class="nav-progress"><div class="progress-copy"><span>Course progress</span><strong data-progress-label>0%</strong></div><div class="progress-track"><span class="progress-fill" data-progress-fill></span></div></div>
      <nav aria-label="Course contents">${nav}</nav>
      <div class="nav-footer"><span>Built with</span><strong>Learning Experience Engine</strong></div>
    </aside>
    <main>
      ${renderHero(theme, course, firstAnchor, assetsAvailable)}
      <div class="course-content">${body}</div>
      <footer class="course-footer"><span>Learning Experience Engine</span><a href="#course-start">Back to top ↑</a></footer>
    </main>
  </div>
  <div class="nav-scrim" data-nav-scrim></div>
  <script src="course.js"></script>
</body>
</html>`;
}

module.exports = { renderCourse };
