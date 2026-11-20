// ------------------------------------------------------------------ formas de cada projeto (para ascii.js)
// Cada projeto lista as formas do loop e o tipo de troca entre elas. Tudo é gerado aqui, em código, menos o
// microfone RCA 44 e o tsuru, que vêm dos modelos do news_portal (assets/ascii/*.glb), e a Terra, que usa a
// mesma máscara de continentes do site da Komuniki. Medidas em unidades livres: ascShape() normaliza.
//   scatter: desfaz de cima para baixo · wave: em ondas a partir de um ponto (o sinal do microfone)
//   contain: explode mas bate numa esfera e volta · seq / drop: ilha por ilha, na ordem do anel
//   sync: os jogadores entram em fase · implode: tudo colapsa no centro e cresce como a forma nova

// ---- campos de distância (SDF)
const sdRoundBox = (x, y, z, bx, by, bz, r) => {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};
const sdCylAx = (u, v, w, r, h) => { // cilindro com eixo em w
  const d1 = Math.hypot(u, v) - r, d2 = Math.abs(w) - h;
  return Math.min(Math.max(d1, d2), 0) + Math.hypot(Math.max(d1, 0), Math.max(d2, 0));
};
const sdCone = (x, y, z, y0, r0, y1, r1) => { // tronco de cone vertical (aproximado, basta para projetar)
  const q = Math.hypot(x, z), t = clamp((y - y0) / (y1 - y0), 0, 1), rr = r0 + (r1 - r0) * t;
  const slope = Math.cos(Math.atan((r0 - r1) / (y1 - y0)));
  return Math.max((q - rr) * slope, y0 - y, y - y1);
};
const sdSeg = (x, y, z, ax, ay, az, bx, by, bz, r) => {
  const px = x - ax, py = y - ay, pz = z - az, ux = bx - ax, uy = by - ay, uz = bz - az;
  const h = clamp((px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz), 0, 1);
  return Math.hypot(px - ux * h, py - uy * h, pz - uz * h) - r;
};
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h); };
const fract = v => v - Math.floor(v);

// ventoinha num disco: cubo, pás curvas (o vão entre elas é furo) e aro
function ascFanAlb(axis, c, R, blades) {
  const i = ascAx[axis], u = (i + 1) % 3, v = (i + 2) % 3;
  return (x, y, z) => {
    const p = [x, y, z], du = p[u] - c[u], dv = p[v] - c[v], r = Math.hypot(du, dv) / R;
    if (r < 0.32) return r < 0.24 ? 1 : 0.4;
    if (r > 0.9) return 1;
    return fract(Math.atan2(dv, du) / (Math.PI * 2) * blades + r * 0.6) < 0.55 ? 0.38 : -1;
  };
}
function ascPoly(m, poly, z) { // polígono convexo em z (leque a partir do centro)
  const n = poly.length, cx = poly.reduce((s, p) => s + p[0], 0) / n, cy = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let k = 0; k < n; k++) m.tri([cx, cy, z], [poly[k][0], poly[k][1], z], [poly[(k + 1) % n][0], poly[(k + 1) % n][1], z]);
}

async function ascGLB(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ' → ' + res.status);
  const buf = await res.arrayBuffer(), dv = new DataView(buf);
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
  const bin = 20 + jl + 8, tris = [];
  for (const mesh of json.meshes) for (const prim of mesh.primitives) {
    const pa = json.accessors[prim.attributes.POSITION], pv = json.bufferViews[pa.bufferView];
    const po = bin + (pv.byteOffset || 0) + (pa.byteOffset || 0);
    const P = new Float32Array(buf.slice(po, po + pa.count * 12));
    const ia = json.accessors[prim.indices], iv = json.bufferViews[ia.bufferView];
    const io = bin + (iv.byteOffset || 0) + (ia.byteOffset || 0);
    const I = ia.componentType === 5125 ? new Uint32Array(buf.slice(io, io + ia.count * 4)) : new Uint16Array(buf.slice(io, io + ia.count * 2));
    for (let k = 0; k < I.length; k++) tris.push(P[I[k] * 3], P[I[k] * 3 + 1], P[I[k] * 3 + 2]);
  }
  return tris;
}
function ascCentroid(B, test) {
  let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < B.alb.length; i++) {
    const px = B.pos[i * 3], py = B.pos[i * 3 + 1], pz = B.pos[i * 3 + 2];
    if (test(px, py, pz)) { x += px; y += py; z += pz; n++; }
  }
  return n ? [x / n, y / n, z / n] : [0, 0, 0];
}

// ================================================================ 01 · News Portal: microfone → Terra → tsuru
async function ascMic(env) {
  const m = ascMesh();
  // o RCA 44-BX: grade de faixas horizontais no corpo, garfo e base mais escuros
  m.part((x, y, z, nx, ny) => {
    if (y < -0.9) return 0.85;
    if (Math.abs(ny) > 0.85) return 0.7;
    return fract(y * 4.2) < 0.24 ? 1 : 0.42;
  });
  m.parts[0].tri = await ascGLB(env.src + 'rca44-geometry.glb');
  const B = ascSampleMesh(m, env.N, env.rnd);
  const top = B.pos.reduce((mx, v, i) => (i % 3 === 1 ? Math.max(mx, v) : mx), -Infinity);
  return ascShape(B, env.rnd, { view: { tilt: 0.18, spin: 0.55, light: 0.35, face: 0 }, origin: ascCentroid(B, (x, y) => y > top * 0.35) });
}

