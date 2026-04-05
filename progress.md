Original prompt: Add a performant, theme-aware animated background FX system for each world in the Phaser + TypeScript word-search game. Requirements include reusable manager architecture, per-world ambient background motion, lifecycle cleanup, mobile-safe performance, resize support, build verification, and concise summary.

2026-03-21
- Inspected BootScene, LevelSystem, GameScene, current world effects, and responsive layout state.
- Plan: add a reusable Phaser-native BackgroundFXManager behind gameplay, generate lightweight ambient textures, integrate with world lifecycle and resize hooks, then run build + Playwright validation.
- Implemented a reusable `BackgroundFXManager` with per-world ambient presets (forest/ocean/space/castle/magic/ice/desert).
- Added generated Phaser textures in `BootScene` for glow, strips, leaves, bubbles, sparkles, runes, snowflakes, dust, sand, and comet streaks.
- Integrated background FX lifecycle into `GameScene` start/cleanup/update flow and exposed `window.render_game_to_text` for browser-state inspection.
- Installed local `playwright` dev dependency because the skill client could not import the package from this repo yet.
- `npm run build` passed successfully after the FX integration.
- Ran the `$develop-web-game` Playwright client against the local Vite dev server, captured `output/web-game/shot-0.png`, and verified the forest ambient FX stays behind the board with readable cells. `render_game_to_text` also reported the expected world and FX counts.
- Re-ran the Playwright client after the final dependency changes; the latest forest screenshot still showed subtle leaves/fireflies behind the board with no gameplay occlusion.
- Follow-up polish pass:
  - hardened `BackgroundFXManager` so tracked transient objects/timers do not accumulate across long sessions,
  - switched comet FX to pooled reusable sprites,
  - made `render_game_to_text` dev-only,
  - upgraded world composition with signature layers (light shafts, caustics, nebulae, torch glows, rune halo, glint bands, heat haze),
  - added world-linked HUD/panel accent styling in CSS.
- Build passed again after the hardening/polish pass.
- Re-ran the Playwright client; the latest forest screenshot kept the board readable while debug state now reports signature actor counts alongside ambient actor counts.
- Theme clarity polish pass:
  - boosted world palette saturation/contrast in `LevelSystem`,
  - strengthened shell/panel/HUD world tinting in `styles.css`,
  - replaced generic shell specks with world-specific accent overlays,
  - raised signature FX alpha caps and intensified ocean/ice/desert/magic/forest ambient layers to read more clearly behind the board.
- Wow background pass:
  - added large scenic FX textures in `BootScene` (forest canopy/ridge, ocean reef/current, space planet, castle silhouette, magic veil, ice crystals/aurora, desert dunes/sun),
  - integrated those scenic layers into `BackgroundFXManager` so each world now has a readable large-shape backdrop instead of only particles and glow,
  - verified the forest screenshot after closing the tutorial: canopy + shafts + ridge now read clearly while the board remains legible.

2026-03-23
- Deep-dive project study pass:
  - mapped the runtime flow from `index.html` + `styles.css` shell into `src/main.ts`, `BootScene`, and the large `GameScene` gameplay controller,
  - reviewed the platform/service layer (`CrazyGamesManager`, `SoundManager`, `ResponsiveLayout`, `EventBus`) and the content systems (`LevelSystem`, `WordDatabase`, `GridGenerator`),
  - confirmed `BackgroundFXManager` is the main world-visual architecture: one container behind gameplay, per-world builders, pooled/tracked FX objects, resize-aware signature layers, and mobile-vs-desktop actor counts.
- Verification pass:
  - `npm run build` passed successfully on 2026-03-23,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173` and captured fresh artifacts in `output/web-game/`,
  - verified `output/web-game/shot-1.png`, `output/web-game/state-1.json`, and `output/web-game/full-page-headless.png` to confirm the forest world, HUD shell, word list, and ambient FX all render together as expected in the current build.
- Interaction/automation notes:
  - `window.render_game_to_text` is available in dev and reports level/world/board/meta/fx summary correctly,
  - direct scene-level selection (`GameScene` methods invoked from browser context) correctly resolves found words and updates state,
  - browser-level headless drag automation did not trigger Phaser selection during this study pass, so future end-to-end automation may need either a scene-aware harness or a dedicated deterministic gameplay hook.
- Suggested follow-up if we automate deeper later:
  - add a project-owned `window.advanceTime(ms)` hook instead of relying on the Playwright shim,
  - investigate reliable headless pointer routing for Phaser drag selection before writing gameplay E2E tests.

2026-03-23 UI follow-up
- Investigated the clipped element under the header in Ice World / timed levels.
- Root cause: the header-adjacent element was the timer/combo `#game-info-bar`, and the desktop center-column layout let it overlap the header region.
- Fix: adjusted desktop `#center-column` / `#game-container` layout in `styles.css` so the info bar has a stable row above the square game area and added top spacing beneath the header.
- Verification:
  - `npm run build` passed after the layout fix,
  - measured DOM positions in Playwright and confirmed `#game-info-bar` now starts below `#top-hud`,
  - verified Phaser canvas content still renders by exporting the game canvas to `output/web-game/ice-canvas-after.png`.

2026-03-23 word-list UI follow-up
- Investigated the right-panel `Find Words` jitter caused by frozen-word badges stretching individual word rows.
- Reworked word status presentation:
  - removed the desktop badge chip from `GameScene.updateWordListUI()`,
  - added stable-width word rows with internal status styling in `styles.css`,
  - restyled `frozen`, `cracked`, and `locked` states so the word itself carries the state via subtle icon + texture instead of an external pill badge.
- Regression checks:
  - `npm run build` passed after the restyle,
  - Playwright word-list inspection confirmed all desktop rows in the Ice panel now have the same width and no `.word-state` badge nodes remain,
  - captured focused right-panel screenshots for frozen, locked, and cracked states to visually verify the new treatment without panel drift.

2026-03-23 timer fail-state follow-up
- Reworked timed-level resolution so timeout is no longer treated as a low-score completion:
  - added a scene-level resolution state (`active` / `success` / `timeout`) to block gameplay-side interactions once a run is decided,
  - success still goes through the existing level-complete modal,
  - timeout now routes to a dedicated `Time's Up` modal with retry instead of calling the normal completion flow.
- Added `#time-up-modal` in `index.html` and matching fail-state styling in `styles.css` so the UX reads as a real failure without changing the overall modal design language.
- Retry now restarts the current level in place and leaves progression unchanged; timeout no longer triggers `advanceLevel()` or the level-complete modal.
- Verification:
  - `npm run build` passed after the timeout-flow change,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - browser checks confirmed timeout leaves `saveData.level` unchanged, keeps the level-complete modal hidden, shows the `Time's Up` modal, and retry reloads the same timed level.
- Headless note:
  - direct Phaser `delayedCall()` timing was flaky in the ad-hoc headless probe, so timeout verification used the actual timeout handler for logic assertions and then invoked the modal method directly to capture the fail-state UI reliably.

