// ------------------------------------------------------------------ objetos dos projetos em ASCII denso (cards)
// Cada palco [data-sk-ascii="<slug>"] desenha os objetos de um projeto como uma nuvem de pontos que gira no
// próprio eixo, se desfaz e se remonta como o objeto seguinte, em loop. Todas as formas de um palco têm o mesmo
// número de pontos: o ponto i de uma forma vira o ponto i da próxima (a mesma ideia das partículas do news_portal,
// aqui sem three.js). Por quadro: rotação → projeção numa grade de células de 6 px alinhada ao quadriculado de
// 24 px do card → z-buffer por célula → luz (normal · L) → densidade de tinta → glifo da rampa · + × ✚ ✳ ■ com
// dither ordenado. Só tinta, do #1d1d1d ao #bfbebe: o gradiente continua sendo das flores.

const ASC_CELL = 6;                      // px por célula: 4 × 4 células em cada quadrado de 24 px do card
const ASC_FPS = 30;
// Relógio único: todas as formas de todos os projetos ficam o mesmo tempo paradas e levam o mesmo tempo para trocar,
// e todos os palcos leem o mesmo relógio (guardado na sessão, vale também nas páginas de projeto). Assim os cinco
// cards trocam de objeto no mesmo instante. Cada projeto tem 3 formas: ciclo de 3 × (3,2 + 2,1) = 15,9 s.
const ASC_HOLD = 3.2, ASC_MORPH = 2.1;   // segundos parado em cada forma / desfazendo e remontando
const ASC_INTRO = 1.7;                   // entrada de cada palco: o que o relógio mostra brota de baixo para cima
const ASC_SPREAD = 0.5;                  // fração da troca usada para escalonar a saída das partículas
const ASC_CAM = 4.2;                     // distância da câmera (perspectiva leve)
const ASC_TONES = [[29, 29, 29], [62, 62, 61], [110, 110, 108], [175, 174, 173]];
const ASC_L = (() => { const l = [-0.5, 0.62, 0.6], n = Math.hypot(l[0], l[1], l[2]); return l.map(v => v / n); })();
const ASC_FLY = [0, 0, 1, 1, 2, 3, 0, 1]; // glifos das partículas soltas: mais pontos e cruzes pequenas
const ASC_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const ASC_SCRIPT_URL = typeof document === 'undefined' ? '' : document.currentScript?.src || '';
const ASC_WORKER_URL = /^https?:/.test(ASC_SCRIPT_URL) ? new URL('sakura-ascii-worker.js', ASC_SCRIPT_URL) : null;
// glifos desenhados como pixels (5 × 5 dentro da célula, com 1 px de respiro à esquerda e em cima, que coincide
// com as linhas do quadriculado): · + × ✚ ✳ ■, em ordem de tinta
const ASC_GLYPHS = [
  '.....|..##.|..##.|.....|.....',
  '.....|..#..|.###.|..#..|.....',
  '#...#|.#.#.|..#..|.#.#.|#...#',
  '..#..|..#..|#####|..#..|..#..',
  '#.#.#|.###.|#####|.###.|#.#.#',
  '#####|#####|#####|#####|#####',
];

function ascAtlas(dpr) {
  const T = Math.max(5, Math.round(ASC_CELL * dpr));
  const cv = document.createElement('canvas');
  cv.width = T * ASC_GLYPHS.length; cv.height = T * ASC_TONES.length;
  const g = cv.getContext('2d');
  ASC_TONES.forEach((col, k) => {
    g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    ASC_GLYPHS.forEach((pat, i) => {
      const rows = pat.split('|');
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        if (rows[y][x] !== '#') continue;
        const x0 = Math.round((x + 1) * T / 6), x1 = Math.round((x + 2) * T / 6);
        const y0 = Math.round((y + 1) * T / 6), y1 = Math.round((y + 2) * T / 6);
        g.fillRect(i * T + x0, k * T + y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      }
    });
  });
  return { cv, T, dpr };
}

// ---------------------------------------------------------------- malha → nuvem de pontos
// Uma malha é uma lista de partes; cada parte tem triângulos, um albedo (número ou função da posição e da normal;
// negativo = furo, o ponto não existe), peso de amostragem, grupo (para partes que giram sozinhas) e um valor
// auxiliar por ponto (ex.: posição ao longo de um cabo).
function ascMesh() {
  const parts = [];
  let cur = null;
  const m = {
    parts,
    part(alb, o) { o = o || {}; cur = { tri: [], alb: alb == null ? 0.6 : alb, w: o.w || 1, soft: !!o.soft, grp: o.grp == null ? -1 : o.grp, aux: o.aux || null }; parts.push(cur); return m; },
    tri(a, b, c) { cur.tri.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); return m; },
    quad(a, b, c, d) { m.tri(a, b, c); m.tri(a, c, d); return m; },
  };
  return m;
}

