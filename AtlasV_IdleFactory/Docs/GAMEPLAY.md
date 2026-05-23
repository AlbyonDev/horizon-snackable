# Gameplay — Idle Factory Tycoon

---

## Core Loop

```
[Title Screen] → Play button pressed
    ↓
[FTUE] — only Production 0 upgrade visible; pulse animation draws attention
    ↓
Player buys "Deploy Crane" ($0) → production0 unlocks → all upgrades revealed
    ↓
Production modules deposit boxes on belt → belt carries boxes to warehouse
    → warehouse holds boxes (0.5s settle) → trucks load boxes → trucks deliver → +$20/box
    ↓
Player spends earnings on upgrades (belt speed / warehouse capacity / trucks / production speed)
    ↓
Loop continues indefinitely — no win/loss condition
```

---

## Game Flow (State Machine)

| State | Entered when | Key behavior |
|-------|-------------|--------------|
| **TitleScreen** | Scene starts | UpgradePanel + PlayerStatsBar hidden; title visible |
| **Playing** | Play button pressed | Title hidden; game UI shown; production/belt/trucks running |

The `TitleScreenComponent` manages the transition. There is no Game Over state.

**FTUE sub-state (within Playing):**
- Active until `EconomyService.getUpgradeLevel('production0') >= 1`
- While active: only `production0` button shown; pulse animation fires every 2 s via `UpgradePanelComponent`
- On completion: all upgrade buttons revealed; `_ftueActive = false`

---

## Scene & UI Overview

### Layer Split

**Screen-Space UI** (XAML + ViewModel, no world position):

| XAML file | Role | ViewModel |
|-----------|------|-----------|
| `UI/TitleScreen.xaml` | Fullscreen title screen with Play button | `TitleScreenViewModel` |
| `UI/PlayerStatsBar.xaml` | Top banner: time / packages / gold | `PlayerStatsBarViewModel` |
| `UI/UpgradePanel.xaml` | Bottom panel: upgrade buttons | `UpgradePanelViewModel` |

**World-Space UI:**

| XAML file | Role | Position |
|-----------|------|----------|
| `UI/WarehouseGauge.xaml` | Stock/capacity fill bar above warehouse | Y=0.7, X-rotated 90° |

**Spawned Runtime Entities:**

| Pool | Size | Template | Purpose |
|------|------|----------|---------|
| Product pool | `CONVEYOR_SLOT_COUNT + MAX_STORAGE` = 32 | `Assets.Product` | Reused for belt and warehouse visuals |
| Layout | 1 | `Assets.Layout` | Spawns the full scene geometry on start |

**Scene-Placed Entities** (authored in `space.hstf`):

| Zone | Position | Components |
|------|----------|-----------|
| Truck Road | Z=−3.5, full width | Visual only (3D primitives) |
| Warehouse | (0, 0.1, −2.25) | `WarehouseController`, `WarehouseGauge` XAML entity |
| Conveyor Belt | X=−1.75, Z −1.25 to 3.75 | `ConveyorBeltController` |
| Production 1 | (0.48, −0.10, −0.256) | `ProductionModuleController` (blue) |
| Production 2 | (0.48, −0.10, 1.244) | `ProductionModuleController` (green) |
| Production 3 | (0.48, −0.10, 2.744) | `ProductionModuleController` (red) |

### Game Camera

| Property | Value |
|----------|-------|
| Source | Scene entity carrying a `CameraComponent`; activated via `CameraService.get().setActiveCamera()` in `IdleFactoryCameraComponent` |
| World position | Approx. (0, 8, 0) — set in scene editor on the camera entity, not in code |
| Look direction | Straight down (−Y) |
| Camera "up" | −Z (points toward the top of the screen) |
| Field of view | 60° — set on the `CameraComponent` in the scene editor |
| Init delay | 1.5 s (`setTimeout`); camera is also re-applied on `OnPlayerCreateEvent` |

**Axis mapping on screen** (top-down, portrait):

| World axis | On screen |
|-----------|-----------|
| +X | right |
| −X | left |
| −Z | up (toward trucks, top of screen) |
| +Z | down (toward production modules, bottom of screen) |
| Y | depth — invisible from top-down; higher Y = closer to camera |

Meshes with a "front face" should orient that face toward −Y to be visible from above.

### Screen Layout Zones

