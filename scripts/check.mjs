// Verificação rápida, sem navegador:
//   1. o build roda;
//   2. dist/sakura-site.js tem sintaxe válida e expõe SakuraSite.{mount, createSakuraBackground, PRESETS};
//   3. a marcação tem as seções e os ganchos data-sk-* que o controlador espera;
//   4. o build é determinístico (dois builds seguidos geram os mesmos bytes).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { build, DIST } from './build.mjs';

const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const read = (f) => readFileSync(join(DIST, f), 'utf8');

build({ clean: true });
const js1 = read('sakura-site.js'), html1 = read('index.html');

const sandbox = {};
try {
  vm.runInNewContext(js1, { window: sandbox }, { filename: 'sakura-site.js' });
  ok(true, 'sakura-site.js carrega sem erro');
} catch (e) {
  ok(false, `sakura-site.js carrega sem erro (${e.message})`);
}
const S = sandbox.SakuraSite || {};
ok(typeof S.mount === 'function' && typeof S.createSakuraBackground === 'function', 'SakuraSite.mount e createSakuraBackground existem');
ok(S.PRESETS && ['kosa', 'sanbon', 'ogi', 'itozakura', 'koeda'].every((p) => p in S.PRESETS), 'os 5 presets existem');

for (const v of ['hero', 'manifesto', 'about', 'work', 'areas', 'path', 'contact'])
  ok(html1.includes(`data-sk-view="${v}"`), `seção data-sk-view="${v}"`);
for (const h of ['data-sk-root', 'data-sk-canvas', 'data-sk-scroller', 'data-sk-rings', 'data-sk-loader', 'data-sk-hint'])
  ok(html1.includes(h), `gancho ${h}`);
ok(!html1.includes('\r\n') && !js1.includes('\r\n'), 'saída só com LF');

build();
ok(read('sakura-site.js') === js1 && read('index.html') === html1, 'build determinístico');

if (html1.includes('[SEU E-MAIL]')) console.log('! pendência: [SEU E-MAIL] ainda está no contato');

if (fails.length) { console.error(`\n${fails.length} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
