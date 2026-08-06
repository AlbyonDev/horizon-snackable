# Poison Tower

## Summary
A squat, chunky cartoon-fantasy Poison Tower for a tower defense game, inspired by Kingdom Rush / Goblin Clash visual style.

## Description
A gnarled wooden base wrapped in thorny dark vines supports a bubbling poison cauldron on top emitting green fumes. Features thick, menacing proportions with green and purple/dark wood coloring. Designed to face +Z forward as placed.

## Generation Details
- **Style:** Cartoon fantasy (Kingdom Rush style)
- **Concept:** Cauldron Poison Tower — generated concept art variation
- **Target Height:** 0.6 meters (tower defense small tower scale)
- **Polycount Target:** 15,000
- **Model Quality:** Quality
- **Output:** FBX with baked texture and material

## Files
- `PoisonTower.fbx` — Mesh geometry
- `PoisonTower.material` — Material with baked texture
- `texture.png` — Baked color texture
- `v1.png` — Concept art reference image
- `PoisonTower_thumbnail.png` — Asset preview thumbnail (in Temp/)

## Asset Dimensions
- **Bounds:** 0.60 x 0.56 x 0.57 meters (W x H x D)
- **Shape:** Cubic / squat
- **Origin:** Sits at Y=0 (ground-level pivot)

## Usage Notes
- Place on ground surfaces; pivot is at the mesh base (aabb_min_y = 0)
- No Y-offset needed for ground placement
- Faces +Z; rotate 180° around Y if using in templates that expect -Z forward
- LOD settings: canonical 5-level linear curve applied