The table below maps world Z positions to visible screen areas, cross-referenced against the screenshot. Two permanent UI overlays constrain the usable game area:
- **Top**: Horizon system UI (avatar, emote buttons) covers approximately Z < −4.5
- **Bottom**: Stats bar (PlayerStatsBar) covers approximately Z > 3.5

| Zone | World Z | Notes |
|------|---------|-------|
| Above viewport (off-screen) | Z < −5 | Not visible |
| Horizon system overlay | Z −5 to −4.5 | Covered by platform UI — avoid placing game content here |
| Truck road | Z ≈ −3.5 | Topmost game content; trucks travel at full X width |
| Warehouse area | Z −2.5 to −0.5 | Storage platforms, warehouse gauge |
| Conveyor + production zone | Z −1.25 to +3.75 | Belt runs this full range; production modules at −0.256 / 1.244 / 2.744 |
| **Hard bottom boundary** | **Z ≈ 3.5** | **Production 3 body ends here; stats bar begins immediately below** |
| Stats bar overlay | Z > 3.5 | Covered by PlayerStatsBar screen-space UI — content invisible |

**X bounds:** trucks go off-screen at X = ±3.5; visible X range is approximately −4 to +4.

**Implication for new content:** any scene entity placed below Z = 3.5 will be hidden behind the stats bar. The conveyor belt already ends at Z = 3.75.

---

## System: Conveyor Belt

**Owner:** `ConveyorService.ts` / `ConveyorBeltController.ts`

Products are floating-point distances in a sorted array. Distance decreases from `CONVEYOR_BELT_LENGTH` (production end, 15 units) toward 0 (warehouse end). Each frame: `distance -= dt * speed`.

**Delivery:** When `distance <= 0`, the product enters a `delivering` state for 0.3 s (`SHRINK_DURATION`) — during which `ConveyorBeltController` can play a shrink animation — then the entry is removed and `Events.ProductDelivered` fires.

**Gap enforcement:** `tryDeposit(distance)` rejects any placement where another product is within `CONVEYOR_MIN_GAP = 1.4` units. If the gap is blocked, `ProductionService` marks the module `blocked` and retries each frame.

**Belt pause:** Fires no event while advancing. `ConveyorService` subscribes to `WarehouseFull` to set `_paused = true`; resumes on `WarehouseAvailable`. Shrink animations continue while paused.

| Constant | Value |
|----------|-------|
| `CONVEYOR_BELT_LENGTH` | 15 units |
| `CONVEYOR_BASE_SPEED` | 1.0 units/s |
| `CONVEYOR_MIN_GAP` | 1.4 units |
| `CONVEYOR_SLOT_COUNT` | 8 (pool sizing / slot markers) |

---

## System: Warehouse

**Owner:** `WarehouseService.ts` / `WarehouseController.ts`

A buffer array of settle timers. When `Events.ProductDelivered` fires, the service pushes `SETTLE_TIME = 0.5` s onto `_products[]`. Each frame, all timers count down. A product is available for pickup when its timer ≤ 0.

`TruckService` calls `removeProducts(count)` directly (synchronous, injected dependency). This returns the actual number removed and fires `Events.WarehouseProductRemoved`.

Full/available transitions fire `Events.WarehouseFull` / `Events.WarehouseAvailable` on state change, not on every update.

8 physical platform slots are laid out in a 2×4 grid in `WarehouseController`. Each platform stacks up to 3 product entities vertically. Platforms outside the current capacity are animated off-screen on upgrade.

| Constant | Value |
|----------|-------|
| `WAREHOUSE_BASE_CAPACITY` | 3 items |
| `MAX_STORAGE` | 24 (3 × 8 slots — pool sizing) |
| `SETTLE_TIME` | 0.5 s (defined in `WarehouseService.ts`) |

---

## System: Trucks

**Owner:** `TruckService.ts` / `TruckController.ts`

Each truck is an `ITruckMutable` state machine with 5 phases:

| Phase | Behavior |
|-------|---------|
| `Staged` | Off-screen, in `_stagedQueue` waiting to approach |
| `Approaching` | Traveling from off-screen left to dock; duration = `|TRUCK_LOADING_X − TRUCK_OFFSCREEN_LEFT_X| / TRUCK_SPEED` |
| `AtDock` | Waiting for available stock; loads 1 product and transitions to Loading |
| `Loading` | 0.3 s pause per product; loads up to `TRUCK_CAPACITY = 3`; departs when full or no more stock |
| `Away` | Traveling right to exit (fires `TruckDelivered` at threshold), then across to left staging |

