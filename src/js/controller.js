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
  me:        { cam: { z: 1.90, sx: 1.00, sy: 0.30 },  safe: { x: 0.52, y: 0.55, rx: 0.66, ry: 0.62, s: 0.94 }, alpha: 0.80 },
  contact:   { cam: { id: true },                    safe: { x: 0.40, y: 0.55, rx: 0.48, ry: 0.42, s: 0.88 }, alpha: 1.00 },
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
  const onHistory = () => { if (menu.open) dismiss(); };
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
  window.addEventListener('popstate', onHistory);
  window.addEventListener('pagehide', onHistory);
  return () => {
    if (menu.open) dismiss();
    reset();
    root.removeAttribute('data-sk-menu-ready');
    opener.removeEventListener('click', open);
    menu.removeEventListener('close', reset);
    menu.removeEventListener('click', click);
    layout.removeEventListener('change', resize);
    window.removeEventListener('popstate', onHistory);
    window.removeEventListener('pagehide', onHistory);
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

// Níveis de qualidade. Começa pelo melhor que o aparelho sugere (Save-Data e deviceMemory; o nível mais baixo já
// atingido fica guardado) e desce sozinho quando mede sobrecarga: dois intervalos seguidos de 2 s com mais de 20% dos
// quadros acima de 40 ms, ou o quadro do motor acima de 16 ms no nível A (metade do quadro a 30 fps). Depois de
// cada troca há 4 s sem avaliar: a troca refaz o canvas e não pode contar como sobrecarga. Nunca sobe na mesma visita (não oscila); o
// nível guardado vale por 14 dias, para um engasgo isolado não prender o aparelho no nível baixo.
// ?tier=a|b|c fixa o nível (testes). O nível vai para data-sk-tier na raiz: o CSS do nível C tira o desfoque do vidro.
const TIERS = {
  a: { engine: { fps: 30, dpr: 2, glitch: true, scramble: true, ambient: 1 }, ascii: { fps: 30, density: 1, animate: Infinity } },
  b: { engine: { fps: 24, dpr: 1.5, glitch: false, scramble: true, ambient: 0.6 }, ascii: { fps: 24, density: 0.75, animate: 2 } },
  c: { engine: { fps: 15, dpr: 1, glitch: false, scramble: false, ambient: 0.4 }, ascii: { fps: 15, density: 0.55, animate: 1 } },
};
const TIER_KEY = 'sk-tier-v1', TIER_DAYS = 14;

function mountQuality(root, engine, ascii, hooks) {
  const order = Object.keys(TIERS);
  const local = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* sem storage */ } return null; };
  const forced = (/[?&]tier=([abc])\b/.exec(location.search) || [])[1];
  const nav = typeof navigator === 'object' ? navigator : {};
  const mem = nav.deviceMemory, saveData = nav.connection && nav.connection.saveData;
  const prior = saveData || (mem && mem <= 2) ? 'c' : mem && mem <= 4 ? 'b' : 'a';
  let stored = 'a';
  try { const s = JSON.parse(local(TIER_KEY)); if (order.includes(s.t) && Date.now() - s.at < TIER_DAYS * 864e5) stored = s.t; } catch (e) { /* nada guardado */ }
  let tier = forced || order[Math.max(order.indexOf(prior), order.indexOf(stored))];
  const apply = t => {
    tier = t;
    root.setAttribute('data-sk-tier', t);
    engine.setQuality(TIERS[t].engine);
    ascii.setQuality(TIERS[t].ascii);
    if (hooks.tier) hooks.tier(t);
  };
  apply(tier);

  let raf = 0, t0 = 0, last = 0, n = 0, slow = 0, bad = 0, calm = 0;
  const loop = now => {
    raf = 0;
    if (tier === 'c') return; // nada abaixo
    raf = requestAnimationFrame(loop);
    if (document.hidden || root.getAttribute('data-sk-intro') === 'on') { last = 0; t0 = 0; n = slow = 0; return; }
    if (now < calm) { last = 0; t0 = 0; n = slow = 0; return; }
    if (last) { const gap = now - last; if (gap < 400) { n++; if (gap > 40) slow++; } }
    last = now;
    if (!t0) t0 = now;
    if (now - t0 < 2000) return;
    const over = (n >= 10 && slow / n > 0.2) || (tier === 'a' && engine.load.ms > 16);
    bad = over ? bad + 1 : 0;
    t0 = now; n = slow = 0;
    if (bad < 2) return;
    bad = 0; calm = now + 4000;
    apply(order[order.indexOf(tier) + 1]);
    local(TIER_KEY, JSON.stringify({ t: tier, at: Date.now() }));
  };
  if (!forced) raf = requestAnimationFrame(loop);
  return { get tier() { return tier; }, destroy() { cancelAnimationFrame(raf); } };
}

