// Testes de ponta a ponta no Chrome headless, sem dependências: build → servidor do dist/ → navegador de verdade.
//   1. varredura: cada página (home e projetos, nos dois idiomas) no desktop, no celular em pé e deitado, nos dois temas,
//      rolada até o fim: erros de JS, requisições com erro, âncoras e links internos quebrados, rolagem horizontal,
//      imagens, nomes acessíveis, contraste do texto e alvos de toque;
//   2. fluxos: tema, idioma, endereços antigos, vídeo, "Scroll", voltar, teclado, menu do celular, troca de layout,
//      movimento reduzido, nível C e página sem JS.
// Uso: npm run e2e [-- --quick]   (--quick: só a varredura no desktop e no celular em pé, tema claro, e os fluxos)
//   Chrome: variável CHROME, ou o instalado no lugar de sempre (ver scripts/lib/chrome.mjs).
// Falhas (✗) saem com código 1. Pendências (!) só avisam: o que falta decidir ou produzir, não um defeito do código.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, DIST } from './build.mjs';
import { findChrome, launchChrome, sleep } from './lib/chrome.mjs';
import { serve } from './lib/serve.mjs';

const quick = process.argv.includes('--quick');
const fails = [], pend = new Set();
const ok = (cond, msg, why = '') => { console.log(`${cond ? '✓' : '✗'} ${msg}${!cond && why ? ` — ${why}` : ''}`); if (!cond) fails.push(msg); };
const todo = msg => pend.add(msg);

const VIEWPORTS = {
  desktop: { w: 1440, h: 900 },
  celular: { w: 390, h: 844, dpr: 2, mobile: true },
  deitado: { w: 844, h: 390, dpr: 2, mobile: true },
};
const RUNS = quick
  ? [['desktop', 'light'], ['celular', 'light']]
  : [['desktop', 'light'], ['desktop', 'dark'], ['celular', 'light'], ['celular', 'dark'], ['deitado', 'light']];

const chrome = findChrome();
if (!chrome) { console.error('Chrome não encontrado. Defina CHROME com o caminho do executável.'); process.exit(1); }
build({ clean: true });
const { server, url: base } = await serve(DIST);
const browser = await launchChrome(chrome, { args: ['--autoplay-policy=no-user-gesture-required'] });
console.log(`dist/ em ${base}`);

// as páginas saem do próprio dist/: um projeto novo entra no teste sem mexer aqui
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const slugs = [...home.matchAll(/href="projetos\/([a-z0-9-]+)\/"/g)].map(m => m[1]);
// a ordem dos projetos (campo ordem) segue a corrente de "Próximo projeto", a partir do primeiro card
const nextOf = slug => (/class="sk-next"[^>]*href="\.\.\/([a-z0-9-]+)\/"/.exec(readFileSync(join(DIST, 'projetos', slug, 'index.html'), 'utf8')) || [])[1];
const ORDER = [slugs[0]];
while (ORDER.length <= slugs.length && nextOf(ORDER.at(-1)) !== slugs[0]) ORDER.push(nextOf(ORDER.at(-1)));
const PAGES = ['', 'en/', ...slugs.map(s => `projetos/${s}/`), ...slugs.map(s => `en/projects/${s}/`)];