let ascLandMask = null;
async function ascEarth(env) {
  if (!ascLandMask) {
    const res = await fetch(env.src + 'land-mask-640x320.bin');
    if (!res.ok) throw new Error('land-mask → ' + res.status);
    ascLandMask = new Uint8Array(await res.arrayBuffer());
  }
  const LW = 640, LH = 320, M = ascLandMask, N = env.N, B = ascBuffers(N), GA = Math.PI * (3 - Math.sqrt(5));
  const jit = 0.55 * Math.sqrt(4 * Math.PI / N);
  for (let k = 0; k < N; k++) {
    let y = 1 - (k + 0.5) / N * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    let x = Math.cos(GA * k) * ring, z = Math.sin(GA * k) * ring;
    x += (env.rnd() - 0.5) * jit; y += (env.rnd() - 0.5) * jit; z += (env.rnd() - 0.5) * jit;
    const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
    // mesma leitura do news_portal: equirretangular, 1 bit por pixel, MSB primeiro, Greenwich virado para a câmera
    const lon = Math.atan2(x, z), lat = Math.asin(clamp(y, -1, 1));
    const px = Math.min(LW - 1, ((lon / (Math.PI * 2) + 0.5) * LW) | 0), py = Math.min(LH - 1, ((0.5 - lat / Math.PI) * LH) | 0);
    const bit = py * LW + px, land = (M[bit >> 3] >> (7 - (bit & 7))) & 1;
    B.pos[k * 3] = x; B.pos[k * 3 + 1] = y; B.pos[k * 3 + 2] = z;
    B.nrm[k * 3] = x; B.nrm[k * 3 + 1] = y; B.nrm[k * 3 + 2] = z;
    B.alb[k] = land ? 1 : (Math.abs(fract(lat * 6 / Math.PI) - 0.5) > 0.46 ? 0.45 : 0.2);
    B.grp[k] = 0;
  }
  // a Terra gira no próprio eixo, inclinado 23°; a câmera quase não gira
  return ascShape(B, env.rnd, { view: { tilt: 0.12, spin: 0.08, light: 0.4 }, groups: [{ c: [0, 0, 0], pose: t => [t * 0.55, 0.41] }] });
}

async function ascTsuru(env) {
  const m = ascMesh();
  m.part((x, y, z, nx, ny, nz) => 0.55 + 0.35 * Math.abs(nx * 0.3 + nz * 0.9));
  m.parts[0].tri = await ascGLB(env.src + 'tsuru.glb');
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.42, spin: 0.5, face: 1.05 } }); // de três quartos: entre as asas abertas e o perfil
}

// ================================================================ 02 · Local AI Provider: gabinete → placa de vídeo → cadeado
function ascCase(env) {
  const m = ascMesh(), W = 0.46, H = 1, Dp = 0.96, x0 = -W / 2, x1 = W / 2, y0 = -H / 2, y1 = H / 2, z0 = -Dp / 2, z1 = Dp / 2;
  // casca: tampa, fundo, frente com dois filetes de luz e o botão, lateral fechada, traseira
  ascPanel(m, 'y', y1, z0, z1, x0, x1, (x, y, z) => Math.abs(x) < 0.14 && z > -0.3 && z < 0.28 ? 0.75 : 0.45);
  ascPanel(m, 'y', y0, z0, z1, x0, x1, 0.5);
  ascPanel(m, 'z', z1, x0, x1, y0, y1, (x, y) => (Math.abs(Math.abs(x) - 0.17) < 0.016 || Math.hypot(x, y - 0.43) < 0.03 ? 1 : 0.42), { w: 1.2 });
  ascPanel(m, 'x', x1, y0, y1, z0, z1, 0.45);
  ascPanel(m, 'z', z0, x0, x1, y0, y1, (x, y) => {
    if (x > 0.06 && x < 0.18 && y > 0.12 && y < 0.42) return 1;                         // espelho de I/O
    const re = Math.hypot(x + 0.05, y - 0.28);
    if (re < 0.1) return re > 0.085 || re < 0.03 ? 1 : (fract(Math.atan2(y - 0.28, x + 0.05) / (Math.PI * 2) * 5 + re * 6) < 0.5 ? 0.6 : -1);
    if (x > -0.17 && x < 0.19 && y > -0.3 && y < 0.02) return fract((y + 0.3) / 0.064) < 0.7 ? 1 : 0.3; // slots PCIe
    const rp = Math.hypot(x, y + 0.41);
    if (rp < 0.07) return rp > 0.055 ? 1 : -1;                                          // fonte
    return 0.45;
  });
  // lateral de vidro: pontos "macios", que não escondem o que está dentro, com moldura escura
  m.part(0.2, { soft: true, w: 0.3 }); ascRect(m, 'x', x0, y0 + 0.025, y1 - 0.025, z0 + 0.025, z1 - 0.025);
  m.part(1);
  ascRect(m, 'x', x0, y1 - 0.025, y1, z0, z1); ascRect(m, 'x', x0, y0, y0 + 0.025, z0, z1);
  ascRect(m, 'x', x0, y0, y1, z1 - 0.025, z1); ascRect(m, 'x', x0, y0, y1, z0, z0 + 0.025);
  m.part(1); for (const fx of [-0.15, 0.15]) for (const fz of [-0.38, 0.38]) ascBox(m, fx, y0 - 0.025, fz, 0.07, 0.05, 0.1);
  // por dentro: placa-mãe, cooler de torre, memórias, placa de vídeo, tampa da fonte e as ventoinhas
  ascPanel(m, 'x', 0.2, -0.3, 0.46, -0.46, 0.22, 0.35, { edge: 0.015 });
  m.part((x, y) => fract((y - 0.12) / 0.065) < 0.75 ? 1 : 0.3); ascBox(m, 0.09, 0.25, -0.2, 0.2, 0.26, 0.09);
  m.part(1); for (let k = 0; k < 4; k++) ascBox(m, 0.165, 0.25, -0.03 + k * 0.03, 0.07, 0.3, 0.012);
  m.part(0.95); ascBox(m, 0.055, -0.1, -0.13, 0.29, 0.11, 0.66, 'y');
  for (const fz of [-0.36, -0.13, 0.1]) { const c = [0.055, -0.157, fz]; m.part(ascFanAlb('y', c, 0.1, 5)); ascDisk(m, 'y', c, 0.1, 28); }
  m.part((x, y, z, nx) => Math.abs(nx) > 0.7 && Math.abs(z) < 0.32 && fract(z / 0.08) < 0.5 ? 0.9 : 0.4); ascBox(m, 0, -0.41, 0, 0.44, 0.18, 0.94);
  for (const fy of [0.3, 0.07, -0.16]) { const c = [0, fy, 0.44]; m.part(ascFanAlb('z', c, 0.1, 5)); ascDisk(m, 'z', c, 0.1, 28); }
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.28, spin: 0.5, light: 0.45, face: 1.35 } }); // frente = lateral de vidro (componentes à mostra), puxando para a frente do gabinete, nunca para a traseira
}

