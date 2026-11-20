---
categoria: PC gaming
card: A console-style interface for Windows 11 that gives controller access to games, audio, recording, and performance without leaving the game.
tags: Windows 11 · DualSense · Steam
papel: Personal solo project · product and development
periodo: Oct–Nov 2026
status: v3.0.0 candidate
---

A gaming hub designed for the controller. In the Xbox full screen experience on Windows 11, the DualSense PS button opens, on top of the game, the functions that previously required a mouse and keyboard.

## The challenge

The full screen experience on Windows 11 brings the PC closer to a console, but the built-in Game Bar was designed for the Xbox controller and app. With Steam as the home screen and a PlayStation controller, the PS button is captured by Steam, the Game Bar does not recognize Steam games, and overlays compete for controller input.

## The solution

- **Centralized access.** Resume, pause, or close the running game, along with shortcuts, open apps, and recent games, all on the first screen.
- **Conflict-free control.** The bar opens when the PS button is released, takes over navigation, and returns control to Steam when it closes.
- **Safe game switching.** It closes the current game, waits for Steam to end the session, and only then opens the next one, so the Steam overlay never gets stuck on screen.
- **Audio, recording, and performance in one place.** Per-app volume, microphone, AMD replay and recording, FPS, and sensors. When a value is not available, the interface displays "unavailable", never an estimate.
- **Program search with the controller,** with a virtual keyboard, accent-insensitive matching, and search by initials.
- **Optional extras:** Logitech headset battery, power control for Samsung TVs, and a PC setting to wake from the PS button.
- **Non-invasive integration.** It uses only public Windows features, does not modify Microsoft files, and installs no services or drivers.

## Key figures

- **30–138 ms** for Steam to receive a command, compared with more than 1 s through the default path
- **95.9%** less layout work on each panel switch
- **1.0 MB** executable, with no test code inside
- **22** verification modes required for each version
- **114** documented decisions

## Technical overview

- **A resident WPF process** on the .NET Framework that already ships with Windows: nothing to install, no services, no drivers.
- **Activation that fails closed.** The Xbox mode state comes from the official API; if it is unknown, the bar does not open. Focus returns to the exact window it came from.
- **Processes by identity.** Pause, resume, and close verify the PID and creation time, and a journal written before each pause allows games to be resumed after a crash.
- **Invariants in the gate.** The DualSense is read only (no LED, vibration, or trigger output is sent), and the gate rejects injection APIs such as `WriteProcessMemory` and `CreateRemoteThread` in the code.
- **Two builds, one source.** The product and the test build compile from the same code; each verification round produces a receipt tied to the executable's SHA-256, and the gate rejects outdated or tampered receipts.
- **Process:** an individual project developed with coding assistants (Claude Code and OpenAI Codex). I set the direction, approve the decisions, and determine what has been validated; every change goes through the same gate.

## Status

Release candidate v3.0.0, with physical validation pending. The features are implemented and have passed the local gate, and the application is in daily use on my computer, but no release has been published yet. It was built for one setup and tested on one computer. Next steps: the physical test matrix in Xbox mode (Steam, DSX, real games, TV) and CI on GitHub.
