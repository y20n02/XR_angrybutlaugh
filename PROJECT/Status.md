# Status — 웃으며 화내기

## Implemented

- Korean retro visual-novel title, help, scenario selection, per-scenario difficulty unlocks, conversation, results, loss, collection, and retry routes
- Three distinct CSS scene backdrops and generated 2D anime character portraits for office, team project, and part-time work
- Nine unique scripts (three difficulties per scenario), each with three Fever Time phrases
- Korean IME-aware controlled input, live correct/error/accuracy highlighting, Backspace correction, Enter submission, per-difficulty timer and typo tolerance, speed/accuracy scoring, minimum send-time rule, timeout/typo/profanity reactions
- Anger, social-life, and opponent-mental gauges; rage-control timing mini-game; five-second stare-down mash mini-game; three sequentially falling Fever Time phrases with moving positions and fail-line collision
- Happy ending and loss-to-bedroom transition into timed blanket-kick practice; scenario/difficulty progression, certificates, and all-certificate master award
- Browser localStorage persistence for independent scenario unlocks and certificates
- Optional synthesized retro sound effects, typewriter dialogue reveal, CRT scanlines, pixel-style panels, and CSS-based portrait fallback
- Live DebugPanel schema for gameplay, mini-game, effect volume, and UI geometry tuning
- Player-facing copy and scenario dialogue externalized to the Korean locale file; asset manifest documents portrait resources

## Verification

- `bun run build` succeeds.
- `bunx tsc --noEmit -p tsconfig.app.json` succeeds.
- `bun run lint` is currently unavailable because this template has no ESLint v9 flat-config file.

## Legacy scaffold

- Phaser `GameComponent`, `Game.ts`, and `MainScene.ts` remain in the project but are no longer mounted by `App.tsx`.
- The active game does not use GameServer, online sessions, or network features.
