# Plano: desempenho, rolagem e leitura no celular

Origem: feedbacks de visitantes (2026-11-20). (1) O site pesa em PCs antigos e celulares de entrada, com queda de fps.
(2) A rolagem no celular é ruim. (3) No celular, o texto se confunde com o ASCII do fundo, e a escala e a posição dos
elementos estão ruins (ex.: células da stack). Ordem combinada: primeiro o técnico, depois o artístico.

## Status

**Fases 0 e 1 feitas na branch `preview/desempenho`** (2026-11-20), medidas com `npm run perf`. A régua é a mesma
para as duas versões, e os níveis de qualidade da branch são os automáticos, como o visitante recebe.

| Cenário | Parado (ocupação), main → branch | Rolagem: p95 e quadros longos (o maior) | Sobre os cards: ocupação e p95 |
|---|---|---|---|
| Desktop 1080p, CPU normal | 26% → 9% | 8 → 8 ms · 0 → 0 | 65% → 26% · 25 → 4 ms |
| Desktop 1080p, CPU 4× (vai para o nível B) | 92% → 45% | 75 → 54 ms · 11 (213 ms) → 3 (66 ms) | 101% → 60% · 121 → 25 ms |
| Notebook 1366, CPU 6× (vai para o nível B) | 94% → 50% | 83 → 42 ms · 15 (251 ms) → 1 (54 ms) | 101% → 66% · 96 → 25 ms |
| Celular 390 dpr 3, CPU 4× (fica no A) | 53% → 27% | 17 → 8 ms · 5 (215 ms) → 0 | 93% → 30% · 46 → 5 ms |
| Celular 360 dpr 2, CPU 6× (fica no A) | 72% → 38% | 33 → 17 ms · 6 (174 ms) → 1 (91 ms) | 100% → 45% · 58 → 8 ms |

O que entrou:
- **Controlador por eventos:** sem rolagem, ele não roda. O layout fica em cache, as entradas usam
  `IntersectionObserver`, e os anéis seguem o quadro do motor.
- **Motor:**
  - atlas de glifos com paleta indexada;
  - redesenho só das células que mudaram;
  - buffers reaproveitados;
  - pétala sem `atan2` nem `cos` por amostra;
  - atenuação em cache.
- **Cards:**
  - desenho em 1× com ampliação pixelada;
  - no celular, só o palco central anima;
  - preparação em tempo ocioso, com uma tarefa por forma.
- **Níveis de qualidade A/B/C automáticos** e fundo que desacelera quando o papel cobre a tela.
- **Vidro** com 2 camadas de desfoque no lugar de 5.

O item 1.7 (worker com `OffscreenCanvas`) não foi necessário. A rolagem no desktop fraco continua acima de 50 ms no
p95: com a câmera andando, todo quadro é refeito. Isso fica para a fase 2 (efeitos no compositor).
**Métricas:** o p50 do intervalo entre quadros foi trocado por p95/p99 e pela ocupação da thread principal, porque o
rAF do headless passa de 60 Hz e os quadros vazios puxam a mediana para baixo.

## 1. Diagnóstico medido

**Método.** Chrome 157 headless controlado via CDP. A CPU foi emulada 4× e 6× mais lenta, e o celular foi emulado com
viewport, toque e dpr. Cada cenário tem três medições: 4 s parado no hero depois da abertura, a página inteira rolada a
1,4 px/ms (um polegar) e 4 s parado sobre os cards. A medição registrou a ocupação da thread principal, o intervalo
entre quadros, os long animation frames e um perfil de CPU.
**Limites.** A emulação não reproduz a GPU, e o headless não tem vsync. Os números de quadros servem para comparar
cenários entre si.

