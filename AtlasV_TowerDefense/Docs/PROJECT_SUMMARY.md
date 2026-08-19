# H5 Tower Defense — Project Summary

## Concept

Single-player mobile tower defense, portrait orientation, for Meta Horizon Worlds.
The player places towers on an **11×14 world-unit grid** during build phases to stop waves of enemies from reaching the end of a snake path.
Core tension: strategic placement (choke points, range overlap) vs. economy management (gold per kill, upgrade vs. new tower decisions).

---

## Platform & Stack

| Item | Value |
|------|-------|
| Platform | Meta Horizon Studio (MHS) |
| Language | TypeScript ES2022 |
| Target | Mobile portrait, local single-player |
| Grid | 11 cols × 14 rows × 1 cell = **11×14 world units**, centered on origin; cols 0 and 10 are locked (no towers, no path routing) |
| Play area | Grid ~70% screen height; HUD top ~10%, Shop bottom ~20% |
| Ground | Tiled cartoon grass texture (Unlit material, UV scale 6×4) on 11×8 plane; dark border plane behind |

---

## Scene Setup & 2.5D Camera Tricks

The game is a top-down 2D play field rendered with a 3D camera. Everything below is load-bearing for the look — change at your own risk.

### Camera (Fixed mode, top-down with portrait yaw)

| Property | Value | Why |
|----------|-------|-----|
| Position | `(1, 17.5, 0)` | 17.5 units above the play field on Y. Slight +1 X offset re-centers the visible play area under the portrait HUD (top HUD eats screen real estate, so the camera is nudged forward along the row axis). |
| Rotation (Euler) | `(-90, 90, 0)` | `-90` pitch = camera looks straight down (-Y). `+90` yaw = rotates the view so world **+X is "down" on screen** and world **+Z is "right" on screen** — this is what makes portrait orientation work. |
| FOV | 60° | Set in `ClientSetup` (`cameraFov`). |
| Mode | `CameraMode.Fixed` | No follow, no player camera. `FocusedInteractionService` is enabled so screen taps route to `OnFocusedInteractionInputStarted*` events. |

**Camera is set in [ClientSetup.ts](../Scripts/Components/ClientSetup.ts) via a scene `cameraAnchor` entity.** Position and rotation come from that anchor's TransformComponent — don't set them in code.

### Screen axes ↔ World axes (CRITICAL — keep this table in your head)

Because of the yaw, the standard "X is right, Z is forward" intuition is wrong here.

| Screen direction | World axis | Sign | Notes |
|------------------|-----------|------|-------|
| Right (→)        | Z         | +Z   | columns increase rightward |
| Left (←)         | Z         | -Z   | |
| Down (↓ toward player) | X    | +X   | rows increase downward |
| Up (↑ away)      | X         | -X   | enemy spawn end / "top" of the board |
| Out of screen    | Y         | +Y   | toward the camera (height) |

This is reflected in [Constants.ts](../Scripts/Constants.ts):
```
// col → Z axis (horizontal, left/right on screen)
// row → X axis (vertical, top/bottom on screen)
```

**Implication for path/grid math**: `cellToWorld(col, row)` → `(GRID_ORIGIN_X + row, GROUND_Y, GRID_ORIGIN_Z + col)`. When writing path logic, "moving right on screen" = ΔZ, "moving down on screen" = ΔX.

### Background

| Element | Transform | Notes |
|---------|-----------|-------|
| Background plane | position `(0, 0, 0)`, rotation `(0, 0, 0)` | Lies flat on the XZ plane at Y=0. Acts as the ground/board. |
| Path tiles | spawned at `(GRID_ORIGIN_X + row, 0, GRID_ORIGIN_Z + col)` with Y-axis rotation only (see `PathTileService`) | Sit slightly above ground; visual road. |
| Towers / enemies | `GROUND_Y = 0` (their root sits on the plane) | Visual mesh extends up along +Y. |

### The 2.5D illusion — how flat-ish meshes "feel" 3D

Even though the camera looks straight down, the game **does not look flat** because of two deliberate rotation tricks:

#### 1. Enemy `bodyPivot` lean (the walk-tilt trick)

