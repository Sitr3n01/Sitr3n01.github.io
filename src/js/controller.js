// ------------------------------------------------------------------ controlador do site (dinâmicas do scroll)
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const lerp = (a, b, t) => a + (b - a) * t;

const VIEWS = {
  //        câmera (z, foco no centro das flores → posição na tela sx/sy)      zona de respiro                         opacidade
  hero:      { cam: { id: true },                     safe: { x: 0.40, y: 0.52, rx: 0.40, ry: 0.36, s: 0.42 }, alpha: 1.00 },
  manifesto: { cam: { z: 1.75, sx: 0.80, sy: 0.50 },  safe: { x: 0.34, y: 0.50, rx: 0.40, ry: 0.36, s: 0.90 }, alpha: 1.00 },
  about:     { cam: { z: 2.20, sx: 0.96, sy: 0.40 },  safe: { x: 0.40, y: 0.52, rx: 0.62, ry: 0.56, s: 0.93 }, alpha: 0.85 },
  work:      { cam: { z: 1.35, sx: 0.28, sy: 0.55 },  safe: { x: 0.50, y: 0.50, rx: 0.60, ry: 0.60, s: 0.45 }, alpha: 0.70 },
  areas:     { cam: { z: 1.05, sx: 0.50, sy: 0.50 },  safe: { x: 0.18, y: 0.86, rx: 0.26, ry: 0.16, s: 0.75 }, alpha: 0.95 },
  path:      { cam: { z: 1.60, sx: 0.12, sy: 0.88 },  safe: { x: 0.62, y: 0.50, rx: 0.50, ry: 0.62, s: 0.92 }, alpha: 0.90 },
  contact:   { cam: { id: true },                     safe: { x: 0.40, y: 0.55, rx: 0.48, ry: 0.42, s: 0.88 }, alpha: 1.00 },
};