| Cenário | Thread principal ocupada, parado no hero | Rolagem: intervalo entre quadros p50 / p95 | Sobre os cards: p50 / p95 |
|---|---|---|---|
| Desktop 1080p, CPU normal | 32% | 4 / 12 ms | 4 / 25 ms |
| Desktop 1080p, CPU 4× (PC antigo) | **95%** | 37 / 75 ms (13 quadros longos, 1,1 s) | **75 / 121 ms** (~12 fps) |
| Notebook 1366×768, CPU 6× | **99%** | 37 / 96 ms (13 quadros longos, 1,4 s) | **71 / 92 ms** (~14 fps) |
| Celular 390×844 dpr 3, CPU 4× | 57% | 4 / 21 ms (5 quadros longos) | 8 / 46 ms |
| Celular 360×780 dpr 2, CPU 6× (entrada) | **82%** | 8 / 38 ms (8 quadros longos, 0,7 s) | **42 / 67 ms** (~20 fps) |

### Para onde vai o tempo

1. **Motor da sakura (`engine.js`).** Consome cerca de 21 ms por quadro em 1080p com CPU 4×, o que dá 65% da thread
   principal só para o fundo. No celular com CPU 6× são 10,5 ms. O "~7 ms" do MOTION.md foi medido numa máquina rápida.
   O custo cresce com o número de células, porque cada célula leva um `fillText` e monta uma string `rgba()`. Também
   cresce com a árvore inteira: `pose()` e `splatBark()` percorrem os 66 galhos a cada quadro, inclusive os que estão
   fora da tela.
2. **Cards ASCII (`ascii.js`).** Custam de 3 a 9,5 ms por palco por quadro (`drawImage` por célula + projeção de até
   16 mil pontos). Até 2 palcos ficam ativos ao mesmo tempo no celular. Somados ao motor, saturam a thread principal.
3. **Controlador (`controller.js`).** O `tick` roda em todo quadro do monitor (60–120 vezes por segundo), mesmo com a
   tela parada. A cada vez, chama `getBoundingClientRect` em todas as seções e lê o layout depois de escrever
   transforms, o que força um recálculo de estilo. Com CPU 6×, gasta 1,2 ms parado e 2,3 ms rolando. Num celular de
   120 Hz, isso ocupa cerca de 28% da thread principal durante a rolagem.
4. **Preparação dos cards durante a rolagem.** A amostragem das malhas roda na thread principal (só as SDF vão para o
   worker). Isso gera quadros longos de 265–372 ms (CPU 4–6×) justamente quando os cards se aproximam.
5. **Vidro.** 14 camadas com `backdrop-filter` ficam sobre um canvas que muda 30 vezes por segundo: 5 desfoques
   empilhados no topo, 5 no rodapé e o halo do "Scroll". No teste com e sem elas, a versão com vidro teve +40% de
   trabalho no compositor e 2,4× de rasterização. Numa GPU de entrada com dpr 3, isso pesa no preenchimento de pixels.

### Rolagem no celular

- **Scroller interno.** O site rola um `div` dentro de uma raiz de `100dvh` com `overflow: hidden`, então a barra de
  endereço nunca recolhe (a tela útil fica menor). Comportamentos nativos também se perdem ou viram exceção, como tocar
  na barra de status para voltar ao topo e a restauração da posição.
- **Cenas fixadas.** 33% da rolagem acontece dentro delas: 4.300 de 12.962 px. O manifesto usa 1.700 px para uma frase
  e as "Frentes de trabalho" usam 2.600 px. No celular, isso parece tela travada.
- **Efeitos de rolagem atrasados.** Letras, palavras, órbita, parallax e câmera rodam no rAF da thread principal, que
  está ocupada. O conteúdo rola no compositor a 60–120 Hz, e os efeitos e o fundo (30 fps ou menos) chegam atrasados e
  aos saltos.
- **Conteúdo invisível.** 16 blocos começam com `opacity: 0` e só aparecem a 90% da tela. Numa rolagem rápida, a tela
  passa vazia.
- **Botão "Scroll".** Fica fixo sobre o conteúdo no canto inferior direito e cobre texto em boa parte das capturas.

### Leitura

- A zona de respiro é uma elipse por seção, pensada para o desktop. No celular o texto ocupa a coluna inteira, e as
  bordas, o topo e a base continuam com glifos em densidade plena.
