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

document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab-target]');
  if (tab) setTab(tab);

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

const units = [...document.querySelectorAll('[data-unit]')];
const navLinks = [...document.querySelectorAll('[data-nav-unit]')];
const visited = new Set();
const progressFill = document.querySelector('[data-progress-fill]');
const progressLabel = document.querySelector('[data-progress-label]');

function updateProgress() {
  const percent = units.length ? Math.round((visited.size / units.length) * 100) : 0;
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressLabel) progressLabel.textContent = `${percent}%`;
}

function setActiveUnit(id) {
  for (const link of navLinks) {
    link.classList.toggle('active', link.dataset.navUnit === id);
  }
}

if ('IntersectionObserver' in window) {
  const unitObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        visited.add(entry.target.id);
        document.querySelector(`[data-nav-unit="${CSS.escape(entry.target.id)}"]`)?.classList.add('visited');
      }
    }

    if (visible[0]) setActiveUnit(visible[0].target.id);
    updateProgress();
  }, { rootMargin: '-15% 0px -45% 0px', threshold: [0.05, 0.2, 0.45] });

  units.forEach((unit) => unitObserver.observe(unit));
} else {
  units.forEach((unit) => unit.classList.add('is-visible'));
}

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id) setActiveUnit(id);
});

updateProgress();
