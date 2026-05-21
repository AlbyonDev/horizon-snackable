# H5 Tower Defense — Project Summary

## Concept

Single-player mobile tower defense, portrait orientation, for Meta Horizon Worlds.
The player places towers on a **7×14 world-unit grid** during build phases to stop waves of enemies from reaching the end of a snake path.
Core tension: strategic placement (choke points, range overlap) vs. economy management (gold per kill, upgrade vs. new tower decisions).

---

## Platform & Stack

| Item | Value |
|------|-------|
| Platform | Meta Horizon Studio (MHS) |
| Language | TypeScript ES2022 |
| Target | Mobile portrait, local single-player |
| Grid | 7 cols × 14 rows × 1 cell = **7×14 world units**, centered on origin |
| Play area | Grid ~70% screen height; HUD top ~10%, Shop bottom ~20% |
| Ground | Tiled cartoon grass texture (Unlit material, UV scale 6×4) on 11×8 plane; dark border plane behind |

---

## Scene Setup & 2.5D Camera Tricks

The game is a top-down 2D play field rendered with a 3D camera. Everything below is load-bearing for the look — change at your own risk.

### Camera (Fixed mode, top-down with portrait yaw)

| Property | Value | Why |
|----------|-------|-----|
| Position | `(1, 15.5, 0)` | 15.5 units above the play field on Y. Slight +1 X offset re-centers the visible play area under the portrait HUD (top HUD eats screen real estate, so the camera is nudged forward along the row axis). |
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
| `HitService` | `IHitContext → IHitContext` | `SplashSystem` (AoE target expansion), `CritService` (crit damage × multiplier) |

Adding a new mechanic (chain, pierce, burn…) = one new `@service()` that calls `HitService.get().register(modifier)` in `onReady()`, then one import line in `GameManager`.

---

## File Structure

```
Scripts/
  Types.ts          — Enums, interfaces, pipeline contexts, all LocalEvents
  Constants.ts      — Grid dims, timing, economy values, crit multiplier
  Assets.ts         — ALL TemplateAsset declarations (single source of truth)

  Defs/
    TowerDefs.ts    — TOWER_DEFS: ITowerDef[] (4 towers + upgrade trees)
    EnemyDefs.ts    — ENEMY_DEFS: IEnemyDef[] (4 enemy types)
    LevelDefs.ts    — LEVEL_DEFS: ILevelDef[] (20 waves, 1 level, includes path waypoints)
    PathDefs.ts     — (waypoints now embedded in LevelDefs per ILevelDef)
    UpgradeDefs.ts  — Upg atoms catalog + tree() builder

  Services/
    PathService         — waypoint path, cellToWorld(), isPathCell()
    PathTileService     — spawns path tiles using 5 templates (4 pre-rotated corners + 1 straight with runtime Y-rotation) and 2 shared UV-sliced materials
    TowerService        — selectedId, place on GridTapped, upgrade, sell
    EnemyService        — live enemy registry (worldX, worldZ, pathT, hp, speedFactor)
    ResourceService     — gold, lives, earn(), spend(), loseLife(), reset()
    TargetingService    — getBestTarget(), getEnemiesInRadius()
    WaveService         — state machine: Build → Wave → WaveClear → loop
    PlacementService    — drag-to-place input handler + preview + range indicator
    HitService          — hit target expansion pipeline
    SplashSystem        — registers AoE modifier into HitService
    SlowService         — subscribes to TakeDamage, applies slowFactor to enemies
    CritService         — registers crit modifier into HitService (arrow/cannon only)
    ProjectilePool      — pre-spawned projectile pool (30 entities)
    HealthBarService    — pre-spawned health bar pool (30 entities)
    FloatingTextService — pools floating text entities; shows gold on death, crit multiplier on hit
    CameraShakeService  — shakes camera when an enemy reaches the end (life lost feedback)
    VfxService          — hit flash, impact/death particles, pooled particle physics
    CoinService         — pre-spawned coin pool (75 entities), physics loot coins on kill

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
    GameOverScreenHud    — ViewModel for end screen + stats
    TitleScreenHud       — ViewModel for pre-game title screen + Play button
    CoinController       — physics-simulated coin loot with bounce, gravity, and collect animation
    WaveBannerHud        — ViewModel for wave announcement banner (WAVE X, animated)
```

