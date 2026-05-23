# Art Direction — AtlasV Fishing

**Visual Style:** Painterly digital illustration — soft watercolor washes, brushwork-led shading, gentle rim light. Storybook / cozy-premium feel rather than flat cartoon or pop art. Saturated but blended (no hard color blocks). Each fish is one carefully painted character; the UI sits on top of a deep, atmospheric ocean.

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

The reference style is best described as **stylized painted illustration** — somewhere between a Studio Ghibli children's-book page and a cozy mobile-RPG creature card. Verified by inspecting the actual 31 fish sprites in [Sprites/Fish/](Sprites/Fish/).

### Common traits across every species

- **2D, facing right.** The renderer mirrors via scaleX when `fish.facingLeft`.
- **Painterly brushwork.** Smooth gradients, soft watercolor washes, visible (but subtle) painterly texture. Never flat color blocks, never hard cel-shading bands.
- **Volumetric shading.** Each fish has a clear light direction — warm rim light on top/front edges, cool shadow underneath. Belly is consistently lighter than back.
- **Outline is optional and inconsistent on purpose.** Some species (Clownfish, AbyssalAnglerfish, NeonTetra) have a thin, slightly sketchy dark outline that breaks up where it should. Others (MantaRay, Jellyfish, GoldenSeahorse) have no outline at all and rely on value contrast against the transparent background. New sprites should follow whichever fits the silhouette — don't force a uniform stroke.
- **Eye.** Single large round eye with a clear pupil, one bright highlight dot, and a warm iris (amber / orange / red). Eye sits near the head front. This is the most consistent recognisability cue — copy it on new species.
- **Detail density.** Mid level — enough painted detail to read at full size (scales suggested, fin rays painted in, subtle spot patterns), but not photo-real. Detail should survive being shrunk to ~40 px tall on the canvas.
- **Bioluminescence / glow** is a recurring motif on rarer / deeper species (anglerfish lure, jellyfish bell, eel highlights, hammerhead glyphs). Use a soft additive bloom, never a sharp neon line.
- **Mood is friendly even for predators.** Sharks and barracudas read as characters, not threats — slightly oversized head, expressive eye, no exaggerated teeth/gore.

### Rarity reads through palette, not silhouette

| Rarity | What changes vs. common |
|---|---|
| Common | Naturalistic palette, single dominant hue, modest size. Examples: Clownfish, NeonTetra, Sunfish. |
| Rare | More chromatic range, often a complementary accent (gold belly, cyan rim, magenta dorsal). Examples: MantaRay, Lionfish, Dolphin. |
| Legendary | Multi-hue gradient or unusual material (iridescent scales, glow, gold-on-gold). Examples: RainbowFish, GoldenSeahorse, AbyssalAnglerfish. Silhouettes stay grounded — legendaries are *prettier*, not bigger or weirder. |

Rarity is *not* communicated through outline thickness or saturation level alone.

### Background & cropping

- Transparent PNG, cropped to content (no padding so the visible art touches all four edges).
- `premultiplyAlpha: true` in each `.assetmeta`. Required — without it the soft outlines and painterly edges fringe black.
- No drop shadow baked into the sprite (the renderer adds depth via scale/tilt, not bake).
- No bubbles, no water caustics, no environment props inside the sprite.

### Minimum readable size

~40 px tall on the canvas. The smallest defs in [Scripts/FishSpriteAssets.ts](Scripts/FishSpriteAssets.ts) (e.g. NeonTetra at `basePixelH: 24`) land in this range at in-world `size: 0.9–1.35`. Verify any new sprite still reads at this size by squinting at the thumbnail.

### Generation prompt — recipe used for the existing set

When regenerating or adding a sprite, use a prompt in this shape:

> "a [species name], stylized digital painting, cozy storybook illustration, soft painterly shading with watercolor washes, warm rim light, large expressive eye with single highlight, [palette hints], facing right, full body in profile view, centered, on a plain white background, no shadow, no bubbles, no environment, no text"

Then run the pipeline documented in [Assistant/Skills/sprites.md](Assistant/Skills/sprites.md): `generate_image_bulk` → `remove_image_background` → `crop_image_to_content` → copy + rename → set `premultiplyAlpha: true` on the `.assetmeta`.

Avoid these prompt words — they pull the model toward the *wrong* style:
- "cartoon", "anime", "pixel art", "chibi", "vector", "flat design", "cel shaded", "low poly", "3D render" — all break the painterly look.
- "realistic", "photorealistic" — pulls toward stock-photo fish.

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

The title screen sets the brand tone before any gameplay — bright, summery, premium-mobile-casual.

- **Background** [Textures/BGStart.png](Textures/BGStart.png): full-bleed tropical seascape. Top half is a sunny sky with painted cumulus clouds. Bottom half is a calm horizon-line ocean transitioning into an underwater view with painted god-rays. The image already contains a small bobber-on-a-line silhouette at the horizon — do not add an in-engine prop for it.
- **Logo** [Textures/FishingLegend_logo.png](Textures/FishingLegend_logo.png): two-tone stacked wordmark.
  - "FISHING" in **cyan** with thick white outer stroke and dark inner stroke.
  - "LEGEND" in **gold / orange gradient** with the same outline treatment.
  - Sits inside a hand-painted white splash with hook and red-and-white bobber props.
  - Anchored upper third of the screen.
- **Play button:** large **circular orange disk** (deep orange center, brighter highlight on top) with a **thick white ring** outline and a soft dark drop shadow. White uppercase "PLAY" centered in a chunky condensed display font with a subtle dark outline. Anchored slightly below screen center.
- **Top corner buttons:** two **circular dark-navy chips** with light icons — three dots (top-left) and hamburger (top-right). These are decorative on the title screen; their behaviour is not wired up.
- **Exit animation on Play:** logo slides up off-screen (TranslateY −1500 over 0.45 s), Play button scales and fades (0.4 s), then the title hides and `TitleScreenPlayRequested` fires. Camera animates from idle pose to the gameplay Y over 550 ms to stay in sync.

## Fish Collection Overlay

Opened from the journal button in `InteractiveHUD`. Driven by [UI/FishCollection.xaml](UI/FishCollection.xaml) + [FishCollectionUIComponent](Scripts/Components/UI/FishCollectionUIComponent.ts).

- **Backdrop:** semi-opaque dark-navy panel over the gameplay scene; the underlying world is dimmed but still visible at the edges.
- **Header:** bold cyan "FISH COLLECTION" wordmark — same cyan + thick dark outline as the "FISHING" half of the logo, so the panel reads as the same brand family.
- **Close button:** white "X" inside a dark-navy circle, top-right of the panel.
- **Grid:** 3 columns of cards. Each card is a **rounded-rect dark-navy tile** with a **bright cyan border** and slight drop shadow. Tiles are roughly square with the fish portrait filling most of the area.
- **Caught fish card:**
  - Species name top-left in white, bold, with a thin dark outline; long names truncate with `...` (e.g. "Flame Angel...", "Violet Barra...").
  - Painted fish sprite centred in the tile.
  - Bottom-left: **count chip** — small dark capsule with `x{count}` in white.
  - Bottom-right: **gold chip** — small dark capsule with the gold value and the same yellow coin icon used by `GoldCoinsAnimator`.
- **Uncaught fish card:** plain dark-grey silhouette of the species (no painted detail, no name shown), with a centered `?` overlaid in grey. The silhouette uses the sprite's alpha as an opacity mask — see the "Fish Collection Silhouette Opacity Mask" task in done history.
- **Typography hierarchy:** cyan title (largest) → white species names (medium) → white capsule numbers (smallest). All bold, all outlined.

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