2026-03-29 board theme pass
- Started the "board + tile per world" roadmap item so world theming now affects the playfield itself, not just the scenic backdrop.
- `BootScene` now generates world-specific cell texture families for all 12 world ids (`cell-bg-*`, `cell-hover-*`, `cell-selected-*`, including spacious variants) with palette-tuned fills and borders.
- `GameScene` now chooses those world-specific tile textures automatically, with a safe fallback to the generic textures if a variant does not exist.
- Added a lightweight `BoardThemeProfile` in `GameScene` so each world can tune board-shell mixes, stage glow/halo strengths, slot contrast, tile tinting, and selected/found emphasis without adding runtime-heavy effects.
- Found and selected cells now inherit world-aware scale/tint/stroke treatment, so interaction feedback matches the active world palette more closely.
- Verification:
  - `npm run build` passed on 2026-03-29.
  - Per the user's instruction, Playwright was intentionally not run for this pass.

2026-03-29 timer theme pass
- Reworked the gameplay timer so it no longer uses one generic translucent pill across every world.
- `GameScene.applyWorldTheme()` now stamps the active world id onto `#game-info-bar` and `#timer-container`, and `updateTimerUI()` now drives a container-level `data-state` (`normal` / `warning` / `critical`) instead of only changing text classes.
- `styles.css` now gives the timer a proper world-aware capsule style with per-world shell/rim/icon/text variables for all 12 themes, plus stronger warning and critical palettes that stay readable regardless of the current world art.
- Verification:
  - `npm run build` passed on 2026-03-29.
  - Per the user's instruction, Playwright was intentionally not run for this pass.

2026-03-29 right panel overflow pass
- Fixed the desktop right-panel layout so a long `Find Words` list no longer pushes the `Power-ups` section off-screen.
- `#right-panel` now behaves like a constrained flex column, while `#word-list` is the dedicated scroll region with a thin themed scrollbar and a soft bottom fade.
- The section headers, divider, power-up buttons, and ad button are now non-shrinking footer content, so the player can always reach the power-ups even when the word count grows.
- Verification:
  - `npm run build` passed on 2026-03-29.
  - Per the user's instruction, Playwright was intentionally not run for this pass.

2026-03-23 ice frozen gating follow-up
- Investigated the Ice World bug where a cracked frozen word could still be cleared immediately on the next trace even if the rest of the required words were still unsolved.
- Fix:
  - updated `GameScene.handlePreFoundMechanics()` so cracked frozen words stay blocked until every non-frozen required word is found,
  - added explicit frozen-word blocked feedback (`FIND X MORE WORDS`) instead of silently letting the second trace succeed,
  - made hint/detect logic avoid frozen words until only frozen words remain,
  - clear solved frozen words out of the temporary frozen/cracked sets so the status text does not linger in a stale state.
- UX text updates:
  - Ice world hint now explains that frozen words clear only after the other words are found,
  - world-status text now tells the player how many regular words are still needed before a cracked word can thaw.
- Verification:
  - `npm run build` passed after the mechanic fix,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - browser-level checks confirmed the frozen word now cracks on the first trace, stays cracked and unresolved on the second trace while other words remain, becomes hintable only after the non-frozen words are cleared, and then resolves normally on the final trace.

2026-03-23 level-complete modal follow-up
- Investigated the regression where clicking outside the level-complete modal hid it and left the board in a cleared-but-stuck visual state.
- Fix:
  - marked `#level-complete-modal` as a static modal so the shared backdrop handler no longer dismisses it on outside clicks,
  - gave the `NEXT LEVEL` CTA its own darker world-aware style so the button reads clearly in pale themes like Ice World.
- Verification:
  - `npm run build` passed after the modal/UI tweak,
  - re-ran the `$develop-web-game` Playwright client,
  - browser checks confirmed an outside click leaves the level-complete modal open and the updated button renders with a darker themed gradient.

2026-03-23 header alignment follow-up
- Investigated the desktop HUD row alignment after the top-shell polish pass.
- Fix:
  - normalized the desktop top-row bands so `.hud-left`, `.hud-badges-row`, and `.hud-right` all share the same `40px` vertical slot,
  - removed the extra desktop badge-row vertical padding so the title, badges, and settings button now sit on the same visual center line.
- Verification:
  - `npm run build` passed after the header tweak,
  - re-ran the `$develop-web-game` Playwright client,
  - browser inspection confirmed the desktop HUD row now reports the same height/center for the left, center, and right header blocks.

2026-03-23 level-complete daily spin CTA follow-up
- Added a secondary `DAILY SPIN` CTA to the level-complete modal so the reward flow is reachable directly from the win state instead of only from the side rail.
- Fix:
  - grouped the level-complete actions into a stacked CTA block,
  - styled the new Daily Spin button with the same completion-button shape/shadow language while giving it a warm reward-toned gradient distinct from `NEXT LEVEL`,
  - wired the button into the existing daily-spin modal flow and allowed it to open from the resolved success state,
  - mirrored daily-spin availability on the completion CTA so it disables and switches to `SPIN TOMORROW` once the reward has already been claimed.
- Verification:
  - `npm run build` passed after the completion-CTA change,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - browser checks confirmed the level-complete card now renders both CTAs at equal width, the new `DAILY SPIN` button opens the spin modal from the completion state, and the complete modal stays mounted underneath that flow.

2026-03-23 save/load audit
- Audited the persistence layer in `CrazyGamesManager` and verified the game uses CrazyGames SDK data storage when the SDK is available, with `localStorage` only as the local fallback path.
- Codepath findings:
  - `saveGame()` and `loadGame()` are wired and the save payload includes level, gems, score, streak, daily spin cooldown, free hints, settings toggles, stars, words found, perfect count, tutorial flag, and best streak.
  - `GameScene` also triggers saves on page hide / unload, and settings/tutorial/daily-spin/level-complete flows all write through the manager.
- Browser verification:
  - fresh-profile boot immediately created an SDK-backed save with level `1`, streak `1`, and `tutorialSeen: false`,
  - closing the tutorial, disabling sound/vibration, claiming a daily spin reward, reloading, and reopening the browser all restored the expected persisted state,
  - screenshots and JSON artifacts for the audit are in `output/web-game/` (`save-load-*.png`, `save-load-check.json`, `save-load-sdk-check.json`).
- Important bug found:
  - level progression is saved too early on win because `GameScene.onLevelComplete()` calls `CrazyGamesManager.advanceLevel()` immediately after scheduling the completion modal instead of waiting for the `NEXT LEVEL` CTA,
  - practical result: if the player refreshes or closes the game after winning but before pressing `NEXT LEVEL`, the next session resumes on the next level anyway.

2026-03-23 save/load progression fix
- Fixed the win-flow persistence bug without reopening a reward-dupe loophole.
- Fix:
  - added a saved `pendingCompletion` payload to `CrazyGamesManager` so a finished level can be remembered as a waiting completion state,
  - `onLevelComplete()` now saves the completion summary and rewards/stars immediately, but does not advance the saved level yet,
  - `GameScene.startLevel()` restores the completion modal after reload/restart when a pending completion exists for the current level,
  - `NEXT LEVEL` now becomes the commit point that clears `pendingCompletion`, advances the saved level, and starts the next board.
- Verification:
  - `npm run build` passed after the persistence-flow change,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - targeted browser checks confirmed:
    - after winning, save data keeps `level: 1` and stores a `pendingCompletion`,
    - after reload, the same level-complete modal is restored instead of silently advancing,
    - after pressing `NEXT LEVEL`, save data changes to `level: 2`, clears `pendingCompletion`, and the game opens level 2,
    - after a full browser restart, the session still resumes on level 2 with no pending modal.

