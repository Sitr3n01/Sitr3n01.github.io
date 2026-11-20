---
categoria: Game
card: Card-based strategy with procedural generation: the hero advances alone through a ring of islands that changes every run, guided by the player's choices.
tags: Unity 6 · Procedural generation · Team
papel: All gameplay programming
periodo: 2026 · Brasília Game Hub
status: Prototype
---

A strategy game in which the player does not control the hero. The hero travels alone through a ring of islands generated from scratch every run, and the player defines the path with cards.

## Gameplay

Lucca, the hero, travels around a closed ring of islands and fights on his own. The player drags island cards onto the map to heal him, give him ammunition, make him stronger, or spawn enemies that grant experience. With each completed lap, Lucca recovers and the enemies grow stronger. The focus is on planning: every card changes the challenges that follow.

## My contribution

I developed all the gameplay programming in the current version:

- **A new world every run.** The generator creates a different closed path on each run, irregular and always valid, with space reserved for the boss at the center.
- **Enemy navigation.** The navigation map is computed during play, including jumps between islands.
- **Card validation.** Before accepting a card, the game simulates a full lap with the card in place.
- **Automatic combat, enemy AI, and saving** of progress.

## Key figures

- **~5.6k** lines of C#
- **3** people on the team
- **1** new map every run

## How it was built

A team project based on a game design document, developed at Brasília Game Hub. I broke the GDD down into requirements, designed the architecture, and implemented it with an AI-assisted workflow: coding agents directed and reviewed by me, with every change validated inside the Unity Editor.

On the team, [@Matt040205](https://github.com/Matt040205) created the 3D models and textures, and [@amigolindu](https://github.com/amigolindu) created the environment, the shaders, the water, the day-night cycle, and the visual effects.

## Technical overview

A ring generator that preserves a valid cycle while remaining irregular, a NavMesh generated at runtime with jump links, data-driven cards with lap simulation before placement, automatic combat, and JSON saves.
