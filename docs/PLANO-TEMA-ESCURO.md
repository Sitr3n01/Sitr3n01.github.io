# Plano: tema escuro

Pedido (2026-11-20): analisar um tema escuro para o site sem quebrar o design atual, mantendo as diretrizes de design e
as escolhas artísticas do [MOTION.md](MOTION.md). Este documento registra a análise, as decisões em aberto e o que a
prévia já faz.

## Onde está

Prévia aprovada em 2026-11-20, com as opções A da seção 5. Está na branch `preview/tema-escuro`, sem commit. Inclui:

- **Os dois temas completos:** home e páginas de projeto, nos dois idiomas, no desktop e no celular.
- **Botão de tema:**
  - desktop: na toolbar, depois do seletor PT | EN;
  - celular: no cabeçalho do menu.
- **Tema inicial:** o claro. A escolha feita no botão fica guardada e vale em todas as páginas, inclusive ao voltar
  e avançar.
- **Verificação automática** no `npm run check`.

O tema claro continua igual: com os canvas ocultos, as capturas da `main` e da branch são idênticas fora da toolbar
(onde entrou o botão). Os valores que o claro entrega ao motor e aos cards são os mesmos de antes (seção 7).

## 1. Princípio: a mesma paleta, com os papéis trocados

O escuro não traz cores novas. A tinta vira o fundo e o fundo vira a tinta. Os tons intermediários guardam a mesma
relação que têm no claro (o papel um pouco acima do fundo, as linhas finas um pouco acima do papel).

| Papel | Claro (hoje) | Escuro | Token |
|---|---|---|---|
| Fundo (canvas) | `#e5e4e0` | `#1d1d1d`, a tinta do claro | `--sk-parch` |
| Tinta (texto, árvore) | `#1d1d1d` | `#e5e4e0`, o fundo do claro | `--sk-ink` |
| Papel (cards, stack, fatos, foto) | `#ffffff` | `#262625` | `--sk-paper` |
| Linhas finas | `#bfbebe` | `#3b3b39` | `--sk-ash` |
| Texto secundário | `#5f5f5d` | `#9a9995` | `--sk-mute` |
| Objetos ASCII dos cards | `#1d1d1d` → `#afaead` | `#e5e4e0` → `#6a6a69` | `--sk-tones` |

**Não muda nada em:**

- o gradiente das flores (`#facb0e → #f06ba8 → #78bae6`);
- a tipografia (Inter, e JetBrains Mono + Noto Sans JP só no ASCII);
- os raios (0 em cards, 10 px em links e pílulas) e a regra "sem sombras", com a exceção do vidro;
- o movimento, o layout e os objetos ASCII;
- a foto em preto e branco.

## 2. A sakura no escuro

A árvore, os kanji e as pétalas soltas usam a tinta do tema: claros sobre o fundo escuro.

As flores pediram dois ajustes, que repetem no escuro a regra que o claro já segue:

- **Glifo das pétalas.**
  - No claro: glifo escuro (o gradiente misturado à tinta) sobre a célula tingida.
  - No escuro, o espelho: glifo claro sobre a célula tingida.
  - Com o glifo escuro, as flores viram blocos chapados e o caráter ASCII some (folha "flores" nas capturas).
- **Ponta do gradiente.**
  - No claro: a ponta `#fff` se funde ao papel, e as flores dessa ponta recuam.
  - No escuro, a ponta vai para o papel escuro e as flores recuam do mesmo jeito.
  - Mantendo o `#fff`, elas viram os blocos mais claros da tela e disputam com o texto, sobretudo no título e na
    trajetória (folha "ponta" nas capturas).

A opacidade das células, a zona de respiro em volta do texto, o vento, o glitch e a abertura são os mesmos do claro.

## 3. Vidro líquido

O vidro (nav, "Contato +", PT | EN, WhatsApp, links de contato, rodapé) é o único elemento com luz própria. No claro,
a luz dele é branca. No escuro:

- o trilho é escuro e translúcido, com um brilho fraco na borda;
- a lente é um vidro fumê, com sombra mais funda;
- o reflexo quente do topo fica mais fraco;
- o reflexo iridescente da borda (as cores das flores) continua igual.

O desfoque do topo, do rodapé e do "Scroll" usa a cor do fundo do tema. O menu do celular usa o papel escuro.