2026-03-23 frozen last-word thaw fix
- Investigated the Ice World edge case where an untouched frozen word still refused to complete even when it was the only required word left.
- Fix:
  - updated `handlePreFoundMechanics()` so a frozen word now resolves immediately when `getRemainingNonFrozenRequiredWordCount()` is already `0`,
  - kept the earlier gate intact for the normal case: if regular words still remain, the first trace still only cracks the frozen word and blocks completion,
  - removed the now-unused helper that only supported the older cracked-word check path.
- Verification:
  - `npm run build` passed after the mechanic adjustment,
  - re-ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - targeted browser checks confirmed:
    - tracing a frozen word early still returns `blocked` and marks it `cracked`,
    - when the frozen word is the last remaining target, the first trace now returns `resolve`, marks the word found, removes its frozen state, and shows `ALL FOUND!`.

2026-03-24 daily spin button polish
- Investigated the daily spin modal CTA looking washed out / disabled even when available.
- Fix:
  - added a dedicated `#btn-spin` reward CTA style in `styles.css` instead of relying on the generic world-tinted `.action-btn`,
  - increased contrast with a brighter cyan-to-blue gradient, explicit border, stronger drop shadow, and text shadow,
  - added clearer hover/press depth plus a separate disabled treatment so the enabled state reads as obviously clickable.
- Follow-up polish:
  - replaced the hardcoded blue palette with theme-linked `--world-*` color mixes so the button now changes with the active world,
  - switched the CTA label to a darker theme-derived text color and softened the top highlight so `SPIN!` reads cleanly against the button fill.
  - extended the same theme-aware CTA styling to `#btn-spin-collect` so the reward-state button matches the main spin button instead of falling back to the washed-out generic action style.
- Verification:
  - `npm run build` passed after the button polish,
  - re-ran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - ran a targeted Playwright modal probe and saved artifacts to `output/web-game/spin-button-polish.png` and `output/web-game/spin-button-polish-check.json`,
  - probe confirmed the modal opens, `#btn-spin` is visible with text `SPIN!`, `disabled: false`, `cursor: pointer`, the new layered gradient background, and no console/page errors,
  - a follow-up theme probe confirmed the computed `backgroundImage`, `color`, and `borderColor` all change when the `--world-*` variables change (`changed: true`).
- Latest follow-up note:
  - per user request, the `COLLECT` button style update was applied without running another button-specific test pass.
  - per user request, the unavailable `COME BACK TOMORROW` disabled state was also restyled for stronger contrast and a clearer info-card look without running another button-specific test pass.
  - refreshed the daily spin modal background so the card no longer sits on a flat white fill: added theme-tinted gradient layers to `.spin-modal-content` plus a soft stage/glow panel behind the wheel.
  - `npm run build` passed after the background pass, the `$develop-web-game` client ran against a local static server, and a targeted modal probe captured `output/web-game/spin-modal-background-polish.png` / `spin-modal-background-polish-check.json` with `errorCount: 0`.
  - redesign follow-up after user feedback: pushed the spin modal away from the plain-card look into a more reward-stage presentation with a patterned shell, a brighter framed panel behind the wheel, soft ray bursts, and small sparkle accents around the spinner.
  - fixed a title rendering issue introduced during the redesign by switching the heading badge away from inline flex and giving it a safer line-height.
  - verification: `npm run build` passed again, the `$develop-web-game` smoke check still ran cleanly, and the refreshed screenshot/probe artifacts are in `output/web-game/spin-modal-redesign.png` and `output/web-game/spin-modal-redesign-check.json` with `errorCount: 0`.
  - redesign follow-up after more user feedback: replaced the pale card treatment with a darker gem-vault / reward-chamber direction so the wheel sits inside a more dramatic spotlighted frame instead of a soft pastel panel.
  - updated the spin title badge, wheel chamber, and lower podium layers to use deeper world-linked tones with luminous accents and stronger contrast around the spinner.
  - verification: `npm run build` passed after the dark reward-chamber pass, the `$develop-web-game` smoke check still ran cleanly, and the refreshed screenshot/probe artifacts were overwritten at `output/web-game/spin-modal-redesign.png` / `output/web-game/spin-modal-redesign-check.json` with `errorCount: 0`.
  - cleanup follow-up: removed the extra stacked square layers behind the wheel so the spinner now sits on one main rounded chamber instead of multiple nested boxes.
  - verification: `npm run build` passed after the frame cleanup, the `$develop-web-game` smoke check still ran cleanly, and the latest artifacts are `output/web-game/spin-modal-frame-cleanup.png` / `output/web-game/spin-modal-frame-cleanup-check.json` with `errorCount: 0`.
  - level-complete follow-up: removed the `DAILY SPIN` / `SPIN TOMORROW` CTA from the level-complete modal so the success flow now ends with only the `NEXT LEVEL` action.
  - cleaned up the related implementation by deleting the unused completion-spin button markup, its dedicated CSS variant, and the scene-side button update / click handler logic.
  - verification: `npm run build` passed, the `$develop-web-game` smoke check still ran cleanly, and a targeted modal probe confirmed `hasDailySpinButton: false`, `nextLevelCount: 1`, and `errorCount: 0` in `output/web-game/level-complete-no-daily-spin-check.json`.

2026-03-25 scenic background follow-up
- Reworked the world-background art direction away from generic drifting glow/strip FX and toward lightweight scenic silhouettes generated once in `BootScene`.
- Updated the generated scenic textures for forest/ocean/castle/magic/ice/desert so each world now reads more like a location backdrop instead of abstract blobs.
- Rebalanced `BackgroundFXManager` presets around low-cost scenic layers:
  - forest now uses canopy + layered tree ridges + one subtle light shaft with only a couple of fireflies,
  - ocean/castle/magic/ice/desert all had moving actor counts reduced and several generic glow/strip layers removed,
  - space kept its identity but now uses fewer stars and only one comet pool entry.
- Forest-specific polish:
  - softened the top canopy side trunks so the scene no longer reads like a dark box behind the board,
  - raised the ridge visibility to make the forest silhouette read more clearly as a background scene.
- Verification:
  - `npm run build` passed after the scenic overhaul,
  - re-ran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - captured and visually checked `output/web-game/forest-world-scenic-bg.png` with no console/page errors in `forest-world-scenic-bg-check.json`,
  - dev-mode `render_game_to_text` check reported the forest preset down at `signatureActors: 4`, `ambientActors: 2`, `orbitActors: 0`, confirming the new setup is intentionally lightweight.

2026-03-26 forest readability correction
- User feedback: the first scenic forest pass either looked abstract or later became too empty, so the background no longer read as a forest scene.
- Fix:
  - rebuilt `generateForestCanopyTexture()` into a clear forest-frame silhouette with visible side trunks, branch masses, and top canopy,
  - strengthened `generateForestRidgeTexture()` tree shapes so the treeline reads at gameplay scale,
  - updated `BackgroundFXManager.buildForest()` to use one canopy layer plus three clearer treeline depth layers instead of the nearly invisible plain-green pass.
- Verification:
  - `npm run build` passed after the forest correction,
  - reran the `$develop-web-game` Playwright client against a local static server,
  - visually checked `output/web-game/shot-0.png` and `output/web-game/forest-world-final-pass.png` to confirm the forest now shows visible trunks/canopy/treeline around the board.

2026-03-26 forest cleanup follow-up
- User feedback: remove the currently visible custom elements from the forest background.
- Fix:
  - stripped `BackgroundFXManager.buildForest()` back to a clean preset with no extra canopy / treeline / shaft / firefly actors.
