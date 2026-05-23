# Art Direction — AtlasV Fishing

**Visual Style:** Bright, cartoon, unlit. Rounded shapes, saturated colors, no realistic lighting. Reads instantly on a small portrait phone screen — bubbly, pop, tropical.

## Scene Map — Where Things Live

The whole world is authored in [space.hstf](space.hstf). Use this section to figure out which file to open when remixing visuals.

### Screen-space UI (XAML + ViewModel pairs)

All HUDs are `CustomUiPlatformComponent` set to `ScreenSpace` — no world position, they overlay the whole screen.

| XAML | Role | ViewModel (data bindings) |
|---|---|---|
| [UI/TitleScreen.xaml](UI/TitleScreen.xaml) | Fullscreen title with logo + Play button | [TitleScreenUIComponent](Scripts/Components/UI/TitleScreenUIComponent.ts) |
| [UI/GameHUD.xaml](UI/GameHUD.xaml) | Gold counter (top centre); non-interactive | [GameHUDViewModel](Scripts/Components/UI/GameHUDViewModel.ts) |
| [UI/InteractiveHUD.xaml](UI/InteractiveHUD.xaml) | Cast button, Line/Hook upgrades, Collection button — visible only in `Idle` | [InteractiveHUDViewModel](Scripts/Components/UI/InteractiveHUDViewModel.ts) |
| [UI/FishingHUD.xaml](UI/FishingHUD.xaml) | Depth counter, max-depth marker, fish counter, species progress bar (Diving/Surfacing) | [FishingHUDViewModel](Scripts/Components/UI/FishingHUDViewModel.ts) |
| [UI/FishCollection.xaml](UI/FishCollection.xaml) | Fullscreen species grid + detail view | [FishCollectionUIComponent](Scripts/Components/UI/FishCollectionUIComponent.ts) |
| [UI/FishSprites.xaml](UI/FishSprites.xaml) | `DrawingSurface` overlay where every active fish is drawn per-frame | [FishSpriteRenderer](Scripts/Components/UI/FishSpriteRenderer.ts) |
| [UI/GoldCoinsAnimator.xaml](UI/GoldCoinsAnimator.xaml) | Canvas with dynamic coin + text lists for the FishCollected reward burst | [GoldCoinsAnimatorViewModel](Scripts/Components/UI/GoldCoinsAnimatorViewModel.ts) |

### Spawned runtime entities (pools)

These are *not* in the scene file — code calls `WorldService.spawnTemplate` with `NetworkMode.LocalOnly` and stores the instances in a pool. Inactive instances are parked off-screen.

| Pool | Size | Template | Parked at | Owner |
|---|---|---|---|---|
| Bubble pool | `BUBBLE_POOL_SIZE` = 40 | [Templates/Bubble.hstf](Templates/Bubble.hstf) | `(0, POOL_PARK_Y=1000, 0)` | [BubblePool](Scripts/Services/BubblePool.ts) |
| Gold coins animator | 1 (singleton canvas) | [Templates/GameplayObjects/GoldCoinsAnimator.hstf](Templates/GameplayObjects/GoldCoinsAnimator.hstf) | Spawned at `(0, CANVAS_CENTER_WORLD_Y=7, −0.1)` scaled to `CANVAS_ENTITY_SCALE=12` | [GoldCoinsService](Scripts/Services/GoldCoinsService.ts) |

Fish themselves are **not** spawned entities — they are plain `FishInstance` data drawn by `FishSpriteRenderer`.

### Scene-placed entities (authored in space.hstf)

| Name | Components | Role |
|---|---|---|
| `Game` | `ClientSetup`, `GameManager` | Top-level orchestrator; `ClientSetup.camera` references the `Camera` entity below, `ClientSetup.flashPlane` references `Flash` |
| `Camera` | `TransformPlatformComponent`, `CameraPlatformComponent` | The active gameplay camera — see numbers below |
| `Flash` | `TransformPlatformComponent`, `MeshPlatformComponent`, `ColorPlatformComponent` | Full-screen tinted plane in front of the camera; `VFXService` fades its alpha in/out for the flash effect |
| `Background` | Mesh + `DepthGradient` material | Large rotated plane (~10.7 × 30.9 wu, X-aligned) behind play area — applies the depth gradient water shader |
| `Sky` | Mesh + `bgstart` material | Plane above water (Y ≈ 7) showing the sky background |
| `Plane` | Mesh | Ground / scene framing plane |
| `FishingRod` | Template ref ([Templates/FishingRod.hstf](Templates/FishingRod.hstf)) carrying the `HookController` script + hook + line entities | Rod, hook, and line visuals; `HookController` owns the hook physics |
| `FishingHUD`, `GameHUD`, `InteractiveHUD`, `TitleScreen`, `FishCollectionUI`, `FishSpriteRenderer`, `GoldAnimationUI` | `CustomUiPlatformComponent` + their ViewModel | The screen-space UI surfaces listed above; `GoldAnimationUI` is the world-space variant for the in-canvas coin/text bursts |
| `SpawnPoint`, `StartingWorld` | SDK player-spawn boilerplate | Single-player entry point — do not modify unless rebuilding the world frame |