**Reflexo do topo corrigido.** O reflexo quente era uma faixa reta de 4 px, a 2 px do topo, com 68% da largura.
- Nas pílulas, ela cabia dentro da curva.
- Nos vidros redondos (WhatsApp, tema, fechar do menu e a lente do "PT"), as pontas passavam do contorno.
- No claro, o vazamento era branco sobre claro e não aparecia; no escuro, aparecia.

Agora a faixa fica numa camada com o mesmo formato do vidro, recuada 2 px, e a borda arredondada dessa camada a corta:
- nas pílulas, nada muda (diferença máxima de 2 a 5 em 255 por pixel, ruído do desfoque);
- nos redondos, o reflexo vira um brilho curto que acompanha a curva, dentro do vidro, nos dois temas.

## 4. Botão e comportamento

- **Forma:** botão de vidro redondo, no mesmo sistema do "Contato +", com o ícone no traço dos ícones do menu.
  - O ícone mostra o tema para o qual o botão leva: lua no claro, sol no escuro.
  - Na troca, a lua gira e vira sol.
  - Para leitor de tela, é um botão "Tema escuro" ligado ou desligado.
- **Posição:**
  - Desktop: à direita do PT | EN.
  - Celular e janelas até 950 px: no cabeçalho do menu, ao lado do botão de fechar.
  - Para caber o botão, a toolbar passa para o modo "logo + idioma + Menu" até 950 px (antes, 860 px). Em 861 px a
    toolbar já passava 7 px da tela; o inglês pede ~870 px de conteúdo mais as margens.
- **Tema inicial e continuidade:**
  - o padrão é o claro, qualquer que seja o tema do sistema do visitante;
  - depois que o visitante usa o botão, vale a escolha dele, guardada no navegador (`sk-theme`), em todas as páginas e
    nos dois idiomas;
  - a escolha vale também quando a página volta sem recarregar:
    - voltar e avançar: o navegador devolve a página congelada da bfcache, com o tema de quando ela foi deixada;
    - aba que volta a ser exibida;
    - aba congelada pelo navegador.
    Nesses casos, a página adota a escolha guardada ao reaparecer (`pageshow` e `visibilitychange`);
  - outra aba aberta acompanha a troca na hora (evento `storage`);
  - `?theme=dark` ou `?theme=light` fixa um tema para testes.
- **Sem piscar:** um script de uma linha no `<head>` decide o tema antes da primeira pintura.
- **Troca:** a tela inteira faz um fade de 0,6 s (View Transitions).
  - Em navegadores sem suporte, a troca é instantânea.
  - Com `prefers-reduced-motion`, não há animação.
  - O canvas e os cards são redesenhados no mesmo quadro da troca.
- **Barra do navegador no celular:** `theme-color` acompanha o fundo do tema.

## 5. Decisões

Aprovadas em 2026-11-20: as opções A, menos a 5.4, em que ficou a B (o site é claro por padrão).

| # | Ponto | A (na prévia) | B |
|---|---|---|---|
| 5.1 | Profundidade do fundo | **Nanquim:** fundo `#1d1d1d` (a tinta do site), papel `#262625` | **Carvão:** fundo `#121212`, papel `#1d1d1d`. Mais fundo e com mais contraste nos cards, mas o fundo deixa de ser uma cor da paleta |
| 5.2 | Glifo das pétalas | Claro sobre a célula tingida (espelho do claro) | Escuro, com células mais opacas. Flores mais saturadas, mas em blocos chapados, sem os glifos |
| 5.3 | Ponta do gradiente | Funde no papel escuro (as flores da ponta recuam, como no claro) | `#fff` também no escuro (flores brancas acesas, que competem com o texto) |
| 5.4 | Tema inicial | Segue o sistema do visitante | **Sempre claro; o escuro só por escolha no botão (escolhida na revisão)** |
| 5.5 | Lugar do botão no desktop | Vidro redondo depois do PT \| EN; modo Menu até 950 px | Só dentro do menu, em todas as larguras. A toolbar fica intacta, mas o botão fica escondido no desktop |

## 6. O que mudou no código

- **`src/page/build_page.py`:**
  - a paleta dos dois temas fica em `THEMES`, num lugar só, e vira tokens CSS (`--sk-*` e `--sk-*-rgb`);
  - o CSS e a marcação não têm mais cor fixa, exceto a luz do vidro e o fundo do player de vídeo;
  - entraram o botão (`theme_btn`), o script do `<head>` e as regras do vidro escuro;
  - o modo Menu da toolbar passou de 860 para 950 px.
