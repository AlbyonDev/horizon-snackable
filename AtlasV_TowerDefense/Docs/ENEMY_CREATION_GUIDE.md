# Enemy Creation Guide

Project-specific notes for creating new enemies in this tower defense game, supplementing the global `create-enemy` skill.

---

## Base Template

Always derive from **`Templates/Enemies/Enemy.hstf`** (the Goblin Warrior). It has the correct hierarchy:

```
Enemy (root)         ← TransformPlatformComponent + EnemyController
├── Pivot            ← bodyPivot (2.5D tilt layer)
│   └── <Mesh>      ← character model
└── shadow           ← flat disc on ground
```

---

## Mesh Positioning (CRITICAL)

**Set mesh child `localPosition.y = 0`** for all PTC-generated meshes.

PTC meshes have their pivot/origin at the feet (Y=0 in mesh-local space). The Goblin Warrior template has `localPosition.y = 0.639` because its legacy mesh had the origin above the feet — do NOT inherit this offset for new enemies. Override it to `0` or the enemy will float.

---

## Checklist (extends global create-enemy skill)

1. **Generate mesh** — bipedal humanoid, chibi goblin/orc family, facing +Z, pivot at feet
2. **AnimGraph** — `"looping": true` in BOTH the state entry AND the `sampleAnim` node
3. **Derive .hstf from Enemy.hstf** — swap mesh, animator, skeleton refs
4. **Mesh child fixes:**
   - `localPosition.y = 0` (NOT inherited from Goblin Warrior)
   - `ColorComponent = (1, 1, 1, 1)` (default is black, zeroes albedo)
   - Rotation `(0, -180, 0)` — 180° Y flip (mesh faces +Z, MHS forward is -Z)
5. **Verify root** has `TransformPlatformComponent`
6. **Preserve** `EnemyController.data.bodyPivot` + `data.shadow` UUIDs, Pivot entity, shadow entity, all `RelationChildOf`
7. **Register:**
   - `Scripts/Assets.ts` — `TemplateAsset` entry
   - `Scripts/Defs/EnemyDefs.ts` — `ENEMY_DEFS` entry with stats + any traits
   - `Scripts/Defs/WavePackDefs.ts` — add to relevant pack(s)

---

## Stats Reference

| ID | HP | Speed | Reward | Trait |
|----|-----|-------|--------|-------|
| basic | 60 | 1.25 | 5g | — |
| shaman | 45 | 1.75 | 7g | `shield: 4` (4s damage immunity) |
| fast | 35 | 2.50 | 8g | `dodgeChance: 0.15` |
| tank | 220 | 0.75 | 15g | `regenPerSec: 8` |
| boss | 600 | 0.60 | 50g | `slowImmune: true` |

---

## Trait System

Enemy traits are defined in `IEnemyDef` and handled in `EnemyController`:

- `shield: number` — seconds of full damage immunity on spawn (visual: semi-transparent cylinder, flickers last 2s). Towers skip shielded enemies via `TargetingService`.
- `dodgeChance: number` — probability to avoid a hit entirely
- `regenPerSec: number` — HP restored per second
- `slowImmune: boolean` — ignores slow effects

When adding a new trait, set it to `0` / `false` for all existing enemies that don't use it.
