// Régua de desempenho, sem dependências: build → servidor estático do dist/ → Chrome headless via CDP, com a CPU
// emulada mais lenta e viewport de celular. Em cada cenário: 4 s parado no hero depois da abertura, a página inteira
// rolada a 1,4 px/ms (um polegar) e 4 s parado sobre os cards. Compara com as metas de docs/PLANO-UX-MOBILE.md.
// Uso: npm run perf [-- cenário,cenário] [--all] [--tier a|b|c] [--profile] [--json arquivo]
//   --tier fixa o nível de qualidade (sem ele, vale o automático, como para o visitante).
//   Chrome: variável CHROME, ou o instalado no lugar de sempre (Chrome, Edge ou Chromium).
// Limites: a GPU não é emulada e o headless não tem vsync (o rAF passa de 60 Hz). Compare cenários entre si e o mesmo
// cenário antes e depois; não leia os fps como os de um aparelho.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { build, DIST } from './build.mjs';

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const SCENARIOS = {
  'desk-1080-cpu1': { label: 'Desktop 1080p, CPU normal', w: 1920, h: 1080, dpr: 1, cpu: 1 },
  'desk-1080-cpu4': { label: 'Desktop 1080p, CPU 4×', w: 1920, h: 1080, dpr: 1, cpu: 4,
    goals: { idle: 50, cardsBusy: 70, cardsP95: 33 } },
  'desk-1366-cpu6': { label: 'Notebook 1366×768, CPU 6×', w: 1366, h: 768, dpr: 1, cpu: 6 },
  'mob-390-cpu4': { label: 'Celular 390×844 dpr 3, CPU 4×', w: 390, h: 844, dpr: 3, cpu: 4, mobile: true },
  'mob-360-cpu6': { label: 'Celular 360×780 dpr 2, CPU 6×', w: 360, h: 780, dpr: 2, cpu: 6, mobile: true,
    goals: { idle: 40, scrollP95: 25, longest: 100, cardsBusy: 70, cardsP95: 33 } },
};
const DEFAULT = ['desk-1080-cpu4', 'mob-360-cpu6'];

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const names = flag('--all') ? Object.keys(SCENARIOS) : (args.find(a => !a.startsWith('--') && a !== opt('--json') && a !== opt('--tier'))?.split(',') || DEFAULT);
const tier = opt('--tier');
for (const n of names) if (!SCENARIOS[n]) { console.error(`cenário desconhecido: ${n} (${Object.keys(SCENARIOS).join(', ')})`); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
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

// servidor estático mínimo do dist/
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml' };
function serve() {
  const server = createServer((req, res) => {
    let file = normalize(join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end(); return; }
    try {
      if (statSync(file).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }).end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function launch(chrome) {
  const dir = mkdtempSync(join(tmpdir(), 'sakura-perf-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('o Chrome não abriu a porta de depuração')), 15000);
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', () => reject(new Error('o Chrome fechou ao abrir')));
  });
  const browser = new WebSocket(wsUrl);
  await new Promise(r => browser.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map(), handlers = new Map();
  browser.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method) (handlers.get(m.method) || []).forEach(f => f(m.params));
  });
  const raw = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); browser.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  const { targetInfos } = await raw('Target.getTargets');
  const target = targetInfos.find(t => t.type === 'page');
  const { sessionId } = await raw('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const send = (method, params) => raw(method, params, sessionId);
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    send, evaluate,
    close() { try { browser.close(); } catch { /* já fechado */ } proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500).unref(); },
  };
}

// intervalos de rAF, long animation frames e quadros desenhados por canvas (um clearRect ou putImageData da área inteira
// = um quadro),
// injetados antes do site
const MONITOR = `(() => {
  const M = window.__perf = { d: [], loaf: [], on: false, last: 0, sakura: 0, cards: 0 };
  const f = now => { if (M.on && M.last) M.d.push(now - M.last); M.last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  try { new PerformanceObserver(l => { if (M.on) for (const e of l.getEntries()) M.loaf.push(e.duration); }).observe({ type: 'long-animation-frame' }); } catch (e) {}
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
    const cv = this.canvas, t = this.getTransform();
    if (M.on && !x && !y && w * t.a >= cv.width * 0.9 && h * t.d >= cv.height * 0.9) cv.hasAttribute('data-sk-canvas') ? M.sakura++ : M.cards++;
    return clear.call(this, x, y, w, h);
  };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (img, x, y, ...rest) {
    if (M.on && !x && !y && img.width >= this.canvas.width * 0.9) this.canvas.hasAttribute('data-sk-canvas') ? M.sakura++ : M.cards++;
    return put.call(this, img, x, y, ...rest);
  };
  // o motor conta os próprios quadros (ele redesenha só as células que mudaram, sem limpar a tela inteira)
  const engineFrames = () => { try { return window.__site.engine.load.frames; } catch (e) { return undefined; } };
  M.start = () => { M.d = []; M.loaf = []; M.on = true; M.last = 0; M.sakura = 0; M.cards = 0; M.t0 = performance.now(); M.f0 = engineFrames(); };
  M.stop = () => { M.on = false; const wall = performance.now() - M.t0, d = M.d.slice().sort((a, b) => a - b), q = p => d.length ? d[Math.min(d.length - 1, Math.floor(p * d.length))] : 0;
    return { wall, p95: q(0.95), p99: q(0.99), long: M.loaf.length, longMs: M.loaf.reduce((s, x) => s + x, 0), longest: Math.max(0, ...M.loaf),
      sakuraFps: 1000 * (M.f0 == null ? M.sakura : engineFrames() - M.f0) / wall, cardsFps: 1000 * M.cards / wall }; };
})()`;