`Events.TruckDelivered` carries `productCount` and `revenue = productCount × MONEY_PER_PRODUCT`. `EconomyService` subscribes to add money.

| Constant | Value |
|----------|-------|
| `TRUCK_CAPACITY` | 3 products |
| `TRUCK_BASE_COUNT` | 1 |
| `TRUCK_SPEED` | 1.6 units/s |
| `TRUCK_LOADING_DURATION` | 0.3 s per product |
| `MONEY_PER_PRODUCT` | $20 |

---

## System: Production

**Owner:** `ProductionService.ts` / `ProductionModuleController.ts`

`PRODUCTION_MODULE_DEFS` drives the number of modules and their deposit distances. Each module has an `IModuleState` with `interval` (starts at `Infinity` = locked) and a `timer`.

Every frame: if unlocked and not blocked, `timer += dt`. When `timer >= interval`, calls `ConveyorService.tryDeposit(depositDistance)`. On success: `timer = 0`. On failure (no gap): `blocked = true` — retries via `tryDeposit` each frame until a gap appears.

`ProductionModuleController` reads the module state snapshot to drive crane animations (pick-up arc → deposit).

| Deposit distance | Module |
|-----------------|--------|
| 3.75 units | Production 0 |
| 7.5 units | Production 1 |
| 11.25 units | Production 2 |

---

## System: Upgrades

**Owner:** `UpgradeRegistryService.ts` / `EconomyService.ts` / `UpgradePanelComponent.ts`

**Registry flow:**
1. Each service registers its own upgrade entry via `UpgradeRegistryService.registerDef(def, currentLevel)` in `onReady()` and after each upgrade.
2. `UpgradePanelComponent` reads all entries from the registry and builds the XAML button list.
3. Player clicks button → `UpgradeRegistryService.tryPurchase(id)` → calls `EconomyService.tryUpgrade(id, cost)` → deducts money → fires `Events.UpgradePurchased`.
4. The owning service subscribes to `UpgradePurchased`, applies the effect, then re-registers the updated entry (or removes it if maxLevel reached).
5. `Events.UpgradeRegistryChanged` fires → `UpgradePanelComponent` refreshes the list.

**FTUE:** While `production0` is at level 0, `UpgradePanelComponent` skips all entries except `production0`.

**Button positions** (XAML canvas coordinates, defined in `UpgradePanelComponent.ts`):

| Upgrade | X | Y |
|---------|---|---|
| conveyor | 25 | 1400 |
| warehouse | 700 | 300 |
| trucks | 700 | 40 |
| production0 | 700 | 700 |
| production1 | 700 | 1000 |
| production2 | 700 | 1300 |

---

## Extension Axes

### Add a New Production Module

1. Add an entry to `PRODUCTION_MODULE_DEFS` in `Defs/ProductionDefs.ts` with a `depositDistance` value within `[0, CONVEYOR_BELT_LENGTH]`.
2. Add a matching `IUpgradeDef` to `Defs/UpgradeDefs.ts` with id `production3` (next index) and costs/intervals arrays.
3. Add the new id to `UPGRADE_DEFS` export array.
4. Register the new upgrade level in `EconomyService.onReady()` (`this._upgradeLevels.set('production3', 0)`).
5. Add a button position entry in `UpgradePanelComponent.BUTTON_POSITION` and a style entry in `BUTTON_STYLE`.
6. Place the corresponding production module entity in the scene (`space.hstf`) at the matching world position and attach `ProductionModuleController`.

### Add a New Upgrade Tier to an Existing Module

1. Append a new speed/capacity/count value to the relevant array in `Defs/UpgradeDefs.ts` (e.g. add `4.0` to `CONVEYOR_SPEEDS`).
2. Append a matching cost to the costs array.
3. The `maxLevel` is computed as `array.length - 1` — no other changes needed.

### Change Economy Balance

All tunable values are in `Constants.ts`:
- `STARTING_MONEY` — starting gold
- `MONEY_PER_PRODUCT` — revenue per product delivered
- `TRUCK_CAPACITY` — products per truck trip

Upgrade costs are in `Defs/UpgradeDefs.ts` cost arrays.

---

## Known Issues

| Severity | File | Description |
|----------|------|-------------|
| — | — | No confirmed bugs at time of writing |
