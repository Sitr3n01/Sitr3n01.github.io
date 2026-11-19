---
slug: exobeast
ordem: 3
kanji: 獣
sakura: ogi
categoria: Jogo
titulo: ExoBeast
card: Jogo multiplayer em Unity 6 com Netcode for GameObjects e Epic Online Services.
tags: Unity 6 · NGO · EOS
papel: Multiplayer e rede, numa equipe de três
periodo: Jun.–dez. de 2026 · Brasília Game Hub
status: Em desenvolvimento
stack: Unity 6, C#, Netcode for GameObjects, Unity Transport, Epic Online Services, Unity Relay, FMOD, NUnit
repo: https://github.com/Matt040205/ExoBeast
---

Tower defense cooperativo para 1 a 4 jogadores online: comandantes defendem um objetivo contra ondas de inimigos, posicionando torres e armadilhas em volta dele.

## Contexto

Projeto de equipe em Unity 6, incubado no programa Brasília Game Hub. O estado atual é uma vertical slice com o fluxo de multiplayer funcionando e o loop principal de jogo. Na equipe, [@Matt040205](https://github.com/Matt040205) cuida da arte, das cenas, da UI e de sistemas de gameplay, e [@amigolindu](https://github.com/amigolindu) da animação dos inimigos e dos efeitos de partículas.

## O que eu fiz

Sou responsável pelo multiplayer de ponta a ponta: login e lobbies no Epic Online Services, Unity Relay e o fluxo de sessão no Netcode for GameObjects. O host é a autoridade do estado de jogo.

- Otimizações de rede e sincronização de jogadores, inimigos, armadilhas e construções.
- Uma refatoração do lobby em oito sprints, sob um quality gate no estilo ratchet.
- Integração com FMOD.
- Duas ferramentas de editor: Exo Config e uma ponte Blender → Unity.
- Credenciais do EOS que nunca entram no repositório: elas vêm de variáveis de ambiente, de um JSON local ignorado pelo Git ou de configs geradas em tempo de build. Sem credencial, o build para com um erro claro, e os segredos nunca vão para os logs.

## Em números

- **~9,1 mil** linhas de C# no multiplayer
- **~140** testes NUnit
- **1–4** jogadores online
- **8** sprints de refatoração do lobby

## Próximos passos

Validar sessões online pela internet pública, atrás de NAT.
