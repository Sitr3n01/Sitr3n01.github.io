// Verificação rápida, sem navegador:
//   1. o build roda;
//   2. dist/sakura-site.js tem sintaxe válida e expõe SakuraSite.{mount, createSakuraBackground, PRESETS};
//   3. a marcação tem as seções e os ganchos data-sk-* que o controlador espera;
//   4. o inglês (en/) tem as mesmas páginas e a mesma estrutura do português, sem texto em português vazando;
//   5. o build é determinístico (dois builds seguidos geram os mesmos bytes).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { build, DIST } from './build.mjs';

const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const read = (f) => readFileSync(join(DIST, f), 'utf8');

build({ clean: true });
const js1 = read('sakura-site.js'), html1 = read('index.html');
const worker1 = read('sakura-ascii-worker.js');

const sandbox = {};
try {
  vm.runInNewContext(js1, { window: sandbox }, { filename: 'sakura-site.js' });
  ok(true, 'sakura-site.js carrega sem erro');
} catch (e) {
  ok(false, `sakura-site.js carrega sem erro (${e.message})`);
}
const S = sandbox.SakuraSite || {};
ok(typeof S.mount === 'function' && typeof S.createSakuraBackground === 'function', 'SakuraSite.mount e createSakuraBackground existem');
try {
  const worker = {};
  vm.runInNewContext(worker1, { self: worker }, { filename: 'sakura-ascii-worker.js' });
  ok(typeof worker.onmessage === 'function', 'worker de geometria ASCII inicializa');
} catch (e) {
  ok(false, `worker de geometria ASCII inicializa (${e.message})`);
}
ok(S.PRESETS && ['kosa', 'sanbon', 'ogi', 'itozakura', 'koeda'].every((p) => p in S.PRESETS), 'os 5 presets existem');

for (const v of ['hero', 'manifesto', 'about', 'work', 'stack', 'areas', 'path', 'me', 'contact'])
  ok(html1.includes(`data-sk-view="${v}"`), `seção data-sk-view="${v}"`);
for (const h of ['data-sk-root', 'data-sk-canvas', 'data-sk-rings', 'data-sk-hint', 'data-sk-read', 'data-sk-ui'])
  ok(html1.includes(h), `gancho ${h}`);
// rolagem do documento: sem scroller interno, com o canvas e os controles fixos (o scroller fica só no artboard --dc)
ok(html1.includes('data-sk-root="1" data-sk-doc="1"') && !html1.includes('data-sk-scroller="1"') && html1.includes('[data-sk-doc]>:is('),
  'a página rola o documento (data-sk-doc), sem scroller interno');
ok(html1.includes('height: 100lvh') && js1.includes('data-sk-scroller') && js1.includes('scrollRestoration'),
  'canvas em 100lvh e controlador com os dois modos (documento e scroller do artboard)');
// efeitos presos à rolagem: o controlador liga data-sk-timeline (e data-sk-live perto da tela) e escreve as faixas que
// o CSS usa
ok(js1.includes("setAttribute('data-sk-timeline'") && js1.includes("'data-sk-live'") && ['--off', '--w0', '--x0', '--y0'].every(v => js1.includes(v) && html1.includes(`var(${v})`)) &&
  html1.includes('[data-sk-timeline] [data-sk-live] [data-sk-word]') && html1.includes('[data-sk-timeline] [data-sk-parallax]'),
  'efeitos no compositor: data-sk-timeline, data-sk-live e as faixas --off, --w0, --x0, --y0 nos dois lados');