function ascGpu(env) {
  const m = ascMesh(), L0 = -0.86, L1 = 0.9, Y0 = -0.32, Y1 = 0.32, Z0 = -0.15, Z1 = 0.15;
  const fans = [-0.56, 0, 0.56];
  const fanD = (x, y) => Math.min(...fans.map(f => Math.hypot(x - f, y)));
  // carenagem: três aberturas com aro, vincos diagonais largos entre elas
  ascPanel(m, 'z', Z1, L0, L1, Y0, Y1, (x, y) => {
    const d = fanD(x, y);
    if (d < 0.25) return -1;
    if (d < 0.285) return 1;
    if (fract((x * 1.6 - y + 0.15) / 0.56) < 0.1 && Math.abs(y) < 0.26) return 0.95;
    return 0.42;
  }, { w: 1.3, edge: 0.03 });
  // ventoinhas: pás claras sobre o dissipador escuro
  for (const f of fans) { const c = [f, 0, 0.1]; m.part(ascFanAlb('z', c, 0.245, 7)); ascDisk(m, 'z', c, 0.245, 40); }
  m.part(1, { w: 0.6 }); ascRect(m, 'z', 0.04, L0 + 0.03, L1 - 0.03, Y0 + 0.04, Y1 - 0.04);
  ascPanel(m, 'y', Y1, Z0, Z1, L0, L1, (x, y, z) => Math.abs(z - 0.07) < 0.025 && Math.abs(x) < 0.45 ? 1 : 0.45); // faixa de luz
  ascPanel(m, 'y', Y0, Z0, Z1, L0, L1, (x) => fract(x / 0.09) < 0.5 ? 0.9 : 0.4);                                    // aletas
  ascPanel(m, 'x', L1, Y0, Y1, Z0, Z1, 0.5);
  // backplate com a grade de ventilação na ponta
  ascPanel(m, 'z', Z0, L0, L1, Y0, Y1, (x, y) => (x > 0.4 && x < 0.85 && Math.abs(y) < 0.2 ? (fract(x / 0.075) < 0.5 ? 1 : -1) : 0.4), { edge: 0.03 });
  // espelho PCIe com três saídas, contatos dourados e conector de energia
  m.part((x, y, z) => (Math.abs(z) < 0.07 && ((y > -0.25 && y < -0.15) || (y > -0.1 && y < 0) || (y > 0.05 && y < 0.15))) ? -1 : 1);
  ascRect(m, 'x', L0 - 0.01, Y0 - 0.07, Y1 + 0.04, Z0 - 0.02, Z1 + 0.02);
  m.part((x) => fract(x / 0.03) < 0.6 ? 1 : -1); ascRect(m, 'z', 0, -0.6, 0.1, Y0 - 0.06, Y0);
  m.part(1); ascBox(m, 0.38, Y1 + 0.035, 0.02, 0.13, 0.07, 0.07);
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.3, spin: 0.55, light: 0.45, face: 0 } });
}

function ascLockSamples(N, rnd, _params, pause) {
  const body = (x, y, z) => sdRoundBox(x, y + 0.2, z, 0.4, 0.3, 0.15, 0.07);
  const shackle = (x, y, z) => {
    const qy = y - 0.1, R = 0.27, r = 0.062;
    if (qy >= 0) return Math.hypot(Math.hypot(x, qy) - R, z) - r;
    return Math.hypot(Math.abs(x) - R, qy - clamp(qy, -0.32, 0), z) - r;
  };
  const sdf = (x, y, z) => Math.min(body(x, y, z), shackle(x, y, z));
  const alb = (x, y, z, nx, ny, nz) => {
    if (shackle(x, y, z) < body(x, y, z)) return fract(Math.atan2(y - 0.1, x) * 3) < 0.08 ? 0.9 : 0.5;
    if (Math.abs(nz) > 0.6) { // fechadura e frisos nas duas faces
      if (Math.hypot(x, y + 0.15) < 0.058 || (y < -0.15 && y > -0.34 && Math.abs(x) < 0.022 + (-0.15 - y) * 0.13)) return 1;
      if (fract((y + 0.5) * 14) < 0.13 && Math.abs(x) < 0.34 && (y > -0.04 || y < -0.38)) return 0.9;
      return 0.4;
    }
    return 0.58;
  };
  return ascSampleSDF(sdf, [-0.5, -0.56, -0.24, 0.5, 0.42, 0.24], N, rnd, alb, null, pause);
}

async function ascLock(env) {
  return ascShape(await env.sample('lock', env.N), env.rnd, { view: { tilt: 0.22, spin: 0.6, face: 0 } });
}