- Os glifos da casca (`# = 森 林`) usam a mesma tinta do texto e têm tamanho parecido (12 px contra 15–18 px), então o
  texto se camufla. Os 49 rótulos de 11 px são os mais frágeis.
- Casos vistos em 390 px: o título do hero sobre o tronco, palavras do manifesto sobre as flores, os fins de linha do
  "Sobre", o rótulo da trajetória e "Komuniki" sobre a casca, e os rótulos das frentes de trabalho embaixo dos chips.

### Escala e posição

- **Stack:** 10 células em uma coluna, 112 px cada, somando 1.130 px de tela para 10 rótulos curtos.
- **Página de projeto:** fatos e números aparecem um por linha, com 112 e 150 px de altura.
- **Órbita:** 29 chips num raio de ~150 px mais 4 rótulos ficam sobrepostos e ilegíveis.
- **Sobre mim:** a foto ocupa a tela inteira antes do nome.

## 2. Princípios

- **A identidade fica.** Ficam a sakura em ASCII com o gradiente só nas flores, a câmera por seção, a paleta, a Inter,
  o vidro na nav e os objetos ASCII nos cards. Muda a intensidade e o momento em que cada coisa roda.
- **Onde há texto, a sakura recua**, sem exceção.
- **A thread principal fica com a rolagem e o toque.** A renderização vai para onde não atrapalha.
- **O site degrada pela capacidade medida**, não pela suposição de que é celular.
- **Toda mudança é medida antes e depois** com a mesma régua.

## 3. Fases

### Fase 0: régua

- `scripts/perf.mjs`: o mesmo harness CDP (sem dependências, usa o Chrome instalado), com os cenários acima e as metas
  da seção 5. Vira `npm run perf`.
- Se possível, levantar os modelos e navegadores de quem reclamou, para calibrar os níveis de qualidade.

### Fase 1: desempenho

1. **Controlador por eventos.** O `tick` só roda quando há rolagem, abertura, órbita visível ou redimensionamento. Os
   topos das seções ficam em cache (`ResizeObserver`), as leituras vêm antes das escritas, e as entradas passam a usar
   `IntersectionObserver`.
2. **Motor.**
   - Atlas de glifos por caractere e cor quantizada no lugar de `fillText`, como os cards já fazem.
   - Buffers reaproveitados em vez de 8 arrays novos por quadro.
   - `pose()` e `splat` só para galhos cuja caixa toca a tela.
   - Por último, se ainda faltar: redesenhar só as células que mudaram.
3. **Níveis de qualidade automáticos.** O `onFrame` do motor (já existe) mede a abertura e o primeiro uso e escolhe um
   nível:
   - **A (atual):** 30 fps, célula de 14 px, dpr até 2.
   - **B:** 24 fps, dpr até 1,5, sem glitch, metade das pétalas, cards a 20 fps com menos pontos.
   - **C:** 15–20 fps no fundo, células maiores, cards parados fora do centro, vidro sem `backdrop-filter`.

   `deviceMemory`, `hardwareConcurrency` e Save-Data servem de ponto de partida. O nível só desce durante a sessão,
   para não oscilar.
4. **Cards.**
   - No celular, só anima o palco mais central; o outro mantém o último quadro.
   - Menos pontos por palco.
   - As malhas também são amostradas no worker, e a preparação acontece em tempo ocioso depois da abertura, não durante
     a rolagem.
5. **Fundo coberto.** Quando o papel cobre 80% ou mais da tela (cards, stack), o motor congela num quadro.
6. **Vidro.**
   - Topo e rodapé passam de 5 desfoques para 1–2.
   - O halo do "Scroll" fica sem desfoque.
   - No nível C, o vidro vira um preenchimento translúcido equivalente.
7. **Estrutural (se 1–6 não bastarem).** O motor e os cards renderizam em worker com `OffscreenCanvas`. O atlas de
   glifos é montado na página e transferido como `ImageBitmap`, então o worker não precisa de fontes. Fallback: a thread
   principal.

### Fase 2: rolagem

