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
  page/build_page.py   marcação + CSS da home e das páginas de projeto (STACK, CHIPS, PATH_ROWS…)
  page/content.py      lê src/content/projetos/*.md (front matter + Markdown simples)
  content/projetos/    um .md por projeto: card da home + página do projeto
  js/core.js           presets e geração da árvore (galhos, flores)
  js/engine.js         motor ASCII: renderização, vento, pétalas, glitch, câmera
  js/glass.js          vidro líquido: lente deslizante da nav e do contato
  js/video.js          player do vídeo de apresentação (local ou YouTube)
  js/ascii.js          objetos dos projetos em ASCII denso: nuvem de pontos, morph e desenho na grade do card
  js/ascii-forms.js    as formas de cada projeto (geradas em código; microfone e tsuru vêm de assets/ascii/)
  js/controller.js     dinâmicas de scroll por seção (tabela VIEWS) e mount()
  assets/              imagens/arquivos estáticos → copiados para dist/assets/
    projetos/<slug>/   apresentacao.mp4 (ou .webm) e poster.jpg de cada projeto
    ascii/             modelos do news_portal usados no card do News Portal (RCA 44, tsuru, máscara da Terra)
scripts/
  build.mjs            src/ → dist/
  dev.mjs              servidor local com live reload
  check.mjs            verificação sem navegador
docs/MOTION.md         especificação de design e movimento
dist/                  saída gerada (não versionada, não editar)
```

`dist/sakura-site.js` é a concatenação de `core.js` → `engine.js` → `glass.js` → `video.js` → `ascii.js` → `ascii-forms.js` →
`controller.js` dentro de um IIFE que expõe `window.SakuraSite = { mount, mountAscii, createSakuraBackground, PRESETS }`. Os arquivos compartilham o mesmo
escopo, então a ordem importa e nomes de topo não podem colidir.

### Variante para o canvas de Design

```bash
node scripts/build.mjs --dc ./sakura-site.js
```

Gera também `dist/Main.dc.html` (artboard com propriedades `preset`, `kanji` e `wind`).

## Projetos

Cada projeto é um arquivo em `src/content/projetos/` (a ordem vem do campo `ordem`). Ele gera o card da home e a
página `projetos/<slug>/`. O front matter tem `slug`, `ordem`, `kanji`, `sakura` (preset da árvore da página),
`categoria`, `titulo`, `card` (texto curto do card), `tags`, `papel`, `periodo`, `status`, `stack` (separada por
vírgulas), `repo`, `site` e, opcionalmente, `youtube` (ID do vídeo). O corpo é Markdown: o texto antes da primeira
`## seção` vira o lead; a seção `## Em números` vira uma grade de destaques (`- **valor** rótulo`).

**Vídeo de apresentação:** coloque `src/assets/projetos/<slug>/apresentacao.mp4` (ou `.webm`) e, se quiser, uma capa
`poster.jpg`. Sem arquivo, a página mostra um quadro "em produção". Para usar o YouTube, preencha `youtube:` no front
matter; o player só carrega (youtube-nocookie) depois do clique. Prefira H.264 em 1080p com `-movflags +faststart`.

Marque o que falta com `[preencher]` (aparece destacado na página). O `npm run check` lista as pendências: vídeos que
faltam e textos com `[preencher]`.

## Publicar

No ar em **https://sitr3n01.github.io/**. Cada push na `main` dispara o workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml), que roda o `check`, gera o `dist/` e publica no GitHub
Pages (Settings → Pages → Source: GitHub Actions). Também dá para rodar manualmente na aba Actions.

`dist/` é um site estático com caminhos relativos, então também serve em Netlify, Vercel, Cloudflare Pages etc.
(comando de build `npm run build`, pasta de saída `dist`).

## Pendências

Ver o fim de [docs/MOTION.md](docs/MOTION.md).
