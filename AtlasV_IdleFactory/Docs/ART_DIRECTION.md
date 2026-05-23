# Art Direction — Idle Factory Tycoon

**Visual Style:** 3D low-poly industrial, colorful — all objects are built by assembling and scaling engine primitives (no imported meshes). The result reads as bold and legible at a glance on a small screen.

---

## 3D Construction Approach

All 3D objects are assembled from scaled and rotated engine primitives. Four primitive types are used:

| Primitive | Used for |
|-----------|---------|
| **Box/Cube** | Main structural bodies: platforms, walls, roof slabs, machine blocks, truck chassis, product boxes |
| **Cylinder** | Rounded details: truck wheels, crane hook, chimney caps |
| **Prism** | Sloped surfaces: conveyor belt ramp sections, exit chutes |
| **Plane** | Large flat surfaces: warehouse floor, road surface, conveyor belt base |

Key assemblies:
- **Warehouse**: plane floor, plane roof, 4 box walls with entrance gaps, 8 storage platform slots in a 2×4 grid
- **Conveyor Belt**: plane base, 2 box lateral rails, 8 evenly-spaced prism slot markers
- **Production Module**: box platform body, prism exit ramp (−11° Z rotation), box rails, box machine block (color-overridable via `ColorComponent`), cylinder chimney, box/cylinder crane arm (yellow/orange)
- **Truck**: box chassis, box cab, 4 cylinder wheels
- **Product**: box body with box tape strip and fold-line details

---

## Color Palette

### Environment (industrial base tones)
| Surface | Color |
|---------|-------|
| Asphalt / road | Dark gray |
| Metal surfaces | Medium gray |
| Warehouse floor | Light gray |
| Rails, structural details | Silver |

### Production Module Machine Colors
Applied at runtime via `ColorComponent` — the template is color-neutral.

| Module | Color | Hex |
|--------|-------|-----|
| Production 1 | Blue | `#148FD5` |
| Production 2 | Green | `#58A31E` |
| Production 3 | Red | `#EB1B04` |

### Crane Colors
- Arm and pillar: yellow / orange
- Base and hook: dark gray

---

## UI Visual Style

### Upgrade Panel Buttons (4-layer 3D relief technique)
Each button has: outline → highlight border → shadow border → background fill.

| Upgrade | Background | Outline | Highlight |
|---------|------------|---------|-----------|
| Conveyor Speed | Dark navy `#FF052039` | `#FF020D18` | `#FF1A4D73` |
| Warehouse | Dark navy `#FF052039` | `#FF020D18` | `#FF1A4D73` |
| Trucks | Dark navy `#FF052039` | `#FF020D18` | `#FF1A4D73` |
| Production 0 | Blue `#FF148FD5` | `#FF041626` | `#FF5AB8E8` |
| Production 1 | Green `#FF58A31E` | `#FF152808` | `#FF8DC455` |
| Production 2 | Red `#FFEB1B04` | `#FF2E0601` | `#FFEF5350` |

**Affordability:** When a button is affordable its outline is visible. When too expensive the outline becomes transparent (`#00000000`) — the button does not get a colored "unaffordable" border; it simply loses its outline.

**Text:** White `#FFFFFFFF` on all buttons.

### Player Stats Bar (Screen-Space, top)
3 equal-width 3D relief frames (dark blue, black outline, 4-layer technique), 10 px margins, semi-transparent background bar. Displays: time played, packages sent, gold balance.

### Warehouse Gauge (World-Space)
Green progress fill bar + `stock/capacity` text. Positioned above warehouse at Y = 0.7, rotated 90° on X to face camera.

### General UI Colors
| Role | Color |
|------|-------|
| Panel background | Dark semi-transparent gray `#CC1A1A1A` |
| Text labels | White `#FFFFFFFF` |
| Currency values | Gold `#FFFFCC80` |

---

## Camera & Coordinate System

The camera looks straight down (−Y direction). This means the visible plane is XZ.

| Property | Value |
|----------|-------|
| Position | Approx. (0, 8, 0) — set on the scene entity in the editor |
| Look direction | −Y (straight down) |
| Camera "up" | −Z (points toward top of screen) |
| FOV | 60° — set on the `CameraComponent` in the editor |

**Screen-to-world axis mapping:**

| Direction on screen | World axis |
|--------------------|-----------|
| Right | +X |
| Left | −X |
| Up (top of screen) | −Z |
| Down (bottom of screen) | +Z |
| Depth (not visible) | Y |

**Practical consequence for new assets:** place objects with more negative Z to move them toward the top of the screen (trucks/warehouse), and more positive Z to move them toward the bottom (production modules). The Y axis controls height above the ground plane — only relevant for stacking or layering effects visible from above.

**Current camera boundaries:**

| Boundary | World Z | Reason |
|----------|---------|--------|
| Safe top | Z ≈ −4.5 | Above this, content is hidden behind the Horizon system overlay |
| Safe bottom | Z ≈ 3.5 | Below this, content is hidden behind the PlayerStatsBar overlay |
| Safe left | X ≈ −4 | Trucks exit at X = −3.5; content past −4 is off-screen |
| Safe right | X ≈ +4 | Trucks exit at X = +3.5; content past +4 is off-screen |

The current production zone runs from Z −0.256 to Z 3.5, which fills the safe bottom boundary.

---

## Play Area

Portrait 9×16 world units, centered on origin. All gameplay elements fit within this footprint.

---

## Texture Assets

| File | Usage | premultiplyAlpha |
|------|-------|-----------------|
| `Textures/IdleFactory_Logo.png` | Title screen logo | true |
| `Textures/IdleFactory_TitleScreen.png` | Title screen fullscreen background | false |
| `Textures/Time.png` | Time icon in PlayerStatsBar | true |
| `Textures/gold_icon.png` | Gold icon in PlayerStatsBar and UpgradePanel | true |
| `Textures/cube.png` | Cube icon in PlayerStatsBar | true |
| `Textures/IdleFactory/IdleFactory_BG01.png` | Material on production modules floor plane (Layout template) | false |
| `Textures/IdleFactory/IdleFactory_BG02.png` | Material on warehouse floor plane (Layout template) | false |
| `Textures/IdleFactory/IdleFactory_BG03.png` | Material on containers at top of screen (Layout template) | false |
| `Textures/IdleFactory/IdleFactory_BG04.png` | Material on truck road floor plane (Layout template) | false |
