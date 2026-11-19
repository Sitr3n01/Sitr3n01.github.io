# Sakura — portfólio Sitr3n

Site estático de uma página: fundo de sakura em arte ASCII num `<canvas>`, com câmera que acompanha o scroll,
loader, letras que se montam e se dispersam, órbita de chips e as demais dinâmicas descritas em
[docs/MOTION.md](docs/MOTION.md). Sem frameworks e sem dependências em tempo de execução.

## Requisitos

- Node.js 20+ (testado no 24)
- Python 3.9+ (gera a marcação)

Nada para instalar: não há `node_modules`.

## Comandos

| Comando         | O que faz                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `npm run dev`   | build + servidor em http://localhost:5500 que refaz o build e recarrega a página a cada alteração em `src/` |
| `npm run build` | gera `dist/` do zero                                                         |
| `npm run check` | build + verificações rápidas (sintaxe, export do `SakuraSite`, seções, build determinístico) |

Porta diferente: `PORT=3000 npm run dev` (PowerShell: `$env:PORT=3000; npm run dev`).
Se o Python não se chamar `python`/`python3`, defina `PYTHON` com o caminho.

## Estrutura

```
src/
  page/build_page.py   marcação + CSS da página (conteúdo: STACK, PROJECTS, CHIPS, PATH_ROWS…)
  js/core.js           presets e geração da árvore (galhos, flores)
  js/engine.js         motor ASCII: renderização, vento, pétalas, glitch, câmera
  js/controller.js     dinâmicas de scroll por seção (tabela VIEWS) e mount()
  assets/              imagens/arquivos estáticos → copiados para dist/assets/
scripts/
  build.mjs            src/ → dist/
  dev.mjs              servidor local com live reload
  check.mjs            verificação sem navegador
docs/MOTION.md         especificação de design e movimento
dist/                  saída gerada (não versionada, não editar)
```

`dist/sakura-site.js` é a concatenação de `core.js` → `engine.js` → `controller.js` dentro de um IIFE que
expõe `window.SakuraSite = { mount, createSakuraBackground, PRESETS }`. Os três arquivos compartilham o mesmo
escopo, então a ordem importa e nomes de topo não podem colidir.

### Variante para o canvas de Design

```bash
node scripts/build.mjs --dc ./sakura-site.js
```

Gera também `dist/Main.dc.html` (artboard com propriedades `preset`, `kanji` e `wind`).

## Publicar

`dist/` é um site estático pronto: serve em GitHub Pages, Netlify, Vercel, Cloudflare Pages etc.
(comando de build `npm run build`, pasta de saída `dist`).

## Pendências

Ver o fim de [docs/MOTION.md](docs/MOTION.md) — principalmente trocar `[SEU E-MAIL]` no contato.
