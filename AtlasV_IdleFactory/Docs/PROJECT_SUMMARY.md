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

## Economy

| Parameter | Value | Constant |
|-----------|-------|----------|
| Starting money | $100 | `STARTING_MONEY` |
| Revenue per product delivered | $20 | `MONEY_PER_PRODUCT` |
| Truck capacity | 3 products | `TRUCK_CAPACITY` |
| Max revenue per truck trip | $60 | 3 × $20 |

---

## Key Design Principles

- **Code is the source of truth.** All gameplay values live in `Constants.ts` and `Defs/`. When docs and code disagree, the code wins.
- **Event-driven, no direct component references.** Services communicate through `Events.*` (LocalEvents in `Types.ts`). Components subscribe to events; no service holds a reference to any component.
- **UpgradeRegistryService as broker.** Services register and remove their own upgrade entries after each level change. `UpgradePanelComponent` only reads from the registry — never from individual services.
- **FTUE gating.** The upgrade panel shows only `production0` until the player unlocks it (level ≥ 1). All other upgrade buttons are hidden until the first purchase is made.
- **Warehouse settle delay (0.5 s).** Products added to the warehouse cannot be picked up by trucks until their settle timer expires, giving the warehouse visual animation time to play.
- **Belt pauses on full warehouse.** `ConveyorService` stops advancing all products when `WarehouseFull` fires; resumes on `WarehouseAvailable`. This backpressure propagates to production modules: if the belt has no gap, the module goes `blocked` and retries each frame.
