(() => {
  const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg','bmp']);
  const VIDEO_EXT = new Set(['mp4','webm','mov','m4v']);
  const AUDIO_EXT = new Set(['mp3','wav','m4a','aac','ogg']);
  const CAPTION_EXT = new Set(['vtt','srt']);
  const DOCUMENT_EXT = new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx']);
  const CONTEXT_EXT = new Set(['txt','md','markdown','csv','json']);
  const tracked = { files: [], rootName: null };
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function extension(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function classify(file, path) {
    const ext = extension(file.name);
    const lower = String(path || '').toLowerCase();
    if (IMAGE_EXT.has(ext)) return 'image';
    if (VIDEO_EXT.has(ext)) return 'video';
    if (AUDIO_EXT.has(ext)) return 'audio';
    if (CAPTION_EXT.has(ext)) return 'caption';
    if (ext === 'pdf') return 'pdf';
    if (DOCUMENT_EXT.has(ext)) return 'document';
    if (CONTEXT_EXT.has(ext) || lower.includes('/context/') || lower.startsWith('context/')) return 'context';
    return 'other';
  }

  function normalizedPath(file, rootName = null) {
    const original = file.webkitRelativePath || file.name;
    const parts = original.split('/').filter(Boolean);
    if (rootName && parts[0] === rootName) parts.shift();
    if (file.webkitRelativePath) return parts.join('/');
    const kind = classify(file, file.name);
    const folder = {
      image: 'assets/images', video: 'assets/video', audio: 'assets/audio', caption: 'assets/captions',
      pdf: 'assets/documents', document: 'assets/documents', context: 'context', other: 'assets/other',
    }[kind] || 'assets/other';
    return `${folder}/${file.name}`;
  }

  function trackInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || input.dataset.projectZipInput === 'true') return;
    const files = [...(input.files || [])];
    if (!files.length) return;
    const fromFolder = input.hasAttribute('webkitdirectory');
    const rootName = fromFolder && files[0]?.webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : null;
    tracked.rootName = rootName || 'component-project';
    tracked.files = files
      .filter((file) => !/(^|\/)component\.json$/i.test(file.webkitRelativePath || file.name))
      .map((file) => ({ file, path: normalizedPath(file, rootName) }));
  }

  document.addEventListener('change', (event) => trackInput(event.target), true);

  function crcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  }
  const CRC_TABLE = crcTable();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  async function buildZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = dosTime();

    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.path.replace(/^\/+/, ''));
      const data = entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
      const crc = crc32(data);

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, now.time); u16(lv, 12, now.day); u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length);
      u16(lv, 26, nameBytes.length); u16(lv, 28, 0); local.set(nameBytes, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0);
      u16(cv, 12, now.time); u16(cv, 14, now.day); u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length);
      u16(cv, 28, nameBytes.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(nameBytes, 46); centralParts.push(central);
      offset += local.length + data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, entries.length); u16(ev, 10, entries.length);
    u32(ev, 12, centralSize); u32(ev, 16, offset); u16(ev, 20, 0);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  async function exportProjectZip() {
    let model;
    try { model = JSON.parse($('[data-json-output]')?.textContent || ''); } catch (_) { return; }
    if (!model) return;

    const componentBytes = encoder.encode(`${JSON.stringify(model, null, 2)}\n`);
    const entries = [{ path: 'component.json', bytes: componentBytes }];
    for (const item of tracked.files) {
      entries.push({ path: item.path, bytes: new Uint8Array(await item.file.arrayBuffer()) });
    }

    const blob = await buildZip(entries);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.id || model.type || 'component'}-project.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function findEnd(view) {
    const min = Math.max(0, view.byteLength - 65557);
    for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) return offset;
    }
    return -1;
  }

  async function inflateRaw(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('This browser cannot open compressed ZIP files. Studio-created ZIPs will still import because they use portable stored entries.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZip(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const endOffset = findEnd(view);
    if (endOffset < 0) throw new Error('Not a valid ZIP archive.');
    const count = view.getUint16(endOffset + 10, true);
    let cursor = view.getUint32(endOffset + 16, true);
    const output = [];

    for (let index = 0; index < count; index += 1) {
      if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('ZIP directory is damaged or unsupported.');
      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
      cursor += 46 + nameLength + extraLength + commentLength;
      if (name.endsWith('/')) continue;

      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Cannot read ${name}.`);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
      let bytes;
      if (method === 0) bytes = new Uint8Array(compressed);
      else if (method === 8) bytes = await inflateRaw(compressed);
      else throw new Error(`ZIP compression method ${method} is not supported for ${name}.`);
      output.push({ path: name.replace(/^\.\//, ''), bytes });
    }
    return output;
  }

  function fieldByLabel(root, labelText) {
    return $$('label', root).find((label) => $('span', label)?.textContent.trim() === labelText)?.querySelector('input,textarea,select') || null;
  }

  function setField(field, value) {
    if (!field) return;
    field.value = value ?? '';
    field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }

  function buttonByText(root, text) {
    return $$('button', root).find((button) => button.textContent.trim() === text) || null;
  }

  function directCards(root) { return [...root.children].filter((node) => node.classList?.contains('repeat-card')); }

  function ensureCards(container, count, addLabel) {
    let guard = 0;
    while (directCards(container).length < count && guard++ < 100) buttonByText(container, addLabel)?.click();
    guard = 0;
    while (directCards(container).length > count && guard++ < 100) {
      const cards = directCards(container);
      buttonByText(cards[cards.length - 1], 'Remove')?.click();
    }
  }

  function applyModel(model) {
    if (!model?.type) return;
    $(`[data-type="${model.type}"]`)?.click();
    setField($('[data-field="title"]'), model.title || '');
    setField($('[data-field="description"]'), model.description || '');
    setField($('[data-field="instruction"]'), model.instruction || '');
    const editor = $('[data-dynamic-editor] .editor-group');
    if (!editor) return;

    if (model.type === 'carousel') {
      setField(fieldByLabel(editor, 'Items per page'), model.content?.pageSize || 3);
      const items = model.content?.items || [];
      ensureCards(editor, items.length, '+ Add item');
      directCards(editor).forEach((card, index) => {
        const item = items[index] || {};
        setField(fieldByLabel(card, 'Title'), item.title || '');
        setField(fieldByLabel(card, 'ID'), item.id || `item-${index + 1}`);
        setField(fieldByLabel(card, 'Body'), item.body || '');
        setField(fieldByLabel(card, 'Image path'), item.image || '');
        setField(fieldByLabel(card, 'Alt text'), item.alt || '');
      });
    }

    if (model.type === 'hotspot-reveal') {
      setField(fieldByLabel(editor, 'Image path'), model.content?.background?.image || '');
      setField(fieldByLabel(editor, 'Alt text'), model.content?.background?.alt || '');
      const hotspots = model.content?.hotspots || [];
      ensureCards(editor, hotspots.length, '+ Add hotspot');
      directCards(editor).forEach((card, index) => {
        const item = hotspots[index] || {};
        setField(fieldByLabel(card, 'Label'), item.label || '');
        setField(fieldByLabel(card, 'Title'), item.title || '');
        setField(fieldByLabel(card, 'X %'), item.x ?? 50);
        setField(fieldByLabel(card, 'Y %'), item.y ?? 50);
        setField(fieldByLabel(card, 'Reveal content'), item.body || '');
      });
    }

    if (model.type === 'media-presentation') {
      const media = model.content?.media || [];
      ensureCards(editor, media.length, '+ Add segment');
      directCards(editor).forEach((card, index) => {
        const item = media[index] || {};
        setField(fieldByLabel(card, 'Title'), item.title || '');
        setField(fieldByLabel(card, 'Type'), item.kind || 'video');
        setField(fieldByLabel(card, 'Media path'), item.src || '');
        setField(fieldByLabel(card, 'Caption'), item.caption || '');
        setField(fieldByLabel(card, 'Transcript'), item.transcript || '');
      });
    }

    if (model.type === 'assessment') {
      const questions = model.content?.questions || [];
      ensureCards(editor, questions.length, '+ Add question');
      directCards(editor).forEach((card, qi) => {
        const question = questions[qi] || {};
        setField(fieldByLabel(card, 'Prompt'), question.prompt || '');
        const options = question.options || [];
        ensureCards(card, options.length, '+ Add option');
        directCards(card).forEach((optionCard, oi) => {
          const option = options[oi] || {};
          setField(fieldByLabel(optionCard, 'Answer text'), option.text || '');
          setField(fieldByLabel(optionCard, 'Correct?'), option.correct ? 'yes' : 'no');
          setField(fieldByLabel(optionCard, 'Feedback'), option.feedback || '');
        });
      });
    }
  }

  function fileType(path) {
    const ext = extension(path);
    const map = {
      png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml',
      mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', m4v:'video/x-m4v', mp3:'audio/mpeg', wav:'audio/wav',
      m4a:'audio/mp4', aac:'audio/aac', ogg:'audio/ogg', vtt:'text/vtt', srt:'text/plain', pdf:'application/pdf',
      txt:'text/plain', md:'text/markdown', markdown:'text/markdown', csv:'text/csv', json:'application/json',
    };
    return map[ext] || 'application/octet-stream';
  }

  async function importProjectZip(file) {
    try {
      const entries = await readZip(file);
      const component = entries.find((entry) => /(^|\/)component\.json$/i.test(entry.path));
      if (!component) throw new Error('This ZIP does not contain component.json.');
      const model = JSON.parse(decoder.decode(component.bytes));
      applyModel(model);

      const payload = entries.filter((entry) => entry !== component).map((entry) => {
        const name = entry.path.split('/').pop();
        const f = new File([entry.bytes], name, { type: fileType(entry.path) });
        try { Object.defineProperty(f, 'webkitRelativePath', { value: entry.path, configurable: true }); } catch (_) {}
        return f;
      });

      const folderInput = $('input[type="file"][webkitdirectory]');
      if (folderInput && 'DataTransfer' in window) {
        const transfer = new DataTransfer();
        payload.forEach((f) => transfer.items.add(f));
        folderInput.files = transfer.files;
        folderInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      tracked.rootName = model.id || 'component-project';
      tracked.files = payload.map((f, index) => ({ file: f, path: entries.filter((entry) => entry !== component)[index].path }));
      document.body.classList.add('asset-library-open');
    } catch (error) {
      window.alert(`Could not import project ZIP: ${error.message}`);
    }
  }

  function install() {
    const wait = () => {
      const actions = $('.asset-import-actions');
      if (!actions) return setTimeout(wait, 50);

      const zipInput = document.createElement('input');
      zipInput.type = 'file'; zipInput.accept = '.zip,application/zip'; zipInput.hidden = true; zipInput.dataset.projectZipInput = 'true';
      zipInput.addEventListener('change', () => { if (zipInput.files?.[0]) importProjectZip(zipInput.files[0]); zipInput.value = ''; });
      document.body.appendChild(zipInput);

      const importZip = document.createElement('button');
      importZip.type = 'button'; importZip.textContent = 'Import project ZIP'; importZip.addEventListener('click', () => zipInput.click());
      const exportZip = document.createElement('button');
      exportZip.type = 'button'; exportZip.textContent = 'Export project ZIP'; exportZip.addEventListener('click', exportProjectZip);
      actions.append(importZip, exportZip);
    };
    wait();
  }

  install();
})();