function mount(root, options) {
  const o = Object.assign({ preset: 'kosa', kanji: true, wind: 1 }, options || {});
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = $('[data-sk-canvas]'), scroller = $('[data-sk-scroller]') || document.scrollingElement;
  const engine = createSakuraBackground(canvas, { preset: o.preset, kanji: o.kanji, wind: o.wind, holdIntro: !reduce });
  const F = engine.focus;
  const camOf = v => v.cam.id ? { z: 1, fx: 0, fy: 0, sx: 0, sy: 0 } : { z: v.cam.z, fx: F[0], fy: F[1], sx: v.cam.sx, sy: v.cam.sy };

  const sections = $$('[data-sk-view]');
  const letters = $$('[data-sk-letter]');
  const words = $$('[data-sk-word]');
  const parallax = $$('[data-sk-parallax]');
  const reveals = $$('[data-sk-reveal]');
  const chips = $$('[data-sk-chip]');
  const orbit = $('[data-sk-orbit]'), orbitLabels = $$('[data-sk-orbit-label]');
  const rings = $('[data-sk-rings]'), hint = $('[data-sk-hint]');
  const loader = $('[data-sk-loader]'), lBar = $('[data-sk-loader-bar]'), lDot = $('[data-sk-loader-dot]'),
    lIri = $('[data-sk-loader-iri]'), lMark = $('[data-sk-loader-mark]'), lCount = $('[data-sk-count]');

  // valores aleatórios estáveis por elemento
  const R = rngFrom(2026);
  const L = letters.map(() => ({
    ix: R.uniform(-420, 420), iy: R.uniform(-260, 260), ir: R.uniform(-50, 50), idel: R.uniform(0, 0.5),
    sx: R.uniform(-140, 140), sy: R.uniform(-380, -60), sr: R.uniform(-30, 30), fade: R.uniform(0.05, 0.6),
  }));
  const Wd = words.map((_, i) => ({ off: (i % 2 ? -1 : 1) * R.uniform(28, 96), d: 0.04 + 0.34 * i / Math.max(1, words.length - 1) + R.uniform(0, 0.05) }));
  const Ch = chips.map((_, i) => ({ a: i * 2.39996, rad: R.uniform(0.72, 1.18), lift: R.uniform(-0.35, 0.35), spd: R.uniform(0.08, 0.16), out: R.uniform(1.8, 3.4) }));

  const t0 = performance.now();
  let introFired = reduce, loaderDone = reduce, raf = 0, dead = false;
  if (reduce && loader) loader.style.display = 'none';
  if (!reduce) {
    reveals.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translate3d(0,40px,0)'; });
  }

  function topOf(el) { return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop; }

  function tick(now) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const t = (now - t0) / 1000;
    const st = scroller.scrollTop, vh = scroller.clientHeight, vw = scroller.clientWidth;

    // ---------------- loader: "T." vira "+." → ponto iridescente → abre a cena
    if (!loaderDone && loader) {
      const c = Math.round(100 * ease(t / 1.3));
      if (lCount) lCount.setAttribute('data-n', String(c).padStart(3, '0'));
      if (lBar) lBar.style.transform = `scaleY(${lerp(0.625, 1, ease((t - 0.15) / 1.0))})`;
      if (lIri) lIri.style.opacity = String(ease((t - 1.25) / 0.45));
      const out = ease((t - 1.8) / 0.7);
      if (lMark) { lMark.style.opacity = String(1 - out); lMark.style.transform = `scale(${1 - 0.15 * out})`; }
      if (lDot) lDot.style.transform = `scale(${1 + 26 * ease((t - 1.75) / 0.9)})`;
      loader.style.opacity = String(1 - ease((t - 2.05) / 0.55));
      if (!introFired && t > 1.9) { engine.replayIntro(); introFired = true; }
      if (t > 2.7) { loader.style.display = 'none'; loaderDone = true; }
    }

    // ---------------- câmera: mistura a vista da seção atual com a próxima
    const tops = sections.map(topOf);
    const anchor = st + vh * 0.5;
    let i = 0; for (let k = 0; k < tops.length; k++) if (tops[k] <= anchor) i = k;
    const j = Math.min(i + 1, sections.length - 1);
    const span = (tops[j] - tops[i]) || 1;
    const f = i === j ? 0 : smooth(0.55, 1.0, (anchor - tops[i]) / span);
    const va = VIEWS[sections[i].getAttribute('data-sk-view')] || VIEWS.hero, vb = VIEWS[sections[j].getAttribute('data-sk-view')] || VIEWS.hero;
    const ca = camOf(va), cb = camOf(vb), cam = {};
    for (const k in ca) cam[k] = lerp(ca[k], cb[k], f);
    const safe = {}; for (const k in va.safe) safe[k] = lerp(va.safe[k], vb.safe[k], f);
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
      chips.forEach((el, n) => {
        const c = Ch[n], a = c.a + spin * c.spd + q * 1.4;
        const z = Math.sin(a), depth = (z + 1) / 2;
        const out = 1 + e * c.out;
        const x = Math.cos(a) * rx * c.rad * out, y = (z * ry * 0.55 + c.lift * ry) * c.rad * out;
        const sc = (0.78 + 0.62 * depth) * (1 + 0.6 * e);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
        el.style.opacity = String(((0.55 + 0.45 * depth) * (1 - e)).toFixed(3));
        el.style.zIndex = String(Math.round(depth * 100));
      });
      orbitLabels.forEach(el => { el.style.opacity = String(1 - e); });
    }

    engine.setCamera(cam); engine.setSafe(safe); engine.setAlpha(alpha);

    // ---------------- anéis concêntricos seguem o foco da câmera
    if (rings) {
      const cc = engine.camera, size = engine.size;
      const px = (F[0] - cc.fx) * size.H * cc.z + cc.sx * size.W, py = (F[1] - cc.fy) * size.H * cc.z + cc.sy * size.H;
      rings.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(0.7 + 0.35 * cc.z).toFixed(3)})`;
    }

    // ---------------- título: letras se montam na entrada e se dispersam no scroll
    const p = clamp(st / (vh * 0.9), 0, 1);
    letters.forEach((el, n) => {
      const d = L[n];
      const a = reduce ? 1 : ease((t - 2.0 - d.idel) / 1.1);
      const x = d.ix * (1 - a) + d.sx * p, y = d.iy * (1 - a) + d.sy * p, r = d.ir * (1 - a) + d.sr * p;
      const op = Math.min(a, 1 - smooth(d.fade, d.fade + 0.35, p));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(1)}deg)`;
      el.style.opacity = op.toFixed(3);
    });

    // ---------------- manifesto: palavras desalinhadas que assentam
    if (words.length) {
      const sec = words[0].closest('[data-sk-view]');
      const top = topOf(sec), h = sec.offsetHeight;
      const m = clamp((st - top + vh * 0.6) / Math.max(1, h - vh * 0.4), 0, 1);
      words.forEach((el, n) => {
        const w = Wd[n], loc = reduce ? 1 : ease((m - w.d) / 0.26), exit = smooth(0.86, 1, m);
        el.style.transform = `translate3d(0, ${((1 - loc) * w.off - exit * 40).toFixed(1)}px, 0)`;
        el.style.opacity = (loc * (1 - exit)).toFixed(3);
      });
    }

    // ---------------- colunas com velocidades diferentes
    parallax.forEach(el => {
      const r = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
      const mid = r.top - sr.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-mid * parseFloat(el.getAttribute('data-sk-parallax'))).toFixed(1)}px, 0)`;
    });

    // ---------------- entradas
    if (!reduce) reveals.forEach(el => {
      if (el.__shown) return;
      const r = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
      if (r.top - sr.top < vh * 0.9) {
        el.__shown = true;
        el.style.transition = 'transform 1s cubic-bezier(.2,.7,.2,1), opacity 1s ease';
        el.style.opacity = '1'; el.style.transform = 'translate3d(0,0,0)';
      }
    });

    if (hint) hint.style.opacity = String(1 - clamp(st / 140, 0, 1));
  }
  raf = requestAnimationFrame(tick);

  return {
    engine,
    update(n) { Object.assign(o, n); engine.setOptions({ preset: o.preset, kanji: o.kanji, wind: o.wind }); },
    destroy() { dead = true; cancelAnimationFrame(raf); engine.destroy(); },
  };
}
