document.documentElement.classList.add('js');

function setTab(button) {
  const tabs = button.closest('[data-tabs]');
  if (!tabs) return;
  const targetId = button.getAttribute('data-tab-target');

  for (const candidate of tabs.querySelectorAll('[role="tab"]')) {
    const selected = candidate === button;
    candidate.setAttribute('aria-selected', selected ? 'true' : 'false');
    candidate.tabIndex = selected ? 0 : -1;
  }
  for (const panel of tabs.querySelectorAll('[role="tabpanel"]')) {
    panel.classList.toggle('active', panel.id === targetId);
  }
}

const units = [...document.querySelectorAll('[data-unit]')];
const navLinks = [...document.querySelectorAll('[data-nav-unit]')];
const completed = new Set();
const progressFill = document.querySelector('[data-progress-fill]');
const progressLabel = document.querySelector('[data-progress-label]');

function updateProgress() {
  const percent = units.length ? Math.round((completed.size / units.length) * 100) : 0;
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressLabel) progressLabel.textContent = `${percent}%`;
}

function navLinkForUnit(id) {
  return navLinks.find((link) => link.dataset.navUnit === id) || null;
}

function markComplete(unit) {
  if (!unit?.id || completed.has(unit.id)) return;
  completed.add(unit.id);
  unit.dataset.complete = 'true';
  const link = navLinkForUnit(unit.id);
  if (link) {
    link.classList.add('visited');
    link.setAttribute('data-complete', 'true');
  }
  updateProgress();
}

function setActiveUnit(id) {
  for (const link of navLinks) {
    link.classList.toggle('active', link.dataset.navUnit === id);
  }
}

document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab-target]');
  if (tab) setTab(tab);

  const nextAction = event.target.closest('.unit-next, .course-complete .pill-link');
  if (nextAction) {
    markComplete(nextAction.closest('[data-unit]'));
  }

  const menuButton = event.target.closest('.menu-button');
  if (menuButton) {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (event.target.closest('[data-nav-scrim]') || event.target.closest('.course-nav a')) {
    document.body.classList.remove('nav-open');
    document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', (event) => {
  const activeTab = event.target.closest('[role="tab"]');
  if (activeTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const tabList = [...activeTab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
    let index = tabList.indexOf(activeTab);
    if (event.key === 'ArrowRight') index = (index + 1) % tabList.length;
    if (event.key === 'ArrowLeft') index = (index - 1 + tabList.length) % tabList.length;
    if (event.key === 'Home') index = 0;
    if (event.key === 'End') index = tabList.length - 1;
    event.preventDefault();
    setTab(tabList[index]);
    tabList[index].focus();
  }

  if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    document.body.classList.remove('nav-open');
    const menuButton = document.querySelector('.menu-button');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.focus();
  }
});

for (const tabs of document.querySelectorAll('[data-tabs]')) {
  const tabButtons = [...tabs.querySelectorAll('[role="tab"]')];
  tabButtons.forEach((button, index) => { button.tabIndex = index === 0 ? 0 : -1; });
}

if (units[0]) setActiveUnit(units[0].id);

if ('IntersectionObserver' in window) {
  // Active state follows the beginning of each unit. This works for both short and very long lessons.
  const activeObserver = new IntersectionObserver((entries) => {
    const entering = entries.filter((entry) => entry.isIntersecting);
    if (!entering.length) return;
    entering.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    const unit = entering[0].target.closest('[data-unit]');
    if (unit) setActiveUnit(unit.id);
  }, { rootMargin: '-8% 0px -78% 0px', threshold: 0 });

  for (const unit of units) {
    activeObserver.observe(unit.querySelector('.unit-header') || unit);
  }

  // Completion is based on reaching the end of a unit, not on the percentage of the whole unit visible.
  const completionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const unit = entry.target.closest('[data-unit]');
      if (unit) markComplete(unit);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.25 });

  for (const unit of units) {
    const footer = unit.querySelector('.unit-footer');
    if (footer) completionObserver.observe(footer);
  }
} else {
  // Older browsers still get functional navigation and completion via the Continue buttons.
  units.forEach((unit) => unit.classList.add('is-visible'));
}

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id) setActiveUnit(id);
});

updateProgress();
