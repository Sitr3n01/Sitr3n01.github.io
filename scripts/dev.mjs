// Servidor de desenvolvimento sem dependências:
// serve dist/, observa src/, refaz o build a cada alteração e recarrega o navegador (SSE).
// Uso: node scripts/dev.mjs   (porta: PORT, padrão 5500)
import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { build, DIST, SRC } from './build.mjs';
import { staticHandler } from './lib/serve.mjs';

const PORT = Number(process.env.PORT) || 5500;
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

// as páginas ganham o script do live reload; nada fica em cache, para o rebuild valer no próximo F5
const files = staticHandler(DIST, { html: page => page.replace('</body>', `${RELOAD}\n</body>`), headers: { 'Cache-Control': 'no-store' } });
const server = createServer((req, res) => {
  if (req.url.split('?')[0] === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  files(req, res);
});

rebuild('início');
let timer = null;
watch(SRC, { recursive: true }, (_evt, name) => {
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(`alterado: src/${String(name).replaceAll('\\', '/')}`), 80);
});
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref(); // mantém a conexão SSE viva

server.listen(PORT, () => console.log(`[dev] http://localhost:${PORT}  (Ctrl+C para sair)`));
