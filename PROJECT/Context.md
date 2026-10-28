# Context — 2D_angrybutlaugh

## Project Overview

Korean retro visual-novel typing game mounted in a React shell. Gameplay and UI live in `src/game/GameScreen.tsx` so Korean IME composition, accessible keyboard inputs, menus, and CSS-drawn mini-games are native DOM interactions. The old Phaser scaffold remains in `src/game/Game.ts` and `src/game/scenes/MainScene.ts`, but `App.tsx` no longer mounts it. Character art is listed in `src/assets.json`; player-visible copy and all nine scenario/difficulty scripts are in `src/locales/ko.json`.

## Tech Stack

_Exact versions are in `package.json`._

- **Game runtime**: React DOM with requestAnimationFrame timing
- **Legacy scaffold**: Phaser 3 remains installed but is not mounted by the game
- **Shell**: React, `react-dom`
- **Build / Lang**: Vite, TypeScript
- **Styling**: Tailwind CSS
- **Multiplayer (unwired)**: `@agent8/gameserver`
- **Icons (unwired)**: `lucide-react`

## Critical Memory

- Gameplay state, menus, character portraits, typing, mini-games, outcomes, and collections are React-owned in `GameScreen.tsx`.
- The active time loop calls the platform-injected `DebugPanel.frame()` for pause/slow-motion integration. Keep gameplay tunables in the single schema at the top of `GameScreen.tsx`.
- Player-visible strings and scenario scripts belong in `src/locales/ko.json`; generated resource URLs belong in `src/assets.json`.
- `GameComponent` and the Phaser scaffold remain as legacy code but are not part of the active app route.
- Portrait PNGs are explicitly sized by the portrait CSS so source image dimensions never control layout.
- Browser progress is stored in localStorage under `time-to-get-mad-save-v1`; unlock tracks are independent for each scenario.
- The central game frame targets 16:9 and scales to the browser viewport; mini-game movement and timers are driven by the same requestAnimationFrame loop.
