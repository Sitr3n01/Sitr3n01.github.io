---
slug: xgb
ordem: 3
kanji: 遊
sakura: kosa
categoria: Jogos no PC
titulo: XGB
card: Transforma o PC com Windows 11 num console: um toque no botão PS abre jogos, som, gravação e desempenho por cima do jogo.
tags: Windows 11 · DualSense · Steam
papel: Projeto pessoal, solo · produto e desenvolvimento
periodo: Out.–nov. de 2026
status: v3.0.0 candidata
stack: C#, WPF, .NET Framework 4.8, Windows API, Steam, DualSense (HID), AMD ADLX, HWiNFO, RTSS, GitHub Actions, CodeQL
repo: https://github.com/Sitr3n01/XGB_P
---

Uma central de jogo feita para o controle. No modo Xbox de tela cheia do Windows 11, um toque no botão PS do DualSense abre, por cima do jogo, tudo o que antes pedia mouse e teclado.

## O desafio

O modo de tela cheia do Windows 11 deixa o PC com cara de console, mas a barra de jogo original foi pensada para o controle do Xbox e o app Xbox. Com a Steam como tela inicial e um controle de PlayStation, o botão PS pertence à Steam, a barra não conhece os jogos da Steam e cada sobreposição disputa o controle.

## A solução

- **Um botão, tudo à mão.** Voltar ao jogo, pausar ou fechar o que está aberto, atalhos, apps abertos e jogos recentes logo na primeira tela.
- **Controle sem disputa.** A barra só abre quando você solta o PS, assume a navegação e devolve o controle à Steam ao fechar.
- **Troca de jogo limpa.** Ela fecha o jogo atual, espera a Steam encerrar a sessão e só então abre o próximo, sem a sobreposição da Steam presa na tela.
- **Som, gravação e desempenho num lugar só.** Volume por app, microfone, replay e gravação da AMD, FPS e sensores. Quando falta um dado, aparece "indisponível", nunca um número inventado.
- **Busca de programas pelo controle,** com teclado virtual, sem precisar de acento e pelas iniciais.
- **Extras opcionais:** bateria de headsets Logitech, ligar e desligar TVs Samsung e preparar o PC para acordar pelo botão PS.
- **Respeita o sistema.** Usa só recursos públicos do Windows, não toca em nenhum arquivo da Microsoft e não instala serviço nem driver.

## Em números

- **30–138 ms** para a Steam receber um comando, contra mais de 1 s pelo caminho padrão
- **95,9%** menos trabalho de layout a cada troca de painel
- **1,0 MB** de executável, sem nenhum código de teste dentro
- **22** modos de verificação exigidos a cada versão
- **114** decisões documentadas

## Por dentro

- **Um processo WPF residente** no .NET Framework que já vem com o Windows: nada para instalar, nenhum serviço, nenhum driver.
- **Ativação que falha fechada.** O estado do modo Xbox vem da API oficial; se ele for desconhecido, a barra não abre. O foco volta para a janela exata de onde veio.
- **Processos por identidade.** Pausar, retomar e fechar conferem PID e horário de criação, e um diário gravado antes de cada pausa permite retomar jogos depois de uma queda.
- **Invariantes no gate.** O DualSense é só lido (nenhum LED, vibração ou gatilho enviado), e o gate rejeita no código APIs de injeção como `WriteProcessMemory` e `CreateRemoteThread`.
- **Duas builds, uma fonte.** O produto e a build de testes compilam do mesmo código; cada rodada de verificação gera um recibo amarrado ao SHA-256 do executável, e o gate recusa recibos velhos ou adulterados.
- **Como foi feito:** projeto solo com assistentes de código (Claude Code e OpenAI Codex). Eu defino a direção, aprovo as decisões e decido o que foi validado; toda mudança passa pelo mesmo gate.

## Status

Candidata v3.0.0, com a validação física pendente. As funções estão implementadas, passaram no gate local e o app é usado todo dia na minha máquina, mas ainda não há release publicada. Foi feito para uma configuração e testado em um computador. Próximos passos: a matriz física no modo Xbox (Steam, DSX, jogos reais, TV) e a CI no GitHub.
