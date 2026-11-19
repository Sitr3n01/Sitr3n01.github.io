---
slug: ia-local-server
ordem: 2
kanji: 知
sakura: koeda
categoria: IA privada
titulo: Local AI Provider
card: Assistentes de programação com IA rodando no próprio computador. Código, conversas e senhas não saem da máquina.
tags: IA privada · RAG · MCP
papel: Projeto pessoal · arquitetura e desenvolvimento
periodo: 2026
status: Canary v2
stack: Go, llama.cpp, Model Context Protocol, Windows API, PowerShell, AMD ROCm, GitHub Actions, CodeQL
repo: https://github.com/Sitr3n01/local-ai-provider
---

Um servidor que coloca a IA para trabalhar dentro do próprio computador. Ferramentas como Claude Code, Codex e OpenCode passam a conversar com um modelo local, e código, conversas e credenciais ficam na máquina.

## O desafio

Assistentes de programação com IA costumam enviar tudo o que você digita para servidores de terceiros. Para quem lida com código confidencial ou dados sensíveis, esse é um risco difícil de aceitar.

## A solução

- **Privado por construção.** O servidor só aceita conexões vindas do próprio computador e não tem plano B na nuvem: se algo dá errado, ele para em vez de enviar dados para fora.
- **Encaixa no que já existe.** Fala o mesmo idioma da API da OpenAI, então basta apontar as ferramentas de IA mais usadas para ele.
- **Memória longa.** Acertou 120 de 120 testes de memória com até 240 mil tokens na conversa, o equivalente a centenas de páginas de texto.
- **Rápido.** Gera cerca de 50 tokens por segundo mesmo com 120 mil tokens no contexto, e o próprio servidor acrescenta menos de 20 ms de espera.
- **Funciona sozinho.** Roda como serviço do Windows, com ícone na bandeja e um painel de monitoramento no navegador.
- **Transparente quando erra.** Quando o primeiro protótipo gravou uma credencial nos logs locais, publiquei um [relatório de incidente](https://github.com/Sitr3n01/local-ai-provider/blob/main/incident-reports/2026-07-20-panel-zstd-credential-exposure.md) e transformei "logs só com metadados" em regra verificada por testes.

## Em números

- **18,2 ms** de espera extra no pior caso típico (p95), contra um limite de 50 ms
- **120/120** nos testes de memória com até 240 mil tokens
- **50,4 tok/s** de geração com 120 mil tokens no contexto
- **728** testes automáticos
- **22** decisões de arquitetura documentadas, mais um modelo de ameaças

## Por dentro

É um plano de inferência e controle de admissão na frente do llama.cpp, mais o encanamento de Windows para rodá-lo como serviço supervisionado.

- **11 executáveis Go:** edge, supervisor com contenção por Job Object do Windows, app de bandeja, monitor no navegador e servidores MCP.
- **Invariantes de segurança verificados por testes.** Todo listener é loopback literal, o header `Authorization` do cliente nunca chega ao modelo, não existe fallback para a nuvem e os logs só têm metadados. Rota, modelo ou encoding desconhecido falha fechado.
- **Qualidade na CI:** Staticcheck, govulncheck, race detector, Gitleaks no histórico completo e CodeQL. As releases saem com SBOM e somas SHA-256.

## Status

Construído para uso pessoal com agentes de código e em uso para esse fim, ainda identificado como canary. Os modelos passam por um gate de promoção, e a produção fica bloqueada até a última evidência chegar. O próximo passo é qualificar o servidor para produção, a começar pela revalidação física do perfil de contexto longo.
