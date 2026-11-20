# CLAUDE.md

Portfólio estático (pt-BR) com fundo de sakura em ASCII. Sem dependências de runtime nem `node_modules`.

## Comandos

- `npm run dev` — servidor em http://localhost:5500 com rebuild + live reload ao salvar em `src/`
- `npm run build` — gera `dist/`
- `npm run check` — rode depois de qualquer mudança; precisa terminar em "tudo certo"
- `npm run perf` — régua de desempenho (Chrome headless, CPU lenta, celular); rode antes e depois de mexer no motor, nos cards
  ou no controlador

## Regras

- **Fonte da verdade é `src/`.** Nunca edite `dist/` (é regenerado e não é versionado).
- Marcação, CSS e textos ficam em `src/page/build_page.py` (f-strings com estilos inline; listas `STACK`,
  `CHIPS`, `PATH_ROWS` guardam o conteúdo). Escape texto com `E()`.
- Projetos vêm de `src/content/projetos/*.md` (ver README, seção Projetos): um arquivo gera o card da home e a
  página `projetos/<slug>/`. Não invente fatos sobre os projetos; use `[preencher]` quando faltar informação.
- `src/js/*.js` são concatenados em um IIFE na ordem core → engine → glass → video → ascii → ascii-forms → controller
  (`scripts/build.mjs`).
  Não use `import`/`export` neles; tudo de topo é compartilhado entre eles.
- O JS se liga à marcação por atributos `data-sk-*`. Ao renomear/remover um, atualize os dois lados e o
  `scripts/check.mjs`.
- Design e movimento seguem [docs/MOTION.md](docs/MOTION.md): paleta `#e5e4e0 / #1d1d1d / #ffffff / #bfbebe`,
  gradiente só nas flores, uma família tipográfica (Inter), raio 0 em cards, 10px em links/pílulas, sem sombras
  (exceção: os elementos de vidro líquido da nav e do contato, ver MOTION.md).
  Respeite `prefers-reduced-motion` e mantenha `aria-hidden` nos elementos decorativos.
- Desempenho: ver a seção "Desempenho" do MOTION.md. O motor roda a 30 fps, com atlas de glifos e redesenho só das
  células que mudaram. O controlador só roda quando algo muda e lê o layout em cache: não leia layout no tick. Os níveis
  de qualidade (`TIERS`) descem sozinhos em aparelhos fracos. Meça com `npm run perf`.
- Fim de linha LF, UTF-8, 2 espaços (4 no Python).