const ascAx = { x: 0, y: 1, z: 2 };
function ascPt(axis, a, u, v) { // ponto com coordenada `a` no eixo e (u, v) nos outros dois, em ordem cíclica
  const i = ascAx[axis], p = [0, 0, 0];
  p[i] = a; p[(i + 1) % 3] = u; p[(i + 2) % 3] = v;
  return p;
}
// retângulo no plano eixo = at; u e v são os dois eixos seguintes em ordem cíclica (x → y,z · y → z,x · z → x,y)
function ascRect(m, axis, at, u0, u1, v0, v1) {
  m.quad(ascPt(axis, at, u0, v0), ascPt(axis, at, u1, v0), ascPt(axis, at, u1, v1), ascPt(axis, at, u0, v1));
}
function ascBox(m, cx, cy, cz, sx, sy, sz, skip) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
  skip = skip || '';
  if (!skip.includes('x')) ascRect(m, 'x', x0, y0, y1, z0, z1);
  if (!skip.includes('X')) ascRect(m, 'x', x1, y0, y1, z0, z1);
  if (!skip.includes('y')) ascRect(m, 'y', y0, z0, z1, x0, x1);
  if (!skip.includes('Y')) ascRect(m, 'y', y1, z0, z1, x0, x1);
  if (!skip.includes('z')) ascRect(m, 'z', z0, x0, x1, y0, y1);
  if (!skip.includes('Z')) ascRect(m, 'z', z1, x0, x1, y0, y1);
}
// retângulo com borda escura (a resolução do card não segura textura fina; contorno é o que faz a forma ler)
function ascPanel(m, axis, at, u0, u1, v0, v1, alb, o) {
  o = o || {};
  const e = o.edge == null ? 0.022 : o.edge, i = ascAx[axis], iu = (i + 1) % 3, iv = (i + 2) % 3;
  m.part((x, y, z, nx, ny, nz) => {
    const p = [x, y, z], u = p[iu], v = p[iv];
    if (e > 0 && Math.min(u - u0, u1 - u, v - v0, v1 - v) < e) return 1;
    return typeof alb === 'function' ? alb(x, y, z, nx, ny, nz) : alb;
  }, o);
  ascRect(m, axis, at, u0, u1, v0, v1);
}
// cilindro (ou tronco de cone) no eixo dado; c = centro; caps: 0 nenhuma, 1 só embaixo, 2 só em cima, 3 as duas
function ascCyl(m, axis, c, r0, r1, h, seg, caps) {
  const i = ascAx[axis], u = (i + 1) % 3, v = (i + 2) % 3;
  const P = (r, a, s) => { const p = [c[0], c[1], c[2]]; p[i] += s; p[u] += r * Math.cos(a); p[v] += r * Math.sin(a); return p; };
  seg = seg || 24; caps = caps == null ? 3 : caps;
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
    m.quad(P(r0, a0, -h / 2), P(r0, a1, -h / 2), P(r1, a1, h / 2), P(r1, a0, h / 2));
    if (caps & 1) m.tri(P(0, 0, -h / 2), P(r0, a0, -h / 2), P(r0, a1, -h / 2));
    if (caps & 2) m.tri(P(0, 0, h / 2), P(r1, a0, h / 2), P(r1, a1, h / 2));
  }
}
function ascDisk(m, axis, c, r, seg, r0) { // disco (ou anel, com r0) no plano perpendicular ao eixo
  const i = ascAx[axis], u = (i + 1) % 3, v = (i + 2) % 3;
  const P = (rr, a) => { const p = [c[0], c[1], c[2]]; p[u] += rr * Math.cos(a); p[v] += rr * Math.sin(a); return p; };
  seg = seg || 32;
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
    if (r0) m.quad(P(r0, a0), P(r, a0), P(r, a1), P(r0, a1)); else m.tri(c, P(r, a0), P(r, a1));
  }
}
function ascTorus(m, axis, c, R, r, segU, segV, a0, a1) {
  const i = ascAx[axis], u = (i + 1) % 3, v = (i + 2) % 3;
  a0 = a0 || 0; a1 = a1 == null ? Math.PI * 2 : a1;
  const P = (a, b) => {
    const p = [c[0], c[1], c[2]], rr = R + r * Math.cos(b);
    p[u] += rr * Math.cos(a); p[v] += rr * Math.sin(a); p[i] += r * Math.sin(b);
    return p;
  };
  for (let k = 0; k < segU; k++) for (let j = 0; j < segV; j++) {
    const ua = a0 + (a1 - a0) * k / segU, ub = a0 + (a1 - a0) * (k + 1) / segU;
    const va = j / segV * Math.PI * 2, vb = (j + 1) / segV * Math.PI * 2;
    m.quad(P(ua, va), P(ub, va), P(ub, vb), P(ua, vb));
  }
}
function ascSphere(m, c, r, seg) {
  seg = seg || 16;
  const P = (a, b) => [c[0] + r * Math.cos(b) * Math.cos(a), c[1] + r * Math.sin(b), c[2] + r * Math.cos(b) * Math.sin(a)];
  for (let k = 0; k < seg * 2; k++) for (let j = 0; j < seg; j++) {
    const a0 = k / (seg * 2) * Math.PI * 2, a1 = (k + 1) / (seg * 2) * Math.PI * 2;
    const b0 = -Math.PI / 2 + j / seg * Math.PI, b1 = -Math.PI / 2 + (j + 1) / seg * Math.PI;
    m.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1));
  }
}
function ascTube(m, a, b, r, seg) { // cilindro fino entre dois pontos
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]);
  const w = d.map(x => x / L), t = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = [w[1] * t[2] - w[2] * t[1], w[2] * t[0] - w[0] * t[2], w[0] * t[1] - w[1] * t[0]], un = Math.hypot(u[0], u[1], u[2]);
  for (let k = 0; k < 3; k++) u[k] /= un;
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  seg = seg || 8;
  const P = (o, ang) => [o[0] + r * (Math.cos(ang) * u[0] + Math.sin(ang) * v[0]), o[1] + r * (Math.cos(ang) * u[1] + Math.sin(ang) * v[1]), o[2] + r * (Math.cos(ang) * u[2] + Math.sin(ang) * v[2])];
  for (let k = 0; k < seg; k++) {
    const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
    m.quad(P(a, a0), P(a, a1), P(b, a1), P(b, a0));
  }
}
// polígono convexo (lista de [x, y]) extrudado entre z0 e z1 (faces + paredes)
function ascPrism(m, poly, z0, z1, faces) {
  const n = poly.length, cx = poly.reduce((s, p) => s + p[0], 0) / n, cy = poly.reduce((s, p) => s + p[1], 0) / n;
  faces = faces == null ? 3 : faces;
  for (let k = 0; k < n; k++) {
    const p = poly[k], q = poly[(k + 1) % n];
    if (faces & 1) m.tri([cx, cy, z0], [p[0], p[1], z0], [q[0], q[1], z0]);
    if (faces & 2) m.tri([cx, cy, z1], [p[0], p[1], z1], [q[0], q[1], z1]);
    m.quad([p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]);
  }
}
// contorno: faixa entre um polígono externo e um interno com o mesmo número de vértices, extrudada em z
function ascFrame(m, outer, inner, z0, z1) {
  const n = outer.length;
  for (let k = 0; k < n; k++) {
    const o0 = outer[k], o1 = outer[(k + 1) % n], i0 = inner[k], i1 = inner[(k + 1) % n];
    for (const z of [z0, z1]) m.quad([o0[0], o0[1], z], [o1[0], o1[1], z], [i1[0], i1[1], z], [i0[0], i0[1], z]);
    m.quad([o0[0], o0[1], z0], [o1[0], o1[1], z0], [o1[0], o1[1], z1], [o0[0], o0[1], z1]);
    m.quad([i0[0], i0[1], z0], [i1[0], i1[1], z0], [i1[0], i1[1], z1], [i0[0], i0[1], z1]);
  }
}
const ascNgon = (cx, cy, r, n, a0) => Array.from({ length: n }, (_, k) => [cx + r * Math.cos(a0 + k / n * Math.PI * 2), cy + r * Math.sin(a0 + k / n * Math.PI * 2)]);
function ascRoundRect(w, h, r, seg) {
  const out = [], q = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]];
  for (const [cx, cy, k] of q) for (let j = 0; j <= seg; j++) { const a = (k + j / seg) * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}

