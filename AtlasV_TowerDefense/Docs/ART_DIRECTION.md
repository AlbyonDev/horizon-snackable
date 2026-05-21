# H5 Tower Defense — Art Direction

## Style

Clean, readable mobile UI. Dark background panels with high-contrast text.
Inspired by modern mobile tower defense games (Bloons TD, Kingdom Rush) — functional first, decorative second.
No excessive gradients or textures. Clarity at small screen sizes is the priority.

---

## Color Palette

### UI Base

| Token | Hex | Use |
|-------|-----|-----|
| `bg-panel` | `#1a1a2e` | Panel backgrounds |
| `bg-panel-light` | `#2a2a4a` | Buttons, cards |
| `bg-overlay` | `#000000` @ 60% alpha | Modal overlays |
| `border` | `#3a3a5a` | Panel/button borders |

### Game State

| Token | Hex | Use |
|-------|-----|-----|
| `gold` | `#f5c518` | Gold resource, costs, economy |
| `lives` | `#e74c3c` | Lives / hearts |
| `wave-build` | `#3498db` | Build phase indicator |
| `wave-active` | `#e67e22` | Wave in progress indicator |
| `victory` | `#2ecc71` | Victory screen accent |
| `defeat` | `#e74c3c` | Defeat screen accent |

### Towers

| Tower | Hex | Notes |
|-------|-----|-------|
| Arrow | `#2ecc71` | Green — fast, precise |
| Cannon | `#e67e22` | Orange — heavy, slow AoE |
| Frost | `#00bcd4` | Cyan — support, slows |
| Laser | `#9b59b6` | Purple — long range, high DPS |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#ffffff` | Headings, values |
| `text-secondary` | `#a0a0c0` | Labels, captions |
| `text-disabled` | `#555577` | Unaffordable towers |

---

## Typography

All text uses the default MHS UI font. No custom fonts.

### HUD Typography (scaled for mobile)

| Role | Size | Weight | Color |
|------|------|--------|-------|
| HUD values (gold, lives, wave) | 90px | Bold | `text-primary` |
| HUD labels ("WAVE") | 50px | Normal | `text-secondary` |

### Shop Typography (scaled for mobile)

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Tower name | 54px | Bold | `text-primary` |
| Tower cost | 48px | Normal | `gold` (affordable) / `text-disabled` (not) |
| Icons | 72px | — | — |

### Other UI

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Wave banner | 32px | Bold | `text-primary` |
| Game over title | 40px | Bold | `defeat` / `victory` |
| Button text | 16px | Bold | `text-primary` |

---

## Layout — Portrait 9:16 (grid is 7×14)

The screen is divided into three distinct zones — no overlay, no occlusion.

```
┌─────────────────────────────────┐
│ ❤️ 10       WAVE        💰 120  │  ← HUD bar (top)
│              1/20               │
├─────────────────────────────────┤
│                                 │
│                                 │
│          PLAY AREA              │  ← 7×14 grid (center)
│      (towers, path, enemies)    │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Arrow] [Cannon] [Frost] [Laser]│  ← Shop bar (bottom)
└─────────────────────────────────┘
```

The grid is **7 cols × 14 rows** (7×14 world units). The portrait 9:16 screen is filled by grid + HUD + shop combined.
Camera is set via a scene anchor entity (position `(1, 15.5, 0)`, rotation `(-90, 90, 0)`, FOV 60°) so the 7×14 world grid fills the center of the screen — see `Scene Setup & 2.5D Camera Tricks` in `PROJECT_SUMMARY.md`.

---

## Panels