// ================================================================ 03 · XGB: monitor com a barra → controle → símbolos
function ascMonitor(env) {
  const m = ascMesh(), X0 = -0.85, X1 = 0.85, Y0 = -0.37, Y1 = 0.61, Zf = 0.03;
  // tela: um jogo (horizonte) com a barra por cima, à esquerda: trilho de ícones + painel com blocos
  m.part((x, y) => {
    const e = Math.min(x - X0, X1 - x, Y1 - y, y - Y0 - 0.02);
    if (e < 0.028) return 0.95;
    if (x < -0.74) return fract((y - 0.5) / 0.12) < 0.45 && Math.abs(x + 0.785) < 0.025 ? 1 : 0.12;
    if (x < -0.4) {
      const tx = x + 0.72, ty = 0.52 - y, cxk = Math.floor(tx / 0.155), ryk = Math.floor(ty / 0.21);
      if (ryk >= 0 && ryk < 4 && cxk >= 0 && cxk < 2 && fract(tx / 0.155) < 0.84 && fract(ty / 0.21) < 0.78) return ryk === 0 && cxk === 0 ? 1 : 0.72;
      return 0.06;
    }
    if (Math.abs(x + 0.4) < 0.006) return 0.9;
    const hz = 0.02 + 0.1 * Math.sin(x * 3.1 + 1) + 0.045 * Math.sin(x * 9.3);
    if (y < hz) return 0.62 + 0.25 * (fract((x + y) * 18) < 0.3 ? 1 : 0);
    return Math.hypot(x - 0.42, y - 0.36) < 0.08 ? 0.85 : 0.22;
  }, { w: 1.5 });
  ascRect(m, 'z', Zf, X0, X1, Y0, Y1);
  m.part(0.55); ascRect(m, 'z', -Zf, X0, X1, Y0, Y1);
  m.part(0.85); ascRect(m, 'y', Y1, -Zf, Zf, X0, X1); ascRect(m, 'y', Y0, -Zf, Zf, X0, X1); ascRect(m, 'x', X0, Y0, Y1, -Zf, Zf); ascRect(m, 'x', X1, Y0, Y1, -Zf, Zf);
  m.part((x, y) => Math.floor(y * 40) & 1 ? 0.85 : 0.5); ascBox(m, 0, 0.12, -0.07, 0.38, 0.3, 0.08, 'Z');
  m.part(0.7); ascBox(m, 0, -0.47, -0.08, 0.09, 0.22, 0.05);
  m.part((x, y, z) => Math.abs(Math.hypot(x, z + 0.06) - 0.2) < 0.02 ? 1 : 0.6); ascBox(m, 0, -0.6, -0.06, 0.62, 0.035, 0.32);
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.16, spin: 0.45, face: 0.26 } });
}