function ascBuffers(N) {
  return { pos: new Float32Array(N * 3), nrm: new Float32Array(N * 3), alb: new Float32Array(N), soft: new Uint8Array(N), grp: new Int8Array(N).fill(-1), aux: new Float32Array(N) };
}

// amostragem por área (estratificada), com rejeição dos furos
function ascSampleMesh(m, N, rnd) {
  const parts = m.parts, cum = [], ref = [];
  let tot = 0;
  parts.forEach((part, pi) => {
    const T = part.tri;
    for (let k = 0; k < T.length; k += 9) {
      const ux = T[k + 3] - T[k], uy = T[k + 4] - T[k + 1], uz = T[k + 5] - T[k + 2];
      const vx = T[k + 6] - T[k], vy = T[k + 7] - T[k + 1], vz = T[k + 8] - T[k + 2];
      const a = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      if (a <= 1e-12) continue;
      tot += a * part.w; cum.push(tot); ref.push(pi, k);
    }
  });
  const B = ascBuffers(N);
  let n = 0, tries = 0;
  while (n < N && tries < N * 8) {
    const r = (tries < N ? (tries + rnd()) / N : rnd()) * tot;
    tries++;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const part = parts[ref[lo * 2]], k = ref[lo * 2 + 1], T = part.tri;
    const s = Math.sqrt(rnd()), t = rnd(), wa = 1 - s, wb = s * (1 - t), wc = s * t;
    const x = T[k] * wa + T[k + 3] * wb + T[k + 6] * wc, y = T[k + 1] * wa + T[k + 4] * wb + T[k + 7] * wc, z = T[k + 2] * wa + T[k + 5] * wb + T[k + 8] * wc;
    const ux = T[k + 3] - T[k], uy = T[k + 4] - T[k + 1], uz = T[k + 5] - T[k + 2];
    const vx = T[k + 6] - T[k], vy = T[k + 7] - T[k + 1], vz = T[k + 8] - T[k + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const a = typeof part.alb === 'function' ? part.alb(x, y, z, nx, ny, nz) : part.alb;
    if (a < 0) continue;
    B.pos[n * 3] = x; B.pos[n * 3 + 1] = y; B.pos[n * 3 + 2] = z;
    B.nrm[n * 3] = nx; B.nrm[n * 3 + 1] = ny; B.nrm[n * 3 + 2] = nz;
    B.alb[n] = a; B.soft[n] = part.soft ? 1 : 0; B.grp[n] = part.grp; B.aux[n] = part.aux ? part.aux(x, y, z) : 0;
    n++;
  }
  ascFillUp(B, n, N, rnd);
  return B;
}

// superfície implícita (SDF): pontos sorteados numa casca fina em volta da superfície e projetados nela
async function ascSampleSDF(sdf, box, N, rnd, albFn, grpFn, pause) {
  const B = ascBuffers(N), eps = 0.03, h = 0.0015;
  const [x0, y0, z0, x1, y1, z1] = box;
  let n = 0, tries = 0;
  let until = pause ? performance.now() + 6 : 0;
  while (n < N && tries < N * 600) {
    if (pause && (tries & 63) === 0 && performance.now() >= until) {
      await pause();
      until = performance.now() + 6;
    }
    tries++;
    let x = x0 + (x1 - x0) * rnd(), y = y0 + (y1 - y0) * rnd(), z = z0 + (z1 - z0) * rnd();
    let d = sdf(x, y, z);
    if (Math.abs(d) > eps) continue;
    let gx = 0, gy = 0, gz = 0;
    for (let it = 0; it < 3; it++) {
      gx = sdf(x + h, y, z) - sdf(x - h, y, z); gy = sdf(x, y + h, z) - sdf(x, y - h, z); gz = sdf(x, y, z + h) - sdf(x, y, z - h);
      const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
      x -= d * gx; y -= d * gy; z -= d * gz;
      d = sdf(x, y, z);
    }
    if (Math.abs(d) > 0.004) continue;
    const a = albFn ? albFn(x, y, z, gx, gy, gz) : 0.6;
    if (a < 0) continue;
    B.pos[n * 3] = x; B.pos[n * 3 + 1] = y; B.pos[n * 3 + 2] = z;
    B.nrm[n * 3] = gx; B.nrm[n * 3 + 1] = gy; B.nrm[n * 3 + 2] = gz;
    B.alb[n] = a; B.grp[n] = grpFn ? grpFn(x, y, z) : -1;
    n++;
  }
  ascFillUp(B, n, N, rnd);
  return B;
}
function ascFillUp(B, n, N, rnd) { // se os furos comeram pontos demais, repete pontos existentes
  for (let i = n; i < N; i++) {
    const j = n ? Math.floor(rnd() * n) : 0;
    for (let k = 0; k < 3; k++) { B.pos[i * 3 + k] = B.pos[j * 3 + k]; B.nrm[i * 3 + k] = B.nrm[j * 3 + k]; }
    B.alb[i] = B.alb[j]; B.soft[i] = B.soft[j]; B.grp[i] = B.grp[j]; B.aux[i] = B.aux[j];
  }
}
function ascConcat(list) { // junta várias amostragens, na ordem
  const N = list.reduce((s, b) => s + b.alb.length, 0), B = ascBuffers(N);
  let o = 0;
  for (const b of list) {
    const n = b.alb.length;
    B.pos.set(b.pos, o * 3); B.nrm.set(b.nrm, o * 3); B.alb.set(b.alb, o); B.soft.set(b.soft, o); B.grp.set(b.grp, o); B.aux.set(b.aux, o);
    o += n;
  }
  return B;
}

// normaliza para caber numa esfera de raio 1, embaralha (o morph vira uma dissolução, não um deslize ordenado)
// e devolve a forma pronta. `pts` são pontos extras (centros de grupo, caminhos) que recebem a mesma transformação.
function ascShape(B, rnd, o) {
  o = o || {};
  const N = B.alb.length, P = B.pos;
  let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; if (z < mnz) mnz = z; if (z > mxz) mxz = z;
  }
  const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2, cz = (mnz + mxz) / 2;
  let rad = 0;
  for (let i = 0; i < N; i++) rad = Math.max(rad, Math.hypot(P[i * 3] - cx, P[i * 3 + 1] - cy, P[i * 3 + 2] - cz));
  const k = 1 / (rad || 1);
  const tf = p => [(p[0] - cx) * k, (p[1] - cy) * k, (p[2] - cz) * k];
  for (let i = 0; i < N; i++) { P[i * 3] = (P[i * 3] - cx) * k; P[i * 3 + 1] = (P[i * 3 + 1] - cy) * k; P[i * 3 + 2] = (P[i * 3 + 2] - cz) * k; }
  const perm = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const S = ascBuffers(N);
  for (let i = 0; i < N; i++) {
    const j = perm[i];
    for (let a = 0; a < 3; a++) { S.pos[i * 3 + a] = P[j * 3 + a]; S.nrm[i * 3 + a] = B.nrm[j * 3 + a]; }
    S.alb[i] = B.alb[j]; S.soft[i] = B.soft[j]; S.grp[i] = B.grp[j]; S.aux[i] = B.aux[j];
  }
  let rh = 0, rv = 0;
  for (let i = 0; i < N; i++) { rh = Math.max(rh, Math.hypot(S.pos[i * 3], S.pos[i * 3 + 2])); rv = Math.max(rv, Math.abs(S.pos[i * 3 + 1])); }
  const sh = {
    N, base: S, soft: S.soft, grp: S.grp, aux: S.aux, rh, rv, k, tf,
    view: Object.assign({ tilt: 0.32, spin: 0.5, scale: 1, light: 0.5 }, o.view || {}),
    hold: ASC_HOLD, morph: ASC_MORPH,
    origin: o.origin ? tf(o.origin) : [0, 0, 0],
    groups: o.groups ? o.groups.map(g => Object.assign({}, g, { c: tf(g.c) })) : null,
    albAnim: o.albAnim || null, regen: o.regen || null,
  };
  if (o.after) o.after(sh, tf, k);
  sh.cur = sh.groups || sh.albAnim ? { pos: new Float32Array(S.pos), nrm: new Float32Array(S.nrm), alb: new Float32Array(S.alb) } : S;
  return sh;
}

