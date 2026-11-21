---
enderecos_antigos: kelly-sys
ordem: 1
kanji: 報
sakura: sanbon
categoria: Web · Cliente real
titulo: News Portal
card: Desenvolvimento e operação de dois sites em produção para um cliente real, com fluxo editorial de redação, aprovação e agendamento.
tags: Em produção · Desde junho de 2026
papel: Desenvolvimento e operação, de ponta a ponta
periodo: Desde junho de 2026
status: Em produção
stack: Python, Django 5.2, Wagtail 7.4, PostgreSQL, HTMX, Alpine.js, Tailwind CSS, three.js, GSAP, Docker, Nginx, GitHub Actions
repo: https://github.com/Sitr3n01/news_portal
site: https://kellyfarias.com.br/news/, https://komuniki.com.br
---

Dois sites em produção para um cliente real: a [Komuniki](https://komuniki.com.br), escola de comunicação e artes, e o [Blog da Kelly](https://kellyfarias.com.br/news/), portal de notícias. Desenvolvi os dois sobre uma base única e sou responsável por todo o ciclo, do código à infraestrutura, desde junho de 2026.

## O desafio

Dois sites com identidades próprias costumam significar dois sistemas, dois servidores e o dobro de manutenção. Um portal de notícias ainda precisa de uma rotina editorial com várias pessoas publicando, sem que nada saia sem revisão.

## Entregas

- **Uma base, dois sites.** Komuniki e Blog da Kelly saem do mesmo código: cada melhoria é aplicada aos dois ao mesmo tempo.
- **Painel editorial de uso diário.** O repórter redige, o editor aprova e o sistema publica no horário agendado. Somente conteúdo aprovado é publicado.
- **Identidade visual com movimento.** Abertura animada em 3D e textos revelados ao longo da leitura, com uma versão sem animações para quem ativou a redução de movimento no sistema.
- **Segurança.** Login com Google, proteção contra robôs e contra tentativas repetidas de senha, e uma auditoria interna que identificou 7 falhas, todas corrigidas e cobertas por testes.
- **Baixo custo de infraestrutura.** A operação completa funciona em um servidor de 1 processador virtual e 4 GB de memória, protegido pela Cloudflare.

## Em números

- **2** sites em produção com um só código
- **823** testes automáticos
- **7** falhas de segurança corrigidas, 3 delas graves
- **−98%** de espaço no cache de build (23,95 GB → 442 MB)
- **83,5%** dos caminhos do código cobertos por testes (mínimo exigido: 82%)

## Por dentro

- **Base:** Django 5.2 + Wagtail 7.4 sobre PostgreSQL. O Django admin (Unfold) e o admin do Wagtail foram unificados em um único painel, com fluxo editorial de revisão e agendamento.
- **Interface:** hero em WebGL com three.js e shaders próprios e revelação de texto com GSAP, com alternativa estática sob `prefers-reduced-motion`.
- **Segurança:** a revisão cobriu cinco categorias. CSP com nonce, checagem de extensão e MIME nos uploads, django-axes e Cloudflare Turnstile.
- **Operação:** Docker Compose atrás do Cloudflare. A VPS busca o deploy a partir de uma tag aprovada, de modo que o CI não armazena credenciais do servidor. CodeQL, pip-audit, varredura de segredos e `master` protegido.
- **Manutenção:** identifiquei e corrigi um deploy que se repetiu em loop por dois meses e imagens Docker que cresciam de forma quadrática com os dumps do banco. Essa correção reduziu o cache de build de 23,95 GB para 442 MB.

## Próximos passos

Rodar a suíte de testes contra PostgreSQL no CI e migrar para o Wagtail 8.