// tempo inclusivo (ms) das funções que importam, a partir do perfil de CPU
const PARTS = { motor: ['frame'], cards: ['ascStep', 'ascBuild'], scroll: ['tick'] };
function partsOf(profile) {
  const byId = new Map(profile.nodes.map(x => [x.id, x])), parent = new Map();
  for (const x of profile.nodes) for (const c of x.children || []) parent.set(c, x.id);
  const fnPart = new Map(Object.entries(PARTS).flatMap(([p, fns]) => fns.map(f => [f, p])));
  const acc = Object.fromEntries(Object.keys(PARTS).map(p => [p, 0])), self = new Map();
  profile.samples.forEach((sid, i) => {
    const dt = (profile.timeDeltas[i] || 0) / 1000, seen = new Set(), f0 = byId.get(sid).callFrame;
    const key = `${f0.functionName || '(anônima)'}${f0.url ? ` @${f0.url.split('/').pop()}:${f0.lineNumber + 1}` : ''}`;
    self.set(key, (self.get(key) || 0) + dt);
    for (let id = sid; id != null; id = parent.get(id)) {
      const p = fnPart.get(byId.get(id).callFrame.functionName);
      if (p && !seen.has(p)) { acc[p] += dt; seen.add(p); }
    }
  });
  const top = [...self].filter(([k]) => k !== '(idle)').sort((a, b) => b[1] - a[1]).slice(0, 12);
  // tempo inclusivo por função (com --profile): onde o tempo vai dentro de cada parte
  const inc = new Map();
  profile.samples.forEach((sid, i) => {
    const dt = (profile.timeDeltas[i] || 0) / 1000, seen = new Set();
    for (let id = sid; id != null; id = parent.get(id)) {
      const fn = byId.get(id).callFrame.functionName;
      if (fn && !seen.has(fn)) { inc.set(fn, (inc.get(fn) || 0) + dt); seen.add(fn); }
    }
  });
  return { acc, top, inc: [...inc].filter(([k]) => !/^(\(|loop$|tick$|frame$)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 16) };
}

async function measure(c, run) {
  const m = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const m0 = await m(); await c.evaluate('__perf.start()'); await c.send('Profiler.start');
  await run();
  const { profile } = await c.send('Profiler.stop'); const mon = await c.evaluate('__perf.stop()'); const m1 = await m();
  const busyMs = (m1.TaskDuration - m0.TaskDuration) * 1000, perS = 1000 / mon.wall;
  const { acc, top, inc } = partsOf(profile);
  return { ...mon, busy: 100 * busyMs / mon.wall, perS: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v * perS])), top,
    inc: inc.map(([k, v]) => [k, v * perS]) };
}

