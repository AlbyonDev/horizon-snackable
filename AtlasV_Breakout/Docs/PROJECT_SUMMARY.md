# Project Summary — AtlasV Breakout

**Genre:** Arcade Breakout / Brick Breaker
**Platform:** Meta Horizon Worlds — Mobile Portrait (9×16 world-unit play area)
**Art Style:** 80s neon arcade — saturated rainbow palettes on near-black backgrounds, juicy 2D-on-3D
**Engine:** Meta Horizon Studio (TypeScript components + services, NoesisGUI XAML HUD)

---

## Game Overview

Single-finger arcade breakout. The player drags the paddle to bounce a ball into a grid of bricks; destroyed bricks drop coins that the paddle vacuums in for score. Ball speed escalates with each brick destroyed, combos build a multiplier, and at high heat the ball pierces through bricks. The session runs through 11 hand-designed levels then loops; on death the player restarts the current level with score reset to 0.

---

## Technical Architecture

```
Scripts/
├── Components/
│   ├── GameManager.ts          — lives, score, level progression, tap-to-start, game-over flow
│   ├── LevelLayout.ts          — pre-warms 106-brick pool, lays out grid from LevelConfig, picks reveal pattern
│   ├── Ball.ts                 — substepped AABB physics, wall/paddle/brick bounce, sticky + pierce
│   ├── Paddle.ts               — touch-lerp movement, squash/stretch, palette tint, power-up effect dispatch
│   ├── Brick.ts                — pooled brick, HP/color, 4 reveal styles, death animation, title idle pulse
│   ├── ExplosiveBrick.ts       — extends Brick; queries neighbors via CollisionManager and chains destruction
│   ├── ComboManager.ts         — tracks combo (per-launch) and heat (per-life), emits IncrementCombo/Heat
│   ├── PowerUpManager.ts       — per-level spawn chance/weights (opt-in; disabled by default)
│   ├── PowerUp.ts              — falling pickup, paddle-overlap collection
│   ├── PaddleEffects.ts        — IPowerUpEffect factory (BigPaddle stackable, StickyPaddle non-stackable)
│   ├── StickyBallState.ts      — sticky-mode state machine for the ball
│   ├── ClientSetup.ts          — camera + focused-interaction setup on player create
│   ├── AudioSource.ts          — registers a scene SoundComponent with AudioManager under a string ID
│   ├── GameHUDViewModel.ts     — score (casino roll-up), lives hearts, center text (DVD bounce)
│   ├── ComboHUDViewModel.ts    — combo counter, neon tier colors, scale punch
│   ├── BackgroundAnimViewModel.ts — dynamic hue overlay, pulses on brick destroy
│   └── HighScoreHUDViewModel.ts — leaderboard table with staggered slide-in
├── Services/
│   ├── CoinService.ts          — coin spawn (1–3 per brick), shmup-vacuum, super-vacuum on clear, score events
│   ├── BallPowerService.ts     — heat-driven speed multiplier + pierce thresholds
│   ├── VfxService.ts           — 170 general + 30 trail particle pool, trail SOA buffers
│   ├── JuiceService.ts         — hit-freeze + camera shake + paddle/crack particle bursts per event
│   ├── CameraShakeService.ts   — decaying random camera offset
│   ├── AudioManager.ts         — @service singleton, round-robin SoundComponent pools, 22 SFX IDs + music
│   └── LeaderboardManager.ts   — server pre-fetch + broadcast, client cache + fallback fetchEntryForPlayer
├── CollisionManager.ts         — lazy singleton, AABB register/unregister/query/checkAgainst
├── LevelConfig.ts              — 11 LevelConfig entries + Title screen layout
├── Constants.ts                — all tunable values (bounds, speeds, freeze/shake, vacuum, pool sizes)
├── Assets.ts                   — BrickAssets, PowerUpAssets (empty), Particle template references
└── Types.ts                    — Events / HUDEvents / ComboHUDEvents / HeatEvents / BackgroundEvents / LeaderboardEvents / HighScoreHUDEvents
```

Scene files: `space.hstf` (main scene), `Templates/Breakout.hstf`, `Templates/GameplayObjects/{Brick,ExplosiveBrick,BigPaddle,StickyPaddle}.hstf`, `Templates/Particle.hstf`, `Templates/Audio/collect_7.hstf`.

UI files: `UI/{GameHUD,ComboHUD,Background,HighScoreHUD}.xaml`.

---

## Current Content

- **Levels:** 11 in `LEVELS` (Arcade, Diamond, Checkerboard, Invader, Zigzag, Heart, Pyramid, Columns, Cross, Diagonal Stripes, Rings) + 1 `Title` screen layout. Levels cycle infinitely.
- **Brick templates:** 1 (`BrickAssets.Normal`); ExplosiveBrick prefab exists but is not referenced in any `LevelConfig`.
- **Power-up types:** 2 in `PowerUpType` enum (`BigPaddle`, `StickyPaddle`). Templates exist (`BigPaddle.hstf`, `StickyPaddle.hstf`) but `PowerUpAssets` registry is empty — power-ups are disabled by default. See "Re-enabling power-ups" in `GAMEPLAY.md`.
- **Victory conditions supported:** `allBricksDestroyed`, `bricksDestroyed`, `survivalTime` (all 11 levels currently use `allBricksDestroyed`).
- **Sound IDs:** 22 in `SFX` (ball, bricks, power-ups, coins, combos at 2/5/10/15, heat at 5/10/20, game state, music).
- **Particle pool:** 170 general + 30 trail (pre-warmed once by `VfxService.prewarm()` on game start).
- **Brick pool:** 106 entities pre-warmed by `LevelLayout`.
- **Reveal animations:** 4 styles × 5 stagger patterns = 20 randomized level intros.

---

## Key Design Principles

- **All gameplay is client-side.** `NetworkingService.isServerContext()` early-returns at the top of every `onStart`. Only `LeaderboardManager` has server logic (fetch + submit + broadcast).
- **Frame-driven everything.** Use `OnWorldUpdateEvent` and `payload.deltaTime`. Never use `setTimeout` for gameplay logic (only used for the brief 200ms post-clear pause and brick flash restore).
- **Ball physics use substeps.** Up to 8 sub-steps per frame so the ball never moves more than one radius per step — prevents tunneling through bricks.
- **Collision is AABB only.** All colliders implement `ICollider` and return a `Rect` from `getColliderBounds()`. `localScale.x/y` IS the collider footprint — keep visual meshes inside the unit cube.
- **Entity pools, never spawn/destroy in hot paths.** Bricks (106) and particles (170+30) are spawned once at start; brick recycling goes through `Events.BrickRecycle`.
- **Services are `@service()` singletons** accessed via `.get()`. Components are `@component()` and attach to scene entities.
- **Color flows through `ColorComponent` on a child entity** (the visuals child), not the root entity. Code looks for `getChildrenWithComponent(ColorComponent)` first, then falls back to the root.
- **Levels are pure data.** All per-level differences (grid, palette, physics overrides, victory) live in `LevelConfig.ts`. No level should require new code.
