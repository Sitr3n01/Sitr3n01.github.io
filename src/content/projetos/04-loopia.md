---
slug: loopia
ordem: 4
kanji: 輪
sakura: itozakura
categoria: Jogo
titulo: Loopia
card: Um herói que luta sozinho num mundo em anel que muda a cada partida. Você decide o destino dele com cartas.
tags: Unity 6 · Geração procedural · Equipe
papel: Toda a programação de gameplay
periodo: 2026 · Brasília Game Hub
status: Protótipo
stack: Unity 6, C#, URP, AI Navigation, Input System, VFX Graph, Shader Graph, MCP for Unity
repo: https://github.com/Matt040205/Loopia
---

Um jogo de estratégia em que você não controla o herói. Ele percorre sozinho um anel de ilhas criado do zero a cada partida, e você molda o caminho dele com cartas.

## Como se joga

Lucca, o herói, anda num anel fechado de ilhas e luta sozinho. O jogador arrasta cartas de ilha para o mapa para curá-lo, dar munição, deixá-lo mais forte ou gerar inimigos que valem experiência. A cada volta completa, Lucca se recupera e os inimigos ficam mais fortes. A graça está em planejar: cada carta muda o que vem pela frente.

## O que eu fiz

Escrevi toda a programação de gameplay da versão atual:

- **Um mundo novo a cada partida.** O gerador sorteia um caminho fechado diferente toda vez, irregular mas sempre válido, com espaço para o chefe no meio.
- **Inimigos que sabem por onde andar.** O mapa de navegação é calculado durante o jogo, com pulos entre as ilhas.
- **Cartas que conferem a jogada.** Antes de aceitar uma carta, o jogo simula uma volta inteira com ela no lugar.
- **Combate automático, IA dos inimigos e salvamento** do progresso.

## Em números

- **~5,6 mil** linhas de C#
- **3** pessoas na equipe
- **1** mapa novo a cada partida

## Como foi feito

Projeto de equipe a partir de um documento de game design, no Brasília Game Hub. Quebrei o GDD em requisitos, desenhei a arquitetura e implementei com um fluxo assistido por IA: agentes de código dirigidos e revisados por mim, com cada mudança validada dentro do Unity Editor.

Na equipe, [@Matt040205](https://github.com/Matt040205) fez os modelos 3D e as texturas, e [@amigolindu](https://github.com/amigolindu) o cenário, os shaders, a água, o ciclo dia e noite e os efeitos visuais.

## Por dentro

Gerador de anel que preserva um ciclo válido enquanto fica irregular, NavMesh assado em tempo de jogo com links de pulo, cartas data-driven com simulação de volta antes da colocação, combate automático e save em JSON.