// ------------------------------------------------------------------ aba com registro de erros
async function openPage(vp, { reduce = false } = {}) {
  const p = await browser.page();
  const errors = [];
  const local = url => url.startsWith(base);
  p.on('Runtime.exceptionThrown', e => errors.push(`exceção: ${e.exceptionDetails.exception?.description?.split('\n')[0] || e.exceptionDetails.text}`));
  p.on('Runtime.consoleAPICalled', e => { if (['error', 'warning', 'assert'].includes(e.type)) errors.push(`console.${e.type}: ${e.args.map(a => a.value ?? a.description).join(' ')}`); });
  p.on('Network.responseReceived', e => {
    const { status, url } = e.response;
    if (status < 400) return;
    if (local(url) && url.endsWith('/favicon.ico')) todo('sem favicon: o navegador pede /favicon.ico e recebe 404 (erro no console)');
    else if (local(url)) errors.push(`HTTP ${status}: ${url.slice(base.length - 1)}`);
    else todo(`recurso externo com erro ${status}: ${url}`);
  });
  p.on('Network.loadingFailed', e => { if (!e.canceled && e.type !== 'Media') errors.push(`falha de rede: ${e.errorText} (${e.type})`); });
  for (const d of ['Page', 'Runtime', 'Network']) await p.send(`${d}.enable`);
  await p.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr || 1, mobile: !!vp.mobile });
  if (vp.mobile) await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (reduce) await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  // espera a montagem: sem data-sk-boot e com a abertura terminada
  const ready = (ms = 9000) => p.evaluate(`new Promise(done => { const t0 = performance.now(), check = () => {
    const root = document.querySelector('[data-sk-root]');
    const up = document.readyState === 'complete' && !document.documentElement.hasAttribute('data-sk-boot') && (!root || root.getAttribute('data-sk-intro') !== 'on');
    if (up || performance.now() - t0 > ${ms}) done(up); else setTimeout(check, 100); }; check(); })`);
  const go = async (url, { wait = true } = {}) => { await p.send('Page.navigate', { url: url.startsWith('http') ? url : base + url }); await sleep(300); return wait ? ready() : true; };
  // clique de mouse de verdade no centro do elemento: falha se outro elemento estiver por cima
  const click = async sel => {
    const at = await p.evaluate(`(async () => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'não existe';
      let r = el.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 90) { el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise(f => setTimeout(f, 1100)); r = el.getBoundingClientRect(); }
      const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      return hit && (hit === el || el.contains(hit)) ? [x, y] : 'coberto por ' + (hit ? hit.outerHTML.slice(0, 80) : 'nada'); })()`);
    if (!Array.isArray(at)) return at;
    for (const type of ['mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, x: at[0], y: at[1], button: 'left', clickCount: 1 });
    return true;
  };
  const key = async (k, code, vk, modifiers = 0) => {
    for (const type of ['keyDown', 'keyUp']) await p.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, modifiers });
  };
  return { ...p, errors, ready, go, click, key, $: (expr, o) => p.evaluate(expr, o) };
}

// ------------------------------------------------------------------ sonda da varredura (roda na página)
const PROBE = `(() => {
  const out = { fail: [], small: [], links: [] }, vw = document.documentElement.clientWidth, de = document.scrollingElement;
  if (de.scrollWidth > de.clientWidth + 1) out.fail.push('rolagem horizontal (' + de.scrollWidth + ' > ' + de.clientWidth + ' px)');
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
  for (const [k, n] of Object.entries(ids)) if (n > 1) out.fail.push('id repetido: ' + k);
  for (const a of document.querySelectorAll('a[href^="#"]')) { const id = a.getAttribute('href').slice(1); if (id && !document.getElementById(id)) out.fail.push('âncora quebrada: #' + id); }
  for (const img of document.images) {
    if (img.complete && !img.naturalWidth) out.fail.push('imagem quebrada: ' + img.getAttribute('src'));
    if (!img.hasAttribute('alt')) out.fail.push('imagem sem alt: ' + img.getAttribute('src'));
  }
  for (const el of document.querySelectorAll('a[href], button')) {
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
    if (!name) out.fail.push('controle sem nome acessível: ' + el.outerHTML.slice(0, 80));
  }
  for (const a of document.querySelectorAll('a[target=_blank]')) if (!/noopener|noreferrer/.test(a.rel)) out.fail.push('target=_blank sem noopener: ' + a.href);
  // o que passa da largura da tela (fora o decorativo e as letras do título, que se espalham)
  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('[aria-hidden=true], [data-sk-orbit], [data-sk-letter]')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width && (r.right > vw + 1 || r.left < -1) && cs.visibility !== 'hidden' && cs.opacity !== '0')
      out.fail.push('passa da tela: ' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ' (' + Math.round(r.left) + ' → ' + Math.round(r.right) + ' px)');
  }
  // contraste (WCAG AA) do texto sobre o primeiro fundo opaco atrás dele
  const lum = c => { const m = c.match(/[\\d.]+/g); if (!m) return null; return [0.2126, 0.7152, 0.0722].reduce((s, k, i) => { let v = m[i] / 255; v = v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return s + k * v; }, 0); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const m = getComputedStyle(e).backgroundColor.match(/[\\d.]+/g); if (m && (m.length < 4 || +m[3] > 0.9)) return getComputedStyle(e).backgroundColor; } return getComputedStyle(document.documentElement).backgroundColor; };
  for (const el of document.querySelectorAll('main :is(p, span, a, h1, h2, h3, li, figcaption, strong, code)')) {
    if (el.closest('[aria-hidden=true]') || ![...el.childNodes].some(n => n.nodeType === 3 && n.data.trim())) continue;
    const cs = getComputedStyle(el), a = lum(cs.color), b = lum(bgOf(el));
    if (a == null || b == null) continue;
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), min = parseFloat(cs.fontSize) >= 24 ? 3 : 4.5;
    if (ratio < min) out.fail.push('contraste ' + ratio.toFixed(2) + ' < ' + min + ': "' + el.textContent.trim().slice(0, 30) + '"');
  }
  // alvos de toque abaixo de 44 px (recomendação de Apple e Google; o mínimo da WCAG 2.5.8 é 24): a área conta a margem
  // invisível do ::after posicionado (.sk-hit, seletor de idioma), que também recebe o toque
  const hitOf = el => {
    const r = el.getBoundingClientRect(), a = getComputedStyle(el, '::after'), px = v => parseFloat(v) || 0;
    if (a.content === 'none' || a.position !== 'absolute') return r;
    const left = Math.min(r.left, r.left + px(a.left)), top = Math.min(r.top, r.top + px(a.top));
    return { width: Math.max(r.right, r.right - px(a.right)) - left, height: Math.max(r.bottom, r.bottom - px(a.bottom)) - top };
  };
  if (matchMedia('(pointer: coarse)').matches) for (const el of document.querySelectorAll('a[href], button')) {
    const r = hitOf(el), cs = getComputedStyle(el);
    // no toque, o navegador pinta um bloco (azul no Android) sobre o controle se a cor de destaque não for transparente
    if (!/^rgba\\(0, 0, 0, 0\\)$|^transparent$/.test(cs.webkitTapHighlightColor))
      out.fail.push('toque com o bloco de destaque do navegador: ' + el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '') + ' (' + cs.webkitTapHighlightColor + ')');
    // ficam de fora os links dentro do texto (exceção da regra), o do card, que cobre o card inteiro (::after), e o
    // "pular para o conteúdo", que é do teclado
    if (!r.width || cs.visibility === 'hidden' || el.closest('dialog:not([open]), [aria-hidden=true], p, li') || el.matches('.sk-card-link, .sk-skip')) continue;
    const label = (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 24) + ' (' + Math.round(r.width) + '×' + Math.round(r.height) + ')';
    if (Math.min(r.width, r.height) < 44) out.small.push(label);
  }
  out.links = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)))];
  return out;
})()`;