// Troca de idioma (PT | EN na toolbar): o link leva à mesma página no outro idioma; no clique, ganha a âncora da
// seção visível (data-sk-alt = id dela no outro idioma), para a leitura continuar do mesmo ponto. O item do
// idioma atual não recarrega a página.
function mountLang(root, scroller) {
  const links = Array.from(root.querySelectorAll('.sk-lang a'));
  const sections = Array.from(root.querySelectorAll('main > section'));
  const click = event => {
    const a = event.currentTarget;
    if (a.hasAttribute('aria-current')) { event.preventDefault(); return; }
    const probe = scroller.scrollTop + scroller.clientHeight * 0.4;
    let id = '';
    for (const s of sections) if (s.offsetTop <= probe) id = s.getAttribute('data-sk-alt') || '';
    a.href = a.getAttribute('data-sk-lang-alt') + (id ? '#' + id : '');
  };
  links.forEach(a => a.addEventListener('click', click));
  return () => links.forEach(a => a.removeEventListener('click', click));
}

// Tema claro/escuro. O padrão é o claro; a escolha do visitante (botões [data-sk-theme]) fica guardada em sk-theme e
// vale em todas as páginas. O <head> aplica o tema antes da primeira pintura (?theme=, a escolha guardada ou o claro) em
// data-theme no <html>. Uma página que reaparece sem recarregar (voltar/avançar pela bfcache, aba que volta a ser
// exibida) e outra aba que troca o tema também seguem a escolha guardada. As cores ficam só nos tokens CSS (THEMES no
// gerador): apply() recebe as do tema atual para o canvas da sakura e os cards. A troca pelo botão passa por uma
// transição de vista (fade de toda a tela) quando há suporte.
const THEME_KEY = 'sk-theme';
function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = v => v.split(',').map(Number);
  return { ink: rgb(cs.getPropertyValue('--sk-ink-rgb')), parch: rgb(cs.getPropertyValue('--sk-parch-rgb')),
    tones: cs.getPropertyValue('--sk-tones').trim().split(/\s+/).map(rgb),
    petalInk: rgb(cs.getPropertyValue('--sk-petal-ink-rgb')), petalA: Number(cs.getPropertyValue('--sk-petal-a')) || 1,
    petalEnd: rgb(cs.getPropertyValue('--sk-paper-rgb')),
    hex: cs.getPropertyValue('--sk-parch').trim() };
}
function mountTheme(root, apply, reduce) {
  const html = document.documentElement, buttons = Array.from(root.querySelectorAll('[data-sk-theme]'));
  const meta = document.querySelector('meta[name="theme-color"]');
  const forced = /[?&]theme=(dark|light)\b/.test(location.search);
  const stored = () => { try { const t = localStorage.getItem(THEME_KEY); return t === 'dark' || t === 'light' ? t : null; } catch (e) { return null; } };
  const sync = () => {
    const dark = html.getAttribute('data-theme') === 'dark', c = themeColors();
    buttons.forEach(b => b.setAttribute('aria-pressed', String(dark)));
    if (meta && c.hex) meta.setAttribute('content', c.hex);
    apply(c);
  };
  // o tema pedido fica em `want`: com a transição, o data-theme só muda depois da captura da tela antiga, e um segundo
  // clique nesse meio-tempo precisa partir do tema já pedido
  let want = html.getAttribute('data-theme');
  const set = (t, animate) => {
    if (want === t) return;
    want = t;
    const go = () => { html.setAttribute('data-theme', want); sync(); };
    // uma transição interrompida (outro clique, aba oculta) só pula a animação: a troca acontece do mesmo jeito
    if (animate && !reduce && !document.hidden && typeof document.startViewTransition === 'function') document.startViewTransition(go).ready.catch(() => {});
    else go();
  };
  const click = () => {
    const t = want === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* sem storage: vale só nesta página */ }
    set(t, true);
  };
  // Voltar/avançar pode restaurar a página congelada (bfcache), com o tema de quando ela foi deixada: nem o <head> roda de
  // novo nem o aviso de storage chega a ela. Ao reaparecer, ela adota a escolha guardada. Sem escolha legível (storage
  // bloqueado), fica como está, para não desfazer uma troca feita nesta página.
  const adopt = () => { const t = !forced && stored(); if (t) set(t, false); };
  const onShow = e => { if (e.persisted) adopt(); };
  const onVisible = () => { if (!document.hidden) adopt(); };
  // outra aba trocou o tema
  const onStorage = e => { if (e.key === THEME_KEY && !forced && (e.newValue === 'dark' || e.newValue === 'light')) set(e.newValue, false); };
  if (!want) html.setAttribute('data-theme', want = 'light'); // página sem o script do <head> (artboard)
  buttons.forEach(b => b.addEventListener('click', click));
  window.addEventListener('pageshow', onShow);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('storage', onStorage);
  sync();
  return () => {
    buttons.forEach(b => b.removeEventListener('click', click));
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('storage', onStorage);
  };
}