1. **Rolagem do documento** no lugar do scroller interno, com canvas, nav e controles fixos. O controlador já aceita
   `document.scrollingElement`; o `topOf()` e o glass precisam de ajuste. O canvas é dimensionado por `lvh` e não
   regenera a árvore quando só a altura muda (barra de endereço). A variante `--dc` (artboard) mantém o scroller interno.
2. **Cenas fixadas mais curtas no celular:** manifesto com ~130svh e frentes com ~170svh. Elas passam de 33% para cerca
   de 15% da rolagem.
3. **Efeitos no compositor.** `animation-timeline: view()` / `scroll()` para as letras do título, as palavras do
   manifesto, as entradas e o parallax. O JS fica de reserva onde não houver suporte.
4. **Entradas no celular:** começam antes de o bloco entrar na tela e são mais curtas (0,5 s, 16 px). No nível C,
   nenhum conteúdo fica escondido.
5. **"Scroll" no toque:** aparece só no hero, some depois do primeiro gesto e nunca fica sobre texto.
6. **Toque não embaralha** os glifos nem empurra as pétalas como o cursor faz (`pointerType === 'touch'`).

### Fase 3: leitura (técnica, com efeito visual)

1. **Respiro guiado pelo texto.** O controlador passa ao motor os retângulos dos blocos de texto visíveis, guardados em
   cache e deslocados pela rolagem. As células sob o texto, mais uma margem de 2 células, caem para cerca de 10%, com
   borda suave. A elipse continua para compor a cena.
2. **Tom.** Casca e galhos dentro ou perto do respiro passam da tinta para o cinza (`#bfbebe` → `#8a8986`). A tinta
   plena fica para o texto.
3. **Câmeras para tela em pé** (`VIEWS` do celular): flores nas bordas e nunca sob a coluna de texto, e alpha menor nas
   seções de leitura. No hero, a árvore fica na metade de cima e o título na base limpa.
4. **Tamanhos mínimos no celular:** rótulos com 12 px e corpo com 16 px.

### Fase 4: layout mobile (artístico, em prévias `preview/<tema>` com capturas)

1. Stack em 2 × 5: cerca de 430 px, em vez de 1.130.
2. Fatos e números em 2 colunas quando os valores são curtos; a stack ocupa a linha inteira.
3. Cards com palco de ~62vw, objeto maior e menos grade vazia.
4. Frentes de trabalho no celular: 12–14 chips, rótulos fixos fora da órbita e título sem flor por baixo, em 2–3 opções
   renderizadas.
5. Sobre mim: foto menor, perto do nome (opções).

## 4. Riscos

- **Rolagem do documento (2.1)** é a mudança maior. Ela mexe na restauração da posição, nas âncoras, nas View
  Transitions e no glass. Precisa de verificação em Android e em iPhone.
- **Suporte de navegadores:** `OffscreenCanvas` 2D em worker existe no Safari 16.4+, e as scroll-driven animations no
  Chrome/Edge 115+ e no Safari 26. Onde faltar, entra o fallback atual.
- **Níveis B e C** mostram menos movimento em aparelhos fracos. É uma escolha de produto.

## 5. Metas (mesma régua)

| Cenário | Hoje | Meta |
|---|---|---|
| Celular 360, CPU 6×, parado | 82% da thread principal | ≤ 40% |
| Celular 360, CPU 6×, rolagem | p95 38 ms, 8 quadros longos | p95 ≤ 25 ms, nenhum quadro > 100 ms |
| Celular 360, CPU 6×, sobre os cards | ocupação ~100%, p95 58 ms | ocupação ≤ 70%, p95 ≤ 33 ms |
| Desktop 1080p, CPU 4×, parado | 95% | ≤ 50% |
| Desktop 1080p, CPU 4×, sobre os cards | ocupação ~100%, p95 121 ms | ocupação ≤ 70%, p95 ≤ 33 ms |
| Leitura (todas as larguras) | glifos plenos sob o texto | nenhum glifo acima de 15% de opacidade sob o texto |

Validação em aparelho real: Android de entrada via depuração remota do Chrome e iPhone via Web Inspector do Safari.