- Verification:
  - `npm run build` passed after the cleanup,
  - reran the `$develop-web-game` Playwright client against a local static server,
  - visually checked `output/web-game/shot-0.png` to confirm the forest board now sits on the clean world backdrop without the added silhouette elements.

2026-03-26 global background element removal
- User feedback: remove the added background elements not just from Forest World, but from the other themes too.
- Fix:
  - made `BackgroundFXManager.applyWorld()` stop invoking the per-world scenic/decor builders entirely, so all worlds now keep only the clean theme backdrop with no extra runtime background actors.
- Verification:
  - `npm run build` passed after the global removal,
  - reran the `$develop-web-game` Playwright client against a local static server,
  - visually checked `output/web-game/shot-0.png` to confirm the current world renders without the extra background elements.

2026-03-27 left-rail clarity polish
- User feedback: the overall theme was acceptable, but the left-side `STATS` card and `DAILY SPIN` CTA still looked dusty / low-contrast and needed to read more clearly.
- Fix:
  - strengthened `.panel-card` contrast with cleaner world-linked gradients, brighter borders, and deeper shadows,
  - rebuilt `.stats-card` into a crisper glass-card treatment with brighter heading text and more saturated per-stat cells,
  - upgraded `.spin-card` into a richer reward CTA with a luminous gold gradient, darker label text, and stronger depth,
  - mirrored the same reward CTA treatment onto `#btn-daily-spin-mobile` for consistency on small screens.
- Verification:
  - `npm run build` passed after the polish pass,
  - reran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - captured additional visual checks in `output/web-game/left-panel-polish.png` and `output/web-game/full-page-headless.png`,
  - visually confirmed the left rail now pops more clearly against the world backdrop with no CSS/build regressions observed during the check.
- Follow-up icon adjustment:
  - recolored the `DAILY SPIN` icon away from flat white into a warmer dark-gold tone so it matches the reward-button palette and the darker label text.
  - reran `npm run build` and refreshed `output/web-game/left-panel-polish.png` to visually confirm the icon now sits naturally inside the button.

2026-03-27 right-panel clarity + gem polish
- User feedback: the `Find Words` / `Power-ups` side panel still looked dusty, and the gem visuals across the HUD and prices felt too flat and ordinary.
- Fix:
  - strengthened `#right-panel` with a cleaner glass-panel gradient, brighter headers, and clearer divider treatment,
  - rebuilt `.word-item` rows for stronger contrast: brighter text, clearer check slots, deeper borders/shadows, and cleaner found-state styling,
  - upgraded `.powerup-btn`, `.pu-icon`, `.pu-cost`, and `.ad-reward-badge` so the whole rewards/power-up area reads crisply instead of fading into the background,
  - redesigned the shared `gem` SVG into a faceted blue/cyan diamond and reused it for the HUD gem badge, power-up costs, and the ad reward chip,
  - injected the same gem icon into the ad reward badge from `GameScene.injectIcons()` to replace the weaker static reward text treatment.
- Verification:
  - `npm run build` passed after the right-panel and gem polish,
  - reran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - captured fresh visual checks in `output/web-game/right-panel-polish.png`, `output/web-game/gem-badge-polish.png`, and `output/web-game/full-page-headless.png`,
  - visually confirmed the word list text, power-up cards, and gem badge all read more clearly and the gem icon now looks more alive across the UI.

2026-03-28 right-panel style redirect
- User feedback: the previous right-panel direction still was not appealing and felt like the wrong style for the game.
- Fix:
  - redirected the `Find Words` / `Power-ups` area away from the darker heavy-card look and into a lighter quest-panel / objective-board treatment,
  - softened the panel shell, removed the harsh bottom-dark emphasis from list rows and power-up cards, and switched to brighter layered surfaces with slim accent rails,
  - simplified found-word presentation so completed rows feel neatly resolved instead of noisy,
  - toned down the ad card motion language by removing the shimmer overlay and letting the reward card read as a cleaner premium panel.
- Verification:
  - `npm run build` passed after the redesign pass,
  - reran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - captured refreshed artifacts in `output/web-game/right-panel-polish.png`, `output/web-game/full-page-headless.png`, and `output/web-game/right-panel-found-preview.png`,
  - visually confirmed the new right-panel direction now reads lighter, cleaner, and more in-family with the rest of the HUD.

2026-03-28 found-word emphasis follow-up
- User feedback: the overall panel direction now works, but found words still needed to stand out more clearly and beautifully.
- Fix:
  - upgraded `.word-item.found` to use the assigned found-word accent color dynamically via `currentColor`,
  - added a stronger accent rail, a clearer reward-style check badge, a light surface sheen, and a small horizontal offset so solved rows read as completed at a glance,
  - strengthened the found word text treatment so the solved word itself stays crisp instead of fading into the row background.
- Verification:
  - `npm run build` passed after the found-row polish,
  - reran the `$develop-web-game` Playwright client against a local static server,
  - captured `output/web-game/right-panel-found-preview.png` and visually confirmed the solved row now stands out immediately from unresolved words while staying consistent with the new panel style.

2026-03-28 found-word contrast correction
- User feedback: the first found-row polish still felt too subtle, and solved vs unsolved rows were still too easy to confuse in real gameplay.
- Fix:
  - changed solved rows from a soft tint into a clearly filled accent state based on the word's assigned found color,
  - added a dedicated `FOUND` capsule, a stronger white accent rail, more horizontal offset, and a higher-contrast check badge,
  - switched solved-word text to bright white so the completed state reads instantly even at a quick glance.
- Verification:
  - `npm run build` passed after the stronger solved-state pass,
  - reran the `$develop-web-game` Playwright client against a local static server,
  - refreshed `output/web-game/right-panel-found-preview.png` and visually confirmed solved rows now separate clearly from unresolved entries.

2026-03-28 grid board stage polish
- User feedback: the central letter board still looked too plain and did not feel exciting enough compared with the improved HUD.
- Fix:
  - added a themed stage behind the grid in `GameScene`, including a framed board shell, soft glow, slot sockets behind each tile, and subtle corner ornaments so the letters sit inside a real play surface instead of floating on the background,
  - upgraded shared cell texture generation in `BootScene` with a softer base shadow, inner carved face, stronger glossy facets, and a lower lip so every letter tile reads as a polished physical piece,
  - kept the board treatment theme-aware by deriving the stage colors from the active world's visual palette instead of hardcoding a separate look.
- Verification:
  - `npm run build` passed after the board/tile polish,
  - reran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - visually inspected the refreshed gameplay capture and confirmed the board now feels framed, deeper, and more premium without reducing legibility,
  - saved the latest board-focused artifact as `output/web-game/grid-stage-polish.png`.

2026-03-28 grid board hero pass
- User feedback: the first board-stage improvement was good, but the letter area still needed a more premium, more exciting hero treatment.
- Fix:
  - evolved the board shell into a richer layered tray with a darker outer bezel, deeper inset well, top and bottom accent caps, and a more obvious center inlay so the playfield reads as a special puzzle altar instead of a simple frame,
  - added low-cost decorative texture layers using the existing generated FX textures (`bgfx-arch-glow`, `bgfx-rune-halo`, `bgfx-glint-band`) plus soft connector rails between rows/columns to make the board feel designed around the grid,
  - strengthened the default letter styling with a subtle depth shadow and bold weight so the tiles feel more collectible and better anchored to the upgraded stage.
