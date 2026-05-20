# Game Extensions — Axes of Variation

## 1. Product Types & Tiers

**Concept:** Different products with different values. Higher-tier products require multiple lower-tier inputs or longer production times.

**Implementation axis:**
- Add `productType: number` to `IBeltProduct` and `IProductionModuleDef`
- Different pool templates per type (color-coded boxes)
- `MONEY_PER_PRODUCT` becomes a lookup by product type
- Tier 2 modules consume Tier 1 products (merge mechanic)

**Complexity:** Medium — requires product identity throughout the pipeline.

---

## 2. Customer Orders / Demand System

**Concept:** Instead of selling all products at flat rate, customers request specific quantities. Fulfilling orders gives bonus rewards.

**Implementation axis:**
- New `OrderService` generates random orders (product count + time limit + bonus)
- UI panel shows active orders
- TruckService checks if an order can be fulfilled when loading
- Urgency timer adds pressure

**Complexity:** Medium — new service + UI, no changes to existing pipeline.

---

## 3. Prestige / Reset Loop

**Concept:** "Sell" the factory to start over with a permanent multiplier. Classic idle game meta-progression.

**Implementation axis:**
- Track lifetime earnings
- "Sell Factory" button resets all levels and money
- Permanent multiplier on revenue based on prestige count
- Store prestige data (could use a simple counter in EconomyService)

**Complexity:** Low — mostly UI + a reset function on each service.

---

## 4. Bottleneck Visualization

**Concept:** Visual feedback showing which module is the current bottleneck (red glow on the slowest part of the chain).

**Implementation axis:**
- Each service exposes a throughput metric (products/second)
- A `BottleneckService` compares all throughputs each second
- Fires an event with the bottleneck module ID
- Controllers highlight/dim based on bottleneck state

**Complexity:** Low — read-only analysis, no gameplay changes.

---

## 5. Multiple Belt Lines

**Concept:** Add a second (or third) conveyor belt line, each with its own production modules and feeding the same warehouse.

**Implementation axis:**
- ConveyorService becomes multi-instance (array of belt states) or spawned per-line
- Each ProductionModule targets a specific belt index
- Warehouse receives from all belts
- New upgrade: "Unlock Belt Line 2"

**Complexity:** High — ConveyorService and ConveyorBeltController need multi-instance support.

---

## 6. Special Events / Boosts

**Concept:** Timed bonuses that appear randomly — "2x speed for 30s", "next upgrade free", "warehouse auto-sells".

**Implementation axis:**
- New `EventBoostService` with a timer that spawns boosts at random intervals
- Boost types modify existing service values temporarily
- UI shows active boost with countdown
- Tap-to-activate mechanic (boost appears as tappable entity in the scene)

**Complexity:** Medium — needs input handling + temporary value modifiers.

---

## 7. Warehouse Automation (Auto-Sell)

**Concept:** Upgrade that makes the warehouse automatically sell products without trucks, at a lower rate.

**Implementation axis:**
- New upgrade module `autoSell` with a timer
- When enabled, WarehouseService periodically removes 1 product and fires a reduced-value TruckDelivered
- Coexists with trucks — trucks give better value

**Complexity:** Low — timer in WarehouseService + new upgrade def.

---

## 8. Achievement / Milestone System

**Concept:** Track player milestones (first 100$, first upgrade, all modules unlocked, etc.) and reward them.

**Implementation axis:**
- New `AchievementService` subscribes to key events (TruckDelivered, UpgradePurchased)
- Milestone definitions in a new `AchievementDefs.ts`
- Rewards: one-time money bonus, permanent small multiplier
- UI toast notification on unlock

**Complexity:** Low-Medium — new service, no changes to existing systems.

---

## 9. Offline Earnings

**Concept:** Calculate earnings while the player was away and grant them on return.

**Implementation axis:**
- On exit: save timestamp + current production rates
- On load: calculate elapsed time × throughput
- Cap offline earnings (e.g., max 2 hours)
- Show "Welcome back! You earned X$" popup

**Complexity:** Medium — requires save/load system (MHS persistence API).

---

## 10. Visual Polish

Quick visual wins that don't change gameplay:

- **Particle effects** on product delivery (confetti at warehouse entry)
- **Screen shake** on milestone achievements
- **Product trail** — small particles behind products on the belt
- **Money counter animation** — numbers fly up from trucks when delivering
- **Module pulse** — production modules pulse/glow when producing
- **Upgrade flash** — brief white flash on upgraded module