const short = s => [...new Set(s)].slice(0, 4).join(' | ') + (new Set(s).size > 4 ? ` (+${new Set(s).size - 4})` : '');
const internal = new Set(), small = new Map(); // alvos de toque pequenos, por viewport

// ------------------------------------------------------------------ 1. varredura
console.log(`\nvarredura: ${PAGES.length} páginas × ${RUNS.map(r => r.join('/')).join(', ')}`);
for (const [vpName, theme] of RUNS) {
  const p = await openPage(VIEWPORTS[vpName]);
  for (const path of PAGES) {
    p.errors.length = 0;
    const up = await p.go(`${path}?theme=${theme}`);
    // rola até o fim, para as entradas, os cards e o que carrega preguiçoso
    await p.$(`new Promise(done => { const s = document.scrollingElement; s.style.scrollBehavior = 'auto'; const step = () => {
      s.scrollTop += innerHeight * 0.8; if (s.scrollTop + innerHeight < s.scrollHeight - 2) setTimeout(step, 50); else setTimeout(done, 1200); }; step(); })`);
    const r = await p.$(PROBE);
    r.links.forEach(l => internal.add(l.split('#')[0]));
    if (r.small.length) small.set(vpName, new Set([...(small.get(vpName) || []), ...r.small]));
    const name = `${vpName}/${theme === 'dark' ? 'escuro' : 'claro'} ${path || '/'}`;
    const problems = [...(up ? [] : ['não terminou de montar (data-sk-boot ou abertura presa)']), ...p.errors, ...r.fail];
    ok(!problems.length, name, short(problems));
  }
  await p.close();
}
for (const [vpName, list] of small) todo(`${vpName}: alvos de toque abaixo de 44 px: ${[...list].join(', ')}`);
{
  const broken = [];
  for (const l of internal) { const res = await fetch(l, { redirect: 'manual' }); if (res.status >= 400) broken.push(`${res.status} ${new URL(l).pathname}`); }
  ok(!broken.length, `${internal.size} links internos respondem`, short(broken));
}

