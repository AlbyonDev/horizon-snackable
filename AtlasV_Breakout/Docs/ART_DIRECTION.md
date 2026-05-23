# Art Direction — AtlasV Breakout

**Visual Style:** 80s neon arcade — saturated rainbow brick palettes on near-black backgrounds, viewed straight-on through a portrait 9×16 play area.

---

## Viewing Plane

All gameplay happens on the **XY plane**, viewed straight-on along the **−Z axis** (camera looks toward −Z, objects face +Z).

- X = horizontal, Y = vertical, Z = depth (unused for gameplay)
- Play-area bounds: X ∈ [−4.5, +4.5], Y ∈ [−8, +8] (defined in `BOUNDS` in `Constants.ts`)
- Paddle sits at Y = −7, ball respawns at Y = −6.5
- Bricks fill the top half (level `startY` is typically 6.5)
- Art is effectively **front-facing 3D objects** — they can have depth and shading, but gameplay never uses the Z axis

---

## Collision Constraints (AABB)

The collision system in `CollisionManager.ts` uses **Axis-Aligned Bounding Boxes derived from `localScale`**. For non-ball colliders:

```
halfW = localScale.x * 0.5
halfH = localScale.y * 0.5
bounds = { x: pos.x - halfW, y: pos.y - halfH, w: halfW * 2, h: halfH * 2 }
```

For the ball, the collider is a square derived from `localScale.x` used as the diameter (radius = `localScale.x * 0.5`).

| Object | Collider Source |
|---|---|
| Brick | `localScale.x` × `localScale.y` (full AABB) |
| Ball | `localScale.x * 0.5` as radius, squared into AABB |
| Paddle | `localScale.x` × `localScale.y`; collision uses `_normalScale`, NOT squash scale |
| Power-up | `localScale.x` × `localScale.y` |

The visible mesh must stay within the unit cube of the entity. A small amount of bleed (glow, outline) is fine, but the **readable shape** must fit the collider — otherwise the ball will visually clip neighbors without bouncing.

---

## Color Palette

All colors are stored as RGB triplets in [0, 1] range in `LevelConfig.ts` and applied at runtime via `ColorComponent.color = new Color(r, g, b, 1)`.

### Brick palettes (per-level)

Every level defines its own brick palette as `BrickColorPalette` keyed by remaining HP. The dominant family is **80s neon rainbow** with these recurring hexes (approximated):

| Hex | Name | Used in levels |
|---|---|---|
| `#FF2D78` | Magenta neon (`P`) | Arcade, Checkerboard, Heart, Rings |
| `#FF6B1A` | Orange vif (`O`) | Arcade, Zigzag, Pyramid, Columns, Stripes, Rings |
| `#FFE01A` | Jaune électrique (`J`) | Arcade, Diamond, Zigzag, Pyramid, Columns, Stripes, Rings |
| `#1AFF5E` | Vert néon (`V`) | Arcade, Diamond, Zigzag, Pyramid, Columns, Stripes, Rings, Invader |
| `#1A9FFF` | Bleu électrique (`B`) | Arcade, Diamond, Zigzag, Pyramid, Columns, Stripes, Rings |
| `#B44AFF` | Violet néon (`M`) | Arcade, Zigzag, Pyramid, Columns, Stripes, Rings |
| `#FF1E1E` | Red (`R`) | Diamond, Zigzag, Pyramid, Columns, Stripes |
| `#00E6E6` | Cyan (`C`) | Diamond, Checkerboard, Cross |
| `#FFD700` | Gold (`G`) | Cross |
| `#FFFFFF` | White (`W`) | Cross |

### Background colors

Backgrounds are very dark, near-black with a slight color cast that matches the level mood. Set per level via `palette.background`.

| Level | Cast | RGB (0–1) |
|---|---|---|
| Arcade, Rings | Neutral dark | (0.020, 0.020, 0.031) |
| Diamond | Neutral dark | (0.020, 0.020, 0.031) |
| Checkerboard | Purple tint | (0.040, 0.010, 0.050) |
| Invader | Green tint | (0.010, 0.020, 0.010) |
| Zigzag, Stripes | Violet tint | (0.020, 0.010, 0.040/0.050) |
| Heart | Magenta tint | (0.050, 0.010, 0.030) |
| Pyramid | Warm dark | (0.030, 0.020, 0.010) |
| Columns | Deep blue | (0.010, 0.010, 0.030) |
| Cross | Cool dark | (0.010, 0.020, 0.040) |

