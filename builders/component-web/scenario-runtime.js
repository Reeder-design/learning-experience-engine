(() => {
  const component = window.__LX_COMPONENT__;
  if (!component || component.type !== 'branching-scenario') return;

  const stage = document.querySelector('[data-component-stage]');
  const status = document.querySelector('[data-component-status]');
  const badge = document.querySelector('[data-completion-badge]');
  if (!stage) return;

  const content = component.content || {};
  const nodes = new Map((content.nodes || []).map((node) => [node.id, node]));
  const outcomes = new Map((content.outcomes || []).map((outcome) => [outcome.id, outcome]));
  const scoreConfig = {
    enabled: content.score?.enabled !== false,
    label: content.score?.label || 'Decision quality',
    startingValue: Number(content.score?.startingValue ?? 0),
    minimum: Number(content.score?.minimum ?? 0),
    maximum: Number(content.score?.maximum ?? 100),
    showToLearner: content.score?.showToLearner !== false,
  };

  let currentId = content.startNodeId;
  let score = scoreConfig.startingValue;
  let complete = false;
  const history = [];

  function asset(src) {
    if (!src) return null;
    return component._assetMap?.[src] || src;
  }

  function clampScore(value) {
    return Math.max(scoreConfig.minimum, Math.min(scoreConfig.maximum, value));
  }

  function setStatus(message) {
    if (status) status.textContent = message || '';
  }

  function markComplete(outcome) {
    if (complete) return;
    complete = true;
    if (badge) {
      badge.textContent = 'Complete ✓';
      badge.classList.add('complete');
    }
    setStatus(`Outcome reached: ${outcome.title || outcome.id}.`);
    window.dispatchEvent(new CustomEvent('lx:component-complete', {
      detail: {
        id: component.id,
        type: component.type,
        outcomeId: outcome.id,
        score,
        path: history.map((entry) => ({ ...entry })),
      },
    }));
  }

  function scoreMarkup() {
    if (!scoreConfig.enabled || !scoreConfig.showToLearner) return '';
    return `<div class="scenario-score"><span>${escapeHtml(scoreConfig.label)}</span><strong>${score}</strong></div>`;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char]));
  }

  function createImage(src, alt) {
    if (!src) return null;
    const image = document.createElement('img');
    image.src = asset(src);
    image.alt = alt || '';
    image.className = 'scenario-image';
    return image;
  }

  function restart() {
    currentId = content.startNodeId;
    score = scoreConfig.startingValue;
    complete = false;
    history.length = 0;
    if (badge) {
      badge.textContent = 'In progress';
      badge.classList.remove('complete');
    }
    renderCurrent();
  }

  function renderPath(container) {
    if (!history.length) return;
    const details = document.createElement('details');
    details.className = 'scenario-path';
    const summary = document.createElement('summary');
    summary.textContent = `Review path · ${history.length} decision${history.length === 1 ? '' : 's'}`;
    const list = document.createElement('ol');
    history.forEach((entry) => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${escapeHtml(entry.nodeTitle)}</strong><span>${escapeHtml(entry.choiceText)}</span>${entry.feedback ? `<small>${escapeHtml(entry.feedback)}</small>` : ''}`;
      list.appendChild(item);
    });
    details.append(summary, list);
    container.appendChild(details);
  }

  function renderOutcome(outcome) {
    stage.innerHTML = '';
    const shell = document.createElement('article');
    shell.className = 'scenario-outcome';
    shell.innerHTML = `${scoreMarkup()}<span class="scenario-eyebrow">Outcome</span><h3>${escapeHtml(outcome.title || 'Scenario complete')}</h3>`;
    const image = createImage(outcome.image, outcome.alt || outcome.title);
    if (image) shell.appendChild(image);
    if (outcome.body) {
      const body = document.createElement('p');
      body.textContent = outcome.body;
      shell.appendChild(body);
    }
    if (outcome.summary) {
      const summary = document.createElement('div');
      summary.className = 'scenario-outcome-summary';
      summary.textContent = outcome.summary;
      shell.appendChild(summary);
    }
    renderPath(shell);
    const controls = document.createElement('div');
    controls.className = 'scenario-controls';
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'primary-control';
    replay.textContent = 'Replay scenario';
    replay.addEventListener('click', restart);
    controls.appendChild(replay);
    shell.appendChild(controls);
    stage.appendChild(shell);
    markComplete(outcome);
  }

  function choose(node, choice) {
    const delta = Number(choice.scoreDelta || 0);
    if (scoreConfig.enabled) score = clampScore(score + delta);
    history.push({
      nodeId: node.id,
      nodeTitle: node.title || node.id,
      choiceId: choice.id,
      choiceText: choice.text || '',
      feedback: choice.feedback || '',
      scoreDelta: delta,
      targetId: choice.targetId,
    });

    const card = stage.querySelector('.scenario-card');
    const choices = stage.querySelector('.scenario-choices');
    if (choices) choices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    const feedback = document.createElement('div');
    feedback.className = 'scenario-feedback';
    feedback.innerHTML = `<strong>${delta > 0 ? 'Good signal' : delta < 0 ? 'Consider the tradeoff' : 'Decision recorded'}</strong><p>${escapeHtml(choice.feedback || 'Continue to see how this decision changes the conversation.')}</p>${scoreConfig.enabled && scoreConfig.showToLearner ? `<span>${escapeHtml(scoreConfig.label)}: ${score}</span>` : ''}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'primary-control';
    next.textContent = outcomes.has(choice.targetId) ? 'See outcome →' : 'Continue →';
    next.addEventListener('click', () => {
      currentId = choice.targetId;
      renderCurrent();
    });
    feedback.appendChild(next);
    card?.appendChild(feedback);
    setStatus(`${history.length} decision${history.length === 1 ? '' : 's'} made.`);
  }

  function renderNode(node) {
    stage.innerHTML = '';
    const card = document.createElement('article');
    card.className = 'scenario-card';
    card.innerHTML = `${scoreMarkup()}<span class="scenario-eyebrow">Decision ${history.length + 1}</span>${node.speaker ? `<div class="scenario-speaker">${escapeHtml(node.speaker)}</div>` : ''}<h3>${escapeHtml(node.title || 'Decision')}</h3>`;
    const image = createImage(node.image, node.alt || node.title);
    if (image) card.appendChild(image);
    if (node.body) {
      const body = document.createElement('p');
      body.className = 'scenario-body';
      body.textContent = node.body;
      card.appendChild(body);
    }
    const prompt = document.createElement('div');
    prompt.className = 'scenario-prompt';
    prompt.textContent = 'What do you do next?';
    const choices = document.createElement('div');
    choices.className = 'scenario-choices';
    (node.choices || []).forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scenario-choice';
      button.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(choice.text || `Choice ${index + 1}`)}</strong>`;
      button.addEventListener('click', () => choose(node, choice));
      choices.appendChild(button);
    });
    card.append(prompt, choices);
    renderPath(card);
    stage.appendChild(card);
    setStatus(`${history.length} decision${history.length === 1 ? '' : 's'} made.`);
  }

  function renderCurrent() {
    const outcome = outcomes.get(currentId);
    if (outcome) {
      renderOutcome(outcome);
      return;
    }
    const node = nodes.get(currentId);
    if (!node) {
      stage.innerHTML = `<div class="empty-state"><strong>Scenario path is incomplete</strong><span>The target “${escapeHtml(currentId)}” does not exist.</span></div>`;
      setStatus('Scenario configuration error.');
      return;
    }
    renderNode(node);
  }

  renderCurrent();
})();