// ------------------------------------------------------------------ 2. fluxos
console.log('\nfluxos');
const desk = await openPage(VIEWPORTS.desktop);
const $ = (e, o) => desk.$(e, o);
const pathHash = () => $('location.pathname + location.hash');

// tema: o clique troca, os botões e a barra do navegador acompanham, a escolha vale nas outras páginas e idiomas
await desk.go('');
ok(await desk.click('.sk-tools > [data-sk-theme]') === true, 'tema: botão da toolbar clicável');
await sleep(900);
ok(await $(`document.documentElement.dataset.theme === 'dark' && [...document.querySelectorAll('[data-sk-theme]')].every(b => b.getAttribute('aria-pressed') === 'true')`),
  'tema: o clique liga o escuro e todos os botões ficam aria-pressed');
ok(await $(`document.querySelector('meta[name=theme-color]').content === getComputedStyle(document.documentElement).getPropertyValue('--sk-parch').trim()`), 'tema: theme-color segue o tema');
await desk.go(`projetos/${slugs[0]}/`);
ok(await $(`document.documentElement.dataset.theme === 'dark' && document.querySelector('meta[name=theme-color]').content === getComputedStyle(document.documentElement).getPropertyValue('--sk-parch').trim()`),
  'tema: a escolha vale em outra página, já no <head> (theme-color incluída)');
await desk.go('en/');
ok(await $(`document.documentElement.dataset.theme === 'dark'`), 'tema: a escolha vale no inglês');
await $(`localStorage.removeItem('sk-theme')`);

// idioma: a troca leva à mesma seção no outro idioma; o idioma atual não navega
await desk.go('');
await $(`scrollTo({ top: document.querySelector('[data-sk-view=path]').offsetTop + 60, behavior: 'instant' })`); await sleep(400);
await desk.click('.sk-lang a[hreflang=en]'); await sleep(300); await desk.ready();
ok(await pathHash() === '/en/#experience' && Math.abs(await $(`document.getElementById('experience').getBoundingClientRect().top`)) < 200,
  'idioma: PT → EN na mesma seção (home)', await pathHash());
await desk.go(`en/projects/${slugs[0]}/`);
await $(`scrollTo({ top: document.querySelector('[data-sk-view=projbody]').offsetTop + 200, behavior: 'instant' })`); await sleep(400);
await desk.click('.sk-lang a[hreflang="pt-BR"]'); await sleep(300); await desk.ready();
ok(await pathHash() === `/projetos/${slugs[0]}/#detalhes`, 'idioma: EN → PT na mesma seção (projeto)', await pathHash());
ok(await $(`(() => { const e = new MouseEvent('click', { cancelable: true, bubbles: true }); document.querySelector('.sk-lang a[aria-current]').dispatchEvent(e); return e.defaultPrevented; })()`),
  'idioma: o idioma atual não recarrega a página');

// endereços antigos (enderecos_antigos) levam ao novo, com a âncora
{
  for (const dir of ['projetos', 'en/projects']) for (const old of readdirSync(join(DIST, dir)).filter(d => !slugs.includes(d))) {
    await desk.go(`${dir}/${old}/#x`, { wait: false }); await sleep(800);
    const to = await pathHash();
    ok(new RegExp(`^/${dir}/(${slugs.join('|')})/#x$`).test(to), `endereço antigo ${dir}/${old}/ leva ao novo com a âncora`, to);
  }
}
await desk.go(`projetos/${slugs[0]}`, { wait: false }); await sleep(800);
ok(await $('location.pathname') === `/projetos/${slugs[0]}/`, 'endereço sem a barra final chega à página');
let has404 = false; try { readFileSync(join(DIST, '404.html')); has404 = true; } catch { todo('sem 404.html: um endereço errado mostra a página genérica do GitHub Pages'); }
if (has404) for (const path of ['nao-existe/', 'projetos/nao-existe/', 'en/projects/a/b/']) {
  desk.errors.length = 0;
  const up = await desk.go(path);
  const errs = desk.errors.filter(e => !e.startsWith(`HTTP 404: /${path}`));
  ok(up && !errs.length && await $(`document.title.includes('404') || !!document.querySelector('[data-sk-view=notfound]')`) &&
    await $(`[...document.querySelectorAll('[data-sk-view=notfound] a')].map(a => a.getAttribute('href')).join() === '/,/en/'`),
    `404 em /${path}: monta sem erros e leva de volta ao início nos dois idiomas`, short(errs));
}