## Game Camera

**Source:** scene entity named `Camera` in [space.hstf](space.hstf). Activated by [ClientSetup.ts](Scripts/Components/ClientSetup.ts) calling `GameCameraService.registerCamera(camera)`, which then calls `CameraService.setActiveCamera({ camera })`. After that, [GameCameraService](Scripts/Services/GameCameraService.ts) is the sole writer of the camera's transform.

| Property | Value |
|---|---|
| Position (world) | `(0, 6.5, 25)` |
| Rotation | Identity — looking −Z |
| Projection | `Orthographic` |
| Orthographic size (half-height) | `9.5` world units → visible Y range = 19 wu |
| Field of view (unused, stored from authoring) | `60°` |
| Camera Y at runtime | `6.5 + scrollOffsetY`, where `scrollOffsetY ≤ 0` and tracks the hook during `Diving`/`Surfacing` |

**Consequences for art:**

- The scene is laid out on the **XY plane**. World +X is right on screen, world +Y is up on screen, world −Z points *into* the screen toward the viewer's far depth.
- Because the camera is orthographic, **Z has no perspective effect** — depth-ordering only. Place 2D-style art on planes at any Z you like as long as you respect render order:
  - `FishSprites` overlay (DrawingSurface) draws in front of the 3D scene at the UI layer.
  - `Flash` plane sits just in front of the camera (look for its small −Z offset).

## Character & Sprite Style

- **Fish sprites:** 2D, facing right, clean silhouette, bold outline, cel-shaded with soft rim light.
- **Background:** transparent PNG, cropped to content (no padding), `premultiplyAlpha: true` set in each `.assetmeta`.
- **Lineart:** consistent stroke weight across the species set.
- **Shading:** flat color base + one cel-shading step + a single rim highlight. No gradients on the body.
- **Eyes:** large round eye, single highlight dot, biased toward the head.
- **Proportions per rarity:**
  - Common — natural-ish body proportions, smaller sizes.
  - Rare — slightly exaggerated colors, mid-size.
  - Legendary — largest, most saturated, strongest outline.
- **Minimum readable size:** ~40 px tall on canvas (smallest defs land near `basePixelH: 24` × in-world `size: 0.9`).
- **Generation prompt constraints (used when regenerating sprites):** white background → removed to transparent, no shadows, no bubbles, no environment, no UI text, single creature centered, facing right.

## Color Palette

Depth-gradient world background (driven by [Shaders/DepthGradient.surface](Shaders/DepthGradient.surface)):

| Role | Hex | Notes |
|---|---|---|
| Surface water (top Y ≈ 5) | turquoise / cyan | Bright tropical above-water mood |
| Abyssal water (bottom Y ≈ −40) | deep night blue | Mysterious end-of-dive |

UI tinting (read from XAML panels):

| Role | Hex | Notes |
|---|---|---|
| Coin text (low gold, < 15) | `#FFD700` | Yellow gold |
| Coin text (medium, 15–24) | `#FFA500` | Orange |
| Coin text (high, 25–49) | `#FF6D00` | Deep orange |
| Coin text (very high, ≥ 50) | `#FF3D00` | Fiery red |
| Bubble color | `(0.85, 0.95, 1.00)` linear | `COLOR_BUBBLE` in [Scripts/Constants.ts](Scripts/Constants.ts) |
| Line above water | `(0.95, 0.95, 0.82)` linear | `COLOR_LINE` |
| Line below water | `(0.78, 0.90, 1.00)` linear | `COLOR_LINE_WATER` |

## UI Visual Style

- **Panels:** double bordered (white outer + dark inner), rounded corners, slight drop shadow.
- **Buttons:**
  - Cast button — orange "buzzer" style, large round pad, prominent shadow.
  - Upgrade buttons (Line / Hook) — 500 px wide cartouches with watermark icon at the left edge (130 × 130 px, opacity 0.35) and a `current → next` value with an arrow Path.
  - Collection button — top-right of `InteractiveHUD`, same cartouche style.
