(() => {
  function installWorkflowAssets() {
    const workflowButton = document.querySelector('[data-open-assets]');
    if (!workflowButton) return;

    const headerAssetButton = document.querySelector('.asset-import-button');
    if (headerAssetButton) headerAssetButton.remove();

    workflowButton.addEventListener('click', () => {
      document.body.classList.toggle('asset-library-open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installWorkflowAssets, { once: true });
  } else {
    installWorkflowAssets();
  }
})();