// vídeo: o botão de vidro toca o vídeo local (ou carrega o YouTube)
for (const slug of slugs) {
  await desk.go(`projetos/${slug}/`);
  const kind = await $(`document.querySelector('[data-sk-video] video') ? 'video' : document.querySelector('[data-sk-youtube]') ? 'youtube' : 'vazio'`);
  if (kind === 'vazio') { todo(`projetos/${slug}/: sem vídeo de apresentação`); continue; }
  const clicked = await desk.click('[data-sk-play]'); await sleep(1500);
  ok(clicked === true && await $(kind === 'video'
    ? `(() => { const v = document.querySelector('[data-sk-video] video'); return !v.paused && v.controls && !v.error && v.closest('figure').classList.contains('is-playing'); })()`
    : `!!document.querySelector('[data-sk-video] iframe[src*="youtube-nocookie.com"]')`), `vídeo de ${slug} toca no clique`, String(clicked));
}

// "Scroll": cada clique avança até a próxima parada; no fim, some
await desk.go('');
{
  let y = await $('scrollY'), n = 0, stuck = '';
  for (; n < 60; n++) {
    if (await $(`document.querySelector('[data-sk-hint]').disabled`)) break;
    await $(`document.querySelector('[data-sk-hint]').click()`); await sleep(1300);
    const y2 = await $('scrollY');
    if (y2 <= y) { stuck = `parou em ${y2} px no ${n + 1}º clique`; break; }
    y = y2;
  }
  ok(!stuck && await $(`document.querySelector('[data-sk-hint]').disabled && scrollY >= document.scrollingElement.scrollHeight - innerHeight - 2`),
    `"Scroll" avança até o fim e some (${n} paradas)`, stuck);
}

// card → projeto → voltar: a home volta na mesma posição, sem a abertura
await desk.go('');
await $(`document.querySelector('[data-sk-project]').scrollIntoView({ block: 'center', behavior: 'instant' })`); await sleep(1200);
{
  const before = await $('scrollY');
  await desk.click('[data-sk-project]'); await sleep(300); await desk.ready();
  ok(await $('location.pathname') === `/projetos/${slugs[0]}/`, 'card abre a página do projeto');
  const { entries, currentIndex } = await desk.send('Page.getNavigationHistory');
  await desk.send('Page.navigateToHistoryEntry', { entryId: entries[currentIndex - 1].id }); await sleep(300); await desk.ready(); await sleep(400);
  const after = await $('scrollY');
  ok(Math.abs(after - before) < 40, 'voltar devolve a posição da home', `${before} → ${after}`);
}
ok(ORDER.length === slugs.length && new Set(ORDER).size === slugs.length, '"Próximo projeto" passa por todos os projetos e volta ao primeiro', ORDER.join(' → '));
await desk.go(`projetos/${ORDER.at(-1)}/`);
await desk.click('.sk-project-back'); await sleep(300); await desk.ready(); await sleep(300);
ok(await pathHash() === '/#projetos' && Math.abs(await $(`document.getElementById('projetos').getBoundingClientRect().top`)) < 140,
  '"← Todos os projetos" chega na seção de projetos', await pathHash());

// teclado: o primeiro Tab mostra "pular para o conteúdo", que leva ao <main>; conteúdo focado aparece mesmo antes da
// entrada; sem usar o "pular", o Tab seguinte vai ao logo
await desk.go('');
await desk.key('Tab', 'Tab', 9);
ok(await $(`document.activeElement.classList.contains('sk-skip') && document.activeElement.getBoundingClientRect().width > 40 && document.elementFromPoint(...(r => [r.left + r.width / 2, r.top + r.height / 2])(document.activeElement.getBoundingClientRect())) === document.activeElement`),
  'teclado: o primeiro Tab mostra "pular para o conteúdo", por cima de tudo');
await desk.key('Enter', 'Enter', 13); await sleep(300);
ok(await $(`document.activeElement.tagName === 'MAIN'`), 'teclado: "pular para o conteúdo" leva o foco ao <main>');
await desk.key('Tab', 'Tab', 9);
ok(await $(`!!document.activeElement.closest('main') && getComputedStyle(document.activeElement.closest('[data-sk-reveal]') || document.activeElement).opacity === '1'`),
  'teclado: o Tab seguinte já está no conteúdo, que fica visível');
