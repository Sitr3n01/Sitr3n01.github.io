// Gera as imagens derivadas, sem dependências (Chrome headless via CDP), e as grava em src/ para entrarem no build:
//   src/public/favicon.ico, src/public/apple-touch-icon.png ← src/public/favicon.svg
//   src/assets/og/<pt|en>-<home|slug>.jpg                    ← cada página do site em 1200 × 630 (prévia do link)
// Rode de novo quando mudar o favicon, o título de uma página ou acrescentar um projeto: npm run images
// Uso: npm run images [-- --only icons|og] [--theme light|dark] [--out pasta]  (--out: grava as prévias em outra pasta,
//   para comparar sem trocar as do site)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, DIST, SRC } from './build.mjs';
import { findChrome, launchChrome, sleep } from './lib/chrome.mjs';
import { serve } from './lib/serve.mjs';

const args = process.argv.slice(2);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const only = opt('--only'), theme = opt('--theme') || 'light';
const OG_DIR = opt('--out') || join(SRC, 'assets', 'og');
const OG = { w: 1200, h: 630 };

const chrome = findChrome();
if (!chrome) { console.error('Chrome não encontrado. Defina CHROME com o caminho do executável.'); process.exit(1); }
build({ clean: true });
const { server, url: base } = await serve(DIST);
const browser = await launchChrome(chrome);
const page = await browser.page();
await page.send('Page.enable');
const size = (w, h, dpr = 1) => page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: false });
const capture = async (format, clip, quality) => Buffer.from((await page.send('Page.captureScreenshot', { format, quality, clip: { x: 0, y: 0, ...clip, scale: 1 } })).data, 'base64');

// ICO com as imagens em PNG dentro (aceito por todos os navegadores atuais)
function ico(pngs) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ px, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(px % 256, 0); e.writeUInt8(px % 256, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12); offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...pngs.map(p => p.data)]);
}

if (only !== 'og') {
  // o SVG sem largura nem altura ocupa a janela inteira; com shape-rendering crispEdges, as células saem sem suavizar
  const png = async px => {
    await size(px, px);
    await page.send('Page.navigate', { url: `${base}favicon.svg` });
    await sleep(400);
    return capture('png', { width: px, height: px });
  };
  const pub = join(SRC, 'public'), sizes = [];
  for (const px of [16, 32, 48]) sizes.push({ px, data: await png(px) });
  writeFileSync(join(pub, 'favicon.ico'), ico(sizes));
  writeFileSync(join(pub, 'apple-touch-icon.png'), await png(180));
  console.log('src/public/favicon.ico e apple-touch-icon.png');
}

if (only !== 'icons') {
  mkdirSync(OG_DIR, { recursive: true });
  const home = readFileSync(join(DIST, 'index.html'), 'utf8');
  const slugs = [...home.matchAll(/href="projetos\/([a-z0-9-]+)\/"/g)].map(m => m[1]);
  const pages = [['pt', 'home', ''], ['en', 'home', 'en/'], ...slugs.flatMap(s => [['pt', s, `projetos/${s}/`], ['en', s, `en/projects/${s}/`]])];
  await size(OG.w, OG.h);
  for (const [lang, name, path] of pages) {
    await page.send('Page.navigate', { url: `${base}${path}?theme=${theme}&intro=full` });
    // abertura completa e os objetos ASCII prontos; os controles da tela (Scroll, WhatsApp, menu) saem da foto
    await page.evaluate(`new Promise(done => { const t0 = performance.now(), check = () => {
      const root = document.querySelector('[data-sk-root]'), s = window.__site;
      const up = document.readyState === 'complete' && root && root.getAttribute('data-sk-intro') === 'off' && s && s.ascii.stats.every(x => x.N > 0);
      if (up || performance.now() - t0 > 15000) done(); else setTimeout(check, 200); }; check(); })`).catch(() => {});
    await page.evaluate(`document.head.insertAdjacentHTML('beforeend', '<style>.sk-hint,.sk-wa-wrap,.sk-tools,.sk-project-back{visibility:hidden!important}</style>')`);
    await sleep(2500); // as letras do título terminam de montar e o palco ASCII gira um pouco
    writeFileSync(join(OG_DIR, `${lang}-${name}.jpg`), await capture('jpeg', { width: OG.w, height: OG.h }, 82));
    console.log(`${OG_DIR === join(SRC, 'assets', 'og') ? 'src/assets/og' : OG_DIR}/${lang}-${name}.jpg`);
  }
}

browser.close(); server.close();
if (!opt('--out')) build({ clean: true }); // as páginas passam a apontar para as imagens novas
