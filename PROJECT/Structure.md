# Structure — 웃으며 화내기

## `src/main.tsx`

Entry point. Mounts `<App />` into `#root` with React 18 `createRoot` under `StrictMode`. Imports `index.css`.

## `src/App.tsx`

Root component. Wraps `<GameScreen />` in a full-viewport `.app` container.

## `src/App.css`, `src/index.css`

Component/global styles. `App.css` pins the app to the viewport. `index.css` holds global typography and reset styles; `src/game/game.css` contains the retro 16:9 game UI and responsive styling.

## `src/assets.json`

Asset manifest for the generated scenario-specific anime portraits used by the React game UI.

## `src/locales/ko.json`

All player-visible Korean copy plus scenario metadata, character names, and unique easy/normal/expert rounds and Fever Time phrases for the office, team-project, and part-time-work scenarios.

## `src/game/GameScreen.tsx`

Active game implementation. Owns title/help/scenario/difficulty menus, IME-safe text entry, timing and accuracy, rage/social/mental meters, reaction states, rage-control and stare-down mini-games, three actually falling Fever Time sentences, victory and loss routes, blanket-kick practice, independent local unlock progression, certificate collection, generated character portraits, optional synthesized sound, and the DebugPanel tuning schema. The animation loop routes delta time through `DebugPanel.frame()`.

## `src/game/game.css`

CRT scanlines, pixel borders, scene backdrops, portrait sizing and CSS fallback, dialogue animation, falling sentence lane and fail line, ending scenes, and responsive styling. Tunable control geometry uses schema-backed CSS custom properties with matching default fallbacks.

## `src/components/GameComponent.tsx`

Legacy React host for Phaser retained for possible future reuse. The current app mounts `GameScreen` directly instead.

## `src/game/Game.ts`

Legacy export `createGame(parent)`. Builds the `Phaser.Types.Core.GameConfig`:

- `type: Phaser.AUTO`, full-window `width`/`height`, `parent` set to the React container id
- `physics.default: 'arcade'` with `gravity.y: 2000` and `debug: false`
- `scene: [MainScene]`
- `scale.mode: Phaser.Scale.RESIZE`, `autoCenter: Phaser.Scale.CENTER_BOTH`

Also installs a `game.events.once('ready', …)` patch that overrides `Sprite`/`Image` `setDisplaySize` + `setScale` and `TweenManager.add` so `scale`/`scaleX`/`scaleY` operate relative to a stored `baseDisplayWidth` / `baseDisplayHeight`. Marked `CRITICAL — LLM/AI MODIFICATION PROHIBITED`.

## `src/game/scenes/MainScene.ts`

Sole scene (`key: 'MainScene'`). In `create()` it sets physics world bounds to the canvas size, paints a `#87CEEB` (sky blue) background, and adds a `60px` tall green (`0x00ff00`) rectangle across the bottom with a static Arcade body. `preload()` and `update()` are empty. Declares private `cursors` and `ground` fields; `cursors` is unused until input wiring is added.

## `index.html`

Vite HTML shell. Serves `/src/main.tsx`, renders an inline `Loading` spinner inside `#root` for pre-mount, and posts `GAME_SIZE_RESPONSE` messages to `window.parent` on `load` / `resize` / `REQUEST_GAME_SIZE` for embedding hosts.

## `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`

Standard Vite + React + TypeScript + Tailwind toolchain configuration.
