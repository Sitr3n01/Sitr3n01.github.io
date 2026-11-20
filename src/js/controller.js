// ------------------------------------------------------------------ controlador do site (dinâmicas do scroll)
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const inOut = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

// abertura completa: semente (contador e barra de progresso na grade) → explosão (as células da barra viram
// faíscas) → florescer (cada faísca pousa numa flor, na ordem em que a árvore cresce a partir do tronco).
// Versão curta (mesma sessão): a câmera recua de uma flor enquanto a árvore cresce. Tempos em segundos.
const INTRO = {
  full:  { band: [0.15, 1.15], burst: 1.3, grow: 1.3, growDur: 1.5, ui: 2.3, end: 3.1 },
  short: { zoom: [0, 0.95], grow: 0, growDur: 0.9, ui: 0.3, z0: 2.6, end: 0.95 },
  page:  { grow: 0, growDur: 1.1, ui: 0.1, end: 1.1 }, // páginas de projeto, âncoras e "voltar": só a árvore crescendo
};
const BUD_AT = [0.74, 0.34]; // versão curta: flor de onde a câmera recua (fração da largura/altura na vista inicial)
const BAND_CH = ':+*';

const VIEWS = {
  //        câmera (z, foco no centro das flores → posição na tela sx/sy)      zona de respiro                         opacidade
  hero:      { cam: { id: true },                     safe: { x: 0.40, y: 0.78, rx: 0.44, ry: 0.22, s: 0.42 }, alpha: 1.00 },
  manifesto: { cam: { z: 1.75, sx: 0.80, sy: 0.50 },  safe: { x: 0.34, y: 0.50, rx: 0.40, ry: 0.36, s: 0.90 }, alpha: 1.00 },
  about:     { cam: { z: 2.20, sx: 0.96, sy: 0.40 },  safe: { x: 0.40, y: 0.52, rx: 0.62, ry: 0.56, s: 0.93 }, alpha: 0.85 },
  work:      { cam: { z: 1.35, sx: 0.28, sy: 0.55 },  safe: { x: 0.50, y: 0.50, rx: 0.60, ry: 0.60, s: 0.45 }, alpha: 0.70 },
  areas:     { cam: { z: 1.05, sx: 0.50, sy: 0.50 },  safe: { x: 0.18, y: 0.86, rx: 0.26, ry: 0.16, s: 0.75 }, alpha: 0.95 },
  path:      { cam: { z: 1.60, sx: 0.12, sy: 0.88 },  safe: { x: 0.62, y: 0.50, rx: 0.50, ry: 0.62, s: 0.92 }, alpha: 0.90 },
  contact:   { cam: { id: true },                     safe: { x: 0.40, y: 0.55, rx: 0.48, ry: 0.42, s: 0.88 }, alpha: 1.00 },
  // páginas de projeto
  proj:      { cam: { z: 1.55, sx: 0.80, sy: 0.42 },  safe: { x: 0.34, y: 0.62, rx: 0.48, ry: 0.46, s: 0.86 }, alpha: 0.95 },
  projbody:  { cam: { z: 2.40, sx: 1.02, sy: 0.22 },  safe: { x: 0.45, y: 0.52, rx: 0.72, ry: 0.70, s: 0.96 }, alpha: 0.50 },
  projnext:  { cam: { id: true },                     safe: { x: 0.40, y: 0.60, rx: 0.52, ry: 0.40, s: 0.80 }, alpha: 1.00 },
};

function mountMenu(root, layout) {
  const menu = root.querySelector('[data-sk-menu]');
  const opener = root.querySelector('[data-sk-menu-open]');
  if (!opener || typeof menu?.showModal !== 'function') return () => {};

  const dismiss = () => menu.close();
  const open = () => {
    opener.focus({ preventScroll: true });
    menu.showModal();
    opener.setAttribute('aria-expanded', 'true');
  };
  const reset = () => opener.setAttribute('aria-expanded', 'false');
  const resize = () => { if (!layout.matches && menu.open) dismiss(); };
  const click = event => {
    if (event.target.closest('a,[data-sk-menu-close]')) { dismiss(); return; }
    if (event.target !== menu) return;
    const r = menu.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss();
  };

  root.setAttribute('data-sk-menu-ready', '');
  opener.addEventListener('click', open);
  menu.addEventListener('close', reset);
  menu.addEventListener('click', click);
  layout.addEventListener('change', resize);
  return () => {
    if (menu.open) dismiss();
    reset();
    root.removeAttribute('data-sk-menu-ready');
    opener.removeEventListener('click', open);
    menu.removeEventListener('close', reset);
    menu.removeEventListener('click', click);
    layout.removeEventListener('change', resize);
  };
}

