# Plano: versão em inglês do portfólio

Pedido (2026-11-20): versão em inglês de todas as páginas e projetos, com um seletor de idioma na toolbar superior, no
mesmo padrão do português: fácil de entender e formal. Este documento registra as decisões, o guia de tom, as nuances de
tradução que precisam de decisão e as fases até publicar.

## Onde está

Publicado em 2026-11-20, com as opções A da seção 5 aprovadas. A versão inclui:

- **Estrutura completa:** a home e as cinco páginas de projeto em inglês, geradas da mesma marcação do português.
- **Seletor PT | EN** na toolbar de todas as páginas, no desktop e no celular.
- **Rascunho de toda a tradução:** interface, home e os cinco projetos.
- **Verificação automática** no `npm run check`.

O português continua igual: o único acréscimo visível nele é o seletor. Falta a versão em inglês dos vídeos (seção 6).

## 1. Arquitetura

| Decisão | Escolha | Por quê |
|---|---|---|
| Endereços | Português na raiz (`/`, `/projetos/<slug>/`); inglês em `/en/` e `/en/projects/<slug>/` | Nenhum link já compartilhado quebra. Cada idioma tem a própria URL: dá para mandar `/en/` direto para um recrutador estrangeiro. |
| Como o inglês é gerado | No build, como páginas estáticas próprias | Não há troca de texto por JavaScript. Assim não há "piscar" do português antes do inglês, o Google indexa as duas versões, leitores de tela recebem `lang` certo e o site funciona sem JS. |
| Âncoras | Traduzidas (`/en/#about-me`, `/en/#projects`) | A URL em inglês fica coerente. O CSS e o JS passaram a identificar as seções por `data-sk-view`, que é igual nos dois idiomas. |
| Redirecionamento por idioma do navegador | **Não fazer** | Com redirecionamento, o Google (que rastreia em inglês) nunca indexaria o português, e um link enviado em português abriria em inglês. A URL decide o idioma; o seletor fica sempre visível. |
| SEO | `lang` no `<html>`, `hreflang` recíproco (pt-BR, en, x-default = português), `canonical` e `description` em cada página | É o padrão para sites com versões por idioma. A home ganhou uma `description` nos dois idiomas, que antes não tinha. |
| Textos da interface | `src/page/textos.py`, sempre em pares `(português, inglês)` | Os dois lados ficam lado a lado na revisão, e um texto novo não entra sem tradução. |
| Projetos | `src/content/projetos/en/<mesmo nome>.md` | O arquivo em inglês só traz o que muda de idioma (categoria, card, tags, papel, período, status e o corpo). Slug, stack, repositório e sites vêm do português, então não há como divergirem. |
| JavaScript | Continua sem textos | O único texto que existia (o título do player do YouTube) agora vem da marcação, no idioma da página. |

## 2. O seletor de idioma

- **Forma:** um trilho de vidro com `PT` e `EN`, no mesmo sistema da nav (lente que desliza, reflexo iridescente). A
  lente descansa no idioma atual e, no hover, corre até o outro.
- **Posição:**
  - Desktop: à direita do botão "Contato +".
  - Celular: entre o logo e o botão "Menu", sempre visível, sem precisar abrir o menu. Tem 44 px de altura, o mínimo
    recomendado para toque.
- **Comportamento:** leva à mesma página no outro idioma, na seção que está na tela. Quem está lendo "Sobre mim" em
  português cai em "About me" em inglês. A abertura completa da sakura não se repete: a página abre com a árvore
  crescendo, como numa navegação interna. Tocar no idioma atual não recarrega a página.
- **Acessibilidade:**
  - Cada opção é um link com `lang`, `hreflang` e o nome do idioma por extenso ("Português", "English"). O atual tem
    `aria-current`.
  - Sem JavaScript, os links continuam funcionando, só sem a âncora da seção.
- **Ajuste de layout:** entre 721 e 860 px de largura, a nav do desktop, o "Contato +" e o seletor não cabem numa linha
  ao lado do logo. Nessa faixa, a toolbar passa a usar o menu do celular (antes isso valia até 720 px).

