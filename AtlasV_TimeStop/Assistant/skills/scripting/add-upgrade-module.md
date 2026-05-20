# Add an Upgrade Module

## What it does
Adds a new upgradeable parameter to the game — any numeric value that can be improved through spending money.

## Steps

1. **UpgradeDefs.ts** — Add a new `IUpgradeDef` entry:
   ```ts
   {
     id:          'myModule',
     label:       'My Module',
     effectLabel: 'Description',
     maxLevel:    EFFECTS.length - 1,
     getCost:     (level) => COSTS[level] ?? Infinity,
     getEffect:   (level) => EFFECTS[level] ?? EFFECTS[EFFECTS.length - 1],
   }
   ```

2. **EconomyService.ts** — Register the initial level in `onReady()`:
   ```ts
   this._upgradeLevels.set('myModule', 0);
   ```

3. **Target service** — Subscribe to `Events.UpgradePurchased` and update the operative value:
   ```ts
   @subscribe(Events.UpgradePurchased)
   onUpgradePurchased(p: Events.UpgradePurchasedPayload): void {
     if (p.moduleId !== 'myModule') return;
     const def = UPGRADE_DEFS.find(u => u.id === 'myModule');
     if (def) this._myValue = def.getEffect(p.level);
   }
   ```

4. **UI** — Trigger the upgrade via `EconomyService.tryUpgrade('myModule', cost)`

## Design Notes
- `getEffect(0)` = the base/unupgraded value (or `Infinity` for locked modules)
- `getCost(level)` = cost to go from `level` to `level + 1`
- Costs and effects are arrays — easy to tune without code changes
- Use `Infinity` as cost for the last level to prevent over-upgrading

## Examples of New Modules
- **Truck capacity** — More products per trip (currently fixed at 1)
- **Product value** — Revenue per product (`MONEY_PER_PRODUCT`)
- **Belt length** — Shorter belt = faster delivery
- **Settle time** — Faster warehouse intake
