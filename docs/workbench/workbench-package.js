(() => {
  const MAX_PACKAGE_BYTES = 30 * 1024 * 1024;
  const MAX_ENTRY_COUNT = 2000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const $ = (selector, root = document) => root.querySelector(selector);

  function api() { return window.LX_WORKBENCH; }
  function safePath(value, fallback = "file") {
    const clean = String(value || fallback).replace(/\\/g, "/").replace(/[?#].*$/, "");
    const parts = clean.split("/").filter((part) => part && part !== "." && part !== "..");
    return parts.join("/") || fallback;
  }
  function mime(path) {
    const extension = (String(path).split(".").pop() || "").toLowerCase();
    return { json:"application/json", txt:"text/plain", md:"text/markdown", markdown:"text/markdown", csv:"text/csv", png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", gif:"image/gif", webp:"image/webp", svg:"image/svg+xml", avif:"image/avif", bmp:"image/bmp", mp4:"video/mp4", webm:"video/webm", mov:"video/quicktime", m4v:"video/x-m4v", mp3:"audio/mpeg", wav:"audio/wav", m4a:"audio/mp4", aac:"audio/aac", ogg:"audio/ogg", vtt:"text/vtt", srt:"text/plain", pdf:"application/pdf" }[extension] || "application/octet-stream";
  }
  function crcTable() {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
      table[index] = value >>> 0;
    }
    return table;
  }
  const CRC_TABLE = crcTable();
  function crc32(bytes) {
    let value = 0xFFFFFFFF;
    for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xFF] ^ (value >>> 8);
    return (value ^ 0xFFFFFFFF) >>> 0;
  }
  function put16(view, offset, value) { view.setUint16(offset, value, true); }
  function put32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function zipDate(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return { time:(date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), day:((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() };
  }
  async function buildZip(entries) {
    const locals = [], central = [];
    const stamp = zipDate();
    let offset = 0;
    for (const entry of entries) {
      const name = encoder.encode(safePath(entry.path));
      const bytes = entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
      const crc = crc32(bytes);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      put32(localView, 0, 0x04034b50); put16(localView, 4, 20); put16(localView, 6, 0x0800); put16(localView, 8, 0);
      put16(localView, 10, stamp.time); put16(localView, 12, stamp.day); put32(localView, 14, crc); put32(localView, 18, bytes.length); put32(localView, 22, bytes.length);
      put16(localView, 26, name.length); put16(localView, 28, 0); local.set(name, 30);
      locals.push(local, bytes);
      const directory = new Uint8Array(46 + name.length);
      const directoryView = new DataView(directory.buffer);
      put32(directoryView, 0, 0x02014b50); put16(directoryView, 4, 20); put16(directoryView, 6, 20); put16(directoryView, 8, 0x0800); put16(directoryView, 10, 0);
      put16(directoryView, 12, stamp.time); put16(directoryView, 14, stamp.day); put32(directoryView, 16, crc); put32(directoryView, 20, bytes.length); put32(directoryView, 24, bytes.length);
      put16(directoryView, 28, name.length); put16(directoryView, 30, 0); put16(directoryView, 32, 0); put16(directoryView, 34, 0); put16(directoryView, 36, 0); put32(directoryView, 38, 0); put32(directoryView, 42, offset);
      directory.set(name, 46); central.push(directory); offset += local.length + bytes.length;
    }
    const directorySize = central.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    put32(endView, 0, 0x06054b50); put16(endView, 4, 0); put16(endView, 6, 0); put16(endView, 8, entries.length); put16(endView, 10, entries.length); put32(endView, 12, directorySize); put32(endView, 16, offset); put16(endView, 20, 0);
    return new Blob([...locals, ...central, end], { type:"application/zip" });
  }
  function findEnd(view) {
    for (let offset = view.byteLength - 22, min = Math.max(0, view.byteLength - 65557); offset >= min; offset -= 1) if (view.getUint32(offset, true) === 0x06054b50) return offset;
    return -1;
  }
  async function inflate(bytes) {
    if (!("DecompressionStream" in window)) throw new Error("This browser cannot open compressed project ZIPs. Project ZIPs created here will still work.");
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  }
  async function readZip(file) {
    if (file.size > MAX_PACKAGE_BYTES) throw new Error("This project package is over the current 30 MB limit.");
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const end = findEnd(view);
    if (end < 0) throw new Error("This is not a valid ZIP archive.");
    const count = view.getUint16(end + 10, true);
    if (count > MAX_ENTRY_COUNT) throw new Error("This project package contains too many files.");
    let offset = view.getUint32(end + 16, true);
    const entries = [];
    for (let index = 0; index < count; index += 1) {
      if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error("The project ZIP directory is damaged.");
      const method = view.getUint16(offset + 10, true), compressedSize = view.getUint32(offset + 20, true), nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true), localOffset = view.getUint32(offset + 42, true);
      const path = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
      offset += 46 + nameLength + extraLength + commentLength;
      if (path.endsWith("/")) continue;
      if (localOffset + 30 > view.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Cannot read ${path}.`);
      const localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true), dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      if (dataOffset + compressedSize > view.byteLength) throw new Error(`Cannot read ${path}.`);
      const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
      const bytes = method === 0 ? new Uint8Array(compressed) : method === 8 ? await inflate(compressed) : (() => { throw new Error(`Unsupported ZIP compression for ${path}.`); })();
      entries.push({ path:safePath(path), bytes });
    }
    return entries;
  }
  function dataUrlBytes(dataUrl) {
    const comma = String(dataUrl || "").indexOf(",");
    if (comma < 0) throw new Error("An imported preview asset could not be packaged.");
    const binary = atob(String(dataUrl).slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  async function dataUrlFromBytes(bytes, type) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("An asset could not be read."));
      reader.readAsDataURL(new Blob([bytes], { type }));
    });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportPackage() {
    const workbench = api();
    if (!workbench?.getPortableProject) return;
    try {
      const manifest = workbench.getPortableProject();
      const entries = [];
      const sourceFiles = workbench.getSourceFiles();
      const previewAssets = workbench.getPreviewAssetsForPackage();
      manifest.sourceFiles = [];
      manifest.previewAssets = [];
      let total = 0;
      for (const item of sourceFiles) {
        const archivePath = `source/${safePath(item.path, item.name)}`;
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        total += bytes.length;
        manifest.sourceFiles.push({ path:item.path, kind:item.kind, name:item.name, archivePath });
        entries.push({ path:archivePath, bytes });
      }
      for (const asset of previewAssets) {
        const archivePath = `imported-preview/${safePath(asset.path || asset.id, "asset")}`;
        const bytes = dataUrlBytes(asset.dataUrl);
        total += bytes.length;
        manifest.previewAssets.push({ id:asset.id, path:asset.path, kind:asset.kind, archivePath });
        entries.push({ path:archivePath, bytes });
      }
      const projectBytes = encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`);
      total += projectBytes.length;
      if (total > MAX_PACKAGE_BYTES) throw new Error("The selected files exceed the current 30 MB project-package limit. Keep larger original media alongside the package.");
      entries.unshift({ path:"workbench-project.json", bytes:projectBytes });
      download(await buildZip(entries), `${manifest.project.id || "learning-project"}-workbench-project.zip`);
      workbench.toast(`Project package downloaded · ${entries.length - 1} bundled file${entries.length === 2 ? "" : "s"}`);
    } catch (error) { api()?.toast(error.message || "Project package could not be created."); }
  }
  async function openPackage(file) {
    try {
      const entries = await readZip(file);
      const byPath = new Map(entries.map((entry) => [entry.path, entry]));
      const manifestEntry = byPath.get("workbench-project.json");
      if (!manifestEntry) throw new Error("This ZIP does not contain workbench-project.json.");
      const manifest = JSON.parse(decoder.decode(manifestEntry.bytes));
      const sourceEntries = (manifest.sourceFiles || []).map((item) => {
        const entry = byPath.get(safePath(item.archivePath));
        if (!entry) throw new Error(`A bundled source file is missing: ${item.name || item.path}.`);
        return { path:item.path, kind:item.kind, name:item.name, referenceText:(manifest.reference || []).find((reference) => reference.path === item.path)?.text, file:new File([entry.bytes], item.name || safePath(item.path).split("/").pop(), { type:mime(item.path) }) };
      });
      const previewAssets = await Promise.all((manifest.previewAssets || []).map(async (asset) => {
        const entry = byPath.get(safePath(asset.archivePath));
        if (!entry) throw new Error(`A bundled preview asset is missing: ${asset.path || asset.id}.`);
        return { id:asset.id, path:asset.path, kind:asset.kind, dataUrl:await dataUrlFromBytes(entry.bytes, mime(asset.path)) };
      }));
      await api().openPortableProject(manifest, sourceEntries, previewAssets);
    } catch (error) { api()?.toast(error.message || "Project package could not be opened."); }
  }

  $("[data-download-project-package]")?.addEventListener("click", exportPackage);
  window.LX_WORKBENCH_PACKAGE = { open:openPackage };
})();