- Verification:
  - `npm run build` passed after the hero-pass adjustments,
  - reran the `$develop-web-game` Playwright client against the local static server,
  - visually inspected the refreshed board screenshot and confirmed the grid now has a stronger centerpiece presence without harming readability,
  - saved the latest board-focused artifact as `output/web-game/grid-stage-hero-pass.png`.

2026-03-28 grid board direction correction
- User feedback: the darker hero-pass board read too much like a billiards table and missed the intended game feel.
- Fix:
  - replaced the heavy dark tray direction with a lighter crystal/glass board treatment built from pale layered surfaces instead of dark bezels and rail-like accents,
  - removed the cap/rail styling that created the table impression, and switched to softer internal facets, luminous panel layers, and small gem-chip corner accents,
  - kept the board theme-aware while biasing its palette toward the world's light cell colors so the grid feels like a polished puzzle slab rather than furniture.
- Verification:
  - `npm run build` passed after the direction correction,
  - reran the `$develop-web-game` Playwright client against the local static server,
  - visually inspected the refreshed screenshot and confirmed the board now reads as a lighter gem/glass play surface instead of a dark table,
  - saved the latest board-focused artifact as `output/web-game/grid-stage-glass-pass.png`.

2026-03-28 grid letter clarity pass
- User feedback: after the board-direction correction, the stage itself looked good, but the letters and their surrounding tiles still read too soft and hazy.
- Fix:
  - brightened the shared base/hover tile textures in `BootScene`, strengthened their border alpha, and sharpened the inner face highlights so each letter box reads more clearly against the lighter board,
  - added reusable readable-letter styling in `GameScene` with a crisp stroke plus tighter shadow so normal letters, selected letters, and found/special letters all keep a cleaner edge,
  - nudged the base tile tint slightly closer to white in `GameScene` so the boxes separate better from the glass board while still staying theme-aware.
- Verification:
  - `npm run build` passed after the clarity pass,
  - reran the `$develop-web-game` Playwright client against the local static server after restarting the local `http.server`,
  - visually inspected the refreshed board screenshot and confirmed the letters now read darker/crisper and the tile boxes stand out more cleanly from the board,
  - saved the latest board-focused artifact as `output/web-game/grid-letter-clarity-pass.png`.

2026-03-28 grid letter chip variant
- User feedback: the first clarity pass still felt too ordinary, so the letters/tiles needed a more distinct style rather than just sharper contrast.
- Fix:
  - pushed the shared tile texture toward a premium chip style by adding stronger theme-tinted cap/base bands, clearer inner colored edging, and subtle side rails in `BootScene`,
  - shifted normal tile tinting in `GameScene` a bit closer to each world's primary color so the boxes feel intentionally themed instead of plain white,
  - changed normal letter treatment from a generic white outline toward a darker fill with a world-tinted edge, keeping readability while giving the glyphs more character.
- Verification:
  - `npm run build` passed after the chip-style pass,
  - reran the `$develop-web-game` Playwright client against the local static server after restarting `http.server`,
  - visually inspected the refreshed screenshot and confirmed the letter cells now read more like themed puzzle chips than plain white keyboard keys,
  - saved the latest board-focused artifact as `output/web-game/grid-letter-chip-pass.png`.

2026-03-28 grid letter token variant
- User feedback: another direction was needed beyond the chip-style tiles.
- Fix:
  - replaced the chip-rim emphasis in `BootScene` with a softer premium-token construction: a centered letter stage, small corner facets, and cleaner lower lip treatment so each cell feels like a polished game token,
  - eased the normal tile tint in `GameScene` back toward a cleaner bright surface and adjusted the letter styling to a darker fill with a lighter neutral edge so the token center stays readable,
  - kept the stronger selected/found readability while shifting the default idle state into a more distinct visual family from the previous chip pass.
- Verification:
  - `npm run build` passed after the token-style pass,
  - reran the `$develop-web-game` Playwright client against the local static server on port `4301`,
  - visually inspected the refreshed screenshot and confirmed the idle tiles now read more like premium tokens with a center stage instead of chip-rim cards,
  - saved the latest board-focused artifact as `output/web-game/grid-letter-token-pass.png`.

2026-03-28 grid letter weight + separation follow-up
- User feedback: in the new token direction the letters had become too bold, while the boxes still needed to separate more clearly from one another.
- Fix:
  - reduced the default letter emphasis in `GameScene` by removing the forced bold idle style, lowering the idle scale slightly, and keeping bold/sturdier strokes only for selected/found/special states,
  - increased the idle tile separation by shrinking the default tile scale a touch and brightening the idle tint so more slot/background gap becomes visible between cells,
  - strengthened the shared tile edge definition in `BootScene` with a deeper seat shadow and a clearer extra rim stroke so each token reads as its own object.
- Verification:
  - `npm run build` passed after the follow-up pass,
  - reran the `$develop-web-game` Playwright client against the local static server on port `4301`,
  - visually inspected the refreshed gameplay screenshot and confirmed the idle letters now feel lighter while the cell boxes separate more cleanly from one another,
  - saved the latest board-focused artifact as `output/web-game/grid-letter-separation-pass.png`.

2026-03-28 grid bright clarity correction
- User feedback: recent variants had drifted into weaker, duller directions; the user wanted the grid to become clearly readable and brighter again, including much stronger found-word marking.
- Fix:
  - redirected `generateCellTexture()` in `BootScene` away from the token/chip experiments and into a brighter high-contrast glossy tile with stronger borders, clearer inner face, and a saturated lower band that reads well across worlds,
  - boosted the selected texture and all found-word gem texture palettes so successful paths pop harder instead of blending into the board,
  - updated `GameScene` so idle cells use a whiter tint and stronger separation, idle letters stay dark and readable without feeling too bold, and found cells scale up slightly with clearer white lettering for immediate recognition.
- Verification:
  - `npm run build` passed after the bright-clarity correction,
  - reran the `$develop-web-game` Playwright client; because the tutorial timing remained inconsistent for direct gameplay captures, also used a small supplemental Playwright snapshot to inspect gameplay and a forced found-word state after the required client run,
  - visually inspected `output/web-game/grid-bright-clarity-preview.png` and confirmed the idle board is brighter and easier to parse,
  - visually inspected `output/web-game/grid-bright-found-preview.png` and confirmed found words now read much more clearly on the board and in the side list.

2026-03-29 world progression expansion
- User feedback: the old setup kept `Desert World` forever after level 61, which would make long-term progression repetitive.
- Fix:
  - expanded the world roster in `LevelSystem` from 7 to 12 ids by adding `volcano`, `sky`, `crystal`, `shadow`, and `clockwork`,
  - split the late-game progression into six 10-level blocks:
    - `61-70 Desert World`
    - `71-80 Volcano World`
    - `81-90 Sky World`
    - `91-100 Crystal Cave World`
    - `101-110 Shadow World`
    - `111-120 Clockwork World`
  - kept the existing mechanic engines lightweight by reusing them with new world-specific text labels:
    - Volcano reuses the desert reward-cell mechanic as ember cells,
    - Sky reuses the wave-cell drift mechanic as breeze cells,
    - Crystal Cave reuses wildcard cells as prism cells,
    - Shadow reuses the lock mechanic with shadow-flavored unlock text,
    - Clockwork reuses the bonus-word mechanic as a gear bonus,
  - added themed word pools for all 5 new worlds in `WordDatabase`,
  - added matching sound profiles for all 5 new worlds in `SoundManager`,
  - generalized mechanic status/floating texts in `GameScene` so reused mechanics no longer show mismatched labels like `COMET`, `SUN GOLD`, or `rune cells` in the new worlds.
