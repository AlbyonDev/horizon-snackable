# Project Summary — AtlasV Fishing

**Genre:** Single-player snackable fishing game (cast → dive → surface → catch)
**Platform:** Meta Horizon Studio — Mobile portrait (9 × 16 world units)
**Art Style:** Bright cartoon, unlit, tropical/aquatic
**Engine:** Meta Horizon Worlds SDK (TypeScript ES2022) + XAML CustomUI + DrawingSurface sprite renderer

## Game Overview

Tap to cast a hook into the water, then swipe horizontally to steer it during its automatic descent. Fish that come within hook radius latch on. Once the hook reaches its max depth or is full, it surfaces automatically and the catch launches in a reward arc. Each fish collected awards gold; gold buys two upgrades (longer line, bigger hook). The collection grid shows all 31 species — discovered ones reveal their sprite and per-catch value, undiscovered ones stay as silhouettes.

There is no reel mechanic, no timing challenge, no failure state. Engagement comes from steering during the dive, the suspense of what crosses the hook radius, and filling the species journal.

## Technical Architecture

```
Scripts/
  Types.ts                       — GamePhase enum, FishInstance class, all LocalEvent and NetworkEvent declarations
  Constants.ts                   — All tunable values + upgrade formulas (lineDepthAtLevel, hookMaxFishAtLevel, upgradeCost)
  Assets.ts                      — TemplateAsset paths (Cube, Bubble, GoldCoinsAnimator)
  FishDefs.ts                    — Static array of 31 IFishDef entries (id, rarity, gold, spawnChance, depthMin, wave params, size, speed)
  FishSpriteAssets.ts            — TextureAsset declarations + defId → sprite pixel-size map (SPRITE_FISH_MAP)
  CameraUtils.ts                 — getScreenAspectRatio() helper (uses stable CameraService.screenToWorldPoint)

  Components/
    ClientSetup.ts               — Locks camera (registers with GameCameraService), enables FocusedInteraction, registers flash plane with VFXService
    GameManager.ts               — Phase state machine (Idle → Throwing → Diving → Surfacing → Launching → Reset → Idle); owns Idle→Throwing and Launching→Reset→Idle transitions
    HookController.ts            — Hook position/velocity, swipe input, fish collection, line stretch, launch arc; emits RequestDiving/RequestSurface/RequestLaunch
    BubbleController.ts          — Per-bubble: rise + drift + breath + alpha oscillation; auto-releases to BubblePool at surface or off-screen
    UI/
      FishSpriteRenderer.ts      — DrawingSurface-based sprite overlay; per-frame draws every active fish via DrawingCommandsBuilder
      GameHUDViewModel.ts        — Gold counter visibility/value
      InteractiveHUDViewModel.ts — Cast button, Line/Hook upgrade buttons, Collection open button (only interactive during Idle)
      FishingHUDViewModel.ts     — Depth counter, max-depth marker, fish counter, species progress bar (during Diving/Surfacing)
      FishCollectionUIComponent  — Fullscreen collection grid + detail view; opened via LocalEvent OpenFishCollectionRequested
      TitleScreenUIComponent.ts  — Fullscreen title overlay with Play button; emits TitleScreenPlayRequested LocalEvent
      GoldCoinsAnimatorViewModel — XAML viewmodel API for the in-code coin/text burst animator

  Services/
    GameCameraService            — Owns camera entity; scrolls vertically with the hook during Diving/Surfacing; one-shot + continuous shake; intro animateTo(targetY, durationMs)
    FishDataService              — Pure data fish manager: owns FishInstance pool, slot-based spawn ramp, wave-modulated species rolls, swim AI, flying physics
    FishRegistry                 — Thin compatibility wrapper around FishDataService (kept so HookController/FishSpriteRenderer can keep their imports)
    HookedFishAnimator           — Driven-pendulum animation for hooked fish (reacts to hook acceleration + SwipeKick); exposes per-fishId getAnimState() consumed by FishSpriteRenderer
    BubblePool                   — Pre-spawns BUBBLE_POOL_SIZE bubble entities; acquire(x, y) targets one via Events.InitBubble; release() parks it back
    VFXService                   — Shake/flash/freeze/haptic/stretch/squash; built-in triggers on FishHooked + RequestSurface + FishCollected
    GoldCoinsService             — On FishCollected: bursts coins + floating "+N" text on the GoldCoinsAnimator canvas; gold-tier-driven count and color
    FishCollectionService        — In-memory catch counts seeded from ProgressLoaded, updated on FishCaught
    PlayerProgressService        — Server-side persistence (PlayerVariablesService) of catch counts + gold + line/hook levels; debounced setVariable; routes upgrade purchases

Templates/                       — Cube, Bubble, FishingRod, Sphere, Bait; plus GameplayObjects/GoldCoinsAnimator.hstf
UI/                              — TitleScreen, GameHUD, InteractiveHUD, FishingHUD, FishCollection, GoldCoinsAnimator, FishSprites XAML panels
Sprites/Fish/                    — 31 fish sprite PNGs (transparent, premultiplyAlpha)
Textures/                        — BGStart, FishingLegend_logo, gold_icon, journal_icon, bait, hook
Shaders/DepthGradient.surface    — Unlit depth-gradient shader (turquoise surface → night blue abyss)
Materials/DepthGradient.material — Material applying the depth gradient
Assistant/Skills/                — AI assistant skill files (sprites, drawing surface, sound design, etc.)
Docs/                            — This file, ART_DIRECTION.md, GAMEPLAY.md, TASK_BOARD.yaml
```