- **`src/js/engine.js`:** tinta, fundo, tinta dos glifos das flores, opacidade das células e ponta do gradiente viram
  opções. Os valores padrão são os do claro.
- **`src/js/ascii.js`:** `setTones()` troca os tons dos cards e redesenha os palcos na tela.
- **`src/js/controller.js`:**
  - `mountTheme()` cuida dos botões e da escolha guardada, também nas páginas que voltam pela bfcache e nas outras abas;
  - lê os tokens CSS e passa as cores ao motor e aos cards;
  - o modo Menu passou de 860 para 950 px.
- **`src/page/textos.py`:** `theme_dark` ("Tema escuro", "Dark theme").
- **`scripts/check.mjs`:** três verificações novas (seção 7).

MOTION.md e CLAUDE.md já foram atualizados (paleta escura, vidro, dinâmica 17; cores só pelos tokens de `THEMES`).

## 7. Verificação

- **`npm run check`:** termina em "tudo certo", com quatro verificações novas:
  - os dois temas definem os mesmos tokens;
  - o tema é escolhido no `<head>`, pela escolha guardada ou o claro, sem consultar o sistema;
  - a página que volta pelo voltar/avançar segue a escolha guardada;
  - há botão de tema na toolbar e no menu.
- **Continuidade (Chrome headless, servidor sem `no-store`, como o GitHub Pages), 17 casos:**
  - com o sistema escuro, a primeira visita abre clara;
  - a escolha vale ao abrir um projeto, ao recarregar, ao trocar de idioma e numa aba nova;
  - voltar e avançar com as páginas restauradas da bfcache seguem a escolha (o caso relatado na revisão);
  - a escolha também é seguida por uma aba congelada pelo navegador enquanto outra trocava o tema, e por uma página
    que volta depois de a escolha mudar sem aviso;
  - com o storage bloqueado, a troca vale na página e não é desfeita.
- **O claro não mudou:**
  - com os canvas ocultos, `main` × branch em 10 cenas: idênticas fora da toolbar e do cabeçalho do menu, onde entrou o
    botão. A única outra diferença é ruído de decodificação da foto (no máximo 2 de 255 por canal, invisível);
  - os valores que o claro entrega ao motor e aos cards são os padrões antigos: tinta, fundo, tinta das flores,
    opacidade 1, ponta `#fff` e os quatro tons dos cards.
- **Botão:**
  - três cliques seguidos terminam no tema certo;
  - `aria-pressed` e `theme-color` acompanham a troca;
  - a escolha fica guardada;
  - sem erros no console.
- **Desempenho (`npm run perf`, desktop 1080p com CPU 4× e nível A fixo):**

  | Medida | `main` | branch |
  |---|---|---|
  | Parado no hero | 43% da thread principal | 43% |
  | Sobre os cards | 89% da thread principal | 88% |
  | Motor parado | 255 ms de CPU por s | 240 ms de CPU por s |

  - O estouro da meta sobre os cards no nível A já existia na `main`; o nível automático resolve descendo para o B.
  - No celular (360 px, CPU 6×), as metas continuam atendidas.
  - A troca de tema só refaz a paleta e o atlas de glifos uma vez. Por quadro, o custo é o mesmo nos dois temas.

## 8. Fases

| Fase | Conteúdo | Situação |
|---|---|---|
| 1. Prévia | Tokens, os dois temas, botão, sakura e cards no escuro, capturas | Pronta na branch |
| 2. Escolhas | Decisões 5.1–5.5 | Aprovadas (opções A) |
| 3. Correções da revisão | Reflexo do topo saindo dos vidros redondos no escuro; tema que voltava ao claro no "voltar" (bfcache); padrão sempre claro | Feita |
| 4. Documentação | MOTION.md (paleta escura, vidro, dinâmica 17) e CLAUDE.md (cores só por tokens) | Feita |
| 5. Publicação | Commit e merge na `main`; o push publica o site | **Próxima** |
| 6. Ajustes finos | Revisar num celular de verdade; pôsteres dos vídeos no escuro; foto P&B no escuro (talvez um pouco menos de brilho) | Depois de publicar |
