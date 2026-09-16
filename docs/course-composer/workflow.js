(() => {
  const button = document.querySelector('[data-help="assets"]');
  const popover = document.querySelector('[data-help-popover]');
  if (!button || !popover) return;

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const title = popover.querySelector('[data-help-title]');
    const body = popover.querySelector('[data-help-body]');
    if (title) title.textContent = 'Project Assets';
    if (body) body.textContent = 'Load the shared course files after you have the structure in place and before learner preview. Images, video, audio, captions, PDFs, and source context stay local to your browser session and use portable relative paths in the course.';
    const rect = button.getBoundingClientRect();
    const width = Math.min(350, window.innerWidth - 28);
    popover.style.left = `${Math.max(14, Math.min(window.innerWidth - width - 14, rect.left + rect.width / 2 - width / 2))}px`;
    popover.style.top = `${Math.min(window.innerHeight - 210, rect.bottom + 10)}px`;
    popover.classList.add('open');
    popover.setAttribute('aria-hidden', 'false');
  });
})();
