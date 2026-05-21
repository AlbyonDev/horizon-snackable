---
name: swap-enemy
summary: How to add a new enemy type or swap an enemy's mesh, material, scale, rotation, and gameplay stats in the TowerDefense project
include: always
agents: [global]
---

# Adding or Swapping Enemies

This skill describes the exact pipeline for introducing a new enemy template or replacing the visual/material/rotation of an existing one. Enemies in this project follow a strict template hierarchy that the runtime depends on — skipping a step silently breaks animations, tilts, or the 2.5D illusion.

**Always read [PROJECT_SUMMARY.md](../../Docs/PROJECT_SUMMARY.md) "Scene Setup & 2.5D Camera Tricks" before authoring enemy art** — the camera is top-down and characters rely on the `bodyPivot` tilt trick to read as 3D. A mesh that ignores this will appear as a flat blob from the camera angle.

## The two places an enemy lives

| Layer | Where | What it controls |
|-------|-------|------------------|
| Template | `Templates/Enemies/<Name>.hstf` | Mesh, material, child entities (Pivot/LeftArm/RightArm/LeftLeg/RightLeg/shadow), local scales, baked rotations |
| Definition | `Scripts/Defs/EnemyDefs.ts` | Gameplay stats: hp, speed, reward, color tint, special flags (`dodgeChance`, `regenPerSec`, `slowImmune`) |
| Asset binding | `Scripts/Assets.ts` | `TemplateAsset` reference by path — the only place template paths are declared |

Both layers must be edited together. Editing only the def gives stats with no visuals; editing only the template gives art with no gameplay.

## Required template hierarchy

Every enemy template **must** preserve this entity tree, otherwise `EnemyController` silently fails to find references and animations break:

```
Enemy (root)              — TransformComponent + EnemyController component
├── Pivot                 — the 2.5D tilt layer (rotated each frame by _updateBodyPivot)
│   └── <Mesh entity>     — the actual character mesh (any name, e.g. "ZombieMesh")
├── LeftArm               — local position offset; rotated by limb swing animation
├── RightArm              — local position offset; rotated by limb swing animation
├── LeftLeg               — local position offset; rotated OR translated (walkByTranslation)
├── RightLeg              — local position offset; rotated OR translated (walkByTranslation)
└── shadow                — flat disc, MUST NOT be a child of Pivot (stays flat while body tilts)
```

The `EnemyController` component on the root references each child by entity ID through its `@property` slots (`bodyPivot`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `shadow`). Duplicate an existing `.hstf` and edit IDs in place — do not author from scratch.

## Workflow: swap an existing enemy's visuals

Use this when you want to keep the gameplay stats but change how an enemy looks (e.g. replace zombie mesh with a goblin mesh).

1. **Identify the target template** — look up the enemy in [EnemyDefs.ts](../../Scripts/Defs/EnemyDefs.ts) and find its `template` field, then resolve it via [Assets.ts](../../Scripts/Assets.ts) to a `Templates/Enemies/*.hstf` path.
2. **Open the `.hstf`** and find the **mesh entity under `Pivot`** (named `ZombieMesh` in `Enemy.hstf`, etc.). Edit:
   - `MeshPlatformComponent.data.mesh` — `packageOrRemoteId`, `ingestionId`, `targetId` for the new mesh asset
   - `MaterialPlatformComponent.data.materials[0]` — same three IDs for the new material
   - `TransformPlatformComponent.data.localScale` and `localPosition.y` — adjust so the mesh sits on the ground plane and matches the 1×1 cell footprint
   - `localRotation` — only change if the imported mesh's forward axis differs from `+X` (Horizon convention for characters). See note on rotation below.
3. **Do NOT modify the Pivot entity's rotation** — `EnemyController._updateBodyPivot()` overwrites it every frame. Any baked rotation on `Pivot` is for editor preview only.
4. **Adjust limb offsets if proportions changed** — `LeftArm`/`RightArm`/`LeftLeg`/`RightLeg` are positioned relative to the body. A taller mesh needs larger Y offsets. Symmetric ±X for arms/legs.
5. **Tune shadow scale** — the `shadow` entity's `localScale` should roughly match the mesh footprint (typical: `x≈0.8, y=0.5, z≈0.7`).
6. **Test in-editor** — confirm the silhouette reads clearly from the top-down camera, the mesh tilts when walking, and the shadow stays flat on the ground.

## Workflow: add a brand-new enemy type