// prisma facetado: polígono convexo [x, y] entre z0 e z1, com as arestas chanfradas (frente e verso recuados em
// `d`, a faixa do chanfro com profundidade `b`). Cada faceta é plana: a luz bate diferente em cada uma.
function ascInset(poly, d) {
  let area = 0;
  for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const P = area < 0 ? poly.slice().reverse() : poly, n = P.length;
  return P.map((p, k) => {
    const a = P[(k + n - 1) % n], c = P[(k + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [c[0] - p[0], c[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    const n1 = [-e1[1] / l1, e1[0] / l1], n2 = [-e2[1] / l2, e2[0] / l2], k2 = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    return [p[0] + d * (n1[0] + n2[0]) / k2, p[1] + d * (n1[1] + n2[1]) / k2];
  });
}
function ascBevel(m, poly, z0, z1, b, d) {
  let area = 0;
  for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const out = area < 0 ? poly.slice().reverse() : poly, inn = ascInset(out, d), n = out.length;
  const L = [[inn, z0], [out, z0 + b], [out, z1 - b], [inn, z1]];
  ascPoly(m, inn, z0); ascPoly(m, inn, z1);
  for (let l = 0; l < 3; l++) for (let k = 0; k < n; k++) {
    const [A, za] = L[l], [B, zb] = L[l + 1], k1 = (k + 1) % n;
    m.quad([A[k][0], A[k][1], za], [A[k1][0], A[k1][1], za], [B[k1][0], B[k1][1], zb], [B[k][0], B[k][1], zb]);
  }
}
// gira pontos e normais em torno do eixo X (a > 0: o topo vem para a frente)
function ascTiltX(B, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (const A of [B.pos, B.nrm]) for (let i = 0; i < A.length; i += 3) { const y = A[i + 1], z = A[i + 2]; A[i + 1] = y * c - z * s; A[i + 2] = y * s + z * c; }
}

// controle genérico facetado e inclinado (silhueta própria, sem logo): corpo e pegas como prismas chanfrados,
// botões hexagonais, direcional em cruz, analógicos octogonais, painel central e gatilhos angulosos. Modelado de
// frente (+z) e depois deitado para trás, com a face voltada para cima, como na mão.
function ascPad(env) {
  const m = ascMesh(), Z = 0.13;
  const mir = poly => poly.map(([x, y]) => [-x, y]).reverse();
  const body = (x, y, z, nx, ny, nz) => Math.abs(nz) > 0.97 ? 0.34 : 0.78;      // face lisa, chanfros marcados
  m.part(body);
  ascBevel(m, [[-0.46, 0.3], [0.46, 0.3], [0.6, 0.14], [0.44, -0.14], [-0.44, -0.14], [-0.6, 0.14]], -Z, Z, 0.05, 0.05);
  const grip = [[-0.64, 0.16], [-0.34, 0.02], [-0.42, -0.5], [-0.6, -0.58], [-0.76, -0.4]];
  m.part(body); ascBevel(m, grip, -Z * 0.88, Z * 0.88, 0.045, 0.045);
  m.part(body); ascBevel(m, mir(grip), -Z * 0.88, Z * 0.88, 0.045, 0.045);
  // gatilhos no topo
  const bump = [[-0.58, 0.27], [-0.26, 0.29], [-0.26, 0.36], [-0.5, 0.36]];
  for (const P of [bump, mir(bump)]) { m.part(0.82); ascBevel(m, P, -0.09, 0.07, 0.02, 0.015); }
  // botões: quatro hexágonos em losango
  for (const [bx, by] of [[0.4, 0.22], [0.5, 0.12], [0.4, 0.02], [0.3, 0.12]]) { m.part(1); ascBevel(m, ascNgon(bx, by, 0.048, 6, Math.PI / 6), Z - 0.01, Z + 0.045, 0.012, 0.012); }
  // direcional
  m.part(1);
  ascBevel(m, [[-0.51, 0.085], [-0.29, 0.085], [-0.29, 0.155], [-0.51, 0.155]], Z - 0.01, Z + 0.035, 0.01, 0.01);
  ascBevel(m, [[-0.435, 0.01], [-0.365, 0.01], [-0.365, 0.23], [-0.435, 0.23]], Z - 0.01, Z + 0.035, 0.01, 0.01);
  // analógicos: colar, haste e topo octogonais
  for (const sx of [-0.17, 0.17]) {
    const sy = -0.04;
    m.part(0.62); ascBevel(m, ascNgon(sx, sy, 0.1, 8, Math.PI / 8), Z - 0.01, Z + 0.02, 0.008, 0.012);
    m.part(0.9); ascBevel(m, ascNgon(sx, sy, 0.042, 8, Math.PI / 8), Z + 0.02, Z + 0.06, 0.004, 0.004);
    m.part((x, y, z, nx, ny, nz) => Math.abs(nz) > 0.97 ? (Math.hypot(x - sx, y - sy) > 0.045 ? 1 : 0.5) : 0.85);
    ascBevel(m, ascNgon(sx, sy, 0.085, 8, Math.PI / 8), Z + 0.06, Z + 0.09, 0.01, 0.014);
  }
  // painel central escuro com borda clara e o botão do meio
  m.part((x, y, z, nx, ny, nz) => Math.abs(nz) > 0.97 ? 0.14 : 0.9);
  ascBevel(m, [[-0.16, 0.1], [0.16, 0.1], [0.13, 0.25], [-0.13, 0.25]], Z - 0.01, Z + 0.018, 0.008, 0.012);
  m.part(1); ascBevel(m, ascNgon(0, 0.02, 0.032, 8, Math.PI / 8), Z - 0.01, Z + 0.02, 0.006, 0.006);
  const B = ascSampleMesh(m, env.N, env.rnd), lean = -0.55;
  ascTiltX(B, lean);
  const o = [0.4, 0.12, Z + 0.03], c = Math.cos(lean), s = Math.sin(lean);
  return ascShape(B, env.rnd, { view: { tilt: 0.22, spin: 0.5, face: 0, sway: 0.4, light: 0.25 }, origin: [o[0], o[1] * c - o[2] * s, o[1] * s + o[2] * c] });
}

// os quatro símbolos dos botões, cada um balançando no seu eixo e fora de fase (sem dar a volta: ficam legíveis)
function ascSymbols(env) {
  const m = ascMesh(), R = 0.25, st = 0.065, d = 0.05;
  const C = [[0, 0.44], [0.44, 0], [0, -0.44], [-0.44, 0]];
  const face = (x, y, z, nx, ny, nz) => Math.abs(nz) > 0.7 ? 0.85 : 0.55;
  // triângulo
  m.part(face, { grp: 0 });
  ascFrame(m, ascNgon(C[0][0], C[0][1] - 0.03, R, 3, Math.PI / 2), ascNgon(C[0][0], C[0][1] - 0.03, R - 2 * st, 3, Math.PI / 2), -d, d);
  // círculo
  m.part(face, { grp: 1 });
  ascFrame(m, ascNgon(C[1][0], C[1][1], R * 0.86, 40, 0), ascNgon(C[1][0], C[1][1], R * 0.86 - st, 40, 0), -d, d);
  // xis: duas barras cruzadas
  m.part(face, { grp: 2 });
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const L = R * 0.95, ca = Math.cos(a), sa = Math.sin(a), w = st / 2;
    const pts = [[-L, -w], [L, -w], [L, w], [-L, w]].map(([u, v]) => [C[2][0] + u * ca - v * sa, C[2][1] + u * sa + v * ca]);
    ascPrism(m, pts, -d, d);
  }
  // quadrado
  m.part(face, { grp: 3 });
  const sq = h => [[C[3][0] + h, C[3][1] + h], [C[3][0] - h, C[3][1] + h], [C[3][0] - h, C[3][1] - h], [C[3][0] + h, C[3][1] - h]];
  ascFrame(m, sq(R * 0.74), sq(R * 0.74 - st), -d, d);
  const groups = C.map((c, g) => ({ c: [c[0], c[1], 0], pose: t => [0.45 * Math.sin(t * (0.9 + 0.2 * g) + g * 1.3), 0.2 * Math.sin(t * 1.3 + g), 0, 0.035 * Math.sin(t * 2 + g * 1.7)] }));
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.1, spin: 0.22, face: 0 }, groups });
}

// ================================================================ 04 · Loopia: carta de ilha → anel → outro anel
function ascCard(env) {
  const m = ascMesh(), W = 0.68, H = 1, dz = 0.018, poly = ascRoundRect(W, H, 0.06, 5);
  const edge = (x, y) => Math.min(W / 2 - Math.abs(x), H / 2 - Math.abs(y));
  m.part((x, y) => { // frente: moldura, janela da arte com a ilha, custo, título e texto
    const e = edge(x, y);
    if (e < 0.035) return 0.95;
    if (e < 0.05) return 0.2;
    if (e < 0.058) return 0.85;
    if (Math.hypot(x + 0.22, y - 0.38) < 0.05) return 1;
    if (y > -0.02 && y < 0.42 && Math.abs(x) < 0.27) {
      if (Math.min(0.27 - Math.abs(x), y + 0.02, 0.42 - y) < 0.012) return 0.9;
      const hx = x / 0.17, hy = (y - 0.24) / 0.075; // tampo da ilha (hexágono achatado)
      const hexD = Math.max(Math.abs(hy) * 0.866 + Math.abs(hx) * 0.5, Math.abs(hx));
      if (hexD < 1) return hexD > 0.82 ? 0.95 : 0.5;
      if (y < 0.2 && y > 0.04 && Math.abs(x) < 0.15 * (y - 0.04) / 0.16) return 0.82;
      return 0.08;
    }
    if (y > -0.1 && y < -0.045 && Math.abs(x) < 0.25) return 0.9;
    if (y > -0.4 && y < -0.14) { const row = Math.floor((y + 0.4) / 0.065); return fract((y + 0.4) / 0.065) < 0.42 && Math.abs(x) < (row === 0 ? 0.12 : 0.24) ? 0.62 : 0.1; }
    return 0.1;
  }, { w: 1.4 });
  ascPoly(m, poly, dz);
  m.part((x, y) => { // verso: hexágonos
    const e = edge(x, y);
    if (e < 0.03) return 0.95;
    const r = Math.hypot(x, y);
    if (Math.abs(r - 0.15) < 0.015) return 1;
    const s = 0.13, q = (2 / 3 * x) / s, rr = (-x / 3 + Math.sqrt(3) / 3 * y) / s;
    const fq = q - Math.round(q), fr = rr - Math.round(rr), fs = -fq - fr;
    return Math.max(Math.abs(fq), Math.abs(fr), Math.abs(fs)) > 0.38 ? 0.95 : 0.25;
  });
  ascPoly(m, poly, -dz);
  m.part(0.75);
  for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length]; m.quad([p[0], p[1], -dz], [q[0], q[1], -dz], [q[0], q[1], dz], [p[0], p[1], dz]); }
  return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, { view: { tilt: 0.12, spin: 0.7, face: 0, sway: 0.42 } });
}

