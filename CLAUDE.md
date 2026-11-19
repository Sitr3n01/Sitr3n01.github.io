# CLAUDE.md

Portfólio estático (pt-BR) com fundo de sakura em ASCII. Sem dependências de runtime nem `node_modules`.

## Comandos

- `npm run dev` — servidor em http://localhost:5500 com rebuild + live reload ao salvar em `src/`
- `npm run build` — gera `dist/`
- `npm run check` — rode depois de qualquer mudança; precisa terminar em "tudo certo"

## Regras

- **Fonte da verdade é `src/`.** Nunca edite `dist/` (é regenerado e não é versionado).
- Marcação, CSS e textos ficam em `src/page/build_page.py` (f-strings com estilos inline; listas `STACK`,
  `PROJECTS`, `CHIPS`, `PATH_ROWS` guardam o conteúdo). Escape texto com `E()`.
- `src/js/*.js` são concatenados em um IIFE na ordem core → engine → controller (`scripts/build.mjs`).
  Não use `import`/`export` neles; tudo de topo é compartilhado entre os três.
- O JS se liga à marcação por atributos `data-sk-*`. Ao renomear/remover um, atualize os dois lados e o
  `scripts/check.mjs`.
- Design e movimento seguem [docs/MOTION.md](docs/MOTION.md): paleta `#e5e4e0 / #1d1d1d / #ffffff / #bfbebe`,
  gradiente só nas flores, uma família tipográfica (Inter), raio 0 em cards, 10px em links/pílulas, sem sombras.
  Respeite `prefers-reduced-motion` e mantenha `aria-hidden` nos elementos decorativos.
- Desempenho: o motor roda a 30 fps (~7 ms/quadro). Evite trabalho por quadro que não seja por célula.
- Fim de linha LF, UTF-8, 2 espaços (4 no Python).