## 3. Guia de tom do inglês

O inglês espelha a revisão formal do português, sem ser uma tradução palavra por palavra.

- **Pessoa:** primeira pessoa do singular ("I developed the multiplayer"). "We" só em trabalho de equipe, e o texto
  deixa claro o que foi meu.
- **Leitor:** sem falar com o leitor ("you"), como no português. Onde o português usa "para quem", o inglês usa "for
  visitors who…" ou "for anyone…".
- **Registro:** formal e simples.
  - Frases curtas e verbos diretos.
  - Sem gíria, sem expressões idiomáticas: "Technical overview", não "Under the hood".
  - Sem contrações no corpo do texto. Exceção: chamadas curtas como "Let's talk.", que soam rígidas sem a contração.
- **Ortografia:** inglês americano (color, optimize). Vírgula serial ("web, desktop, and games").
- **Títulos:**
  - Em sentence case: "Key figures", não "Key Figures". Na tela, o CSS já põe em caixa alta.
  - Títulos de seção como substantivos, como no português ("My contribution", "Deliverables").
- **Números:**
  - Ponto decimal (23.95 GB, 83.5%).
  - Milhares por extenso no texto (240,000 tokens) e com "k" nos destaques (~9.1k lines).
  - Intervalos com travessão curto (1–4, Jun–Dec 2026).
- **Datas:** mês abreviado sem ponto ("Jun 2026"); por extenso no texto ("since June 2026").
- **Nomes próprios:** ficam como estão: Brasília (com acento), Brasília Game Hub, IESB, Komuniki, Blog da Kelly.
  Na primeira menção, a cidade ganha o país ("Brasília, Brazil"), porque o leitor estrangeiro não sabe onde fica.
- **Termos técnicos:** os termos de mercado em inglês (tower defense, vertical slice, quality gate, fail closed),
  que no português já apareciam emprestados.
- **Fatos:** a tradução não acrescenta nada que o português não diga. O que faltar continua `[preencher]` nos dois.

### Glossário

| Português | Inglês | Observação |
|---|---|---|
| Início | Home | |
| Sobre | Overview | "About" ao lado de "About me" confundiria; a seção é visão geral + stack |
| Sobre mim | About me | |
| Trajetória (+ formação) | Experience (+ education) | |
| Contato | Contact | |
| Projetos em destaque | Featured projects | |
| Ver projeto | View project | |
| Frentes de trabalho | Areas of work | |
| Stack de trabalho | Tech stack | |
| O desafio | The challenge | |
| A solução | The solution | |
| Entregas | Deliverables | |
| Minha atuação | My contribution | "My role" repetiria o campo "Role" logo acima |
| Em números | Key figures | O build reconhece os dois títulos |
| Por dentro | Technical overview | |
| Como se joga | Gameplay | |
| Como foi feito | How it was built | |
| Equipe | Team | |
| Próximos passos | Next steps | |
| Papel / Período / Status | Role / Timeline / Status | |
| Cliente real | Real client / Client project | "Client project" na categoria do card; "real client" nas frases |
| Em produção | In production | |
| Em desenvolvimento | In development | |
| Protótipo | Prototype | |
| Candidata v3.0.0 | v3.0.0 candidate / Release candidate | |
| Tecnólogo em Jogos Digitais | Technology degree in Digital Games | Diploma brasileiro sem equivalente exato; evita sugerir um bacharelado |
| Testes automáticos | Automated tests | |
| Falha fechada | Fails closed | |
| Vamos conversar | Let's talk | |

## 4. Como revisar

1. Abra a prévia no celular (link enviado junto com este plano) e alterne PT | EN em cada página.
2. Leia o inglês lado a lado com o português:
   - textos da interface: `src/page/textos.py`;
   - projetos: `src/content/projetos/en/`.
3. Aponte o que mudar. Cada ajuste vale para a próxima prévia.

## 5. Decisões de tradução

Cada item teve duas opções; a A foi aprovada em todos e é a que está no site.