### HUD Bar (top) — `UI/GameHud.xaml`
- Full width, `bg-panel` background (80% opacity)
- 3-column layout:
  - **Left:** Red heart SVG icon (#e74c3c) + lives count (white)
  - **Center:** "WAVE" label (secondary color) + wave number "X/20" (white, stacked vertically)
  - **Right:** gold_icon.png image + gold count (gold color #f5c518)
- Large text (~90px) for mobile visibility
- Updates reactively via `GameHudViewModel`
- Hosted in `space.hstf` (scene-level)

### Shop Bar (bottom) — `UI/TowerShop.xaml`
- Full width, 600px tall, `bg-panel` background
- 4 tower buttons (360x360px each) in horizontal scroll
- Each button:
  - Tower icon (72px)
  - Tower name (54px bold)
  - Cost with gold icon (48px, gold color; grey if unaffordable)
  - Selected state: `bg-panel-light` background + border in tower color
- Tapping a button calls `TowerService.get().selectTower(id)`
- Hosted in `space.hstf` (scene-level)

### Wave Banner (center overlay, transient)
- Centered, short duration (~1.5s)
- Large text: "WAVE N"
- Appears on `WaveStarted` event, fades out

### Game Over / Victory (full overlay)
- Full screen overlay, `bg-overlay`
- Title: "DEFEAT" (red) or "VICTORY" (green), 40px bold
- Subtitle: wave reached or "All waves cleared!"
- Single button: "PLAY AGAIN" — restarts game

---

## Placement Preview

Handled in code (not XAML) — spawned 3D entities:
- **Valid cell**: preview tower entity tinted `Color(0.5, 1.0, 0.5, 0.75)` (semi-transparent green)
- **Invalid cell**: preview tinted `Color(1.0, 0.4, 0.4, 0.75)` (semi-transparent red)
- **Range indicator**: flat disc entity (`RangeIndicator.hstf`), scaled to tower range diameter, no tint

---

## Accessibility

- All interactive tap targets ≥ 48px
- Cost text grey (not hidden) when unaffordable — player can see what is coming
- No color-only distinction for critical info (lives text always shown alongside icon)

---

## 3D Mesh Specifications

Optimized for mobile performance.

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Polycount** | 1,000-1,500 triangles | Per tower/object |
| **Texture Resolution** | 512x512 | Max for small objects |
| **Height** | 1 meter | Normalized for grid |
| **Format** | GLB + FBX | Both exported |

Priority: Performance over detail. Towers are viewed from above at distance.

### Export Preferences

- **NO embedded textures** in GLB/FBX — textures must be external files only
- Use FBX format for MHS import (avoids embedded texture issues)
- Link textures via MHS material system, not embedded in mesh files
- Delete any auto-generated embedded textures to avoid double storage

---

## Character / Enemy Mesh Requirements (MHS-specific)

These constraints apply to **any character or enemy mesh** (generated by AI, sourced externally, or hand-authored) before it can be used as a gameplay entity in this project. They exist because of how the Meta Horizon Worlds runtime interprets transforms, forward vectors, and materials — getting any of these wrong produces visible bugs (floating pivots, characters walking backward, all-black meshes).

### 1. Pivot Placement

- AI-generated character meshes always have their pivot at the **center of the body** (around the hips/chest), not at the feet. The generation agent will not modify this.
- Do **not** try to fix this by re-authoring the mesh. Instead, **compensate inside the entity template (`.hstf`)**:
  - In the template, offset the mesh child node by **+0.5 on Y** (local position), so that when the template's root pivot sits on the ground, the character's feet visually land at Y=0.
- Symptom if wrong: enemy appears half-buried in the ground, or floating, depending on direction of error.

### 2. Forward Axis & Orientation

- In MHS, the **default forward axis is -Z** (this is the engine convention used by `LookAt`, camera, and movement math).
- Manually authored / imported meshes in this project are oriented along **+X** (project convention for hand-made assets — towers, props), so they need their own orientation handling, but that is already covered by existing templates.
- **AI-generated 3D characters always export facing +Z** (the glTF/FBX convention). Since MHS forward is -Z, this is a 180° mismatch — the character will walk backward along the path (moonwalk).
- **Required fix at template level**: in the enemy `.hstf` template, set the mesh child's local rotation to **180° around Y** so the generated mesh's +Z aligns with MHS's -Z forward. Do not try to fix this on the mesh itself — the agent will not re-export it.

### 3. Material — Unlit Required

- The H5 scene has **no scene lighting setup** (top-down 2.5D camera, flat readable style).
- A character imported with a default **PBR/Standard/lit material will render fully black** in-game.
- All character materials MUST be set to **Unlit** in MHS after import:
  - Select the imported asset → Material panel → change shader type to **Unlit**.
  - The albedo/base color texture is sampled directly with no lighting contribution.
- This matches the rest of the project's flat-shaded look and is consistent with how towers and props are rendered.

### 4. Scale

- Characters target **~1 meter tall** (same as the tower height spec above), so they fit within a single grid cell when walking the path.
- Do not rely on import-time auto-scale — author the mesh at the correct scale in the source tool.

### 5. Quick Checklist (for AI prompts or manual review)

When integrating an AI-generated character into an enemy template (`.hstf`), confirm:

- [ ] Mesh child node offset **+0.5 on Y** in the template (compensates for center-body pivot)
- [ ] Mesh child node rotated **180° around Y** in the template (compensates for +Z forward → MHS -Z forward)
- [ ] Material set to **Unlit** after MHS import (otherwise renders fully black — no scene lighting)
- [ ] Roughly 1m tall
- [ ] No embedded textures in FBX (see Export Preferences above)