---

## Towers

| ID | Name | Cost | Damage | Range | Fire Rate | Splash | Notes |
|----|------|------|--------|-------|-----------|--------|-------|
| `arrow` | Arrow | 50g | 12 | 2.70 | 1.5/s | — | Crit ×2 @ 20% baseline (arrow-only baseline) |
| `cannon` | Cannon | 100g | 40 | 2.10 | 0.6/s | r=0.75 | Arc projectile |
| `frost` | Frost | 80g | 5 | 2.28 | 1.0/s | — | Slow 50% / 1.5s |
| `laser` | Laser | 200g | 8 | 3.60 | 5.0/s | — | Highest base DPS |

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
| `basic` | Zombie Brute | 60 | 1.25/s | 5g | — |
| `fast` | Fast | 35 | 2.50/s | 8g | `dodgeChance: 0.15` |
| `tank` | Tank | 220 | 0.75/s | 15g | `regenPerSec: 8` |
| `boss` | Boss | 600 | 0.60/s | 50g | `slowImmune: true` |

HP scales +15% per wave: `hp × (1 + waveIndex × HP_SCALE_PER_WAVE)` where `HP_SCALE_PER_WAVE = 0.15`. Last wave (W20, `waveIndex = 19`): ~3.85× base HP.

---

## Economy

| Parameter | Value |
|-----------|-------|
| Start gold | 120g (`START_GOLD`) |
| Start lives | 10 (`START_LIVES`) |
| Wave bonus | +15g flat (`WAVE_BONUS_GOLD`) + 15% of gold on hand (`INCOME_RATE`) at wave end |
| Sell refund | 60% of total invested (`SELL_RATIO = 0.6`) |

---

## Game Phases

```
Title Screen → Build (5s) → Wave → WaveClear (0.5s) → Build → … → Victory
                                                                      ↓
                                                                   GameOver (lives = 0)
```

---

## UI Panels

