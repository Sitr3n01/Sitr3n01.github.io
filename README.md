# Sakura — portfólio Sitr3n

Site estático de uma página: fundo de sakura em arte ASCII num `<canvas>`, com câmera que acompanha o scroll,
loader, letras que se montam e se dispersam, órbita de chips e as demais dinâmicas descritas em
[docs/MOTION.md](docs/MOTION.md). Sem frameworks e sem dependências em tempo de execução.

## Requisitos

- Node.js 22+ (testado no 24; o `perf` e o `e2e` usam o `WebSocket` nativo)
- Python 3.9+ (gera a marcação)
- Google Chrome, Edge ou Chromium, só para `npm run perf`, `npm run e2e` e `npm run images` (ou a variável `CHROME`)

Nada para instalar: não há `node_modules`.

## Comandos

| Comando         | O que faz                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `npm run dev`   | build + servidor em http://localhost:5500 que refaz o build e recarrega a página a cada alteração em `src/` |
| `npm run build` | gera `dist/` do zero                                                         |
| `npm run check` | build + verificações rápidas, sem navegador (sintaxe, export do `SakuraSite`, seções, tradução, build determinístico) |
| `npm run e2e`   | testes de ponta a ponta no Chrome headless: todas as páginas no desktop e no celular, nos dois temas (erros, links, layout, contraste, acessibilidade) e os fluxos (tema, idioma, menu, vídeo, voltar...). `-- --quick` roda a versão curta |
| `npm run images` | refaz as imagens geradas: `favicon.ico` e `apple-touch-icon.png` (de `src/public/favicon.svg`) e as prévias de link 1200 × 630 de cada página (`src/assets/og/`). Rode ao trocar o favicon, um título ou acrescentar um projeto |
| `npm run perf`  | mede o desempenho no Chrome headless (CPU 4×/6× mais lenta, celular) e compara com as metas; ver `docs/PLANO-UX-MOBILE.md` |

Porta diferente: `PORT=3000 npm run dev` (PowerShell: `$env:PORT=3000; npm run dev`).
Se o Python não se chamar `python`/`python3`, defina `PYTHON` com o caminho.

## Estrutura

```
src/
  page/build_page.py   marcação + CSS da home e das páginas de projeto, nos dois idiomas
  page/textos.py       textos da interface e da home em pares (português, inglês): STACK, CHIPS, PATH_ROWS…
  page/content.py      lê src/content/projetos/*.md (front matter + Markdown simples)
  content/projetos/    um .md por projeto: card da home + página do projeto
  content/projetos/en/ a tradução de cada projeto (mesmo nome de arquivo)
  js/core.js           presets e geração da árvore (galhos, flores)
  js/engine.js         motor ASCII: renderização, vento, pétalas, glitch, câmera
  js/glass.js          vidro líquido: lente deslizante da nav e do contato
  js/video.js          player do vídeo de apresentação (local ou YouTube)
  js/ascii.js          objetos dos projetos em ASCII denso: nuvem de pontos, morph e desenho na grade do card
  js/ascii-forms.js    as formas de cada projeto (geradas em código; microfone e tsuru vêm de assets/ascii/)
  js/controller.js     dinâmicas de scroll por seção (tabela VIEWS) e mount()
  js/ascii-worker.js   worker que amostra a geometria dos cards fora da thread principal
  public/              arquivos da raiz do site → copiados para dist/ (favicon.svg; o .ico e o .png saem de npm run images)
  assets/              imagens/arquivos estáticos → copiados para dist/assets/
    og/                prévias de link (Open Graph) de cada página, geradas por npm run images
    projetos/<slug>/   apresentacao.mp4 (ou .webm) e poster.jpg de cada projeto
    ascii/             modelos do news_portal usados no card do News Portal (RCA 44, tsuru, máscara da Terra)
scripts/
  build.mjs            src/ → dist/
  dev.mjs              servidor local com live reload
  check.mjs            verificação sem navegador
  e2e.mjs              testes de ponta a ponta no Chrome headless
  images.mjs           favicon (.ico/.png) e prévias de link, capturados no Chrome headless
  perf.mjs             régua de desempenho no Chrome headless
  lib/serve.mjs        servidor estático do dist/ (dev, e2e e perf)
  lib/chrome.mjs       Chrome headless via CDP (e2e e perf)
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

## Idiomas

O site sai em português na raiz (`/`, `/projetos/<slug>/`) e em inglês em `en/` (`/en/`, `/en/projects/<slug>/`), a
partir da mesma marcação. O seletor PT | EN fica na toolbar e leva à mesma página no outro idioma, na mesma seção.
Textos da interface: `src/page/textos.py`. Projetos: `src/content/projetos/en/<mesmo nome>.md`, só com os campos que
mudam (`categoria`, `card`, `tags`, `papel`, `periodo`, `status`) e o corpo traduzido, com `## Key figures` no lugar de
`## Em números`. O `npm run check` falha se faltar tradução, se a estrutura (seções, números, itens, links) divergir do
português ou se houver texto em português no inglês. Tom e glossário: [docs/PLANO-INGLES.md](docs/PLANO-INGLES.md).

