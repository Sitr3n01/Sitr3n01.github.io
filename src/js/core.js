const REF_H = 2160; // geometria definida numa referência de 2160 px de altura
const PROJECT_ASPECT = 1440 / 900;

const R3 = { spurGap: [[65, 125], [110, 200]], umbel: [3, 5], tipUmbel: [3, 5], keepFrom: 0.88, minDist: 112 };
const PRESETS = {
  kosa: { ...R3, seed: 633, ambient: 30,
    limbs: [{ x: -120, y: 0.06, ang: 0.30, r0: 112, L: 4400, heading: 0.27, droop: 0.5 },
            { x: -130, y: 0.94, ang: -0.33, r0: 120, L: 4400, heading: -0.29, droop: 0.5 },
            { x: -100, y: 0.50, ang: -0.02, r0: 54, L: 2500, heading: 0.0, droop: 0.9 }],
    children: { 0: [4, 6], 1: [2, 4], 2: [1, 3], 3: [0, 2] } },
  sanbon: { ...R3, seed: 611, ambient: 28,
    limbs: [{ x: -120, y: 0.17, ang: 0.06, r0: 78, L: 4100, heading: 0.04, droop: 0.8 },
            { x: -140, y: 0.50, ang: -0.07, r0: 112, L: 4400, heading: -0.04, droop: 0.7 },
            { x: -120, y: 0.84, ang: -0.12, r0: 68, L: 3500, heading: -0.08, droop: 0.8 }],
    children: { 0: [4, 6], 1: [2, 4], 2: [1, 3], 3: [0, 2] } },
  ogi: { ...R3, seed: 622, ambient: 28,
    limbs: [[-0.12, 104, 4300], [-0.42, 92, 4000], [-0.72, 80, 3300], [-0.98, 66, 2700], [-1.18, 52, 2200]]
      .map(([a, r, L]) => ({ x: -110, y: 1.04, ang: a, r0: r, L, heading: a * 0.85, droop: 0.7 })),
    children: { 0: [3, 5], 1: [2, 3], 2: [1, 3], 3: [0, 1] } },
  itozakura: { ...R3, seed: 644, weep: true, minDist: 96, ambient: 26,
    spurGap: [[60, 110], [70, 130]], umbel: [2, 4], tipUmbel: [3, 4],
    limbs: [{ x: -140, y: 0.08, ang: -0.02, r0: 118, L: 3900, heading: 0.0, droop: 0.4 },
            { xf: 0.30, y: -0.037, ang: 0.35, r0: 62, L: 2900, heading: 0.10, droop: 0.4 }],
    children: { 0: [13, 16], 1: [1, 2], 2: [0, 1] } },
  koeda: { ...R3, seed: 655, wind: 0.25, ambient: 60,
    limbs: [[0.10, 0.16, 60, 3500], [0.30, -0.10, 48, 2800], [0.47, 0.05, 70, 4300],
            [0.63, -0.20, 42, 2500], [0.78, -0.06, 56, 3600], [0.93, -0.28, 46, 2700]]
      .map(([y, a, r, L]) => ({ x: -90, y, ang: a, r0: r, L, heading: a * 0.7, droop: 0.9 })),
    children: { 0: [3, 5], 1: [2, 3], 2: [1, 2], 3: [0, 1] } },
};

