const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const aiHandler = require('../api/workbench-ai');

const docsRoot = path.resolve(__dirname, '..', 'docs');
const startPort = Number(process.env.PORT || 4173);
const maxPort = startPort + 20;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

function safeFile(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = path.resolve(docsRoot, `.${pathname}`);
  if (!resolved.startsWith(docsRoot + path.sep) && resolved !== path.join(docsRoot, 'index.html')) return null;
  return resolved;
}

async function handler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  if (requestUrl.pathname === '/api/workbench-ai') {
    await aiHandler(req, res);
    return;
  }

  const file = safeFile(req.url || '/');
  if (!file) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, max-age=0',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function openBrowser(url) {
  if (process.env.PREVIEW_NO_OPEN === '1') return;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

function start(port) {
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Preview server error');
    });
  });

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < maxPort) {
      start(port + 1);
      return;
    }
    console.error(error.message);
    process.exitCode = 1;
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Learning Experience Engine preview: ${url}`);
    console.log(process.env.OPENAI_API_KEY
      ? `Workbench AI: configured (${process.env.OPENAI_MODEL || 'gpt-5.6-terra'})`
      : process.env.LX_AI_MOCK === '1'
        ? 'Workbench AI: mock mode'
        : 'Workbench AI: not configured (set OPENAI_API_KEY to enable locally)');
    console.log('Press Control+C in this Terminal when you are finished.');
    openBrowser(url);
  });
}

start(startPort);
