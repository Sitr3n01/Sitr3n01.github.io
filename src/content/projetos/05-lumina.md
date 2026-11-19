---
slug: lumina
ordem: 5
kanji: 光
sakura: sanbon
categoria: Desktop
titulo: LUMINA
card: App desktop com back-end em FastAPI e interface em React no Electron.
tags: FastAPI · React · Electron
papel: Desenvolvimento
periodo: [preencher]
status: Alpha A.0.1.0
stack: Electron, React, FastAPI, Python, iCal, Telegram Bot API
repo: https://github.com/Sitr3n01/lumina
---

App desktop Windows local-first para quem aluga apartamentos por temporada no Airbnb e no Booking.com: calendários sincronizados, conflitos detectados, documentos e notificações, tudo rodando na máquina do usuário.

## Contexto

Quem anuncia o mesmo imóvel em duas plataformas precisa manter os calendários alinhados e evitar reservas sobrepostas. O LUMINA junta essa rotina num aplicativo só, distribuído como instalador Windows: back-end, banco e interface rodam localmente, sem servidor externo.

## O que tem dentro

- **Calendário:** sincronização via iCal com Airbnb e Booking.com a cada 30 minutos.
- **Conflitos:** detecção de sobreposições entre plataformas, com resolução manual.
- **Dashboard:** ocupação mensal, receita, próximos check-ins e alertas.
- **Documentos:** autorização de condomínio gerada em `.docx`, com logo personalizado.
- **Notificações:** e-mails de confirmação e lembrete de check-in, e um bot do Telegram que avisa em tempo real e permite aprovar reservas.
- **IA:** sugestões de preço e um assistente de chat.

## Status

Release Alpha A.0.1.0, em desenvolvimento ativo.
