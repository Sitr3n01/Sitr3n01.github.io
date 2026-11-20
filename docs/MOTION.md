# Portfólio Sitr3n: especificação de movimento

Base para continuar o site, inclusive com agentes de código (Claude Code etc.).
Arquivos gerados: `dist/index.html` (marcação + CSS, de `src/page/build_page.py`) e `dist/sakura-site.js`
(motor da sakura + controlador de scroll, sem dependências, de `src/js/`). Para rodar: `npm run dev` (ver README).

## Regras de design (OFF+BRAND como referência)

- **Cores:** canvas `#e5e4e0`, tinta `#1d1d1d`, papel `#ffffff`, linhas finas `#bfbebe`.
- **Único momento de cor:** as flores da sakura, pintadas com o gradiente
  `linear-gradient(255deg, #facb0e, #f06ba8 30%, #78bae6 65%, #fff)`. O gradiente é recalculado
  a cada quadro sobre a área das flores visíveis, como o disco da esfera da referência.
- **Tipografia:** uma família só. Inter substitui a Ataero Retina, que é proprietária. Títulos em caixa alta
  com `line-height: 0.8`; rótulos em 11px com `letter-spacing: 0.05em`; corpo em 15/18px alinhado à esquerda.
- **Formas e superfícies:** cards e células com raio 0; links e pílulas com raio 10px; sem sombras.
- **Exceção — vidro líquido (nav e contato):** o logo, o trilho de navegação, o botão "Contato +", os links de
  contato e a barra do rodapé são cápsulas de vidro (raio total, `backdrop-filter` desfocando a sakura). A lente
  que marca o item ativo é o único elemento com sombra, e seus reflexos de borda reutilizam as cores do gradiente
  das flores, em pontos pequenos. Fora desses elementos, valem as regras acima.
- **Única fonte monoespaçada:** a arte ASCII do canvas (JetBrains Mono + Noto Sans JP para os kanji).
- **Cards dos projetos:** objetos em ASCII denso, só tinta (`#1d1d1d` → `#bfbebe`), sem o gradiente das flores. Os glifos
  `· + × ✚ ✳ ■` são desenhados como pixels numa grade de 6 px, 4 × 4 por quadrado do quadriculado de 24 px do card.

## Estrutura

```
[data-sk-root]                 tela cheia (100vh), overflow hidden
├─ svg[data-sk-rings]          anéis concêntricos, seguem o foco da câmera
├─ canvas[data-sk-canvas]      sakura em ASCII (fica fixa atrás de tudo)
├─ [data-sk-scroller]          o scroll acontece aqui dentro
│   └─ section[data-sk-view=hero|manifesto|about|work|areas|path|me|contact]
├─ header (nav fixa) · [data-sk-hint] "SCROLL ↓"   [data-sk-ui]: entram depois da abertura
```

`SakuraSite.mount(root, { preset, kanji, wind })` liga tudo e devolve `{ engine, ascii, update(), destroy() }`.

## Dinâmicas (o que a referência faz → como está implementado)

