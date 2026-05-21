---
name: create-enemy
summary: How to create a new enemy or replace the mesh of an existing one in an enemy template
include: always
agents: [global]
---

# Create or Replace an Enemy

Use this skill when adding a new enemy type or swapping the visible character mesh inside an existing enemy template (`Templates/Enemies/*.hstf`).

For the architectural context (template hierarchy, `EnemyController` `@property` slots, 2.5D pivot behavior), see `Docs/PROJECT_SUMMARY.md → Enemy template` and `Docs/ART_DIRECTION.md → Enemy Mesh Integration`. Trust the existing project state — do not reinvent the structure.

## Steps

1. **Generate the character mesh** — use the 3D character generation tool with a **walk animation looping** baked in. Mesh comes out with pivot at body center, facing +Z.

2. **Place it in a template** — either:
   - **Replace** the existing mesh child inside an existing `Templates/Enemies/<Name>.hstf`, OR
   - **Create a new template** mirroring the structure of an existing one (root + `Pivot` + mesh + `shadow`).

3. **Skip the limbs** — the walk animation is baked into the mesh, so the separate `LeftArm`/`RightArm`/`LeftLeg`/`RightLeg` entities are not needed. Leave the `@property` slots empty on the `EnemyController` (the runtime handles null limbs gracefully) or omit the entities entirely.

4. **Initialize every `ColorComponent` to white `(1, 1, 1, 1)`.** Default is black, which multiplies the albedo to zero (mesh renders fully black). Walk the mesh hierarchy and set each `ColorComponent` explicitly.

5. **Rotate the mesh child to face -Z.** Generated mesh faces +Z; MHS forward (used by `lookAt`) is -Z. Set the mesh child's `localRotation` to **180° around Y** inside the template. Do not touch the `Pivot` entity — it is reserved for the runtime 2.5D tilt.

## Quick checklist

- [ ] Mesh generated with looping walk animation
- [ ] Mesh placed under the `Pivot` child of the template (not under root directly)
- [ ] Limb `@property` slots empty or limb entities omitted
- [ ] All `ColorComponent`s set to `(1, 1, 1, 1)`
- [ ] Mesh child rotated 180° around Y so it faces -Z
- [ ] `Pivot` entity untouched (runtime overwrites its rotation each frame)
