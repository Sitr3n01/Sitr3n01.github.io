// Gera dist/ a partir de src/:
//   dist/index.html      ← src/page/build_page.py (marcação + CSS)
//   dist/sakura-site.js  ← src/js/{core,engine,glass,video,ascii,ascii-forms,controller}.js num IIFE que expõe window.SakuraSite
//   dist/sakura-ascii-worker.js ← amostragem da geometria dos cards fora da thread principal
//   dist/assets/         ← cópia de src/assets/ (se existir)
//   dist/favicon.*, ...  ← cópia de src/public/ (arquivos da raiz do site)
// Uso: node scripts/build.mjs [--dc <script_url>]
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = join(ROOT, 'src');
export const DIST = join(ROOT, 'dist');

// Ordem importa: os arquivos compartilham o mesmo escopo dentro do IIFE.
const JS_PARTS = ['core.js', 'engine.js', 'glass.js', 'video.js', 'ascii.js', 'ascii-forms.js', 'controller.js'];
const WORKER_PARTS = ['core.js', 'ascii.js', 'ascii-forms.js', 'ascii-worker.js'];

const HEADER = `/*!
 * sakura-site.js — fundo de sakura em ASCII + dinâmicas de scroll do portfólio (sem dependências)
 * Uso: <script src="sakura-site.js"></script> e depois SakuraSite.mount(document.querySelector('[data-sk-root]'), { preset: 'kosa' })
 * A marcação usa atributos data-sk-* (ver MOTION.md).
 */
(function (global) {
'use strict';
`;
const FOOTER = `
global.SakuraSite = { mount, mountAscii, createSakuraBackground, PRESETS };
})(typeof window !== 'undefined' ? window : this);
`;

function python() {
  if (process.env.PYTHON) return process.env.PYTHON;
  return process.platform === 'win32' ? 'python' : 'python3';
}

export function buildJs() {
  const bundle = parts => parts.map(f => readFileSync(join(SRC, 'js', f), 'utf8').replace(/\r\n/g, '\n')).join('\n');
  writeFileSync(join(DIST, 'sakura-site.js'), HEADER + bundle(JS_PARTS) + FOOTER);
  writeFileSync(join(DIST, 'sakura-ascii-worker.js'), "'use strict';\n" + bundle(WORKER_PARTS));
}

export function buildHtml(dcUrl) {
  const args = ['-B', join(SRC, 'page', 'build_page.py'), '--out', DIST]; // -B: sem __pycache__ (não dispara o watcher)
  if (dcUrl) args.push('--dc', dcUrl);
  const r = spawnSync(python(), args, { encoding: 'utf8' });
  if (r.error) throw new Error(`não consegui rodar "${python()}" (${r.error.message}). Defina a variável PYTHON.`);
  if (r.status !== 0) throw new Error(`build_page.py falhou:\n${r.stderr || r.stdout}`);
}

export function buildAssets() {
  const from = join(SRC, 'assets');
  if (existsSync(from)) cpSync(from, join(DIST, 'assets'), { recursive: true });
  // src/public/ vai para a raiz do site: favicon e o que o navegador procura direto na raiz
  const pub = join(SRC, 'public');
  if (existsSync(pub)) cpSync(pub, DIST, { recursive: true });
}

export function build({ clean = false, dcUrl } = {}) {
  const t = performance.now();
  if (clean) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  buildHtml(dcUrl);
  buildJs();
  buildAssets();
  return Math.round(performance.now() - t);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf('--dc');
  try {
    const ms = build({ clean: true, dcUrl: i > 0 ? process.argv[i + 1] : undefined });
    console.log(`dist/ gerado em ${ms} ms`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