1. **Duplicate** an existing template that matches the desired body plan (e.g. `Enemy.hstf` for a humanoid, `EnemyBoss.hstf` for a chunky character). Rename the file: `Templates/Enemies/EnemyGoblin.hstf` (+ corresponding `.assetmeta`).
2. **Swap the mesh and material** following steps 2–5 of the swap workflow above.
3. **Declare the asset** in [Assets.ts](../../Scripts/Assets.ts):
   ```typescript
   export const EnemyGoblin = new TemplateAsset('@Templates/Enemies/EnemyGoblin.hstf');
   ```
4. **Add a definition** in [EnemyDefs.ts](../../Scripts/Defs/EnemyDefs.ts):
   ```typescript
   { id: 'goblin', name: 'Goblin', hp: 80, speed: 1.8, reward: 7,
     color: { r: 0.4, g: 0.7, b: 0.3 }, template: Assets.EnemyGoblin },
   ```
   Special flags are optional: `dodgeChance` (0–1), `regenPerSec` (number), `slowImmune` (boolean).
5. **Reference the new id from a wave** in [LevelDefs.ts](../../Scripts/Defs/LevelDefs.ts) — otherwise the enemy is defined but never spawned.
6. **Test**: trigger a wave that spawns the new id and confirm HP scaling, color tint, and movement read correctly.

## Rotation, scale, and material — rules and pitfalls

### Rotation

- **Root `Enemy` entity rotation** is overwritten at runtime by `lookAt` toward the next path waypoint. Don't bake anything here.
- **`Pivot` entity rotation** is overwritten each frame by `_updateBodyPivot(dx, dz)` with `±30°` pitch / `±45°` roll based on walk direction. Don't bake anything here.
- **Mesh-under-Pivot rotation** is the only safe place to correct a mesh whose forward axis isn't `+X`. The Orc Chibi template ships with `localRotation.y = 1.5708` (90°) baked for this reason.
- **Never rotate `shadow`** — it must remain flat on the XZ plane.
- **Limbs (LeftArm/RightArm/LeftLeg/RightLeg)**: rest poses captured at start. Any baked rotation becomes the rest pose — animations multiply onto it, so a tilted arm at rest stays tilted while it swings.

### Scale

- The whole template should fit roughly within a **1×1×~1.5 box** (1 cell wide, 1 cell deep, body height free). Scale the **mesh entity inside Pivot**, not the root.
- `shadow.localScale.y` should stay small (`≈0.5`) — it's a flat disc, not a 3D shape.
- Don't scale `Pivot` or limb entities directly — the controller assumes unit scale on these for animation math.

### Material and color

- The `color` field in `EnemyDefs.ts` is applied at runtime by `EnemyService` to **all `ColorPlatformComponent` children** of the spawned entity. This is a tint, not a replacement — the underlying material's albedo modulates it.
- If you want a color-only variant of an existing enemy, **don't duplicate the template** — add a new def entry pointing to the same template with a different `color`.
- Material swaps in the template only matter when you need a different shader, normal map, or PBR setup. For pure color variation, def-level tint is sufficient and cheaper.

## What NOT to do

- Don't author enemy templates from scratch — duplicate and edit. The entity ID wiring in `EnemyController.data` is brittle.
- Don't add new `@property` slots to `EnemyController` to support a new enemy variation — drive variation from `EnemyDefs.ts` flags instead. Components stay generic; defs carry the difference.
- Don't bake the 2.5D tilt into the mesh rotation. The pivot trick is dynamic and direction-dependent; a baked tilt breaks when the enemy turns.
- Don't reference template paths anywhere except `Assets.ts`. Defs reference `Assets.EnemyX`, never `new TemplateAsset(...)` inline.
- Don't put `shadow` under `Pivot`. It must be a sibling so it stays flat while the body tilts.
- Don't change `walkByTranslation` casually — it's the global toggle for "legs bob on Y" vs "legs rotate." Match it to the body plan (chunky/short = translation, lanky/tall = rotation).

## Quick reference: existing enemies

| id    | Template            | Speed | HP  | Special           |
|-------|---------------------|-------|-----|-------------------|
| basic | `Enemy.hstf`        | 1.25  | 60  | —                 |
| fast  | `EnemyFast.hstf`    | 2.50  | 35  | `dodgeChance: 0.15` |
| tank  | `EnemyTank.hstf`    | 0.75  | 220 | `regenPerSec: 8`  |
| boss  | `EnemyBoss.hstf`    | 0.60  | 600 | `slowImmune: true` |

When in doubt about a value (limb offset, scale, tilt), open one of these templates and copy the pattern.
