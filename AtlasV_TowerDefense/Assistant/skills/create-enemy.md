---
name: create-enemy
summary: How to create a new enemy or replace the mesh of an existing one in an enemy template
include: always
agents: [global]
---

# Create or Replace an Enemy

Use this skill when adding a new enemy type or swapping the visible character mesh inside an existing enemy template (`Templates/Enemies/*.hstf`).

For the architectural context (template hierarchy, `EnemyController` `@property` slots, 2.5D pivot behavior), see `Docs/PROJECT_SUMMARY.md → Enemy template` and `Docs/ART_DIRECTION.md → Enemy Mesh Integration`. Trust the existing project state — do not reinvent the structure.

## Core principle — derive from Enemy.hstf, then swap

The canonical reference template is `Templates/Enemies/Enemy.hstf`. Both new enemies and mesh swaps follow the same shape: start from `Enemy.hstf`, then swap the mesh + animgraph references. This guarantees the root `TransformPlatformComponent`, the `Pivot` tilt, the `shadow` child, and the `EnemyController` wiring (`bodyPivot`, `shadow` UUIDs) are all correct by construction.

## Steps

1. **Generate the character mesh** — use the 3D character generation tool.
   - Bipedal humanoid (required for Word2Animation), facing +Z in local space, pivot at foot level.
   - Sample prompt: `<description>, bipedal humanoid, adult proportions, cartoon style, low poly mobile game, facing +Z, pivot at foot level, solid white background`.
   - Output: `Models/<EnemyName>/<EnemyName>.fbx` (+ `.material`).

2. **Create the AnimGraph** at `Animations/<EnemyName>/<EnemyName>AnimGraph.animgraph`: a single `Walk State` playing `Walk.anim` with `Looping = true`, `Speed = 1.0`, no outgoing transitions.

   **CRITICAL — verify looping is set in TWO places** (both must be true, or the walk plays once and freezes):
   - The state entry inside the `main` stateMachine: `{ "name": "Walk", "graph": "Walk", "looping": true }`. The MHS editor often omits this flag — open the `.animgraph` JSON and confirm `"looping": true` is on the state, not only on the sampleAnim node.
   - The `sampleAnim` node inside the `Walk` dataflow graph: `"members": { "looping": true }`.

   After creating the animgraph, open the `.animgraph` file directly and grep for `"looping": true` — you should find it **at least twice** (once in the state, once in sampleAnim). If you only find one occurrence, fix the missing one before continuing.

3. **Produce the enemy template from `Templates/Enemies/Enemy.hstf`.** Same procedure for both flows:
   - **Mesh swap on an existing enemy**: open the target `.hstf` (same hierarchy as `Enemy.hstf`) and swap the mesh + animgraph references in place.
   - **New enemy**: produce a new `Templates/Enemies/<EnemyName>.hstf` identical to `Enemy.hstf` — preserve its full structure (root with `TransformPlatformComponent` + `EnemyController`, `Pivot` child, mesh child, `shadow` child, all `RelationChildOf` relationships). Do not  omit components.

   In both cases, the only fields you change are:
   - The mesh child's `MeshPlatformComponent` → new mesh asset ref (`packageOrRemoteId` / `ingestionId` / `targetId` from the new model's `.assetmeta`).
   - The mesh child's `AnimatorPlatformComponent` → new `animGraph` and `skeleton` asset refs.
   - The mesh child's `name` (e.g. `"Knight"` instead of `"Troll"`) and, for a new template, the root entity `name` + the file name.
   - Optionally the mesh child's `localScale` / `localPosition.y` if the new mesh needs sizing.

   **Do NOT touch**: the root `TransformPlatformComponent`, the `EnemyController` `data.bodyPivot` and `data.shadow` UUIDs, the `Pivot` entity's rotation, the `shadow` entity, or any `RelationChildOf` entry. If any of these end up missing or rewired, you derived incorrectly — start over from `Enemy.hstf`.

4. **Initialize the mesh `ColorComponent` to white `(1, 1, 1, 1)`.** Default is black, which multiplies the albedo to zero (mesh renders fully black). Walk the mesh hierarchy and set each `ColorComponent` explicitly. (Already correct on `Enemy.hstf` — just preserve it.)

5. **Rotate the mesh child to face -Z.** Generated mesh faces +Z; MHS forward (used by `lookAt`) is -Z. Set the mesh child's `localRotation` to **180° around Y**. Do not touch the `Pivot` entity — it is reserved for the runtime 2.5D tilt (`EnemyController._updateBodyPivot()` overwrites its rotation each frame).

6. **Register the enemy** (new enemies only):
   - `Scripts/Assets.ts` — add `export const Enemy<Name> = new TemplateAsset('@Templates/Enemies/Enemy<Name>.hstf');`
   - `Scripts/Defs/EnemyDefs.ts` — add an `ENEMY_DEFS` entry (`id`, `name`, `hp`, `speed`, `reward`, `template`, optional traits like `dodgeChance`, `regenPerSec`, `slowImmune`).
   - `Scripts/Defs/LevelDefs.ts` — add the new enemy id to the relevant waves.

## Quick checklist

- [ ] Mesh generated (bipedal humanoid, facing +Z, pivot at feet)
- [ ] Looping walk animation generated (WTA, or marketplace + retargeting)
- [ ] AnimGraph created with Walk clip looping
- [ ] `.animgraph` JSON contains `"looping": true` BOTH on the state in `main` AND on the `sampleAnim` node (verified by reading the file)
- [ ] Template derived from `Enemy.hstf` — structure preserved (root transform, EnemyController with bodyPivot+shadow wired, Pivot, mesh child, shadow child, all relationships)
- [ ] Only mesh ref, animgraph ref, skeleton ref, mesh-child name (and root name + file name for new enemies) were changed
- [ ] Mesh `ColorComponent`s set to `(1, 1, 1, 1)`
- [ ] Mesh child rotated 180° around Y so it faces -Z
- [ ] `Pivot` entity untouched (runtime overwrites its rotation each frame)
- [ ] `Assets.ts`, `EnemyDefs.ts`, `LevelDefs.ts` updated (new enemies only)
- [ ] Template saved (`template_save`)
