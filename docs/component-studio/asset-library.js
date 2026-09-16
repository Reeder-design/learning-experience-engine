(() => {
  const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg','bmp']);
  const VIDEO_EXT = new Set(['mp4','webm','mov','m4v']);
  const AUDIO_EXT = new Set(['mp3','wav','m4a','aac','ogg']);
  const CAPTION_EXT = new Set(['vtt','srt']);
  const DOCUMENT_EXT = new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx']);
  const CONTEXT_EXT = new Set(['txt','md','markdown','csv','json']);

  const state = {
    rootName: null,
    files: [],
    objectUrls: new Map(),
    context: [],
    activePathInput: null,
    augmentingJson: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function ext(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function classify(file, path) {
    const extension = ext(file.name);
    const lowerPath = String(path || '').toLowerCase();
    if (IMAGE_EXT.has(extension)) return 'image';
    if (VIDEO_EXT.has(extension)) return 'video';
    if (AUDIO_EXT.has(extension)) return 'audio';
    if (CAPTION_EXT.has(extension)) return 'caption';
    if (extension === 'pdf') return 'pdf';
    if (DOCUMENT_EXT.has(extension)) return 'document';
    if (CONTEXT_EXT.has(extension) || lowerPath.includes('/context/') || lowerPath.startsWith('context/')) return 'context';
    return 'other';
  }

  function normalizeSelectedPath(file, rootName = null) {
    const original = file.webkitRelativePath || file.name;
    const parts = original.split('/').filter(Boolean);
    if (rootName && parts[0] === rootName) parts.shift();
    if (file.webkitRelativePath) return parts.join('/');

    const kind = classify(file, file.name);
    const folder = {
      image: 'assets/images',
      video: 'assets/video',
      audio: 'assets/audio',
      caption: 'assets/captions',
      pdf: 'assets/documents',
      document: 'assets/documents',
      context: 'context',
      other: 'assets/other',
    }[kind] || 'assets/other';
    return `${folder}/${file.name}`;
  }

  function revokeObjectUrls() {
    for (const url of state.objectUrls.values()) URL.revokeObjectURL(url);
    state.objectUrls.clear();
  }

  function displaySize(bytes) {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function iconFor(kind) {
    return { image:'▧', video:'▶', audio:'♪', caption:'CC', pdf:'PDF', document:'DOC', context:'TXT', other:'•' }[kind] || '•';
  }

  function compatiblePaths(labelText) {
    const label = String(labelText || '').toLowerCase();
    let kinds = [];
    if (label.includes('image')) kinds = ['image'];
    else if (label.includes('media')) kinds = ['video','audio'];
    else if (label.includes('caption') || label.includes('vtt')) kinds = ['caption'];
    else if (label.includes('document') || label.includes('pdf')) kinds = ['pdf','document'];
    else kinds = ['image','video','audio','caption','pdf','document','context','other'];
    return state.files.filter((entry) => kinds.includes(entry.kind));
  }

  function attachPathPickers() {
    $$('.general-fields label, .dynamic-editor label').forEach((label, index) => {
      const title = $('span', label)?.textContent || '';
      const input = $('input', label);
      if (!input || !/path/i.test(title)) return;

      input.dataset.assetPathField = 'true';
      const listId = `asset-path-options-${index}`;
      let list = document.getElementById(listId);
      if (!list) {
        list = document.createElement('datalist');
        list.id = listId;
        document.body.appendChild(list);
      }
      input.setAttribute('list', listId);
      list.innerHTML = '';
      compatiblePaths(title).forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.path;
        option.label = `${entry.kind} · ${entry.name}`;
        list.appendChild(option);
      });
      input.addEventListener('focus', () => { state.activePathInput = input; }, { once: false });
    });
  }

  function setInputValue(input, value) {
    if (!input) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function chooseTarget(entry) {
    if (state.activePathInput && document.contains(state.activePathInput)) {
      const label = state.activePathInput.closest('label');
      const title = $('span', label)?.textContent || '';
      if (compatiblePaths(title).some((candidate) => candidate.path === entry.path)) {
        setInputValue(state.activePathInput, entry.path);
        return;
      }
    }

    const pathInputs = $$('input[data-asset-path-field="true"]');
    const preferred = pathInputs.find((input) => {
      const title = $('span', input.closest('label'))?.textContent || '';
      return compatiblePaths(title).some((candidate) => candidate.path === entry.path) && (!input.value || /^assets\/(image|video|audio|media)\./i.test(input.value));
    }) || pathInputs.find((input) => {
      const title = $('span', input.closest('label'))?.textContent || '';
      return compatiblePaths(title).some((candidate) => candidate.path === entry.path);
    });

    if (preferred) {
      setInputValue(preferred, entry.path);
      preferred.focus();
    }
  }

  function autoFillVisiblePaths() {
    const used = new Set();
    $$('input[data-asset-path-field="true"]').forEach((input) => {
      const title = $('span', input.closest('label'))?.textContent || '';
      const candidates = compatiblePaths(title).filter((entry) => !used.has(entry.path));
      const candidate = candidates[0];
      if (!candidate) return;
      const shouldReplace = !input.value || /^assets\/(video\.mp4|audio\.mp3|media\.mp4)$/i.test(input.value);
      if (shouldReplace) {
        setInputValue(input, candidate.path);
        used.add(candidate.path);

        if (/media path/i.test(title)) {
          const card = input.closest('.repeat-card');
          const typeSelect = card && $$('label', card).find((label) => $('span', label)?.textContent === 'Type')?.querySelector('select');
          if (typeSelect && (candidate.kind === 'video' || candidate.kind === 'audio')) {
            typeSelect.value = candidate.kind;
            typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  }

  async function readContextFiles(entries) {
    state.context = [];
    for (const entry of entries.filter((item) => item.kind === 'context')) {
      try {
        const text = await entry.file.text();
        state.context.push({ path: entry.path, text });
      } catch (_) {}
    }
  }

  function projectMetadata(model) {
    if (!state.files.length) return model;
    const clone = structuredClone(model);
    clone.metadata = clone.metadata || {};
    clone.metadata.projectPackage = {
      root: state.rootName,
      importedInStudio: true,
      files: state.files.map((entry) => ({
        path: entry.path,
        kind: entry.kind,
        size: entry.file.size,
        mediaType: entry.file.type || null,
      })),
      sourceContext: state.context.map((entry) => ({ path: entry.path, text: entry.text })),
    };
    return clone;
  }

  function currentStudioJson() {
    const output = $('[data-json-output]');
    if (!output) return null;
    try { return JSON.parse(output.textContent); } catch (_) { return null; }
  }

  function augmentedJson() {
    const model = currentStudioJson();
    return model ? projectMetadata(model) : null;
  }

  function updateDisplayedJson() {
    if (state.augmentingJson || !state.files.length) return;
    const output = $('[data-json-output]');
    if (!output) return;
    let raw;
    try { raw = JSON.parse(output.textContent); } catch (_) { return; }
    if (raw?.metadata?.projectPackage) return;
    state.augmentingJson = true;
    output.textContent = JSON.stringify(projectMetadata(raw), null, 2);
    state.augmentingJson = false;
  }

  function pathToUrl(path) {
    return state.objectUrls.get(path) || null;
  }

  function updateLocalPreview() {
    if (!state.files.length) return;
    const model = augmentedJson();
    if (!model) return;

    if (model.type === 'carousel') {
      $$('.preview-card').forEach((card) => {
        const title = $('h3', card)?.textContent;
        const item = model.content?.items?.find((candidate) => candidate.title === title);
        const url = item?.image && pathToUrl(item.image);
        const visual = $('.preview-visual', card);
        if (url && visual) {
          visual.innerHTML = '';
          const image = document.createElement('img');
          image.src = url;
          image.alt = item.alt || item.title || '';
          image.className = 'asset-preview-image';
          visual.appendChild(image);
        }
      });
    }

    if (model.type === 'hotspot-reveal') {
      const canvas = $('.hotspot-canvas');
      const path = model.content?.background?.image;
      const url = path && pathToUrl(path);
      if (canvas && url) {
        canvas.style.backgroundImage = `linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,.08)),url("${url}")`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
      }
    }

    if (model.type === 'media-presentation') {
      const title = $('.preview-media-card h3')?.textContent;
      const item = model.content?.media?.find((candidate) => candidate.title === title);
      const url = item?.src && pathToUrl(item.src);
      const placeholder = $('.preview-media-card .media-placeholder');
      if (item && url && placeholder) {
        const media = document.createElement(item.kind === 'audio' ? 'audio' : 'video');
        media.src = url;
        media.controls = true;
        media.preload = 'metadata';
        media.className = 'asset-preview-media';

        const base = item.src.replace(/\.[^.]+$/, '').split('/').pop();
        const caption = state.files.find((entry) => entry.kind === 'caption' && entry.name.replace(/\.[^.]+$/, '') === base);
        if (caption && item.kind === 'video') {
          const track = document.createElement('track');
          track.kind = 'captions';
          track.label = 'Captions';
          track.srclang = 'en';
          track.src = pathToUrl(caption.path);
          media.appendChild(track);
        }
        placeholder.replaceWith(media);
      }
    }
  }

  function renderLibrary() {
    const list = $('[data-asset-list]');
    const context = $('[data-context-list]');
    const summary = $('[data-asset-summary]');
    if (!list || !context || !summary) return;

    summary.textContent = state.files.length
      ? `${state.files.length} files · ${state.rootName || 'selected files'}`
      : 'No project files imported';

    list.innerHTML = '';
    const nonContext = state.files.filter((entry) => entry.kind !== 'context');
    if (!nonContext.length) list.innerHTML = '<p class="asset-empty">No assets selected yet.</p>';
    nonContext.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'asset-row';
      row.innerHTML = `<span class="asset-kind">${iconFor(entry.kind)}</span><span class="asset-info"><strong>${entry.name}</strong><small>${entry.path} · ${displaySize(entry.file.size)}</small></span>`;
      const use = document.createElement('button');
      use.type = 'button';
      use.textContent = 'Use';
      use.addEventListener('click', () => chooseTarget(entry));
      row.appendChild(use);
      list.appendChild(row);
    });

    context.innerHTML = '';
    if (!state.context.length) context.innerHTML = '<p class="asset-empty">No .txt, .md, .csv, or .json context files found.</p>';
    state.context.forEach((entry) => {
      const details = document.createElement('details');
      details.className = 'context-file';
      const summaryEl = document.createElement('summary');
      summaryEl.textContent = entry.path;
      const pre = document.createElement('pre');
      pre.textContent = entry.text;
      details.append(summaryEl, pre);
      context.appendChild(details);
    });
  }

  async function importFiles(fileList, fromFolder) {
    const files = [...fileList];
    if (!files.length) return;
    revokeObjectUrls();

    let rootName = null;
    if (fromFolder && files[0]?.webkitRelativePath) rootName = files[0].webkitRelativePath.split('/')[0] || null;
    state.rootName = rootName || 'component-project';
    state.files = files.map((file) => {
      const path = normalizeSelectedPath(file, rootName);
      const kind = classify(file, path);
      if (['image','video','audio','caption','pdf'].includes(kind)) state.objectUrls.set(path, URL.createObjectURL(file));
      return { file, path, kind, name: file.name };
    }).sort((a,b) => a.path.localeCompare(b.path));

    await readContextFiles(state.files);
    renderLibrary();
    attachPathPickers();
    autoFillVisiblePaths();
    updateDisplayedJson();
    setTimeout(updateLocalPreview, 0);
    document.body.classList.add('asset-library-open');
  }

  function installUi() {
    const actions = $('.header-actions');
    if (!actions) return;

    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.multiple = true;
    folderInput.setAttribute('webkitdirectory', '');
    folderInput.hidden = true;
    folderInput.addEventListener('change', () => importFiles(folderInput.files, true));

    const filesInput = document.createElement('input');
    filesInput.type = 'file';
    filesInput.multiple = true;
    filesInput.accept = '.txt,.md,.markdown,.csv,.json,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.mp4,.webm,.mov,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.vtt,.srt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
    filesInput.hidden = true;
    filesInput.addEventListener('change', () => importFiles(filesInput.files, false));

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'ghost asset-import-button';
    importButton.textContent = 'Project Assets';
    importButton.addEventListener('click', () => document.body.classList.toggle('asset-library-open'));
    actions.prepend(importButton);
    actions.append(folderInput, filesInput);

    const drawer = document.createElement('aside');
    drawer.className = 'asset-library';
    drawer.innerHTML = `
      <div class="asset-library-head">
        <div><span class="eyebrow">Project package</span><h2>Asset Library</h2><p data-asset-summary>No project files imported</p></div>
        <button type="button" data-close-assets aria-label="Close asset library">×</button>
      </div>
      <div class="asset-import-actions">
        <button type="button" class="asset-primary" data-import-folder>Choose project folder</button>
        <button type="button" data-import-files>Choose files</button>
        <button type="button" data-auto-fill>Auto-fill paths</button>
      </div>
      <p class="asset-help">Recommended folders: <code>context/</code>, <code>assets/images/</code>, <code>assets/video/</code>, <code>assets/audio/</code>, <code>assets/captions/</code>, and <code>assets/documents/</code>. The structure is helpful, not mandatory.</p>
      <div class="asset-library-section"><h3>Assets</h3><div data-asset-list><p class="asset-empty">No assets selected yet.</p></div></div>
      <div class="asset-library-section"><h3>Source context</h3><div data-context-list><p class="asset-empty">No source context imported.</p></div></div>
      <div class="asset-privacy"><strong>Local only</strong><span>Selected files stay in your browser session. Component Studio does not upload them to GitHub.</span></div>
    `;
    document.body.appendChild(drawer);

    const scrim = document.createElement('div');
    scrim.className = 'asset-library-scrim';
    scrim.addEventListener('click', () => document.body.classList.remove('asset-library-open'));
    document.body.appendChild(scrim);

    $('[data-close-assets]', drawer).addEventListener('click', () => document.body.classList.remove('asset-library-open'));
    $('[data-import-folder]', drawer).addEventListener('click', () => folderInput.click());
    $('[data-import-files]', drawer).addEventListener('click', () => filesInput.click());
    $('[data-auto-fill]', drawer).addEventListener('click', () => { attachPathPickers(); autoFillVisiblePaths(); setTimeout(updateLocalPreview, 0); });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') document.body.classList.remove('asset-library-open');
    });
  }

  function interceptExports() {
    const copy = $('[data-copy]');
    const download = $('[data-download]');

    copy?.addEventListener('click', async (event) => {
      if (!state.files.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const model = augmentedJson();
      if (!model) return;
      try {
        await navigator.clipboard.writeText(JSON.stringify(model, null, 2));
        const old = copy.textContent;
        copy.textContent = 'Copied ✓';
        setTimeout(() => { copy.textContent = old; }, 1200);
      } catch (_) {}
    }, true);

    download?.addEventListener('click', (event) => {
      if (!state.files.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const model = augmentedJson();
      if (!model) return;
      const blob = new Blob([`${JSON.stringify(model, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${model.id || model.type || 'component'}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }, true);
  }

  function observeStudio() {
    const editor = $('[data-dynamic-editor]');
    if (editor) {
      new MutationObserver(() => {
        attachPathPickers();
        setTimeout(updateLocalPreview, 0);
      }).observe(editor, { childList: true, subtree: true });
    }

    const json = $('[data-json-output]');
    if (json) {
      new MutationObserver(() => {
        if (state.augmentingJson) return;
        updateDisplayedJson();
        setTimeout(updateLocalPreview, 0);
      }).observe(json, { childList: true, characterData: true, subtree: true });
    }
  }

  installUi();
  interceptExports();
  observeStudio();
  attachPathPickers();
  window.addEventListener('beforeunload', revokeObjectUrls);
})();