## Current Content

- **Fish species:** 31 (`FISH_DEFS` in [Scripts/FishDefs.ts](Scripts/FishDefs.ts)). IDs 1–31. Rarity distribution: 15 common, 11 rare, 5 legendary.
- **Fish sprites:** 31 PNGs under [Sprites/Fish/](Sprites/Fish/), one per def. All mapped via `SPRITE_FISH_MAP` in [Scripts/FishSpriteAssets.ts](Scripts/FishSpriteAssets.ts).
- **Upgrades:** 2 axes — Line (max depth, level 0 → 100; depth(0)=15 m, +16 m per level), Hook (max fish per run, level 0 → 90; fish(0)=1, fish(n)=n+1). Cost formula `upgradeCost(n) = floor(8 * n^1.9)`.
- **Bubble pool:** 40 pre-spawned bubble entities (`BUBBLE_POOL_SIZE`). Re-used for both ambient fish bubbles and the hook trail.
- **Gold-coin animator:** 60 coin + 10 text slots (`COIN_POOL_SIZE`, `TEXT_POOL_SIZE`) drawn on a single 600×600 canvas placed in world.
- **Phases:** 6 — Idle, Throwing, Diving, Surfacing, Launching, Reset (`GamePhase` in [Scripts/Types.ts](Scripts/Types.ts)).
- **Persistence:** one `fishCollection` PlayerVariable (`SaveData` in [Scripts/Services/PlayerProgressService.ts](Scripts/Services/PlayerProgressService.ts)) holds catch counts + gold + line/hook levels.

## Key Design Principles

- **Client-only gameplay.** Every `Component.onStart()` early-returns on `NetworkingService.get().isServerContext()`. Only `PlayerProgressService` runs server logic (for persistence).
- **Data-driven fish, sprite-rendered.** Fish are plain `FishInstance` data objects — no entities, no per-fish components. A single `FishSpriteRenderer` draws every active fish each frame through `DrawingCommandsBuilder`. Adding species = one row in `FishDefs.ts` + sprite + row in `SPRITE_FISH_MAP`.
- **Events, never direct references.** Components and services communicate exclusively via `EventService.sendLocally(...)`. The phase state machine in `GameManager` advances only through `Events.RequestDiving / RequestSurface / RequestLaunch` requests from `HookController`.
- **Single source of truth for assets.** All `TemplateAsset` constructions live in `Scripts/Assets.ts`; all `TextureAsset` constructions for fish live in `Scripts/FishSpriteAssets.ts`.
- **All tunables in `Constants.ts`.** Cast physics, dive physics, depth scaling, pool sizes, bubble parameters, upgrade formulas — every magic number is named and lives in one file.
- **Camera scroll = vertical only.** `GameCameraService` translates the camera Y to follow the hook during Diving/Surfacing and is the single owner of `setActiveCamera`. It also publishes `cameraCenterY` to `FishDataService` so far-from-view fish recycle.
- **VFX freeze gate.** Long-running per-frame handlers check `VFXService.get().isFrozen` and skip ticks during a freeze, except `GameCameraService` (so shake keeps playing).
