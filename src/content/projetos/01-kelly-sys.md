---
slug: kelly-sys
ordem: 1
kanji: 報
sakura: sanbon
categoria: Web · Cliente real
titulo: News Portal
card: Dois sites no ar para um cliente real, com um painel onde a equipe escreve, aprova e agenda publicações por conta própria.
tags: Em produção · Desde junho de 2026
papel: Desenvolvimento e operação, de ponta a ponta
periodo: No ar desde junho de 2026
status: Em produção
stack: Python, Django 5.2, Wagtail 7.4, PostgreSQL, HTMX, Alpine.js, Tailwind CSS, three.js, GSAP, Docker, Nginx, GitHub Actions
repo: https://github.com/Sitr3n01/news_portal
site: https://kellyfarias.com.br/news/, https://komuniki.com.br
---

Dois sites em produção para um cliente real: a [Komuniki](https://komuniki.com.br), escola de comunicação e artes, e o [Blog da Kelly](https://kellyfarias.com.br/news/), portal de notícias. Construí os dois sobre uma única base e cuido de tudo, do código ao servidor, desde junho de 2026.

## O desafio

Dois sites com identidades próprias costumam significar dois sistemas, dois servidores e o dobro de manutenção. Um portal de notícias ainda precisa de uma rotina editorial com várias pessoas publicando, sem que nada saia sem revisão.

## O que o cliente recebeu

- **Uma base, dois sites.** Komuniki e Blog da Kelly saem do mesmo código: cada melhoria chega aos dois de uma vez.
- **Um painel que a equipe usa todo dia.** O repórter escreve, o editor aprova e o sistema publica na hora marcada. Só o que foi aprovado vai ao ar.
- **Um visual que prende a atenção.** Abertura animada em 3D e textos que surgem conforme a leitura avança, com uma versão calma para quem configurou o aparelho para reduzir movimento.
- **Segurança levada a sério.** Login com Google, bloqueio de robôs e de tentativas repetidas de senha, e uma auditoria interna que encontrou 7 falhas, todas corrigidas e cobertas por testes.
- **Custo de servidor baixo.** Tudo roda num servidor pequeno (1 processador virtual e 4 GB de memória), protegido pela Cloudflare.

## Em números

- **2** sites no ar com um só código
- **823** testes automáticos
- **7** falhas de segurança corrigidas, 3 delas graves
- **−98%** de espaço no cache de build (23,95 GB → 442 MB)
- **83,5%** dos caminhos do código cobertos por testes (mínimo exigido: 82%)

## Por dentro

- **Base:** Django 5.2 + Wagtail 7.4 sobre PostgreSQL. O Django admin (Unfold) e o admin do Wagtail viraram um painel só, com fluxo editorial de revisão e agendamento.
- **Interface:** hero em WebGL com three.js e shaders próprios, reveal de texto com GSAP, tudo recuando com `prefers-reduced-motion`.
- **Segurança:** a revisão cobriu cinco categorias. CSP com nonce, checagem de extensão e MIME nos uploads, django-axes e Cloudflare Turnstile.
- **Operação:** Docker Compose atrás do Cloudflare. O deploy é puxado pela VPS a partir de uma tag aprovada, então o CI não guarda credencial do servidor. CodeQL, pip-audit, varredura de segredos e `master` protegido.
- **Bastidores:** achei e corrigi um deploy que ficou dois meses repetindo em loop e imagens Docker que cresciam de forma quadrática com os dumps do banco. Foi essa correção que levou o cache de build de 23,95 GB para 442 MB.

## Próximos passos

Rodar a suíte de testes contra PostgreSQL no CI e migrar para o Wagtail 8.