function mount(root, options) {
  const o = Object.assign({ preset: 'kosa', kanji: true, wind: 1 }, options || {});
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = $('[data-sk-canvas]'), scroller = $('[data-sk-scroller]') || document.scrollingElement;
  // O site rola o próprio documento; só o artboard de Design tem um scroller interno. Com o documento, a posição da
  // rolagem fica com o controlador (F5 recomeça do topo, voltar devolve a posição guardada): a restauração automática
  // do navegador chegaria depois e brigaria com a abertura.
  const docScroll = scroller === document.scrollingElement;
  if (docScroll && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  const viewTop = () => (docScroll ? 0 : scroller.getBoundingClientRect().top); // topo da área visível, na tela
  // Efeitos presos à rolagem no compositor (animation-timeline): as palavras do manifesto e o parallax andam junto com
  // a rolagem mesmo com a thread principal ocupada. O controlador só escreve as faixas de rolagem de cada um (em px)
  // quando o layout muda. Sem suporte, ele anima como antes, no quadro. As letras do título ficam no quadro: o Chrome
  // atualiza cada animação dessas a cada quadro, mesmo parado, e 80 letras custariam ~20% da thread principal no hero.
  const timeline = docScroll && !reduce && typeof CSS === 'object' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: scroll()');
  const menuLayout = matchMedia('(max-width: 950px), (max-width: 1024px) and (pointer: coarse), (max-height: 520px) and (pointer: coarse)');
  const singleColumn = matchMedia('(max-width: 720px), (max-width: 935px) and (pointer: coarse)');
  const unmountMenu = mountMenu(root, menuLayout), unmountColumns = mountCardColumns($('[data-sk-card-columns]'), singleColumn);
  const unmountLang = mountLang(root, scroller);
  const project = !!$('[data-sk-view="proj"]');
  // os anéis seguem a câmera suavizada do motor: atualizados no quadro do motor, junto com o canvas
  const engine = createSakuraBackground(canvas, { preset: o.preset, kanji: o.kanji, wind: o.wind, holdIntro: !reduce, project,
    onFrame: () => placeRings() });
  const glass = mountGlass(root, scroller), videos = mountVideos(root), ascii = mountAscii(root);
  const qualityHooks = {}, quality = mountQuality(root, engine, ascii, qualityHooks);
  let themed = false;
  const unmountTheme = mountTheme(root, c => {
    engine.setOptions({ ink: c.ink, parch: c.parch, petalInk: c.petalInk, petalA: c.petalA, petalEnd: c.petalEnd });
    if (c.tones.length === 4) ascii.setTones(c.tones);
    if (themed) engine.renderNow(); // troca: o quadro novo sai já com as cores novas (a transição captura este estado)
    themed = true;
  }, reduce);
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
  const touchUI = matchMedia('(pointer: coarse)');
  let hintGone = false; // toque: o "Scroll" já saiu depois do primeiro gesto

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
  // no compositor, cada palavra leva o próprio deslocamento numa propriedade CSS
  const manifestoText = words.length ? words[0].parentElement : null;
  if (timeline) words.forEach((el, n) => el.style.setProperty('--off', Wd[n].off.toFixed(3) + 'em'));

  const Ch = chips.map((_, i) => ({ a: i * 2.39996, rad: R.uniform(0.72, 1.18), lift: R.uniform(-0.35, 0.35), spd: R.uniform(0.08, 0.16), out: R.uniform(1.8, 3.4),
    ox: 0, oy: 0, w: 0, h: 0 }));
  // tamanhos dos chips (sem transform), lidos uma vez e de novo quando as fontes carregam
  const sizeChips = () => chips.forEach((el, n) => { Ch[n].w = el.offsetWidth; Ch[n].h = el.offsetHeight; });
  let orbitT = 0;
  if (chips.length && document.fonts && document.fonts.ready) document.fonts.ready.then(sizeChips);

  const t0 = performance.now();
  let raf = 0, dead = false;

  // O tick só roda quando algo muda: rolagem, redimensionamento, abertura ou órbita na tela. A geometria (topos das
  // seções, colunas com parallax, tamanho da área de rolagem) fica em cache e só é medida de novo quando o layout muda,
  // para o quadro não ler o layout depois de escrever transforms.
  const scrollEvents = scroller === document.scrollingElement ? window : scroller;
  const geo = { dirty: true, vh: 0, vw: 0, tops: [], heights: [], cols: [], paper: [], orbitTop: 0, orbitH: 0, wordsTop: 0, wordsH: 0 };
  const paper = $$('.sk-card, .sk-stack, .sk-facts, .sk-stats, .sk-video-frame, .sk-me-photo, .sk-tile');
  const wake = () => { if (!raf && !dead) raf = requestAnimationFrame(tick); };
  const relayout = () => { geo.dirty = true; wake(); };
  // deslocamento vertical que o transform atual dá ao elemento (inline ou da animação presa à rolagem)
  const shiftOf = el => translateY(getComputedStyle(el).transform);
  const px = v => v.toFixed(1) + 'px';
  function measure() {
    geo.dirty = false;
    geo.vh = scroller.clientHeight; geo.vw = scroller.clientWidth; geo.scrollH = scroller.scrollHeight;
    geo.tops = sections.map(topOf); geo.heights = sections.map(el => el.offsetHeight);
    geo.cols = parallax.map(el => ({ el, top: topOf(el) - shiftOf(el), h: el.offsetHeight, speed: Number(el.dataset.skParallax), y: NaN }));
    if (orbit) { const sec = orbit.closest('[data-sk-view]'); geo.orbitTop = topOf(sec); geo.orbitH = sec.offsetHeight; }
    if (words.length) { const sec = words[0].closest('[data-sk-view]'); geo.wordsTop = topOf(sec); geo.wordsH = sec.offsetHeight; }
    // superfícies de papel (opacas): quanto da tela elas tapam decide a velocidade do fundo (engine.setCover)
    const left = docScroll ? 0 : scroller.getBoundingClientRect().left;
    geo.paper = paper.map(el => {
      const r = el.getBoundingClientRect(), colEl = el.closest('[data-sk-parallax]'), col = geo.cols.find(c => c.el === colEl) || null;
      const w = Math.max(0, Math.min(r.right - left, geo.vw) - Math.max(r.left - left, 0));
      return { top: topOf(el) - (col ? shiftOf(col.el) : 0) - shiftOf(el.closest('[data-sk-reveal]') || el), h: r.height, w, col };
    });
    if (timeline) timelineRanges();
  }
  // As faixas de rolagem (em px) dos efeitos no compositor, com as mesmas contas do quadro (tick): cada palavra do
  // manifesto no próprio trecho e o parallax linear na página inteira.
  function timelineRanges() {
    const vh = geo.vh;
    if (words.length) {
      const m0 = geo.wordsTop - vh * 0.6, mL = Math.max(1, geo.wordsH - vh * 0.4);
      words.forEach((el, n) => { el.style.setProperty('--w0', px(m0 + mL * Wd[n].d)); el.style.setProperty('--w1', px(m0 + mL * (Wd[n].d + 0.26))); });
      manifestoText.style.setProperty('--x0', px(m0 + mL * 0.86)); manifestoText.style.setProperty('--x1', px(m0 + mL));
    }
    const max = Math.max(0, geo.scrollH - vh), single = singleColumn.matches;
    for (const c of geo.cols) {
      const k = single ? 0 : c.speed / (1 + c.speed), at = st => -((c.top - st) + (c.h - vh) / 2) * k;
      c.el.style.removeProperty('transform');
      c.el.style.setProperty('--y0', px(at(0))); c.el.style.setProperty('--y1', px(at(max)));
    }
    root.setAttribute('data-sk-timeline', '');
  }
  const layoutRO = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
  const content = docScroll ? root : scroller.firstElementChild;
  if (layoutRO) { layoutRO.observe(scroller); if (content) layoutRO.observe(content); }
  // as faixas já valem no primeiro quadro (quem chega por âncora ou pelo voltar cai no meio das cenas)
  if (timeline) measure();
  // As animações das palavras só ficam ligadas (data-sk-live) com o manifesto perto da tela. Elas ligam com a seção a
  // 10% da base da tela, quando o texto ainda está meia tela abaixo, e, vindo de baixo, com a seção a 25% acima do
  // topo. Desligadas, as palavras ficam no estado sem animação, sempre fora da tela.
  const manifestoSec = manifestoText && manifestoText.closest('[data-sk-view]');
  const liveIO = timeline && manifestoSec ? new IntersectionObserver(entries => {
    for (const en of entries) en.target.toggleAttribute('data-sk-live', en.isIntersecting);
  }, { rootMargin: '25% 0px -10% 0px' }) : null;
  if (liveIO) liveIO.observe(manifestoSec);
  window.addEventListener('resize', relayout);
  scrollEvents.addEventListener('scroll', wake, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  const last = { p: NaN, m: NaN, e: NaN, hint: null, intro: true };

  // home: primeira visita da sessão e F5 → abertura completa (o F5 recomeça do topo); voltar à home navegando
  // dentro do site → recuo curto. ?intro=full força a completa.
  // Páginas de projeto, chegada por âncora (#projetos; #inicio não conta, é o topo) ou botão "voltar" → só a árvore crescendo.
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { /* sem storage */ } return null; };
  const navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type;
  const scrollKey = 'sk-scroll:' + location.pathname, saved = navType === 'back_forward' ? store(scrollKey) : null;
  let mode = o.intro === undefined ? 'home' : o.intro;
  const reload = mode === 'home' && navType === 'reload';
  if (reload && location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  let hashId = '';
  try { hashId = decodeURIComponent(location.hash.slice(1)); } catch { /* uma âncora inválida equivale a nenhuma */ }
  // a âncora do topo (#inicio, #home) não conta: é a abertura normal
  const hashTarget = hashId ? root.querySelector('#' + CSS.escape(hashId)) : null;
  const hashEl = hashTarget && !hashTarget.matches('[data-sk-view="hero"]') ? hashTarget : null;
  if (mode === 'home') {
    const seen = store('sk-intro') === '1' && !reload && !/[?&]intro=full\b/.test(location.search);
    store('sk-intro', '1');
    mode = saved != null || hashEl ? 'page' : seen ? 'short' : 'full';
  }
  const jump = top => scroller.scrollTo({ top, behavior: 'instant' });
  if (reload) jump(0);
  const IN = reduce || mode === false ? null : INTRO[mode];
  // posição de rolagem: volta para onde estava; âncora vai direto (sem rolagem suave)
  if (saved != null || hashEl) {
    const scrollPadding = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    jump(saved != null ? Number(saved) : hashEl.offsetTop - scrollPadding);
  }
  let restore = saved, hiddenAt = null, restoreFrame = 0;
  const onHide = () => { hiddenAt = scroller.scrollTop; store(scrollKey, String(hiddenAt)); };
  const onShow = event => {
    if (event.persisted) restore = hiddenAt;
    if (restore == null) return;
    // O WebKit aplica a posição da âncora após o script de montagem, durante a navegação pelo histórico.
    restoreFrame = requestAnimationFrame(() => { if (restore != null) jump(Number(restore)); restore = null; });
  };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);
  const bud = IN && IN.zoom ? engine.pickBud(BUD_AT[0], BUD_AT[1]) : null;
  const on = !!IN && (!IN.zoom || !!bud);
  let skew = 0, grown = false, burstDone = false, bandOff = false, uiShown = !on, introSkipped = false;
  if (on) root.setAttribute('data-sk-intro', 'on');
  const showUI = () => { uiShown = true; root.setAttribute('data-sk-intro', 'off'); };
  const skip = () => {
    restore = null;
    if (!on || uiShown) return;
    const ti = (performance.now() - t0) / 1000 - skew;
    if (ti < IN.end) skew -= IN.end - ti;
    introSkipped = true;
    engine.skipIntro(); grown = true; burstDone = true; showUI(); wake();
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
    if (singleColumn.matches) return { current: 0, offset: 0, rate: 1 };
    const r = el.getBoundingClientRect(), current = shiftOf(el);
    const speed = Number(el.dataset.skParallax);
    const mid = r.top - viewportTop - current + (r.height - height) / 2;
    return { current, offset: -mid * speed / (1 + speed), rate: 1 / (1 + speed) };
  }

  const intersect = (a, b) => ({ from: Math.max(a.from, b.from), to: Math.min(a.to, b.to) });
  const textBlock = 'h1,h2,h3,h4,p,li,figcaption,.sk-cell,.sk-fact,.sk-stat,.sk-next,.sk-video-empty';

  // Entradas: o bloco sobe e aparece, uma vez. No desktop, quando passa da linha de 90% da tela (40 px em 1 s). No
  // celular, começa antes de o bloco entrar, a 20% da tela abaixo dela, e é mais curta (16 px em 0,5 s): numa rolagem
  // rápida, o texto já chega montado. A transição roda no compositor. No nível C, nenhum conteúdo fica escondido.
  const compactIn = matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const IN_FX = compactIn ? { y: 16, s: 0.5, margin: '0px 0px 20% 0px' } : { y: 40, s: 1, margin: '0px 0px -10% 0px' };
  function showReveal(el, animate) {
    el.__shown = true;
    if (revealIO) revealIO.unobserve(el);
    el.style.transition = animate ? `transform ${IN_FX.s}s cubic-bezier(.2,.7,.2,1), opacity ${IN_FX.s}s ease` : 'none';
    el.style.opacity = '1'; el.style.transform = 'translate3d(0,0,0)';
  }

  // Planeja as paradas pela área de leitura e pelas linhas reais, inclusive após redimensionar ou carregar as fontes.
  const nextSection = () => {
    const st = scroller.scrollTop, height = scroller.clientHeight, max = scroller.scrollHeight - height;
    const viewportTop = viewTop();
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
    // Numa janela menor que uma linha, mantenha o avanço por telas mesmo que nenhum bloco caiba.
    if (bottom - top < 20) stops.push(Math.min(max, st + Math.max(2, Math.floor(height * 0.55))));
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
  skipEvents.forEach(ev => window.addEventListener(ev, skip, { passive: true, capture: true }));

  // entradas: um observador avisa quando o bloco passa da linha de disparo (ou já ficou acima dela)
  let revealIO = null;
  const revealAll = () => { for (const el of reveals) if (!el.__shown) showReveal(el, false); if (revealIO) revealIO.disconnect(); };
  if (!reduce && quality.tier !== 'c') {
    reveals.forEach(el => { el.style.opacity = '0'; el.style.transform = `translate3d(0,${IN_FX.y}px,0)`; });
    revealIO = new IntersectionObserver(entries => {
      for (const en of entries) {
        const top = en.rootBounds ? en.rootBounds.top : 0;
        if (!en.target.__shown && (en.isIntersecting || en.boundingClientRect.bottom <= top)) showReveal(en.target, en.isIntersecting);
        if (en.target.__shown) revealIO.unobserve(en.target);
      }
    }, { root: docScroll ? null : scroller, rootMargin: IN_FX.margin });
    reveals.forEach(el => revealIO.observe(el));
  }
  qualityHooks.tier = t => { if (t === 'c') revealAll(); };
  const revealFocus = event => {
    const reveal = event.target.closest('[data-sk-reveal]');
    if (!reduce && reveal && getComputedStyle(reveal).opacity !== '1') showReveal(reveal, false);
  };
  scroller.addEventListener('focusin', revealFocus);

  function topOf(el) { return el.getBoundingClientRect().top - viewTop() + scroller.scrollTop; }

  function placeRings() {
    if (!rings || dead) return;
    const cc = engine.camera, size = engine.size;
    const px = (F[0] - cc.fx) * size.H * cc.z + cc.sx * size.W, py = (F[1] - cc.fy) * size.H * cc.z + cc.sy * size.H;
    rings.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(0.7 + 0.35 * cc.z).toFixed(3)})`;
  }

  function tick(now) {
    raf = 0;
    if (dead) return;
    const t = (now - t0) / 1000;
    // leituras primeiro (o layout em cache só é medido de novo quando mudou), escritas depois
    if (geo.dirty) measure();
    const st = scroller.scrollTop, vh = geo.vh, vw = geo.vw;
    let again = false; // pede outro quadro: abertura em andamento ou órbita girando na tela

    const ti = t - skew; // relógio da abertura (avança de uma vez quando o visitante pula)
    const zooming = on && IN.zoom && ti < IN.zoom[1];
    // as letras do título terminam de se montar em IN.ui + 0,5 s (maior atraso) + 1,1 s
    const introLive = on && !introSkipped && ti < Math.max(IN.end, IN.ui + 1.65);
    if (introLive) again = true;

    // ---------------- câmera: mistura a vista da seção atual com a próxima
    const tops = geo.tops;
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
      const top = geo.orbitTop, h = geo.orbitH;
      const q = clamp((st - top) / Math.max(1, h - vh), 0, 1);
      const e = smooth(0.58, 0.92, q);
      const inView = st + vh > top && st < top + h;
      if (inView) cam.z = lerp(cam.z, 2.7, e);
      const rx = Math.min(vw * 0.38, 620), ry = rx * 0.46, spin = reduce ? 0 : t;
      if (inView) {
        if (!reduce) again = true;
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
      if (e !== last.e) { orbitLabels.forEach(el => { el.style.opacity = String(1 - e); }); last.e = e; }
    }

    // ---------------- abertura
    if (on) {
      if (!grown && ti >= IN.grow) { engine.replayIntro(IN.growDur); grown = true; }
      if (!uiShown && ti >= IN.ui) showUI();
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
    if (reduce) placeRings(); // sem o laço do motor, os anéis acompanham aqui

    // ---------------- título: letras se montam na entrada e se dispersam no scroll
    // Entrada: a letra só aparece nos últimos 10% do caminho, já quase no lugar. Saída: a dispersão cresce com
    // p³ (quase parada no começo) e a palavra inteira some até p ≈ 0,3, antes de as letras se afastarem.
    const p = clamp(st / (vh * 0.9), 0, 1), p2 = p * p * p;
    if (!reduce && (introLive || last.intro || p !== last.p)) letters.forEach((el, n) => {
      const d = L[n];
      const a = !on || introSkipped ? 1 : ease((ti - IN.ui - d.idel) / 1.1);
      const x = d.ix * (1 - a) + d.sx * p2, y = d.iy * (1 - a) + d.sy * p2, r = d.ir * (1 - a) + d.sr * p2;
      const op = Math.min(on ? smooth(0.9, 1, a) : 1, 1 - smooth(d.fade, d.fade + 0.14, p));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(1)}deg)`;
      el.style.opacity = op.toFixed(3);
    });
    last.p = p; last.intro = introLive;

    // ---------------- manifesto: palavras desalinhadas que assentam
    if (!reduce && !timeline && words.length) {
      const m = clamp((st - geo.wordsTop + vh * 0.6) / Math.max(1, geo.wordsH - vh * 0.4), 0, 1);
      if (m !== last.m) words.forEach((el, n) => {
        // só aparece na segunda metade do caminho, já quase no lugar; a saída sobe o bloco todo junto
        const w = Wd[n], loc = ease((m - w.d) / 0.26), exit = smooth(0.86, 1, m);
        el.style.transform = `translate3d(0, ${((1 - loc) * w.off - exit * 0.7).toFixed(3)}em, 0)`;
        el.style.opacity = (smooth(0.5, 1, loc) * (1 - exit)).toFixed(3);
      });
      last.m = m;
    }

    // ---------------- colunas com velocidades diferentes (posição sem transform, em cache). No compositor, a animação
    // move a coluna; aqui fica só a posição calculada, que a conta do papel usa.
    const single = singleColumn.matches;
    for (const c of geo.cols) {
      const y = single ? 0 : -((c.top - st) + (c.h - vh) / 2) * c.speed / (1 + c.speed);
      if (Math.abs(y - c.y) < 0.05) continue;
      c.y = y;
      if (!timeline) c.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }

    // ---------------- papel cobrindo a tela: o fundo desacelera (≥ 50%) ou espera (≥ 80%)
    let covered = 0;
    for (const b of geo.paper) {
      const top = b.top + (b.col && b.col.y === b.col.y ? b.col.y : 0);
      const v = Math.min(top + b.h, st + vh) - Math.max(top, st);
      if (v > 0) covered += v * b.w;
    }
    engine.setCover(zooming || introLive ? 0 : covered / Math.max(1, vw * vh));

    // "Scroll": fica enquanto houver o que rolar abaixo; no fim da página some e deixa de ser clicável. No toque, só
    // aparece no hero e some de vez no primeiro gesto (a primeira rolagem), para nunca ficar sobre o texto.
    if (hint) {
      if (touchUI.matches && st > vh * 0.05) hintGone = true;
      // rolando o documento no celular, a barra de endereço recolhida deixa a área visível (innerHeight) maior que o
      // clientHeight: o fim da página é medido com a maior das duas
      const seen = docScroll ? Math.max(vh, window.innerHeight) : vh;
      const more = st + seen < geo.scrollH - 1 && !(touchUI.matches && hintGone);
      if (more !== last.hint) {
        hint.style.opacity = more ? '1' : '0';
        hint.style.pointerEvents = more ? '' : 'none';
        hint.disabled = !more;
        last.hint = more;
      }
    }
    if (again) wake();
  }
  wake();

  return {
    engine, ascii, get tier() { return quality.tier; },
    update(n) { Object.assign(o, n); engine.setOptions({ preset: o.preset, kanji: o.kanji, wind: o.wind }); },
    destroy() {
      dead = true; cancelAnimationFrame(raf); unmountMenu(); unmountColumns(); unmountLang(); unmountTheme(); glass.destroy(); engine.destroy();
      if (layoutRO) layoutRO.disconnect(); if (revealIO) revealIO.disconnect(); if (liveIO) liveIO.disconnect(); quality.destroy();
      window.removeEventListener('resize', relayout); scrollEvents.removeEventListener('scroll', wake);
      skipEvents.forEach(ev => window.removeEventListener(ev, skip, true));
      scroller.removeEventListener('focusin', revealFocus);
      cancelAnimationFrame(restoreFrame); window.removeEventListener('pageshow', onShow);
      window.removeEventListener('pagehide', onHide); videos.destroy(); ascii.destroy();
      if (hint) hint.removeEventListener('click', nextSection);
    },
  };
}
