---
ordem: 5
kanji: 獣
sakura: ogi
categoria: Jogo
titulo: ExoBeast
card: Jogo cooperativo de defesa de torres para até quatro jogadores online. Desenvolvi o multiplayer: autenticação, salas e sincronização da partida.
tags: Unity 6 · Multiplayer online · Equipe
papel: Multiplayer e rede, numa equipe de três
periodo: Jun.–dez. de 2026 · Brasília Game Hub
status: Em desenvolvimento
stack: Unity 6, C#, Netcode for GameObjects, Unity Transport, Epic Online Services, Unity Relay, FMOD, NUnit
repo: https://github.com/Matt040205/ExoBeast
---

Um jogo cooperativo de defesa de torres para 1 a 4 jogadores online. Cada jogador é um comandante: posiciona torres e armadilhas e defende o objetivo contra ondas de inimigos. Sou responsável pelo multiplayer, que conecta e sincroniza os jogadores.

## O desafio

O multiplayer está entre os sistemas mais complexos de um jogo. Todos os jogadores precisam ver a mesma partida ao mesmo tempo, autenticar-se e encontrar a sala correta, sem que nenhuma chave de acesso seja exposta.

## Minha atuação

Sou responsável pelo multiplayer de ponta a ponta:

- **Autenticação e salas.** Login e salas pela Epic Online Services, conexão entre jogadores pelo Unity Relay e o fluxo de sessão no Netcode for GameObjects.
- **Partida sincronizada.** Jogadores, inimigos, armadilhas e construções sincronizados, com o anfitrião como autoridade sobre o estado da partida.
- **Refatoração do lobby.** Oito sprints sob um quality gate no estilo ratchet, em que os indicadores de qualidade só podem melhorar.
- **Áudio e ferramentas.** Integração com FMOD e duas ferramentas de editor para a equipe: Exo Config e uma ponte Blender → Unity.
- **Proteção de credenciais.** As credenciais do EOS nunca são versionadas: vêm de variáveis de ambiente, de um JSON local ignorado pelo Git ou de configs geradas no build. Sem credencial, o build para com um erro claro, e os segredos nunca vão para os logs.

## Em números

- **1–4** jogadores online
- **~9,1 mil** linhas de C# só no multiplayer
- **~140** testes automáticos
- **8** sprints de refatoração do lobby

## Equipe

Projeto de equipe em Unity 6, incubado no programa Brasília Game Hub. Atualmente, é uma vertical slice com o multiplayer em funcionamento e o loop principal de jogo. [@Matt040205](https://github.com/Matt040205) cuida da arte, das cenas, da UI e de sistemas de gameplay, e [@amigolindu](https://github.com/amigolindu) da animação dos inimigos e dos efeitos de partículas.

## Próximos passos

Validar sessões online pela internet pública, atrás de NAT.