// anel de ilhas hexagonais, irregular e sempre fechado, com o herói andando sozinho por ele (e pulando de ilha
// em ilha). Cada vez que o anel volta a aparecer, ele é gerado de novo: um mundo novo a cada partida.
function ascRingLayout(rnd) {
  const K = 7, rad = Array.from({ length: K }, () => 2.2 + rnd() * 1.7), ph = rnd() * Math.PI * 2;
  const Rf = th => { const f = ((th / (Math.PI * 2)) * K % K + K) % K, k0 = Math.floor(f), s = (1 - Math.cos((f - k0) * Math.PI)) / 2; return rad[k0] * (1 - s) + rad[(k0 + 1) % K] * s; };
  const round = (q, r) => {
    const s = -q - r; let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  };
  const dist = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[0] + a[1] - b[0] - b[1])) / 2;
  const raw = [];
  const push = h => {
    const last = raw[raw.length - 1];
    if (last) {
      const n = dist(last, h);
      if (n === 0) return;
      for (let i = 1; i < n; i++) raw.push(round(last[0] + (h[0] - last[0]) * i / n + 1e-6, last[1] + (h[1] - last[1]) * i / n + 1e-6));
    }
    raw.push(h);
  };
  for (let k = 0; k < 160; k++) {
    const th = k / 160 * Math.PI * 2 + ph, R = Rf(th) * Math.sqrt(3), x = R * Math.cos(th), z = R * Math.sin(th);
    push(round(2 / 3 * x, -x / 3 + Math.sqrt(3) / 3 * z));
  }
  // fecha o anel: as últimas amostras costumam cair na mesma célula da primeira; tira essas e liga o fim ao começo
  const kf = raw[0][0] + ',' + raw[0][1];
  while (raw.length > 1 && raw[raw.length - 1][0] + ',' + raw[raw.length - 1][1] === kf) raw.pop();
  const first = raw[0]; push(first); if (raw.length > 1 && raw[raw.length - 1] === first) raw.pop();
  const seq = [], seen = new Map();
  for (const h of raw) {
    const key = h[0] + ',' + h[1];
    if (seen.has(key)) { const j = seen.get(key); for (const g of seq.splice(j + 1)) seen.delete(g[0] + ',' + g[1]); continue; }
    seen.set(key, seq.length); seq.push(h);
  }
  return seq;
}