## Projetos

Cada projeto é um arquivo em `src/content/projetos/` (a ordem vem do campo `ordem`). Ele gera o card da home e a
página `projetos/<slug>/`. O front matter tem `ordem`, `kanji`, `sakura` (preset da árvore da página),
`categoria`, `titulo`, `card` (texto curto do card), `tags`, `papel`, `periodo`, `status`, `stack` (separada por
vírgulas), `repo`, `site` (um ou mais endereços, separados por vírgula) e, opcionalmente, `youtube` (ID do vídeo). O corpo é Markdown: o texto antes da primeira
`## seção` vira o lead; a seção `## Em números` vira uma grade de destaques (`- **valor** rótulo`).

**Endereço:** o `<slug>` é sempre o `titulo` em minúsculas, sem acento e com hífens ("News Portal" →
`projetos/news-portal/`), nos dois idiomas; a pasta de vídeos e o arquivo `.md` seguem o mesmo nome. Se o nome mudar,
liste o endereço anterior em `enderecos_antigos` (separados por vírgula): o build gera uma página que leva ao novo, e o
`npm run check` confere os dois lados.

**Vídeo de apresentação:** coloque `src/assets/projetos/<slug>/apresentacao.mp4` (ou `.webm`) e, se quiser, uma capa
`poster.jpg`. Sem arquivo, a página mostra um quadro "em produção". Para usar o YouTube, preencha `youtube:` no front
matter; o player só carrega (youtube-nocookie) depois do clique. Prefira H.264 em 1080p com `-movflags +faststart`.
Versão em inglês (legendas traduzidas): `apresentacao.en.mp4` e `poster.en.jpg`; sem ela, a página em inglês usa o vídeo
em português e avisa na legenda ("Captions in Portuguese").

Marque o que falta com `[preencher]` (aparece destacado na página). O `npm run check` lista as pendências: vídeos que
faltam e textos com `[preencher]`.

**Validação:** o build para com o nome do arquivo e o motivo se faltar um campo obrigatório (`titulo`, `ordem`,
`kanji`, `sakura`, `categoria`, `card`, `tags`), se houver um campo desconhecido (erro de digitação), se `ordem` repetir
ou não for número, se `repo`/`site` não começarem com `https://`, ou se a tradução trouxer um campo que não muda de
idioma. O `npm run check` confere se a árvore de `sakura` existe em `PRESETS`.

## Publicar

No ar em **https://sitr3n01.github.io/**. Cada push na `main` dispara o workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml), que roda o `check`, gera o `dist/` e publica no GitHub
Pages (Settings → Pages → Source: GitHub Actions). Também dá para rodar manualmente na aba Actions.

`dist/` é um site estático com caminhos relativos, então também serve em Netlify, Vercel, Cloudflare Pages etc.
(comando de build `npm run build`, pasta de saída `dist`). A exceção é o `404.html`: o servidor o entrega em qualquer
pasta, então ele usa caminhos absolutos e só funciona com o site na raiz do domínio (como em `sitr3n01.github.io`).

Cada página tem a prévia de compartilhamento (Open Graph) no idioma dela, com a imagem de `src/assets/og/`; sem a
imagem, o `npm run check` avisa e a prévia sai só com título e descrição.

## Pendências

Ver o fim de [docs/MOTION.md](docs/MOTION.md).
