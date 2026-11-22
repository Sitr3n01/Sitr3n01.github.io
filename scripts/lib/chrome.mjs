// Chrome headless via CDP, sem dependências: usado pela régua de desempenho (perf.mjs) e pelos testes E2E (e2e.mjs).
// Chrome: variável CHROME, ou o instalado no lugar de sempre (Chrome, Edge ou Chromium).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const L = process.env.LOCALAPPDATA || '', P = process.env.PROGRAMFILES || 'C:/Program Files', P86 = process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)';
  const paths = process.platform === 'win32'
    ? [`${P}/Google/Chrome/Application/chrome.exe`, `${P86}/Google/Chrome/Application/chrome.exe`, `${L}/Google/Chrome/Application/chrome.exe`, `${P86}/Microsoft/Edge/Application/msedge.exe`, `${P}/Microsoft/Edge/Application/msedge.exe`]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : [];
  for (const p of paths) if (existsSync(p)) return p;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

// Abre o Chrome headless e devolve { page(), close() }. Cada page() é uma aba com send(método, params),
// evaluate(expressão), on(evento, fn) e close().
export async function launchChrome(chrome, { args = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'sakura-chrome-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', ...args, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('o Chrome não abriu a porta de depuração')), 15000);
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', () => reject(new Error('o Chrome fechou ao abrir')));
  });
  const browser = new WebSocket(wsUrl);
  await new Promise(r => browser.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map(), listeners = new Set();
  browser.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method) listeners.forEach(f => f(m));
  });
  const raw = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); browser.send(JSON.stringify({ id: i, method, params, sessionId }));
  });

  let first = (await raw('Target.getTargets')).targetInfos.find(t => t.type === 'page')?.targetId;
  return {
    async page() {
      // a primeira aba reaproveita a que o Chrome abriu (about:blank); as outras são novas
      const targetId = first || (await raw('Target.createTarget', { url: 'about:blank' })).targetId;
      first = null;
      const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
      const send = (method, params) => raw(method, params, sessionId);
      const on = (method, fn) => {
        const h = m => { if (m.sessionId === sessionId && m.method === method) fn(m.params); };
        listeners.add(h); return () => listeners.delete(h);
      };
      const evaluate = async (expression, { gesture = false } = {}) => {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: gesture });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      };
      return { send, on, evaluate, close: () => raw('Target.closeTarget', { targetId }).catch(() => {}) };
    },
    close() { try { browser.close(); } catch { /* já fechado */ } proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500).unref(); },
  };
}