// ------------------------------------------------------------------ utilidades
function rngFrom(seed) {
  let a = seed >>> 0;
  const next = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    random: next,
    uniform: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    normal: (mu = 0, sd = 1) => { const u = 1 - next(), v = next(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return r;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------ geração da cena
function generate(presetName, seed, aspect, complete = false) {
  const P = PRESETS[presetName] || PRESETS.kosa;
  const rng = rngFrom(seed ?? P.seed);
  const W = REF_H * aspect, H = REF_H;
  const branches = [], spurs = [], tips = [];
  const weep = !!P.weep, wind = P.wind || 0;

  function grow(x, y, ang, r0, order, droop, L, heading, parent, attach) {
    const step = 9;
    if (L == null) {
      L = 165 * Math.pow(r0, 0.62) * rng.uniform(0.85, 1.15) * (order < 3 ? 1 : 0.8);
      if (weep && order >= 1 && r0 < 60) L *= rng.uniform(1.5, 2.2);
    }
    const n = Math.max(3, Math.floor(L / step));
    const init = heading == null ? ang : heading;
    const [lo, hi] = P.children[order] || [0, 0];
    let nChild = hi > 0 ? rng.int(lo, hi) : 0;
    if (r0 < 6) nChild = 0;
    let ts = []; for (let i = 0; i < nChild; i++) ts.push(rng.uniform(weep && order === 0 ? 0.04 : 0.10, 0.95));
    ts.sort((a, b) => a - b);
    const minGap = weep && order === 0 ? 0.022 : 0.05;
    ts = ts.filter((t, i) => i === 0 || t - ts[i - 1] > minGap);
    const childSteps = new Set(ts.map(t => Math.floor(t * n)));
    const thinness = 1 - Math.min(r0, 60) / 60;
    const b = { parent, attach, order, r0, xs: [x], ys: [y], rs: [r0],
      amp: order === 0 ? 0.004 : 0.006 + 0.075 * thinness * thinness,
      freq: 0.55 + 1.1 * thinness + rng.uniform(0, 0.3), phase: rng.uniform(0, 6.283) };
    const bi = branches.length; branches.push(b);
    let side = rng.sign();
    const gap = order >= 2 ? P.spurGap[0] : P.spurGap[1];
    let nextSpur = rng.uniform(gap[0], gap[1]) * 0.5, traveled = 0, r = r0, curv = 0;
    const amax = weep ? 1.58 : 1.3, arc = rng.uniform(100, 380);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const rNew = 3 + (r0 - 3) * Math.pow(1 - t, order === 0 ? 1.35 : 1.0);
      let wob = 0.010 + 0.03 * (1 - Math.min(r, 50) / 50);
      if (weep && r < 14) wob *= 0.4;
      curv += rng.normal(0, wob); curv *= 0.85; ang += curv;
      if (r < 9 && rng.random() < 0.03) ang += rng.sign() * rng.uniform(0.12, 0.3) * (weep ? 0.3 : 1);
      const thin = 1 - Math.min(r, 45) / 45;
      let target = 0.55 * clamp(init, -0.9, 0.9) + droop * 0.5 * Math.pow(thin, 1.6);
      let k = 0.010 + 0.012 * thin;
      if (weep && order === 0) { target = init + 0.10 * t; k = 0.03; }
      if (weep && order >= 1) { const a = Math.min(1, traveled / arc); target = (1 - a) * init + a * 1.52; k = 0.02 + 0.05 * a; }
      if (wind) { target = target * (1 - wind * thin) + 0.12 * wind * thin; k += 0.02 * wind * thin; }
      ang += (target - ang) * k;
      ang = clamp(ang, -1.3, amax);
      const nx = x + Math.cos(ang) * step, ny = y + Math.sin(ang) * step;
      b.xs.push(nx); b.ys.push(ny); b.rs.push(rNew);
      const idx = b.xs.length - 1;
      traveled += step;
      if (childSteps.has(i)) {
        let frac = order === 0 ? rng.uniform(0.30, 0.50) : rng.uniform(0.42, 0.68);
        if (weep && order === 0) frac = rng.uniform(0.07, 0.16);
        if (weep && order >= 1) frac = rng.uniform(0.55, 0.8);
        const rc = Math.max(3.6, rNew * frac);
        if (weep && order === 0) side = rng.random() < 0.75 ? 1 : -1;
        const cang = ang + side * rng.uniform(0.35, 0.85);
        if (rng.random() < 0.8) side = -side;
        grow(nx, ny, cang, rc, order + 1, droop * rng.uniform(0.85, 1.2), null, null, bi, idx);
      }
      if (rNew < 15 && order >= 1 && traveled >= nextSpur) {
        spurs.push({ b: bi, k: idx, ang, kind: 'spur' });
        nextSpur = traveled + rng.uniform(gap[0], gap[1]);
      }
      if (rNew > 45 && rng.random() < 0.004) spurs.push({ b: bi, k: idx, ang, kind: 'dobuki' });
      x = nx; y = ny; r = rNew;
    }
    tips.push({ b: bi, k: b.xs.length - 1, ang });
  }

  for (const l of P.limbs) {
    const x = l.xf != null ? l.xf * W : l.x;
    grow(x, l.y * H, l.ang, l.r0, 0, l.droop, l.L, l.heading, -1, 0);
  }

  // flores em umbelas, com distância mínima entre cachos (evita a "mancha")
  const flowers = [];
  const dmin = P.minDist, grid = new Map();
  const key = (gx, gy) => gx * 100003 + gy;
  const free = (x, y) => {
    const gx = Math.floor(x / dmin), gy = Math.floor(y / dmin);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const c = grid.get(key(gx + i, gy + j)); if (!c) continue;
      for (const [ux, uy] of c) if ((ux - x) ** 2 + (uy - y) ** 2 < dmin * dmin) return false;
    }
    return true;
  };
  const take = (x, y) => { const k = key(Math.floor(x / dmin), Math.floor(y / dmin)); (grid.get(k) || grid.set(k, []).get(k)).push([x, y]); };
  const inside = (x, y) => x > -60 && x < W + 60 && y > -60 && y < H + 60;
  const depth = x => 1.25 - 0.40 * clamp(x / W, 0, 1);
  function umbel(bi, k, ang, n, kind) {
    const b = branches[bi], x = b.xs[k], y = b.ys[k], s = depth(x), R = 42 * s;
    const spAng = kind !== 'tip' ? ang + rng.sign() * rng.uniform(0.6, 1.4) : ang;
    const spLen = kind !== 'dobuki' ? rng.uniform(4, 18) * s : rng.uniform(2, 6);
    const px = Math.cos(spAng) * spLen, py = Math.sin(spAng) * spLen;
    for (let i = 0; i < n; i++) {
      const a = spAng + rng.normal(0, 0.9) + 0.25, L = rng.uniform(24, 60) * s;
      flowers.push({ b: bi, k, ox: px + Math.cos(a) * L, oy: py + Math.sin(a) * L,
        R: R * rng.uniform(0.88, 1.1), rot: rng.uniform(0, 6.283),
        tilt: rng.random() < 0.75 ? rng.uniform(0.55, 1) : rng.uniform(0.35, 0.6), tdir: rng.uniform(0, 3.1416),
        ph: rng.uniform(0, 6.283) });
    }
  }
  const [tlo, thi] = P.tipUmbel;
  function bloomTips(inFrame) {
    for (const t of tips) {
      const b = branches[t.b], x = b.xs[t.k], y = b.ys[t.k];
      if (inside(x, y) === inFrame && free(x, y)) { umbel(t.b, t.k, t.ang, rng.int(tlo, thi), 'tip'); take(x, y); }
    }
  }
  bloomTips(true);
  const order = spurs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  function bloomSpurs(inFrame) {
    for (const i of order) {
      const s = spurs[i], b = branches[s.b], x = b.xs[s.k], y = b.ys[s.k];
      if (inside(x, y) !== inFrame) continue;
      const edge = inFrame ? x : Math.min(x, W);
      const keep = edge < W * P.keepFrom ? 1 : 1 - 0.7 * (edge - W * P.keepFrom) / (W * (1 - P.keepFrom) + 1);
      if (rng.random() > keep || !free(x, y)) continue;
      const [ulo, uhi] = s.kind === 'spur' ? P.umbel : [1, 3];
      umbel(s.b, s.k, s.ang, rng.int(ulo, uhi), s.kind); take(x, y);
    }
  }
  bloomSpurs(true);
  const focusCount = flowers.length;
  // Completa a copa depois de compor o quadro de referência, preservando seus cachos e o foco da câmera.
  if (complete) { bloomTips(false); bloomSpurs(false); }

  // converte para unidades de mundo (1 = altura da tela)
  const u = 1 / REF_H;
  for (const b of branches) {
    b.xs = Float32Array.from(b.xs, v => v * u); b.ys = Float32Array.from(b.ys, v => v * u);
    b.rs = Float32Array.from(b.rs, v => v * u); b.r0 *= u;
    const n = b.xs.length;
    b.ax = new Float32Array(n); b.ay = new Float32Array(n); b.arot = new Float32Array(n);
  }
  for (const f of flowers) { f.ox *= u; f.oy *= u; f.R *= u; }
  return { branches, flowers, focusCount, aspect, ambient: P.ambient || 30, rng };
}