// partes que se mexem sozinhas: cada grupo gira no próprio eixo (ay, ax) e se desloca (tx, ty, tz)
function ascAnimate(sh, t) {
  if (sh.cur === sh.base) return sh.cur;
  const B = sh.base, C = sh.cur, N = sh.N;
  const poses = sh.groups ? sh.groups.map(g => {
    const p = g.pose(t), ay = p[0] || 0, ax = p[1] || 0;
    return { c: g.c, cy: Math.cos(ay), sy: Math.sin(ay), cx: Math.cos(ax), sx: Math.sin(ax), t: [p[2] || 0, p[3] || 0, p[4] || 0] };
  }) : null;
  for (let i = 0; i < N; i++) {
    const g = sh.grp[i], j = i * 3;
    if (g < 0 || !poses) {
      C.pos[j] = B.pos[j]; C.pos[j + 1] = B.pos[j + 1]; C.pos[j + 2] = B.pos[j + 2];
      C.nrm[j] = B.nrm[j]; C.nrm[j + 1] = B.nrm[j + 1]; C.nrm[j + 2] = B.nrm[j + 2];
    } else {
      const q = poses[g], c = q.c;
      for (let w = 0; w < 2; w++) {
        const src = w ? B.nrm : B.pos, dst = w ? C.nrm : C.pos;
        let x = src[j], y = src[j + 1], z = src[j + 2];
        if (!w) { x -= c[0]; y -= c[1]; z -= c[2]; }
        const x1 = x * q.cy + z * q.sy, z1 = -x * q.sy + z * q.cy;
        const y2 = y * q.cx - z1 * q.sx, z2 = y * q.sx + z1 * q.cx;
        if (w) { dst[j] = x1; dst[j + 1] = y2; dst[j + 2] = z2; }
        else { dst[j] = x1 + c[0] + q.t[0]; dst[j + 1] = y2 + c[1] + q.t[1]; dst[j + 2] = z2 + c[2] + q.t[2]; }
      }
    }
    C.alb[i] = sh.albAnim ? sh.albAnim(B.alb[i], sh.aux[i], t, g) : B.alb[i];
  }
  return C;
}

