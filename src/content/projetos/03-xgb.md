---
slug: xgb
ordem: 3
kanji: 遊
sakura: kosa
categoria: Jogos no PC
titulo: XGB
card: Interface de console para o Windows 11, com acesso a jogos, áudio, gravação e desempenho pelo controle, sem sair da partida.
tags: Windows 11 · DualSense · Steam
papel: Projeto pessoal, solo · produto e desenvolvimento
periodo: Out.–nov. de 2026
status: v3.0.0 candidata
stack: C#, WPF, .NET Framework 4.8, Windows API, Steam, DualSense (HID), AMD ADLX, HWiNFO, RTSS, GitHub Actions, CodeQL
repo: https://github.com/Sitr3n01/XGB_P
---

Uma central de jogo projetada para o controle. No modo Xbox de tela cheia do Windows 11, o botão PS do DualSense abre, sobre o jogo, as funções que antes exigiam mouse e teclado.

## O desafio

O modo de tela cheia do Windows 11 aproxima o PC da experiência de um console, mas a barra de jogo original foi pensada para o controle e o app do Xbox. Com a Steam como tela inicial e um controle de PlayStation, o botão PS é capturado pela Steam, a barra não reconhece os jogos da Steam e as sobreposições disputam a entrada do controle.

## A solução

- **Acesso centralizado.** Retomar, pausar ou fechar o jogo em execução, atalhos, aplicativos abertos e jogos recentes já na primeira tela.
- **Controle sem conflito.** A barra abre quando o botão PS é solto, assume a navegação e devolve o controle à Steam ao ser fechada.
- **Troca de jogo segura.** Encerra o jogo atual, aguarda a Steam finalizar a sessão e só então abre o próximo, sem que a sobreposição da Steam fique presa na tela.
- **Áudio, gravação e desempenho em um só lugar.** Volume por app, microfone, replay e gravação da AMD, FPS e sensores. Quando um dado não está disponível, a interface exibe "indisponível", nunca um valor estimado.
- **Busca de programas pelo controle,** com teclado virtual, sem exigir acentos e também pelas iniciais.
- **Extras opcionais:** bateria de headsets Logitech, controle de energia de TVs Samsung e configuração do PC para despertar pelo botão PS.
- **Integração não invasiva.** Usa apenas recursos públicos do Windows, não altera arquivos da Microsoft e não instala serviços nem drivers.

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
- **Duas builds, uma fonte.** O produto e a build de testes compilam do mesmo código; cada rodada de verificação gera um recibo amarrado ao SHA-256 do executável, e o gate recusa recibos desatualizados ou adulterados.
- **Processo:** projeto individual desenvolvido com assistentes de código (Claude Code e OpenAI Codex). Defino a direção, aprovo as decisões e determino o que foi validado; toda mudança passa pelo mesmo gate.

## Status

Candidata v3.0.0, com a validação física pendente. As funções estão implementadas, passaram no gate local e o aplicativo está em uso diário no meu computador, mas ainda não há release publicada. Foi feito para uma configuração e testado em um computador. Próximos passos: a matriz física no modo Xbox (Steam, DSX, jogos reais, TV) e a CI no GitHub.
