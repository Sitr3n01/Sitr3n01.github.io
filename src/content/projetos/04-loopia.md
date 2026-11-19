---
slug: loopia
ordem: 4
kanji: 輪
sakura: itozakura
categoria: Jogo
titulo: Loopia
card: Jogo feito em equipe no Brasília Game Hub.
tags: Unity · Equipe
papel: Toda a programação de gameplay
periodo: 2026 · Brasília Game Hub
status: Protótipo
stack: Unity 6, C#, URP, AI Navigation, Input System, VFX Graph, Shader Graph, MCP for Unity
repo: https://github.com/Matt040205/Loopia
---

Protótipo de estratégia em loop: o herói percorre sozinho um anel hexagonal gerado proceduralmente, enquanto o jogador molda o mundo com cartas de ilha.

## Contexto

Projeto de equipe feito a partir de um documento de game design. Lucca, o herói, anda num anel fechado de ilhas e luta sozinho; o jogador nunca o controla diretamente. Em vez disso, arrasta cartas de ilha para o mapa para curá-lo, dar munição a ele, deixá-lo mais forte ou gerar inimigos que valem XP. A cada volta completa, Lucca se recupera e os inimigos ficam mais fortes.

Na equipe, [@Matt040205](https://github.com/Matt040205) fez os modelos 3D e as texturas, e [@amigolindu](https://github.com/amigolindu) o cenário, os shaders, a água, o ciclo dia e noite e os efeitos visuais.

## O que eu fiz

Escrevi toda a programação de gameplay da versão atual:

- Um gerador de anel que sorteia um caminho fechado novo a cada partida e continua sendo um ciclo válido enquanto fica irregular, sempre com espaço para o Boss no meio.
- NavMesh assado em tempo de jogo, com links de pulo entre as ilhas.
- Cartas data-driven que simulam uma volta inteira antes de aceitar uma colocação.
- Combate automático, IA dos inimigos e save em JSON.

## Como foi feito

Quebrei o GDD em requisitos, desenhei a arquitetura e implementei com um fluxo assistido por IA: agentes de código dirigidos e revisados por mim, com cada mudança validada dentro do Unity Editor.

## Em números

- **~5,6 mil** linhas de C#
- **3** pessoas na equipe
