# Gameplay — AtlasV Fishing

## Core Loop

```
TitleScreen (Play tap)
  → GameStarted event → HUDs animate in, camera animates to gameplay Y
  → GamePhase.Idle
       ↑                                                 |
       |                                            (Cast button tap)
       |                                                 ↓
   GamePhase.Reset ←  GamePhase.Launching  ←  GamePhase.Surfacing  ←  GamePhase.Diving  ←  GamePhase.Throwing
   (RESET_DELAY s)    (staggered fish arc)    (auto-rise, scrolls    (descent + swipe        (cast arc, no
                       + reward bursts)        camera back up)        steering, fish        player input)
                                                                       collide with hook)
```

| Phase | State | File / enum |
|---|---|---|
| `GamePhase.Idle` | Hook bobs at idle position, fish swim, HUDs visible, Cast button live | `GameManager.onCastRequested`, `HookController._tickIdle` |
| `GamePhase.Throwing` | Hook in physics arc above water | `HookController._tickThrowing` |
| `GamePhase.Diving` | Hook descends; swipe steers; fish attach on collision | `HookController._tickDiving` |
| `GamePhase.Surfacing` | Hook rises automatically, camera tracks back up, crescendo shake | `HookController._tickSurfacing` |
| `GamePhase.Launching` | Fish fly upward in staggered arcs; hook springs back to idle | `HookController._tickLaunching`, `HookController._startLaunch` |
| `GamePhase.Reset` | RESET_DELAY-second pause | `GameManager.onUpdate` |

State transitions are owned by `GameManager` ([Scripts/Components/GameManager.ts](Scripts/Components/GameManager.ts)) and triggered either by the Cast button (`Events.CastRequested`) or by `HookController` requesting the next phase (`RequestDiving` / `RequestSurface` / `RequestLaunch`).

## Hook System

Owned by `HookController` ([Scripts/Components/HookController.ts](Scripts/Components/HookController.ts)).

- Position state: `_hookX`, `_hookY`, `_hookVX`, `_hookVY`.
- **Cast arc:** initial velocity `(CAST_CENTER_VX ± CAST_VX_RANDOM, CAST_VY)` with `CAST_GRAVITY` until the hook crosses `WATER_SURFACE_Y`, then `RequestDiving` fires.
- **Dive:** terminal speed `DIVE_SPEED`. Each swipe frame adds `delta * DIVE_SWIPE_FORCE` to `_hookVX` (clamped to `±DIVE_SWIPE_MAX_SPEED`), plus drag `DIVE_X_DRAG`, plus a center spring `DIVE_CENTER_PULL * _hookX`, plus wall bounce `DIVE_BOUNCE`. On collision (radius `HOOK_COLLECT_RADIUS * fish.size`) and below the hook's `_maxFish` capacity, the fish is added to `_hookedFish` and `Events.FishHooked` fires.
- **End-dive condition:** dive depth ≥ `_maxDepth` OR hook full → `RequestSurface`.
- **Surface:** `_hookY += SURFACE_SPEED * _depthScale * dt`. `_depthScale` lerps from `DEPTH_SCALE_MIN` to 1.0 as `divedDistance / DEPTH_SCALE_FULL_AT` reaches 1. So deep dives feel violent, shallow dives gentle. Drifts X back toward `LAUNCH_ANCHOR_X = 0` with crescendo shake.
- **Launch:** fish dequeued every `LAUNCH_STAGGER` s with `launch(vx, vy, gravity)`; hook itself spring-damps back to `(HOOK_IDLE_X, HOOK_IDLE_Y)` via `HOOK_RETURN_STIFFNESS / HOOK_RETURN_DAMPING`. Each fish is "collected" (FishCollected fires) the first frame its `flyVY ≤ 0` (apex reached) or `worldY ≥ LAUNCH_EXIT_Y`. Safety timeout `LAUNCH_TIMEOUT` always closes the phase.

Every hook position update emits `Events.HookMoved`, which `GameCameraService` and `HookedFishAnimator` listen to.

## Fish System

Owned by `FishDataService` ([Scripts/Services/FishDataService.ts](Scripts/Services/FishDataService.ts)). Fish are pure data — `FishInstance` objects in `Scripts/Types.ts`. No entities, no per-fish components.

- **Pool:** `_createPool` instantiates `POOL_COUNT_COMMON` / `POOL_COUNT_RARE` / `POOL_COUNT_LEGENDARY` `FishInstance`s per def at startup, all inactive on the bench. Total ≈ `31 species × per-rarity counts`.
- **Slot-based spawning:** below the camera, a non-linear depth ramp generates Y slots — dense near the surface (`POOL_SLOT_STEP_MIN = 1 m`), sparse at depth (`POOL_SLOT_STEP_MAX = 8 m`), linearly interpolated until `POOL_SLOT_STEP_RAMP_DEPTH = 15 m`. A vacant slot rolls a species via the wave formula below.
- **Species roll formula:**
  ```
  effectiveWave = max(WAVE_FLOOR, sin(depth/wave1Period + wave1Offset) × sin(depth/wave2Period + wave2Offset))
  spawn if Random < def.spawnChance × effectiveWave
  ```
  Period ratios use √2, √3, φ so density patterns never repeat. Pass-2 fallback (`FALLBACK_SPAWN_CHANCE = 0.35`) force-spawns from the eligible pool when the wave roll fails — this kills empty zones.