| # | Referência | Implementação | Atributos / onde ajustar |
|---|---|---|---|
| 1 | Abertura (substitui o loader "T." da referência) | Tudo desenhado pelo motor, na grade. **Semente** (0,15–1,15 s): "桜 開花" e contador 000→100 em células; a barra de progresso é uma linha de células com o gradiente das flores (azul → rosa → amarelo), preenchida da esquerda para a direita, com a ponta embaralhando. Cheia, ela "vibra" até 1,3 s. **Explosão** (1,3 s): cada célula vira faíscas (uma por flor visível + 70 decorativas) lançadas em todas as direções, com amortecimento (caractere pela velocidade: `* + : .`, rastro de uma célula). **Florescer** (1,5–3,1 s): ao mesmo tempo, a árvore cresce a partir do tronco (ordem = distância ao longo dos galhos); cada faísca é atraída até a sua flor e chega na ordem do crescimento; a flor abre (0,35 s, embaralhando) quando a faísca pousa, e a cor da faísca passa da cor da barra para a cor da flor. As decorativas viram kana e somem. Título aos 2,3 s; nav, legenda e "SCROLL" logo depois. F5 sempre mostra a versão completa, do topo (a âncora da URL é descartada). Ao voltar à home navegando dentro do site: só um recuo curto de câmera (zoom 2,6 → 1 em 0,95 s) com a árvore crescendo. Clique, rolagem ou tecla pulam a abertura. `?intro=full` força a versão completa. Custo: ~2,8 ms por quadro (mediana) durante a abertura | `INTRO`, `BUD_AT` e `band()` no controlador; `growthOrder`, `burst`, `stepSparks`, `pickBud`, `setOverlay`, `gradAt` no motor; `data-sk-intro`, `data-sk-ui` |
| 2 | Letras do título se montam a partir de posições espalhadas | Cada letra começa deslocada (±420/±260 px, ±50°) e assenta em 1,1 s, com atraso aleatório de até 0,5 s | `data-sk-letter` |
| 3 | No scroll, as letras se dispersam em tempos diferentes ("A P CH") | Progresso = scroll / 0,9·viewport; cada letra sobe com deslocamento próprio e some num limiar próprio (0,05–0,6) | `data-sk-letter` |
| 4 | A esfera cresce e vai para a direita, ficando de fundo | Câmera da sakura com zoom e foco por seção, interpolada entre seções (`smooth(0.55→1)`) e suavizada no motor (5/s) | tabela `VIEWS` no controlador |
| 5 | Manifesto com palavras desalinhadas que se alinham | Seção fixada (sticky, 1700px); cada palavra começa ±28–96px fora da linha e assenta em sequência | `data-sk-word` |
| 6 | Texto legível sobre o objeto | Zona de respiro elíptica por seção: as células da sakura esmaecem ali | `safe` em `VIEWS` |
| 7 | Grade 2×5 com linhas finas | Grid com `gap: 1px` sobre fundo `#bfbebe`; hover inverte tinta e papel | `.sk-cell` |
| 8 | Duas colunas de cards em velocidades diferentes | A coluna 2 tem parallax (`translateY = −distância ao centro × 0,16`) e começa 180px abaixo | `data-sk-parallax="0.16"` |
| 9 | Cards entram ao aparecer | Fade + 40px para cima em 1s, uma vez | `data-sk-reveal` |
| 10 | Nuvem de miniaturas orbitando a esfera, que depois explode | Chips em órbita elíptica com profundidade (escala/opacidade/z-index pelo seno do ângulo). A partir de 58% da seção, se afastam (×1,8–3,4) e somem enquanto a câmera mergulha (zoom → 2,7) | `data-sk-orbit`, `data-sk-chip`, `data-sk-orbit-label` |
| 11 | Anéis finos ao redor do objeto | SVG com 3 círculos em `#bfbebe`, transladado para o foco da câmera e escalado com o zoom | `data-sk-rings` |
| 12 | "SCROLL" avança a leitura | Cada clique desce até o próximo bloco que cabe entre a barra superior e os controles da base. Blocos altos continuam em paradas por parágrafo ou linha. As cenas fixas param com os textos já montados. O botão some no fim da página | `data-sk-hint`, `data-sk-read` |
| 13 | Lista de prêmios com linhas finas | Lista com hairlines; no hover o título desliza 19px | `.sk-row` |
| 14 | Navegação em vidro líquido (segmented control com lente) | A lente desliza em 0,62 s, estica dentro do trilho por 170 ms e gira o reflexo iridescente da borda (`--rim`). Ao retirar o cursor, ela volta ao item com foco de teclado. Sem foco ou cursor, segue a seção que cruza 40% da tela na navegação e descansa no primeiro link no contato | `data-sk-glass`, `.sk-lens`, `.sk-seg`, `.sk-lens-btn`, `src/js/glass.js` |
| 15 | Página de cada projeto | Card da home vira link (a área toda é clicável; "Ver projeto +"). A navegação usa View Transitions entre documentos: o palco ASCII e o título do card voam até a página (0,6 s); sem suporte, troca normal. A página tem a própria sakura (preset `sakura` do projeto) e só a árvore crescendo na entrada (1,1 s). Câmera: `proj` (hero), `projbody` (vídeo e texto, árvore mais fraca, alpha 0,5) e `projnext`. Vídeo 16:9 com botão de vidro; "Próximo projeto" leva o kanji do seguinte. "Voltar" restaura a rolagem da home; âncoras (`#projetos`) chegam sem abertura | `src/content/projetos/*.md`, `project_body()` no gerador, `src/js/video.js`, `view-transition-name: sk-glyph-*` / `sk-title-*` |
| 16 | Objetos em ASCII denso nos cards (referência: flor em glifos densos) | Cada card tem um palco (`.sk-ascii`) com os objetos do projeto: uma nuvem de pontos (mesmo N em todas as formas; o ponto i de uma vira o ponto i da outra) que gira no próprio eixo, se desfaz e se remonta como o objeto seguinte, em loop. Todos os cards seguem um relógio só (guardado na sessão, vale também nas páginas de projeto) e todas as formas têm o mesmo tempo (3,2 s parada + 2,1 s de troca; 3 formas por projeto, ciclo de 15,9 s): os cinco trocam de objeto no mesmo instante. Por quadro: rotação → projeção na grade → z-buffer por célula → luz (normal · L) → glifo por dither ordenado. Quando um card aparece, o que o relógio mostra naquele momento brota de baixo para cima. Trocas por projeto: News Portal (microfone RCA 44 → Terra → tsuru; o microfone se desfaz em ondas), Local AI Provider (gabinete → placa de vídeo → cadeado; as partículas batem numa esfera invisível e voltam), XGB (monitor com a barra → controle → símbolos), Loopia (carta → anel de ilhas gerado de novo a cada volta, com o herói andando nele; as ilhas se montam na ordem do anel), ExoBeast (jogadores fora de fase → rede com o host, em sincronia → torre). Mouse em cima do card acelera o giro. O palco tem o mesmo `view-transition-name` do quadro da página do projeto, que mostra a mesma animação no mesmo relógio e com o mesmo ângulo. Só anima o que está na tela; aba oculta pausa; `prefers-reduced-motion` mostra um quadro parado. Custo: ~2–4 ms por card visível | `src/js/ascii.js` (motor), `src/js/ascii-forms.js` (formas, `ASC_PROJECTS`), `data-sk-ascii`, `data-sk-ascii-src`, `src/assets/ascii/` |

