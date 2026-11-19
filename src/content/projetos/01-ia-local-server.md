---
slug: ia-local-server
ordem: 1
kanji: 知
sakura: koeda
categoria: IA local
titulo: IA_local_server
card: RAG, servidores MCP, inferência local e agentes de IA.
tags: RAG · MCP · LLM local
papel: Projeto pessoal · arquitetura e desenvolvimento
periodo: 2026
status: Canary v2
stack: Go, llama.cpp, Model Context Protocol, Windows API, PowerShell, AMD ROCm, GitHub Actions, CodeQL
repo: https://github.com/Sitr3n01/local-ai-provider
---

Servidor de inferência em Go, compatível com a API da OpenAI e restrito a loopback, que permite rodar agentes de código como Codex, Claude Code e OpenCode contra um modelo local, sem que código-fonte, prompts ou credenciais saiam da máquina.

## Contexto

Construí este servidor para uso pessoal com agentes de código locais. Ele funciona para o uso a que se destina e segue identificado como canary, sem qualificação formal de produção.

## O que eu fiz

É um plano de inferência e controle de admissão na frente do llama.cpp, mais o encanamento de Windows para rodá-lo como serviço supervisionado.

- **11 executáveis Go:** edge, supervisor com contenção por Job Object do Windows, app de bandeja, monitor no navegador e servidores MCP.
- **Invariantes de segurança verificados por testes.** Todo listener é loopback literal, o header `Authorization` do cliente nunca chega ao modelo, não existe fallback para a nuvem e os logs só têm metadados. Rota, modelo ou encoding desconhecido falha fechado.
- **Qualidade na CI:** Staticcheck, govulncheck, race detector, Gitleaks no histórico completo e CodeQL. As releases saem com SBOM e somas SHA-256.

## Em números

- **18,2 ms** de overhead p95 no edge (gate de 50 ms)
- **120/120** de retenção até 240k tokens
- **50,4 tok/s** de decode com 120k tokens no contexto
- **728** testes e subtestes Go
- **22** ADRs, mais um threat model

## Status

Os modelos passam por um gate de promoção, e a produção fica bloqueada até a última evidência chegar. Quando o protótipo v1 vazou uma credencial para os logs locais, documentei o caso num [relatório de incidente aberto](https://github.com/Sitr3n01/local-ai-provider/blob/main/incident-reports/2026-07-20-panel-zstd-credential-exposure.md) e transformei "logs só com metadados" em invariante testado.

O próximo passo é qualificar o servidor para produção, a começar pela revalidação física do perfil de contexto longo.