| Panel | File | Phase | Status |
|-------|------|-------|--------|
| **Title Screen** | `UI/TitleScreen.xaml` | Pre-game | ✅ — Full-screen dark overlay with logo and "JOUER" button. Fires StartGame on tap. |
| **HUD** | `UI/GameHud.xaml` | Always | ✅ |
| **Tower Shop** | `UI/TowerShop.xaml` | Build + Wave | ✅ |
| **Tower Upgrade Menu** | `UI/TowerUpgradeMenu.xaml` | Tower selected | ✅ — 4-column layout: [Info Panel] [Upgrade1] [Upgrade2] [Sell]. Info panel shows tower name + upgrade history (up to 3 lines). Upgrade buttons hidden when tower is at max tier (3). |
| **Game Over / Victory** | `UI/GameOverScreen.xaml` | End | ✅ |
| **Wave Banner** | UI/WaveBanner.xaml | Wave start | ✅ |

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
| `TakeDamage` | `enemyId, damage, props` | EnemyController, SlowService, FloatingTextService |
| `EnemyDied` | `enemyId, reward, worldX, worldZ` | FloatingTextService, ResourceService |
| `EnemyReachedEnd` | `enemyId` | GameManager, CameraShakeService |
| `TowerSelected` | `col, row, defId, tier, choices` | TowerUpgradeMenuHud |
| `TowerDeselected` | — | TowerUpgradeMenuHud |
| `TowerSold` | `col, row, refund` | TowerService |
| `TowerUpgraded` | `col, row, tier, choice` | TowerService |
| `GameOver` | `won: boolean` | GameOverScreenHud |
| `StartGame` | — | GameManager (starts the game from title screen) |
| `RestartGame` | — | GameManager, all services with state |
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
│       ├── <body>                   ← (any non-leg/non-arm parts)
│       ├── LeftArm                  ← @property leftArm
│       ├── RightArm                 ← @property rightArm
│       ├── LeftLeg                  ← @property leftLeg
│       └── RightLeg                 ← @property rightLeg
└── shadow                           ← @property shadow (flat disc on ground)
```

#### Role of each entity

| Entity | Purpose | Driven by |
|--------|---------|-----------|
| `Enemy` (root) | World position + facing direction. `lookAt(ahead, Vec3.up)` is called every frame on this transform so children rotate to face the travel direction. | `EnemyController.onUpdate()` |
| `Pivot` | The **2.5D tilt** layer. Rotated each frame based on movement direction (`±30°` pitch / `±45°` roll). The character mesh lives under this so it leans toward the camera. | `_updateBodyPivot(dx, dz)` |
| `<CharacterMesh>` | Visual body. Can be a multi-mesh prefab. Color components are recursively collected from here for hit-flash and tint effects. | `_collectColorComponents()` |
| `LeftArm` / `RightArm` | Animated by local Z rotation (`sin` swing, opposite phases). Rest pose is **captured at start** — bake any character-specific arm pose into the template. | `_animateLimbs()` |
| `LeftLeg` / `RightLeg` | Same swing as arms, OR Y-translation bob if `walkByTranslation = true` (see Boss). Rest pose captured at start. | `_animateLimbs()` |
| `shadow` | Flat scaled disc with darkened material (alpha ~0.3). Sits on ground plane. NOT in the color-collection sweep — its color is preserved. | static |

#### Animation parameters (`@property` on controller)

| Property | Default | Effect |
|----------|---------|--------|
| `tiltAngle` | 45 | Currently unused at runtime (legacy — pivot angles are hardcoded in `_updateBodyPivot`). |
| `limbSwingDeg` | 30 | Peak swing amplitude in degrees (`sin` amplitude). |
| `limbSwingSpeed` | 6 | Animation speed multiplier. `_animTime += currentSpeed * dt * limbSwingSpeed` — so faster enemies animate faster. |
| `walkByTranslation` | `false` | If `true`, legs bob on Y (sine on local position) instead of rotating. Use for chunky/short-legged characters where rotation looks weird (e.g. Boss). |
| `walkTranslateY` | 0.15 | Y amplitude when `walkByTranslation` is on. |

#### Animation breakdown — what runs each frame

1. **Path advance** — `_subT += speed * speedFactor * dt`. Position from `PathService.getWorldPositionInSubPath()`.
2. **Facing** — `_transform.lookAt(ahead, Vec3.up)`. Root rotates so local +Z points along movement.
3. **Body pivot tilt** — `bodyPivot.localRotation = Quaternion.fromEuler(angle)` where `angle` depends on the sign of `dx`/`dz` (which screen direction the enemy is moving). See [2.5D section](#scene-setup--25d-camera-tricks).
4. **Limb swing** — `_animateLimbs(dt, currentSpeed)`. Arms always rotate. Legs rotate OR translate based on `walkByTranslation`. Rotations are **multiplied onto rest poses** so the rigged angles in the template are preserved.
5. **Squash on hit** — XZ stretches to `1.12`, Y compresses to `0.88` for 0.12s using smoothstep. Applied to the root scale.
6. **Hit flash** — All collected `ColorComponent`s flash red (`HIT_COLOR = (1, 0.1, 0.1)`) for 0.12s, then restore base color or `_persistentTint` (e.g. blue for slow debuff).
7. **Death** — Uniform scale lerp from `_baseScale` to `0` over 0.35s, then `entity.destroy()`. No corpse, no fade.

#### Authoring rules for new enemies

See `ART_DIRECTION.md → Enemy Mesh Integration` for mesh-side requirements (forward axis, pivot, ColorComponent init).

### Tower template (`Templates/Towers/*.hstf`)

Reference: [ArrowTower.hstf](../Templates/Towers/ArrowTower.hstf). Same structure for `CanonTower`, `FrostTower`, `LaserTower`.

#### Required hierarchy

```
Tower (root)                         ← TransformComponent + TowerController
├── Pivot                            ← Visual root; carries tier models + barrel
│   ├── ModelTier1                   ← @property modelTier1 (visible at tier 0)
│   ├── ModelTier2                   ← @property modelTier2 (visible at tier ≥ 1)
│   ├── ModelTier3                   ← @property modelTier3 (visible at tier ≥ 2)
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
| `ModelTier1/2/3` | Three full visual variants for the tower. **Mesh visibility is toggled** (`mesh.isVisibleSelf`) based on `_currentTier`. Only one is visible at a time. | `_applyTierModel()` |
| `shadow` | Optional flat shadow disc. Alpha fades in during the second half of the bounce-in animation. Color is captured at start and modulated by alpha. | `_setShadowAlpha()` |

#### Tier system — important authoring detail

- The same template asset is used for all 3 tiers. **Do not create separate hstf files per tier.**
- Tier 0 = freshly placed, tier 1 = after T1 upgrade, tier 2 = after T2, tier 3 = after T3. Only **3 model slots** exist (`modelTier1/2/3`) — tier 3 reuses `modelTier3`. The visible tier is `_currentTier` (which is 0-indexed in code: tier upgrade 1 sets `_currentTier = 1`, showing `modelTier2`). When designing tier art, think of it as **3 visual stages** (base, mid, max), not 4.
- All three tier meshes should be **co-located** in the template (same transform). Only `isVisibleSelf` toggles; transforms aren't touched.
- The barrel is **shared across tiers** — there's only one `barrel` entity. If a tier needs a different barrel look, it must be a child mesh of the corresponding tier-model entity (and the aim rotation will still come from the shared `barrel` transform). Practical approach: keep the barrel geometry-light and re-skin the body per tier.

#### Animation parameters (`@property` on controller)

| Property | Default | Effect |
|----------|---------|--------|
| `barrelForwardOffsetDeg` | 180 | Degrees added to the computed yaw. Use this to compensate for barrels whose mesh forward isn't `+Z`. Convention: arrow barrel = `0`, most others = `180` (forward is `-Z`). |

#### Animation breakdown — what runs each frame

1. **Place bounce-in** — Root scale lerps `0 → 1.25 (overshoot) → 1.0` over 0.35s. Shadow alpha fades in during the second half.
2. **Aim** — Compute yaw from barrel world position to target world position: `yawDeg = atan2(dx, -dz) * 180/π + barrelForwardOffsetDeg`. Apply as `barrel.localRotation = fromEuler(0, -yawDeg, 0)`. **Only Y axis** — pitch/roll are baked into the mesh art.
3. **Fire** — When `_cooldown <= 0` and target in range: acquire pooled projectile, position it at `spawnPoint.worldPosition`, send `InitProjectile` event, set `_cooldown = 1 / fireRate`, start recoil.
4. **Recoil** — Barrel kicks back along the negative aim direction by `RECOIL_DISTANCE = 0.15` world units over `RECOIL_KICK_DURATION = 0.06s`, returns over `RECOIL_RETURN_DURATION = 0.14s`. Applied in **world space** so it doesn't compound with the aim yaw.
5. **Tier model swap** — On `TowerUpgraded` event, `_applyTierModel()` toggles `MeshComponent.isVisibleSelf` on the three model entities. No animation on swap (instant).

#### Authoring rules for new towers

- Root entity must have no mesh — it's a pure anchor that gets uniformly scaled on bounce-in.
- The barrel mesh's local forward should be `+Z` (matches RUB convention). If using imported art that points elsewhere, set `barrelForwardOffsetDeg` instead of fighting the formula. Don't bake a non-zero `barrel.localRotation` in the template — it will be overwritten each frame.
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
