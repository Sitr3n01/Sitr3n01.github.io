---
slug: kelly-sys
ordem: 2
kanji: 報
sakura: sanbon
categoria: Web
titulo: kelly_sys
card: Portal de notícias no ar para um cliente desde junho de 2026.
tags: Em produção
papel: Desenvolvimento e operação, de ponta a ponta
periodo: No ar desde junho de 2026
status: Em produção
stack: Python, Django 5.2, Wagtail 7.4, PostgreSQL, HTMX, Alpine.js, Tailwind CSS, three.js, GSAP, Docker, Nginx, GitHub Actions
repo: https://github.com/Sitr3n01/news_portal
site: https://kellyfarias.com.br/news/
---

Um único código Django 5.2 + Wagtail 7.4 por trás de dois sites em produção para um cliente real e do painel editorial que a equipe usa todo dia.

## Contexto

A [Komuniki](https://komuniki.com.br) é o site de uma escola de comunicação e artes, e o [Blog da Kelly](https://kellyfarias.com.br/news/) é um portal de notícias. Os dois saem do mesmo código. Construí e opero tudo de ponta a ponta, e está no ar desde junho de 2026.

## O que eu fiz

- **Movimento que respeita quem lê.** Hero em WebGL com three.js e shaders próprios, e reveal de texto com GSAP. Tudo isso recua com `prefers-reduced-motion`.
- **Um painel que a equipe usa de verdade.** O Django admin (Unfold) e o admin do Wagtail viraram um painel só, com fluxo editorial: o repórter escreve, o editor aprova, e o agendamento só publica revisão aprovada.
- **Revisão interna de segurança.** Uma revisão em cinco categorias achou 7 problemas (3 altos), todos corrigidos com teste de regressão. CSP com nonce, checagem de extensão e MIME nos uploads, login com Google, django-axes e Cloudflare Turnstile.
- **Operação numa VPS pequena.** Docker Compose atrás do Cloudflare numa VPS de 1 vCPU e 4 GB. O deploy é puxado pela VPS a partir de uma tag aprovada, então o CI não guarda credencial do servidor.

## Em números

- **823** testes
- **82%** de cobertura de branches exigida (hoje, 83,5%)
- **7** problemas de segurança corrigidos, 3 deles altos
- **23,95 GB → 442 MB** de cache de build do Docker

## Bastidores

Achei e corrigi um deploy que ficou dois meses repetindo em loop e imagens Docker que cresciam de forma quadrática com os dumps do banco. Foi essa correção que levou o cache de build de 23,95 GB para 442 MB. As travas de qualidade incluem CodeQL, pip-audit, varredura de segredos e `master` protegido.

## Próximos passos

Rodar a suíte de testes contra PostgreSQL no CI e migrar para o Wagtail 8.