await desk.go(`projetos/${slugs[0]}/`);
await desk.key('Tab', 'Tab', 9); await desk.key('Tab', 'Tab', 9);
ok(await $(`document.activeElement.classList.contains('sk-logo')`), 'teclado: depois do "pular", o Tab vai ao logo');

// troca de layout: no celular os cards viram uma coluna em ordem; de volta ao desktop, as duas colunas voltam
await desk.go('');
{
  const cols = () => $(`[...document.querySelectorAll('[data-sk-card-columns] > div')].map(c => [...c.querySelectorAll('[data-sk-project]')].map(a => a.dataset.skProject).join(',')).join(' | ')`);
  const desktopCols = await cols();
  await desk.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(600);
  const single = await cols();
  ok(single === `${ORDER.join(',')} | `, 'celular: os cards ficam numa coluna só, na ordem dos projetos', single);
  await desk.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(600);
  ok(await cols() === desktopCols, 'desktop de volta: as duas colunas voltam como eram', await cols());
}
await desk.close();

// celular: menu
const mob = await openPage(VIEWPORTS.celular);
await mob.go('');
ok(await mob.click('[data-sk-menu-open]') === true, 'menu: botão clicável'); await sleep(400);
ok(await mob.$(`document.querySelector('[data-sk-menu]').open && document.querySelector('[data-sk-menu-open]').getAttribute('aria-expanded') === 'true'`), 'menu: abre (aria-expanded)');
ok(await mob.$(`document.activeElement.matches('[data-sk-menu-close]')`), 'menu: o foco vai ao botão de fechar');
ok(await mob.$(`getComputedStyle(document.documentElement).overflow === 'hidden'`), 'menu: a página atrás não rola');
await mob.key('Escape', 'Escape', 27); await sleep(300);
ok(await mob.$(`!document.querySelector('[data-sk-menu]').open && document.querySelector('[data-sk-menu-open]').getAttribute('aria-expanded') === 'false' && document.activeElement.matches('[data-sk-menu-open]')`),
  'menu: Esc fecha e devolve o foco ao botão');
await mob.click('[data-sk-menu-open]'); await sleep(400);
await mob.click('.sk-menu-links a[href="#sobre-mim"]'); await sleep(1800);
ok(await mob.$(`!document.querySelector('[data-sk-menu]').open && Math.abs(document.getElementById('sobre-mim').getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) < 40`),
  'menu: um link fecha o menu e leva à seção');
await mob.click('[data-sk-menu-open]'); await sleep(400);
await mob.click('.sk-menu [data-sk-theme]'); await sleep(900);
ok(await mob.$(`document.documentElement.dataset.theme === 'dark'`), 'menu: o tema troca pelo botão do menu');
await mob.key('Escape', 'Escape', 27);
await mob.$(`localStorage.removeItem('sk-theme')`);
await mob.close();

// movimento reduzido: tudo à vista desde o começo
const still = await openPage(VIEWPORTS.desktop, { reduce: true });
await still.go('');
ok(await still.$(`[...document.querySelectorAll('[data-sk-letter], [data-sk-word], [data-sk-reveal]')].every(el => getComputedStyle(el).opacity === '1')`),
  'movimento reduzido: título, manifesto e blocos visíveis sem animação');
await still.close();

// nível C (aparelho fraco): vidro sem desfoque, conteúdo visível
const weak = await openPage(VIEWPORTS.desktop);
await weak.go('?tier=c');
ok(await weak.$(`window.__site.tier === 'c' && getComputedStyle(document.querySelector('.sk-glass')).backdropFilter === 'none' && [...document.querySelectorAll('[data-sk-reveal]')].every(el => getComputedStyle(el).opacity === '1')`),
  'nível C: vidro sem desfoque e blocos visíveis');
await weak.close();

// sem JS: o texto continua à vista (nada fica preso no estado da abertura)
const nojs = await openPage(VIEWPORTS.desktop);
await nojs.send('Emulation.setScriptExecutionDisabled', { value: true });
await nojs.go('', { wait: false }); await sleep(800);
{
  const { root } = await nojs.send('DOM.getDocument', { depth: -1 });
  const { outerHTML } = await nojs.send('DOM.getOuterHTML', { nodeId: root.nodeId });
  ok(!/<html[^>]*data-sk-boot/.test(outerHTML), 'sem JS: a interface não fica escondida (data-sk-boot)');
}
await nojs.close();

browser.close(); server.close();
for (const p of pend) console.log(`! pendência: ${p}`);
if (fails.length) { console.error(`\n${fails.length} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