- **Activation:** `fish.activate(spawnX, slotY, speedMin, speedMax, size)`. Size is rolled inside `[sizeMin, sizeMax]` then compressed toward the mean by `FISH_SIZE_RANGE_COMPRESSION = 0.6`, then jittered by `±POOL_SCALE_VARIANCE`.
- **Swim AI:** picks a random target X (≥ `FISH_MIN_MOVE_DIST` from current), walks toward it at `moveSpeed`, then pauses `FISH_PAUSE_DUR_MIN..MAX` s. Vertical bob `FISH_BOB_AMP × sin(t × FISH_BOB_FREQ)`. Periodic ambient bubble via `BubblePool.acquire`.
- **Recycling:** fish that drift outside the buffer zone (`±POOL_SLOT_SPREAD` around the camera) or more than `POOL_SLOT_DRIFT_MAX` from their assigned slot are benched and their slot freed.
- **Initial fill:** when `Events.GameStarted` fires, `_pendingInitialFill = 3` strata are populated below the surface on the first frame the camera reports a position — so the idle screen has fish immediately.

## Rendering — Sprite Overlay

`FishSpriteRenderer` ([Scripts/Components/UI/FishSpriteRenderer.ts](Scripts/Components/UI/FishSpriteRenderer.ts)) runs on a single scene entity carrying [UI/FishSprites.xaml](UI/FishSprites.xaml).

- Each frame, iterates `FishDataService.allActive()` and `drawRect` for every visible fish into a `DrawingCommandsBuilder`, then assigns the resulting `DrawingCommandData` to its ViewModel.
- World → canvas projection assumes an orthographic camera with `orthographicSize = 9.5`. Canvas height is fixed at 960 px; canvas width is set in `onStart` from the actual screen aspect via `getScreenAspectRatio()` so the UI stays glued to the 3D scene on any device.
- **Hooked fish** are drawn with a translate/rotate/scale stack using the per-fish `HookedFishAnimator.getAnimState(fishId)` (`offsetX/Y` from pendulum, `rotation`, `scaleX/Y` from tangential velocity). Pivot is at the mouth-side edge (`HOOK_PIVOT_Y_FRACTION = 0.5`) so the fish hangs by its mouth.
- **Free fish** get a procedural swim animation: `sin(t × 4.5)` squash/stretch + `sin(t × 3.2)` nose tilt, desynced per fish via `fishId × 2.3`.

## Camera

`GameCameraService` ([Scripts/Services/GameCameraService.ts](Scripts/Services/GameCameraService.ts)) is the only owner of the camera entity.

- `registerCamera(entity)` is called by `ClientSetup` after a short delay; it stores the base pose and calls `CameraService.setActiveCamera({ camera: cameraComponent })`.
- **Scroll:** during `Diving`/`Surfacing`, `_scrollTargetY = clamp(p.y - basePosY, ≤0)`. The camera lerps via `CAMERA_SCROLL_LERP_SPEED` while diving, and tracks instantly during surfacing.
- **Shake:** one-shot `startShake(duration, amplitude)` (linearly decays) and `setContinuousShake(amplitude)` (until `stopContinuousShake`). Shake is exempt from the VFX freeze gate so it keeps playing.
- **Intro animation:** `animateTo(targetWorldY, durationMs)` with ease-in-out quad. Called by `TitleScreenUIComponent` when Play is pressed.
- Publishes `cameraCenterY` to `FishDataService.setCameraY` each frame so recycling works.

## Progression

`PlayerProgressService` ([Scripts/Services/PlayerProgressService.ts](Scripts/Services/PlayerProgressService.ts)) is the only file that talks to `PlayerVariablesService`. Single-player world.

- **Save shape (`SaveData`):** `catchDefIds[]`, `catchCounts[]`, `gold`, `lineLevel`, `hookLevel`. Stored under `PLAYER_VARIABLE = 'fishCollection'`.
- **Server, on `OnPlayerCreate`:** fetch, broadcast `NetworkEvents.ProgressData` to the client; create an empty record on first join.
- **Server, on `NetworkEvents.ReportCatch`:** increment count, add `def.gold` to gold, persist (debounced 400 ms), echo new gold via `NetworkEvents.UpgradeResult`.
- **Server, on `NetworkEvents.ReportBuyUpgrade`:** validate against `LINE_MAX_LEVEL` / `HOOK_MAX_LEVEL` and `upgradeCost(nextLevel)`; deduct gold, bump level, persist, echo result.
- **Client side:** receives `ProgressData` → emits local `Events.ProgressLoaded` (which `HookController`, `FishCollectionService`, HUD viewmodels listen to). On `FishCollected` it sends `ReportCatch` to server and immediately fires local `Events.FishCaught` so the collection grid + HUDs update without a round-trip.

