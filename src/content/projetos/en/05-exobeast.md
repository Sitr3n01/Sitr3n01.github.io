---
categoria: Game
card: A cooperative tower defense game for up to four online players. I developed the multiplayer: authentication, lobbies, and match synchronization.
tags: Unity 6 · Online multiplayer · Team
papel: Multiplayer and networking, in a team of three
periodo: Jun–Dec 2026 · Brasília Game Hub
status: In development
---

A cooperative tower defense game for 1 to 4 online players. Each player is a commander who places towers and traps and defends the objective against waves of enemies. I am responsible for the multiplayer, which connects and synchronizes the players.

## The challenge

Multiplayer is among the most complex systems in a game. All players need to see the same match at the same time, authenticate, and find the correct lobby, without exposing any access keys.

## My contribution

I am responsible for the multiplayer from end to end:

- **Authentication and lobbies.** Sign-in and lobbies through Epic Online Services, player connections through Unity Relay, and the session flow in Netcode for GameObjects.
- **Synchronized matches.** Players, enemies, traps, and buildings are kept in sync, with the host as the authority over the match state.
- **Lobby refactoring.** Eight sprints under a ratchet-style quality gate, in which quality metrics can only improve.
- **Audio and tools.** FMOD integration and two editor tools for the team: Exo Config and a Blender → Unity bridge.
- **Credential protection.** EOS credentials are never committed: they come from environment variables, a local JSON file ignored by Git, or configs generated at build time. Without credentials, the build stops with a clear error, and secrets never reach the logs.

## Key figures

- **1–4** online players
- **~9.1k** lines of C# in the multiplayer alone
- **~140** automated tests
- **8** lobby refactoring sprints

## Team

A team project in Unity 6, incubated in the Brasília Game Hub program. It is currently a vertical slice with working multiplayer and the core gameplay loop. [@Matt040205](https://github.com/Matt040205) handles the art, scenes, UI, and gameplay systems, and [@amigolindu](https://github.com/amigolindu) handles enemy animation and particle effects.

## Next steps

Validate online sessions over the public internet, behind NAT.