// ---------------------------------------------------------------- palco
const ascIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function ascStage(el, store, reduce) {
  const canvas = el.querySelector('canvas') || el.appendChild(document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  const grid = el.closest('.sk-card, .sk-tile') || el;
  const S = {
    el, canvas, ctx, grid, slug: el.getAttribute('data-sk-ascii'), src: el.getAttribute('data-sk-ascii-src') || 'assets/ascii/',
    W: 0, H: 0, dpr: 1, cols: 0, rows: 0, sx: 0, sy: 0, atlas: null,
    shapes: null, dust: null, N: 0, building: false, failed: false,
    t: 0, intro: 0, angle: 0.6, yaw: 0.6, seg: '', ord: null, ord0: null, kind: 'scatter', boost: 0, hover: false, frame: 0, dirty: true,
    zb: null, val: null, kd: null, gl: null, szb: null, sval: null, ms: 0,
  };
  // vindo de um card (ou voltando para a home), o palco continua de onde o outro parou: sem entrada, mesmo ângulo
  try {
    const saved = JSON.parse(store.getItem('sk-ascii:' + S.slug) || 'null');
    if (saved && Date.now() - saved.at < 4000) { S.intro = Infinity; S.angle = saved.a; }
  } catch (e) { /* sem storage */ }
  if (reduce) { S.t = 0.8; S.intro = Infinity; }
  return S;
}

function ascLayout(S) {
  const r = S.el.getBoundingClientRect(), g = S.grid.getBoundingClientRect();
  S.W = Math.max(1, Math.round(r.width)); S.H = Math.max(1, Math.round(r.height));
  S.dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
  S.canvas.style.width = S.W + 'px'; S.canvas.style.height = S.H + 'px';
  // células alinhadas ao quadriculado do card (que começa na borda interna do elemento com o fundo)
  const offX = r.left - g.left - (S.grid.clientLeft || 0), offY = r.top - g.top - (S.grid.clientTop || 0);
  S.sx = ((Math.round(offX) % ASC_CELL) + ASC_CELL) % ASC_CELL; S.sy = ((Math.round(offY) % ASC_CELL) + ASC_CELL) % ASC_CELL;
  S.cols = Math.ceil((S.W + S.sx) / ASC_CELL); S.rows = Math.ceil((S.H + S.sy) / ASC_CELL);
  const n = S.cols * S.rows;
  S.zb = new Float32Array(n); S.val = new Float32Array(n); S.kd = new Uint8Array(n); S.gl = new Uint8Array(n);
  S.szb = new Float32Array(n); S.sval = new Float32Array(n);
  if (!S.atlas || S.atlas.dpr !== S.dpr) S.atlas = ascAtlas(S.dpr);
  S.dirty = false;
}

function ascSampler() {
  const pending = new Map();
  let worker = null, id = 0, failed = false, closed = false;
  const stop = error => {
    failed = true;
    worker?.terminate();
    worker = null;
    pending.forEach(job => job.reject(error));
    pending.clear();
  };
  const request = (name, N, params, state) => new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(ASC_WORKER_URL);
      worker.onmessage = ({ data }) => {
        const job = pending.get(data.id);
        if (!job) return;
        pending.delete(data.id);
        if (data.error) job.reject(new Error(data.error));
        else job.resolve(data);
      };
      worker.onerror = event => { event.preventDefault(); stop(new Error(event.message || 'Worker ASCII')); };
      worker.onmessageerror = () => stop(new Error('Resposta inválida do worker ASCII'));
    }
    pending.set(++id, { resolve, reject });
    worker.postMessage({ id, name, N, params, state });
  });
  const pause = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    if (closed) throw new Error('Palco ASCII desmontado');
  };
  return {
    async sample(rng, name, N, params) {
      if (closed) throw new Error('Palco ASCII desmontado');
      if (!failed && ASC_WORKER_URL && typeof Worker === 'function') {
        try {
          const { cloud, state } = await request(name, N, params, rng.state);
          rng.state = state;
          return cloud;
        } catch (error) {
          if (closed) throw error;
          stop(error);
        }
      }
      return ASC_SAMPLERS[name](N, rng.random, params, pause);
    },
    destroy() { closed = true; stop(new Error('Palco ASCII desmontado')); },
  };
}

async function ascBuild(S, sampler) {
  S.building = true;
  const N = S.N = clamp(Math.round(S.cols * S.rows * 2.4), 4000, 16000);
  const rng = rngFrom(hash2(S.slug.length * 131, S.slug.charCodeAt(0) * 7) * 4294967296 >>> 0);
  const rnd = rng.random;
  const def = ASC_PROJECTS[S.slug] || ASC_PROJECTS._;
  const env = { N, rnd, src: S.src, sample: (name, n, params) => sampler.sample(rng, name, n, params) };
  const shapes = [];
  for (const make of def.shapes) shapes.push(await make(env));
  shapes.forEach((sh, k) => { sh.trans = def.trans[k] || 'scatter'; });
  S.dust = ascDust(N, rnd);
  S.dir = new Float32Array(N * 3); S.rn = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    S.dir[i * 3] = s * Math.cos(a); S.dir[i * 3 + 1] = u; S.dir[i * 3 + 2] = s * Math.sin(a); S.rn[i] = rnd();
  }
  S.ord = new Float32Array(N);
  S.shapes = shapes; // só agora: o laço nunca vê um palco pela metade
  S.building = false;
}

function ascDust(N, rnd) { // "chão" de onde a primeira forma brota
  const pos = new Float32Array(N * 3), nrm = new Float32Array(N * 3), alb = new Float32Array(N).fill(0.4);
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(rnd()) * 0.9, a = rnd() * Math.PI * 2;
    pos[i * 3] = r * Math.cos(a); pos[i * 3 + 1] = -1.05; pos[i * 3 + 2] = r * Math.sin(a); nrm[i * 3 + 1] = 1;
  }
  const B = { pos, nrm, alb };
  return { N, base: B, cur: B, soft: new Uint8Array(N), grp: new Int8Array(N).fill(-1), rh: 0.9, rv: 1.05, view: { tilt: 0.3, spin: 0.5, scale: 1, light: 0.5 }, origin: [0, -1, 0] };
}

// em que ponto do ciclo estamos: forma a (parada) ou troca a → b com progresso tau
function ascWhere(S) {
  const L = S.shapes;
  let cyc = 0; for (const s of L) cyc += s.hold + s.morph;
  let lt = S.t % cyc, k = 0;
  while (lt >= L[k].hold + L[k].morph) { lt -= L[k].hold + L[k].morph; k++; }
  return lt < L[k].hold ? { a: k, b: k, tau: 0 } : { a: k, b: (k + 1) % L.length, tau: (lt - L[k].hold) / L[k].morph };
}