## HUDs

Three XAML layers, all `CustomUiComponent`-driven:

| Layer | XAML | ViewModel | When visible | Interactive? |
|---|---|---|---|---|
| `TitleScreen` | [UI/TitleScreen.xaml](UI/TitleScreen.xaml) | `TitleScreenUIComponent` | Until Play tap | Yes |
| `GameHUD` | [UI/GameHUD.xaml](UI/GameHUD.xaml) | `GameHUDViewModel` | After Play — gold counter only | No (`IsHitTestVisible=False`) |
| `InteractiveHUD` | [UI/InteractiveHUD.xaml](UI/InteractiveHUD.xaml) | `InteractiveHUDViewModel` | Idle phase only | Yes — Cast, Line+, Hook+, Collection |
| `FishingHUD` | [UI/FishingHUD.xaml](UI/FishingHUD.xaml) | `FishingHUDViewModel` | Diving / Surfacing — depth + max-depth + fish counter + species progress | No |
| `FishCollection` | [UI/FishCollection.xaml](UI/FishCollection.xaml) | `FishCollectionUIComponent` | Opened from InteractiveHUD button | Toggled — `isInteractable=true` only when open |
| `GoldCoinsAnimator` | [UI/GoldCoinsAnimator.xaml](UI/GoldCoinsAnimator.xaml) | `GoldCoinsAnimatorViewModel` | Always | No |
| `FishSprites` | [UI/FishSprites.xaml](UI/FishSprites.xaml) | `FishSpriteRenderer` | Always | No |

The `IsHitTestVisible=False` rule on counter panels is critical: it keeps the swipe-during-dive input flowing through to `HookController`'s `OnFocusedInteractionInputMoved`.

## Extension Axes

### Add a fish species

1. Add one entry to `FISH_DEFS` in [Scripts/FishDefs.ts](Scripts/FishDefs.ts). Pick a fresh `id`, set `rarity`, `gold`, `depthMin`, `spawnChance`, the four wave parameters (use irrational period ratios), `sizeMin/Max`, `speedMin/Max`.
2. Drop a transparent PNG sprite into [Sprites/Fish/](Sprites/Fish/). Make sure the `.assetmeta` sets `premultiplyAlpha: true`.
3. Add a `TextureAsset` line and a `SPRITE_FISH_MAP` row in [Scripts/FishSpriteAssets.ts](Scripts/FishSpriteAssets.ts) with the sprite's pixel size at `size=1`.

### Add a juice effect

1. Add a method to `VFXService` ([Scripts/Services/VFXService.ts](Scripts/Services/VFXService.ts)).
2. Either call it manually from the trigger site, or wire it via a new `@subscribe(Events.XXX)` handler inside `VFXService`.

### Add a new gameplay phase

1. Add the enum value to `GamePhase` in [Scripts/Types.ts](Scripts/Types.ts).
2. Add the case to the `switch` in `HookController.onUpdate`.
3. Add transition logic in `GameManager` or in `HookController.onPhaseChanged` (whichever owns the entry/exit decision).

### Tweak feel

All numbers in [Scripts/Constants.ts](Scripts/Constants.ts). Common targets:

- Cast arc: `CAST_CENTER_VX`, `CAST_VY`, `CAST_GRAVITY`, `CAST_VX_RANDOM`.
- Dive feel: `DIVE_SPEED`, `DIVE_SWIPE_FORCE`, `DIVE_X_DRAG`, `DIVE_CENTER_PULL`, `DIVE_BOUNCE`.
- Surface punch: `SURFACE_SPEED`, `SURFACE_FREEZE_MS`, `DEPTH_SCALE_MIN`, `DEPTH_SCALE_FULL_AT`.
- Reward arc: `LAUNCH_VY_MIN/MAX`, `LAUNCH_VX_SPREAD`, `LAUNCH_STAGGER`, `LAUNCH_GRAVITY`, `HOOK_RETURN_STIFFNESS`, `HOOK_RETURN_DAMPING`.
- Upgrades: `LINE_MAX_LEVEL`, `HOOK_MAX_LEVEL`, `lineDepthAtLevel(n)`, `hookMaxFishAtLevel(n)`, `upgradeCost(n)`.

### Change visual style

Recolour the depth gradient in [Materials/DepthGradient.material](Materials/DepthGradient.material) (or per-instance properties: `topColor`, `bottomColor`, `topY`, `bottomY`). Regenerate sprites following the prompt constraints documented in [Docs/ART_DIRECTION.md](Docs/ART_DIRECTION.md).

## Known Issues

| Severity | File | Description |
|---|---|---|
| low | [Scripts/Services/FishRegistry.ts](Scripts/Services/FishRegistry.ts) | Compatibility shim around `FishDataService`. Both names work; new code should call `FishDataService.get()` directly. |
| low | [Scripts/Types.ts](Scripts/Types.ts) | `IFishInstance` is an alias for `FishInstance`, kept during migration off the old pool. New code should use `FishInstance`. |
