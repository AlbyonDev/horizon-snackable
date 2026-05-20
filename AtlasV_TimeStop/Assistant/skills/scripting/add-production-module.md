# Add a Production Module

## What it does
Adds a new production module to the factory — a new machine that deposits products onto the conveyor belt at a configurable position.

## Steps

1. **ProductionDefs.ts** — Add a new entry to `PRODUCTION_MODULE_DEFS`:
   ```ts
   { depositDistance: 13.5 },  // must be >= CONVEYOR_MIN_GAP away from others
   ```

2. **UpgradeDefs.ts** — Add a matching upgrade def with id `productionN` (N = array index):
   - Set `PROD_COSTS[0]` = unlock cost (or 0 for free)
   - `getEffect(0)` must return `Infinity` (locked state)
   - `getEffect(1)` = base production interval

3. **EconomyService.ts** — Add `this._upgradeLevels.set('productionN', 0)` in `onReady()`

4. **Scene** — Place a visual zone entity at the matching Z position on the right side of the belt

5. **ProductPoolService** — If more products can be on belt simultaneously, increase the pool count in `GameManager.ts`

## Constraints
- `depositDistance` must be within `[0, CONVEYOR_BELT_LENGTH]`
- Minimum `CONVEYOR_MIN_GAP` (1.5 units) between any two deposit distances
- The `id` in UpgradeDefs must match the pattern `production{index}` where index = position in `PRODUCTION_MODULE_DEFS`

## Variations
- **Different product types:** Add a `productType` field to `IProductionModuleDef` and `IBeltProduct`, use different pool templates per type
- **Variable output:** Add a `batchSize` field — deposit multiple products per cycle
- **Conditional unlock:** Chain module unlocks (module 2 requires module 1 at level 3)
