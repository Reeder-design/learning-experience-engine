(() => {
  const component = window.__LX_COMPONENT__;
  if (!component) return;

  const stage = document.querySelector('[data-component-stage]');
  const status = document.querySelector('[data-component-status]');
  const badge = document.querySelector('[data-completion-badge]');
  const visited = new Set();
  let complete = false;

  function asset(src) {
    if (!src) return null;
    return component._assetMap?.[src] || src;
  }

  function setStatus(message) {
    if (status) status.textContent = message || '';
  }

  function markComplete(message = 'Complete') {
    if (complete) return;
    complete = true;
    badge.textContent = 'Complete ✓';
    badge.classList.add('complete');
    setStatus(message);
    window.dispatchEvent(new CustomEvent('lx:component-complete', { detail: { id: component.id, type: component.type } }));
  }

  function completionStrategy(defaultValue) {
    return component.completion?.strategy || defaultValue;
  }

  function placeholder(label) {
    const el = document.createElement('div');
    el.className = 'asset-placeholder';
    el.innerHTML = `<span>${label}</span>`;
    return el;
  }

  function renderCarousel() {
    const items = component.content.items || [];
    const pageSize = Math.max(1, Number(component.content.pageSize || 3));
    const pageCount = Math.ceil(items.length / pageSize);
    let page = 0;

    const wrap = document.createElement('div');
    wrap.className = 'native-carousel';
    const previous = document.createElement('button');
    previous.className = 'native-arrow';
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous page');
    previous.textContent = '‹';
    const cards = document.createElement('div');
    cards.className = 'native-carousel-cards';
    const next = document.createElement('button');
    next.className = 'native-arrow';
    next.type = 'button';
    next.setAttribute('aria-label', 'Next page');
    next.textContent = '›';
    const footer = document.createElement('div');
    footer.className = 'native-carousel-footer';
    const count = document.createElement('span');
    const dots = document.createElement('div');
    dots.className = 'native-dots';
    footer.append(count, dots);
    wrap.append(previous, cards, next, footer);
    stage.appendChild(wrap);

    function recordVisible() {
      const start = page * pageSize;
      items.slice(start, start + pageSize).forEach((item) => visited.add(item.id));
      if (completionStrategy('view-all') === 'view-all' && visited.size >= items.length) {
        markComplete('All carousel items viewed.');
      }
    }

    function render() {
      cards.innerHTML = '';
      dots.innerHTML = '';
      const start = page * pageSize;
      for (const item of items.slice(start, start + pageSize)) {
        const card = document.createElement('article');
        card.className = 'native-card';
        if (item.image) {
          const img = document.createElement('img');
          img.src = asset(item.image);
          img.alt = item.alt || item.title || '';
          card.appendChild(img);
        } else {
          card.appendChild(placeholder('Visual'));
        }
        const body = document.createElement('div');
        body.className = 'native-card-body';
        if (item.title) {
          const h = document.createElement('h3');
          h.textContent = item.title;
          body.appendChild(h);
        }
        if (item.body) {
          const p = document.createElement('p');
          p.textContent = item.body;
          body.appendChild(p);
        }
        card.appendChild(body);
        cards.appendChild(card);
      }
      count.textContent = `Page ${page + 1} of ${pageCount}`;
      previous.disabled = page === 0;
      next.disabled = page === pageCount - 1;
      for (let i = 0; i < pageCount; i += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = i === page ? 'active' : '';
        dot.setAttribute('aria-label', `Go to page ${i + 1}`);
        dot.setAttribute('aria-current', i === page ? 'true' : 'false');
        dot.addEventListener('click', () => { page = i; render(); });
        dots.appendChild(dot);
      }
      recordVisible();
    }

    previous.addEventListener('click', () => { page = Math.max(0, page - 1); render(); });
    next.addEventListener('click', () => { page = Math.min(pageCount - 1, page + 1); render(); });
    wrap.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { page = Math.max(0, page - 1); render(); }
      if (event.key === 'ArrowRight') { page = Math.min(pageCount - 1, page + 1); render(); }
    });
    render();
  }

  function renderHotspots() {
    const hotspots = component.content.hotspots || [];
    const wrap = document.createElement('div');
    wrap.className = 'native-hotspot-wrap';
    const visual = document.createElement('div');
    visual.className = 'native-hotspot-visual';
    const bg = component.content.background?.image;
    if (bg) {
      const img = document.createElement('img');
      img.src = asset(bg);
      img.alt = component.content.background?.alt || '';
      visual.appendChild(img);
    } else {
      visual.appendChild(placeholder('Background visual'));
    }
    const panel = document.createElement('aside');
    panel.className = 'native-reveal-panel';
    panel.innerHTML = '<div class="empty-state"><strong>Select a hotspot</strong><span>Explore the visual to reveal details.</span></div>';
    wrap.append(visual, panel);
    stage.appendChild(wrap);

    function showHotspot(hotspot, button) {
      visited.add(hotspot.id);
      visual.querySelectorAll('.native-hotspot').forEach((node) => node.classList.remove('active'));
      button.classList.add('active', 'visited');
      panel.innerHTML = '';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'panel-eyebrow';
      eyebrow.textContent = hotspot.label;
      const h = document.createElement('h3');
      h.textContent = hotspot.title || hotspot.label;
      panel.append(eyebrow, h);
      if (hotspot.image) {
        const img = document.createElement('img');
        img.src = asset(hotspot.image);
        img.alt = hotspot.title || hotspot.label;
        panel.appendChild(img);
      }
      if (hotspot.body) {
        const p = document.createElement('p');
        p.textContent = hotspot.body;
        panel.appendChild(p);
      }
      setStatus(`${visited.size} of ${hotspots.length} hotspots viewed.`);
      if (completionStrategy('view-all') === 'view-all' && visited.size >= hotspots.length) {
        markComplete('All hotspots explored.');
      }
    }

    hotspots.forEach((hotspot, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'native-hotspot';
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `Explore ${hotspot.label}`);
      button.addEventListener('click', () => showHotspot(hotspot, button));
      visual.appendChild(button);
    });
    setStatus(`0 of ${hotspots.length} hotspots viewed.`);
  }

  function renderAssessment() {
    const questions = component.content.questions || [];
    let current = 0;
    let correctCount = 0;
    const answered = new Set();
    const wrap = document.createElement('div');
    wrap.className = 'native-assessment';
    stage.appendChild(wrap);

    function renderQuestion() {
      const q = questions[current];
      wrap.innerHTML = '';
      const meta = document.createElement('div');
      meta.className = 'question-meta';
      meta.textContent = `Question ${current + 1} of ${questions.length}`;
      const prompt = document.createElement('h3');
      prompt.textContent = q.prompt;
      const options = document.createElement('div');
      options.className = 'native-options';
      const feedback = document.createElement('div');
      feedback.className = 'native-feedback';
      feedback.setAttribute('aria-live', 'polite');
      wrap.append(meta, prompt, options, feedback);

      for (const option of q.options || []) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'native-option';
        button.textContent = option.text;
        button.addEventListener('click', () => {
          if (answered.has(q.id)) return;
          answered.add(q.id);
          options.querySelectorAll('button').forEach((node) => { node.disabled = true; });
          button.classList.add(option.correct ? 'correct' : 'incorrect');
          if (option.correct) correctCount += 1;
          feedback.className = `native-feedback ${option.correct ? 'correct' : 'incorrect'}`;
          feedback.textContent = option.feedback || (option.correct ? 'Correct.' : 'Not quite.');

          const controls = document.createElement('div');
          controls.className = 'question-controls';
          const next = document.createElement('button');
          next.type = 'button';
          next.className = 'primary-control';
          const isLast = current === questions.length - 1;
          next.textContent = isLast ? 'Finish assessment' : 'Next question →';
          next.addEventListener('click', () => {
            if (isLast) {
              wrap.innerHTML = `<div class="assessment-result"><div class="result-score">${correctCount}/${questions.length}</div><h3>Assessment complete</h3><p>You answered ${correctCount} of ${questions.length} correctly.</p></div>`;
              if (completionStrategy('answer') === 'answer') markComplete(`Assessment complete: ${correctCount}/${questions.length}.`);
            } else {
              current += 1;
              renderQuestion();
            }
          });
          controls.appendChild(next);
          feedback.after(controls);
        });
        options.appendChild(button);
      }
      setStatus(`Question ${current + 1} of ${questions.length}.`);
    }
    renderQuestion();
  }

  function renderMedia() {
    const media = component.content.media || [];
    let current = 0;
    const wrap = document.createElement('div');
    wrap.className = 'native-media';
    stage.appendChild(wrap);

    function renderItem() {
      const item = media[current];
      wrap.innerHTML = '';
      const nav = document.createElement('div');
      nav.className = 'media-segments';
      media.forEach((entry, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = index === current ? 'active' : '';
        button.textContent = entry.title || `Segment ${index + 1}`;
        button.addEventListener('click', () => { current = index; renderItem(); });
        nav.appendChild(button);
      });
      const card = document.createElement('article');
      card.className = 'media-card-native';
      const title = document.createElement('h3');
      title.textContent = item.title || `Media ${current + 1}`;
      const mediaEl = document.createElement(item.kind === 'audio' ? 'audio' : 'video');
      mediaEl.controls = true;
      mediaEl.preload = 'metadata';
      mediaEl.src = asset(item.src);
      mediaEl.addEventListener('ended', () => {
        visited.add(item.id);
        setStatus(`${visited.size} of ${media.length} media segments completed.`);
        if (completionStrategy('media-end') === 'media-end' && visited.size >= media.length) {
          markComplete('All media segments completed.');
        }
      });
      card.append(title, mediaEl);
      if (item.caption) {
        const caption = document.createElement('p');
        caption.className = 'media-caption';
        caption.textContent = item.caption;
        card.appendChild(caption);
      }
      if (item.transcript) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Read transcript';
        const p = document.createElement('p');
        p.textContent = item.transcript;
        details.append(summary, p);
        card.appendChild(details);
      }
      wrap.append(nav, card);
      setStatus(`${visited.size} of ${media.length} media segments completed.`);
    }
    renderItem();
  }

  const renderers = {
    carousel: renderCarousel,
    'hotspot-reveal': renderHotspots,
    assessment: renderAssessment,
    'media-presentation': renderMedia,
  };

  const renderer = renderers[component.type];
  if (!renderer) {
    stage.textContent = `Unsupported component type: ${component.type}`;
    return;
  }

  renderer();
  if (completionStrategy('none') === 'none') badge.textContent = 'Preview';
})();
