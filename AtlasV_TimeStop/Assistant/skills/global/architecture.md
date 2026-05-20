# Architecture Overview

## Core Principles
- **Single source of truth:** Services own state, controllers render it
- **Event-driven communication:** No direct references between services — `EventService.sendLocally()` for all cross-service communication
- **Continuous simulation:** Belt uses float positions, not discrete slots — no interpolation bugs, no tick/visual desync

## Data Flow

```
ProductionService (timers)
        │ tryDeposit(distance)
        ▼
ConveyorService (belt products: float positions)
        │ ProductDelivered event
        ▼
WarehouseService (stock + settle timers)
        │ removeProducts() [called by TruckService]
        ▼
TruckService (fleet state machines)
        │ TruckDelivered event
        ▼
EconomyService (money balance)
        │ tryUpgrade() → UpgradePurchased event
        ▼
All services (update operative values)
```

## Rendering Pattern
Controllers are **pure renderers** — they read service state each frame and position entities. No gameplay logic in controllers.

Example: `ConveyorBeltController._syncVisuals()` reads `ConveyorService.getProducts()` and maps each `IBeltProduct` to a pool entity by reference identity.

## Upgrade Pattern
1. UI calls `EconomyService.tryUpgrade(moduleId, cost)`
2. EconomyService deducts money, increments level, fires `UpgradePurchased`
3. Target service subscribes to `UpgradePurchased`, reads new effect from `UPGRADE_DEFS`
4. Operative value updated — no restart needed

## Pause/Resume
- `WarehouseFull` → ConveyorService pauses (stops advancing products)
- `WarehouseAvailable` → ConveyorService resumes
- Production modules block independently when belt has no room at their deposit distance
