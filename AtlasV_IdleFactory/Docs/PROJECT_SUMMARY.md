# Project Summary — Idle Factory Tycoon

**Genre:** Idle / Tycoon
**Platform:** Meta Horizon Worlds SDK — Mobile Portrait 9×16
**Art Style:** 3D low-poly industrial, colorful — assembled from box, cylinder, prism, and plane primitives; no imported meshes
**Engine:** Meta Horizon Worlds SDK — TypeScript ES2022, client-side only
**Companion docs:** `GAMEPLAY.md` — full mechanical reference; `ART_DIRECTION.md` — visual style, palette, layers.

---

## Game Overview

The player runs a mini-factory by upgrading a production chain: three production modules deposit boxes onto a conveyor belt, which delivers them to a warehouse, which trucks haul away for money. Strategy revolves around identifying and resolving bottlenecks by choosing upgrade order — no explicit win condition; the session ends when the player stops.

---

## Technical Architecture

```
Scripts/
  Types.ts               ← Interfaces (IUpgradeDef, IUpgradeEntry) + all LocalEvents
  Constants.ts           ← All tuning values: belt, warehouse, trucks, production, economy
  Assets.ts              ← TemplateAsset refs (Product, Layout)

  Defs/
    ProductionDefs.ts    ← PRODUCTION_MODULE_DEFS: deposit distances per module
    UpgradeDefs.ts       ← UPGRADE_DEFS: getCost/getEffect tables for all 6 upgradeable modules

  Services/
    EconomyService.ts         ← Money balance; per-module upgrade levels; tryUpgrade() fires UpgradePurchased
    WarehouseService.ts       ← Stock buffer; 0.5s settle timers; capacity upgrades; WarehouseFull/Available events
    ConveyorService.ts        ← Float-position belt; tryDeposit(); pause/resume; speed upgrades
    TruckService.ts           ← 5-phase fleet state machine (Staged/Approaching/AtDock/Loading/Away)
    ProductionService.ts      ← Per-module interval timers; locked/unlocked state; interval upgrades
    ProductPoolService.ts     ← Shared entity pool of reusable Product entities
    UpgradeRegistryService.ts ← Broker: services register/remove upgrade entries; tryPurchase() calls EconomyService

  Components/
    GameManager.ts                ← Scene bootstrap: instantiates all services, spawns Layout + Product pool
    IdleFactoryCameraComponent.ts ← Fixed top-down camera (60° FOV), 1.5s init delay
    ConveyorBeltController.ts     ← Renderer: syncs product entity positions with ConveyorService state
    TruckController.ts            ← Truck entity movement, lane switching, cargo load/unload animation
    WarehouseController.ts        ← Platform management: stacking, add/remove animations, capacity change
    ProductionModuleController.ts ← Crane + cargo animation synced to ProductionService module timers
    UpgradePanelComponent.ts      ← Reads registry, builds XAML button list, handles click→purchase; FTUE gating
    PlayerStatsBarComponent.ts    ← Tracks elapsed time, package count, gold; updates XAML each frame
    TitleScreenComponent.ts       ← Shows/hides title screen; fires play event on button press

  UI/
    UpgradePanelViewModel.ts    ← Per-upgrade button data (position, colors, label, affordability)
    WarehouseGaugeViewModel.ts  ← World-space gauge: stock/capacity fraction
    PlayerStatsBarViewModel.ts  ← Time / packages / gold ViewModel
    TitleScreenViewModel.ts     ← Play button event + visibility control
```

---

## Current Content

**Production Modules:** 3, defined in `Defs/ProductionDefs.ts`
- Deposit distances from warehouse end: 3.75 / 7.5 / 11.25 world units
- Module 0 (blue machine): free unlock; Modules 1–2 (green, red): $100 unlock

**Upgrades:** 6 modules, defined in `Defs/UpgradeDefs.ts`

| Upgrade | Levels | Effect range |
|---------|--------|-------------|
| Conveyor Speed | 6 | 1.0 → 1.5 → 2.0 → 2.5 → 3.0 → 3.5 units/s |
| Warehouse Capacity | 8 | 3 → 6 → 9 → 12 → 15 → 18 → 21 → 24 items |
| Truck Count | 6 | 1 → 2 → 3 → 4 → 5 → 6 trucks |
| Production 0 | 7 | ∞ (locked) → 4.0 → 3.0 → 2.2 → 1.6 → 1.2 → 1.0 s |
| Production 1 | 7 | ∞ (locked) → 4.0 → 3.0 → 2.2 → 1.6 → 1.2 → 1.0 s |
| Production 2 | 7 | ∞ (locked) → 4.0 → 3.0 → 2.2 → 1.6 → 1.2 → 1.0 s |

**UI Panels:** 4 (TitleScreen, PlayerStatsBar, WarehouseGauge, UpgradePanel)

**Templates:** Layout (scene scaffold), Product (cardboard box entity)

---

## Product Lifecycle

A "product" (the cardboard box) is the unit that flows through the factory. To stay cheap on spawns and avoid entity churn, products are **not** spawned and destroyed at each stage — different stages use different entity sources, and ownership is handed off as the product crosses module boundaries.

