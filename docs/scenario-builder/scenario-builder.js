(() => {
  const STORAGE_KEY = 'lx-scenario-builder:draft-v0.1';
  const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg','bmp']);
  const CONTEXT_EXT = new Set(['txt','md','markdown','csv','json']);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const helpTopics = {
    basics: ['Scenario basics', 'Set the learner-facing title and instruction, then decide whether you want to track a visible decision-quality score. The start node controls where every preview begins.'],
    assets: ['Project assets', 'Load source context and images before building the path. Image selectors in nodes and outcomes will use the portable paths from this project library.'],
    build: ['Decision path', 'Each decision node contains learner choices. Every choice points to another decision node or an outcome. Keep IDs unique; use the target dropdown rather than typing a destination manually.'],
    preview: ['Learner preview', 'Preview starts from the selected start node. Test alternate branches, feedback, score changes, outcomes, replay behavior, and the path-history summary.'],
    export: ['Export', 'Export JSON when you only need the engine-native scenario component. Export a project ZIP when you want the component JSON plus the local assets and context files together.'],
  };

  function uid(prefix = 'item') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function slugify(value) {
    return String(value || 'scenario').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'scenario';
  }

  function defaultModel() {
    return {
      schemaVersion: '0.1',
      id: 'customer-conversation-scenario',
      title: 'Customer Conversation Scenario',
      type: 'branching-scenario',
      description: 'Practice making decisions and see how each choice changes the conversation.',
      instruction: 'Choose the response that best advances the conversation. Review the feedback, then continue until you reach an outcome.',
      theme: 'portfolio',
      completion: { strategy: 'reach-outcome', required: true },
      content: {
        startNodeId: 'opening',
        score: { enabled: true, label: 'Decision quality', startingValue: 50, minimum: 0, maximum: 100, showToLearner: true },
        nodes: [
          {
            id: 'opening',
            title: 'The customer describes a business problem.',
            speaker: 'Customer',
            body: 'You have enough context to begin discovery, but you still need to understand the operational impact.',
            image: '',
            alt: '',
            choices: [
              { id: 'opening-discover', text: 'Ask a question that connects the problem to business impact.', targetId: 'impact', feedback: 'This keeps the conversation centered on the customer and surfaces useful context.', scoreDelta: 10 },
              { id: 'opening-pitch', text: 'Jump directly into your solution recommendation.', targetId: 'needs-more-discovery', feedback: 'You moved toward a solution before establishing enough context.', scoreDelta: -10 },
            ],
          },
          {
            id: 'impact',
            title: 'The customer explains the operational consequences.',
            speaker: 'Customer',
            body: 'You now understand why the problem matters. Decide how to advance the conversation.',
            image: '',
            alt: '',
            choices: [
              { id: 'impact-success', text: 'Ask how they would define and measure a successful outcome.', targetId: 'clear-business-case', feedback: 'You connected the pain point to measurable success criteria.', scoreDelta: 20 },
              { id: 'impact-rush', text: 'Move immediately to pricing and implementation details.', targetId: 'needs-more-discovery', feedback: 'Commercial details matter, but the desired outcome is still under-defined.', scoreDelta: -5 },
            ],
          },
        ],
        outcomes: [
          { id: 'clear-business-case', title: 'Clear business case', body: 'You uncovered impact and established measurable success criteria.', image: '', alt: '', summary: 'The next conversation can focus on solution fit, stakeholders, constraints, and a credible path to value.' },
          { id: 'needs-more-discovery', title: 'More discovery needed', body: 'The conversation moved ahead before enough customer context was established.', image: '', alt: '', summary: 'Revisit the problem, operational impact, and desired outcomes before positioning the solution.' },
        ],
      },
      metadata: { authoringTool: 'Scenario Builder', publicSafe: true },
    };
  }

  const state = {
    model: defaultModel(),
    assets: [],
    context: [],
    objectUrls: new Map(),
    saveTimer: null,
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  }

  function escapeAttr(value = '') { return escapeHtml(value); }

  function extension(name = '') {
    const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function classify(file, path = '') {
    const ext = extension(file.name);
    const lower = String(path).toLowerCase();
    if (IMAGE_EXT.has(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (CONTEXT_EXT.has(ext) || lower.includes('/context/') || lower.startsWith('context/')) return 'context';
    return 'other';
  }

  function defaultPath(file) {
    const kind = classify(file, file.name);
    if (kind === 'image') return `assets/images/${file.name}`;
    if (kind === 'pdf') return `assets/documents/${file.name}`;
    if (kind === 'context') return `context/${file.name}`;
    return `assets/other/${file.name}`;
  }

  function normalizeFolderPath(file, rootName) {
    const original = file.webkitRelativePath || file.name;
    const parts = original.split('/').filter(Boolean);
    if (rootName && parts[0] === rootName) parts.shift();
    return file.webkitRelativePath ? parts.join('/') : defaultPath(file);
  }

  function revokeUrls() {
    for (const url of state.objectUrls.values()) URL.revokeObjectURL(url);
    state.objectUrls.clear();
  }

  function scheduleSave() {
    clearTimeout(state.saveTimer);
    $('[data-save-state]').textContent = 'Saving…';
    state.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.model));
        $('[data-save-state]').textContent = 'Autosaved';
      } catch (_) {
        $('[data-save-state]').textContent = 'Local save unavailable';
      }
    }, 250);
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.type === 'branching-scenario' && parsed?.content?.nodes && parsed?.content?.outcomes) state.model = parsed;
    } catch (_) {}
  }

  function projectModel() {
    const model = clone(state.model);
    model.id = slugify(model.title || model.id);
    model.metadata = model.metadata || {};
    if (state.assets.length || state.context.length) {
      model.metadata.projectPackage = {
        files: state.assets.map((entry) => ({ path: entry.path, kind: entry.kind, size: entry.file.size, mediaType: entry.file.type || null })),
        sourceContext: state.context.map((entry) => ({ path: entry.path, text: entry.text })),
      };
    }
    return model;
  }

  function imageAssets() { return state.assets.filter((entry) => entry.kind === 'image'); }
  function assetUrl(path) { return state.objectUrls.get(path) || null; }

  function imageSelect(value, attributes = '') {
    const options = ['<option value="">No image</option>'];
    const known = new Set();
    imageAssets().forEach((entry) => {
      known.add(entry.path);
      options.push(`<option value="${escapeAttr(entry.path)}"${entry.path === value ? ' selected' : ''}>${escapeHtml(entry.name)} · ${escapeHtml(entry.path)}</option>`);
    });
    if (value && !known.has(value)) options.push(`<option value="${escapeAttr(value)}" selected>${escapeHtml(value)}</option>`);
    return `<select ${attributes}>${options.join('')}</select>`;
  }

  function destinationOptions(value = '') {
    const options = ['<option value="">Choose destination…</option>'];
    state.model.content.nodes.forEach((node) => options.push(`<option value="${escapeAttr(node.id)}"${node.id === value ? ' selected' : ''}>Decision · ${escapeHtml(node.title || node.id)}</option>`));
    state.model.content.outcomes.forEach((outcome) => options.push(`<option value="${escapeAttr(outcome.id)}"${outcome.id === value ? ' selected' : ''}>Outcome · ${escapeHtml(outcome.title || outcome.id)}</option>`));
    if (value && ![...state.model.content.nodes, ...state.model.content.outcomes].some((item) => item.id === value)) options.push(`<option value="${escapeAttr(value)}" selected>Missing · ${escapeHtml(value)}</option>`);
    return options.join('');
  }

  function renderBasics() {
    $('[data-field="title"]').value = state.model.title || '';
    $('[data-field="description"]').value = state.model.description || '';
    $('[data-field="instruction"]').value = state.model.instruction || '';
    const score = state.model.content.score || (state.model.content.score = {});
    $('[data-score-field="label"]').value = score.label || 'Decision quality';
    $('[data-score-field="startingValue"]').value = score.startingValue ?? 0;
    $('[data-score-field="minimum"]').value = score.minimum ?? 0;
    $('[data-score-field="maximum"]').value = score.maximum ?? 100;
    $('[data-score-field="enabled"]').checked = score.enabled !== false;
    $('[data-score-field="showToLearner"]').checked = score.showToLearner !== false;
    renderStartSelect();
  }

  function renderStartSelect() {
    const select = $('[data-start-node]');
    const current = state.model.content.startNodeId;
    select.innerHTML = state.model.content.nodes.map((node) => `<option value="${escapeAttr(node.id)}"${node.id === current ? ' selected' : ''}>${escapeHtml(node.title || node.id)}</option>`).join('');
    if (!state.model.content.nodes.some((node) => node.id === current) && state.model.content.nodes[0]) {
      state.model.content.startNodeId = state.model.content.nodes[0].id;
      select.value = state.model.content.startNodeId;
    }
  }

  function renderAssets() {
    $('[data-asset-summary]').textContent = state.assets.length ? `${state.assets.length} project files loaded · ${imageAssets().length} images available to scenario cards.` : 'No files loaded yet.';
    const grid = $('[data-asset-grid]');
    grid.innerHTML = '';
    state.assets.filter((entry) => entry.kind !== 'context').forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.innerHTML = `<strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.kind)} · ${escapeHtml(entry.path)}</small>`;
      grid.appendChild(card);
    });
    if (!grid.children.length) grid.innerHTML = '<p class="empty-copy">No visual/document assets loaded.</p>';
    const context = $('[data-context-list]');
    context.innerHTML = '';
    state.context.forEach((entry) => {
      const details = document.createElement('details');
      details.innerHTML = `<summary>${escapeHtml(entry.path)}</summary><pre>${escapeHtml(entry.text)}</pre>`;
      context.appendChild(details);
    });
    if (!context.children.length) context.innerHTML = '<p class="empty-copy">No source-context files loaded.</p>';
  }

  function unusedImage() {
    const used = new Set([
      ...state.model.content.nodes.map((node) => node.image).filter(Boolean),
      ...state.model.content.outcomes.map((outcome) => outcome.image).filter(Boolean),
    ]);
    return imageAssets().find((entry) => !used.has(entry.path))?.path || '';
  }

  async function importAssets(fileList, fromFolder = false) {
    const files = [...fileList].filter((file) => !/(^|\/)(component|scenario)\.json$/i.test(file.webkitRelativePath || file.name));
    if (!files.length) return;
    revokeUrls();
    const root = fromFolder && files[0]?.webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : null;
    state.assets = [];
    state.context = [];
    for (const file of files) {
      const path = normalizeFolderPath(file, root);
      const kind = classify(file, path);
      const entry = { file, path, kind, name: file.name };
      state.assets.push(entry);
      if (kind === 'image') state.objectUrls.set(path, URL.createObjectURL(file));
      if (kind === 'context') {
        try { state.context.push({ path, text: await file.text() }); } catch (_) {}
      }
    }
    state.assets.sort((a, b) => a.path.localeCompare(b.path));
    renderAssets();
    renderCards();
    renderJson();
    toast(`${state.assets.length} project files loaded`);
  }

  function newNode() {
    const number = state.model.content.nodes.length + 1;
    const nextOutcome = state.model.content.outcomes[0]?.id || '';
    return {
      id: `decision-${number}`,
      title: `Decision ${number}`,
      speaker: 'Customer',
      body: 'Describe the situation the learner must respond to.',
      image: unusedImage(),
      alt: '',
      choices: [
        { id: uid('choice'), text: 'Add the first learner choice.', targetId: nextOutcome, feedback: 'Explain why this decision matters.', scoreDelta: 0 },
        { id: uid('choice'), text: 'Add another learner choice.', targetId: nextOutcome, feedback: 'Explain the consequence of this decision.', scoreDelta: 0 },
      ],
    };
  }

  function newOutcome() {
    const number = state.model.content.outcomes.length + 1;
    return { id: `outcome-${number}`, title: `Outcome ${number}`, body: 'Describe where this path ends.', image: unusedImage(), alt: '', summary: 'Summarize what the learner should take away from this path.' };
  }

  function newChoice() {
    return { id: uid('choice'), text: 'New learner choice', targetId: state.model.content.outcomes[0]?.id || state.model.content.nodes[0]?.id || '', feedback: 'Add immediate coaching feedback.', scoreDelta: 0 };
  }

  function renameDestination(oldId, nextId) {
    if (!oldId || oldId === nextId) return;
    if (state.model.content.startNodeId === oldId) state.model.content.startNodeId = nextId;
    state.model.content.nodes.forEach((node) => node.choices.forEach((choice) => { if (choice.targetId === oldId) choice.targetId = nextId; }));
  }

  function move(array, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= array.length) return;
    const [item] = array.splice(index, 1);
    array.splice(target, 0, item);
  }

  function duplicateNode(index) {
    const source = clone(state.model.content.nodes[index]);
    const base = `${source.id || 'decision'}-copy`;
    let id = base; let suffix = 2;
    const allIds = new Set([...state.model.content.nodes, ...state.model.content.outcomes].map((item) => item.id));
    while (allIds.has(id)) id = `${base}-${suffix++}`;
    source.id = id;
    source.title = `${source.title || 'Decision'} copy`;
    source.choices.forEach((choice) => { choice.id = uid('choice'); });
    state.model.content.nodes.splice(index + 1, 0, source);
  }

  function duplicateOutcome(index) {
    const source = clone(state.model.content.outcomes[index]);
    const base = `${source.id || 'outcome'}-copy`;
    let id = base; let suffix = 2;
    const allIds = new Set([...state.model.content.nodes, ...state.model.content.outcomes].map((item) => item.id));
    while (allIds.has(id)) id = `${base}-${suffix++}`;
    source.id = id;
    source.title = `${source.title || 'Outcome'} copy`;
    state.model.content.outcomes.splice(index + 1, 0, source);
  }

  function renderNodes() {
    const root = $('[data-node-list]');
    root.innerHTML = '';
    state.model.content.nodes.forEach((node, nodeIndex) => {
      const card = document.createElement('article');
      card.className = 'scenario-edit-card';
      card.dataset.nodeIndex = nodeIndex;
      card.innerHTML = `
        <div class="edit-card-head">
          <div class="title-wrap"><span class="type-badge">D${nodeIndex + 1}</span><strong>${escapeHtml(node.title || node.id)}</strong></div>
          <div class="card-actions">
            <button type="button" data-node-up>↑ Up</button><button type="button" data-node-down>↓ Down</button><button type="button" data-node-copy>Duplicate</button><button type="button" class="danger" data-node-delete>Delete</button>
          </div>
        </div>
        <div class="field-grid">
          <label><span>Node ID</span><input type="text" data-node-field="id" value="${escapeAttr(node.id)}"></label>
          <label><span>Speaker / role</span><input type="text" data-node-field="speaker" value="${escapeAttr(node.speaker || '')}"></label>
          <label class="wide"><span>Decision title / situation</span><input type="text" data-node-field="title" value="${escapeAttr(node.title || '')}"></label>
          <label class="wide"><span>Situation details</span><textarea rows="3" data-node-field="body">${escapeHtml(node.body || '')}</textarea></label>
          <label><span>Visual</span>${imageSelect(node.image || '', 'data-node-field="image"')}</label>
          <label><span>Alt text</span><input type="text" data-node-field="alt" value="${escapeAttr(node.alt || '')}"></label>
        </div>
        <div class="choices-wrap"><div class="choices-head"><strong>Learner choices</strong><button type="button" data-add-choice>+ Add choice</button></div><div class="choice-list" data-choice-list></div></div>`;

      const choiceRoot = $('[data-choice-list]', card);
      node.choices.forEach((choice, choiceIndex) => {
        const choiceCard = document.createElement('div');
        choiceCard.className = 'choice-card';
        choiceCard.innerHTML = `
          <div class="choice-actions"><button type="button" data-choice-delete aria-label="Delete choice">×</button></div>
          <label class="wide"><span>Choice ${choiceIndex + 1}</span><input type="text" data-choice-field="text" value="${escapeAttr(choice.text || '')}"></label>
          <label><span>Send learner to</span><select data-choice-field="targetId">${destinationOptions(choice.targetId)}</select></label>
          <label><span>Score change</span><input type="number" data-choice-field="scoreDelta" value="${Number(choice.scoreDelta || 0)}"></label>
          <label class="wide"><span>Immediate feedback</span><textarea rows="2" data-choice-field="feedback">${escapeHtml(choice.feedback || '')}</textarea></label>`;
        $$('[data-choice-field]', choiceCard).forEach((input) => input.addEventListener('input', () => {
          const key = input.dataset.choiceField;
          choice[key] = key === 'scoreDelta' ? Number(input.value || 0) : input.value;
          touch(false);
        }));
        $('[data-choice-delete]', choiceCard).addEventListener('click', () => {
          node.choices.splice(choiceIndex, 1);
          touch(true);
        });
        choiceRoot.appendChild(choiceCard);
      });

      $$('[data-node-field]', card).forEach((input) => {
        const eventName = input.dataset.nodeField === 'id' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
          const key = input.dataset.nodeField;
          if (key === 'id') {
            const oldId = node.id;
            node.id = input.value.trim();
            renameDestination(oldId, node.id);
            touch(true);
          } else {
            node[key] = input.value;
            if (key === 'title') $('.edit-card-head strong', card).textContent = node.title || node.id;
            touch(false);
          }
        });
      });
      $('[data-add-choice]', card).addEventListener('click', () => { node.choices.push(newChoice()); touch(true); });
      $('[data-node-up]', card).addEventListener('click', () => { move(state.model.content.nodes, nodeIndex, -1); touch(true); });
      $('[data-node-down]', card).addEventListener('click', () => { move(state.model.content.nodes, nodeIndex, 1); touch(true); });
      $('[data-node-copy]', card).addEventListener('click', () => { duplicateNode(nodeIndex); touch(true); });
      $('[data-node-delete]', card).addEventListener('click', () => {
        if (state.model.content.nodes.length <= 1) return toast('A scenario needs at least one decision node.');
        const removedId = node.id;
        state.model.content.nodes.splice(nodeIndex, 1);
        if (state.model.content.startNodeId === removedId) state.model.content.startNodeId = state.model.content.nodes[0]?.id || '';
        touch(true);
      });
      root.appendChild(card);
    });
  }

  function renderOutcomes() {
    const root = $('[data-outcome-list]');
    root.innerHTML = '';
    state.model.content.outcomes.forEach((outcome, index) => {
      const card = document.createElement('article');
      card.className = 'scenario-edit-card';
      card.innerHTML = `
        <div class="edit-card-head">
          <div class="title-wrap"><span class="type-badge">O${index + 1}</span><strong>${escapeHtml(outcome.title || outcome.id)}</strong></div>
          <div class="card-actions"><button type="button" data-outcome-up>↑ Up</button><button type="button" data-outcome-down>↓ Down</button><button type="button" data-outcome-copy>Duplicate</button><button type="button" class="danger" data-outcome-delete>Delete</button></div>
        </div>
        <div class="outcome-fields">
          <label><span>Outcome ID</span><input type="text" data-outcome-field="id" value="${escapeAttr(outcome.id)}"></label>
          <label><span>Outcome title</span><input type="text" data-outcome-field="title" value="${escapeAttr(outcome.title || '')}"></label>
          <label class="wide"><span>Outcome explanation</span><textarea rows="3" data-outcome-field="body">${escapeHtml(outcome.body || '')}</textarea></label>
          <label class="wide"><span>Learner takeaway / next step</span><textarea rows="2" data-outcome-field="summary">${escapeHtml(outcome.summary || '')}</textarea></label>
          <label><span>Visual</span>${imageSelect(outcome.image || '', 'data-outcome-field="image"')}</label>
          <label><span>Alt text</span><input type="text" data-outcome-field="alt" value="${escapeAttr(outcome.alt || '')}"></label>
        </div>`;
      $$('[data-outcome-field]', card).forEach((input) => {
        const eventName = input.dataset.outcomeField === 'id' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
          const key = input.dataset.outcomeField;
          if (key === 'id') {
            const oldId = outcome.id;
            outcome.id = input.value.trim();
            renameDestination(oldId, outcome.id);
            touch(true);
          } else {
            outcome[key] = input.value;
            if (key === 'title') $('.edit-card-head strong', card).textContent = outcome.title || outcome.id;
            touch(false);
          }
        });
      });
      $('[data-outcome-up]', card).addEventListener('click', () => { move(state.model.content.outcomes, index, -1); touch(true); });
      $('[data-outcome-down]', card).addEventListener('click', () => { move(state.model.content.outcomes, index, 1); touch(true); });
      $('[data-outcome-copy]', card).addEventListener('click', () => { duplicateOutcome(index); touch(true); });
      $('[data-outcome-delete]', card).addEventListener('click', () => {
        if (state.model.content.outcomes.length <= 1) return toast('A scenario needs at least one outcome.');
        state.model.content.outcomes.splice(index, 1);
        touch(true);
      });
      root.appendChild(card);
    });
  }

  function renderCards() {
    renderNodes();
    renderOutcomes();
    renderStartSelect();
  }

  function validatePath() {
    const issues = [];
    const warnings = [];
    const all = [...state.model.content.nodes, ...state.model.content.outcomes];
    const ids = all.map((item) => item.id).filter(Boolean);
    const set = new Set(ids);
    if (ids.length !== all.length) issues.push('Every node/outcome needs an ID.');
    if (set.size !== ids.length) issues.push('IDs must be unique.');
    if (!state.model.content.nodes.some((node) => node.id === state.model.content.startNodeId)) issues.push('Start node is missing.');
    if (!state.model.content.outcomes.length) issues.push('Add at least one outcome.');
    state.model.content.nodes.forEach((node) => {
      if (!node.choices.length) issues.push(`${node.title || node.id} has no choices.`);
      node.choices.forEach((choice) => { if (!set.has(choice.targetId)) issues.push(`A choice in ${node.title || node.id} has a missing destination.`); });
    });

    if (!issues.length && state.model.content.startNodeId) {
      const reachable = new Set();
      const queue = [state.model.content.startNodeId];
      while (queue.length) {
        const id = queue.shift();
        if (reachable.has(id)) continue;
        reachable.add(id);
        const node = state.model.content.nodes.find((item) => item.id === id);
        node?.choices.forEach((choice) => { if (set.has(choice.targetId) && !reachable.has(choice.targetId)) queue.push(choice.targetId); });
      }
      all.filter((item) => !reachable.has(item.id)).forEach((item) => warnings.push(`${item.title || item.id} is unreachable from the start node.`));
      if (!state.model.content.outcomes.some((outcome) => reachable.has(outcome.id))) issues.push('No outcome is reachable from the start node.');
    }
    return { issues, warnings };
  }

  function renderPathCheck() {
    const root = $('[data-path-check]');
    const { issues, warnings } = validatePath();
    if (issues.length) {
      root.className = 'path-check warn';
      root.textContent = `Path check: ${issues.length} blocking issue${issues.length === 1 ? '' : 's'} · ${issues[0]}`;
    } else if (warnings.length) {
      root.className = 'path-check warn';
      root.textContent = `Path runs, with ${warnings.length} warning${warnings.length === 1 ? '' : 's'} · ${warnings[0]}`;
    } else {
      root.className = 'path-check ok';
      root.textContent = 'Path check ✓ All destinations resolve and an outcome is reachable.';
    }
  }

  function renderJson() {
    $('[data-json-output]').textContent = JSON.stringify(projectModel(), null, 2);
  }

  function touch(structural = false) {
    scheduleSave();
    renderPathCheck();
    renderJson();
    if (structural) renderCards();
  }

  function scoreConfig(model) {
    return {
      enabled: model.content.score?.enabled !== false,
      label: model.content.score?.label || 'Decision quality',
      startingValue: Number(model.content.score?.startingValue ?? 0),
      minimum: Number(model.content.score?.minimum ?? 0),
      maximum: Number(model.content.score?.maximum ?? 100),
      showToLearner: model.content.score?.showToLearner !== false,
    };
  }

  function mountPreview(root) {
    const model = projectModel();
    const nodes = new Map(model.content.nodes.map((node) => [node.id, node]));
    const outcomes = new Map(model.content.outcomes.map((outcome) => [outcome.id, outcome]));
    const config = scoreConfig(model);
    let currentId = model.content.startNodeId;
    let score = config.startingValue;
    const history = [];

    function clamp(value) { return Math.max(config.minimum, Math.min(config.maximum, value)); }

    function historyMarkup() {
      if (!history.length) return '';
      return `<details class="path-history"><summary>Review path · ${history.length} decision${history.length === 1 ? '' : 's'}</summary><ol>${history.map((entry) => `<li><strong>${escapeHtml(entry.nodeTitle)}</strong> — ${escapeHtml(entry.choiceText)}</li>`).join('')}</ol></details>`;
    }

    function scoreMarkup() {
      return config.enabled && config.showToLearner ? `<div class="learner-score"><span>${escapeHtml(config.label)}</span><strong>${score}</strong></div>` : '';
    }

    function imageMarkup(path, alt) {
      const url = assetUrl(path);
      return url ? `<img class="learner-image" src="${escapeAttr(url)}" alt="${escapeAttr(alt || '')}">` : '';
    }

    function render() {
      const outcome = outcomes.get(currentId);
      if (outcome) {
        root.innerHTML = `<article class="learner-card">${scoreMarkup()}<span class="eyebrow">Outcome</span><h3>${escapeHtml(outcome.title)}</h3>${imageMarkup(outcome.image, outcome.alt || outcome.title)}<p>${escapeHtml(outcome.body || '')}</p>${outcome.summary ? `<div class="outcome-summary">${escapeHtml(outcome.summary)}</div>` : ''}${historyMarkup()}<button type="button" class="learner-replay">Replay scenario</button></article>`;
        $('.learner-replay', root).addEventListener('click', () => { currentId = model.content.startNodeId; score = config.startingValue; history.length = 0; render(); });
        return;
      }
      const node = nodes.get(currentId);
      if (!node) {
        root.innerHTML = `<div class="preview-empty">Missing scenario destination: <strong>${escapeHtml(currentId)}</strong></div>`;
        return;
      }
      root.innerHTML = `<article class="learner-card">${scoreMarkup()}<span class="eyebrow">Decision ${history.length + 1}</span>${node.speaker ? `<div class="learner-speaker">${escapeHtml(node.speaker)}</div>` : ''}<h3>${escapeHtml(node.title)}</h3>${imageMarkup(node.image, node.alt || node.title)}<p>${escapeHtml(node.body || '')}</p><div class="learner-prompt">What do you do next?</div><div class="learner-choices"></div>${historyMarkup()}</article>`;
      const choicesRoot = $('.learner-choices', root);
      node.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'learner-choice';
        button.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(choice.text)}</strong>`;
        button.addEventListener('click', () => {
          const delta = Number(choice.scoreDelta || 0);
          if (config.enabled) score = clamp(score + delta);
          history.push({ nodeTitle: node.title || node.id, choiceText: choice.text || '', feedback: choice.feedback || '', targetId: choice.targetId });
          $$('.learner-choice', root).forEach((item) => { item.disabled = true; });
          const feedback = document.createElement('div');
          feedback.className = 'learner-feedback';
          feedback.innerHTML = `<strong>${delta > 0 ? 'Good signal' : delta < 0 ? 'Consider the tradeoff' : 'Decision recorded'}</strong><p>${escapeHtml(choice.feedback || 'Continue to see the result of this decision.')}</p>${config.enabled && config.showToLearner ? `<small>${escapeHtml(config.label)}: ${score}</small>` : ''}`;
          const next = document.createElement('button');
          next.type = 'button';
          next.textContent = outcomes.has(choice.targetId) ? 'See outcome →' : 'Continue →';
          next.addEventListener('click', () => { currentId = choice.targetId; render(); });
          feedback.appendChild(next);
          $('.learner-card', root).appendChild(feedback);
        });
        choicesRoot.appendChild(button);
      });
    }
    render();
  }

  function loadModel(model) {
    if (!model || model.type !== 'branching-scenario' || !Array.isArray(model.content?.nodes) || !Array.isArray(model.content?.outcomes)) throw new Error('This is not a valid branching-scenario component.');
    state.model = model;
    renderAll();
    scheduleSave();
  }

  function installImportedAssets(entries) {
    revokeUrls();
    state.assets = [];
    state.context = [];
    entries.forEach(({ file, path }) => {
      const kind = classify(file, path);
      state.assets.push({ file, path, kind, name: file.name });
      if (kind === 'image') state.objectUrls.set(path, URL.createObjectURL(file));
      if (kind === 'context') file.text().then((text) => { state.context.push({ path, text }); renderAssets(); });
    });
    state.assets.sort((a, b) => a.path.localeCompare(b.path));
    renderAssets();
    renderCards();
    renderJson();
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function exportJson() {
    const model = projectModel();
    downloadBlob(new Blob([`${JSON.stringify(model, null, 2)}\n`], { type: 'application/json' }), `${model.id}.json`);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(projectModel(), null, 2));
      toast('Scenario JSON copied');
    } catch (_) { toast('Clipboard access is unavailable in this browser context.'); }
  }

  function showHelp(button, key) {
    const topic = helpTopics[key];
    if (!topic) return;
    const popover = $('[data-help-popover]');
    $('[data-help-title]', popover).textContent = topic[0];
    $('[data-help-body]', popover).textContent = topic[1];
    const rect = button.getBoundingClientRect();
    const width = Math.min(350, innerWidth - 28);
    popover.style.left = `${Math.max(14, Math.min(innerWidth - width - 14, rect.left + rect.width / 2 - width / 2))}px`;
    popover.style.top = `${Math.min(innerHeight - 210, rect.bottom + 10)}px`;
    popover.classList.add('open');
    popover.setAttribute('aria-hidden', 'false');
  }

  function closeHelp() {
    const popover = $('[data-help-popover]');
    popover.classList.remove('open');
    popover.setAttribute('aria-hidden', 'true');
  }

  function toast(message) {
    $('.toast')?.remove();
    const element = document.createElement('div');
    element.className = 'toast';
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2200);
  }

  function renderAll() {
    renderBasics();
    renderAssets();
    renderCards();
    renderPathCheck();
    renderJson();
  }

  function bindStatic() {
    $$('[data-field]').forEach((input) => input.addEventListener('input', () => { state.model[input.dataset.field] = input.value; touch(false); }));
    $$('[data-score-field]').forEach((input) => input.addEventListener('input', () => {
      const key = input.dataset.scoreField;
      state.model.content.score[key] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value || 0) : input.value;
      touch(false);
    }));
    $('[data-start-node]').addEventListener('change', (event) => { state.model.content.startNodeId = event.target.value; touch(false); });
    $('[data-add-node]').addEventListener('click', () => { state.model.content.nodes.push(newNode()); touch(true); document.getElementById('build-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('[data-add-outcome]').addEventListener('click', () => { state.model.content.outcomes.push(newOutcome()); touch(true); });
    $('[data-choose-folder]').addEventListener('click', () => $('[data-folder-input]').click());
    $('[data-choose-files]').addEventListener('click', () => $('[data-files-input]').click());
    $('[data-folder-input]').addEventListener('change', (event) => importAssets(event.target.files, true));
    $('[data-files-input]').addEventListener('change', (event) => importAssets(event.target.files, false));
    $('[data-preview-start]').addEventListener('click', () => { mountPreview($('[data-preview-shell]')); $('[data-preview-shell]').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('[data-preview-focus]').addEventListener('click', () => {
      const dialog = $('[data-preview-dialog]');
      mountPreview($('[data-dialog-preview]'));
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    });
    $('[data-close-preview]').addEventListener('click', () => $('[data-preview-dialog]').close?.());
    $('[data-copy-json]').addEventListener('click', copyJson);
    $('[data-export-json]').addEventListener('click', exportJson);
    $('[data-open-project]').addEventListener('click', () => $('[data-project-input]').click());
    $('[data-project-input]').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file || !file.name.toLowerCase().endsWith('.json')) return;
      try { loadModel(JSON.parse(await file.text())); toast('Scenario project opened'); } catch (error) { toast(error.message); }
      event.target.value = '';
    });
    $$('[data-help]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); showHelp(button, button.dataset.help); }));
    $('[data-close-help]').addEventListener('click', closeHelp);
    document.addEventListener('click', (event) => { if (!event.target.closest('[data-help-popover]') && !event.target.closest('[data-help]')) closeHelp(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHelp(); });
    window.addEventListener('beforeunload', revokeUrls);
  }

  restoreDraft();
  bindStatic();
  renderAll();
  scheduleSave();

  window.LXScenarioBuilder = {
    getModel: projectModel,
    getAssets: () => state.assets.slice(),
    loadModel,
    installImportedAssets,
    downloadBlob,
    toast,
    projectInput: $('[data-project-input]'),
  };
})();