// ordem de saída de cada partícula (0 = sai primeiro), calculada quando a troca começa
function ascOrder(S, kind, A, Bc, shA) {
  const N = S.N, O = S.ord, rn = S.rn;
  let mn = Infinity, mx = -Infinity;
  const o = shA.origin || [0, 0, 0], ang0 = rn[0] * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    let v;
    if (kind === 'wave') v = Math.hypot(A[j] - o[0], A[j + 1] - o[1], A[j + 2] - o[2]);
    else if (kind === 'seq' || kind === 'drop') v = ((Math.atan2(Bc[j + 2], Bc[j]) - ang0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    else if (kind === 'contain') v = -Math.hypot(A[j], A[j + 1], A[j + 2]);
    else if (kind === 'sync' || kind === 'implode') v = 0;
    else v = -A[j + 1]; // scatter: de cima para baixo
    O[i] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  const span = mx - mn || 1;
  const jit = kind === 'sync' || kind === 'implode' ? 0.25 : 0.22;
  for (let i = 0; i < N; i++) O[i] = clamp((1 - jit) * (O[i] - mn) / span + jit * rn[i], 0, 1);
}

function ascFit(S, sh, tilt) {
  const vr = sh.rv * Math.cos(tilt) + sh.rh * Math.abs(Math.sin(tilt));
  return Math.min(S.W * 0.46 / sh.rh, S.H * 0.47 / Math.max(0.2, vr)) * (sh.view.scale || 1);
}

function ascStep(S, dt) {
  const w = ascWhere(S);
  const A = S.shapes[w.a], B = S.shapes[w.b];
  const morph = w.a !== w.b;
  const segKey = w.a + '>' + w.b;
  const t = S.t;
  // ---- troca começando: forma nova (anel do Loopia), ordem de saída
  const newMorph = morph && S.seg !== segKey;
  if (newMorph) {
    if (B.regen) B.regen(B);
    S.kind = A.trans;
    S.seg = segKey;
  } else if (!morph) S.seg = segKey;
  const ca = ascAnimate(A, t), cb = morph ? ascAnimate(B, t) : ca;
  if (newMorph) ascOrder(S, S.kind, ca.pos, cb.pos, A);
  const tauE = ascIO(w.tau), bump = morph ? Math.sin(Math.PI * w.tau) : 0;
  // ---- câmera: gira mais rápido no meio da troca e com o mouse em cima do card
  S.boost += ((S.hover ? 1 : 0) - S.boost) * Math.min(1, dt * 3);
  const spin = (A.view.spin + (B.view.spin - A.view.spin) * tauE) * (1 + 1.6 * bump) * (1 + 0.9 * S.boost);
  S.angle += spin * dt;
  // formas com frente (view.face = ângulo em que a frente olha para a câmera) não dão a volta: balançam em torno
  // da frente, no relógio comum (o card e a página do projeto mostram o mesmo ângulo). As outras giram livres.
  // Na troca, o ângulo vai de uma para a outra pelo caminho mais curto.
  const yawOf = sh => sh.view.face == null ? S.angle : sh.view.face + (sh.view.sway == null ? 0.38 : sh.view.sway) * Math.sin(t * 0.55);
  const ya = yawOf(A), yb = morph ? yawOf(B) : ya;
  const dy = (((yb - ya + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  S.yaw = ya + dy * tauE;
  const tilt = A.view.tilt + (B.view.tilt - A.view.tilt) * tauE;
  const fitA = ascFit(S, A, tilt), sc = morph ? fitA + (ascFit(S, B, tilt) - fitA) * tauE : fitA;
  // ---- entrada do palco: o que o relógio mostra agora brota do chão, de baixo para cima
  const itau = S.intro < ASC_INTRO ? S.intro / ASC_INTRO : 1;
  if (itau < 1 && !S.ord0) {
    S.ord0 = new Float32Array(S.N);
    const P = (w.tau > 0.5 ? cb : ca).pos;
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < S.N; i++) { const y = P[i * 3 + 1]; if (y < mn) mn = y; if (y > mx) mx = y; }
    for (let i = 0; i < S.N; i++) S.ord0[i] = clamp(0.88 * (P[i * 3 + 1] - mn) / (mx - mn || 1) + 0.12 * S.rn[i], 0, 1);
  }
  ascRender(S, w, A, B, ca, cb, morph, tilt, sc, itau);
}

function ascRender(S, w, A, B, ca, cb, morph, tilt, sc, itau) {
  const { cols, rows, zb, val, kd, gl, szb, sval, N } = S;
  zb.fill(-1e9); szb.fill(-1e9); kd.fill(0);
  const cyA = Math.cos(S.yaw), syA = Math.sin(S.yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  const cx = S.W / 2 + S.sx, cy = S.H / 2 + S.sy, kind = S.kind, O = S.ord, D = S.dir, rn = S.rn;
  const fly = kind !== 'sync';
  const edgeT = S.sy + 3 * ASC_CELL, edgeB = S.H + S.sy - 3 * ASC_CELL, edgeL = S.sx + 3 * ASC_CELL, edgeR = S.W + S.sx - 3 * ASC_CELL;
  const amp = { scatter: 0.55, wave: 0.85, contain: 1.25, seq: 0.6, drop: 0.7, sync: 0.12, implode: 0 }[kind] || 0.5;
  const flick = (S.frame >> 1) * 2654435761;
  const Lx = ASC_L[0], Ly = ASC_L[1], Lz = ASC_L[2];
  const Pa = ca.pos, Na = ca.nrm, Aa = ca.alb, Pb = cb.pos, Nb = cb.nrm, Ab = cb.alb;
  const LA = A.view.light == null ? 0.5 : A.view.light, LB = B.view.light == null ? 0.5 : B.view.light;
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    let x = Pa[j], y = Pa[j + 1], z = Pa[j + 2], nx = Na[j], ny = Na[j + 1], nz = Na[j + 2], al = Aa[i];
    let soft = A.soft[i], m = 0, lf = LA;
    if (morph) {
      const u = clamp((w.tau - O[i] * ASC_SPREAD) / (1 - ASC_SPREAD), 0, 1);
      const e = ascIO(u);
      m = Math.sin(Math.PI * u);
      x += (Pb[j] - x) * e; y += (Pb[j + 1] - y) * e; z += (Pb[j + 2] - z) * e;
      nx += (Nb[j] - nx) * e; ny += (Nb[j + 1] - ny) * e; nz += (Nb[j + 2] - nz) * e;
      al += (Ab[i] - al) * e;
      if (e > 0.5) soft = B.soft[i];
      lf = LA + (LB - LA) * e;
      if (m > 0) {
        if (kind === 'wave') {
          const o = A.origin; let dx = Pa[j] - o[0], dy = Pa[j + 1] - o[1], dz = Pa[j + 2] - o[2];
          const dl = Math.hypot(dx, dy, dz) || 1; const k = amp * m / dl;
          x += dx * k; y += dy * k; z += dz * k;
        } else if (kind === 'implode') {
          const k = 1 - 0.88 * m; x *= k; y *= k; z *= k;
        } else if (kind === 'seq' || kind === 'drop') {
          y += amp * m; x += D[j] * 0.08 * m; z += D[j + 2] * 0.08 * m;
        } else {
          const a2 = amp * m * (0.25 + 0.75 * rn[i] * rn[i]); // a maioria fica perto, poucas vão longe
          x += D[j] * a2; y += D[j + 1] * a2 + (kind === 'scatter' ? 0.1 * m : 0); z += D[j + 2] * a2;
          if (kind === 'contain') { // as partículas batem numa esfera invisível e voltam: nada sai da máquina
            const r = Math.hypot(x, y, z), Rb = 1.06;
            if (r > Rb) { const k = Math.max(0.3, Rb - (r - Rb) * 0.7) / r; x *= k; y *= k; z *= k; }
          }
        }
      }
    }
    let fin = false;
    if (itau < 1) { // entrada: sai do chão (S.dust) e sobe até a posição do relógio, de baixo para cima
      const u = clamp((itau - S.ord0[i] * ASC_SPREAD) / (1 - ASC_SPREAD), 0, 1);
      if (u <= 0) continue;
      const e = ascIO(u), mi = Math.sin(Math.PI * u), G = S.dust.base.pos;
      x = G[j] + (x - G[j]) * e + D[j] * 0.12 * mi; y = G[j + 1] + (y - G[j + 1]) * e + D[j + 1] * 0.12 * mi; z = G[j + 2] + (z - G[j + 2]) * e + D[j + 2] * 0.12 * mi;
      fin = mi > 0.45;
    }
    // rotação (giro no eixo Y, depois inclinação no X) e projeção
    const x1 = x * cyA + z * syA, z1 = -x * syA + z * cyA;
    const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
    const k = ASC_CAM / (ASC_CAM - z2);
    let py = cy - y2 * sc * k, px = cx + x1 * sc * k;
    // perto das bordas do palco as partículas soltas rareiam em vez de serem cortadas numa linha reta
    const over = Math.max(edgeT - py, py - edgeB, edgeL - px, px - edgeR);
    if (over > 0) {
      if (rn[i] < over / (4 * ASC_CELL)) continue;
      py = clamp(py, edgeT - 2 * ASC_CELL * Math.tanh((edgeT - py) / (2 * ASC_CELL)), edgeB + 2 * ASC_CELL * Math.tanh((py - edgeB) / (2 * ASC_CELL)));
      px = clamp(px, edgeL - 2 * ASC_CELL, edgeR + 2 * ASC_CELL);
    }
    const c = Math.floor(px / ASC_CELL), r = Math.floor(py / ASC_CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    const id = r * cols + c;
    const flying = (fly && m > 0.45) || fin;
    if (soft && !flying) { if (z2 > szb[id]) { szb[id] = z2; sval[id] = al; } continue; }
    if (z2 <= zb[id]) continue;
    zb[id] = z2;
    if (flying) { kd[id] = 3; gl[id] = ASC_FLY[((Math.imul(i + 1, 2246822519) ^ flick) >>> 28) & 7]; continue; }
    // luz: normal girada, virada para a câmera (superfícies finas valem dos dois lados)
    const n1x = nx * cyA + nz * syA, n1z = -nx * syA + nz * cyA;
    let ny2 = ny * ct - n1z * st, nz2 = ny * st + n1z * ct, nx2 = n1x;
    const nl = Math.hypot(nx2, ny2, nz2) || 1;
    nx2 /= nl; ny2 /= nl; nz2 /= nl;
    if (nz2 < 0) { nx2 = -nx2; ny2 = -ny2; nz2 = -nz2; }
    const lum = Math.max(0, nx2 * Lx + ny2 * Ly + nz2 * Lz);
    // tinta = albedo, sombreado pela luz (lf = quanto a luz pesa nesta forma) e reforçado nas bordas da silhueta
    val[id] = al * (1 - lf * lum) + 0.16 * (1 - nz2) * al;
    kd[id] = 1;
  }
  // vidro e superfícies "macias": só aparecem onde não há nada sólido
  for (let id = 0; id < cols * rows; id++) if (!kd[id] && szb[id] > -1e8) { kd[id] = 2; val[id] = sval[id]; zb[id] = szb[id]; }
  // furinhos entre pontos: célula vazia (ou só de vidro) cercada de células sólidas vira a média delas
  const neighbors = [0, 0, 0, 0];
  for (let pass = 0; pass < 2; pass++) {
    const mark = pass ? 6 : 4;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      const id = r * cols + c;
      if (kd[id] && kd[id] !== 2) continue;
      let n = 0, sv = 0, sz = -1e9;
      neighbors[0] = id - 1; neighbors[1] = id + 1; neighbors[2] = id - cols; neighbors[3] = id + cols;
      for (let i = 0; i < 4; i++) {
        const q = neighbors[i];
        const kq = kd[q];
        if (kq === 1 || (pass && kq === 4)) { n++; sv += val[q]; if (zb[q] > sz) sz = zb[q]; }
      }
      if (n >= 3 || (n === 2 && ((kd[id - 1] === 1 && kd[id + 1] === 1) || (kd[id - cols] === 1 && kd[id + cols] === 1)))) { kd[id] = mark; val[id] = sv / n; zb[id] = sz; }
    }
  }
  // ---- desenho
  const ctx = S.ctx, at = S.atlas, T = at.T, dpr = S.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
  for (let r = 0; r < rows; r++) {
    const dy = Math.round((r * ASC_CELL - S.sy) * dpr);
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c, k = kd[id];
      if (!k) continue;
      const b = ASC_BAYER[(r & 3) * 4 + (c & 3)];
      let g, tone;
      if (k === 3) { g = gl[id]; tone = 1 + (b > 0.5 ? 1 : 0); }
      else {
        const lv = clamp(Math.floor(val[id] * 5.6 + b), k === 2 ? 0 : 1, 5);
        if (k === 2 && lv === 0) continue;
        g = lv === 1 ? 0 : lv === 2 ? 1 : lv === 3 ? 2 + ((r + c) & 1) : lv;
        tone = k === 2 ? 3 : clamp(Math.floor(clamp((0.5 - zb[id]) / 1.3, 0, 1) * 2 + b), 0, 2);
      }
      ctx.drawImage(at.cv, g * T, tone * T, T, T, Math.round((c * ASC_CELL - S.sx) * dpr), dy, T, T);
    }
  }
}

function mountAscii(root) {
  const els = Array.from(root.querySelectorAll('[data-sk-ascii]'));
  if (!els.length || typeof IntersectionObserver === 'undefined') return { stages: [], destroy() {} };
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = (() => { try { return window.sessionStorage; } catch (e) { return { getItem() { return null; }, setItem() {} }; } })();
  const stages = els.map(el => ascStage(el, store, reduce));
  const stageOf = new Map(stages.map(S => [S.el, S]));
  const active = new Set();
  const sampler = ascSampler();
  const scroller = root.closest?.('[data-sk-scroller]') || root.querySelector('[data-sk-scroller]');
  let raf = 0, last = 0, dead = false, running = !document.hidden;
  let epoch = Number(store.getItem('sk-ascii-epoch')) || 0;

  const schedule = () => {
    if (!dead && !reduce && running && active.size && !raf) raf = requestAnimationFrame(loop);
  };
  const refresh = S => {
    if (dead || !S.shapes || !S.visible) { active.delete(S); return; }
    if (reduce) draw(S, 0);
    else { active.add(S); schedule(); }
  };
  // A margem expande o próprio scroller. Com a janela como raiz, o scroller cortava a pré-carga.
  const preload = new IntersectionObserver(entries => {
    for (const en of entries) {
      const S = stageOf.get(en.target);
      if (!en.isIntersecting || S.shapes || S.building || S.failed || dead) continue;
      if (S.dirty) ascLayout(S);
      ascBuild(S, sampler).then(() => refresh(S)).catch(err => {
        S.failed = true; S.building = false;
        if (!dead) console.warn('[ascii]', S.slug, err);
      });
    }
  }, { root: scroller, rootMargin: '400px 0px' });
  const visibility = new IntersectionObserver(entries => {
    for (const en of entries) {
      const S = stageOf.get(en.target);
      S.visible = en.isIntersecting;
      refresh(S);
    }
  }, { root: scroller });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(entries => {
    for (const en of entries) {
      const S = stageOf.get(en.target);
      S.dirty = true;
      if (reduce) refresh(S);
    }
  }) : null;
  const hovers = [];
  stages.forEach(S => {
    preload.observe(S.el); visibility.observe(S.el); if (ro) ro.observe(S.el);
    const card = S.el.closest('.sk-card');
    if (card) {
      const on = () => { S.hover = true; }, off = () => { S.hover = false; };
      card.addEventListener('pointerenter', on); card.addEventListener('pointerleave', off);
      hovers.push([card, on, off]);
    }
  });

  function draw(S, dt) {
    if (S.dirty) ascLayout(S);
    const s0 = performance.now();
    S.frame++;
    ascStep(S, dt);
    S.ms = S.ms * 0.9 + (performance.now() - s0) * 0.1;
  }
  function loop(now) {
    raf = 0;
    if (dead || !running || !active.size) { last = 0; return; }
    schedule();
    if (now - last < 1000 / ASC_FPS - 2) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / ASC_FPS;
    last = now;
    for (const S of active) {
      if (!epoch) { epoch = Date.now(); store.setItem('sk-ascii-epoch', String(epoch)); } // o relógio começa no 1º card visto
      S.t = (Date.now() - epoch) / 1000;
      S.intro += dt;
      draw(S, dt);
    }
  }
  const onVis = () => { running = !document.hidden; last = 0; schedule(); };
  const onHide = () => { for (const S of stages) if (S.frame) store.setItem('sk-ascii:' + S.slug, JSON.stringify({ a: S.angle, at: Date.now() })); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', onHide);

  return {
    stages,
    // quadro num instante qualquer do relógio (testes e capturas); t < 0 mostra a entrada do palco
    frameAt(i, t, angle, dt) {
      const S = stages[i]; if (!S || !S.shapes || S.building) return false;
      if (t < 0) { if (S.intro >= ASC_INTRO || S.t !== 0) S.ord0 = null; S.t = 0; S.intro = ASC_INTRO + t; } else { S.t = t; S.intro = Infinity; }
      if (angle != null) S.angle = angle; draw(S, dt || 0); return true;
    },
    get stats() { return stages.map(S => ({ slug: S.slug, N: S.N, cols: S.cols, rows: S.rows, ms: +S.ms.toFixed(2) })); },
    destroy() {
      dead = true; cancelAnimationFrame(raf); preload.disconnect(); visibility.disconnect(); if (ro) ro.disconnect();
      sampler.destroy(); active.clear();
      hovers.forEach(([c, on, off]) => { c.removeEventListener('pointerenter', on); c.removeEventListener('pointerleave', off); });
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide);
    },
  };
}