### Entity sources

| Source | Owner | What it represents | Visibility control |
|--------|-------|---------------------|--------------------|
| **Production module cargo** | `ProductionModuleController` (child of the module template) | A box being assembled by the crane | `localScale` toggled between `HIDDEN` and `Vec3.one`; bounce-in on spawn, follows crane to belt drop point |
| **Shared product pool** | `ProductPoolService` | Free-floating boxes on the belt or stacked in the warehouse | Parked at `OFFSCREEN (0, -100, 0)` when in pool; `worldPosition` driven by belt/warehouse controllers when claimed |
| **Truck cargo** | `TruckController` (children of the truck template) | Boxes being hauled away | `localScale` toggled per slot index against `truck.load`; bounce-in on load |

Pool size at boot is `CONVEYOR_SLOT_COUNT + MAX_STORAGE`, spawned once by `GameManager.onStart()`.

### Lifecycle stages

```
[Production module]  →  [Conveyor belt]  →  [Warehouse]  →  [Truck]  →  (sold)
   embedded cargo       pool-claimed         pool-claimed     embedded cargo
```

1. **Production (embedded cargo, no claim).**
   `ProductionService` ticks the module timer. `ProductionModuleController` animates its own child cargo entity through the crane arc. At the end of the arc, `ConveyorService.tryDeposit()` is called.

2. **Deposit onto belt (claim from pool).**
   `ConveyorBeltController` observes the new belt slot and calls `_poolService.claim()` to obtain a `TransformComponent`. The production module's own cargo is hidden again (`localScale = HIDDEN`) — it never leaves the module; the visible box on the belt is a *different* entity from the pool. Conceptually the product is re-skinned at the module/belt boundary.

3. **Belt → Warehouse handoff (release + claim).**
   When the belt slot reaches the warehouse end, `ConveyorBeltController` releases its pooled entity (`_poolService.release(t)`) and `WarehouseController.add()` claims a fresh one from the pool to place on the stack. Two distinct pool entities are involved across the boundary; remix code must not assume the same `TransformComponent` carries through.

4. **Warehouse → Truck handoff (release + show embedded).**
   When a truck enters `Loading`, `WarehouseController` releases pooled entities one per loaded slot, and `TruckController` shows the corresponding child cargo entity via `localScale`. Again, no shared entity — the truck's cargo entities are *part of the truck template* and are reused across every trip that truck makes.

5. **Truck departs (no claim/release).**
   When the truck reaches the off-screen exit, `EconomyService` is credited and the truck's cargo `localScale` is reset to `HIDDEN`. Nothing returns to the pool here — the boxes were never from the pool to begin with.

### Rules for remix / new modules

- A product **is never carried as a single entity end-to-end.** It changes representation at every module boundary. Track logical state (count, kind) through events; do not try to keep a reference to "the same box."
- A new module that wants to display boxes has two options:
  - **Embedded cargo** (preferred for fixed-count visuals like a crane or a truck bed): declare child entities under the module template and toggle their `localScale`. Use this when the box count is bounded and known at design time.
  - **Pool-claimed** (preferred for variable-count flows like a belt or a stack): call `ProductPoolService.get().claim()` on entry and `release(t)` on exit. **Always release on every exit path**, including upgrades, warehouse-full backpressure, and reset events — leaked pool entities are silently parked off-screen and the pool will eventually starve.
- Pool capacity is fixed at boot. If a new module adds a stage that holds products, grow the pool by calling `spawnPool(extra)` from `GameManager.onStart()` before any consumer claims — do not call `spawnPool` lazily, claims that race the spawn will get `null`.
- `claim()` returns `null` when the pool is empty. Consumers must handle this (typically by skipping the visual and relying on the logical event); they must not assume a claim always succeeds.

---

## Economy

| Parameter | Value | Constant |
|-----------|-------|----------|
| Starting money | $100 | `STARTING_MONEY` |
| Truck capacity | 3 products | `TRUCK_CAPACITY` |

---

## Key Design Principles

- **Code is the source of truth.** All gameplay values live in `Constants.ts` and `Defs/`. When docs and code disagree, the code wins.
- **Event-driven, no direct component references.** Services communicate through `Events.*` (LocalEvents in `Types.ts`). Components subscribe to events; no service holds a reference to any component.
- **UpgradeRegistryService as broker.** Services register and remove their own upgrade entries after each level change. `UpgradePanelComponent` only reads from the registry — never from individual services.
- **FTUE gating.** The upgrade panel shows only `production0` until the player unlocks it (level ≥ 1). All other upgrade buttons are hidden until the first purchase is made.
- **Warehouse settle delay (0.5 s).** Products added to the warehouse cannot be picked up by trucks until their settle timer expires, giving the warehouse visual animation time to play.
- **Belt pauses on full warehouse.** `ConveyorService` stops advancing all products when `WarehouseFull` fires; resumes on `WarehouseAvailable`. This backpressure propagates to production modules: if the belt has no gap, the module goes `blocked` and retries each frame.