| # | Ponto | A (na prévia) | B |
|---|---|---|---|
| 5.1 | Frase de abertura | I THINK LIKE AN ARTIST. / I BUILD LIKE AN ENGINEER. | THINKING LIKE AN ARTIST. / BUILDING LIKE AN ENGINEER. |
| 5.2 | Manifesto | From the invisible system to the interface that delights. Engineering, design, and motion in every detail. | From invisible systems to delightful interfaces. Engineering, design, and motion in every detail. |
| 5.3 | Português em "Línguas" | Portuguese · native | Portuguese · fluent (tradução literal de "fluente"). "Native" é o que se espera de um brasileiro em um currículo em inglês; "fluent" sugere que não é a língua materna. |
| 5.4 | Tecnólogo | Technology degree in Digital Games | Technologist degree in Digital Games (Tecnólogo) |
| 5.5 | Game jams | Participated in 2 | 2 participations |
| 5.6 | Chamada final | Let's talk. | Get in touch. |
| 5.7 | Mensagem pronta do WhatsApp em inglês | Hello! I came across your portfolio and would like to discuss a project. | Manter a mensagem em português nos dois idiomas |

## 6. Vídeos de apresentação

Os cinco vídeos têm legendas em português gravadas na imagem (tiradas do texto de cada projeto).

- **Agora:** a página em inglês usa o mesmo vídeo e avisa na legenda: "Presentation — ExoBeast · Captions in
  Portuguese".
- **Depois:** gerar uma versão com as legendas em inglês para cada projeto. O build já procura
  `apresentacao.en.mp4` e `poster.en.jpg` e, quando existem, os usa no inglês e tira o aviso. O roteiro de montagem
  original não está no repositório, então a primeira etapa é refazê-lo como script (ffmpeg), já com os dois idiomas.

## 7. Fases

| Fase | Conteúdo | Situação |
|---|---|---|
| 1. Estrutura | Textos em pares, páginas em `en/`, seletor, hreflang, âncoras traduzidas, CSS/JS por `data-sk-view` | Pronta na prévia |
| 2. Rascunho da tradução | Interface, home e os cinco projetos | Pronta na prévia |
| 3. Revisão do texto | Retorno do usuário + as decisões da seção 5 | Aprovada (opções A) |
| 4. Ajustes de layout com o texto final | Ex.: no card, "01 — WEB · CLIENT PROJECT" e "VIEW PROJECT" quebram em duas linhas a 360 px | Pendente (pequeno) |
| 5. Publicação | Commit, merge e push na `main` (publica o site) | Publicada em 2026-11-20 |
| 6. Vídeos em inglês | Roteiro de montagem em script, cinco vídeos com legendas em inglês | **Próxima** |

Fora deste escopo, mas relacionado: um `sitemap.xml` com as duas versões e as tags Open Graph (prévia do link no
LinkedIn/WhatsApp) em cada idioma.

## 8. Verificação

- **`npm run check`:**
  - confere que cada página em português tem a sua em inglês;
  - confere hreflang recíproco e o seletor em todas as páginas;
  - compara a estrutura de cada projeto com a do português (mesmo número de seções, destaques, itens e links), para
    pegar um link ou destaque esquecido na tradução;
  - **acusa texto em português na página em inglês** (palavras como "de", "para", "não" e letras como ã/ç), com
    exceção dos nomes próprios. Testado: ao remover a tradução do Loopia, o check falha em três pontos.
- **Português:** o HTML em português foi comparado com o de antes. Só mudaram o seletor, o `hreflang`/`canonical`, a
  `description` da home, os seletores do CSS (por `data-sk-view`) e o atributo `data-sk-alt` das seções.
- **Toolbar** medida em 360, 390, celular deitado e desktop de 721 a 1440 px: nada se sobrepõe nem sai da tela, nos
  dois idiomas.
- **Troca de idioma testada:**

  | De | Para |
  |---|---|
  | `/en/#about-me` | `/#sobre-mim` |
  | `/#projetos` | `/en/#projects` |
  | `/` (topo) | `/en/` |
  | `/en/projects/xgb/#details` | `/projetos/xgb/#detalhes` |

  Tocar no idioma atual não recarrega a página.