function ascRing(env, seed) {
  const rng = rngFrom(seed), rnd = rng.random, a = 1;
  const cells = ascRingLayout(rnd);
  const m = ascMesh(), path = [];
  const hexPts = (cx, cz, r) => Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos(k * Math.PI / 3), cz + r * Math.sin(k * Math.PI / 3)]);
  const island = (cx, cz, top, r, depth) => {
    const P = hexPts(cx, cz, r), y1 = top - 0.16 * a, ap = [cx, top - depth, cz];
    m.part((x, y, z) => { // tampo: borda marcada e "grama" salpicada
      const dx = x - cx, dz = z - cz, hd = Math.max(Math.abs(dz) * 1.1547, Math.abs(dx) * 0.5 + Math.abs(dz) * 0.5774) / r;
      return hd > 0.82 ? 0.92 : hash2(Math.floor(x * 9 + 500), Math.floor(z * 9 + 500)) < 0.22 ? 0.75 : 0.4;
    });
    for (let k = 0; k < 6; k++) m.tri([cx, top, cz], [P[k][0], top, P[k][1]], [P[(k + 1) % 6][0], top, P[(k + 1) % 6][1]]);
    m.part(0.65);
    for (let k = 0; k < 6; k++) { const p = P[k], q = P[(k + 1) % 6]; m.quad([p[0], top, p[1]], [q[0], top, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]); }
    m.part((x, y) => fract(y * 4) < 0.25 ? 0.95 : 0.7); // rocha embaixo da ilha
    for (let k = 0; k < 6; k++) { const p = P[k], q = P[(k + 1) % 6]; m.tri([p[0], y1, p[1]], [q[0], y1, q[1]], ap); }
  };
  cells.forEach(([q, r]) => {
    const cx = a * 1.5 * q, cz = a * Math.sqrt(3) * (r + q / 2), u = rnd();
    const top = u < 0.15 ? 0.45 * a : u < 0.4 ? 0.2 * a : 0;
    island(cx, cz, top, 0.84 * a, (0.55 + rnd() * 0.5) * a);
    path.push([cx, top, cz]);
    const v = rnd();
    if (v < 0.22) { // árvore
      const ox = cx + (rnd() - 0.5) * 0.4 * a, oz = cz + (rnd() - 0.5) * 0.4 * a;
      m.part(0.85); ascCyl(m, 'y', [ox, top + 0.1 * a, oz], 0.06 * a, 0.06 * a, 0.2 * a, 8, 0);
      m.part(0.95); ascCyl(m, 'y', [ox, top + 0.45 * a, oz], 0.3 * a, 0.01, 0.5 * a, 14, 1);
    } else if (v < 0.32) { // torre
      m.part((x, y) => fract(y * 9) < 0.2 ? 1 : 0.6); ascCyl(m, 'y', [cx, top + 0.3 * a, cz], 0.17 * a, 0.15 * a, 0.6 * a, 14, 0);
      m.part(0.95); ascCyl(m, 'y', [cx, top + 0.72 * a, cz], 0.25 * a, 0.01, 0.26 * a, 14, 1);
    }
  });
  // no meio, a ilha do chefe com um obelisco
  island(0, 0, -0.1 * a, 1.55 * a, 1.3 * a);
  m.part(1); ascCyl(m, 'y', [0, 0.7 * a, 0], 0.34 * a, 0.02 * a, 1.6 * a, 4, 1);
  const Nh = Math.max(80, Math.round(env.N * 0.035));
  const Bw = ascSampleMesh(m, env.N - Nh, rnd);
  // Lucca: corpo e cabeça, no grupo 0, que anda pelo caminho
  const h = ascMesh(), p0 = path[0];
  h.part(1, { grp: 0 }); ascCyl(h, 'y', [p0[0], p0[1] + 0.25 * a, p0[2]], 0.17 * a, 0.12 * a, 0.36 * a, 12, 3);
  h.part(0.85, { grp: 0 }); ascSphere(h, [p0[0], p0[1] + 0.58 * a, p0[2]], 0.15 * a, 8);
  const B = ascConcat([Bw, ascSampleMesh(h, Nh, rnd)]);
  const ref = { path: null };
  const pose = t => {
    const P = ref.path, n = P.length, s = t * 0.9, i = Math.floor(s) % n, f = s - Math.floor(s);
    const A = P[i], Bq = P[(i + 1) % n], e = f < 0.5 ? 0 : (f - 0.5) * 2, hop = Math.sin(Math.PI * e) * 0.06;
    const x = A[0] + (Bq[0] - A[0]) * e, y = A[1] + (Bq[1] - A[1]) * e + hop, z = A[2] + (Bq[2] - A[2]) * e;
    return [Math.atan2(Bq[0] - A[0], Bq[2] - A[2]), 0, x - P[0][0], y - P[0][1], z - P[0][2]];
  };
  return ascShape(B, rnd, {
    view: { tilt: 0.62, spin: 0.2, scale: 1.05 },
    groups: [{ c: p0, pose }],
    after(sh, tf) { ref.path = path.map(tf); },
  });
}
function ascRingMaker(env) {
  let seed = (env.rnd() * 4294967296) >>> 0;
  return () => {
    const sh = ascRing(env, seed++);
    sh.regen = s => { const fresh = ascRing(env, seed++); Object.assign(s, fresh, { trans: s.trans, regen: s.regen }); };
    return sh;
  };
}

