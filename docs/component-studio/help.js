(() => {
  const topics = {
    choose: {
      title: 'Choose an interaction type',
      body: 'Start by choosing the interaction pattern that matches the learning task. Switching types resets the current draft to that component template.',
      href: '../user-guide/#choose-a-component'
    },
    basics: {
      title: 'Component basics',
      body: 'Title names the interaction, Description explains its purpose, and Learner instruction tells the learner what to do. These values travel with the component JSON.',
      href: '../user-guide/#author-the-basics'
    },
    component: {
      title: 'Component-specific fields',
      body: 'These fields change with the interaction type. Add content items, hotspots, questions, or media segments here. Asset-path fields can be filled from Project Assets.',
      href: '../user-guide/#component-fields'
    },
    preview: {
      title: 'Learner preview',
      body: 'Use this pane to test the interaction as a learner. Completion state is simulated here so you can verify the expected learner flow before exporting.',
      href: '../user-guide/#preview-and-test'
    },
    json: {
      title: 'Generated JSON',
      body: 'This is the engine-native file behind the interaction. You usually do not need to edit it manually; Studio keeps it synchronized with the form.',
      href: '../user-guide/#generated-json'
    },
    export: {
      title: 'Export options',
      body: 'Export JSON saves only the component definition. Export Project ZIP from Project Assets bundles component.json with the selected context and asset files.',
      href: '../user-guide/#save-and-export'
    },
    assets: {
      title: 'Project Assets',
      body: 'Choose a project folder or files from your computer. Studio classifies images, video, audio, captions, documents, and context files and can fill portable relative paths automatically. Files remain local to your browser session.',
      href: '../user-guide/#project-assets'
    },
    carousel: {
      title: 'Carousel',
      body: 'Use a carousel when learners should browse a set of related items. Each item can include a title, body text, image, and alt text.',
      href: '../user-guide/#carousel'
    },
    'hotspot-reveal': {
      title: 'Hotspot reveal',
      body: 'Use hotspot reveal for maps, diagrams, workflows, or visual exploration. Set a background image, then position each hotspot with X/Y percentages.',
      href: '../user-guide/#hotspot-reveal'
    },
    assessment: {
      title: 'Assessment',
      body: 'Use assessment for focused questions with immediate feedback. Mark the correct answer and write feedback learners receive after selecting an option.',
      href: '../user-guide/#assessment'
    },
    'media-presentation': {
      title: 'Media presentation',
      body: 'Use media presentation to organize video or audio into a guided sequence. Media paths can be selected from Project Assets, and matching VTT caption files are recognized in local preview.',
      href: '../user-guide/#media-presentation'
    }
  };

  let popover;
  let activeButton;

  function createPopover() {
    popover = document.createElement('aside');
    popover.className = 'help-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-live', 'polite');
    popover.innerHTML = '<div class="help-popover-head"><h3 data-help-title></h3><button type="button" class="help-popover-close" aria-label="Close help">×</button></div><p data-help-body></p><a data-help-link href="../user-guide/">Open User Guide →</a>';
    document.body.appendChild(popover);
    popover.querySelector('.help-popover-close').addEventListener('click', closePopover);
  }

  function closePopover() {
    if (!popover) return;
    popover.classList.remove('open');
    activeButton?.setAttribute('aria-expanded', 'false');
    activeButton = null;
  }

  function resolvedTopic(button) {
    let key = button.dataset.helpTopic;
    if (key === 'component') {
      const activeType = document.querySelector('[data-type].active')?.dataset.type;
      if (activeType && topics[activeType]) key = activeType;
    }
    return topics[key] || topics.component;
  }

  function position(button) {
    const rect = button.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 28);
    let left = Math.max(14, Math.min(window.innerWidth - width - 14, rect.left + rect.width / 2 - width / 2));
    let top = rect.bottom + 10;
    if (top + 220 > window.innerHeight) top = Math.max(14, rect.top - 220);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function openPopover(button) {
    if (!popover) createPopover();
    const topic = resolvedTopic(button);
    if (activeButton && activeButton !== button) activeButton.setAttribute('aria-expanded', 'false');
    activeButton = button;
    button.setAttribute('aria-expanded', 'true');
    popover.querySelector('[data-help-title]').textContent = topic.title;
    popover.querySelector('[data-help-body]').textContent = topic.body;
    popover.querySelector('[data-help-link]').href = topic.href;
    position(button);
    popover.classList.add('open');
  }

  function enhanceButton(button) {
    if (button.dataset.helpReady === 'true') return;
    button.dataset.helpReady = 'true';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', button.getAttribute('aria-label') || 'Help for this section');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (activeButton === button && popover?.classList.contains('open')) closePopover();
      else openPopover(button);
    });
  }

  function installAssetHelp() {
    const head = document.querySelector('.asset-library-head h2');
    if (!head || head.parentElement.querySelector('[data-help-topic="assets"]')) return;
    const row = document.createElement('div');
    row.className = 'section-title-row';
    head.replaceWith(row);
    row.appendChild(head);
    const help = document.createElement('button');
    help.type = 'button';
    help.className = 'help-bubble asset-help-bubble';
    help.dataset.helpTopic = 'assets';
    help.textContent = '?';
    row.appendChild(help);
    enhanceButton(help);
  }

  document.querySelectorAll('.help-bubble').forEach(enhanceButton);
  installAssetHelp();
  new MutationObserver(() => installAssetHelp()).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    if (!popover?.classList.contains('open')) return;
    if (popover.contains(event.target) || event.target.closest('.help-bubble')) return;
    closePopover();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePopover(); });
  window.addEventListener('resize', () => { if (activeButton && popover?.classList.contains('open')) position(activeButton); });
  window.addEventListener('scroll', () => { if (activeButton && popover?.classList.contains('open')) position(activeButton); }, true);
})();
