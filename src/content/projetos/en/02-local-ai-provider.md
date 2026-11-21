---
categoria: Private AI
card: A server that makes it possible to use AI coding assistants without sending code, conversations, or credentials to third-party services.
tags: Private AI · MCP · Local LLM
papel: Personal project · architecture and development
periodo: 2026
status: Canary v2
---

A server that runs AI models directly on the computer. Tools such as Claude Code, Codex, and OpenCode communicate with a local model, and code, conversations, and credentials stay on the machine.

## The challenge

AI coding assistants usually send everything that is typed to third-party servers. For anyone working with confidential code or sensitive data, that risk is difficult to accept.

## The solution

- **Privacy by default.** The server only accepts connections from the computer itself and has no cloud fallback: if something fails, it stops instead of sending data elsewhere.
- **Compatibility.** It follows the same API format as OpenAI, which allows the most widely used AI tools to connect without adaptations.
- **Long context.** It scored 120 out of 120 on memory tests with up to 240,000 tokens in the conversation, the equivalent of hundreds of pages of text.
- **Performance.** It generates about 50 tokens per second even with 120,000 tokens in context, and the server adds less than 20 ms of latency.
- **Autonomous operation.** It runs as a Windows service, with an icon in the notification area and a monitoring dashboard in the browser.
- **Transparency in incidents.** When the first prototype recorded a credential in the local logs, I published an [incident report](https://github.com/Sitr3n01/local-ai-provider/blob/main/incident-reports/2026-07-20-panel-zstd-credential-exposure.md) and made "metadata-only logs" a rule enforced by tests.

## Key figures

- **18.2 ms** of added wait in the typical worst case (p95), against a 50 ms limit
- **120/120** on memory tests with up to 240,000 tokens
- **50.4 tok/s** of generation with 120,000 tokens in context
- **728** automated tests
- **22** documented architecture decisions, plus a threat model

## Technical overview

It is an inference and admission-control layer in front of llama.cpp, with the Windows integration required to run it as a supervised service.

- **11 Go executables:** edge, a supervisor with Windows Job Object containment, a tray app, a browser-based monitor, and MCP servers.
- **Security invariants verified by tests.** Every listener is a literal loopback address, the client's `Authorization` header never reaches the model, there is no cloud fallback, and logs contain metadata only. An unknown route, model, or encoding fails closed.
- **Quality in CI:** Staticcheck, govulncheck, the race detector, Gitleaks over the full history, and CodeQL. Releases ship with an SBOM and SHA-256 checksums.

## Status

Built for personal use with coding agents and in use for that purpose, still labeled as canary. Models go through a promotion gate, and production remains blocked until the last piece of evidence is obtained. The next step is to qualify the server for production, starting with the physical revalidation of the long-context profile.
