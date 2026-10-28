# Requirements — 2D_angrybutlaugh

## Coding Patterns

- `App.tsx` mounts the React `GameScreen`; active gameplay is React DOM so Korean IME composition and accessible input controls work natively.
- Keep every player-visible label, dialogue line, reaction, and ending in `src/locales/ko.json`. Keep story data distinct by scenario and difficulty; do not repeat a script across the nine combinations.
- Keep generated character image URLs in `src/assets.json`; size rendered portraits explicitly in CSS and retain a CSS-built fallback.
- Save each scenario's maximum unlocked difficulty and earned certificate in browser localStorage. Lower difficulties unlock the next difficulty only for that scenario; a certificate requires completing expert difficulty.
- Use the requestAnimationFrame loop with `DebugPanel.frame()` for timed gameplay and moving mini-games. Keep live-adjustable game values in the single `DebugPanel.define` schema in `GameScreen.tsx`; CSS-variable fallbacks must match schema defaults.
- Korean input comparison waits for IME composition to finish. Enter submits; Backspace remains native. Space is consumed by mini-games only when no text input is focused.
- Fever Time must use the scene frame loop for falling sentence position and fail-line collision; do not replace it with a timer-only reveal.

## Known Issues / Constraints

- The legacy `Game.ts` still contains a Phaser scaling monkey-patch marked LLM-modification-prohibited; it is not used by the active game and should not be modified as part of DOM gameplay changes.
- `@agent8/gameserver` is in `dependencies` but unused; there is no networking, session, or room code.
- `lucide-react` is installed but nothing imports it.
- The active game does not use Phaser physics or the legacy `MainScene`; do not add gameplay there unless the app is deliberately migrated back to Phaser.
- `index.html` posts `GAME_SIZE_RESPONSE` to `window.parent` for embed hosts; if you change the mount size, the reported dimensions follow the document, not the Phaser canvas.