async function scenario(chrome, base, name) {
  const v = SCENARIOS[name], c = await launch(chrome);
  try {
    for (const d of ['Page', 'Runtime', 'Performance', 'Profiler']) await c.send(`${d}.enable`);
    await c.send('Profiler.setSamplingInterval', { interval: 200 });
    await c.send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: v.dpr, mobile: !!v.mobile });
    if (v.mobile) {
      await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await c.send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA });
    }
    await c.send('Emulation.setCPUThrottlingRate', { rate: v.cpu });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: MONITOR });
    await c.send('Page.navigate', { url: base + (tier ? `?tier=${tier}` : '') });
    await sleep(6500); // abertura completa com a CPU lenta
    // os cards se preparam em tempo ocioso depois da abertura: espera terminar, para medir o regime parado
    await c.evaluate(`new Promise(done => { const t0 = performance.now(), check = () => {
      const st = window.__site.ascii.stats; if (st.every(s => s.N > 0) || performance.now() - t0 > 20000) done(); else setTimeout(check, 250); }; check(); })`);
    await sleep(1000);
    const idle = await measure(c, () => sleep(4000));
    // Fim da página: rolando o documento no celular, a barra de endereço (emulada) recolhe e a área visível
    // (innerHeight) passa do clientHeight; o fim real é scrollHeight − a maior das duas, medido a cada passo.
    const scroll = await measure(c, () => c.evaluate(`new Promise(done => {
      const s = document.querySelector('[data-sk-scroller]') || document.scrollingElement; s.style.scrollBehavior = 'auto';
      const doc = s === document.scrollingElement, maxOf = () => s.scrollHeight - (doc ? Math.max(s.clientHeight, innerHeight) : s.clientHeight);
      let last = 0;
      const step = now => { const dt = last ? Math.min(100, now - last) : 16; last = now; const max = maxOf(); s.scrollTop = Math.min(max, s.scrollTop + 1.4 * dt);
        if (s.scrollTop >= maxOf() - 1) done(); else requestAnimationFrame(step); };
      requestAnimationFrame(step); })`));
    await c.evaluate(`(() => { const s = document.querySelector('[data-sk-scroller]') || document.scrollingElement, top = s === document.scrollingElement ? 0 : s.getBoundingClientRect().top;
      s.scrollTop += document.querySelector('.sk-card').getBoundingClientRect().top - top - 120; })()`);
    await sleep(2500);
    const cards = await measure(c, () => sleep(4000));
    const tierNow = await c.evaluate('window.__site.tier || null');
    return { name, ...v, idle, scroll, cards, tier: tierNow };
  } finally { c.close(); }
}

const fmt = (x, d = 0) => x.toFixed(d);
function report(r) {
  const g = r.goals || {}, mark = (val, goal) => goal == null ? '' : val <= goal ? ' ✓' : ` ✗ (meta ${goal})`;
  const fps = k => `sakura ${fmt(r[k].sakuraFps)} q/s` + (r[k].cardsFps ? ` · cards ${fmt(r[k].cardsFps)} q/s` : '');
  console.log(`
${r.label}  [${r.name}]${r.tier ? ` · nível ${r.tier.toUpperCase()}${tier ? ' (fixo)' : ''}` : ''}`);
  console.log(`  parado no hero   thread principal ${fmt(r.idle.busy)}%${mark(r.idle.busy, g.idle)} · ${fps('idle')}`);
  console.log(`  rolagem          intervalo entre quadros p95 ${fmt(r.scroll.p95)} ms${mark(r.scroll.p95, g.scrollP95)} · p99 ${fmt(r.scroll.p99)} ms · ` +
    `${r.scroll.long} quadros longos (${fmt(r.scroll.longMs)} ms, o maior ${fmt(r.scroll.longest)} ms${mark(r.scroll.longest, g.longest)}) · ${fps('scroll')}`);
  console.log(`  sobre os cards   thread principal ${fmt(r.cards.busy)}%${mark(r.cards.busy, g.cardsBusy)} · p95 ${fmt(r.cards.p95)} ms${mark(r.cards.p95, g.cardsP95)} · ${fps('cards')}`);
  const ps = k => `motor ${fmt(r[k].perS.motor)} · cards ${fmt(r[k].perS.cards)} · scroll ${fmt(r[k].perS.scroll)}`;
  console.log(`  ms de CPU por s  parado: ${ps('idle')} | rolando: ${ps('scroll')} | cards: ${ps('cards')}`);
  if (flag('--profile')) for (const k of ['idle', 'scroll', 'cards']) {
    console.log(`  funções mais caras, tempo próprio (${k}):`);
    r[k].top.forEach(([fn, ms]) => console.log(`    ${fmt(ms).padStart(6)} ms  ${fn}`));
    console.log(`  tempo inclusivo por segundo (${k}): ` + r[k].inc.map(([fn, ms]) => `${fn} ${fmt(ms)}`).join(' · '));
  }
}

const chrome = findChrome();
if (!chrome) { console.error('Chrome não encontrado. Defina CHROME com o caminho do executável.'); process.exit(1); }
build({ clean: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
console.log(`dist/ em ${base} · ${chrome}`);
const results = [];
try {
  for (const n of names) { const r = await scenario(chrome, base, n); results.push(r); report(r); }
} finally { server.close(); }
const json = opt('--json');
if (json) { writeFileSync(json, JSON.stringify(results, null, 1)); console.log(`\nresultados em ${json}`); }