Enemy templates have a `bodyPivot` child entity that wraps the visible mesh. The pivot is rotated **based on movement direction** every frame in [EnemyController.ts:252-263](../Scripts/Components/EnemyController.ts#L252):

```typescript
// dx, dz = direction of movement on the XZ plane
if (dx > 0)       angle = (-30, 0, 0);   // moving +X (down on screen) → pitch -30°
else if (dx < 0)  angle = ( 30, 0, 0);   // moving -X (up on screen)   → pitch +30°
else if (dz > 0)  angle = (0, 0,  45);   // moving +Z (right on screen) → roll +45°
else if (dz < 0)  angle = (0, 0, -45);   // moving -Z (left on screen)  → roll -45°
pivot.localRotation = Quaternion.fromEuler(angle);
```

Why this works: with a straight-down camera, a pure +Y mesh would appear as a dot. Tilting the body by 30–45° toward the camera exposes the **front face** of the mesh, giving the silhouette volume and personality. The tilt also visually telegraphs the direction the enemy is walking.

`lookAt()` is still called on the root transform (line 197) so any non-pivoted child (e.g. legs/arms animation rest poses) faces the travel direction. The `bodyPivot` overlay is what produces the cartoony lean.

#### 2. Tower barrel yaw (aim trick)

Towers have a `barrel` child rotated each frame to aim at the current target — see [TowerController.ts:161-172](../Scripts/Components/TowerController.ts#L161):

```typescript
const yawDeg = Math.atan2(dx, -dz) * (180 / Math.PI) + this.barrelForwardOffsetDeg;
barrelT.localRotation = Quaternion.fromEuler(new Vec3(0, -yawDeg, 0));
```

Notes:
- Barrel mesh forward must be **+Z in local space** (RUB convention). The `-dz` and negated `yawDeg` come from this convention; if a new barrel art piece points differently, use `barrelForwardOffsetDeg` to compensate — do NOT change the formula.
- Only yaw (Y axis) is animated. Pitch/roll are baked into the mesh art (typically a slight forward lean to read well from above).
- Tower base/body is static; only the `barrel` child rotates.

#### 3. Coins — permanent X tilt to fake isometry

Loot coins ([CoinController.ts](../Scripts/Components/CoinController.ts)) apply a permanent **`COIN_TILT_X = -45°`** at rest so the disc face is visible to the top-down camera, while spinning on local up. During flight the tilt blends with launch velocity to read as physics. This is the same family of trick: rotate flat geometry toward the camera so the silhouette has area.

### Rules of thumb when adding new visual entities

1. **Anything tall and thin** (enemies, projectiles, props) needs a tilt toward the camera — either baked into the prefab rotation or driven by a `bodyPivot`-style child.
2. **Anything flat and disc-shaped** (coins, AoE markers, range indicators) needs to lie on the XZ plane (rotation `(0, 0, 0)` or `(90, *, 0)` depending on mesh orientation).
3. **Anything that aims** (turret barrels, lasers) rotates **only on Y**; pitch/roll are art-baked.
4. **Don't change camera rotation** to "fix" something looking off — fix the entity art or its tilt. The camera yaw is the contract that screen-vs-world axes depend on, and many gameplay services (`PathService`, `TargetingService`, HUD positioning) assume it.
5. **Y is always camera-facing.** Use Y for vertical offsets in the visual hierarchy (health bars float on +Y, floating text rises on +Y).

---

## Architecture

### Principle
Event-driven, no direct component references. Each service owns one responsibility.
New features are new files — existing files are only modified when necessary.

### Communication
All gameplay communication via `EventService.sendLocally()`.

### Pipeline Services
One resolution pipeline — a `reduce` over registered modifier closures:

| Service | Pipeline | Current modifiers |
|---------|----------|-------------------|
| `HitService` | `IHitContext → IHitContext` | `SplashSystem` (AoE target expansion), `CritService` (crit damage × multiplier + skill tree crit bonus), `RelicService` (damage × relic multiplier, slow duration × relic multiplier) |
| `TakeDamage` subscribers | event-driven | `ChainLightningService` (chain-bounce to nearby enemies with falloff), `PoisonDotService` (stacking DoT ticks) |

Adding a new mechanic (pierce, burn…) = one new `@service()` that calls `HitService.get().register(modifier)` in `onReady()` or subscribes to `TakeDamage`, then one import line in `GameManager`.

---

## File Structure

```
Scripts/
  Types.ts          — Enums, interfaces, pipeline contexts, all LocalEvents
  Constants.ts      — Grid dims, timing, economy values, crit multiplier
  Assets.ts         — ALL TemplateAsset declarations (single source of truth)

  Defs/
    TowerDefs.ts    — TOWER_DEFS: ITowerDef[] (7 towers + upgrade trees)
    EnemyDefs.ts    — ENEMY_DEFS: IEnemyDef[] (11 enemy types including charger, yeti berserker, frost goblin, fire goblin, fire golem, cave boss, and giant goblin; each has a `followPath` property controlling path vs straight-line movement)
    LevelDefs.ts    — LEVEL_DEFS: ILevelDef[] (20 waves, 1 level, includes path waypoints); WAVES_LEVEL_0 exported but unused by runtime
    PathDefs.ts     — PATH_WAYPOINTS_LEVEL_0 exported but unused by runtime (legacy reference data)
    WavePackDefs.ts — Wave pack definitions (T1/T2/T3/T4/Boss packs + snow biome T1/T2/T3 packs + volcano biome T1/T2/T3/Boss packs) and tier slot patterns per level; used by LevelGeneratorService for procedural wave composition; T4 packs feature the Charger enemy as a mini-boss mixed with other enemies; T1 packs include ShamanRaid (3 basic + 2 shaman); snow T1 packs include frost goblin enemies; snow Boss packs use Yeti Berserker as the biome-specific boss; volcano T1/T2/T3 packs include fire goblin enemies; volcano Boss packs use Fire Golem as the biome-specific boss; grass Boss packs use Giant Goblin as the biome-specific boss; Boss packs include CaveBossWave (1 caveBoss + 5 basic + 3 fast) which randomly appears as the final wave of the last level in any non-volcano biome; T3 packs include FireballBarrage (4 fireball + 3 fast) and FireballRush (3 fireball + 5 basic) mixing the Fireball enemy into late-game general waves
    UpgradeDefs.ts  — Upg atoms catalog + tree() builder
    BiomeDefs.ts    — BIOME_DEFS: IBiomeDef[] (3 biomes: grass, snow, volcano)
    RelicDefs.ts    — RELIC_DEFS: IRelicDef[] (6 relics: gold, damage, speed, range, lives, slow)
    NodeDefs.ts     — NODE_TYPE_DEFS: Record<OverworldNodeType, INodeTypeDef> (3 node types: combat, boss, minigame)
    NodeDefs.ts     — NODE_TYPE_DEFS: Record<OverworldNodeType, INodeTypeDef> (3 types: combat, boss, minigame with sprite paths)
    SkillTreeDefs.ts — SKILL_NODES + SKILL_CONNECTIONS: explicit graph-based skill tree (1 root node + 9 branch nodes with directed edge connections defining prerequisites; supports lateral cross-branch links)
    BiomeModifierDefs.ts — BIOME_MODIFIERS: IBiomeModifier[] (tower-biome damage multipliers for buff/debuff system)

  Services/
    PathService         — waypoint path, cellToWorld(), isPathCell() (rebuilds on LevelSelected from LevelGeneratorService)
    PathTileService     — spawns path tiles using 5 templates (4 pre-rotated corners + 1 straight with runtime Y-rotation) and 2 shared UV-sliced materials; swaps pathTex on BiomeChanged
    LevelGeneratorService — procedural level generation using wave pack system; generates TOTAL_LEVELS ILevelDef instances on StartGame using tier-based pack selection (T1/T2/T3/T4/Boss packs with no-repeat logic); biome-aware wave composition mixes in biome-specific packs (e.g. snow yeti packs) based on active biome; tracks runCount (resets on StartGame, increments on advanceRun when all levels beaten)
    TowerService        — selectedId, place on GridTapped, upgrade, sell
    EnemyService        — live enemy registry (worldX, worldZ, pathT, hp, speedFactor)
    ResourceService     — gold, lives, earn(), spend(), loseLife(), reset()
    TargetingService    — getBestTarget(), getEnemiesInRadius()
    WaveService         — state machine: Build → Wave → WaveClear → loop (reads from LevelGeneratorService)
    PlacementService    — drag-to-place input handler + preview + range indicator
    HitService          — hit target expansion pipeline
    SplashSystem        — registers AoE modifier into HitService
    SlowService         — subscribes to TakeDamage, applies slowFactor to enemies
    CritService         — registers crit modifier into HitService (arrow/cannon only)
    ChainLightningService — subscribes to TakeDamage, chain-bounces damage to nearby enemies
    PoisonDotService    — subscribes to TakeDamage, applies stacking DoT ticks
    ProjectilePool      — pre-spawned projectile pool (30 entities)
    HealthBarService    — pre-spawned health bar pool (30 entities)
    FloatingTextService — pools floating text entities; shows gold on death, crit multiplier on hit
    CameraShakeService  — shakes camera when an enemy reaches the end (life lost feedback)
    VfxService          — hit flash, impact/death particles, pooled particle physics
    CoinService         — pre-spawned coin pool (75 entities), physics loot coins on kill
    RelicService        — relic activation/deactivation, HitService damage modifier, exposes multipliers for TowerService and ResourceService
    BossModifierService — activates on boss-node levels; applies a single modifier (one of 6: HP x1.2, Speed x1.5, Damage x0.9, 1 Life, No Income, Tower Destroyed /5 Waves); uses a shuffle-bag so all 6 modifiers appear exactly once before any repeats; bag resets on new game and new run
    TowerDestroyAnimService — animated tower destruction for boss modifier; spawns a red meteor projectile from above, flies it to the tower, shakes the tower on impact, scales it to 0, then removes it from the grid
    SkillTreeService    — manages permanent skill tree unlocks; provides bonus getters consumed by TowerService, ResourceService, CritService, WaveService
    SkillTreeService        — permanent skill tree unlocks with graph-based prerequisites; exposes bonus multipliers consumed by TowerService, ResourceService, CritService, WaveService; purchase/persistence logic via SaveService
    BiomeArrowIndicatorService — spawns floating arrow sprites (buff/debuff) above placed towers based on active biome modifier; bobs gently; cleans up on sell/restart/biome change
    MagmaTileService    — spawns magma tile visuals on random non-path, non-locked cells in the volcano biome (run 1 = 5 tiles, +1 per run); exposes isMagmaCell(col, row) to block tower placement; tiles are LocalOnly client-side visuals with per-instance rounded-corner materials (SDF shader with neighbor-based corner rounding via Material.createInstance); cleans up on LevelSelected and RestartGame
    BlizzardSurgeService — subscribes to BlizzardFreeze event; temporarily boosts yeti enemies' speedFactor by x2 during intense blizzard bursts (6s duration), then reverts; only affects enemies with defId='yeti'

  Components/
    GameManager         — onStart prewarm, onUpdate tick, game start/end/restart
    TDGroundTextureController — Applies tiled grass texture to ground plane at start
    ClientSetup         — camera (Fixed mode), FocusedInteraction enable
    TowerController     — per-frame targeting + firing
    EnemyController     — path follow, TakeDamage handler, die/reach-end
    ProjectileController — homing movement, detonate via HitService pipeline
    HealthBarController  — follows enemy, updates fill
    FloatingTextController — animates rising/fading colored text
    GameHudController    — ViewModel for gold/lives/wave HUD
    TowerShopHud         — ViewModel for tower purchase bar
    TowerUpgradeMenuHud  — ViewModel for upgrade/sell panel
    GameOverScreenHud    — ViewModel for end screen + stats (defeat: Overworld/Play Again; victory: Choose Relic)
    RelicChoiceHud       — ViewModel for relic choice panel (2 random cards, activates chosen relic)
    TitleScreenHud       — ViewModel for pre-game title screen + Play button
    OverworldHud         — ViewModel for level select screen (Overworld phase)
    BiomeSelectHud       — ViewModel for debug biome selection screen (BiomeSelect phase)
    GroundBiomeController — Swaps ground plane material on BiomeChanged event
    CoinController       — physics-simulated coin loot with bounce, gravity, and collect animation
    WaveBannerHud        — ViewModel for wave announcement banner (WAVE X, animated)
    BossWarningHudController — ViewModel for boss level warning banner + active modifiers strip
    MinigameHud          — ViewModel for card shuffle minigame (shell game: Reveal→FlipDown→Shuffle→Pick→Result state machine)
    SkillTreeHudController — ViewModel for fullscreen skill tree overlay (graph-derived bezier connection paths, purchase with skulls, opened from overworld skull header tap)
    LevelSaveComponent   — Persists level beaten state and active relics to PlayerVariablesService (key "td_level_sav"); restores on load via ProgressRestored event
```

---

## Towers

| ID | Name | Cost | Damage | Range | Fire Rate | Splash | Notes |
|----|------|------|--------|-------|-----------|--------|-------|
| `arrow` | Arrow | 50g | 12 | 2.70 | 1.5/s | — | Crit ×2 @ 20% baseline (arrow-only baseline) |
| `cannon` | Cannon | 100g | 40 | 2.10 | 0.6/s | r=0.75 | Arc projectile |
| `frost` | Frost | 80g | 5 | 2.28 | 1.0/s | — | Slow 50% / 1.5s |
| `poison` | Poison | 90g | 8 | 2.00 | 1.2/s | — | DoT: 5 dmg/0.5s for 3s |
| `lightning` | Lightning | 150g | 15 | 2.50 | 2.0/s | — | Chain: hits 2 extra targets (50% falloff per chain) |
| `fire_cannon` | Fire Cannon | 120g | 35 | 2.20 | 0.7/s | r=0.6 | Arc AoE, fiery orange projectile |
| `laser` | Laser | 200g | 8 | 3.60 | 5.0/s | — | Highest base DPS |
| `pillar` | Pillar | 30g | 99999 | 2.00 | 1-shot | — | Single-use trap: tips over onto first enemy, instant-kills, then self-destructs |

---

## Upgrade System

Each tower has a binary upgrade tree: **2 tiers**, 2 choices per tier → 4 possible end-states per tower.

```
T1 (1 choice of 2)
├── T2-L (if T1 = left)  → choice of [t2[0][0], t2[0][1]]
└── T2-R (if T1 = right) → choice of [t2[1][0], t2[1][1]]
```

Built via `tree(t1, t2)` in [UpgradeDefs.ts](../Scripts/Defs/UpgradeDefs.ts):
- `t1`: `[Atom, Atom]` — the two root choices.
- `t2`: `[[Atom, Atom], [Atom, Atom]]` — leaf pairs, one per root.

Cost rule (current convention in TowerDefs): T1 ≤ tower cost, T2 ≤ 1.5× tower cost.

### Available upgrade atoms (`UpgradeDefs.ts`)

| Atom | Effect | Notes |
|------|--------|-------|
| `Upg.rate` | `fireRate × 2.0` | — |
| `Upg.damage` | `damage × 2.0` | — |
| `Upg.range` | `range + 1.0` (world units) | — |
| `Upg.splash` | `splashRadius + 0.5` (additive, default 0 if absent) | — |
| `Upg.slowFactor` | `slowFactor = max(0.15, cur × 0.7)` (default cur = 0.5) | Frost only by convention |
| `Upg.slowDuration` | `slowDuration + 1.0s` (default cur = 1.5) | Frost only by convention |
| `Upg.crit` | `critChance = max(cur, 0.20)`; `critMultiplier += 1` | Arrow ships with `critChance=0.2`, `critMultiplier=2` baseline |

Crit is applied in `CritService` as a `HitService` pipeline modifier. The arrow tower's base stats already include `critChance: 0.2, critMultiplier: 2` — taking `Upg.crit` on a non-arrow tower (e.g. cannon) introduces crit from zero baseline. When a crit fires, `FloatingTextService` shows the multiplier in red above the enemy.

Restrictions (e.g. "no splash on arrow", "laser range max once") are enforced **at def authoring time** in `TowerDefs.ts` — the tree literals simply don't include forbidden atoms. There's no runtime guard.

---

## Enemies

| ID | Name | HP | Speed | Reward | Trait |
|----|------|----|-------|--------|-------|
| `basic` | Enemy | 60 | 1.25/s | 5g | — |
| `fast` | Fast | 35 | 2.50/s | 8g | `dodgeChance: 0.15` |
| `tank` | Tank (Troll) | 220 | 0.75/s | 15g | `regenPerSec: 8` |
| `charger` | Charger | 1000 | 0.60/s | 50g | `slowImmune: true`, `followPath: false` — does not follow the winding path, moves straight toward the base |
| `shaman` | Shaman | 45 | 1.75/s | 7g | — |
| `yeti` | Yeti Berserker | 1800 | 0.35/s | 65g | `blizzardSpeedBoost: 1`, `biomeExclusive: 'snow'`, `slowImmune: true` (snow biome boss) |
| `frostGoblin` | Frost Goblin | 66 | 1.25/s | 5g | `biomeExclusive: 'snow'` (snow T1 grunt) |
| `fireGoblin` | Fire Goblin | 66 | 1.25/s | 5g | `biomeExclusive: 'volcano'` (volcano T1 grunt) |
| `fireGolem` | Fire Golem | 600 | 0.60/s | 50g | `biomeExclusive: 'volcano'`, `slowImmune: true` (volcano biome boss) |
| `caveBoss` | Cave Boss | 2000 | 0.40/s | 75g | `slowImmune: true`, `straightLine: true` — ignores path, moves in a straight line toward the base, destroys any towers in its path on contact |
| `giantGoblin` | Giant Goblin | 600 | 0.60/s | 50g | `biomeExclusive: 'grass'`, `slowImmune: true` (grass biome boss) |
| `fireball` | Fireball | 150 | 1.5/s | 10g | `slowImmune: true`, `followPath: false` — moves in a straight line toward the base; animated with pulsing scale + Y-rotation via `FireballAnimator` component and a `fire_intense_loop` VFX child |

HP scales +15% per wave: `hp × (1 + waveIndex × HP_SCALE_PER_WAVE)` where `HP_SCALE_PER_WAVE = 0.15`. Last wave (W20, `waveIndex = 19`): ~3.85× base HP.

---

## Economy

| Parameter | Value |
|-----------|-------|
| Start gold | 120g (`START_GOLD`) |
| Start lives | 10 (`START_LIVES`) |
| Total levels per run | 5 (`TOTAL_LEVELS` in Constants.ts) |
| Run counter | Starts at 1, increments when all levels beaten (boss included), resets on new game (`StartGame`). Tracked in `LevelGeneratorService.runCount`. |
| Skull currency | Permanent metaprogression currency. +1 per combat level win, +2-5 per boss level win (determined by boss modifier difficulty: DmgDown=2, HpUp/SpeedUp/NoIncome=3, TowerDestroy=4, OneLife=5). Never resets. Persisted in `TdSaveData.sk`. Displayed in overworld header. |
| Skill Tree | Permanent meta-progression purchased with skulls. 1 root node + 30 branch nodes (10 tiers x 3 branches) with directed graph connections (SKILL_CONNECTIONS edges). A node is purchasable when at least one incoming-connected node is unlocked. Unlocks persist in `TdSaveData.st`. Opens from the overworld skull header tap. Bonuses: +damage, +fire rate, +crit, +lives, +range, +starting gold, +wave bonus, +sell refund. Special unlock nodes: \"Unlock Snow Biome\" (index 14, cost 10 skulls) and \"Unlock Volcano Biome\" (index 20, cost 18 skulls) gate biome navigation arrows in the Overworld HUD. Nodes 24, 25, and 29 are infinitely re-purchasable: each purchase stacks the bonus additively, purchase counts persist in `TdSaveData.stc`, and these nodes display with a teal ring in the UI. |× 3 tiers each. Connections between nodes are explicitly defined as a directed graph (SKILL_CONNECTIONS edges), allowing lateral cross-branch links and flexible prerequisite paths. A node is purchasable when at least one incoming-connected node is unlocked. Unlocks persist in `TdSaveData.st`. Opens from the overworld skull header tap. Bonuses: +damage, +fire rate, +crit, +lives, +range, +starting gold, +wave bonus, +sell refund. Special nodes: Unlock Laser Canon (index 8), Unlock Poison Tower (index 10, cost 8 skulls), Unlock Fire Cannon for all biomes (index 16, cost 12 skulls), Unlock Lightning Tower (index 18, cost 14 skulls), Unlock Frost Tower for all biomes (index 19, cost 12 skulls), Unlock Snow Biome (index 14, cost 10 skulls), Unlock Volcano Biome (index 20, cost 18 skulls). |
| Wave bonus | +15g flat (`WAVE_BONUS_GOLD`) + 15% of gold on hand (`INCOME_RATE`) at wave end |
| Sell refund | 60% of total invested (`SELL_RATIO = 0.6`) |

---

## Relic System

Relics are persistent modifiers that buff gameplay systems when activated. After winning a level the player is presented with a Relic Choice screen offering 2 random relics they don't already have; tapping one activates it and returns to the Overworld. Relics persist across levels within a run, are saved to `PlayerVariablesService` (as part of the `td_level_sav` object under the `rel` field), and are restored on session load. Relics reset when the run advances (boss beaten) or a new game starts (`RelicService.reset()` on `StartGame` event).

| ID | Name | Modifier | Effect |
|----|------|----------|--------|
| `gold` | Gold Relic | `goldMultiplier: 2.0` | Doubles starting gold on level reset |
| `damage` | Damage Relic | `damageMultiplier: 1.2` | All tower damage ×1.2 (via HitService pipeline) |
| `speed` | Speed Relic | `fireRateMultiplier: 1.2` | All towers fire 1.2× faster (via TowerService) |
| `range` | Range Relic | `rangeMultiplier: 1.15` | All towers have 1.15× range (via TowerService) |
| `lives` | Fortification Relic | `bonusLives: 5` | +5 starting lives on level reset |
| `slow` | Permafrost Relic | `slowDurationMultiplier: 1.3` | Slow effects last 1.3× longer (via HitService pipeline) |

### Integration points

- **HitService pipeline**: `RelicService` registers a modifier in `onReady()` that applies `damageMultiplier` and `slowDurationMultiplier`.
- **TowerService.getEffectiveStats()**: applies `fireRateMultiplier` and `rangeMultiplier` after upgrade tree walk.
- **ResourceService.reset()**: applies `goldMultiplier` (floor) and `bonusLives` to starting values.
- **GameManager._startGame()**: force-instantiates `RelicService` to ensure hit modifier registers before combat.

---

## Biome System

The game features **independent per-biome progression** with a shared meta-currency layer. Each biome has its own run count, seed, beaten levels, and relics. Skulls and skill tree unlocks are shared globally across all biomes.

### Save Format (V2)

Save data is stored in `PlayerVariablesService` under key `td_level_sav` as a V2 blob: `{ v: 2, global: { sk, st, stc, ek, rg, ri, rv, tb, ts, pr, ge, ar, mf, ft, ft2, ft3 }, biomes: { grass: {...}, snow: {...}, volcano: {...} }, activeBiome }`. Each biome slice (`TdBiomeSave`) contains: `runCount`, `seed`, `beaten` (level indices), `relics` (active relic IDs). Global stats include: `sk` (skulls), `st` (skill tree), `stc` (infinite skill node purchase counts: maps node index string → count), `ek` (total enemies killed), `rg` (grass runs reached), `ri` (ice/snow runs reached), `rv` (volcano runs reached), `tb` (towers bought), `ts` (towers sold), `pr` (perfect runs), `ge` (gold earned), `ar` (achievement rewards claimed: maps group ID → number of tiers claimed), `mf` (minigame FTUE seen: 0 or 1), `vf` (volcano/magma FTUE seen: 0 or 1). V1 saves (no `v` field) are auto-migrated under the `grass` biome.

### Biome Navigation

Players switch biomes via **two navigation arrows** on the Overworld screen:
- **Right arrow** (ice-blue themed, snowflake icon): navigates to the next biome. Hidden when on the last biome (volcano).
- **Left arrow** (green themed, leaf icon): navigates to the previous biome. Hidden when on the first biome (grass).

Both arrows cycle through `BIOME_ORDER = ['grass', 'snow', 'volcano']`. The switch calls `LevelGeneratorService.resetGeneration()` then `SaveService.switchBiome(targetBiomeId)`, which fires `BiomeChanged`, `RunReset`, and `SaveRestored` events.

### Biome Assets

| Biome | Ground Material | Overworld Background | Path Texture | Flag Mesh |
|-------|----------------|---------------------|--------------|-----------|
| Grass (default) | `Models/Environment/Grass.material` | `sprites/overworld_background.png` | `Textures/path_tiles_cobblestone.png` | `Models/GameplayObjects/GrassFlag/GrassFlag.fbx` (orc/goblin war banner) |
| Snow | `Models/Environment/Snow.material` | `sprites/overworld_background-snow.png` | `Textures/path_tiles_ice.png` | `Models/GameplayObjects/SnowFlag/SnowFlag.fbx` (icy/frost war banner) |
| Volcano | `Models/Environment/Volcano.material` | `sprites/overworld_background-volcano.png` | `Textures/path_tiles_lava.png` | `Models/GameplayObjects/VolcanoFlag/VolcanoFlag.fbx` (charred/fiery war banner) |

### Runtime Integration

- `BiomeChanged` event broadcasts the chosen biome ID
- `GroundBiomeController` (on the ground Plane entity) swaps the MaterialComponent at runtime
- `OrcishFlagController` (on the OrcishFlag entity) swaps both the MeshComponent and MaterialComponent on the Visuals child to the biome-specific flag variant
- `OverworldHud` updates its background image via data-bound ViewModel property and manages the biome navigation arrow visibility/label
- `PathTileService` subscribes to `BiomeChanged` and swaps the `pathTex` parameter on the shared materials
- `GameManager.onStartGame()` reads `SaveService.get().activeBiome` to fire the correct initial `BiomeChanged`

### Biome Audio

- `BiomeMusicController` manages a dual-music-per-biome system: each biome has an **overworld music** track (plays during Overworld phase) and a **wave music** track (plays once the first wave starts, replacing overworld music). On returning to overworld (LevelCompleted, GameOver, RestartGame, etc.), wave music stops and overworld music resumes.
  - Grass biome: overworld = "A Walk in the Forest" (ambient daytime forest with wind, birdsong, nature sounds, 207s loop), wave = "Phantoms & Fantasies"
  - Snow biome: overworld = none (handled by BiomeAmbientAudioService ambient), wave = "Phantoms & Fantasies" (placeholder)
  - Volcano biome: overworld = none (handled by BiomeAmbientAudioService ambient), wave = "Phantoms & Fantasies" (placeholder)
  - All music plays looping at volume 0.4 via AudioManager pooled looping-sound system.
- `BiomeAmbientAudioService` (on AudioManager entity) plays a looping ambient sound per biome during active gameplay phases (Overworld, Build, Wave, WaveClear). Starts on phase enter or biome switch; stops on phase exit or biome switch. One unified controller handles all biomes with per-biome sound asset + volume properties.
- `BlizzardService` — Snow biome VFX+SFX system. Every 5 seconds during active gameplay (Build/Wave/WaveClear) while the biome is "snow", triggers a snow blizzard VFX burst (snow_blizzard_local PopcornFX asset) centered over the grid and a cold wind gust SFX. Every 3rd gust is an intense blizzard that freezes towers for 6s. Tower freeze is tier-based: Rank 3 towers (_currentTier >= 2) are fully immune, Rank 2 towers (_currentTier == 1) freeze for half duration (3s self-unfreeze), Rank 1 towers (_currentTier == 0) freeze for the full 6s. Fire Cannon, Frost, and Pillar towers are always immune regardless of tier. The VFX entity is spawned once at prewarm and play/stopped per gust. Deactivates when biome changes or game exits active phases.
- Audio assets: `Lava_Ambience/Lava_Ambience.WAV` (volcano ambient), `Wind_Cold_Low_Loop/Wind_Cold_Low_Loop.WAV` (snow ambient), `a_walk_in_the_forest_QZAAJ1902071/a_walk_in_the_forest_QZAAJ1902071.wav` (grass overworld), `phantoms_fantasies_QZAAJ2000898/phantoms_fantasies_QZAAJ2000898.wav` (wave music all biomes).

### Biome Modifiers (Tower Buff/Debuff)

Towers receive damage multipliers based on the active biome. Defined in `Scripts/Defs/BiomeModifierDefs.ts`.

| Tower | Biome | Multiplier | Effect |
|-------|-------|-----------|--------|
| Frost | Volcano | ×0.7 | Debuff (ice weak in heat) |
| Fire Cannon | Snow | ×1.3 | Buff (fire strong vs cold) |

Applied in `TowerService.getEffectiveStats()` after relic/skill multipliers. The Tower Shop HUD shows a colored arrow indicator (green up = buff, red down = debuff) on cards when a modifier applies in the current biome. Additionally, placed towers with an active biome modifier display a floating arrow sprite above them in the 3D world (spawned by `BiomeArrowIndicatorService`), bobbing gently for visibility.

---

## Game Phases

```
Title Screen → [BiomeSelect bypassed, auto-selects "grass"] → Overworld (Level Select) → Build (5s) → Wave → WaveClear (0.5s) → Build → … → Victory
                                                       ↑                                                                              ↓
                                          (StartGame generates                                                                   GameOver (won=true)
                                           TOTAL_LEVELS random                                                                        ↓
                                           ILevelDef instances)                                                          ┌─── Boss victory (last level) ───┐
                                                                                                                         │  "NEXT RUN" button              │
                                                                                                                         │  → Overworld → advanceRun()     │
                                                                                                                         │    (relics reset, new levels)   │
                                                                                                                         └────────────────────────────────────┘
                                                                                                                         ┌─── Regular victory ────────────┐
                                                                                                                         │  "CHOOSE RELIC" button         │
                                                                                                                         │  → Relic Choice (pick 1 of 2)  │
                                                                                                                         │  → Overworld                   │
                                                                                                                         └────────────────────────────────────┘
                                                                                                                              GameOver (lives = 0)
                                                                                                                                      ↓
                                                                                                                                 Title → Overworld

                                                       ↑ (from Overworld, Minigame node tapped)
                                                       ↓
                                                  Minigame (card shuffle) → MinigameCompleted → Overworld
```

---

## UI Panels

| Panel | File | Phase | Status |
|-------|------|-------|--------|
| **Title Screen** | `UI/TitleScreen.xaml` | Pre-game | ✅ — Full-screen dark overlay with logo and "JOUER" button. Fires StartGame on tap. |
| **Biome Select** | `UI/BiomeSelect.xaml` | BiomeSelect | ✅ — Debug scaffolding. Three buttons (Grass, Snow, Volcano). Fires BiomeChanged then transitions to Overworld. |
| **Overworld (Level Select)** | `UI/Overworld.xaml` | Overworld | ✅ — Fantasy adventure map with detailed cartoon painted landscape background (Kingdom Rush+ style), sprite-based stone medallion combat nodes (crossed swords), sprite-based boss nodes (golden spiked skull emblem), sprite-based minigame nodes (unique icon), and a smooth continuous bezier curve path connecting all nodes in a winding S-curve snake pattern (warm stone tan stroke with dark outer border, rendered as a single XAML Path element bound to a computed path data string). S-curve winding layout. Three node types: Combat (default), Boss (always last node), Minigame (one random middle node). Three node states: Open (golden glowing sprite, clickable), Beaten (default sprite, clickable), Locked (grey/chained sprite, not clickable). Each node type has its own sprite set for each state. Level 1 starts open; beating a level marks it beaten and opens the next. Fires LevelSelected on tap. Node type definitions in `Scripts/Defs/NodeDefs.ts`. Top header bar (dark wood gradient, gold borders/ornaments) displays three equal-width animated buttons: Reward (opens Achievements overlay), Skulls (shows skull-earning info popup: +1 combat, +2-5 boss), and Skill Tree (opens Skill Tree overlay). All buttons have breathing pulse + press squish animations. Bottom header bar (280px, matching top) displays three columns: Relics count (clickable, opens 3D carousel overlay), Levels beaten (X/total), and Run number (bottom-right bordered box with corner ornaments). A fullscreen 3D carousel overlay shows unlocked relic cards (swipeable left/right with tap zones, dot indicators, close button). Boss nodes display an animated skull reward badge (modifier-dependent: 2-5 skulls based on boss difficulty) that pulses and floats below the node when not yet beaten, motivating the player to progress. Both the skull badge and the boss modifier box are clickable — tapping either opens a medieval fantasy popup overlay showing the modifier name, description, skull reward, and a close button. The modifier box also has a pulsing/glowing animation matching the skull badge style. |
| **HUD** | `UI/GameHud.xaml` | Build/Wave/WaveClear | ✅ — Gold, lives, wave counter, countdown, Abandon button (returns to Overworld), and debug "Skip Wave" button (kills all enemies, visible during Wave phase only). |
| **Tower Shop** | `UI/TowerShop.xaml` | Build + Wave | ✅ — Two-tab panel: **TOWERS** (horizontal scrollable purchase cards with drag/momentum) and **MANAGE** (skill-tree upgrade view + sell). TOWERS tab: tap a card to enter placement mode. MANAGE tab: auto-activates when a placed tower is tapped; shows a horizontal skill-tree layout with all upgrade tiers visible at once (Back + Sell buttons on left, Tier II choices stacked vertically, Tier III choices stacked vertically grouped by parent branch). Node states: available (gold border), purchased (green border + checkmark), locked (dimmed, tier not reached), blocked (dimmed, path not taken). Players can plan ahead by seeing all possible paths. Manual toggle tab slides panel down to hide cards while keeping tabs visible. |
| **Tower Upgrade Menu** | `UI/TowerUpgradeMenu.xaml` | *(disabled)* | ⚠️ — Legacy overlay, now disabled. Tower management is integrated into TowerShop's MANAGE tab. Component (`TowerUpgradeMenuHud`) bails out on TowerSelected and stays permanently hidden. |
| **Game Over / Victory** | `UI/GameOverScreen.xaml` | End | ✅ — On defeat: shows Overworld + Play Again buttons. On regular victory: shows "Choose Relic" button that opens the Relic Choice panel. On boss victory (last level): shows "Next Run" button that skips relic choice and transitions directly to the next overworld run. |
| **Relic Choice** | `UI/RelicChoice.xaml` | Victory (after GameOver) | ✅ — Two random relic cards with unique painted icons (from relics not already active). Tapping one activates it and transitions to Overworld. |
| **Wave Banner** | UI/WaveBanner.xaml | Wave start | ✅ |
| **Boss Warning** | UI/BossWarning.xaml | Boss level (Build phase) | ✅ — Dramatic "BOSS LEVEL" banner with skull icon and fiery gold text, auto-dismisses after 3s. Persistent modifier strip below HUD shows active boss modifiers (HP, SPD, DMG multipliers, income disabled, lives override, tower destruction). Hides on level end/restart. |
| **Minigame** | UI/Minigame.xaml | Minigame | ✅ — Card shuffle (shell game). Three cards (Gold Bonus +50, Gold Malus -30 next level, Neutral) shown face up, flipped, shuffled with animated position swaps, player picks one. Medieval fantasy card style with gold accents. Gold malus deducted at next combat level start via ResourceService. First-time tutorial overlay pauses the Reveal phase and explains the mechanic ("Memorize the Gold card!") with a "Got it!" dismiss button; persisted in save data (`mf` flag) so it only shows once per player. |
| **Magma FTUE** | UI/MagmaFtue.xaml | Build (volcano biome, first time only) | ✅ — One-time fullscreen overlay popup explaining magma tiles block tower placement and scale with run count. Fiery gold title ("VOLCANIC HAZARD"), body text, orange "Got it!" dismiss button with breathing pulse animation (scale 1.0→1.06 loop + glow). Triggered on LevelSelected when biome is volcano and `vf` flag is not set. Persisted in save data (`vf` flag). |
| **Snow FTUE** | UI/SnowFtue.xaml | Build (snow biome, first time only) | ✅ — One-time fullscreen overlay popup explaining blizzards periodically freeze towers with tier-based resistance (Rank 2 = half duration, Rank 3 = fully immune; Fire Cannon, Frost, Pillar always immune). Icy blue title ("BLIZZARD WARNING"), body text, blue "Got it!" dismiss button with breathing pulse animation (scale 1.0→1.06 loop + glow). Triggered on LevelSelected when biome is snow and `sf` flag is not set. Persisted in save data (`sf` flag). |
| **Overworld FTUE** | UI/OverworldFtue.xaml | Overworld (first time only) | ✅ — Multi-step (4 steps) fullscreen overlay walkthrough shown on first Overworld entry. Green glowing border/outline, gold title ("OVERWORLD GUIDE"), step indicator, medieval fantasy style. Steps explain: nodes, progression, skulls, relics. "Next" button advances steps 1-3; "Got it!" button on step 4 dismisses. Breathing pulse animation on button. Blocks all interaction while active (`isBlocking=true`). Triggered on GamePhaseChanged to Overworld when `ft` flag is 0. Persisted in save data (`ft` flag). |
| **Overworld FTUE 3 (Rewards)** | UI/OverworldFtue3.xaml | Overworld (first time unclaimed achievement reward) | ✅ — Multi-step (3 steps) fullscreen overlay walkthrough shown on first time the player has an unclaimed completed achievement tier. Same green glow/gold medieval style. Steps explain: rewards available, skulls as permanent currency, skill tree spending. Requires ft=1, ft2=1, ft3=0, and at least one unclaimed tier. Persisted in save data (`ft3` flag). |
| **Overworld FTUE 4 (New Run)** | UI/OverworldFtue4.xaml | Overworld (first time after beating boss, runCount ≥ 2) | ✅ — Multi-step (3 steps) fullscreen overlay walkthrough shown after the player beats the boss and starts a new run. Same green glow/gold medieval style. Steps explain: boss defeated / new run, enemies stronger (more HP, faster), relics reset but skill tree permanent. Requires ft=1, ft2=1, ft3=1, ft4=0, and runCount ≥ 2. Persisted in save data (`ft4` flag). |
| **Save Indicator** | UI/SaveIndicator.xaml | On LevelCompleted | ✅ — Small "Saving..." pill in bottom-left corner. Fades in on level save, stays 2s, fades out. Non-interactive overlay. |
| **Skill Tree** | UI/SkillTree.xaml | Overworld (skull tap) | ✅ — Fullscreen overlay with hazy gradient background (dark muted purple → warm reddish-brown). Prominent root node at top with skull icon sprite. 3 branches × 10 tiers of circular nodes with pale cream wavy bezier connecting lines. Each node displays a thematic sprite icon representing its bonus category (sword=damage, heart=lives, lightning=fire rate, crosshair=crit, tower=unlock, range=tower range, coin=starting gold, treasure=wave bonus, refund=sell refund, skull=root). Icons stored in `sprites/skilltree/`. Cross-link paths between branches create a web-like interconnected feel. Nodes show unlocked (gold border), affordable (cream border), or locked (dim) states. Purchase deducts skulls. Fantasy font (Anton). Close button returns to overworld. |
| **Achievements** | UI/Achievements.xaml | Overworld (trophy tap) | ✅ — Fullscreen overlay with hazy gradient background (matching skill tree style). 8 merged gauge rows with tier-based background coloring (transparent → bronze → silver → gold → red → purple at ~25% opacity based on completed tiers). Slayer (kill enemies, tiers 50–5000), Grass Explorer (runs, tiers 10–500), Ice Explorer (runs, tiers 10–500), Volcano Explorer (runs, tiers 10–500), Towers Bought (towers placed, tiers 10–1000), Towers Sold (towers sold, tiers 5–500), Perfect Runs (levels without losing a life, tiers 1–100), Gold Earned (total gold, tiers 500–500000). Each row shows a tier-based achievement name that changes per tier (e.g. "Baby Slayer" → "Slayer" → … → "God Slayer"), description, a parchment-strip progress gauge scaled to the current tier target (not max) with diamond tier markers (gold=completed, grey=upcoming), and "current / tier target" text. Each row has a skull button on the right showing "Claim rewards" (gold text, when unclaimed completed tiers exist) or "See rewards" (dim text). Tapping the skull opens a reward tier popup listing all tiers with their name, target, and skull reward amount. Completed unclaimed tiers show a gold "CLAIM" button; claimed tiers show a "✓ Claimed" checkmark; locked tiers are greyed out. Claiming awards skulls (scaled: 1,2,3,5,8,12,18,25,35 per tier index). Progress sourced from SaveService global stats (ek/rg/ri/rv/tb/ts/pr/ge). Opened by tapping the TROPHIES button in the Overworld header. Close button returns to overworld. |

---

## Events Reference

| Event | Key payload fields | Primary consumers |
|-------|-------------------|-------------------|
| `GamePhaseChanged` | `phase: GamePhase` | HUD, GameManager |
| `ResourceChanged` | `gold, lives` | HUD |
| `WaveStarted` | `waveIndex, totalWaves` | HUD |
| `WaveCompleted` | `waveIndex` | WaveService |
| `GridTapped` | `col, row` | TowerService |
| `InitTower` | `defId, col, row` | TowerController |
| `InitEnemy` | `defId, waveIndex` | EnemyController |
| `InitProjectile` | `targetEnemyId, damage, speed, props` | ProjectileController |
| `TakeDamage` | `enemyId, damage, props` | EnemyController, SlowService, ChainLightningService, PoisonDotService, FloatingTextService |
| `EnemyDied` | `enemyId, reward, worldX, worldZ` | FloatingTextService, ResourceService |
| `EnemyReachedEnd` | `enemyId` | GameManager, CameraShakeService |
| `TowerSelected` | `col, row, defId, tier, choices` | TowerUpgradeMenuHud |
| `TowerDeselected` | — | TowerUpgradeMenuHud |
| `TowerSold` | `col, row, refund` | TowerService |
| `TowerUpgraded` | `col, row, tier, choice` | TowerService |
| `GameOver` | `won: boolean, isBossVictory: boolean` | GameOverScreenHud |
| `ShowRelicChoice` | — | RelicChoiceHud (shows 2 random relic cards) |
| `RelicChosen` | `relicId` | LevelSaveComponent (persists active relics to PlayerVariablesService) |
| `StartGame` | — | GameManager (transitions to BiomeSelect), LevelGeneratorService (generates N random levels), RelicService (resets active relics) |
| `LevelSelected` | `levelIndex, nodeType` | GameManager (starts the game or enters minigame), WaveService, PathService, PathTileService, ResourceService, TowerShopHud, GameHudController |
| `LevelCompleted` | `levelIndex` | OverworldHud (marks level beaten, unlocks next), LevelSaveComponent (persists to PlayerVariablesService) |
| `ProgressRestored` | `beatenLevels` | OverworldHud (restores beaten/open/locked states from saved data) |
| `LevelCompleted` | `levelIndex` | OverworldHud (marks level beaten, unlocks next), LevelSaveComponent (persists to PlayerVariablesService) |
| `ProgressRestored` | `beatenLevels` | OverworldHud (restores beaten/open/locked states from saved data) |
| `LevelCompleted` | `levelIndex` | OverworldHud (marks level beaten, unlocks next) |
| `RunAdvanced` | `runCount` | OverworldHud (fired when all levels are beaten and a new run begins) |
| `BiomeChanged` | `biomeId` | GroundBiomeController (swaps ground material), OrcishFlagController (swaps flag mesh/material), OverworldHud (swaps background image) |
| `MinigameCompleted` | `levelIndex, result` | GameManager (fires LevelCompleted, transitions to Overworld) |
| `RunAdvanced` | `runCount` | Fired by OverworldHud when all levels beaten; signals new overworld generation |
| `RestartGame` | — | GameManager (transitions to Overworld), all services with state |
| `ActivateFloatingText` | `text, worldX, worldZ, colorR, colorG, colorB` | FloatingTextController |

---

## Asset Templates — Structure & Animation Contract

Each gameplay entity has a strict template hierarchy that the controller component depends on. When authoring new towers/enemies, you **must** preserve this hierarchy and assign the listed entity references in the controller's `@property` slots — otherwise animations and rotations silently fail.

### Enemy template (`Templates/Enemies/*.hstf`)

Reference: [Enemy.hstf](../Templates/Enemies/Enemy.hstf) (Orc Chibi). Same structure for `EnemyFast`, `EnemyTank`, `EnemyBoss`.

#### Required hierarchy

```
Enemy (root)                         ← TransformComponent + EnemyController
├── Pivot                            ← @property bodyPivot   (REQUIRED)
│   └── <CharacterMesh>              ← model (e.g. OrcChibi)
└── shadow                           ← @property shadow (flat disc on ground)
```

#### Role of each entity

| Entity | Purpose | Driven by |
|--------|---------|-----------|
| `Enemy` (root) | World position + facing direction. `lookAt(ahead, Vec3.up)` is called every frame on this transform so children rotate to face the travel direction. | `EnemyController.onUpdate()` |
| `Pivot` | The **2.5D tilt** layer. Rotated each frame based on movement direction (`±30°` pitch / `±45°` roll). The character mesh lives under this so it leans toward the camera. | `_updateBodyPivot(dx, dz)` |
| `<CharacterMesh>` | Visual body. Walk animation is baked into the mesh/AnimGraph. Color components are recursively collected from here for hit-flash and tint effects. | `_collectColorComponents()` |
| `shadow` | Flat scaled disc with darkened material (alpha ~0.3). Sits on ground plane. NOT in the color-collection sweep — its color is preserved. | static |

#### Animation parameters (`@property` on controller)

| Property | Default | Effect |
|----------|---------|--------|
| `tiltAngle` | 45 | Currently unused at runtime (legacy — pivot angles are hardcoded in `_updateBodyPivot`). |

#### Animation breakdown — what runs each frame

1. **Path advance** — `_subT += speed * speedFactor * dt`. Position from `PathService.getWorldPositionInSubPath()`.
2. **Facing** — `_transform.lookAt(ahead, Vec3.up)`. Root rotates so local +Z points along movement.
3. **Body pivot tilt** — `bodyPivot.localRotation = Quaternion.fromEuler(angle)` where `angle` depends on the sign of `dx`/`dz` (which screen direction the enemy is moving). See [2.5D section](#scene-setup--25d-camera-tricks).
4. **Squash on hit** — XZ stretches to `1.12`, Y compresses to `0.88` for 0.12s using smoothstep. Applied to the root scale.
5. **Hit flash** — All collected `ColorComponent`s flash red (`HIT_COLOR = (1, 0.1, 0.1)`) for 0.12s, then restore base color or `_persistentTint` (e.g. blue for slow debuff).
6. **Death** — Uniform scale lerp from `_baseScale` to `0` over 0.35s, then `entity.destroy()`. No corpse, no fade.

#### Straight-line boss mode

When an enemy def has `straightLine: true`, the EnemyController bypasses PathService waypoint following and instead moves in a straight line along the -X axis (toward the player's base). Each frame it checks the grid cell it occupies and destroys any tower found there via `TowerService.removeTowerAt()`. The boss remains targetable by towers through the normal EnemyService registry. A 3D cave entrance mesh is placed at the spawn point as a visual origin for the boss. On boss levels (nodeType === 'boss'), the cave material is swapped to a darker reddish-purple variant (`Models/Cave/BossCaveEntrance.material`) for a more menacing look; normal levels use the standard cave material.

#### Authoring rules for new enemies

See `ART_DIRECTION.md → Enemy Mesh Integration` for mesh-side requirements (forward axis, pivot, ColorComponent init).

### Tower template (`Templates/Towers/*.hstf`)

Reference: [CanonTower.hstf](../Templates/Towers/CanonTower.hstf) — **use this as the canonical template when authoring a new tower** (it has the typical setup: shadow + 3 icons + barrel + spawnPoint, and `barrelForwardOffsetDeg = 180` matching the generated-mesh convention). Same structure also in `ArrowTower`, `FrostTower`, `LaserTower`.

#### Required hierarchy

```
Tower (root)                         ← TransformComponent + TowerController
├── Pivot                            ← Visual root; carries tier models + barrel
│   ├── Icon1                        ← @property icon1 (visible at tier 0)
│   ├── Icon2                        ← @property icon2 (visible at tier ≥ 1)
│   ├── Icon3                        ← @property icon3 (visible at tier ≥ 2)
│   └── Barrel                       ← @property barrel
│       └── SpawnPoint               ← @property spawnPoint (projectile origin)
└── shadow                           ← @property shadow (optional, flat disc)
```

> **Note**: the actual hierarchy in `ArrowTower.hstf` puts `Pivot` and tier models as siblings of the root with appropriate parenting via the `relationships` block — the structure shown above is the **logical** hierarchy. What matters is that the entity UUIDs are assigned to the right `@property` slots.

#### Role of each entity

| Entity | Purpose | Driven by |
|--------|---------|-----------|
| `Tower` (root) | Anchor placed at grid cell center, ground Y. Scaled from 0 to 1 during bounce-in. Never rotated. | `TowerController.onUpdate()` (bounce only) |
| `Barrel` | Aimable part. Rotated each frame around **Y axis only** to face the current target. Also receives recoil position offset (15cm kickback in aim direction over 0.06s, return over 0.14s). Rest local position is captured on first fire. | `_updateAim()`, recoil block |
| `SpawnPoint` | Empty transform at the muzzle tip. Used as the spawn position for projectiles. If absent, projectiles spawn at the barrel's world position. | Read by `_fire()` |
| `Icon1/2/3` | Three 3D shield-icon variants displayed above the tower (one per tier). **Mesh visibility is toggled** (`mesh.isVisibleSelf`) based on `_currentTier`. Only one is visible at a time. | `_applyTierModel()` |
| `shadow` | Optional flat shadow disc. Alpha fades in during the second half of the bounce-in animation. Color is captured at start and modulated by alpha. | `_setShadowAlpha()` |

#### Tier system — important authoring detail

- The same template asset is used for all 3 tiers. **Do not create separate hstf files per tier.**
- Tier 0 = freshly placed, tier 1 = after T1 upgrade, tier 2 = after T2, tier 3 = after T3. Only **3 icon slots** exist (`icon1/2/3`) — tier 3 reuses `icon3`. The visible tier is `_currentTier` (which is 0-indexed in code: tier upgrade 1 sets `_currentTier = 1`, showing `icon2`). When designing tier art, think of it as **3 visual stages** (base, mid, max), not 4.
- All three tier meshes should be **co-located** in the template (same transform). Only `isVisibleSelf` toggles; transforms aren't touched.
- The barrel is **shared across tiers** — there's only one `barrel` entity. If a tier needs a different barrel look, it must be a child mesh of the corresponding tier-model entity (and the aim rotation will still come from the shared `barrel` transform). Practical approach: keep the barrel geometry-light and re-skin the body per tier.

#### Animation parameters (`@property` on controller)

| Property | Default | Effect |
|----------|---------|--------|
| `barrelForwardOffsetDeg` | 180 | Degrees added to the computed yaw to compensate for the mesh's authored forward axis. **Default for this project is `180`** because generated meshes are authored with forward = `+Z`, but MHS `lookAt` / aim math expects forward = `-Z` — so most towers (Frost, Laser, Fire Cannon) need `180`. Exceptions: `ArrowTower` uses `0` (barrel art facing `-Z`); `CanonTower` uses `270` (barrel mesh forward is rotated 90° from the standard +Z convention). |

#### Animation breakdown — what runs each frame

1. **Place bounce-in** — Root scale lerps `0 → 1.25 (overshoot) → 1.0` over 0.35s. Shadow alpha fades in during the second half.
2. **Aim** — Compute yaw from barrel world position to target world position: `yawDeg = atan2(dx, -dz) * 180/π + barrelForwardOffsetDeg`. Apply as `barrel.localRotation = fromEuler(0, -yawDeg, 0)`. **Only Y axis** — pitch/roll are baked into the mesh art.
3. **Fire** — When `_cooldown <= 0` and target in range: acquire pooled projectile, position it at `spawnPoint.worldPosition`, send `InitProjectile` event, set `_cooldown = 1 / fireRate`, start recoil.
4. **Recoil** — Barrel kicks back along the negative aim direction by `RECOIL_DISTANCE = 0.15` world units over `RECOIL_KICK_DURATION = 0.06s`, returns over `RECOIL_RETURN_DURATION = 0.14s`. Applied in **world space** so it doesn't compound with the aim yaw.
5. **Tier model swap** — On `TowerUpgraded` event, `_applyTierModel()` toggles `MeshComponent.isVisibleSelf` on the three model entities. No animation on swap (instant).

#### Authoring rules for new towers

- **When creating a new tower, duplicate [CanonTower.hstf](../Templates/Towers/CanonTower.hstf)** and re-skin from there — it carries the standard layout (`shadow`, `icon1/2/3`, `barrel`, `spawnPoint`) and the correct `barrelForwardOffsetDeg = 180` for generated meshes.
- Root entity must have no mesh — it's a pure anchor that gets uniformly scaled on bounce-in.
- **Forward-axis convention:** generated meshes (and most imported art in this project) have forward = `+Z`, while MHS `lookAt` expects forward = `-Z`. The default `barrelForwardOffsetDeg = 180` resolves this. Only override to `0` if the barrel art was specifically authored facing `-Z` (e.g. `ArrowTower`). Don't bake a non-zero `barrel.localRotation` in the template — it will be overwritten each frame.
- The `spawnPoint` should be a child of `barrel` so it follows the aim rotation. Place it at the muzzle tip in barrel-local coordinates.
- Tier models share the same parent and transform. Their `MeshComponent.isVisibleSelf` is the **only** state toggled — don't rely on scale, color, or position differences set in the template (they won't be animated).
- The towers' upward tilt for camera readability (slight forward lean so the top reads) must be **baked into the mesh art**, not the transform. The pivot is reserved for the bounce-in scale animation.
- Optional `shadow` can be omitted (set `@property shadow` to null/empty). If present, it must be a flat disc with a `ColorComponent`; alpha will be multiplied.

### Path tile templates (`Templates/GameplayObjects/PathTile*.hstf`)

The visual path uses **5 templates** (one straight + four pre-rotated corners) driven by a single shared shader `Shaders/PathTile.surface`. Spawn logic is in [PathTileService.ts](../Scripts/Services/PathTileService.ts); the shader is consumed by the materials assigned in the templates.

#### The 5 templates

| Template | Asset path | `isCornerTile` | Material rotation strategy |
|----------|------------|----------------|----------------------------|
| `PathTileStraight` | `@Templates/GameplayObjects/PathTileStraightTop.hstf` | 0 | **Runtime Y-rotation**: 0° for horizontal segments (Left/Right), 90° for vertical (Up/Down). Same template, two orientations. |
| `PathTileCornerTL` | `@Templates/GameplayObjects/PathTileCornerTL.hstf` | 1 | Pre-rotated in the template, **spawned at 0°**. Path enters from Left or Up, exits Down or Right. |
| `PathTileCornerTR` | `@Templates/GameplayObjects/PathTileCornerTR.hstf` | 1 | Pre-rotated, spawned at 0°. Right/Up → Down/Left. |
| `PathTileCornerBR` | `@Templates/GameplayObjects/PathTileCornerBR.hstf` | 1 | Pre-rotated, spawned at 0°. Right/Down → Up/Left. |
| `PathTileCornerBL` | `@Templates/GameplayObjects/PathTileCornerBL.hstf` | 1 | Pre-rotated, spawned at 0°. Left/Down → Up/Right. |

**Why this split (4 corners pre-baked, 1 straight rotated at runtime)?**
The corners are pre-rotated in the template so that the **mesh UVs** of the path tile inherit a consistent orientation in the editor — easier to author the corner geometry once (TL shape) and just duplicate-and-rotate the prefab. The straight tile is symmetric enough that one template handles both orientations with a runtime 90° Y-rotation.

#### Selection logic

For each cell along the path waypoints, [PathTileService.prewarm()](../Scripts/Services/PathTileService.ts) decides:

- If `inDir === outDir` (or one is null) → it's a **straight**: pick `PathTileStraight`, rotate Y by 0° (horizontal) or 90° (vertical).
- If `inDir !== outDir` → it's a **corner**: pick one of the 4 pre-rotated corner templates based on the `(fromDir, toDir)` pair. No runtime rotation.

All tiles spawn at `(GRID_ORIGIN_X + row, GROUND_Y + 0.01, GRID_ORIGIN_Z + col)` with `NetworkMode.LocalOnly`.

#### The shader: `Shaders/PathTile.surface`

One shader, two roles (selected by `isCornerTile`):

- **Straight (`isCornerTile = 0`)**: clips to a vertical band of half-width `pathHalfWidth` in local UV space.
- **Corner (`isCornerTile = 1`)**: clips to a quarter-annulus centered on the local **top-left** UV corner. Inner and outer radii are derived from `pathHalfWidth` so the annulus crosses each outgoing edge exactly at `±pathHalfWidth` from the edge midpoint — kissing the adjacent straight tile perfectly. The template's baked mesh rotation places that corner on the correct side of the tile (TL/TR/BR/BL).

The path **texture is sampled in world space** (`worldPos.xz / tileWorldSize × textureScale`), NOT in local UV. This is critical: it means the cobblestone pattern flows continuously from tile to tile, regardless of each tile's mesh rotation. Two adjacent tiles share `worldPos.xz` on their common edge → no visible tile boundary.

Outside the path shape, `s.alpha = 0` (fully transparent). The ground/background plane shows through. A `smoothstep` of width `edgeSoftness` anti-aliases the border.

#### Material parameters

Each path-tile template references a material based on `PathTile.surface`. Two material instances exist (or one with per-prefab overrides):

| Param | Type | Straight value | Corner value | Effect |
|-------|------|----------------|--------------|--------|
| `isCornerTile` | float (0/1) | `0` | `1` | Selects band vs. quarter-annulus clip in the shader. |
| `pathHalfWidth` | float [0.05, 0.5] | `0.4` | `0.4` | Half-width of the path in local UV units (tile = 1×1 UV). **Must match between straight and corner** for clean junctions. The corner's inner/outer radii are derived from this value automatically. |
| `edgeSoftness` | float [0.0, 0.05] | `0.01` | `0.01` | Anti-alias softness in UV units. |
| `pathTex` | Texture2D | `path_tiles_cobblestone.png` | same | Shared world-space texture. **Set Premultiply Alpha = true** in the `.assetmeta` to avoid edge fringing. |
| `textureWorldSize` | float | `0.5` | `0.5` | How many world meters one full texture repeat covers. `0.5` = one texture per tile (= `CELL_SIZE`); `1.0` = repeat every two tiles (motif 2× larger); `0.25` = repeat 2× per tile (motif 2× smaller). |
| `tint` | Color | `(1,1,1,1)` | `(1,1,1,1)` | Multiplicative tint on top of the texture. |

**Invariant for clean junctions**: `pathHalfWidth` is identical between straight and corner. The corner's inner/outer radii are derived as `sqrt((0.5 ∓ pathHalfWidth)² + 1)` from the corner center, which guarantees the annulus crosses each outgoing edge exactly at the straight's band boundaries — the corner always kisses the straight, regardless of the chosen `pathHalfWidth`.

#### World map texture (the cobblestone source)

`Textures/path_tiles_cobblestone.png` is a **single tileable texture** (not an atlas). With `linearWrapSampler`, it repeats seamlessly when sampled in world space. The shader never indexes a "corner cell" or "straight cell" inside this texture — the **shape** comes from the analytical clip, the **pattern** comes from the wrap-sampled texture.

This is a deliberate change from the older atlas approach (corner-cell + straight-cell extracted from a 3×3 source image): with analytical shapes, the texture only needs to be **a coherent cobblestone surface**, not a pre-arranged path layout. Any tileable stone/wood/dirt texture can be dropped in without re-authoring corner alignment.

#### Authoring rules for new path-tile themes

- Generate or pick a **tileable** texture (cobblestone, wood plank, dirt, etc.). It must wrap cleanly in both U and V — not a 3×3 path layout.
- Set `premultiplyAlpha: true` in the texture's `.assetmeta`.
- Create a material based on `PathTile.surface`, assign the texture to `pathTex`, leave `tileWorldSize = 0.5`.
- For new straight/corner pairs, keep `pathHalfWidth` consistent and `cornerRadius = 0.5` unless you specifically want a wider/tighter turn radius (in which case all 4 corners must match).
- Do NOT bake the path width into the texture itself — the shader handles the clip. The texture should be a uniform surface pattern.

### Quick reference: which entities are runtime-rotated

| Template part | Runtime rotation? | Notes |
|---------------|-------------------|-------|
| Enemy root | Yes — `lookAt` toward path | Don't bake rotation here |
| Enemy `Pivot` | Yes — `±30°` pitch / `±45°` roll based on dx/dz | Baked rotation only previews; runtime overwrites |
| Enemy character mesh | No — fixed in template | Set so it faces local +Z |
| Enemy arms/legs | Yes — `sin` swing on local Z (or Y translate for legs) | Set idle pose in template; animation adds on top |
| Enemy shadow | No | Stays flat |
| Tower root | No (only scale animated) | |
| Tower `Pivot` (visual root) | No | Static |
| Tower tier models | No | Only `isVisibleSelf` toggles |
| Tower `barrel` | Yes — Y-axis yaw only | Forward must be local +Z, or use `barrelForwardOffsetDeg` |
| Tower `spawnPoint` | Inherited from barrel | Position only matters |
| Tower shadow | No (alpha only) | |
| Path tile (straight) | Yes — Y 0° or 90° at spawn based on segment direction | Single template, two orientations |
| Path tile (corner) | No — pre-rotated in each of the 4 corner templates | Selected by `(fromDir, toDir)` |