- Verification:
  - `npm run build` passed after the progression/content update,
  - reran the `$develop-web-game` Playwright client against a local static server for the built `dist/`,
  - captured fresh screenshots in `output/web-game/shot-0.png` and `output/web-game/shot-1.png`,
  - ran a supplemental Playwright browser check by seeding save data at levels `61`, `71`, `81`, `91`, `101`, `111`, and `121`; verified the HUD/world title mapping resolves to `DESERT`, `VOLCANO`, `SKY`, `CRYSTAL CAVE`, `SHADOW`, `CLOCKWORK`, and `CLOCKWORK` respectively,
  - note: the Playwright client still reported one existing `404` resource load in `output/web-game/errors-0.json`; this appears unrelated to the new world progression work.
- Follow-up note:
  - with the current fallback logic, levels `121+` now continue on `Clockwork World` until more worlds are added later.

2026-03-29 forest image backdrop integration
- User feedback: use the uploaded forest-theme artwork as the actual Forest World background, and make sure it is already visible the moment the level opens instead of fading/loading in late.
- Fix:
  - found the uploaded asset at `public/assets/forest-theme.png`,
  - added a real Phaser preload for the forest backdrop in `BootScene` so the texture is loaded before `GameScene` starts,
  - extended `BackgroundFXManager` with a lightweight static-backdrop path that can place a cover-sized image behind gameplay and keep it correctly sized on resize,
  - enabled that static backdrop only for `Forest World`, using the uploaded image instead of the plain clean gradient-only center background.
- Verification:
  - `npm run build` passed after the forest image integration,
  - reran the `$develop-web-game` Playwright client against the local static server build and refreshed `output/web-game/shot-0.png` / `shot-1.png`,
  - copied the latest forest screenshot to `output/web-game/forest-theme-background.png`,
  - saved a small verification summary to `output/web-game/forest-theme-background-check.json`; sampled multiple background bands from the screenshot and confirmed the scene now has strong color variance instead of a flat single-color fill, consistent with the new forest artwork being present at first render.

2026-03-29 forest theme placement correction
- User clarification: the forest theme art should not live as a Phaser-rendered backdrop layer; it needs to sit in the central gameplay container region shown in the reference crop.
- Fix:
  - removed the Forest-only Phaser backdrop injection from `BackgroundFXManager` so the canvas is no longer responsible for drawing the uploaded artwork,
  - removed the now-unneeded Phaser preload from `BootScene`,
  - added an HTML image preload for `forest-theme.png` so the browser starts fetching it before gameplay is shown,
  - made `#game-container` world-aware in `GameScene.applyWorldTheme()`,
  - applied the forest artwork as a CSS background directly on `#game-container`, with rounded clipping and light overlay gradients so it sits exactly in the middle gameplay square instead of the broader shell/background layer.
- Verification:
  - `npm run build` passed after the placement correction,
  - reran the `$develop-web-game` Playwright client against the local built server and visually verified the new `output/web-game/shot-0.png`,
  - captured a full-page confirmation screenshot at `output/web-game/forest-theme-placement-full.png`,
  - saved a DOM/style proof in `output/web-game/forest-theme-placement-check.json` confirming both `#game-shell` and `#game-container` resolve to `data-world="forest"` and that the `#game-container` computed `backgroundImage` includes `forest-theme.png`.

2026-03-29 gameplay-area background correction
- User preference: do not run Playwright unless explicitly requested.
- User clarification: the uploaded theme art should sit behind the broader gameplay screen area, not only behind `#game-container`.
- Fix:
  - moved the active world marker from `#game-container` to `#main-content` in `GameScene.applyWorldTheme()`,
  - removed the forest-image background styling from `#game-container`,
  - applied the forest artwork to `#main-content[data-world="forest"]::before` so it fills the whole gameplay region under the HUD instead of just the centered square board area,
  - restored `#game-container` to a neutral transparent host so the board sits on top of the gameplay-area background instead of carrying the background itself.
- Verification:
  - skipped Playwright per the latest user instruction.

2026-03-29 right panel readability polish
- User feedback: after moving the forest artwork behind the gameplay area, the right-side `Find Words` panel became too translucent and the words/power-up labels lost readability.
- Fix:
  - increased the base opacity/solidity of `#right-panel`,
  - strengthened the contrast of `.word-item` rows, their left accent rails, and the circular check markers,
  - increased text clarity for `.word-text`, `.powerup-btn`, and `.pu-label` so the panel contents read clearly over scenic backgrounds.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-29 multi-theme scenic background integration
- User added five more theme images and asked to place each one behind the correct themed gameplay area, with fast first render behavior similar to the forest setup.
- Fix:
  - detected the new artwork in `public/assets/`: `ocean-theme.png`, `space-theme.png`, `castle-theme.png`, `magic-theme.png`, and `ice-theme.png`,
  - added HTML image preloads for all six scenic images (`forest`, `ocean`, `space`, `castle`, `magic`, `ice`) so the browser can fetch them as early as possible,
  - expanded the gameplay-area background styling on `#main-content` so each of those world ids now uses its own matching scenic image with a light readability overlay tuned to that palette,
  - left the worlds without supplied artwork (`desert`, `volcano`, `sky`, `crystal`, `shadow`, `clockwork`) on the existing non-image themed background path.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-29 remaining scenic backgrounds integration
- User added the final six world images and asked to wire them the same way as the earlier themed gameplay-area backdrops.
- Fix:
  - detected new artwork for `desert`, `volcano`, `sky`, `crystal cave`, `shadow`, and `clockwork`,
  - added preload links for all six new files in `index.html`,
  - expanded the `#main-content[data-world=\"...\"]::before` scenic background system so those six worlds now also render their own supplied artwork behind gameplay with tuned readability overlays,
  - mapped `Crystal Cave World` to `crystalcave-theme.png` while keeping the world id as `crystal`.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-29 theme-aware interaction effects pass
- User asked to start the next roadmap item by making gameplay interaction feedback more distinct per theme, and later requested timer readability plus a fix for the right panel so power-up controls stay visible when the word list grows.
- Fix:
  - expanded the board theme profile in `GameScene` with world-specific interaction parameters for selection trails and found-word celebration effects,
  - upgraded `GameJuice.selectionTrailAt()` and `GameJuice.starBurst()` usage so each world now uses different particle shapes, spread, alpha, and secondary accent mixing during selection and word-complete moments,
  - added an animated found-word line burst that now inherits world-specific thickness and glow behavior instead of using a single generic feedback style,
  - restyled the combo indicator to use active world colors so the info bar interaction feedback now matches the current theme instead of staying on a static gold/orange palette.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 theme-aware modal styling pass
- User asked to continue the roadmap, so the next step focused on making overlay surfaces and CTA buttons feel tied to the active world instead of using a mostly neutral shared modal style.
- Fix:
  - upgraded the shared modal backdrop and base modal shell to use the current world palette via the existing `--world-*` CSS variables,
  - restyled close buttons, secondary buttons, toggle switches, and tutorial cards so settings/tutorial overlays now visually match the active world while preserving readability,
  - refreshed `Level Complete` and `Time Up` statistic cards and headings to inherit world color accents instead of flat generic white/pink styling,
  - tuned CTA hover shadows to use world glow instead of a hardcoded red/orange hover treatment.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 settings modal theme polish
