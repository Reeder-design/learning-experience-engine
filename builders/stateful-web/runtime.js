(() => {
  const data = window.__LX_EXPERIENCE__;
  if (!data) return;

  const $ = (selector) => document.querySelector(selector);
  const stage = $('[data-stage]');
  const frame = $('[data-stage-frame]');
  const nav = $('[data-slide-nav]');
  const assetMap = new Map((data.assets || []).map((asset) => [asset.id, asset]));
  const variables = {};

  for (const group of ['author', 'system', 'player']) {
    for (const variable of data.variables?.[group] || []) variables[variable.id] = variable.initialValue;
  }

  const slideOrder = [];
  for (const scene of data.scenes || []) {
    for (const ref of scene.slides || []) slideOrder.push({ scene, ref, slide: data.slides[ref.id] });
  }

  let current = 0;
  let timers = [];
  let objectEls = new Map();
  let layerEls = new Map();
  let groupIndex = new Map();
  let currentSlide = null;
  let triggerDepth = 0;

  function cleanRef(value) {
    if (value == null) return null;
    const string = String(value)
      .replace(/^_player\.#?/, '')
      .replace(/^_player\./, '')
      .replace(/^#/, '');
    const parts = string.split('.');
    return parts[parts.length - 1].replace(/^#/, '');
  }

  function resolveVar(value) {
    return variables[cleanRef(value)];
  }

  function literal(node) {
    if (!node) return null;
    if (node.type === 'var') return resolveVar(node.value);
    if (node.type === 'property') {
      const property = String(node.value || '');
      if (property.endsWith('$OnStage')) {
        const id = cleanRef(property.replace(/\.\$OnStage$/, ''));
        const element = objectEls.get(id);
        return !!element && !element.hidden && element.style.display !== 'none';
      }
      return null;
    }
    return node.value;
  }

  function evalCondition(condition) {
    if (!condition) return true;
    if (condition.type === 'and' || condition.type === 'group') return (condition.statements || []).every(evalCondition);
    if (condition.type === 'or') return (condition.statements || []).some(evalCondition);
    if (condition.type === 'compare') {
      const left = literal(condition.left);
      const right = literal(condition.right);
      switch (condition.operator) {
        case 'eq': return left == right;
        case 'neq':
        case 'ne': return left != right;
        case 'gt': return Number(left) > Number(right);
        case 'gte': return Number(left) >= Number(right);
        case 'lt': return Number(left) < Number(right);
        case 'lte': return Number(left) <= Number(right);
        default: return left == right;
      }
    }
    return true;
  }

  function valueOf(value) {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')) {
      if (value.type === 'var' || value.type === 'property') return literal(value);
      return value.value;
    }
    return value;
  }

  function indexGroups(object) {
    for (const [id, group] of Object.entries(object.actionGroups || {})) {
      groupIndex.set(id, group);
      groupIndex.set(cleanRef(id), group);
    }
    for (const child of object.children || []) indexGroups(child);
  }

  function setVariable(name, operator, rawValue) {
    const id = cleanRef(name);
    if (!id) return;
    const oldValue = variables[id];
    const value = valueOf(rawValue);

    if (operator === 'add') variables[id] = Number(oldValue || 0) + Number(value || 0);
    else if (operator === 'sub') variables[id] = Number(oldValue || 0) - Number(value || 0);
    else if (operator === 'mul') variables[id] = Number(oldValue || 0) * Number(value || 0);
    else if (operator === 'div') variables[id] = Number(value) ? Number(oldValue || 0) / Number(value) : oldValue;
    else if (operator === 'toggle') variables[id] = !Boolean(oldValue);
    else variables[id] = value;

    updateDebug();
    window.LXComponents?.onVariableChange?.(id, variables[id]);
    if (oldValue !== variables[id]) fireVariableChanged(id);
  }

  function findGroup(id) {
    return groupIndex.get(id)
      || groupIndex.get(cleanRef(id))
      || [...groupIndex.entries()].find(([key]) => String(id || '').endsWith(key))?.[1];
  }

  function showLayer(id, hideOthers = true) {
    const target = cleanRef(id);
    if (hideOthers) {
      for (const [layerId, element] of layerEls) {
        if (element.dataset.kind !== 'base' && layerId !== target) element.classList.remove('active');
      }
    }
    const element = layerEls.get(target);
    if (!element) return;
    element.classList.add('active');
    const layer = currentSlide.layers.find((candidate) => candidate.id === target);
    if (layer) {
      fireEvents(layer.events, 'ontransitionin');
      scheduleTimeline(layer.events);
    }
    stage.dispatchEvent(new CustomEvent('lx:layer-shown', { detail: { layerId: target } }));
  }

  function executeAction(action) {
    if (!action || triggerDepth > 80) return;
    triggerDepth += 1;
    try {
      switch (action.type) {
        case 'condition': {
          const branch = evalCondition(action.condition) ? action.then : action.else;
          for (const child of branch || []) executeAction(child);
          break;
        }
        case 'variable.adjust': setVariable(action.variable, action.operator, valueOf(action.value)); break;
        case 'layer.show': showLayer(action.target, action.hideOthers !== false); break;
        case 'layer.hide': {
          const element = layerEls.get(cleanRef(action.target));
          if (element) element.classList.remove('active');
          break;
        }
        case 'object.show': {
          const element = objectEls.get(cleanRef(action.target));
          if (element) { element.hidden = false; element.style.display = ''; }
          break;
        }
        case 'object.hide': {
          const element = objectEls.get(cleanRef(action.target));
          if (element) { element.hidden = true; element.style.display = 'none'; }
          break;
        }
        case 'object.state.set': {
          const element = objectEls.get(cleanRef(action.target));
          if (element) element.dataset.state = cleanRef(action.state) || '_default';
          break;
        }
        case 'action-group.execute': {
          const group = findGroup(action.target);
          for (const child of group?.actions || []) executeAction(child);
          break;
        }
        case 'navigation.next': go(current + 1); break;
        case 'navigation.previous': go(current - 1); break;
        case 'navigation.slide': {
          const target = cleanRef(action.target);
          const index = slideOrder.findIndex((item) => cleanRef(item.slide?.id) === target || cleanRef(item.ref?.id) === target);
          if (index >= 0) go(index);
          break;
        }
        case 'navigation.url': if (action.url) window.open(action.url, '_blank', 'noopener'); break;
        case 'media.play': objectEls.get(cleanRef(action.target))?.querySelector('audio,video')?.play?.(); break;
        case 'media.pause': objectEls.get(cleanRef(action.target))?.querySelector('audio,video')?.pause?.(); break;
        case 'media.stop': {
          const media = objectEls.get(cleanRef(action.target))?.querySelector('audio,video');
          if (media) { media.pause?.(); media.currentTime = 0; }
          break;
        }
        default: break;
      }
    } finally {
      triggerDepth -= 1;
    }
  }

  function fireEvents(events, type) {
    for (const event of events || []) {
      if (event.type === type) for (const action of event.actions || []) executeAction(action);
    }
  }

  function fireVariableChanged(name) {
    for (const event of currentSlide?.events || []) {
      if (event.type === 'onvarchanged' && (!event.variable || cleanRef(event.variable) === name)) {
        for (const action of event.actions || []) executeAction(action);
      }
    }
  }

  function scheduleTimeline(events) {
    for (const event of events || []) {
      if (event.type === 'ontimelinetick' && Number.isFinite(Number(event.timeMs))) {
        timers.push(setTimeout(() => {
          for (const action of event.actions || []) executeAction(action);
        }, Math.max(0, Number(event.timeMs))));
      }
    }
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function assetUrl(id) {
    const asset = assetMap.get(id);
    return asset?.path ? `assets/${asset.path.split('/').map(encodeURIComponent).join('/')}` : null;
  }

  function isInteractive(object) {
    return (object.events || []).some((event) => ['onrelease', 'onrollover', 'onrollout', 'onpress'].includes(event.type));
  }

  function renderObject(object, parent, canvasWidth) {
    const element = document.createElement('div');
    element.className = 'lx-object';
    element.dataset.objectId = object.id;
    const bounds = object.bounds || {};
    Object.assign(element.style, {
      left: `${bounds.x || 0}px`,
      top: `${bounds.y || 0}px`,
      width: `${Math.max(0, bounds.width || 0)}px`,
      height: `${Math.max(0, bounds.height || 0)}px`,
      zIndex: String((object.visual?.depth ?? 0) + 1),
      opacity: String((object.visual?.alpha ?? 100) > 1 ? (object.visual?.alpha ?? 100) / 100 : (object.visual?.alpha ?? 1)),
      transform: `rotate(${bounds.rotation || 0}deg) scale(${(bounds.scaleX || 100) / 100},${(bounds.scaleY || 100) / 100})`,
    });

    if (object.visual?.clipToBounds) element.style.overflow = 'hidden';
    const source = object.assets?.[0] && assetUrl(object.assets[0]);
    if (source) {
      const image = document.createElement('img');
      image.src = source;
      image.alt = object.accessibility?.altText || object.text || '';
      element.appendChild(image);
    } else if ((object.text || '').toLowerCase().includes('arrow icon')) {
      element.classList.add('arrow-control');
      element.textContent = (bounds.x || 0) < canvasWidth / 2 ? '‹' : '›';
    } else if (object.text && !/^Rectangular Hotspot$/i.test(object.text) && !/^(Group|No Image)$/i.test(object.text)) {
      element.classList.add('lx-text');
      element.textContent = object.text;
    } else if (/Hotspot/i.test(object.text || '')) {
      element.classList.add('hotspot');
    } else {
      element.classList.add('generic-shape');
    }

    if (isInteractive(object)) element.classList.add('interactive');
    objectEls.set(object.id, element);
    indexGroups(object);

    for (const event of object.events || []) {
      if (event.type === 'onrelease') element.addEventListener('click', () => event.actions.forEach(executeAction));
      if (event.type === 'onrollover') element.addEventListener('mouseenter', () => event.actions.forEach(executeAction));
      if (event.type === 'onrollout') element.addEventListener('mouseleave', () => event.actions.forEach(executeAction));
      if (event.type === 'onpress') element.addEventListener('mousedown', () => event.actions.forEach(executeAction));
    }

    for (const child of object.children || []) renderObject(child, element, canvasWidth);
    parent.appendChild(element);
    return element;
  }

  function componentContext() {
    return {
      data,
      experience: data.experience,
      slide: currentSlide,
      currentIndex: current,
      slideOrder,
      stage,
      frame,
      variables,
      objectEls,
      layerEls,
      assetMap,
      assetUrl,
      cleanRef,
      executeAction,
      showLayer,
      setVariable,
      go,
    };
  }

  function renderSlide(slide) {
    clearTimers();
    window.LXComponents?.clear?.();
    currentSlide = slide;
    stage.innerHTML = '';
    objectEls = new Map();
    layerEls = new Map();
    groupIndex = new Map();

    const width = slide.canvas?.width || 1024;
    const height = slide.canvas?.height || 576;
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    frame.style.aspectRatio = `${width}/${height}`;

    for (const [id, group] of Object.entries(slide.actionGroups || {})) {
      groupIndex.set(id, group);
      groupIndex.set(cleanRef(id), group);
    }

    for (const layer of slide.layers || []) {
      const element = document.createElement('div');
      element.className = `lx-layer${layer.kind === 'base' ? ' active' : ''}`;
      element.dataset.kind = layer.kind;
      element.dataset.layerId = layer.id;
      layerEls.set(layer.id, element);
      for (const [id, group] of Object.entries(layer.actionGroups || {})) {
        groupIndex.set(id, group);
        groupIndex.set(cleanRef(id), group);
      }
      for (const object of layer.objects || []) renderObject(object, element, width);
      stage.appendChild(element);
    }

    fit();
    fireEvents(slide.events, 'onbeforeslidein');
    fireEvents(slide.events, 'onslidestart');
    fireEvents(slide.events, 'ontransitionin');
    for (const layer of slide.layers || []) {
      if (layer.kind === 'base') {
        fireEvents(layer.events, 'ontransitionin');
        scheduleTimeline(layer.events);
      }
    }
    scheduleTimeline(slide.events);

    const componentType = window.LXComponents?.enhance?.(componentContext()) || 'generic';
    $('[data-runtime-note]').textContent = componentType && componentType !== 'slide'
      ? `Reusable component detected: ${componentType}`
      : '';
    updateUi();
  }

  function fit() {
    if (!currentSlide) return;
    const width = currentSlide.canvas?.width || 1024;
    const height = currentSlide.canvas?.height || 576;
    const scale = Math.min(frame.clientWidth / width, frame.clientHeight / height);
    stage.style.transform = `scale(${scale})`;
  }

  function go(index) {
    current = Math.max(0, Math.min(slideOrder.length - 1, index));
    renderSlide(slideOrder[current].slide);
  }

  function updateUi() {
    const item = slideOrder[current];
    $('[data-scene-label]').textContent = item.scene.title || `Scene ${item.scene.order || ''}`;
    $('[data-slide-label]').textContent = item.slide.title;
    $('[data-progress]').textContent = `${current + 1} / ${slideOrder.length}`;
    $('[data-prev]').disabled = current === 0;
    $('[data-next]').disabled = current === slideOrder.length - 1;
    for (const button of nav.querySelectorAll('button')) button.classList.toggle('active', Number(button.dataset.index) === current);
  }

  function updateDebug() {
    const host = $('[data-variable-debug]');
    host.innerHTML = '';
    for (const [key, value] of Object.entries(variables)) {
      const row = document.createElement('div');
      row.className = 'var-row';
      row.innerHTML = `<span>${key}</span><strong>${String(value)}</strong>`;
      host.appendChild(row);
    }
  }

  slideOrder.forEach((item, index) => {
    const button = document.createElement('button');
    button.dataset.index = index;
    button.innerHTML = `<small>${item.scene.title || 'Scene'}</small><strong>${item.slide.title}</strong>`;
    button.addEventListener('click', () => {
      go(index);
      document.body.classList.remove('contents-open');
    });
    nav.appendChild(button);
  });

  $('[data-prev]').onclick = () => go(current - 1);
  $('[data-next]').onclick = () => go(current + 1);
  $('[data-restart]').onclick = () => renderSlide(slideOrder[current].slide);
  $('[data-contents]').onclick = () => document.body.classList.toggle('contents-open');
  $('[data-close-contents]').onclick = () => document.body.classList.remove('contents-open');
  $('[data-scrim]').onclick = () => document.body.classList.remove('contents-open');
  window.addEventListener('resize', fit);

  updateDebug();
  if (slideOrder.length) go(0);
  else $('[data-runtime-note]').textContent = 'No slides were found in this experience.';
})();
