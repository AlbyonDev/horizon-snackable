# Art Direction — AtlasV Fishing

**Visual Style:** Bright, cartoon, unlit. Rounded shapes, saturated colors, no realistic lighting. Reads instantly on a small portrait phone screen — bubbly, pop, tropical.

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

## Technical Constraints

- Project target: small mobile bundle (< 35 MB total).
- Low-poly meshes only; prefer flat materials and vertex colors.
- No heavy post-process.
- Sprites compressed; `premultiplyAlpha` must be `true` for every transparent sprite.
- All fish rendering goes through a single DrawingSurface ViewModel — never per-entity sprite quads.
