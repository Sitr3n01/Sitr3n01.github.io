// Servidor de desenvolvimento sem dependências:
// serve dist/, observa src/, refaz o build a cada alteração e recarrega o navegador (SSE).
// Uso: node scripts/dev.mjs   (porta: PORT, padrão 5500)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { build, DIST, SRC } from './build.mjs';

const PORT = Number(process.env.PORT) || 5500;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const RELOAD = `<script>(()=>{const es=new EventSource('/__reload');es.onmessage=e=>{if(e.data==='reload')location.reload();else console.error('[dev] '+JSON.parse(e.data))}})();</script>`;

const clients = new Set();
const send = (msg) => { for (const res of clients) res.write(`data: ${msg}\n\n`); };

function rebuild(reason) {
  try {
    const ms = build();
    console.log(`[dev] ${reason} → build em ${ms} ms`);
    send('reload');
  } catch (e) {
    console.error(`[dev] erro no build:\n${e.message}`);
    send(JSON.stringify(e.message));
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    let body = await readFile(file);
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    if (type.startsWith('text/html')) body = body.toString('utf8').replace('</body>', `${RELOAD}\n</body>`);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
});

rebuild('início');
let timer = null;
watch(SRC, { recursive: true }, (_evt, name) => {
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(`alterado: src/${String(name).replaceAll('\\', '/')}`), 80);
});
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref(); // mantém a conexão SSE viva

server.listen(PORT, () => console.log(`[dev] http://localhost:${PORT}  (Ctrl+C para sair)`));