- User feedback: the settings modal still looked too plain compared with the rest of the world-aware UI and needed its own more intentional theme-matched treatment.
- Fix:
  - added a dedicated `settings-modal-content` class in `index.html`,
  - turned the settings modal into a themed control-panel shell with layered gradients, inner frame, and a world-colored title pill,
  - restyled setting rows into individual glass cards with icon chips, larger themed toggles, and stronger button treatments so the whole modal reads as part of the active world instead of a generic white popup.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 settings modal contrast correction
- User feedback: the first themed settings modal still had poor contrast, with shell, rows, title pill, and controls sitting too close in value and washing out on several worlds.
- Fix:
  - rebalanced the settings modal around a darker themed shell instead of a white-heavy panel,
  - introduced settings-specific contrast variables so the shell, title, row cards, icon chips, toggles, and buttons each sit on clearly separated brightness bands while still inheriting the active world palette,
  - strengthened button and toggle contrast so the modal remains readable and visually cohesive across both bright and dark worlds.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 settings modal text palette integration
- User requested a premium glassmorphism text palette where the settings copy feels embedded into the blue/emerald UI instead of detached as plain white text.
- Fix:
  - wrapped the settings title, labels, and button text in dedicated spans so text-specific gradients could be applied without breaking the existing button backgrounds,
  - applied an ice-blue title gradient, soft-cyan label color, and cyan/emerald gradient text treatments for `How to Play` and `Close`,
  - added matching text-shadow and letter-spacing values so the typography now feels like part of the same luminous glass system as the rest of the panel.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 settings modal readability correction
- User feedback: despite the themed treatment, settings modal text and icons were still too hard to read across different worlds because the title, labels, and CTA copy were using overly light cyan treatments against similarly bright surfaces.
- Fix:
  - replaced the gradient-clipped settings text treatments with higher-contrast solid theme-aware colors tuned for the actual surface brightness of each element,
  - moved the title to a darker theme-derived readable color for its light pill, while keeping row labels and close-button text bright enough for dark surfaces,
  - strengthened icon readability by shifting icon chips toward darker theme fills and keeping the icon glyphs themselves bright with a subtle shadow.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-03-30 scenic background performance polish
- User asked to continue the roadmap with performance work so the newly added world artwork stays fast on low-end devices instead of forcing every theme image to load up front.
- Fix:
  - removed the 12 static `<link rel="preload" as="image">` tags from `index.html` so the browser no longer pulls every scenic background during initial startup,
  - replaced the 12 hardcoded `url(...)` CSS world selectors with a single dynamic `--world-scene-image` layer on `#main-content`, which keeps only the active theme image bound into the live UI,
  - added `WorldSceneLoader` to preload the current world image before the splash screen disappears, so the gameplay backdrop is already ready on first paint,
  - added lightweight neighbor warmup logic that quietly preloads only adjacent world artwork after the current scene is ready, improving world transitions without the memory/network hit of preloading the entire set.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-01 settings modal contrast-lock pass
- User asked to continue with a planned final UI consistency pass and the first highest-risk target was the settings modal, where text and icon readability still drifted too much between bright and dark worlds.
- Fix:
  - converted the settings modal from direct `--world-*` text/icon mixing to a contrast-locked system built around dedicated `--settings-contrast-dark` and `--settings-contrast-light` anchors,
  - updated title, labels, action text, and icon chips to use those controlled contrast bands so the copy stays readable on both light and dark theme surfaces,
  - added world-specific settings contrast overrides for the riskiest palettes (`forest`, `ocean/sky`, `space/shadow`, `castle/clockwork`, `magic`, `ice/crystal`, `desert`, `volcano`) so each world keeps its own flavor without sacrificing readability.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-01 HUD and timer readability parity pass
- User continued the planned final UI consistency pass, so the next target was the top HUD and timer strip where readability could drift between scenic worlds and darker fantasy palettes.
- Fix:
  - introduced HUD-level contrast anchors and grouped world overrides so the game title, level/streak/gem badges, zone title, and world status now use theme-aware but readability-locked text colors,
  - upgraded HUD badge shells with stronger depth, top glints, and clearer rim separation so the level, streak, and gem pills stay legible over every world palette,
  - converted the timer strip to the same contrast-locked approach by separating text/icon ink from the decorative timer shell colors, then strengthened timer rim and icon chip separation,
  - aligned combo text readability with the timer contrast system so the info bar now behaves as one consistent theme-aware cluster instead of several unrelated pills.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-03 resolution modal parity pass
- Continued the final UI consistency roadmap by targeting the two resolution overlays that still drifted in contrast and hierarchy between worlds: `Level Complete` and `Time's Up`.
- Fix:
  - replaced the mostly light generic result styling with a dedicated resolution-modal surface system built around contrast-locked shell, title, stat-card, and CTA roles,
  - added grouped world overrides for the resolution modals so risky palettes (`space/shadow`, `magic`, `ice/crystal`, `desert/volcano`, etc.) keep their flavor while title and stat text remain readable,
  - promoted the result title into a proper pill, darkened the stat cards into distinct theme-aware bands, and clarified label/value hierarchy so score, gems, stars, and retry information read faster,
  - upgraded completion/retry buttons into clearer primary-vs-danger roles and wrapped the stars in their own reward band so the success state feels more premium and visually separated from the content cards.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-04 word list and board state parity pass
- Continued the final UI consistency roadmap by tightening readability for the remaining interactive gameplay states: word list rows and board-cell state feedback.
- Fix:
  - strengthened desktop word-list row layering with clearer glass highlights and state-specific surfaces so `locked`, `cracked`, `frozen`, and `found` rows now separate more cleanly from the scenic backgrounds,
  - upgraded found-word presentation on both desktop and mobile with stronger check pills, brighter found capsules, and more obvious solved-state contrast,
  - improved the `ALL FOUND!` reward row so it now reads like a completion banner instead of plain text dropped into the list,
  - adjusted board-cell readability in `GameScene` by lifting base tile contrast, strengthening base letter stroke/shadow, and giving `gold`, `wildcard`, `frozen`, `cracked`, `selected`, and `found` cells slightly stronger texture/scale treatment so mechanic states stay readable across worlds.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-04 GameScene refactor slice 1
- Started the planned post-polish refactor by extracting the lowest-risk theme/runtime state logic out of `GameScene.ts` before touching gameplay flow.
- Fix:
  - moved `BoardThemeProfile`, `WordRuntimeState`, and `createWordRuntimeState()` into a new `src/scenes/gameScene/boardTheme.ts` helper so they no longer crowd the main scene file,
  - extracted `getBoardThemeProfile(worldId)` into that helper as a pure world-driven function, which removes a large static override block from `GameScene` and makes future theme tuning safer,
  - updated `GameScene` to import the shared board-theme helper and request profiles directly from the active world id, reducing scene size while keeping gameplay behavior unchanged.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-04 GameScene refactor slice 2
- Continued the planned scene refactor by extracting low-level color and readable-text helpers that were being reused across board rendering and cell-state styling.
- Fix:
  - created `src/scenes/gameScene/colorUtils.ts` for shared color mixing, hex conversion, CSS conversion, and readable letter styling helpers,
  - rewired `GameScene` board-shell rendering, selection trail, found-word state, base tile styling, and selected tile styling to use the shared helper module instead of keeping those utility methods inline,
  - reduced `GameScene.ts` further without changing gameplay behavior, making future tile/theme polish work less risky and easier to reuse.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-04 GameScene refactor slice 3