function mountCardColumns(columns, layout) {
  if (!columns) return () => {};
  const [left, right] = columns.children;
  const first = Array.from(left.children), second = Array.from(right.children);
  const arrange = () => {
    const focused = document.activeElement;
    if (layout.matches) second.forEach((card, i) => first[i].after(card));
    else right.append(...second);
    if (columns.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
  };
  if (layout.matches) arrange();
  layout.addEventListener('change', arrange);
  return () => { layout.removeEventListener('change', arrange); right.append(...second); };
}

function mount(root, options) {
  const o = Object.assign({ preset: 'kosa', kanji: true, wind: 1 }, options || {});
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = $('[data-sk-canvas]'), scroller = $('[data-sk-scroller]') || document.scrollingElement;
  const mobile = matchMedia('(max-width: 720px), (max-width: 950px) and (max-height: 520px) and (pointer: coarse)');
  const unmountMenu = mountMenu(root, mobile), unmountColumns = mountCardColumns($('[data-sk-card-columns]'), mobile);
  const project = !!$('[data-sk-view="proj"]');
  const engine = createSakuraBackground(canvas, { preset: o.preset, kanji: o.kanji, wind: o.wind, holdIntro: !reduce, project });
  const glass = mountGlass(root, scroller), videos = mountVideos(root), ascii = mountAscii(root);
  const F = engine.focus;
  function camOf(v, fit, compact) {
    if (v.cam.id) return { z: lerp(1, fit, compact), fx: F[0] * compact, fy: F[1] * compact, sx: 0.54 * compact, sy: 0.5 * compact };
    return { z: v.cam.z * fit, fx: F[0], fy: F[1], sx: v.cam.sx - 0.1 * compact, sy: v.cam.sy };
  }

  const sections = $$('[data-sk-view]');
  const letters = $$('[data-sk-letter]');
  const words = $$('[data-sk-word]');
  const parallax = $$('[data-sk-parallax]');
  const reveals = $$('[data-sk-reveal]');
  const readGroups = $$('[data-sk-read]');
  const chips = $$('[data-sk-chip]');
  const orbit = $('[data-sk-orbit]'), orbitLabels = $$('[data-sk-orbit-label]');
  const rings = $('[data-sk-rings]'), hint = $('[data-sk-hint]');
  const toolbar = $('.sk-toolbar'), topBlur = $('.sk-topblur'), whatsApp = $('.sk-wa-wrap');

  // valores aleatórios estáveis por elemento
  const R = rngFrom(2026);
  // título: as letras de uma palavra somem juntas (fade = início do sumiço da palavra, em ordem de leitura,
  // com uma variação mínima por letra), para nunca sobrarem letras soltas formando outras palavras
  const wordOf = new Map();
  letters.forEach(el => { if (!wordOf.has(el.parentElement)) wordOf.set(el.parentElement, wordOf.size); });
  const L = letters.map(el => ({
    ix: R.uniform(-420, 420), iy: R.uniform(-260, 260), ir: R.uniform(-50, 50), idel: R.uniform(0, 0.5),
    sx: R.uniform(-140, 140), sy: R.uniform(-380, -60), sr: R.uniform(-30, 30),
    fade: 0.03 + 0.025 * wordOf.get(el.parentElement) + R.uniform(0, 0.015),
  }));
  // manifesto: deslocamento em em, sempre menor que meia linha (a palavra nunca invade a linha vizinha), e as
  // palavras entram em ordem de leitura (a variação aleatória é menor que o passo entre duas palavras)
  const Wd = words.map((_, i) => ({ off: (i % 2 ? -1 : 1) * R.uniform(0.14, 0.3), d: 0.04 + 0.34 * i / Math.max(1, words.length - 1) + R.uniform(0, 0.01) }));

  const Ch = chips.map((_, i) => ({ a: i * 2.39996, rad: R.uniform(0.72, 1.18), lift: R.uniform(-0.35, 0.35), spd: R.uniform(0.08, 0.16), out: R.uniform(1.8, 3.4),
    ox: 0, oy: 0, w: 0, h: 0 }));
  // tamanhos dos chips (sem transform), lidos uma vez e de novo quando as fontes carregam
  const sizeChips = () => chips.forEach((el, n) => { Ch[n].w = el.offsetWidth; Ch[n].h = el.offsetHeight; });
  let orbitT = 0;
  if (chips.length && document.fonts && document.fonts.ready) document.fonts.ready.then(sizeChips);

  const t0 = performance.now();
  let raf = 0, dead = false;

  // home: primeira visita da sessão e F5 → abertura completa (o F5 recomeça do topo); voltar à home navegando
  // dentro do site → recuo curto. ?intro=full força a completa.
  // Páginas de projeto, chegada por âncora (#projetos; #inicio não conta, é o topo) ou botão "voltar" → só a árvore crescendo.
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { /* sem storage */ } return null; };
  const navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type;
  const scrollKey = 'sk-scroll:' + location.pathname, saved = navType === 'back_forward' ? store(scrollKey) : null;
  let mode = o.intro === undefined ? 'home' : o.intro;
  const reload = mode === 'home' && navType === 'reload';
  if (reload && location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  const hashId = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : '';
  const hashEl = hashId && hashId !== 'inicio' ? root.querySelector('#' + CSS.escape(hashId)) : null;
  if (mode === 'home') {
    const seen = store('sk-intro') === '1' && !reload && !/[?&]intro=full\b/.test(location.search);
    store('sk-intro', '1');
    mode = saved != null || hashEl ? 'page' : seen ? 'short' : 'full';
  }
  if (reload) { const prev = scroller.style.scrollBehavior; scroller.style.scrollBehavior = 'auto'; scroller.scrollTop = 0; scroller.style.scrollBehavior = prev; }
  const IN = reduce || mode === false ? null : INTRO[mode];
  // posição de rolagem: volta para onde estava; âncora vai direto (sem rolagem suave)
  if (saved != null || hashEl) {
    const prev = scroller.style.scrollBehavior; scroller.style.scrollBehavior = 'auto';
    const scrollPadding = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    scroller.scrollTop = saved != null ? Number(saved) : hashEl.offsetTop - scrollPadding;
    requestAnimationFrame(() => { scroller.style.scrollBehavior = prev; });
  }
  const onHide = () => store(scrollKey, String(scroller.scrollTop));
  window.addEventListener('pagehide', onHide);
  const bud = IN && IN.zoom ? engine.pickBud(BUD_AT[0], BUD_AT[1]) : null;
  const on = !!IN && (!IN.zoom || !!bud);
  let skew = 0, grown = false, burstDone = false, bandOff = false, uiShown = !on;
  if (on) root.setAttribute('data-sk-intro', 'on');
  const skip = () => {
    if (!on || uiShown) return;
    const ti = (performance.now() - t0) / 1000 - skew;
    if (ti < IN.end) skew -= IN.end - ti;
    engine.skipIntro(); grown = true; burstDone = true;
  };

  // barra de progresso na grade; ao completar, as células explodem em faíscas
  function band(ti) {
    const g = engine.grid, cx = Math.floor(g.cols / 2), cy = Math.floor(g.rows / 2), hw = Math.max(6, Math.min(15, cx - 3));
    const c0 = cx - hw, n = 2 * hw + 1;
    const p = ease((ti - IN.band[0]) / (IN.band[1] - IN.band[0]));
    const fill = c0 + Math.round(p * n) - 1;
    const colAt = c => engine.gradAt(0.72 - 0.67 * (c - c0) / (n - 1));
    if (!burstDone && ti >= IN.burst) {
      burstDone = true;
      const cells = []; for (let c = c0; c < c0 + n; c++) cells.push([c, cy, colAt(c)]);
      engine.burst(cells);
    }
    const fadeIn = ease(ti / 0.3), out = ease((ti - IN.burst) / 0.25);
    const scr = Math.max(1 - fadeIn, out) * 0.9, a = fadeIn * (1 - out);
    const items = [
      { c: c0, r: cy - 2, s: '桜 開花', a, scr },
      { c: c0 + n - 3, r: cy - 2, s: String(Math.round(100 * p)).padStart(3, '0'), a, scr },
      { c: c0, r: cy + 2, s: 'SITR3N', a: 0.45 * a, scr },
    ];
    if (!burstDone) {
      const charge = smooth(IN.band[1], IN.burst, ti); // barra cheia "vibra" antes de explodir
      for (let c = c0; c <= fill; c++) {
        const col = colAt(c);
        items.push({ c, r: cy, s: BAND_CH[(hash2(c, 3) * 3) | 0], sq: col, sqA: 0.85, col: mixc(col, [29, 29, 29], 0.55), a: 1,
          scr: c > fill - 2 ? 0.9 : 0.1 + 0.5 * charge });
      }
      if (fill < c0 + n - 1) items.push({ c: fill + 1, r: cy, s: '·'.repeat(c0 + n - 1 - fill), a: 0.35 * a });
    }
    return items;
  }
  function translateY(transform) {
    return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0;
  }

  function parallaxPosition(el, viewportTop, height) {
    if (mobile.matches) return { current: 0, offset: 0, rate: 1 };
    const r = el.getBoundingClientRect(), current = translateY(el.style.transform);
    const speed = Number(el.dataset.skParallax);
    const mid = r.top - viewportTop - current + (r.height - height) / 2;
    return { current, offset: -mid * speed / (1 + speed), rate: 1 / (1 + speed) };
  }

  const intersect = (a, b) => ({ from: Math.max(a.from, b.from), to: Math.min(a.to, b.to) });
  const textBlock = 'h1,h2,h3,h4,p,li,figcaption,.sk-cell,.sk-fact,.sk-stat,.sk-next,.sk-video-empty';

  function showReveal(el, animate) {
    el.__shown = true;
    el.style.transition = animate ? 'transform 1s cubic-bezier(.2,.7,.2,1), opacity 1s ease' : 'none';
    el.style.opacity = '1'; el.style.transform = 'translate3d(0,0,0)';
  }

  // Planeja as paradas pela área de leitura e pelas linhas reais, inclusive após redimensionar ou carregar as fontes.
  const nextSection = () => {
    const st = scroller.scrollTop, height = scroller.clientHeight, max = scroller.scrollHeight - height;
    const viewportTop = scroller.getBoundingClientRect().top;
    const headerEdge = Math.max(toolbar?.getBoundingClientRect().bottom ?? viewportTop, topBlur?.getBoundingClientRect().bottom ?? viewportTop);
    const halo = parseFloat(getComputedStyle(hint, '::before').top) || 0;
    const waTop = whatsApp?.getClientRects().length ? whatsApp.getBoundingClientRect().top : viewportTop + height;
    const bottomEdge = Math.min(hint.getBoundingClientRect().top + Math.min(0, halo), waTop);
    const top = headerEdge - viewportTop + 8, bottom = bottomEdge - viewportTop - 8;
    const columns = new Map(parallax.map(el => [el, parallaxPosition(el, viewportTop, height)]));
    const shifts = new Map();
    function readRect(el, rect) {
      const reveal = el.closest('[data-sk-reveal]');
      if (reveal && !shifts.has(reveal)) shifts.set(reveal, translateY(getComputedStyle(reveal).transform));
      const column = columns.get(el.closest('[data-sk-parallax]'));
      const offset = (column ? column.offset - column.current : 0) - (shifts.get(reveal) || 0) - viewportTop;
      return { top: rect.top + offset, bottom: rect.bottom + offset, rate: column?.rate ?? 1 };
    }
    const stops = [max];
    function addStop(page) {
      if (page.from <= 0 && page.to >= 0) return; // o texto já cabe na vista inicial
      const target = Math.min(max, Math.floor(page.to));
      if (target >= page.from - 1 && target > 0) stops.push(target);
    }
    const range = document.createRange();
    for (const group of readGroups) {
      const blocks = new Map(), walker = document.createTreeWalker(group, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!node.data.trim() || el.closest('footer,.sk-video-k,[hidden]')) continue;
        range.selectNodeContents(node);
        const block = el.closest(textBlock) || el.closest('a') || el;
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          const line = readRect(el, rect);
          const window = { from: st + (line.bottom - bottom) / line.rate, to: st + (line.top - top) / line.rate };
          if (!blocks.has(block)) blocks.set(block, []);
          blocks.get(block).push(window);
        }
      }
      // Tenta manter todo o bloco na mesma vista. Se for alto, continua por parágrafos ou por linhas inteiras.
      const chunks = Array.from(blocks.values()).flatMap(lines => {
        const block = lines.reduce(intersect);
        return block.from <= block.to ? [block] : lines;
      }).sort((a, b) => a.to - b.to);
      let page = null;
      for (const chunk of chunks) {
        const joined = page ? intersect(page, chunk) : chunk;
        if (page && joined.from > joined.to) { addStop(page); page = chunk; }
        else page = joined;
      }
      if (page) addStop(page);
    }
    if (words.length) {
      const manifesto = words[0].closest('[data-sk-view]');
      // Aqui as palavras já terminaram de se montar e a saída ainda não começou.
      stops.push(topOf(manifesto) + 0.84 * (manifesto.offsetHeight - height * 0.4) - height * 0.6);
    }
    if (orbit) stops.push(topOf(orbit.closest('[data-sk-view]')));

    const next = Math.min(...stops.filter(stop => stop > st + 1));
    if (!Number.isFinite(next)) return;
    if (!reduce) for (const el of reveals) {
      const rect = readRect(el, el.getBoundingClientRect()), shift = (next - st) * rect.rate;
      if (rect.top - shift < bottom && rect.bottom - shift > top) showReveal(el, false);
    }
    scroller.scrollTo({ top: next, behavior: reduce ? 'auto' : 'smooth' });
  };
  if (hint) hint.addEventListener('click', nextSection);
  const skipEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  skipEvents.forEach(ev => window.addEventListener(ev, skip, { passive: true }));

  if (!reduce) {
    reveals.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translate3d(0,40px,0)'; });
  }

  function topOf(el) { return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop; }

  function tick(now) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const t = (now - t0) / 1000;
    const st = scroller.scrollTop, vh = scroller.clientHeight, vw = scroller.clientWidth;

    const ti = t - skew; // relógio da abertura (avança de uma vez quando o visitante pula)
    const zooming = on && IN.zoom && ti < IN.zoom[1];

    // ---------------- câmera: mistura a vista da seção atual com a próxima
    const tops = sections.map(topOf);
    const anchor = st + vh * 0.5;
    let i = 0; for (let k = 0; k < tops.length; k++) if (tops[k] <= anchor) i = k;
    const j = Math.min(i + 1, sections.length - 1);
    const span = (tops[j] - tops[i]) || 1;
    const f = i === j ? 0 : smooth(0.55, 1.0, (anchor - tops[i]) / span);
    const va = VIEWS[sections[i].getAttribute('data-sk-view')] || VIEWS.hero, vb = VIEWS[sections[j].getAttribute('data-sk-view')] || VIEWS.hero;
    const size = engine.size;
    // Em telas estreitas, recua a câmera e abre espaço para o texto, que passa a ocupar quase toda a largura.
    const aspect = project ? size.W / size.H : 4 / 3;
    const fit = Math.sqrt(Math.min(1, aspect / (4 / 3)));
    const compact = 1 - smooth(0.5, 4 / 3, aspect);
    const ca = camOf(va, fit, compact), cb = camOf(vb, fit, compact), cam = {};
    for (const k in ca) cam[k] = lerp(ca[k], cb[k], f);
    const safe = {}; for (const k in va.safe) safe[k] = lerp(va.safe[k], vb.safe[k], f);
    if (compact > 0) {
      safe.x = lerp(safe.x, 0.5, compact);
      safe.y = lerp(safe.y, 0.46, compact * 0.7);
      safe.rx = lerp(safe.rx, Math.max(safe.rx, 0.64), compact);
    }
    let alpha = lerp(va.alpha, vb.alpha, f);

    // ---------------- órbita (seção "áreas" fixada): gira, depois explode e a câmera mergulha
    if (orbit) {
      const sec = orbit.closest('[data-sk-view]');
      const top = topOf(sec), h = sec.offsetHeight;
      const q = clamp((st - top) / Math.max(1, h - vh), 0, 1);
      const e = smooth(0.58, 0.92, q);
      const inView = st + vh > top && st < top + h;
      if (inView) cam.z = lerp(cam.z, 2.7, e);
      const rx = Math.min(vw * 0.38, 620), ry = rx * 0.46, spin = reduce ? 0 : t;
      if (inView) {
        if (!Ch[0].w) sizeChips();
        // posição da órbita + um desvio (ox, oy) que afasta chips sobrepostos: a cada quadro, cada par que se
        // toca é separado pelo eixo mais curto (metade para cada um, em duas passadas, para resolver grupos), com
        // no máximo 240 px/s de deslocamento para não dar salto; o desvio volta devagar a zero (1% a cada 1/60 s)
        // quando fica livre. Medido em tempo, não em quadros, para valer igual em qualquer fps.
        const dt = clamp(t - orbitT, 0, 0.1);
        orbitT = t;
        const maxMove = 240 * dt, keep = Math.pow(0.99, dt * 60);
        const P = chips.map((el, n) => {
          const c = Ch[n], a = c.a + spin * c.spd + q * 1.4;
          const z = Math.sin(a), depth = (z + 1) / 2, out = 1 + e * c.out;
          const sc = (0.78 + 0.62 * depth) * (1 + 0.6 * e);
          return { x: Math.cos(a) * rx * c.rad * out, y: (z * ry * 0.55 + c.lift * ry) * c.rad * out, sc, depth,
            hw: c.w * sc / 2 + 6, hh: c.h * sc / 2 + 6 };
        });
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < P.length; i++) {
            for (let j = i + 1; j < P.length; j++) {
              const A = P[i], B = P[j], ci = Ch[i], cj = Ch[j];
              const dx = (B.x + cj.ox) - (A.x + ci.ox), dy = (B.y + cj.oy) - (A.y + ci.oy);
              const px = A.hw + B.hw - Math.abs(dx), py = A.hh + B.hh - Math.abs(dy);
              if (px <= 0 || py <= 0) continue;
              if (px < py) { const d = Math.min(px / 2, maxMove) * (dx < 0 ? -1 : 1); ci.ox -= d; cj.ox += d; }
              else { const d = Math.min(py / 2, maxMove) * (dy < 0 ? -1 : 1); ci.oy -= d; cj.oy += d; }
            }
          }
        }
        chips.forEach((el, n) => {
          const c = Ch[n], p = P[n];
          c.ox *= keep; c.oy *= keep;
          el.style.transform = `translate3d(${(p.x + c.ox).toFixed(1)}px, ${(p.y + c.oy).toFixed(1)}px, 0) translate(-50%, -50%) scale(${p.sc.toFixed(3)})`;
          el.style.opacity = String(((0.55 + 0.45 * p.depth) * (1 - e)).toFixed(3));
          el.style.zIndex = String(Math.round(p.depth * 100));
        });
      }
      orbitLabels.forEach(el => { el.style.opacity = String(1 - e); });
    }

    // ---------------- abertura
    if (on) {
      if (!grown && ti >= IN.grow) { engine.replayIntro(IN.growDur); grown = true; }
      if (!uiShown && ti >= IN.ui) { uiShown = true; root.setAttribute('data-sk-intro', 'off'); }
      if (IN.band && !bandOff) {
        if (ti < IN.burst + 0.3) engine.setOverlay(band(ti)); else { engine.setOverlay([]); bandOff = true; }
      }
    }
    if (zooming) {
      const ez = inOut((ti - IN.zoom[0]) / (IN.zoom[1] - IN.zoom[0]));
      engine.setCamera({ z: Math.pow(IN.z0, 1 - ez), fx: bud.x, fy: bud.y, sx: lerp(0.5, bud.x * size.H / size.W, ez), sy: lerp(0.5, bud.y, ez) }, true);
      const hs = VIEWS.hero.safe; engine.setSafe({ ...hs, s: hs.s * ez }); engine.setAlpha(1);
    } else {
      engine.setCamera(cam); engine.setSafe(safe); engine.setAlpha(alpha);
    }

    // ---------------- anéis concêntricos seguem o foco da câmera
    if (rings) {
      const cc = engine.camera;
      const px = (F[0] - cc.fx) * size.H * cc.z + cc.sx * size.W, py = (F[1] - cc.fy) * size.H * cc.z + cc.sy * size.H;
      rings.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(0.7 + 0.35 * cc.z).toFixed(3)})`;
    }

    // ---------------- título: letras se montam na entrada e se dispersam no scroll
    // Entrada: a letra só aparece nos últimos 10% do caminho, já quase no lugar. Saída: a dispersão cresce com
    // p³ (quase parada no começo) e a palavra inteira some até p ≈ 0,3, antes de as letras se afastarem.
    const p = clamp(st / (vh * 0.9), 0, 1), p2 = p * p * p;
    letters.forEach((el, n) => {
      const d = L[n];
      const a = !on ? 1 : ease((ti - IN.ui - d.idel) / 1.1);
      const x = d.ix * (1 - a) + d.sx * p2, y = d.iy * (1 - a) + d.sy * p2, r = d.ir * (1 - a) + d.sr * p2;
      const op = Math.min(on ? smooth(0.9, 1, a) : 1, 1 - smooth(d.fade, d.fade + 0.14, p));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(1)}deg)`;
      el.style.opacity = op.toFixed(3);
    });

    // ---------------- manifesto: palavras desalinhadas que assentam
    if (words.length) {
      const sec = words[0].closest('[data-sk-view]');
      const top = topOf(sec), h = sec.offsetHeight;
      const m = clamp((st - top + vh * 0.6) / Math.max(1, h - vh * 0.4), 0, 1);
      words.forEach((el, n) => {
        // só aparece na segunda metade do caminho, já quase no lugar; a saída sobe o bloco todo junto
        const w = Wd[n], loc = reduce ? 1 : ease((m - w.d) / 0.26), exit = smooth(0.86, 1, m);
        el.style.transform = `translate3d(0, ${((1 - loc) * w.off - exit * 0.7).toFixed(3)}em, 0)`;
        el.style.opacity = (smooth(0.5, 1, loc) * (1 - exit)).toFixed(3);
      });
    }

    // ---------------- colunas com velocidades diferentes
    parallax.forEach(el => {
      const p = parallaxPosition(el, scroller.getBoundingClientRect().top, vh);
      el.style.transform = `translate3d(0, ${p.offset.toFixed(1)}px, 0)`;
    });

    // ---------------- entradas
    if (!reduce) reveals.forEach(el => {
      if (el.__shown) return;
      const r = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
      if (r.top - sr.top < vh * 0.9) showReveal(el, true);
    });

    // "Scroll": fica enquanto houver o que rolar abaixo; no fim da página some e deixa de ser clicável
    if (hint) {
      const more = st + vh < scroller.scrollHeight - 1;
      hint.style.opacity = more ? '1' : '0';
      hint.style.pointerEvents = more ? '' : 'none';
      hint.disabled = !more;
    }
  }
  raf = requestAnimationFrame(tick);

  return {
    engine, ascii,
    update(n) { Object.assign(o, n); engine.setOptions({ preset: o.preset, kanji: o.kanji, wind: o.wind }); },
    destroy() {
      dead = true; cancelAnimationFrame(raf); unmountMenu(); unmountColumns(); glass.destroy(); engine.destroy();
      skipEvents.forEach(ev => window.removeEventListener(ev, skip));
      window.removeEventListener('pagehide', onHide); videos.destroy(); ascii.destroy();
      if (hint) hint.removeEventListener('click', nextSection);
    },
  };
}
