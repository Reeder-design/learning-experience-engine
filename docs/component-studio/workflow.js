(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function drawerButton(label) {
    return $$('.asset-import-actions button').find((button) => button.textContent.trim().toLowerCase() === label.toLowerCase()) || null;
  }

  function syncAssetSummary() {
    const source = $('[data-asset-summary]');
    const target = $('[data-workflow-asset-summary]');
    if (!source || !target) return;
    target.textContent = source.textContent || 'No project files imported';
  }

  function openAssetLibrary() {
    document.body.classList.add('asset-library-open');
  }

  function install() {
    document.querySelector('.asset-import-button')?.remove();

    $('[data-open-assets]')?.addEventListener('click', openAssetLibrary);
    $('[data-asset-folder]')?.addEventListener('click', () => drawerButton('Choose project folder')?.click());
    $('[data-asset-files]')?.addEventListener('click', () => drawerButton('Choose files')?.click());

    $('[data-export-project]')?.addEventListener('click', () => {
      const button = drawerButton('Export project ZIP');
      if (button) button.click();
      else window.alert('Project ZIP tools are still loading. Try again in a moment.');
    });

    $('[data-preview-focus]')?.addEventListener('click', () => {
      const frame = $('.preview-frame');
      frame?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      frame?.classList.add('reviewing');
      setTimeout(() => frame?.classList.remove('reviewing'), 1400);
    });

    $('[data-preview-refresh]')?.addEventListener('click', () => {
      const title = $('[data-field="title"]');
      if (!title) return;
      title.dispatchEvent(new Event('input', { bubbles: true }));
      const frame = $('.preview-frame');
      frame?.classList.add('reviewing');
      setTimeout(() => frame?.classList.remove('reviewing'), 900);
    });

    const waitForSummary = () => {
      const source = $('[data-asset-summary]');
      if (!source) return setTimeout(waitForSummary, 50);
      syncAssetSummary();
      new MutationObserver(syncAssetSummary).observe(source, { childList: true, characterData: true, subtree: true });
    };
    waitForSummary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
