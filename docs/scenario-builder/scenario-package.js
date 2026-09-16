(() => {
  const api = () => window.LXScenarioBuilder;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function crcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  }
  const CRC = crcTable();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = CRC[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  function dos(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  async function makeZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    const stamp = dos();
    for (const entry of entries) {
      const name = encoder.encode(entry.path.replace(/^\/+/, ''));
      const data = entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, stamp.time); u16(lv, 12, stamp.day); u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length);
      u16(lv, 26, name.length); u16(lv, 28, 0); local.set(name, 30);
      locals.push(local, data);
      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0);
      u16(cv, 12, stamp.time); u16(cv, 14, stamp.day); u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length);
      u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(name, 46); centrals.push(central);
      offset += local.length + data.length;
    }
    const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, entries.length); u16(ev, 10, entries.length);
    u32(ev, 12, centralSize); u32(ev, 16, offset); u16(ev, 20, 0);
    return new Blob([...locals, ...centrals, end], { type: 'application/zip' });
  }

  async function exportProject() {
    const model = api().getModel();
    const entries = [{ path: 'component.json', bytes: encoder.encode(`${JSON.stringify(model, null, 2)}\n`) }];
    for (const item of api().getAssets()) entries.push({ path: item.path, bytes: new Uint8Array(await item.file.arrayBuffer()) });
    const zip = await makeZip(entries);
    api().downloadBlob(zip, `${model.id || 'scenario'}-project.zip`);
    api().toast('Scenario project ZIP exported');
  }

  function findEnd(view) {
    const min = Math.max(0, view.byteLength - 65557);
    for (let offset = view.byteLength - 22; offset >= min; offset -= 1) if (view.getUint32(offset, true) === 0x06054b50) return offset;
    return -1;
  }

  async function inflateRaw(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('This browser cannot open compressed ZIP files.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZip(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const end = findEnd(view);
    if (end < 0) throw new Error('Not a valid ZIP archive.');
    const count = view.getUint16(end + 10, true);
    let cursor = view.getUint32(end + 16, true);
    const output = [];
    for (let i = 0; i < count; i += 1) {
      if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('ZIP directory is damaged.');
      const method = view.getUint16(cursor + 10, true);
      const size = view.getUint32(cursor + 20, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const local = view.getUint32(cursor + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
      cursor += 46 + nameLength + extraLength + commentLength;
      if (name.endsWith('/')) continue;
      if (view.getUint32(local, true) !== 0x04034b50) throw new Error(`Cannot read ${name}.`);
      const localNameLength = view.getUint16(local + 26, true);
      const localExtraLength = view.getUint16(local + 28, true);
      const start = local + 30 + localNameLength + localExtraLength;
      const compressed = new Uint8Array(buffer, start, size);
      let bytes;
      if (method === 0) bytes = new Uint8Array(compressed);
      else if (method === 8) bytes = await inflateRaw(compressed);
      else throw new Error(`Unsupported ZIP compression for ${name}.`);
      output.push({ path: name.replace(/^\.\//, ''), bytes });
    }
    return output;
  }

  function mime(path) {
    const ext = (path.split('.').pop() || '').toLowerCase();
    return {
      json:'application/json', txt:'text/plain', md:'text/markdown', markdown:'text/markdown', csv:'text/csv',
      png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml', bmp:'image/bmp', pdf:'application/pdf',
    }[ext] || 'application/octet-stream';
  }

  async function importProject(file) {
    try {
      const entries = await readZip(file);
      const componentEntry = entries.find((entry) => /(^|\/)component\.json$/i.test(entry.path));
      if (!componentEntry) throw new Error('This ZIP does not contain component.json.');
      const model = JSON.parse(decoder.decode(componentEntry.bytes));
      api().loadModel(model);
      const assets = entries.filter((entry) => entry !== componentEntry).map((entry) => {
        const name = entry.path.split('/').pop() || 'file';
        return { path: entry.path, file: new File([entry.bytes], name, { type: mime(entry.path) }) };
      });
      api().installImportedAssets(assets);
      api().toast(`Scenario project opened · ${assets.length} files`);
    } catch (error) {
      api().toast(`Could not open project: ${error.message}`);
    }
  }

  document.querySelector('[data-export-project]')?.addEventListener('click', exportProject);
  document.querySelector('[data-project-input]')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file?.name.toLowerCase().endsWith('.zip')) importProject(file);
    if (file?.name.toLowerCase().endsWith('.zip')) event.target.value = '';
  });
})();
