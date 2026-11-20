---
slug: loopia
ordem: 4
kanji: 輪
sakura: itozakura
categoria: Jogo
titulo: Loopia
card: Estratégia com cartas e geração procedural: o herói avança sozinho por um anel de ilhas diferente a cada partida, conduzido pelas escolhas do jogador.
tags: Unity 6 · Geração procedural · Equipe
papel: Toda a programação de gameplay
periodo: 2026 · Brasília Game Hub
status: Protótipo
stack: Unity 6, C#, URP, AI Navigation, Input System, VFX Graph, Shader Graph, MCP for Unity
repo: https://github.com/Matt040205/Loopia
---

Um jogo de estratégia em que o jogador não controla o herói. Ele percorre sozinho um anel de ilhas gerado do zero a cada partida, e o jogador define o caminho dele com cartas.

## Como se joga

Lucca, o herói, percorre um anel fechado de ilhas e combate sozinho. O jogador arrasta cartas de ilha para o mapa para curá-lo, dar munição, deixá-lo mais forte ou gerar inimigos que valem experiência. A cada volta completa, Lucca se recupera e os inimigos ficam mais fortes. O foco está no planejamento: cada carta altera os desafios seguintes.

## Minha atuação

Desenvolvi toda a programação de gameplay da versão atual:

- **Mundo gerado a cada partida.** O gerador cria um caminho fechado diferente a cada execução, irregular e sempre válido, com espaço reservado para o chefe no centro.
- **Navegação dos inimigos.** O mapa de navegação é calculado durante o jogo, incluindo saltos entre as ilhas.
- **Validação das cartas.** Antes de aceitar uma carta, o jogo simula uma volta completa com ela posicionada.
- **Combate automático, IA dos inimigos e salvamento** do progresso.

## Em números

- **~5,6 mil** linhas de C#
- **3** pessoas na equipe
- **1** mapa novo a cada partida

## Como foi feito

Projeto de equipe a partir de um documento de game design, no Brasília Game Hub. Decompus o GDD em requisitos, projetei a arquitetura e implementei com um fluxo assistido por IA: agentes de código dirigidos e revisados por mim, com cada mudança validada dentro do Unity Editor.

Na equipe, [@Matt040205](https://github.com/Matt040205) fez os modelos 3D e as texturas, e [@amigolindu](https://github.com/amigolindu) o cenário, os shaders, a água, o ciclo dia e noite e os efeitos visuais.

## Por dentro

Gerador de anel que preserva um ciclo válido enquanto fica irregular, NavMesh gerado em tempo de execução com links de salto, cartas data-driven com simulação de volta antes da colocação, combate automático e save em JSON.