// ================================================================ 05 · ExoBeast: jogadores → rede com o host → torre
function ascPawnSDF(x, y, z) {
  const head = Math.hypot(x, y - 0.26, z) - 0.1;
  const collar = Math.hypot(Math.hypot(x, z) - 0.07, y - 0.155) - 0.022;
  const body = sdCone(x, y, z, -0.13, 0.15, 0.15, 0.06);
  const base = sdCylAx(x, z, y + 0.16, 0.17, 0.035) - 0.01;
  return smin(smin(head, collar, 0.03), smin(body, base, 0.04), 0.03);
}
function ascPawnAlb(x, y, z) {
  if (y > 0.2) return z > 0.045 && Math.abs(y - 0.265) < 0.03 ? 1 : 0.42; // visor: dá para ver para onde cada um olha
  if (y < -0.11) return fract(Math.hypot(x, z) * 30) < 0.3 ? 0.95 : 0.7;
  if (z > 0.04 && Math.abs(x) + Math.abs(y - 0.02) < 0.045) return 1;
  return 0.52;
}
function ascPawnSamples(N, rnd, C, pause) {
  const near = (x, y, z) => { let b = 0, bd = Infinity; C.forEach((c, i) => { const d = Math.hypot(x - c[0], y - c[1], z - c[2]); if (d < bd) { bd = d; b = i; } }); return b; };
  const sdf = (x, y, z) => { let d = Infinity; for (const c of C) d = Math.min(d, ascPawnSDF(x - c[0], y - c[1], z - c[2])); return d; };
  const xs = C.map(c => c[0]), ys = C.map(c => c[1]), zs = C.map(c => c[2]);
  const box = [Math.min(...xs) - 0.22, Math.min(...ys) - 0.24, Math.min(...zs) - 0.22, Math.max(...xs) + 0.22, Math.max(...ys) + 0.4, Math.max(...zs) + 0.22];
  return ascSampleSDF(sdf, box, N, rnd, (x, y, z) => { const c = C[near(x, y, z)]; return ascPawnAlb(x - c[0], y - c[1], z - c[2]); }, near, pause);
}
async function ascPawns(env, C, N, poseFor) {
  const B = await env.sample('pawns', N, C);
  return { B, groups: C.map((c, g) => ({ c, pose: t => poseFor(g, t) })) };
}
async function ascPlayers(env) {
  const C = [[-0.62, 0, 0.2], [0.6, 0.06, 0.25], [0.04, -0.03, -0.58], [0.05, 0.08, 0.5]];
  // cada um gira e balança no seu ritmo: ninguém está na mesma partida ainda
  const { B, groups } = await ascPawns(env, C, env.N, (g, t) => [t * (0.55 + 0.42 * g) + g * 1.9, 0.2 * Math.sin(t * (1.2 + 0.3 * g) + g * 2), 0, 0.05 * Math.sin(t * (1.6 + 0.35 * g) + g)]);
  return ascShape(B, env.rnd, { view: { tilt: 0.34, spin: 0.3 }, groups });
}
async function ascNet(env) {
  const N = env.N, R = 0.86, C = [0, 1, 2, 3].map(k => { const a = Math.PI / 4 + k * Math.PI / 2; return [R * Math.cos(a), -0.2, R * Math.sin(a)]; });
  // em sincronia: todos giram e balançam juntos, com o host como autoridade no meio
  const P = await ascPawns(env, C, Math.round(N * 0.6), (g, t) => [t * 0.8, 0.08 * Math.sin(t * 1.4), 0, 0.03 * Math.sin(t * 1.6)]);
  const h = ascMesh();
  h.part((x, y, z) => {
    const lat = Math.asin(clamp(y / 0.2, -1, 1)), lon = Math.atan2(z, x);
    return fract(lat / (Math.PI / 7)) < 0.14 || fract(lon / (Math.PI / 6)) < 0.1 ? 0.95 : 0.3;
  }, { grp: 4 });
  ascSphere(h, [0, 0.02, 0], 0.2, 14);
  const Nh = Math.round(N * 0.22), Hb = ascSampleMesh(h, Nh, env.rnd);
  const l = ascMesh();
  for (const c of C) {
    const dx = c[0], dz = c[2], d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    const A = [ux * 0.2, 0.02, uz * 0.2], Bp = [c[0] - ux * 0.13, 0.0, c[2] - uz * 0.13];
    l.part(0.5, { aux: (x, y, z) => 1 + clamp(Math.hypot(x - A[0], z - A[2]) / Math.hypot(Bp[0] - A[0], Bp[2] - A[2]), 0, 1) });
    ascTube(l, A, Bp, 0.014, 6);
  }
  const Lb = ascSampleMesh(l, N - P.B.alb.length - Nh, env.rnd);
  const B = ascConcat([P.B, Hb, Lb]);
  const groups = P.groups.concat([{ c: [0, 0.02, 0], pose: t => [t * 0.35, 0] }]);
  // pacotes de dados correndo pelos cabos, do host para cada jogador
  const albAnim = (a, aux, t) => (aux > 0 ? (fract((aux - 1) * 3 - t * 1.3) < 0.28 ? 1 : 0.3) : a);
  return ascShape(B, env.rnd, { view: { tilt: 0.55, spin: 0.25 }, groups, albAnim });
}
function ascTowerSamples(N, rnd, _params, pause) {
  const parts = (x, y, z) => ({
    base: Math.min(sdCylAx(x, z, y + 0.5, 0.42, 0.05) - 0.01, sdCylAx(x, z, y + 0.42, 0.34, 0.035) - 0.01),
    body: sdCone(x, y, z, -0.39, 0.27, 0.1, 0.2),
    ring: sdCylAx(x, z, y - 0.14, 0.24, 0.035) - 0.01,
    head: sdRoundBox(x, y - 0.29, z + 0.02, 0.2, 0.1, 0.17, 0.03),
    gun: Math.min(sdSeg(Math.abs(x) - 0.075, y - 0.29, z, 0, 0, 0.12, 0, 0, 0.56, 0.038), sdCylAx(Math.abs(x) - 0.075, y - 0.29, z - 0.53, 0.052, 0.03)),
    ant: Math.min(sdSeg(x, y, z, 0.12, 0.38, -0.1, 0.12, 0.6, -0.1, 0.012), Math.hypot(x - 0.12, y - 0.61, z + 0.1) - 0.03),
  });
  const sdf = (x, y, z) => { const p = parts(x, y, z); return Math.min(p.base, p.body, p.ring, p.head, p.gun, p.ant); };
  const alb = (x, y, z) => {
    const p = parts(x, y, z), d = Math.min(p.base, p.body, p.ring, p.head, p.gun, p.ant);
    if (p.gun === d || p.ant === d) return 0.92;
    if (p.head === d) return z > 0.12 && Math.abs(y - 0.31) < 0.022 ? 1 : 0.58;
    if (p.ring === d) return 0.9;
    if (p.base === d) return fract(Math.atan2(z, x) / (Math.PI * 2) * 16) < 0.12 ? 1 : 0.72;
    if (Math.abs(y + 0.15) < 0.016) return 1;
    return fract(Math.atan2(z, x) / (Math.PI * 2) * 10) < 0.07 ? 0.95 : 0.45;
  };
  return ascSampleSDF(sdf, [-0.5, -0.58, -0.5, 0.5, 0.66, 0.62], N, rnd, alb, null, pause);
}
async function ascTower(env) {
  return ascShape(await env.sample('tower', env.N), env.rnd, { view: { tilt: 0.26, spin: 0.55 } });
}

const ASC_SAMPLERS = { lock: ascLockSamples, pawns: ascPawnSamples, tower: ascTowerSamples };

// ================================================================ projeto sem formas próprias: cubo ↔ esfera
function ascCube(env) { const m = ascMesh(); m.part((x, y, z) => fract((x + y + z) * 4) < 0.2 ? 0.95 : 0.5); ascBox(m, 0, 0, 0, 1, 1, 1); return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, {}); }
function ascBall(env) { const m = ascMesh(); m.part((x, y) => fract(y * 5) < 0.15 ? 0.95 : 0.45); ascSphere(m, [0, 0, 0], 0.6, 16); return ascShape(ascSampleMesh(m, env.N, env.rnd), env.rnd, {}); }

const ASC_PROJECTS = {
  'kelly-sys': { shapes: [ascMic, ascEarth, ascTsuru], trans: ['wave', 'scatter', 'scatter'] },
  'ia-local-server': { shapes: [ascCase, ascGpu, ascLock], trans: ['contain', 'contain', 'contain'] },
  'xgb': { shapes: [ascMonitor, ascPad, ascSymbols], trans: ['scatter', 'wave', 'scatter'] },
  'loopia': { shapes: [ascCard, env => (env.ring = env.ring || ascRingMaker(env))(), env => env.ring()], trans: ['drop', 'seq', 'scatter'] },
  'exobeast': { shapes: [ascPlayers, ascNet, ascTower], trans: ['sync', 'implode', 'scatter'] },
  _: { shapes: [ascCube, ascBall, ascCube], trans: ['scatter', 'scatter', 'scatter'] },
};
