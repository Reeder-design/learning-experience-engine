(() => {
  const GENERIC_TEXT = /^(rectangle|oval|group|no image|rectangular hotspot|background)(\s+\d+)?(\.(png|jpg|jpeg|svg))?$/i;

  const state = {
    cleanup: [],
    currentType: null,
    context: null,
    visitedHotspots: new Set(),
    carouselPage: 0,
  };

  function onCleanup(fn) {
    state.cleanup.push(fn);
  }

  function clear() {
    for (const fn of state.cleanup.splice(0)) {
      try { fn(); } catch (_) {}
    }
    document.querySelectorAll('.lx-component-overlay').forEach((node) => node.remove());
    state.currentType = null;
    state.context = null;
    state.visitedHotspots.clear();
  }

  function flattenObjects(objects, output = []) {
    for (const object of objects || []) {
      output.push(object);
      flattenObjects(object.children, output);
    }
    return output;
  }

  function flattenActions(actions, output = []) {
    for (const action of actions || []) {
      if (!action) continue;
      output.push(action);
      flattenActions(action.then, output);
      flattenActions(action.else, output);
    }
    return output;
  }

  function objectActions(object) {
    const actions = [];
    for (const event of object?.events || []) flattenActions(event.actions, actions);
    return actions;
  }

  function layerText(layer) {
    return flattenObjects(layer?.objects || [])
      .map((object) => String(object.text || '').trim())
      .filter((text) => text && !GENERIC_TEXT.test(text));
  }

  function accessibleLayerLabel(layer) {
    const candidates = layerText(layer);
    return candidates.find((text) => text.length <= 64 && !/^(back|continue|next|previous|start over)$/i.test(text))
      || candidates[0]
      || layer?.title
      || 'Explore item';
  }

  function findLayerShowTarget(object) {
    return objectActions(object).find((action) => action.type === 'layer.show')?.target || null;
  }

  function detectCarousel(ctx) {
    const base = ctx.slide?.layers?.find((layer) => layer.kind === 'base');
    if (!base) return null;
    const canvasWidth = Number(ctx.slide.canvas?.width || 1024);
    const candidates = flattenObjects(base.objects || []).filter((object) => {
      const children = object.children || [];
      const imageChildren = children.filter((child) => (child.assets || []).length > 0);
      return object.kind === 'objgroup'
        && imageChildren.length >= 4
        && Number(object.bounds?.width || 0) > canvasWidth * 1.35;
    });
    if (!candidates.length) return null;
    const group = candidates.sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0))[0];
    const items = (group.children || []).filter((child) => (child.assets || []).length > 0);
    const indicatorLayers = Math.max(0, (ctx.slide.layers?.length || 1) - 1);
    const inferredPageSize = indicatorLayers > 1 && items.length % indicatorLayers === 0
      ? items.length / indicatorLayers
      : Math.min(3, items.length);
    return { group, items, pageSize: Math.max(1, inferredPageSize) };
  }

  function detectHotspotReveal(ctx) {
    const base = ctx.slide?.layers?.find((layer) => layer.kind === 'base');
    if (!base) return null;
    const hotspots = flattenObjects(base.objects || [])
      .map((object) => ({ object, target: findLayerShowTarget(object) }))
      .filter((item) => item.target);
    return hotspots.length >= 3 ? { hotspots } : null;
  }

  function detectAssessment(ctx) {
    if (ctx.slide?.interaction?.nativeAssessment) return { native: true };
    const base = ctx.slide?.layers?.find((layer) => layer.kind === 'base');
    const texts = layerText(base);
    const hasQuestion = texts.some((text) => /\?$/.test(text) || /^(what|which|how|select|choose)\b/i.test(text));
    const interactive = flattenObjects(base?.objects || []).filter((object) => objectActions(object).length > 0);
    if (hasQuestion && interactive.length >= 2) return { native: false };
    return null;
  }

  function detectMedia(ctx) {
    const base = ctx.slide?.layers?.find((layer) => layer.kind === 'base');
    if (!base) return null;
    const mediaObjects = flattenObjects(base.objects || []).filter((object) =>
      (object.assets || []).some((id) => ['video', 'audio'].includes(ctx.assetMap?.get(id)?.kind))
    );
    return mediaObjects.length ? { mediaObjects } : null;
  }

  function classify(ctx) {
    const carousel = detectCarousel(ctx);
    if (carousel) return { type: 'carousel', data: carousel };
    const hotspots = detectHotspotReveal(ctx);
    if (hotspots) return { type: 'hotspot-reveal', data: hotspots };
    const assessment = detectAssessment(ctx);
    if (assessment) return { type: 'assessment', data: assessment };
    const media = detectMedia(ctx);
    if (media) return { type: 'media-presentation', data: media };
    if (ctx.slide?.interaction?.layered || ctx.slide?.interaction?.variableDriven) return { type: 'stateful', data: {} };
    return { type: 'slide', data: {} };
  }

  function makeOverlay(stage, className) {
    const overlay = document.createElement('div');
    overlay.className = `lx-component-overlay ${className}`;
    stage.appendChild(overlay);
    return overlay;
  }

  function enhanceCarousel(ctx, detection) {
    const { group, items, pageSize } = detection;
    const groupElement = ctx.objectEls.get(group.id);
    if (groupElement) groupElement.style.visibility = 'hidden';

    const base = ctx.slide.layers.find((layer) => layer.kind === 'base');
    for (const object of flattenObjects(base?.objects || [])) {
      if (/arrow icon/i.test(String(object.text || ''))) {
        const element = ctx.objectEls.get(object.id);
        if (element) element.style.visibility = 'hidden';
      }
    }

    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const authorVars = ctx.variables || {};
    const moveVariable = Object.keys(authorVars).find((name) => /^(move|page|index)/i.test(name));
    state.carouselPage = Math.max(0, Math.min(pageCount - 1, Number(authorVars[moveVariable] || 0)));

    const overlay = makeOverlay(ctx.stage, 'lx-carousel-component');
    const viewport = document.createElement('div');
    viewport.className = 'lx-carousel-viewport';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'lx-carousel-arrow previous';
    previous.setAttribute('aria-label', 'Previous carousel page');
    previous.textContent = '‹';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'lx-carousel-arrow next';
    next.setAttribute('aria-label', 'Next carousel page');
    next.textContent = '›';
    const cards = document.createElement('div');
    cards.className = 'lx-carousel-cards';
    const footer = document.createElement('div');
    footer.className = 'lx-carousel-footer';
    const count = document.createElement('span');
    count.className = 'lx-carousel-count';
    const dots = document.createElement('div');
    dots.className = 'lx-carousel-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Carousel pages');
    footer.append(count, dots);
    viewport.append(previous, cards, next, footer);
    overlay.append(viewport);

    function render() {
      cards.innerHTML = '';
      dots.innerHTML = '';
      const start = state.carouselPage * pageSize;
      const visible = items.slice(start, start + pageSize);
      for (const [index, item] of visible.entries()) {
        const figure = document.createElement('figure');
        figure.className = 'lx-carousel-card';
        const src = item.assets?.[0] ? ctx.assetUrl(item.assets[0]) : null;
        if (src) {
          const image = document.createElement('img');
          image.src = src;
          image.alt = item.accessibility?.altText || item.text || `Carousel item ${start + index + 1}`;
          figure.appendChild(image);
        }
        const label = document.createElement('figcaption');
        label.textContent = `${start + index + 1}`;
        figure.appendChild(label);
        cards.appendChild(figure);
      }
      count.textContent = `Page ${state.carouselPage + 1} of ${pageCount}`;
      previous.disabled = state.carouselPage === 0;
      next.disabled = state.carouselPage === pageCount - 1;
      for (let page = 0; page < pageCount; page += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = page === state.carouselPage ? 'active' : '';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', page === state.carouselPage ? 'true' : 'false');
        dot.setAttribute('aria-label', `Go to carousel page ${page + 1}`);
        dot.addEventListener('click', () => setPage(page));
        dots.appendChild(dot);
      }
    }

    function setPage(page) {
      state.carouselPage = Math.max(0, Math.min(pageCount - 1, page));
      if (moveVariable && ctx.setVariable) ctx.setVariable(moveVariable, 'set', state.carouselPage);
      render();
    }

    previous.addEventListener('click', () => setPage(state.carouselPage - 1));
    next.addEventListener('click', () => setPage(state.carouselPage + 1));
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') setPage(state.carouselPage - 1);
      if (event.key === 'ArrowRight') setPage(state.carouselPage + 1);
    });

    render();
  }

  function enhanceHotspots(ctx, detection) {
    const overlay = makeOverlay(ctx.stage, 'lx-hotspot-status');
    const status = document.createElement('div');
    status.className = 'lx-hotspot-progress';
    overlay.appendChild(status);

    function updateStatus() {
      status.innerHTML = `<strong>Explore the map</strong><span>${state.visitedHotspots.size} of ${detection.hotspots.length} locations viewed</span>`;
    }

    detection.hotspots.forEach(({ object, target }, index) => {
      const element = ctx.objectEls.get(object.id);
      const targetId = ctx.cleanRef(target);
      const layer = ctx.slide.layers.find((candidate) => candidate.id === targetId);
      if (!element) return;
      const label = accessibleLayerLabel(layer);
      element.classList.add('lx-enhanced-hotspot');
      element.textContent = String(index + 1);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', `Explore ${label}`);
      element.dataset.hotspotLabel = label;
      const visit = () => {
        state.visitedHotspots.add(object.id);
        element.classList.add('visited');
        updateStatus();
      };
      element.addEventListener('click', visit);
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
    });

    for (const layer of ctx.slide.layers || []) {
      if (layer.kind === 'base') continue;
      const element = ctx.layerEls.get(layer.id);
      if (!element) continue;
      element.classList.add('lx-hotspot-detail-layer');
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'lx-layer-close';
      close.setAttribute('aria-label', `Close ${accessibleLayerLabel(layer)}`);
      close.textContent = '×';
      close.addEventListener('click', () => element.classList.remove('active'));
      element.appendChild(close);
    }

    updateStatus();
  }

  function enhanceAssessment(ctx) {
    const overlay = makeOverlay(ctx.stage, 'lx-assessment-status');
    const assessmentSlides = (ctx.slideOrder || []).filter((item) => item.slide?.interaction?.nativeAssessment);
    const assessmentIndex = assessmentSlides.findIndex((item) => item.slide?.id === ctx.slide.id);
    const label = document.createElement('div');
    label.className = 'lx-assessment-pill';
    const scoreKey = Object.keys(ctx.variables || {}).find((name) => /^score$/i.test(name));
    const score = scoreKey ? ctx.variables[scoreKey] : null;
    label.innerHTML = `<strong>Assessment</strong>${assessmentIndex >= 0 ? `<span>Question ${assessmentIndex + 1} of ${assessmentSlides.length}</span>` : ''}${score != null ? `<span data-lx-score>Score: ${score}</span>` : ''}`;
    overlay.appendChild(label);

    const base = ctx.slide.layers.find((layer) => layer.kind === 'base');
    for (const object of flattenObjects(base?.objects || [])) {
      const element = ctx.objectEls.get(object.id);
      if (!element) continue;
      const interactive = objectActions(object).some((action) => ['condition', 'variable.adjust', 'layer.show', 'assessment.submit'].includes(action.type));
      const text = String(object.text || '').trim();
      if (interactive && text && !/^(back|continue|next|previous|start over)$/i.test(text) && text.length > 2) {
        element.classList.add('lx-answer-choice');
      }
    }

    for (const layer of ctx.slide.layers || []) {
      if (layer.kind === 'base') continue;
      const text = layerText(layer).join(' ').toLowerCase();
      const element = ctx.layerEls.get(layer.id);
      if (!element) continue;
      if (/\bcorrect\b/.test(text) && !/\bincorrect\b/.test(text)) element.classList.add('lx-feedback-correct');
      if (/\bincorrect\b/.test(text)) element.classList.add('lx-feedback-incorrect');
    }
  }

  function enhanceMedia(ctx, detection) {
    const objects = detection.mediaObjects || [];
    const mediaEntries = objects.map((object, index) => ({
      object,
      element: ctx.objectEls.get(object.id),
      media: ctx.objectEls.get(object.id)?.querySelector('video,audio'),
      index,
    })).filter((entry) => entry.element && entry.media);
    if (!mediaEntries.length) return;

    for (const entry of mediaEntries) entry.element.classList.add('lx-media-object');
    if (mediaEntries.length === 1) return;

    const overlay = makeOverlay(ctx.stage, 'lx-media-status');
    const controls = document.createElement('div');
    controls.className = 'lx-media-chapters';
    const label = document.createElement('strong');
    label.textContent = 'Media segments';
    const buttons = document.createElement('div');
    buttons.className = 'lx-media-chapter-buttons';
    controls.append(label, buttons);
    overlay.appendChild(controls);

    let active = 0;
    function select(index, autoplay = false) {
      active = Math.max(0, Math.min(mediaEntries.length - 1, index));
      mediaEntries.forEach((entry, entryIndex) => {
        const selected = entryIndex === active;
        entry.element.style.display = selected ? '' : 'none';
        if (!selected) entry.media.pause?.();
      });
      [...buttons.querySelectorAll('button')].forEach((button, buttonIndex) => {
        const selected = buttonIndex === active;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-current', selected ? 'true' : 'false');
      });
      if (autoplay) mediaEntries[active].media.play?.();
    }

    mediaEntries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Segment ${index + 1}`;
      button.setAttribute('aria-label', `Show media segment ${index + 1}`);
      button.addEventListener('click', () => select(index, true));
      buttons.appendChild(button);
    });

    select(0);
  }

  function enhance(ctx) {
    clear();
    state.context = ctx;
    const classification = classify(ctx);
    state.currentType = classification.type;
    ctx.stage.dataset.componentType = classification.type;
    if (classification.type === 'carousel') enhanceCarousel(ctx, classification.data);
    if (classification.type === 'hotspot-reveal') enhanceHotspots(ctx, classification.data);
    if (classification.type === 'assessment') enhanceAssessment(ctx, classification.data);
    if (classification.type === 'media-presentation') enhanceMedia(ctx, classification.data);
    return classification.type;
  }

  function onVariableChange(name, value) {
    if (state.currentType !== 'assessment') return;
    if (!/^score$/i.test(String(name))) return;
    const host = document.querySelector('[data-lx-score]');
    if (host) host.textContent = `Score: ${value}`;
  }

  window.LXComponents = { classify, enhance, clear, onVariableChange };
})();