ok(!html1.includes('\r\n') && !js1.includes('\r\n'), 'saída só com LF');
// abertura: nada da interface aparece num quadro antes dela (data-sk-boot do <head> até a montagem), e a página não
// vaza na horizontal com as letras espalhadas (o celular afastaria o zoom e esticaria o canvas)
ok(/<head>[\s\S]*setAttribute\('data-sk-boot'[\s\S]*<\/head>/.test(html1) && html1.includes('[data-sk-boot] [data-sk-ui]') &&
  js1.includes("removeAttribute('data-sk-boot')"), 'interface escondida desde o <head> até a abertura (data-sk-boot)');
ok(html1.includes('[data-sk-doc]{overflow-x:clip}'), 'página sem vazamento horizontal na abertura (overflow-x: clip)');
// tema: o <head> escolhe antes da pintura, os dois temas definem os mesmos tokens e há botão no toolbar e no menu
{
  const vars = sel => { const m = html1.match(new RegExp(sel.replace(/[[\]"]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1].split(';').map(d => d.split(':')[0]).sort().join() : ''; };
  const light = vars(':root'), dark = vars(':root[data-theme="dark"]');
  ok(light.includes('--sk-ink-rgb') && light.includes('--sk-tones') && light === dark, 'tema claro e escuro com os mesmos tokens --sk-*');
  ok(/<head>[\s\S]*setAttribute\('data-theme',t==='dark'\?'dark':'light'\)[\s\S]*<\/head>/.test(html1) && !html1.includes('prefers-color-scheme'),
    'tema escolhido no <head>, antes da pintura: a escolha guardada ou o claro (padrão)');
  ok(/function mountTheme[\s\S]*'pageshow'/.test(js1), 'página restaurada pelo voltar/avançar segue a escolha guardada (pageshow)');
  ok((html1.match(/data-sk-theme /g) || []).length === 2 && js1.includes('[data-sk-theme]'), 'botão de tema [data-sk-theme] no toolbar e no menu');
}

// páginas de projeto: uma por card, com as seções que o controlador espera
const slugs = [...html1.matchAll(/href="projetos\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
ok(slugs.length >= 1, `${slugs.length} cards com link para página de projeto`);
const pend = [];
for (const slug of slugs) {
  let page = '';
  try { page = read(`projetos/${slug}/index.html`); } catch { /* falta */ }
  ok(page.includes('data-sk-view="proj"') && page.includes('data-sk-view="projbody"') && page.includes('data-sk-video'),
    `projetos/${slug}/ existe e tem hero, corpo e vídeo`);
  ok(page.includes('data-sk-read') && page.includes('data-sk-hint'), `projetos/${slug}/ tem paradas de leitura`);
  ok(page.includes(`view-transition-name: sk-glyph-${slug}`) && html1.includes(`view-transition-name: sk-glyph-${slug}`),
    `transição do palco ASCII de ${slug} nos dois lados`);
  ok(html1.includes(`data-sk-ascii="${slug}"`) && page.includes(`data-sk-ascii="${slug}"`) && js1.includes(`'${slug}': {`),
    `objetos em ASCII de ${slug} no card, na página e em ASC_PROJECTS`);
  if (page.includes('class="sk-video-empty"')) pend.push(`${slug}: sem vídeo (src/assets/projetos/${slug}/apresentacao.mp4)`);
  if (page.includes('class="sk-pending"')) pend.push(`${slug}: texto com [preencher]`);
}
// o endereço de cada projeto é o nome dele (content.py, slugify)
const slugOf = (t) => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const [, slug, title] of html1.matchAll(/data-sk-project="([a-z0-9-]+)"><span[^>]*>([^<]+)<\/span>/g))
  ok(slug === slugOf(title.replace(/&amp;/g, '&')), `projetos/${slug}/: endereço igual ao nome do projeto ("${title}")`);

// ---- inglês: mesma home e mesmas páginas de projeto em en/, com o seletor de idioma e hreflang nos dois lados
let htmlEn = '';
try { htmlEn = read('en/index.html'); } catch { /* falta */ }
ok(htmlEn.includes('<html lang="en">') && html1.includes('<html lang="pt-BR">'), 'home em inglês (en/) e lang certo nas duas');
for (const v of ['hero', 'manifesto', 'about', 'work', 'stack', 'areas', 'path', 'me', 'contact'])
  if (!htmlEn.includes(`data-sk-view="${v}"`)) ok(false, `en/: seção data-sk-view="${v}"`);
const slugsEn = [...htmlEn.matchAll(/href="projects\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
ok(slugsEn.join() === slugs.join(), 'en/: os mesmos cards, na mesma ordem');
const count = (h, re) => (h.match(re) || []).length;
// texto visível e atributos lidos por leitor de tela, sem CSS/JS; nomes próprios em português ficam de fora
const KEEP_PT = ['Brasília', 'Blog da Kelly', 'Português', 'Farias Souza'];
const visible = (h) => {
  const attrs = [...h.matchAll(/\s(?:aria-label|alt|title|content)="([^"]*)"/g)].map((m) => m[1]).join(' ');
  let t = h.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ') + ' ' + attrs;
  t = t.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/[\w.@/-]+\.(?:com|br|io|md)\b[\w./-]*/g, ' '); // domínios e e-mails
  for (const k of KEEP_PT) t = t.split(k).join(' ');
  return t;
};
const PT_WORDS = /[ãõçÃÕÇ]|\b(?:de|da|do|das|dos|para|com|em|não|que|uma|um|sobre|projeto|projetos|vídeo|apresentação)\b/;
const leak = (h) => {
  const m = visible(h).match(new RegExp('.{0,30}(?:' + PT_WORDS.source + ').{0,30}'));
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
};
const pages = [['', 'en/', null]].concat(slugs.map((slug) => [`projetos/${slug}/`, `en/projects/${slug}/`, slug]));
for (const [ptPath, enPath, slug] of pages) {
  let pt = '', en = '';
  try { pt = read(ptPath + 'index.html'); en = read(enPath + 'index.html'); } catch { /* falta */ }
  ok(!!en, `${enPath} existe`);
  if (!en) continue;
  const alt = (lang, path) => `hreflang="${lang}" href="https://sitr3n01.github.io/${path}"`;
  ok([pt, en].every((h) => h.includes(alt('pt-BR', ptPath)) && h.includes(alt('en', enPath)) && h.includes('class="sk-glass sk-track sk-lang"')),
    `${enPath}: seletor de idioma e hreflang nos dois idiomas`);
  if (slug) {
    ok(!en.includes('data-sk-untranslated'), `${enPath}: projeto traduzido (src/content/projetos/en/)`);
    const shape = (h) => [count(h, /class="sk-sec"/g), count(h, /class="sk-stat"/g), count(h, /<li>/g), count(h, /href="http/g)].join('/');
    ok(shape(pt) === shape(en), `${enPath}: mesma estrutura do português (seções/números/itens/links ${shape(pt)} × ${shape(en)})`);
  }
  const l = leak(en);
  ok(!l, `${enPath}: sem texto em português${l ? ` ("${l}")` : ''}`);
}

// endereços antigos (enderecos_antigos): toda pasta de projeto sem card leva a um projeto que existe
for (const [dir, list] of [['projetos', slugs], ['en/projects', slugsEn]]) {
  for (const old of readdirSync(join(DIST, dir)).filter((d) => !list.includes(d))) {
    let m = null; try { m = read(`${dir}/${old}/index.html`).match(/http-equiv="refresh" content="0; url=\.\.\/([a-z0-9-]+)\/"/); } catch { /* falta */ }
    ok(!!m && list.includes(m[1]), `${dir}/${old}/ (endereço antigo) leva a ${m ? `${dir}/${m[1]}/` : 'um projeto que existe'}`);
  }
}

for (const f of ['rca44-geometry.glb', 'tsuru.glb', 'land-mask-640x320.bin']) {
  let n = 0; try { n = readFileSync(join(DIST, 'assets', 'ascii', f)).length; } catch { /* falta */ }
  ok(n > 0, `assets/ascii/${f}`);
}

build();
ok(read('sakura-site.js') === js1 && read('sakura-ascii-worker.js') === worker1 && read('index.html') === html1 &&
  read('en/index.html') === htmlEn, 'build determinístico');

if (html1.includes('[SEU E-MAIL]')) console.log('! pendência: [SEU E-MAIL] ainda está no contato');
for (const p of pend) console.log(`! pendência: ${p}`);

if (fails.length) { console.error(`\n${fails.length} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
