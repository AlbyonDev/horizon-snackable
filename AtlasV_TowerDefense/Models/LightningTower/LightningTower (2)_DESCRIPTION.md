# LightningTower (2) — Asset Description

## What Was Created
A chunky cartoon steampunk Lightning Tower 3D mesh for a tower defense game, inspired by the Kingdom Rush / Bloons TD art style.

## Design
- **Style:** Chunky cartoon steampunk/industrial with bold dark outlines and cartoony proportions
- **Structure (bottom to top):**
  1. Wide blocky multi-layered base with small arched door (brown/tan metal plating, rivets)
  2. Two small curved side pipes connecting body to base
  3. Central tapering column with thick copper coil (~2.5 turns)
  4. Metal cap with rivets
  5. Single large clean deep blue glowing sphere at the very top (no lightning bolts — VFX handles arcing at runtime)
- **Colors:** Brown/copper/tan metal body, vibrant deep blue glowing bulb

## Generation Parameters
- **Source:** AI-generated from concept art (Classic Steampunk variation)
- **Concept art attachment:** `Textures/lightning_tower.png` (style reference)
- **Model:** Quality
- **Target height:** 1.0 m (scaled 1.5× by parent in-game)
- **Polycount:** ~10,000
- **Format:** FBX (preferFBX: true)

## File Paths
- **Mesh:** `Models/LightningTower/LightningTower (2).fbx`
- **Material:** `Models/LightningTower/LightningTower (2).material`
- **Texture:** `Models/LightningTower/texture.png`
- **Concept art:** `Models/LightningTower/v1.png`

## Asset IDs
- **Template asset ID:** `26631398616455768:17498805051459751967:2719744159`
- **Mesh asset ID:** `26631398616455768:17498805051459751967:2007718928`

## Notes
- The blue sphere bulb is **clean / no baked electricity** — runtime VFX attaches separately.
- LOD settings applied (5-level canonical curve, Screen Space Ratio).
- Mesh origin is at feet (aabbMinY = 0.0), ready for ground placement.