`DEFAULT_PALETTE.background` in `LevelConfig.ts` is `(0.04, 0.04, 0.06)` — used when a level omits `palette.background`.

### UI accent colors (from HUD XAML — see `UI/GameHUD.xaml`, `UI/ComboHUD.xaml`, `UI/HighScoreHUD.xaml`)

The HUD uses a 5-layer neon glow stack with magenta / pink / cyan / gold. Combo color tiers in `ComboHUDViewModel.ts`:

| Combo ≥ | Color |
|---|---|
| 2 | Cyan |
| 5 | Hot pink |
| 10 | Magenta |
| 15 | Gold |

---

## Sprite & Mesh Style

- **Bricks:** simple rectangular meshes (the in-engine cube) tinted by `ColorComponent` on a `Visuals` child entity. Brick scale: typically 0.9 × 0.80 units (set per-level via `brickWidth` / `brickHeight`).
- **Ball:** sphere mesh, default scale 0.5 units in each axis (`BALL_SIZE` in `Constants.ts`).
- **Paddle:** flat rectangular bar.
- **Coins:** rendered through the particle pool — small golden circles, `COIN_COLOR = [1.0, 0.85, 0.2, 1]`, scale `COIN_SCALE = 0.25`.
- **Particles:** spawned from `Templates/Particle.hstf`, base scale ~0.08, fade alpha + shrink to 0 over their lifetime.
- **Trail:** circular SOA buffer of 30 particles, scale `VFX_TRAIL_SCALE = 0.08`, life `VFX_TRAIL_LIFE = 0.25s`, alpha 0.1, color matches ball.

All visuals support a transparent background where applicable; meshes use the `unlit` and `unlitBlend` materials in `materials/`.

---

## Animation Style

- **Brick reveal (level intro):** 4 randomized styles selected per level in `LevelLayout._randomRevealStyle()` — Pop (back-out overshoot to 1.15), DropIn (bounce-out from +3 Y), Spin (360° on Z while scaling up), Stretch (X first then Y, rubber-band feel). Duration 0.35s (0.45s for DropIn). Stagger pattern is also random (5 patterns in `_randomDelayPattern`).
- **Brick death:** 0.15s ease-in shrink + Z-spin at 12 rad/s (`DEATH_DURATION`, `DEATH_SPIN_SPEED`).
- **Brick title idle:** breathe-pulse scale (±5%) + brightness pulse, phase offset derived from Y position so rows are in sync but columns vary.
- **Paddle squash & stretch:** impact squash to (1.3, 0.7) over 0.08s, recover over 0.15s; movement-based horizontal stretch up to +0.3 scaled by smoothed horizontal velocity (`Paddle.ts:217–245`).
- **Ball trail:** continuous spawn every `VFX_TRAIL_INTERVAL = 0.02s`, fades by age.
- **HUD score:** casino-style roll-up with scale punch + golden glow.
- **HUD combo:** pop-in to 6× overflow scale with ghostly ~18% opacity; fades between hits.
- **Center text:** DVD-bounce diagonal motion with squash on wall hit.
- **High-score table:** ItemsControl with staggered right-to-left slide-in (ViewModel lerp, not XAML storyboard).

---

## Asset Registration

Every spawnable `.hstf` template must be referenced through `Scripts/Assets.ts`. Current registry:

```typescript
// Scripts/Assets.ts
export const BrickAssets = {
  Normal: new TemplateAsset('@Templates/GameplayObjects/Brick.hstf'),
} as const;

// Empty by default — re-enable by adding entries that match PowerUpType keys.
export const PowerUpAssets = {} as const;

export const Particle = new TemplateAsset('@Templates/Particle.hstf');
```

Rules:
- Group by family (`BrickAssets`, `PowerUpAssets`, …).
- For `PowerUpAssets`, the key MUST match the `PowerUpType` enum name (so `PowerUpType.BigPaddle` → key `BigPaddle`). `PowerUpManager._spawnPowerUp` looks up `PowerUpAssets[PowerUpType[selected.type]]` and bails silently if missing.
- Use the `@Templates/...` alias; never hardcode a `TemplateAsset` path inside a component.

---

## Theme Customization

Everything visual can be remixed without touching gameplay logic:
- Brick colors → `colors` on each `BrickTemplate` in `LevelConfig.ts`
- Ball / paddle / background → `palette` on each level
- Mesh swaps → replace the prefab in `Templates/GameplayObjects/`, keep the same `localScale` so collision still matches
- HUD style → edit the XAML files in `UI/`; the ViewModels expose bindings, not pixels