Além da referência, a sakura também tem: vento com rajadas, pétalas que se soltam (kana ヽゝ゜さくら),
blocos de glitch nas flores e caracteres que se embaralham perto do cursor.

## Desempenho e acessibilidade

- **Custo:** o motor roda a 30 fps, com ~7 ms por quadro (mediana) e 12 ms (p95) em 1440×900, no Chrome sem placa de vídeo.
  A cobertura é calculada direto por célula, sem canvas intermediário nem `getImageData`.
- **Aba oculta:** a animação pausa.
- **Cards ASCII:** a preparação começa até 400 px antes do palco entrar na área de rolagem. Um worker prepara as
  superfícies implícitas do ExoBeast e do Local AI Provider. Se o worker estiver indisponível, a mesma amostragem
  cede tempo à interface entre lotes. O canvas desenha enquanto o palco estiver visível.
- **`prefers-reduced-motion`:** sem abertura (a cena já aparece pronta), sem animação de letras e palavras, sakura parada (a câmera ainda acompanha as seções).
- **Leitores de tela:** canvas, anéis, chips e loader têm `aria-hidden`. O título tem `aria-label` com o texto inteiro.

## Pendências

- Licenciar a Ataero Retina ou manter a Inter.
- Os kanji ainda aparecem no quadro de vídeo vazio das páginas de projeto (o link "Próximo projeto" já não tem).
- Celular em pé: a composição da sakura fica mais esparsa, porque a cena é gerada para a proporção da tela.
