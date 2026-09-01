# Splitter — Character Mesh

## What was created
A rigged bipedal blob creature mesh for the "Splitter" tower defense enemy.

## Description
A cute but menacing round purple blob creature standing on two stubby legs with small arms at its sides. The design features a smooth, jelly-like body with a clean cartoony silhouette that reads clearly from a near top-down camera angle. The character uses exaggerated, simple proportions — a dominant round torso, minimal head-body distinction — making it easy to scale down to spawn "split" child versions using the same mesh at a smaller scale.

## Art direction alignment
- **Style:** Cartoony fantasy matching Kingdom Rush / Goblin Clash aesthetic
- **Colors:** Deep purple / violet with a slight sheen
- **Proportions:** Chunky, rounded, simplified — bold top-down silhouette
- **Polycount target:** ~20,000

## Files
- `Splitter_rigged_compute_graph.usdz` — Rigged mesh with baked materials
- `Splitter_concept.png` — Selected concept art (PTC-generated)

## Pipeline notes
- Generated via PTC (Prompt-to-Character) pipeline
- Faces +Z; will be rotated 180° around Y in the enemy template
- Pivot at feet per enemy pipeline standard
- Split mechanic: spawn smaller instances of the same model at reduced `localScale`
