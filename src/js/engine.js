// ------------------------------------------------------------------ motor (tema papel + câmera)
const SCRAMBLE = '#%&@$*+=-:/\\|<>?';
const TWIG = ['-', '\\', '|', '/'];
const twigChar = a => { const d = ((a * 180 / Math.PI) % 180 + 180) % 180; return d < 22.5 || d >= 157.5 ? 0 : d < 67.5 ? 1 : d < 112.5 ? 2 : 3; };
const KANA = ['ヽ', 'ゝ', '゜', 'さ', 'く', 'ら'], LOOSE = ["'", '`', ',', '.', '*'];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function createSakuraBackground(canvas, options) {
  const opts = Object.assign({
    preset: 'kosa', seed: null, kanji: true, wind: 1, fps: 30, interactive: true, project: false,
    intro: true, holdIntro: false, glitch: true, scramble: true,
    cell: 14, font: 12, cjk: 12,
    // tema (controller.js lê dos tokens CSS): tinta da árvore, cor do fundo, tinta que se mistura ao gradiente nos
    // glifos das flores e quanto da opacidade das células das flores vale neste fundo (1 = como no claro)
    // petalEnd: cor da ponta do gradiente (no claro, o #fff do papel; no escuro, o papel escuro: a ponta se funde ao
    // papel nos dois temas)
    ink: [29, 29, 29], parch: [229, 228, 224], petalInk: [29, 29, 29], petalA: 1, petalEnd: null,
    stops: [[0, [250, 203, 14]], [0.30, [240, 107, 168]], [0.65, [120, 186, 230]], [1, [255, 255, 255]]],
    angle: 255,
    monoFamily: '"JetBrains Mono", "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace',
    cjkFamily: '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    onFrame: null,
  }, options || {});

  const ctx = canvas.getContext('2d');
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, cw = opts.cell, chh = opts.cell;
  let scene = null, stems = [], att = null, attKey = null, prevGrid = null, buf = null, cells = null, frames = 0;
  let particles = [], blocks = [], nextBlock = 0, gust = 0, gustBoost = 0, gustPlan = null;
  let t0 = performance.now(), growStart = opts.holdIntro ? Infinity : 0, growDur = 1.6, last = 0, raf = 0, running = true, destroyed = false;
  // abertura: crescimento a partir do tronco, faíscas que viram flores, flor-broto (versão curta) e texto na grade
  let budTarget = null, bud = null, overlay = [];
  const cam = { z: 1, fx: 0, fy: 0, sx: 0, sy: 0 }, camT = { z: 1, fx: 0, fy: 0, sx: 0, sy: 0 };
  const safe = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.3, s: 0 }, safeT = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.3, s: 0 };
  let alpha = 1, alphaT = 1, camSnap = true;
  // qualidade (controller.js): resolução máxima, fração das pétalas soltas; cobertura = quanto da tela o papel tapa
  let dprMax = 2, ambientK = 1, cover = 0, frameMs = 0;
  const pointer = { x: -1, y: -1, vx: 0, vy: 0, active: false, lastT: 0 };
  let flowerCells = [];
  const gAng = opts.angle * Math.PI / 180, gdx = Math.sin(gAng), gdy = -Math.cos(gAng);
  let pmin = 0, pmax = 1, drift = 0;

  function irid(px, py) {
    return gradAt((px * gdx + py * gdy - pmin) / (pmax - pmin || 1) + drift);
  }
  // Paleta indexada: tinta, branco, papel e o gradiente das flores em GN passos, puro (fundo da célula) e misturado
  // com a tinta (glifo da pétala, do centro e da pétala solta). Índices pequenos deixam o atlas e os estilos finitos.
  const GN = 48, C_INK = 0, C_WHITE = 1, C_PARCH = 2, C_GRAD = 3, C_PET = C_GRAD + GN, C_CEN = C_PET + GN, C_LOO = C_CEN + GN;
  let palette = [], stops = opts.stops;
  function buildPalette() {
    const ink = opts.ink;
    stops = opts.petalEnd ? opts.stops.map((s, i, a) => (i === a.length - 1 ? [s[0], opts.petalEnd] : s)) : opts.stops;
    palette = [ink, [255, 255, 255], opts.parch];
    for (let g = 0; g < GN; g++) {
      const c = gradAt(g / (GN - 1));
      palette[C_GRAD + g] = c; const pi = opts.petalInk; palette[C_PET + g] = mixc(c, pi, 0.55); palette[C_CEN + g] = mixc(c, pi, 0.78); palette[C_LOO + g] = mixc(c, pi, 0.6);
    }
  }
  const gradIdx = (px, py) => Math.round(clamp((px * gdx + py * gdy - pmin) / (pmax - pmin || 1) + drift, 0, 1) * (GN - 1));
  function gradAt(t) {
    t = clamp(t, 0, 1);
    const S = stops;
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) {
      const u = (t - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
      return mixc(S[i - 1][1], S[i][1], u);
    }
    return S[S.length - 1][1];
  }

  // regen = false: só a resolução do canvas mudou (nível de qualidade); a árvore e as pétalas continuam as mesmas
  function layout(regen = true) {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, dprMax);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / chh);
    const N = cols * rows;
    att = new Float32Array(N); attKey = null;
    prevGrid = new Uint32Array(N);
    // buffers por célula, reaproveitados a cada quadro
    buf = { cb: new Float32Array(N), hl: new Float32Array(N), cp: new Float32Array(N), cc: new Float32Array(N), fr: new Float32Array(N),
      twig: new Int8Array(N), loose: new Int16Array(N), inBlock: new Uint8Array(N) };
    cells = { cellR: new Int32Array(N).fill(-2), cellG: new Int32Array(N).fill(-2), dirty: new Uint8Array(N), dirtyList: new Int32Array(N) };
    atlas.dirty = true;
    if (!regen && scene) return;
    scene = generate(opts.preset, opts.seed, opts.project ? PROJECT_ASPECT : W / H, opts.project);
    if (opts.project) {
      const starts = new Set();
      stems = scene.branches.filter(b => {
        if (b.parent >= 0) return false;
        const start = `${b.xs[0]},${b.ys[0]}`;
        if (starts.has(start)) return false;
        starts.add(start);
        return true;
      });
    }
    growthOrder();
    if (budTarget) pickBud(budTarget[0], budTarget[1]);
    particles = []; blocks = [];
    for (let i = 0; i < Math.round(scene.ambient * ambientK); i++) spawnAmbient(true);
  }

  // ordem de nascimento: distância ao longo da árvore a partir da base do tronco (0 → 1)
  function growthOrder() {
    const br = scene.branches; let M = 1;
    for (const b of br) {
      const g0 = b.parent < 0 ? 0 : br[b.parent].g[b.attach], n = b.xs.length;
      b.g = new Float32Array(n);
      for (let k = 0; k < n; k++) { b.g[k] = g0 + k; if (b.g[k] > M) M = b.g[k]; }
    }
    for (const b of br) for (let k = 0; k < b.g.length; k++) b.g[k] /= M;
    for (const f of scene.flowers) f.g = Math.min(0.97, scene.branches[f.b].g[f.k] + 0.02);
    bud = null;
  }
  // escolhe a flor mais próxima do alvo (fração da tela na vista inicial) e faz o cacho dela abrir antes de tudo
  function pickBud(tx, ty) {
    budTarget = [tx, ty];
    let best = null, bd = Infinity;
    scene.flowers.forEach((f, i) => {
      const b = scene.branches[f.b], wx = b.xs[f.k] + f.ox, wy = b.ys[f.k] + f.oy;
      // prefere flores de frente (tilt perto de 1), que leem melhor como sakura quando ampliadas
      const d = Math.hypot(wx * H / W - tx, wy - ty) + 0.12 * (1 - f.tilt);
      if (d < bd) { bd = d; best = { i, x: wx, y: wy }; }
    });
    if (!best) return null;
    scene.flowers[best.i].g = -1;
    bud = best;
    return best;
  }
  let sparks = [];
  const inOut3 = u => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  function burst(cells, extra) {
    const t = (performance.now() - t0) / 1000;
    const zH = H * cam.z, ox = cam.sx * W - cam.fx * zH, oy = cam.sy * H - cam.fy * zH;
    const vis = [];
    scene.flowers.forEach((f, i) => {
      const b = scene.branches[f.b], x = (b.xs[f.k] + f.ox) * zH + ox, y = (b.ys[f.k] + f.oy) * zH + oy;
      if (f.g >= 0 && x > -cw && x < W + cw && y > -chh && y < H + chh) vis.push(i);
    });
    let gmax = 0; for (const i of vis) gmax = Math.max(gmax, scene.flowers[i].g);
    const sc = clamp(Math.min(W, H * 1.6) / 1440, 0.45, 1.3);
    const mk = fi => {
      const [c, r, col] = cells[(Math.random() * cells.length) | 0];
      const a = Math.random() * 6.2832, sp = (340 + Math.random() * 1400) * sc;
      return { x: (c + Math.random()) * cw, y: (r + 0.5) * chh, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 140 * sc,
        col, f: fi, ph: Math.random(), dx: null, dy: null, ldx: null, ldy: null, sp: 0, pc: -1, pr: -1 };
    };
    sparks = [];
    for (const i of vis) {
      const f = scene.flowers[i], k = mk(i);
      k.ta = t + 0.42 + 1.1 * (gmax ? f.g / gmax : 0) + Math.random() * 0.3; // chega na ordem do crescimento
      k.th = Math.max(t + 0.22, k.ta - 0.5 - Math.random() * 0.3);           // começa a ser atraída pela flor
      f.bt = k.ta;
      sparks.push(k);
    }
    for (let n = 0; n < (extra ?? 70); n++) { const k = mk(-1); k.ta = t + 0.7 + Math.random() * 1.0; k.th = Infinity; sparks.push(k); }
  }
  function stepSparks(dt, t, P) {
    if (!sparks.length) return;
    sparks = sparks.filter(k => t < k.ta);
    const damp = Math.exp(-2.3 * dt);
    for (const k of sparks) {
      k.vx = k.vx * damp + 60 * gust * dt; k.vy = k.vy * damp + 70 * dt;
      k.x += k.vx * dt; k.y += k.vy * dt;
      let x = k.x, y = k.y, col = k.col, a = 1;
      if (k.f >= 0 && t > k.th) {
        const [wx, wy] = flowerPos(scene.flowers[k.f], t), tx = P.X(wx), ty = P.Y(wy);
        const u = inOut3((t - k.th) / (k.ta - k.th));
        x += (tx - x) * u; y += (ty - y) * u; col = mixc(col, irid(tx, ty), u);
      } else if (k.f < 0) a = 1 - smooth(k.ta - 0.6, k.ta, t);
      k.ldx = k.dx ?? x; k.ldy = k.dy ?? y;
      k.dx = x; k.dy = y; k.dc = col; k.da = a;
      k.sp = Math.hypot(x - k.ldx, y - k.ldy) / Math.max(dt, 1e-3);
    }
  }

  function growth(t) {
    if (!opts.intro || reduce) return 1;
    const u = (t - growStart) / growDur;
    return u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 2.2);
  }

  // a atenuação por célula só muda quando a zona de respiro ou a opacidade mudam
  function updateAtt() {
    const A = alpha;
    if (attKey && Math.abs(attKey[0] - A) < 1e-4 && Math.abs(attKey[1] - safe.x) < 1e-4 && Math.abs(attKey[2] - safe.y) < 1e-4 &&
      Math.abs(attKey[3] - safe.rx) < 1e-4 && Math.abs(attKey[4] - safe.ry) < 1e-4 && Math.abs(attKey[5] - safe.s) < 1e-4) return;
    attKey = [A, safe.x, safe.y, safe.rx, safe.ry, safe.s];
    for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < cols; c++) {
      let a = 1;
      if (safe.s > 0.001) {
        const dx = ((c + 0.5) * cw / W - safe.x) / safe.rx, dy = ((r2 + 0.5) * chh / H - safe.y) / safe.ry;
        a = 1 - safe.s * (1 - smooth(0.6, 1.25, Math.hypot(dx, dy)));
      }
      att[r2 * cols + c] = a * A;
    }
  }

  // ---------------------------------------------------------------- vento
  function windAt(t) {
    if (!gustPlan || t > gustPlan.end) {
      const start = (gustPlan ? gustPlan.end : t) + 3 + Math.random() * 7;
      gustPlan = { start, peak: start + 1.2, hold: start + 2.6, end: start + 5.4, amp: 0.6 + Math.random() * 0.6 };
    }
    const g = gustPlan;
    let e = 0;
    if (t >= g.start && t < g.peak) e = smooth(g.start, g.peak, t);
    else if (t >= g.peak && t < g.hold) e = 1;
    else if (t >= g.hold && t < g.end) e = 1 - smooth(g.hold, g.end, t);
    gustBoost *= 0.95;
    return (e * g.amp + gustBoost) * opts.wind;
  }

  function pose(t) {
    const br = scene.branches, breezeK = 0.55 * opts.wind;
    for (let i = 0; i < br.length; i++) {
      const b = br[i];
      let bx, by, rot0;
      if (b.parent < 0) { bx = b.xs[0]; by = b.ys[0]; rot0 = 0; }
      else { const p = br[b.parent]; bx = p.ax[b.attach]; by = p.ay[b.attach]; rot0 = p.arot[b.attach]; }
      const breeze = 0.6 * Math.sin(b.freq * t + b.phase) + 0.4 * Math.sin(1.73 * b.freq * t + 2.1 * b.phase);
      const theta = b.amp * (breezeK * breeze + gust * (0.75 + 0.25 * Math.sin(3.1 * t + b.phase)));
      const n = b.xs.length;
      b.ax[0] = bx; b.ay[0] = by; b.arot[0] = rot0;
      for (let k = 1; k < n; k++) {
        const f = k / (n - 1), rot = rot0 + theta * Math.pow(f, 1.25);
        const dx = b.xs[k] - b.xs[k - 1], dy = b.ys[k] - b.ys[k - 1], c = Math.cos(rot), s = Math.sin(rot);
        b.ax[k] = b.ax[k - 1] + dx * c - dy * s; b.ay[k] = b.ay[k - 1] + dx * s + dy * c; b.arot[k] = rot;
      }
    }
  }

  function flowerPos(f, t) {
    const b = scene.branches[f.b], rot = b.arot[f.k] + 0.06 * Math.sin(2.3 * t + f.ph) * (0.5 + gust);
    const c = Math.cos(rot), s = Math.sin(rot);
    return [b.ax[f.k] + f.ox * c - f.oy * s, b.ay[f.k] + f.ox * s + f.oy * c];
  }

  // ---------------------------------------------------------------- pétalas (espaço de tela, unidades de H)
  function spawnAmbient(anywhere) {
    const asp = W / H;
    particles.push({ x: anywhere ? Math.random() * asp : -0.02 - Math.random() * 0.1,
      y: anywhere ? Math.random() : Math.random() * 0.9, vx: 0.02, vy: 0.03,
      ph: Math.random() * 6.28, spin: 0.6 + Math.random() * 1.6, kind: Math.random(), amb: true });
  }
  function stepParticles(dt, t, proj) {
    const asp = W / H, wx = 0.025 + 0.11 * gust;
    for (const p of particles) {
      p.vx += (wx + 0.012 * Math.sin(t * 0.7 + p.ph) - p.vx) * Math.min(1, 1.2 * dt);
      p.vy += (0.045 + 0.02 * Math.sin(t * 1.9 + p.ph) - p.vy) * Math.min(1, 0.9 * dt);
      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.012) { const k = (0.012 - d2) * 25 * dt; p.vx += dx * k * 8 + pointer.vx * k; p.vy += dy * k * 8 + pointer.vy * k; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(t * 2.4 + p.ph) * 0.012 * dt;
    }
    particles = particles.filter(p => p.x < asp + 0.05 && p.y < 1.05 && p.y > -0.2 && p.x > -0.3);
    let amb = 0; for (const p of particles) if (p.amb) amb++;
    const target = Math.round(scene.ambient * ambientK);
    while (amb < target) { spawnAmbient(false); amb++; }
    const rate = (0.003 + 0.05 * gust) * dt;
    if (particles.length < 240) for (const f of scene.flowers) if (Math.random() < rate) {
      const [wx2, wy2] = flowerPos(f, t), sx = proj.X(wx2) / H, sy = proj.Y(wy2) / H;
      if (sx > -0.05 && sx < asp + 0.05 && sy > -0.05 && sy < 1.05)
        particles.push({ x: sx, y: sy, vx: 0.01, vy: 0, ph: Math.random() * 6.28, spin: 0.6 + Math.random() * 1.8, kind: Math.random() });
    }
  }

  // ---------------------------------------------------------------- cobertura analítica por célula
  const LX = -0.51, LY = -0.86;
  function splatBark(cb, hl, thinPx, P, G, fr) {
    const soft = 0.5 * Math.sqrt(cw * chh);
    function segment(ax, ay, bx, by, r, fresh) {
      if (Math.max(ax, bx) + r < 0 || Math.min(ax, bx) - r > W || Math.max(ay, by) + r < 0 || Math.min(ay, by) - r > H) return;
      const ex = bx - ax, ey = by - ay, el = ex * ex + ey * ey || 1;
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - r) / cw)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx) + r) / cw));
      const r0 = Math.max(0, Math.floor((Math.min(ay, by) - r) / chh)), r1 = Math.min(rows - 1, Math.floor((Math.max(ay, by) + r) / chh));
      for (let rr = r0; rr <= r1; rr++) {
        const py = (rr + 0.5) * chh;
        for (let cc = c0; cc <= c1; cc++) {
          const px = (cc + 0.5) * cw;
          let u = ((px - ax) * ex + (py - ay) * ey) / el; u = u < 0 ? 0 : u > 1 ? 1 : u;
          const qx = px - (ax + ex * u), qy = py - (ay + ey * u), d = Math.sqrt(qx * qx + qy * qy);
          const cov = (r - d) / soft + 0.5;
          if (cov <= 0) continue;
          const id = rr * cols + cc, cv = cov > 1 ? 1 : cov;
          if (fresh > fr[id]) fr[id] = fresh;
          if (cv > cb[id]) {
            cb[id] = cv;
            const lit = d > 1e-6 ? (qx * LX + qy * LY) / d * Math.min(1, d / r) : 0;
            hl[id] = 0.35 + 0.65 * (lit > 0 ? lit : 0) - 0.15 * (lit < 0 ? -lit : 0);
          }
        }
      }
    }
    for (const b of scene.branches) {
      const n = b.xs.length;
      for (let k = 2; k < n; k += 2) {
        const age = G - b.g[k]; if (age <= 0) continue;
        const r = b.rs[k] * P.zH * (G < 1 ? 0.45 + 0.55 * smooth(0, 0.06, age) : 1); if (r < thinPx) continue;
        const fresh = G < 1 ? 1 - smooth(0, 0.05, age) : 0;
        segment(P.X(b.ax[k - 2]), P.Y(b.ay[k - 2]), P.X(b.ax[k]), P.Y(b.ay[k]), r, fresh);
      }
    }
    if (G <= 0 || !stems.length) return;
    // Prolonga a base até sair do quadro quando um movimento da câmera expõe o início do galho.
    const grown = smooth(0, 0.06, G);
    for (const b of stems) {
      const x = P.X(b.ax[0]), y = P.Y(b.ay[0]), r = b.r0 * P.zH;
      const dx = x - P.X(b.ax[2]), dy = y - P.Y(b.ay[2]);
      if ((!dx && (x < -r || x > W + r)) || (!dy && (y < -r || y > H + r))) continue;
      const enterX = dx ? ((dx < 0 ? W + r : -r) - x) / dx : -Infinity;
      const enterY = dy ? ((dy < 0 ? H + r : -r) - y) / dy : -Infinity;
      const exitX = dx ? ((dx < 0 ? -r : W + r) - x) / dx : Infinity;
      const exitY = dy ? ((dy < 0 ? -r : H + r) - y) / dy : Infinity;
      const exit = Math.min(exitX, exitY), start = Math.max(0, enterX, enterY, exit * (1 - grown));
      if (Number.isFinite(exit) && start < exit) segment(x + dx * start, y + dy * start, x + dx * exit, y + dy * exit, r * (0.45 + 0.55 * grown), 1 - grown);
    }
  }
  function splatFlowers(cp, cc, t, P, G, fr) {
    let lo = Infinity, hi = -Infinity;
    for (const f of scene.flowers) {
      const bloom = f.bt != null ? smooth(f.bt, f.bt + 0.35, t) : G >= 1 ? 1 : smooth(0, 0.1, G - f.g); if (bloom <= 0) continue;
      const [wx, wy] = flowerPos(f, t);
      const fx = P.X(wx), fy = P.Y(wy), R = f.R * P.zH * (0.25 + 0.75 * bloom), fresh = 1 - bloom;
      if (fx + R < 0 || fx - R > W || fy + R < 0 || fy - R > H) continue;
      const pr = fx * gdx + fy * gdy; if (pr < lo) lo = pr; if (pr > hi) hi = pr;
      const c0 = Math.max(0, Math.floor((fx - R) / cw)), c1 = Math.min(cols - 1, Math.floor((fx + R) / cw));
      const r0 = Math.max(0, Math.floor((fy - R) / chh)), r1 = Math.min(rows - 1, Math.floor((fy + R) / chh));
      const ct = Math.cos(f.tdir), st = Math.sin(f.tdir), it = 1 / f.tilt;
      // ângulo da pétala: θ = atan2(bb, a) − (rot − tdir); cos θ sai direto do ponto e cos 5θ pela identidade de
      // Chebyshev (16c⁵ − 20c³ + 5c), sem atan2 nem cos por amostra
      const cph = Math.cos(f.rot - f.tdir), sph = Math.sin(f.rot - f.tdir);
      const big = smooth(3, 8, R / cw); // 0 na escala normal; 1 quando a flor é grande (abertura, zoom)
      for (let rr = r0; rr <= r1; rr++) for (let col = c0; col <= c1; col++) {
        let pet = 0, cen = 0, dsum = 0;
        for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
          const px = (col + 0.25 + 0.5 * sx) * cw - fx, py = (rr + 0.25 + 0.5 * sy) * chh - fy;
          const a = px * ct + py * st, bb = (-px * st + py * ct) * it;
          const rad = Math.sqrt(a * a + bb * bb), d = rad / R;
          if (d > 1) continue;
          if (d < 0.22) { cen++; continue; }
          const c1 = (a * cph + bb * sph) / rad, c2 = c1 * c1, lob = c1 * (16 * c2 * c2 - 20 * c2 + 5);
          const prof = 0.80 + 0.20 * lob - (big > 0 && lob > 0 ? 0.2 * big * Math.pow(lob, 14) : 0);
          if (d < prof) { pet++; dsum += d; }
        }
        if (pet || cen) {
          const id = rr * cols + col;
          if (fresh > fr[id]) fr[id] = fresh;
          const shade = pet ? 1 - 0.62 * big * Math.pow(dsum / pet, 1.6) : 1;
          if (pet / 4 * shade > cp[id]) cp[id] = pet / 4 * shade;
          if (cen / 4 > cc[id]) cc[id] = cen / 4;
        }
      }
    }
    // o gradiente cobre só a área onde há flores visíveis (como o disco da esfera)
    const span = 0.75 * Math.max(W, H); // na vista inicial as flores já cobrem mais que isso: nada muda lá
    if (lo < hi && hi - lo < span) { const m = (lo + hi) / 2; lo = m - span / 2; hi = m + span / 2; }
    if (lo < hi) { pmin += (lo - pmin) * 0.15; pmax += (hi - pmax) * 0.15; }
    else { pmin = Math.min(0, W * gdx, H * gdy, W * gdx + H * gdy); pmax = Math.max(0, W * gdx, H * gdy, W * gdx + H * gdy); }
  }

  // ---------------------------------------------------------------- quadro
  function frame(now) {
    if (destroyed) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.033); last = now;
    const k = camSnap ? 1 : Math.min(1, dt * 5);
    camSnap = false;
    for (const key in cam) cam[key] += (camT[key] - cam[key]) * k;
    for (const key in safe) safe[key] += (safeT[key] - safe[key]) * k;
    alpha += (alphaT - alpha) * k;
    updateAtt();
    drift = 0.05 * Math.sin(t * 0.35);
    gust = reduce ? 0 : windAt(t);
    pose(reduce ? 0 : t);
    const zH = H * cam.z, ox = cam.sx * W - cam.fx * zH, oy = cam.sy * H - cam.fy * zH;
    const P = { zH, X: wx => wx * zH + ox, Y: wy => wy * zH + oy };
    if (!reduce) stepParticles(dt, t, P);
    const G = growth(t);
    const { cb, hl, cp, cc, fr, twig, loose, inBlock } = buf;
    cb.fill(0); hl.fill(0); cp.fill(0); cc.fill(0); fr.fill(0); twig.fill(-1); loose.fill(-1); inBlock.fill(0);
    const thinPx = 0.35 * cw;
    splatBark(cb, hl, thinPx, P, G, fr);
    splatFlowers(cp, cc, reduce ? 0 : t, P, G, fr);
    stepSparks(dt, t, P);
    for (const b of scene.branches) {
      const n = b.xs.length;
      for (let k2 = 1; k2 < n; k2 += 2) {
        if (b.rs[k2] * zH >= thinPx || b.g[k2] >= G) continue;
        const k3 = Math.min(k2 + 1, n - 1);
        const x0 = P.X(b.ax[k2 - 1]) / cw, y0 = P.Y(b.ay[k2 - 1]) / chh, x1 = P.X(b.ax[k3]) / cw, y1 = P.Y(b.ay[k3]) / chh;
        if ((x0 < -2 && x1 < -2) || (x0 > cols + 2 && x1 > cols + 2) || (y0 < -2 && y1 < -2) || (y0 > rows + 2 && y1 > rows + 2)) continue;
        const ch = twigChar(Math.atan2((y1 - y0) * chh, (x1 - x0) * cw));
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
        for (let s = 0; s <= steps; s++) {
          const cx = Math.floor(x0 + (x1 - x0) * s / steps), cy = Math.floor(y0 + (y1 - y0) * s / steps);
          if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) twig[cy * cols + cx] = ch;
        }
      }
    }
    particles.forEach((p, i) => {
      const c = Math.floor(p.x * H / cw), r = Math.floor(p.y * H / chh);
      if (c >= 0 && r >= 0 && c < cols && r < rows) loose[r * cols + c] = i;
    });
    if (opts.glitch && !reduce && G >= 1 && t > nextBlock && flowerCells.length) {
      const id = flowerCells[Math.floor(Math.random() * flowerCells.length)];
      const w = 2 + Math.floor(Math.random() * 6), h = 1 + Math.floor(Math.random() * 3);
      blocks.push({ c: (id % cols) - (w >> 1), r: Math.floor(id / cols) - (h >> 1), w, h, until: t + 0.12 + Math.random() * 0.35 });
      nextBlock = t + (0.25 + Math.random() * 1.2) / (1 + 2.5 * gust);
    }
    blocks = blocks.filter(b => b.until > t);
    for (const b of blocks) for (let r = b.r; r < b.r + b.h; r++) for (let c = b.c; c < b.c + b.w; c++)
      if (r >= 0 && c >= 0 && r < rows && c < cols) inBlock[r * cols + c] = 1;
    draw(t, { cb, hl, cp, cc, twig, loose, inBlock, fr, G });
  }

  // ---------------------------------------------------------------- desenho
  // Os glifos saem de um atlas: cada caractere, numa cor da paleta, é rasterizado uma vez e depois copiado com
  // drawImage, agrupado pela opacidade (16 níveis, como antes). Os quadrados de fundo são agrupados pelo estilo
  // (cor da paleta × opacidade). Faíscas e o texto da abertura têm cores livres e só existem na abertura: seguem
  // com fillText. Só as células que mudaram desde o quadro anterior são apagadas e redesenhadas; quando muda mais da
  // metade (câmera andando, abertura), o quadro inteiro é refeito.
  const AL = 16, PAGE = 1024;
  let forceFull = true, legacyPrev = false;
  const lvl = a => Math.round((a < 0 ? 0 : a > 1 ? 1 : a) * AL);
  const atlas = { pages: [], map: new Map(), n: 0, S: 0, per: 0, dirty: true };
  const rectStyle = new Map(), rectBuckets = new Map(), glyphBuckets = Array.from({ length: AL + 1 }, () => []);
  const legacy = { text: new Map(), rect: new Map(), cjk: new Map() };
  const push = (map, style, a, b, c, d) => { let arr = map.get(style); if (!arr) map.set(style, arr = []); arr.push(a, b, c, d); };
  const q8 = v => (Math.round(v / 6) * 6) | 0;
  const rgba = (c, a) => `rgba(${q8(c[0])},${q8(c[1])},${q8(c[2])},${Math.round(clamp(a, 0, 1) * 16) / 16})`;
  const rgb = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

  function resetAtlas() {
    atlas.dirty = false; atlas.map.clear(); atlas.n = 0; forceFull = true;
    atlas.S = Math.max(4, Math.ceil(Math.max(cw, chh) * dpr)); atlas.per = Math.max(1, Math.floor(PAGE / atlas.S));
    for (const p of atlas.pages) p.width = p.height = atlas.per * atlas.S; // redimensionar também limpa
  }
  function slotOf(ch, cjk, ci) {
    const key = ch.charCodeAt(0) * 256 + ci;
    let id = atlas.map.get(key);
    if (id !== undefined) return id;
    id = atlas.n++;
    const S = atlas.S, per = atlas.per, pp = per * per, pi = (id / pp) | 0, k = id % pp;
    let page = atlas.pages[pi];
    if (!page) { page = document.createElement('canvas'); page.width = page.height = per * S; atlas.pages[pi] = page; }
    const g = page.getContext('2d');
    g.font = cjk ? `${opts.cjk * dpr}px ${opts.cjkFamily}` : `${opts.font * dpr}px ${opts.monoFamily}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgb(palette[ci]);
    g.fillText(ch, (k % per) * S + S / 2, ((k / per) | 0) * S + S / 2);
    atlas.map.set(key, id);
    return id;
  }
  const rectKey = (ci, a) => { const l = lvl(a); return l ? ci * (AL + 1) + l : -1; };
  const glyphKey = (ch, cjk, ci, a) => { const l = lvl(a); return l ? slotOf(ch, cjk, ci) * (AL + 1) + l : -1; };
  function rectStyleOf(key) {
    let s = rectStyle.get(key);
    if (!s) { const c = palette[(key / (AL + 1)) | 0]; s = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${(key % (AL + 1)) / AL})`; rectStyle.set(key, s); }
    return s;
  }

  function motion(id, ch, cjk, t, kind, fresh) {
    const code = ch ? ch.charCodeAt(0) : 0;
    if (fresh > 0 && !reduce && Math.random() < 0.15 + 0.75 * fresh) {
      prevGrid[id] = code;
      return [SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0], false];
    }
    if (opts.scramble && !reduce && !cjk && prevGrid[id] && prevGrid[id] !== code && kind !== 'loose' && Math.random() < 0.22) {
      prevGrid[id] = code;
      return [SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0], false];
    }
    prevGrid[id] = code;
    return [ch, cjk];
  }

  function draw(t, L) {
    const { cb, hl, cp, cc, twig, loose, inBlock, fr, G } = L;
    if (atlas.dirty) resetAtlas();
    legacy.text.clear(); legacy.rect.clear(); legacy.cjk.clear();
    const ink = opts.ink;
    const pr = pointer.active ? 4.5 : 0, pcx = pointer.x * H / cw, pcy = pointer.y * H / chh;
    flowerCells.length = 0;
    // assinatura da célula = estilo do quadrado + glifo (com opacidade); mudou → entra na lista das que se redesenham
    const { cellR, cellG, dirty, dirtyList } = cells;
    let nDirty = 0, nFull = 0;
    const cell = (id, rk, gk) => {
      if (cellR[id] !== rk || cellG[id] !== gk) { dirty[id] = 1; dirtyList[nDirty++] = id; cellR[id] = rk; cellG[id] = gk; } else dirty[id] = 0;
      if (rk >= 0 || gk >= 0) nFull++;
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const A = att[id];
      if (A < 0.02) { prevGrid[id] = 0; cell(id, -1, -1); continue; }
      const x = c * cw, y = r * chh, cx = x + cw / 2, cy = y + chh / 2;
      let near = 0;
      if (pr) { const d = Math.hypot(c + 0.5 - pcx, (r + 0.5 - pcy) * chh / cw); near = d < pr ? 1 - d / pr : 0; }
      const fl = cp[id] + cc[id];
      let ch = '', kind = '', val = 0, cjk = false;
      if (fl > 0.10) {
        flowerCells.push(id);
        if (cc[id] > 0.26) { kind = 'center'; ch = opts.kanji ? '桜' : '@'; cjk = opts.kanji; val = 1; }
        else { kind = 'petal'; val = clamp(cp[id] * 0.95 + cc[id] * 0.5, 0, 1); }
      } else if (cb[id] > 0.06) { kind = cb[id] > 0.88 ? 'bark' : 'edge'; val = cb[id]; }
      else if (twig[id] >= 0) { kind = 'twig'; ch = TWIG[twig[id]]; val = 1; }
      else if (loose[id] >= 0 && G > 0.85) {
        const p = particles[loose[id]]; kind = 'loose';
        const ph = Math.floor((t * p.spin + p.ph) * 1.3) % 5;
        if (opts.kanji) { ch = p.kind < 0.78 ? KANA[ph % 3] : KANA[3 + Math.floor((p.kind - 0.78) / 0.22 * 3) % 3]; cjk = true; } else ch = LOOSE[ph];
        val = 1;
      }
      if (!kind) { prevGrid[id] = 0; cell(id, -1, -1); continue; }
      let sq = -1, sqA = 0, col = C_INK, colA = 0;
      if (kind === 'petal' || kind === 'center' || kind === 'loose' || inBlock[id]) {
        const g = gradIdx(cx, cy);
        if (kind === 'petal') { sq = C_GRAD + g; sqA = 0.38 + 0.50 * val; col = C_PET + g; colA = 0.9; ch = val < 0.3 ? '.' : val < 0.55 ? ':' : val < 0.8 ? '+' : '*'; }
        else if (kind === 'center') { sq = C_GRAD + g; sqA = 0.92; col = C_CEN + g; colA = 1; }
        else if (kind === 'loose') { sq = C_GRAD + g; sqA = 0.55; col = C_LOO + g; colA = 0.95; }
        if (inBlock[id]) { sq = C_GRAD + g; sqA = 0.95; col = C_WHITE; colA = 1; }
        if (opts.petalA !== 1) sqA = Math.min(1, sqA * opts.petalA);
      }
      if (kind === 'bark') {
        const h = hl[id]; sq = C_INK; sqA = 0.03 + 0.08 * (1 - h); colA = 0.42 + 0.45 * (1 - h);
        if (opts.kanji && hash2(c, r) < 0.28) { ch = h > 0.62 ? '木' : h > 0.35 ? '林' : '森'; cjk = true; }
        else ch = hash2(c + 7, r) < 0.14 ? ':' : (h > 0.62 ? '-' : h > 0.35 ? '=' : '#');
        if (inBlock[id]) { sq = C_INK; sqA = 0.85; col = C_PARCH; colA = 1; }
      } else if (kind === 'edge') { sq = C_INK; sqA = 0.05 * val; colA = 0.3 + 0.45 * val; ch = val < 0.3 ? '' : val < 0.6 ? '.' : ':'; }
      else if (kind === 'twig') { colA = 0.78; }
      if (near) { sqA += 0.18 * near; if (Math.random() < 0.35 * near && !cjk) ch = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]; }
      const m = motion(id, ch, cjk, t, kind, fr[id]); ch = m[0]; cjk = m[1];
      const rk = sq >= 0 && sqA > 0.01 ? rectKey(sq, sqA * A) : -1, gk = ch && ch !== ' ' ? glyphKey(ch, cjk, col, colA * A) : -1;
      cell(id, rk, gk);
      if (rk >= 0) { let arr = rectBuckets.get(rk); if (!arr) rectBuckets.set(rk, arr = []); arr.push(x + 1, y + 1, id); }
      if (gk >= 0) glyphBuckets[gk % (AL + 1)].push((gk / (AL + 1)) | 0, cx, cy, id);
    }
    for (const k of sparks) {
      if (k.dx == null) continue;
      const c = Math.floor(k.dx / cw), r = Math.floor(k.dy / chh);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      if (k.pc >= 0 && (k.pc !== c || k.pr !== r)) push(legacy.rect, rgba(k.dc, 0.3 * k.da), k.pc * cw + 1, k.pr * chh + 1, cw - 2, chh - 2);
      push(legacy.rect, rgba(k.dc, 0.9 * k.da), c * cw + 1, r * chh + 1, cw - 2, chh - 2);
      const kana = k.f < 0 && k.sp < 140;
      const ch = kana ? KANA[(k.ph * 3) | 0] : k.sp > 700 ? '*' : k.sp > 360 ? '+' : k.sp > 140 ? ':' : '.';
      push(kana ? legacy.cjk : legacy.text, rgba(mixc(k.dc, opts.petalInk, 0.55), k.da), ch, c * cw + cw / 2, r * chh + chh / 2, 0);
      k.pc = c; k.pr = r;
    }
    // texto da abertura, desenhado na mesma grade (uma letra por célula)
    for (const o of overlay) {
      const s = Array.from(o.s), col = o.col || ink;
      for (let i = 0; i < s.length; i++) {
        const c = o.c + i, cx = c * cw + cw / 2, cy = o.r * chh + chh / 2;
        if (c < 0 || c >= cols || o.r < 0 || o.r >= rows || s[i] === ' ') continue;
        if (o.sq) push(legacy.rect, rgba(o.sq, o.sqA ?? 0.08), c * cw + 1, o.r * chh + 1, cw - 2, chh - 2);
        let ch = s[i], cj = ch.charCodeAt(0) > 0x2e80;
        if (o.scr && !reduce && Math.random() < o.scr) { ch = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]; cj = false; }
        push(cj ? legacy.cjk : legacy.text, rgba(col, o.a ?? 1), ch, cx, cy, 0);
      }
    }
    const legacyNow = legacy.rect.size > 0 || legacy.text.size > 0 || legacy.cjk.size > 0;
    const full = forceFull || legacyNow || legacyPrev || nDirty > 0.5 * nFull;
    forceFull = false; legacyPrev = legacyNow;
    frames++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (full) ctx.clearRect(0, 0, canvas.width, canvas.height);
    else for (let i = 0; i < nDirty; i++) {
      const id = dirtyList[i], c = id % cols, r = (id / cols) | 0;
      const x0 = Math.round(c * cw * dpr), y0 = Math.round(r * chh * dpr);
      ctx.clearRect(x0, y0, Math.round((c + 1) * cw * dpr) - x0, Math.round((r + 1) * chh * dpr) - y0);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rw = cw - 2, rh = chh - 2;
    for (const [key, a] of rectBuckets) {
      if (!a.length) continue;
      ctx.fillStyle = rectStyleOf(key);
      for (let i = 0; i < a.length; i += 3) if (full || dirty[a[i + 2]]) ctx.fillRect(a[i], a[i + 1], rw, rh);
      a.length = 0;
    }
    for (const [style, a] of legacy.rect) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillRect(a[i], a[i + 1], a[i + 2], a[i + 3]); }
    // glifos do atlas, em pixels do dispositivo (o centro do glifo cai no centro da célula, como no fillText)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const S = atlas.S, half = S / 2, per = atlas.per, pp = per * per, pages = atlas.pages;
    for (let l = 1; l <= AL; l++) {
      const a = glyphBuckets[l];
      if (!a.length) continue;
      ctx.globalAlpha = l / AL;
      for (let i = 0; i < a.length; i += 4) {
        if (!full && !dirty[a[i + 3]]) continue;
        const id = a[i], k = id % pp;
        ctx.drawImage(pages[(id / pp) | 0], (k % per) * S, ((k / per) | 0) * S, S, S, Math.round(a[i + 1] * dpr - half), Math.round(a[i + 2] * dpr - half), S, S);
      }
      a.length = 0;
    }
    ctx.globalAlpha = 1;
    if (legacy.text.size || legacy.cjk.size) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${opts.font}px ${opts.monoFamily}`;
      for (const [style, a] of legacy.text) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillText(a[i], a[i + 1], a[i + 2]); }
      ctx.font = `${opts.cjk}px ${opts.cjkFamily}`;
      for (const [style, a] of legacy.cjk) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillText(a[i], a[i + 1], a[i + 2]); }
    }
  }

  // ---------------------------------------------------------------- laço e eventos
  let lastDraw = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    // com o papel tapando a tela (cards, stack, fotos), o fundo quase não aparece: meia velocidade ou espera
    const fps = cover >= 0.8 ? 0 : cover >= 0.5 ? opts.fps / 2 : opts.fps;
    if (!fps || now - lastDraw < 1000 / fps - 2) return;
    lastDraw = now;
    const s0 = performance.now();
    frame(now);
    const ms = performance.now() - s0;
    frameMs = frameMs ? frameMs * 0.9 + ms * 0.1 : ms;
    if (opts.onFrame) opts.onFrame(ms);
  }
  function onPointer(e) {
    // o toque é para rolar: não embaralha os glifos nem empurra as pétalas como o cursor
    if (!opts.interactive || e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / H, y = (e.clientY - r.top) / H, now = performance.now();
    if (pointer.active) {
      const dtp = Math.max(1, now - pointer.lastT) / 1000;
      pointer.vx = (x - pointer.x) / dtp; pointer.vy = (y - pointer.y) / dtp;
      gustBoost = Math.min(0.9, gustBoost + Math.min(0.06, Math.hypot(pointer.vx, pointer.vy) * 0.02));
    }
    pointer.x = x; pointer.y = y; pointer.active = true; pointer.lastT = now;
  }
  const onLeave = () => { pointer.active = false; };
  // voltar de aba oculta ou recuperar o contexto do canvas (GPU reiniciada) refaz o quadro inteiro
  const onVis = () => { running = !document.hidden; if (running) { last = 0; forceFull = true; } };
  const onRestore = () => { forceFull = true; };
  canvas.addEventListener('contextrestored', onRestore);
  let rt = 0;
  // Redimensionar: o tamanho igual (a barra de endereço do celular, com o canvas em 100lvh) não faz nada; só a altura ou
  // a densidade de pixels mudando refaz o canvas com a mesma árvore; a largura mudando gera a árvore de novo.
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => {
    const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, dprMax);
    const sameW = Math.abs(r.width - W) < 0.5, sameH = Math.abs(r.height - H) < 0.5;
    if (sameW && sameH && d === dpr) return;
    layout(!sameW); camSnap = true; frame(performance.now());
  }, 120); };

  // fontes que chegam depois (JetBrains Mono, Noto Sans JP) refazem o atlas, que guardou os glifos de reserva
  const onFonts = () => { atlas.dirty = true; };
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', onFonts);
  buildPalette();
  layout();
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  if (reduce) frame(performance.now()); else raf = requestAnimationFrame(loop);

  return {
    setCamera(c, snap) { Object.assign(camT, c); if (snap) camSnap = true; if (reduce) frame(performance.now()); },
    setSafe(s) { Object.assign(safeT, s); },
    setAlpha(a) { alphaT = a; },
    setCover(c) { cover = c; },
    // nível de qualidade: { fps, dpr (máximo), glitch, scramble, ambient (fração das pétalas soltas) }
    setQuality(q) {
      if (q.fps) opts.fps = q.fps;
      if ('glitch' in q) opts.glitch = q.glitch;
      if ('scramble' in q) opts.scramble = q.scramble;
      if (q.ambient) ambientK = q.ambient;
      if (q.dpr && q.dpr !== dprMax) { dprMax = q.dpr; layout(false); camSnap = true; frame(performance.now()); }
    },
    get load() { return { ms: frameMs, fps: opts.fps, cover, frames }; },
    setOptions(o) { const regen = ('preset' in o && o.preset !== opts.preset) || ('seed' in o && o.seed !== opts.seed);
      Object.assign(opts, o); buildPalette(); rectStyle.clear(); atlas.dirty = true; if (regen) layout(); if (reduce) frame(performance.now()); },
    replayIntro(dur) { growStart = (performance.now() - t0) / 1000; if (dur) growDur = dur; gustPlan = null; },
    skipIntro() { growStart = -1e9; sparks = []; for (const f of scene.flowers) f.bt = undefined; },
    burst(cells, extra) { burst(cells, extra); },
    gradAt(u) { return gradAt(u); },
    get growth() { return growth((performance.now() - t0) / 1000); },
    pickBud(tx, ty) { return pickBud(tx, ty); },
    get bud() { return bud; },
    setOverlay(items) { overlay = items || []; },
    get grid() { return { cols, rows, cw, chh }; },
    renderNow() { frame(performance.now()); },
    get camera() { return { ...cam }; },
    get size() { return { W, H }; },
    get focus() {
      let sx = 0, sy = 0;
      const n = scene.focusCount || scene.flowers.length;
      for (let i = 0; i < n; i++) { const f = scene.flowers[i], b = scene.branches[f.b]; sx += b.xs[f.k]; sy += b.ys[f.k]; }
      return n ? [sx / n, sy / n] : [0.5 * W / H, 0.5];
    },
    pause() { running = false; }, resume() { running = true; last = 0; },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
      canvas.removeEventListener('contextrestored', onRestore);
      if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', onFonts);
    },
    get stats() { return { cols, rows, branches: scene.branches.length, flowers: scene.flowers.length, particles: particles.length }; },
  };
}
