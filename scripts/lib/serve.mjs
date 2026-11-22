// Servidor estático do dist/, sem dependências, usado pelo dev, pela régua de desempenho e pelos testes E2E.
// Como o GitHub Pages: pasta → index.html (sem a barra final, redireciona), 404.html quando existe e Range para o
// vídeo poder avançar e voltar.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8',
  '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream',
};

// "bytes=a-b", "bytes=a-" ou "bytes=-n" (os n últimos) → [início, fim] dentro do arquivo, ou null se não couber
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (!m[1] && !m[2])) return null;
  let start, end;
  if (!m[1]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
  return start <= end && start < size ? [start, end] : null;
}

// Manipulador de requisições para a pasta `root`. html(texto): transforma as páginas antes de enviar (o dev injeta o
// live reload); headers: cabeçalhos extras em toda resposta.
export function staticHandler(root, { html = null, headers = {} } = {}) {
  root = resolve(root); // caminho absoluto e normalizado (no Windows, C:/... e C:\... são a mesma pasta)
  return async (req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let status = 200;
    try {
      let info = await stat(file);
      if (info.isDirectory()) {
        if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' + new URL(req.url, 'http://localhost').search }).end(); return; }
        file = join(file, 'index.html'); info = await stat(file);
      }
    } catch {
      status = 404; file = join(root, '404.html');
      try { await stat(file); } catch { res.writeHead(404, { 'Content-Type': MIME['.txt'], ...headers }).end('404'); return; }
    }
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    let body = await readFile(file);
    const range = status === 200 && type.startsWith('video/') && req.headers.range ? parseRange(req.headers.range, body.length) : null;
    if (range) {
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${range[0]}-${range[1]}/${body.length}`, 'Accept-Ranges': 'bytes', ...headers })
        .end(body.subarray(range[0], range[1] + 1));
      return;
    }
    if (html && type.startsWith('text/html')) body = html(body.toString('utf8'));
    res.writeHead(status, { 'Content-Type': type, ...(type.startsWith('video/') ? { 'Accept-Ranges': 'bytes' } : {}), ...headers }).end(body);
  };
}

// Sobe um servidor do `root` numa porta livre (ou `port`) e devolve { server, url }.
export function serve(root, { port = 0, host = '127.0.0.1', ...opts } = {}) {
  const server = createServer(staticHandler(root, opts));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}/` }));
  });
}
