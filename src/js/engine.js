// ------------------------------------------------------------------ motor (tema papel + câmera)
const SCRAMBLE = '#%&@$*+=-:/\\|<>?';
const TWIG = ['-', '\\', '|', '/'];
const twigChar = a => { const d = ((a * 180 / Math.PI) % 180 + 180) % 180; return d < 22.5 || d >= 157.5 ? 0 : d < 67.5 ? 1 : d < 112.5 ? 2 : 3; };
const KANA = ['ヽ', 'ゝ', '゜', 'さ', 'く', 'ら'], LOOSE = ["'", '`', ',', '.', '*'];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function createSakuraBackground(canvas, options) {
  const opts = Object.assign({
    preset: 'kosa', seed: null, kanji: true, wind: 1, fps: 30, interactive: true,
    intro: true, holdIntro: false, glitch: true, scramble: true,
    cell: 14, font: 12, cjk: 12,
    ink: [29, 29, 29],
    stops: [[0, [250, 203, 14]], [0.30, [240, 107, 168]], [0.65, [120, 186, 230]], [1, [255, 255, 255]]],
    angle: 255,
    monoFamily: '"JetBrains Mono", "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace',
    cjkFamily: '"Noto Sans JP", "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    onFrame: null,
  }, options || {});

  const ctx = canvas.getContext('2d');
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, cw = opts.cell, chh = opts.cell;
  let scene = null, att = null, prevGrid = null, settle = null;
  let particles = [], blocks = [], nextBlock = 0, gust = 0, gustBoost = 0, gustPlan = null;
  let t0 = performance.now(), introStart = opts.holdIntro ? Infinity : 0, last = 0, raf = 0, running = true, destroyed = false;
  const cam = { z: 1, fx: 0, fy: 0, sx: 0, sy: 0 }, camT = { z: 1, fx: 0, fy: 0, sx: 0, sy: 0 };
  const safe = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.3, s: 0 }, safeT = { x: 0.5, y: 0.5, rx: 0.3, ry: 0.3, s: 0 };
  let alpha = 1, alphaT = 1, camSnap = true;
  const pointer = { x: -1, y: -1, vx: 0, vy: 0, active: false, lastT: 0 };
  let flowerCells = [];
  const gAng = opts.angle * Math.PI / 180, gdx = Math.sin(gAng), gdy = -Math.cos(gAng);
  let pmin = 0, pmax = 1, drift = 0;

  function irid(px, py) {
    let t = (px * gdx + py * gdy - pmin) / (pmax - pmin || 1) + drift;
    t = clamp(t, 0, 1);
    const S = opts.stops;
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) {
      const u = (t - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
      return mixc(S[i - 1][1], S[i][1], u);
    }
    return S[S.length - 1][1];
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / chh);
    att = new Float32Array(cols * rows);
    prevGrid = new Uint32Array(cols * rows);
    settle = new Float32Array(cols * rows);
    const rr = rngFrom(99);
    for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < cols; c++)
      settle[r2 * cols + c] = 0.10 + 1.15 * (c / cols) + rr.uniform(0, 0.35);
    scene = generate(opts.preset, opts.seed, W / H);
    particles = []; blocks = [];
    for (let i = 0; i < scene.ambient; i++) spawnAmbient(true);
  }

  function updateAtt() {
    const A = alpha;
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
    while (amb < scene.ambient) { spawnAmbient(false); amb++; }
    const rate = (0.003 + 0.05 * gust) * dt;
    if (particles.length < 240) for (const f of scene.flowers) if (Math.random() < rate) {
      const [wx2, wy2] = flowerPos(f, t), sx = proj.X(wx2) / H, sy = proj.Y(wy2) / H;
      if (sx > -0.05 && sx < asp + 0.05 && sy > -0.05 && sy < 1.05)
        particles.push({ x: sx, y: sy, vx: 0.01, vy: 0, ph: Math.random() * 6.28, spin: 0.6 + Math.random() * 1.8, kind: Math.random() });
    }
  }

  // ---------------------------------------------------------------- cobertura analítica por célula
  const LX = -0.51, LY = -0.86;
  function splatBark(cb, hl, thinPx, P) {
    const soft = 0.5 * Math.sqrt(cw * chh);
    for (const b of scene.branches) {
      const n = b.xs.length;
      for (let k = 2; k < n; k += 2) {
        const r = b.rs[k] * P.zH; if (r < thinPx) continue;
        const ax = P.X(b.ax[k - 2]), ay = P.Y(b.ay[k - 2]), bx = P.X(b.ax[k]), by = P.Y(b.ay[k]);
        if (Math.max(ax, bx) + r < 0 || Math.min(ax, bx) - r > W || Math.max(ay, by) + r < 0 || Math.min(ay, by) - r > H) continue;
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
            if (cv > cb[id]) {
              cb[id] = cv;
              const lit = d > 1e-6 ? (qx * LX + qy * LY) / d * Math.min(1, d / r) : 0;
              hl[id] = 0.35 + 0.65 * (lit > 0 ? lit : 0) - 0.15 * (lit < 0 ? -lit : 0);
            }
          }
        }
      }
    }
  }
  function splatFlowers(cp, cc, t, P) {
    let lo = Infinity, hi = -Infinity;
    for (const f of scene.flowers) {
      const [wx, wy] = flowerPos(f, t);
      const fx = P.X(wx), fy = P.Y(wy), R = f.R * P.zH;
      if (fx + R < 0 || fx - R > W || fy + R < 0 || fy - R > H) continue;
      const pr = fx * gdx + fy * gdy; if (pr < lo) lo = pr; if (pr > hi) hi = pr;
      const c0 = Math.max(0, Math.floor((fx - R) / cw)), c1 = Math.min(cols - 1, Math.floor((fx + R) / cw));
      const r0 = Math.max(0, Math.floor((fy - R) / chh)), r1 = Math.min(rows - 1, Math.floor((fy + R) / chh));
      const ct = Math.cos(f.tdir), st = Math.sin(f.tdir), it = 1 / f.tilt;
      for (let rr = r0; rr <= r1; rr++) for (let col = c0; col <= c1; col++) {
        let pet = 0, cen = 0;
        for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
          const px = (col + 0.25 + 0.5 * sx) * cw - fx, py = (rr + 0.25 + 0.5 * sy) * chh - fy;
          const a = px * ct + py * st, bb = (-px * st + py * ct) * it;
          const d = Math.sqrt(a * a + bb * bb) / R;
          if (d > 1) continue;
          const th0 = Math.atan2(bb, a) - f.rot + f.tdir;
          const prof = 0.80 + 0.20 * Math.cos(5 * th0);
          if (d < 0.22) cen++; else if (d < prof) pet++;
        }
        if (pet || cen) {
          const id = rr * cols + col;
          if (pet / 4 > cp[id]) cp[id] = pet / 4;
          if (cen / 4 > cc[id]) cc[id] = cen / 4;
        }
      }
    }
    // o gradiente cobre só a área onde há flores visíveis (como o disco da esfera)
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
    const N = cols * rows;
    const cb = new Float32Array(N), hl = new Float32Array(N), cp = new Float32Array(N), cc = new Float32Array(N);
    const thinPx = 0.35 * cw;
    splatBark(cb, hl, thinPx, P);
    splatFlowers(cp, cc, reduce ? 0 : t, P);
    const twig = new Int8Array(N).fill(-1);
    for (const b of scene.branches) {
      const n = b.xs.length;
      for (let k2 = 1; k2 < n; k2 += 2) {
        if (b.rs[k2] * zH >= thinPx) continue;
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
    const loose = new Int16Array(N).fill(-1);
    particles.forEach((p, i) => {
      const c = Math.floor(p.x * H / cw), r = Math.floor(p.y * H / chh);
      if (c >= 0 && r >= 0 && c < cols && r < rows) loose[r * cols + c] = i;
    });
    if (opts.glitch && !reduce && t > nextBlock && flowerCells.length) {
      const id = flowerCells[Math.floor(Math.random() * flowerCells.length)];
      const w = 2 + Math.floor(Math.random() * 6), h = 1 + Math.floor(Math.random() * 3);
      blocks.push({ c: (id % cols) - (w >> 1), r: Math.floor(id / cols) - (h >> 1), w, h, until: t + 0.12 + Math.random() * 0.35 });
      nextBlock = t + (0.25 + Math.random() * 1.2) / (1 + 2.5 * gust);
    }
    blocks = blocks.filter(b => b.until > t);
    const inBlock = new Uint8Array(N);
    for (const b of blocks) for (let r = b.r; r < b.r + b.h; r++) for (let c = b.c; c < b.c + b.w; c++)
      if (r >= 0 && c >= 0 && r < rows && c < cols) inBlock[r * cols + c] = 1;
    draw(t, { cb, hl, cp, cc, twig, loose, inBlock });
  }

  // ---------------------------------------------------------------- desenho
  const glyphs = { text: new Map(), rect: new Map(), cjk: new Map() };
  const push = (map, style, a, b, c, d) => { let arr = map.get(style); if (!arr) map.set(style, arr = []); arr.push(a, b, c, d); };
  const q8 = v => (Math.round(v / 6) * 6) | 0;
  const rgba = (c, a) => `rgba(${q8(c[0])},${q8(c[1])},${q8(c[2])},${Math.round(clamp(a, 0, 1) * 16) / 16})`;

  function motion(id, ch, cjk, t, kind) {
    const code = ch ? ch.charCodeAt(0) : 0;
    const ti = t - introStart;
    if (opts.intro && !reduce && ti < settle[id]) {
      prevGrid[id] = code;
      if (ti < settle[id] - 0.8) return ['', false];
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
    const { cb, hl, cp, cc, twig, loose, inBlock } = L;
    glyphs.text.clear(); glyphs.rect.clear(); glyphs.cjk.clear();
    const ink = opts.ink;
    const pr = pointer.active ? 4.5 : 0, pcx = pointer.x * H / cw, pcy = pointer.y * H / chh;
    flowerCells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const A = att[id];
      if (A < 0.02) { prevGrid[id] = 0; continue; }
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
      else if (loose[id] >= 0) {
        const p = particles[loose[id]]; kind = 'loose';
        const ph = Math.floor((t * p.spin + p.ph) * 1.3) % 5;
        if (opts.kanji) { ch = p.kind < 0.78 ? KANA[ph % 3] : KANA[3 + Math.floor((p.kind - 0.78) / 0.22 * 3) % 3]; cjk = true; } else ch = LOOSE[ph];
        val = 1;
      }
      if (!kind) { prevGrid[id] = 0; continue; }
      let sq = null, sqA = 0, col = ink, colA = 0;
      if (kind === 'petal' || kind === 'center' || kind === 'loose' || inBlock[id]) {
        const ic = irid(cx, cy);
        if (kind === 'petal') { sq = ic; sqA = 0.38 + 0.50 * val; col = mixc(ic, ink, 0.55); colA = 0.9; ch = val < 0.3 ? '.' : val < 0.55 ? ':' : val < 0.8 ? '+' : '*'; }
        else if (kind === 'center') { sq = ic; sqA = 0.92; col = mixc(ic, ink, 0.78); colA = 1; }
        else if (kind === 'loose') { sq = ic; sqA = 0.55; col = mixc(ic, ink, 0.6); colA = 0.95; }
        if (inBlock[id]) { sq = ic; sqA = 0.95; col = [255, 255, 255]; colA = 1; }
      }
      if (kind === 'bark') {
        const h = hl[id]; sq = ink; sqA = 0.03 + 0.08 * (1 - h); colA = 0.42 + 0.45 * (1 - h);
        if (opts.kanji && hash2(c, r) < 0.28) { ch = h > 0.62 ? '木' : h > 0.35 ? '林' : '森'; cjk = true; }
        else ch = hash2(c + 7, r) < 0.14 ? ':' : (h > 0.62 ? '-' : h > 0.35 ? '=' : '#');
        if (inBlock[id]) { sq = ink; sqA = 0.85; col = [229, 228, 224]; colA = 1; }
      } else if (kind === 'edge') { sq = ink; sqA = 0.05 * val; colA = 0.3 + 0.45 * val; ch = val < 0.3 ? '' : val < 0.6 ? '.' : ':'; }
      else if (kind === 'twig') { colA = 0.78; }
      if (near) { sqA += 0.18 * near; if (Math.random() < 0.35 * near && !cjk) ch = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]; }
      const m = motion(id, ch, cjk, t, kind); ch = m[0]; cjk = m[1];
      if (!ch && opts.intro && (t - introStart) < settle[id] - 0.8) continue;
      if (sq && sqA > 0.01) push(glyphs.rect, rgba(sq, sqA * A), x + 1, y + 1, cw - 2, chh - 2);
      if (ch && ch !== ' ') push(cjk ? glyphs.cjk : glyphs.text, rgba(col, colA * A), ch, cx, cy, 0);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const [style, a] of glyphs.rect) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillRect(a[i], a[i + 1], a[i + 2], a[i + 3]); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${opts.font}px ${opts.monoFamily}`;
    for (const [style, a] of glyphs.text) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillText(a[i], a[i + 1], a[i + 2]); }
    ctx.font = `${opts.cjk}px ${opts.cjkFamily}`;
    for (const [style, a] of glyphs.cjk) { ctx.fillStyle = style; for (let i = 0; i < a.length; i += 4) ctx.fillText(a[i], a[i + 1], a[i + 2]); }
  }

  // ---------------------------------------------------------------- laço e eventos
  let lastDraw = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    if (now - lastDraw < 1000 / opts.fps - 2) return;
    lastDraw = now;
    const s0 = performance.now();
    frame(now);
    if (opts.onFrame) opts.onFrame(performance.now() - s0);
  }
  function onPointer(e) {
    if (!opts.interactive) return;
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
  const onVis = () => { running = !document.hidden; if (running) last = 0; };
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { layout(); camSnap = true; frame(performance.now()); }, 120); };

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
    setOptions(o) { const regen = ('preset' in o && o.preset !== opts.preset) || ('seed' in o && o.seed !== opts.seed);
      Object.assign(opts, o); if (regen) layout(); if (reduce) frame(performance.now()); },
    replayIntro() { introStart = (performance.now() - t0) / 1000; gustPlan = null; },
    renderNow() { frame(performance.now()); },
    get camera() { return { ...cam }; },
    get size() { return { W, H }; },
    get focus() {
      let sx = 0, sy = 0, n = 0;
      for (const f of scene.flowers) { const b = scene.branches[f.b]; sx += b.xs[f.k]; sy += b.ys[f.k]; n++; }
      return n ? [sx / n, sy / n] : [0.5 * W / H, 0.5];
    },
    pause() { running = false; }, resume() { running = true; last = 0; },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
    },
    get stats() { return { cols, rows, branches: scene.branches.length, flowers: scene.flowers.length, particles: particles.length }; },
  };
}
