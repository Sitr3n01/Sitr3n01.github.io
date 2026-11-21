---
enderecos_antigos: ia-local-server
ordem: 2
kanji: 知
sakura: koeda
categoria: IA privada
titulo: Local AI Provider
card: Servidor que permite usar assistentes de programação com IA sem enviar código, conversas ou credenciais a serviços de terceiros.
tags: IA privada · MCP · LLM local
papel: Projeto pessoal · arquitetura e desenvolvimento
periodo: 2026
status: Canary v2
stack: Go, llama.cpp, Model Context Protocol, Windows API, PowerShell, AMD ROCm, GitHub Actions, CodeQL
repo: https://github.com/Sitr3n01/local-ai-provider
---

Um servidor que executa modelos de IA no próprio computador. Ferramentas como Claude Code, Codex e OpenCode passam a se comunicar com um modelo local, e código, conversas e credenciais permanecem na máquina.

## O desafio

Assistentes de programação com IA costumam enviar todo o conteúdo digitado a servidores de terceiros. Para quem trabalha com código confidencial ou dados sensíveis, esse risco é difícil de aceitar.

## A solução

- **Privacidade por padrão.** O servidor aceita apenas conexões do próprio computador e não tem alternativa na nuvem: em caso de falha, interrompe a operação em vez de enviar dados para fora.
- **Compatibilidade.** Segue o mesmo formato da API da OpenAI, o que permite conectar as ferramentas de IA mais usadas sem adaptações.
- **Contexto longo.** Obteve 120 acertos em 120 testes de memória com até 240 mil tokens na conversa, o equivalente a centenas de páginas de texto.
- **Desempenho.** Gera cerca de 50 tokens por segundo mesmo com 120 mil tokens no contexto, e o servidor acrescenta menos de 20 ms de latência.
- **Operação autônoma.** Funciona como serviço do Windows, com ícone na área de notificação e um painel de monitoramento no navegador.
- **Transparência em incidentes.** Quando o primeiro protótipo registrou uma credencial nos logs locais, publiquei um [relatório de incidente](https://github.com/Sitr3n01/local-ai-provider/blob/main/incident-reports/2026-07-20-panel-zstd-credential-exposure.md) e tornei "logs apenas com metadados" uma regra verificada por testes.

## Em números

- **18,2 ms** de espera extra no pior caso típico (p95), contra um limite de 50 ms
- **120/120** nos testes de memória com até 240 mil tokens
- **50,4 tok/s** de geração com 120 mil tokens no contexto
- **728** testes automáticos
- **22** decisões de arquitetura documentadas, mais um modelo de ameaças

## Por dentro

É uma camada de inferência e controle de admissão à frente do llama.cpp, com a integração ao Windows necessária para executá-lo como serviço supervisionado.

- **11 executáveis Go:** edge, supervisor com contenção por Job Object do Windows, app de bandeja, monitor no navegador e servidores MCP.
- **Invariantes de segurança verificados por testes.** Todo listener é loopback literal, o header `Authorization` do cliente nunca chega ao modelo, não existe fallback para a nuvem e os logs só têm metadados. Rota, modelo ou encoding desconhecido falha fechado.
- **Qualidade na CI:** Staticcheck, govulncheck, race detector, Gitleaks no histórico completo e CodeQL. As releases saem com SBOM e somas SHA-256.

## Status

Construído para uso pessoal com agentes de código e em uso para esse fim, ainda identificado como canary. Os modelos passam por um gate de promoção, e a produção permanece bloqueada até que a última evidência seja obtida. O próximo passo é qualificar o servidor para produção, a começar pela revalidação física do perfil de contexto longo.
