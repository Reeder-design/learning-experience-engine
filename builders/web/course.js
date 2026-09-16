document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab-target]');
  if (!button) return;

  const tabs = button.closest('[data-tabs]');
  if (!tabs) return;

  const targetId = button.getAttribute('data-tab-target');
  for (const candidate of tabs.querySelectorAll('[role="tab"]')) {
    candidate.setAttribute('aria-selected', candidate === button ? 'true' : 'false');
  }
  for (const panel of tabs.querySelectorAll('[role="tabpanel"]')) {
    panel.classList.toggle('active', panel.id === targetId);
  }
});