- **Counters (Gold, Depth, Fish):** outlined text with stroke (3–10 px black), drop shadow, centered. `IsHitTestVisible=False` so they never block swipe input.
- **Animations:** elements appear and disappear in a staggered cascade (top counters slide down, cast button pops up from below, shop buttons sequence in). Reverse on hide.
- **Typography:** bold, rounded, high-contrast. No fine print during gameplay.

## Title Screen

- Fullscreen background image [Textures/BGStart.png](Textures/BGStart.png).
- Centered logo [Textures/FishingLegend_logo.png](Textures/FishingLegend_logo.png).
- Orange buzzer-style Play button (copy of `CastButtonTemplate` style).
- Exit animation on Play: logo slides up off-screen (TranslateY −1500 over 0.45 s), button scales and fades (0.4 s), then the title hides and `TitleScreenPlayRequested` fires. Camera animates from idle pose to the gameplay Y over 550 ms to sync.

## Catch Display / Reward Moments

The most graphic moment is when a fish is collected: a coin burst (count and color tier driven by the fish's gold value) plus a floating `+N` text rendered on the in-world `GoldCoinsAnimator` canvas (see `GoldCoinsService`).

| Gold tier | Coins | Speed range (wu/s) | Text scale | Text color |
|---|---|---|---|---|
| < 15 | 5 | 2.5 – 4.5 | 1.0× | `#FFD700` |
| 15 – 24 | 7 | 3.0 – 5.5 | 1.2× | `#FFA500` |
| 25 – 49 | 10 | 4.0 – 7.0 | 1.4× | `#FF6D00` |
| ≥ 50 | 14 | 5.5 – 9.0 | 1.8× | `#FF3D00` |

Coins fan out in a 270° arc, spin between 280 – 600 deg/s, fall under gravity, scale-pop to 1.4× then settle, and fade out after ~60 % of their lifetime.

## Juice & VFX

Centralised through `VFXService`:

- **Freeze frame:** 60 ms on `FishHooked`, 180 ms on `RequestSurface` (`SURFACE_FREEZE_MS`).
- **Camera shake:** one-shot `shake(duration, amplitude)` plus a continuous mode for the surfacing crescendo (ramps from 0.02 to 0.12).
- **Flash:** full-screen fade-out overlay on `RequestSurface` (cyan-tinted, 0.22 s).
- **Stretch / Squash:** Y-up X-down or inverse, used for hook/fish pops.
- **Haptics:** medium on hook, light on collect.
- **Hooked fish pendulum:** [Scripts/Services/HookedFishAnimator.ts](Scripts/Services/HookedFishAnimator.ts) drives a per-fish driven pendulum (different rope length per fish for desynced swing) plus squash/stretch from tangential velocity. Reacts to hook acceleration *and* to `SwipeKick` for instant whip on swipe input.

Exaggerated by design — this is a cartoon, not a simulation.

## Environment / Background Style

- **Play area:** 9 × 16 world units, portrait.
- **Water column:** rendered by the `DepthGradient` unlit shader applied to large background planes. Top color and bottom color are tunable per-material via the shader's exposed properties (`topColor`, `bottomColor`, `topY`, `bottomY`).
- **Bubbles:** ambient bubbles from fish + a dense trail from the hook (interval 0.12 s while diving, 0.07 s while surfacing, ±0.3 X jitter). Scales 0.04 – 0.15.
- **No characters in background.** The diver/rod is on a separate plane in front of the water column.

## Sprite Specifications

| Category | Pixel size | Format | Notes |
|---|---|---|---|
| Fish sprite | Varies by species — see `basePixelW × basePixelH` in [Scripts/FishSpriteAssets.ts](Scripts/FishSpriteAssets.ts). Typical range 36–84 × 24–72. | PNG, transparent, premultiplyAlpha | Facing right; the renderer mirrors via scaleX when `fish.facingLeft`. |
| Coin icon | 50 × 50 (XAML) | PNG | `gold_icon.png` in [Textures/](Textures/) |
| Journal icon, close X icon | 130 × 130 (XAML) | PNG | Used in the FishCollection grid |
| Background image | 1080 × 1920 | PNG | `BGStart.png` |
| Logo | Fits within title centre area | PNG with alpha | `FishingLegend_logo.png` |
