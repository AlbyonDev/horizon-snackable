---
name: create-enemy
summary: How to create a new enemy or replace the mesh of an existing one in an enemy template
include: always
agents: [global]
---

# Create or Replace an Enemy

Both new enemies and mesh swaps derive from `Templates/Enemies/Enemy.hstf`. Starting from that template guarantees the root `TransformPlatformComponent`, the `Pivot` tilt, the `shadow` child, and the `EnemyController` wiring (`bodyPivot`, `shadow` UUIDs) are correct by construction.

For architectural context, see `Docs/PROJECT_SUMMARY.md → Enemy template` and `Docs/ART_DIRECTION.md → Enemy Mesh Integration`.

## Steps

1. **Generate the mesh** — bipedal humanoid, facing +Z, pivot at feet. Output to `Models/<EnemyName>/`.

2. **Create the AnimGraph** at `Animations/<EnemyName>/<EnemyName>AnimGraph.animgraph` — a single looping `Walk` state.

   **CRITICAL — `"looping": true` must appear in TWO places** in the `.animgraph` JSON, or the walk plays once and freezes:
   - On the state entry inside the `main` stateMachine (the MHS editor often omits this).
   - On the `sampleAnim` node inside the `Walk` dataflow graph.

   After creation, grep the file for `"looping": true` — expect **at least two** occurrences.

3. **Derive the `.hstf` from `Enemy.hstf`.** Swap only:
   - mesh child's `MeshPlatformComponent` → new mesh asset ref
   - mesh child's `AnimatorPlatformComponent` → new `animGraph` + `skeleton` refs
   - mesh child's `name` (and root `name` + filename for new enemies)
   - optionally mesh child's `localScale` / `localPosition.y`

   **Verify after writing**: the root entity has a `TransformPlatformComponent`. If missing, you derived incorrectly — start over from `Enemy.hstf`. Also preserve: `EnemyController.data.bodyPivot` + `data.shadow` UUIDs, the `Pivot` entity, the `shadow` entity, and all `RelationChildOf` entries.

4. **Mesh child `ColorComponent` = `(1,1,1,1)`**. Default is black, which zeroes the albedo.

5. **Rotate mesh child 180° around Y** (generated mesh faces +Z; MHS forward is -Z). Do not touch the `Pivot` entity — runtime overwrites its rotation.

6. **Register (new enemies only):**
   - `Scripts/Assets.ts` — add `TemplateAsset` entry
   - `Scripts/Defs/EnemyDefs.ts` — add `ENEMY_DEFS` entry
   - `Scripts/Defs/LevelDefs.ts` — add to relevant waves

## Final verification — read the files and confirm

- [ ] `.animgraph` JSON has `"looping": true` in **both** the state entry and the `sampleAnim` node
- [ ] Mesh child's `ColorComponent` is `(1, 1, 1, 1)`
- [ ] Root entity has a `TransformPlatformComponent`
- [ ] `EnemyController.data.bodyPivot` and `data.shadow` reference the Pivot and shadow entity UUIDs