- Continued the sequential scene cleanup by extracting the grid texture-key helpers that still lived inline in `GameScene`.
- Fix:
  - added `src/scenes/gameScene/cellTextures.ts` to centralize spacious-grid detection plus world-aware tile texture and found-tile key resolution,
  - rewired board construction and cell-state styling to use the shared texture helpers instead of local scene methods,
  - removed another small utility cluster from `GameScene`, keeping the gameplay logic intact while shrinking the scene surface area a bit more.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-05 GameScene refactor slice 4
- Began extracting the actual gameplay interaction cluster by moving the most reusable selection and word-matching logic out of the scene.
- Fix:
  - added `src/scenes/gameScene/selectionLogic.ts` to hold pure helpers for hover-based straight-line selection building and matched-word resolution,
  - rewired `GameScene` pointer-hover handling to delegate path calculation to the shared selection helper instead of computing the whole line inline,
  - removed the inline matched-word / selection-direction helpers from `GameScene` and switched `pointer up` resolution to use the shared module, shrinking the scene again without changing the mechanic flow.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-05 GameScene refactor slice 5
- Continued the interaction refactor by extracting the pure mechanic-decision logic that runs before a word is finally resolved.
- Fix:
  - added `src/scenes/gameScene/wordMechanics.ts` to hold reusable pre-found mechanic evaluation and feedback text helpers,
  - rewired `GameScene` to ask the helper whether a word should resolve, crack a frozen word, or stay blocked instead of keeping that conditional tree inline,
  - moved the locked/frozen feedback text construction into the helper module so the scene keeps only the visual/audio side effects.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-05 GameScene refactor slice 6
- Continued the gameplay refactor by pulling the post-found world mechanic decisions out of `GameScene`.
- Fix:
  - expanded `src/scenes/gameScene/wordMechanics.ts` with a pure `evaluatePostFoundMechanics()` helper that resolves unlock bursts, comet rewards, and desert-gold rewards from state and mechanic config,
  - rewired `handlePostFoundMechanics()` so the scene now receives a structured result and applies only the state mutations plus audio/visual side effects,
  - removed the inline reward-decision branching from `GameScene`, making the remaining method easier to scan and safer to extend.
- Verification:
  - `npm run build` passed,
  - skipped Playwright per the latest user instruction.

2026-04-05 BackgroundFXManager bugfix pass
- Continued the post-`GameScene` priority list by fixing the highest-risk `BackgroundFXManager` runtime issues before splitting it further.
- Fix:
  - rewired `applyWorld()` so it now refreshes the viewport, dispatches the active world builder, and lays out the generated layers instead of only clearing/resizing,
  - replaced the canvas-width mobile heuristic with a browser viewport check (`visualViewport` / `innerWidth`) so desktop sessions no longer fall into the mobile FX profile,
  - added a reusable world-dispatch path plus fallback FX profiles for the worlds that were still missing dedicated builder methods,
  - restored real animated forest FX by adding light shafts, glow layers, drifting leaves, and firefly sparkles on top of the static scenic backdrop,
  - extended the debug summary with `staticBackdrops` so non-particle scenic layers are visible in state dumps.
- Verification:
  - `npm run build` passed,
  - ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - latest `output/web-game/bgfx-check/state-0.json` now reports `mobileProfile: false`, `staticBackdrops: 1`, `ambientActors: 12`, `signatureActors: 3`, `trackedObjects: 16` for the forest level,
  - visually checked `output/web-game/bgfx-check/shot-0.png` and confirmed the forest scene now shows moving shaft/glow ambience behind the board without hurting readability.

2026-04-05 BackgroundFXManager refactor slice 1
- Continued the same priority item by splitting the `BackgroundFXManager` internals so the class is no longer carrying world-builder data and actor/type definitions inline.
- Fix:
  - moved all FX actor/types/options/constants into `src/managers/backgroundFX/types.ts`,
  - moved world-specific builder logic plus fallback world profiles into `src/managers/backgroundFX/worldBuilders.ts`,
  - rewired `BackgroundFXManager` to expose a narrow builder context and delegate world composition to the extracted builder module, leaving the manager focused on lifecycle, layout, pooling, and per-frame updates.
- Verification:
  - `npm run build` passed after the split,
  - ran the `$develop-web-game` Playwright client again against `http://127.0.0.1:4173`,
  - latest `output/web-game/bgfx-refactor-check/state-0.json` still reports `mobileProfile: false`, `staticBackdrops: 1`, `ambientActors: 12`, `signatureActors: 3`, `trackedObjects: 16` for the forest level,
  - visually checked `output/web-game/bgfx-refactor-check/shot-0.png` and confirmed the refactor preserved the forest ambient FX presentation.

2026-04-05 grid reliability pass
- Continued the next priority item by hardening word placement so level word counts stop collapsing into partial boards as easily.
- Fix:
  - upgraded `src/utils/GridGenerator.ts` from a mostly random placement loop to a candidate-based placement search that evaluates all fitting placements for a word and prefers higher-overlap / better-centered options,
  - increased top-level grid generation retries so the generator spends more time searching for a complete placement set,
  - added a `GameScene` retry wrapper that re-rolls word selections and grid generation multiple times before accepting a fallback result, so a weak word combination is less likely to leak into live gameplay.
- Verification:
  - `npm run build` passed,
  - ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - latest `output/web-game/grid-check/state-0.json` shows level 1 now spawning with 4 required words (`NEST`, `TRAIL`, `TREE`, `TIMBER`), matching the expected forest start count.

2026-04-05 save migration skeleton pass
- Added a proper migration entry point to the save layer so future save-shape changes can be introduced without ad-hoc load logic.
- Fix:
  - introduced `SAVE_VERSION` and a central `SAVE_MIGRATIONS` table in `src/managers/CrazyGamesManager.ts`,
  - replaced direct spread-based load hydration with `migrateSaveData(raw)` so versioned transforms can run before defaults are applied,
  - added `normalizePendingCompletion()` so older or malformed save payloads cannot inject an invalid pending-completion structure into runtime state.
- Verification:
  - `npm run build` passed after the migration skeleton was added.

2026-04-05 combo timing and streak cleanup
- Closed the next runtime-cleanup item by moving combo timing onto Phaser scene events and correcting streak date handling to use local calendar days.
- Fix:
  - replaced the `setInterval`-driven combo UI polling in `src/scenes/gameScene/TimerComboController.ts` with Phaser `time.addEvent` / `delayedCall`,
  - moved combo timing calculations onto `scene.time.now`, so combo expiration now follows the active scene clock instead of wall-clock `Date.now()`,
  - made the level timer stop itself before firing the timeout callback so it cannot keep ticking after expiry,
  - changed `src/managers/CrazyGamesManager.ts` streak logic to use local date stamps instead of `toISOString()`, which avoids UTC midnight drift for local players.
- Verification:
  - `npm run build` passed,
  - ran the `$develop-web-game` Playwright client against `http://127.0.0.1:4173`,
  - latest `output/web-game/final-check/state-0.json` still shows a healthy forest start with 4 required words and active background FX counts,
  - visually checked `output/web-game/final-check/shot-0.png` to confirm the game still boots cleanly after the timing/streak cleanup.
