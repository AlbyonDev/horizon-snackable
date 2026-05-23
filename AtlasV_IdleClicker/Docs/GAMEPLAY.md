# Gameplay — AtlasV Idle Clicker

## Core Loop

```
1. Boot → TitleScreenUI shown (fade-in)
2. Player taps PLAY → 800 ms fade-to-black → TitleScreenUI hidden
3. Game loop (no game-over):
   a. Player taps gem deposit          → TapService.onPlayerTap
   b. Auto-cursors fire on cycle       → TapService.onTick (1..10 cursors)
   c. Generators tick                  → GeneratorService.onTick (per def cycleTime)
   d. Crit / Frenzy modifiers          → applied inside ResourceService.addGain()
   e. Interest payout                  → InterestService.onTick (every _interval)
   f. Vault: player triggers vault.lock → 50% gold sealed; returns +50% after _duration
   g. ActionService re-evaluates shop  → on every ResourceChanged / StatsChanged
4. Reload = full reset (no persistence).
```

There are no states beyond "title showing" vs "in game" — there is no pause state, no game-over, no win condition.

---

## Scene & UI Overview

### Layer split

#### Screen-space UI (XAML + ViewModel pairs, no world position)
| XAML file | ViewModel class | Role |
|---|---|---|
| `xaml/title_screen.xaml` | `TitleScreenViewModel` | Fullscreen intro; fades on Play |
| `xaml/upgrade_bar.xaml` | `UpgradeBarViewModel` | Top HUD with 4 perk slots (Critical, Interest, Vault, Frenzy) |
| `xaml/tap_zone.xaml` | `TapZoneViewModel` + `CrystalShardViewModel` (per-shard) | Background, gem, cursor pickaxes, resource counter, TAP TO EARN |
| `xaml/shop_zone.xaml` | `ShopZoneViewModel` (uses `ShopItemViewModel`) | Bottom shop: tabs + scrollable item list |
| `xaml/floating_text.xaml` | `FloatingTextItemViewModel` (one per slot) | "+N" gain popups (20-slot dynamic pool) |
| `GlobalResources.xaml` | — | Shared `DataTemplate` and `ControlTemplate` resources used by other XAMLs |

#### Spawned runtime entities (pools)
- **Crystal shard pool** — managed in `CrystalShardController` + bound `CrystalShardViewModel` instances rendered by `tap_zone.xaml`. Spawns 2D particle "shards" on every gem tap. Pool size ~12; shards run on the per-tick physics in `CrystalShardController.onTick`.
- **Floating-text pool** — 20 dynamic `FloatingTextItemViewModel` slots inside an `ItemsControl` in `floating_text.xaml`; recycled by `FloatingTextUIComponent` on every `Events.GainApplied`.

There are no spawned 3D entities — gameplay is entirely UI overlays. No prefab pool spawns happen in `space.hstf` at runtime.

#### Scene-placed entities (authored in `space.hstf`)
| Entity | Components | Role |
|---|---|---|
| `GameManagerEntity` | `TransformPlatformComponent` + script `GameManager` | Instantiates services; drives `Events.Tick` every 0.1s |
| `TitleScreenUI` | `CustomUiComponent` (ScreenSpace, `xaml/title_screen.xaml`, 1080×1920, renderOrderOffset 20, `isInteractable: true`) + `TitleScreenController` | Title screen UI |
| `UpgradeBarUI` | `CustomUiComponent` (ScreenSpace, `xaml/upgrade_bar.xaml`, 1080×1920, renderOrderOffset 10, `isInteractable: false`) + `UpgradeBarController` | Top HUD |
| `TapZoneUI` | `CustomUiComponent` (ScreenSpace, `xaml/tap_zone.xaml`, 1080×1920, renderOrderOffset 5, `isInteractable: false`) + `TapZoneController` + `CrystalShardController` + `FocusedInteractionSetup` | Tap surface, scene background, gem, cursors |
| `ShopZoneUI` | `CustomUiComponent` (ScreenSpace, `xaml/shop_zone.xaml`, 1080×1920, renderOrderOffset −10, `isInteractable: true`) + `ShopZoneController` | Shop (front-most for tab/buy taps) |
| `FloatingTextUI` | `CustomUiComponent` (ScreenSpace, `xaml/floating_text.xaml`, 1080×1920, renderOrderOffset 15, `isInteractable: false`) + `FloatingTextUIComponent` | "+N" popup overlay |

`isInteractable: true` on `ShopZoneUI` and `TitleScreenUI` prevents touches on the shop or title from falling through and double-registering as tap-zone gem taps.

### Game camera

No active gameplay camera. Every visual surface is a `CustomUiComponent` with renderType `ScreenSpace` — they composite directly on the screen and are not affected by world camera transforms. `player.hstf` sets avatar scale to 0; the skybox in `space.hstf` is disabled. The world is effectively invisible, so:

- **Front-face direction:** N/A (no meshes are visible).
- **Axis mapping on screen:** N/A (UI authored in 2D pixel space, 1080×1920 portrait).
- **Safe Z-offset range:** N/A — render order on UI is controlled by `renderOrderOffset` on each `CustomUiComponent`, not Z.

For a remix that re-introduces a world camera, place a new entity with a camera component, add a script that activates it on `OnEntityStartEvent`, and disable / dim the four fullscreen `CustomUiComponent` ScreenSpace overlays.

---

## Systems

### ResourceService
**File:** `scripts/Services/ResourceService.ts`
Single in-memory `_gold` value (starts at `INITIAL_RESOURCES = 0`). All gold increases flow through `addGain(rawAmount, source)`, which runs registered modifiers in priority order before adding the result to `_gold` and emitting `Events.GainApplied`. Modifiers are functions `(amount, source) → { amount, isCrit?, isFrenzy? }`; Crit registers at priority 10, Frenzy at 0 (Crit runs first).
- `spend(amount)` — atomic; returns `false` if not enough gold.
- `buy(actionId)` — convenience wrapper: scales cost via `getScaledCost`, spends, increments StatsService counter.
- Emits `ResourceChanged` on every change.

### TapService
**File:** `scripts/Services/TapService.ts`
- On `PlayerTap`: increments `taps` stat, calls `addGain(BASE_CLICK_VALUE * _multiplier, Tap)`.
- On `Tick`: if any auto-cursors are owned, accumulates time; when `_cursorAccum >= CURSOR_CYCLE_TIME / _cursorCount`, emits `PlayerTap { isAuto: true }`. `CURSOR_CYCLE_TIME = 2s` (local constant in TapService.ts — **not** in Constants.ts).
- `tap.buy` → `_cursorCount++` (cap 10 via `maxCount`). `tap.upgrade` → `_multiplier += 1` (cap 50).

### GeneratorService
**File:** `scripts/Services/GeneratorService.ts` (defs: `scripts/Defs/GeneratorDefs.ts`)
- Two generators (id 0: Jungle Shrine, id 1: Crystal Mine), each with `baseOutput`, `cycleTime`, and 10 `upgradeMultipliers`.
- Per tick, for each owned generator: accumulate dt; on overflow, emit `addGain(count * baseOutput * outputMultiplier, Passive)`.
- `outputMultiplier(genId)` = product of all purchased rank multipliers from `upgradeMultipliers[0..rank-1]`.
- Upgrade chain is enforced by `ActionDefs[].unlock`: `upgrade.N.K` requires `upgrade.N.K-1 ≥ 1`.

### CritService
**File:** `scripts/Services/CritService.ts`
- On `crit.unlock` purchase: registers a modifier at priority 10 that rolls `Math.random() < _chance` and on hit returns `{ amount: amount * _multiplier, isCrit: true }`.
- `crit.chance` → `_chance += 0.05` (max 8 purchases → +40%). `crit.power` → `_multiplier += 0.5` (max 50 purchases).
- Crit applies to **all** gain sources, not just taps.

### FrenzyService
**File:** `scripts/Services/FrenzyService.ts`
- Counts real `PlayerTap` events while not active. When `_tapCount >= _threshold`, activates: `_active = true; _timeLeft = _duration`. The registered modifier (priority 0) multiplies all gain by `_multiplier` while active.
- Upgrades: `frenzy.threshold` `−2` (min 5), `frenzy.duration` `+3s`, `frenzy.power` `+0.5×`.

### InterestService
**File:** `scripts/Services/InterestService.ts`
- After `interest.unlock`, accumulates dt; every `_interval` seconds calls `addGain(currentGold * _rate, Interest)`.
- `interest.rate` → `_rate += 0.005`. `interest.interval` → `_interval *= 0.8`.
- Interest pays off the **current** gold balance (not cumulative), so locking gold in the Vault hides it from interest.

### VaultService
**File:** `scripts/Services/VaultService.ts`
- `vault.lock` (cost = 50% of current gold; only enabled when gold > 0 and not already locked): spends 50% of gold, sets `_locked = true`, `_timeLeft = _duration`.
- On tick countdown to 0: pays out `_lockedAmount * _bonusMultiplier` via `addGain(..., VaultPayout)`. While locked, the `vault.lock` action's `detail` is live-updated each tick to display return amount.
- Upgrades: `vault.duration` `*= 0.8` (faster return). `vault.bonus` `+= 0.2` (bigger return).

### ActionService
**File:** `scripts/Services/ActionService.ts`
- Two-stage system:
  1. Systems call `declare(id, factory)` once in `onReady`. The factory recomputes `{ label, detail, cost, isEnabled }` on demand.
  2. `refreshDeclared()` runs every declared factory, filters by `canReveal(id)` (unlocked + not maxed via `StatsService.get(id) < maxCount`), and emits `ActionRegistryChanged` only on actual change (label / detail / cost / isEnabled diff).
- Auto-runs `refreshDeclared` on every `ResourceChanged` and `StatsChanged`.
- `trigger(id)` emits `ActionTriggered` (services handle their own ids).

### StatsService
**File:** `scripts/Services/StatsService.ts`
- Plain `Map<string, number>` with `increment` and `get`. Emits `StatsChanged` on every increment.
- Stat keys in use: `taps`, `gold_earned`, `crit.proc`, `interest.payout`, `frenzy.activated`, every `actionId` (counts purchases), `generator.0` / `generator.1` (count of each generator owned).

### Shop UI (`ShopZoneController`)
**File:** `scripts/ShopZoneController.ts`
- Three tabs (`MINING`, `UPGRADES`, `PERKS`), routed by `tabForActionId(id)`:
  - `MINING`: `tap.buy` + `generator.buy.*`
  - `UPGRADES`: `tap.upgrade` + `generator.upgrade.*` + non-unlock `crit.*` / `frenzy.*` / `vault.*` / `interest.*`
  - `PERKS`: all `*.unlock` actions + `vault.lock`
- Icons routed by `iconForActionId(id)` — generator icons (`iconShrine` / `iconMine`) cover both buy and upgrade rows.
- MINING tab shows maxed items too (so the player still sees their owned generators); other tabs hide items removed from the live registry.
- Numbers formatted via `formatCompact` (k, M, B, T, … up to Dc decillion).
- On `vault.lock`, while locked, the row displays a countdown progress bar.

### UpgradeBar (`UpgradeBarController`)
**File:** `scripts/UpgradeBarController.ts`
- Four fixed slots for the four perks. Each slot is hidden until its `*.unlock` action has been purchased.
- Each shows current value + progress (e.g. Frenzy: taps-to-trigger, then time remaining when active; Vault: time remaining; Interest: time-until-next; Crit: chance × multiplier).
- Border flash animation triggered by `GainApplied` when relevant source matches.

### Tap zone (`TapZoneController` + `TapZoneViewModel`)
**File:** `scripts/TapZoneController.ts`, `scripts/TapZoneViewModel.ts`
- Renders the scene background and the gem deposit (`tap_zone_background.png` + `gem_deposit.png`, both loaded inline — **not** via `Assets.ts`).
- Gem wiggles on tap; player pickaxe moves toward `tapX, tapY` with a left/right swing animation depending on tap-side.
- Auto-cursor sprites: up to 10, each positioned around the gem.
- "TAP TO EARN" label hides 5s after last tap, reappears on inactivity.
- Resource counter shows `formatCompact(gold)` in gold text top-center.
- Touch input: `FocusedInteractionSetup` converts `OnFocusedInteractionInputStartedEvent` screen coords (0..1) to canvas coords (0..480 × 0..850) via a letterbox correction matching the inner authoring grid aspect (480/850 ≈ 0.565) vs screen aspect (9:16). Emits `Events.PlayerTap { isAuto: false, tapX, tapY }`.

### Crystal-shard VFX (`CrystalShardController`)
**File:** `scripts/CrystalShardController.ts`, `scripts/CrystalShardViewModel.ts`
- On every `PlayerTap`, picks a free shard from the pool, randomises scale (0.4–0.85), spawn-offset (±20 H, ±10 V), and velocity. Per-tick 2D physics integrates position, rotation, and alpha until the shard expires; then it returns to the pool.

### Floating-text overlay (`FloatingTextUIComponent`)
**File:** `scripts/FloatingTextUIComponent.ts`, `scripts/FloatingTextItemViewModel.ts`
- 20-slot recycled pool. On `GainApplied`, claims a free slot, sets text to `"+" + formatCompact(amount)` and color based on source (gold tap / green passive / cyan interest / orchid vault / orange when crit/frenzy applies). Floats upward with a fade-out and an entry pop.

---

## Extension Axes

### Add a new generator
1. Append a new `IGeneratorDef` to `GENERATOR_DEFS` in `scripts/Defs/GeneratorDefs.ts` with a unique `id`, `name`, `baseOutput`, `cycleTime`, and 10 `upgradeMultipliers`.
2. Add the matching shop entries in `scripts/Defs/ActionDefs.ts`:
   - `generator.buy.<id>` (label, description, `cost`, `costPow: 1.15`, `maxCount: 0`)
   - Ten `generator.upgrade.<id>.0` … `generator.upgrade.<id>.9` with chained `unlock: { 'generator.upgrade.<id>.K-1': 1 }`.
3. In `scripts/ShopZoneController.ts`, extend `iconForActionId` to route `generator.buy.<id>` and `generator.upgrade.<id>.*` to a new icon (e.g. add `iconWhatever` to `scripts/Assets.ts` and import it).
4. Add the sprite to `sprites/` and register it as a `TextureAsset` in `scripts/Assets.ts`.

### Add a new perk system (modifier-based, like Crit/Frenzy)
1. Create `scripts/Services/MyPerkService.ts` decorated with `@service()`. In `onReady`, `declare` an `unlock` action and any upgrade actions in `ActionService`. Handle `ActionTriggered` for each.
2. In the `unlock` handler, call `ResourceService.get().registerModifier(fn, priority)`; pick a priority (Crit = 10, Frenzy = 0) that yields the desired stacking order with existing modifiers.
3. Add the action defs to `scripts/Defs/ActionDefs.ts`.
4. Add an icon in `scripts/Assets.ts` and a route in `iconForActionId` in `scripts/ShopZoneController.ts`.
5. Add the service singleton to the `services` array in `scripts/GameManager.ts` so it instantiates.
6. (Optional) Add a slot to the upgrade bar in `scripts/UpgradeBarController.ts` + `xaml/upgrade_bar.xaml`.

### Add a new tap upgrade
1. Add a new `IActionDef` under `TAP_DEFS` in `scripts/Defs/ActionDefs.ts`.
2. Handle the new id in `TapService.onActionTriggered`, mutate the relevant private field, and call `ActionService.get().refreshDeclared()`.
3. Route the icon in `iconForActionId` (`scripts/ShopZoneController.ts`).

### Add a new currency
1. Add a member to the `ResourceType` enum in `scripts/Types.ts`.
2. Extend `ResourceService` (`scripts/Services/ResourceService.ts`) with a parallel field/getter/setter for the new type or refactor `_gold` into a map keyed by `ResourceType`.
3. Emit `ResourceChanged` with the right `type` on every change.
4. Update `ResourceChangedPayload` consumers (`TapZoneController`, `ShopZoneController`, `UpgradeBarController`) to handle the new type.
5. Add an icon to `scripts/Assets.ts` and route it in the relevant ViewModels.

### Add a clickable thing (enemy, power-up, bonus drop)

The hard part isn't spawning a sprite — it's matching `Events.PlayerTap` coordinates to your XAML element. Read this carefully:

**Coordinate system.** `Events.PlayerTap.tapX` / `tapY` are in the **inner authoring canvas (480 × 850)**, NOT screen pixels and NOT the 1080 × 1920 `CustomUiComponent` canvas. The mapping is done in `scripts/FocusedInteractionSetup.ts` using `CANVAS_W`, `CANVAS_H`, `SCREEN_ASPECT` from `scripts/Constants.ts`. Your hit-test code must use the same 480 × 850 space.

**Row layout in `tap_zone.xaml`.** The inner `Grid Width="480" Height="850"` has three rows:
- Row 0 (`0.15*`): y = 0..128 (upgrade-bar area)
- Row 1 (`0.45*`): y = 128..510 (tap zone — main gem lives here)
- Row 2 (`0.4*`): y = 510..850 (shop)

Coordinates in `PlayerTap` use the full 0..850 range. If you nest your clickable inside Row 1's `<Grid Grid.Row="1">`, its local (0,0) is at canvas (0, 128), so you'd need to subtract 128. **Easier:** put it as a sibling of Row 1's grid (still inside the outer 480×850 grid), with `HorizontalAlignment="Left" VerticalAlignment="Top"` and a `TranslateTransform` of `(centerX, centerY)` — then PlayerTap coords map 1:1.

**Use `scripts/Utils/hitTest.ts`.** `isHit(tapX, tapY, x, y, w, h)` and `isHitCentered(tapX, tapY, cx, cy, w, h)`.

#### Worked example: the bonus mini-gem (`BonusGemService`)

`scripts/Services/BonusGemService.ts` is kept in the project as a **reference implementation only** — its `ENABLED` const is set to `false`, so it does not spawn at runtime. Read it (and `scripts/Utils/hitTest.ts`) alongside this section. To add a similar clickable, copy the pattern:

1. **Constants in `scripts/Constants.ts`.** Pick your spawn-rect, size, lifetime, and reward. Always express the rect and size in the 480 × 850 canvas space. Example pattern: `MY_THING_SIZE = 70`, `MY_THING_SPAWN_X_MIN = 60`, etc.
2. **Service in `scripts/Services/MyThingService.ts`.** Owns the spawn timer and current position. Listens to `Events.Tick` to drive the FSM and to `Events.PlayerTap` for hit detection. Filter out `p.isAuto` if auto-cursors shouldn't trigger it. Call `isHitCentered(p.tapX, p.tapY, this._x, this._y, SIZE, SIZE)`.
3. **Reward.** For a "10× tap value" style reward: `ResourceService.get().addGain(TapService.get().getClickValue() * MULT, GainSource.Tap)` plus `StatsService.get().increment('taps', 1)` so Frenzy still ticks. For an enemy that drops a flat amount: skip the `taps` increment.
4. **ViewModel fields in `scripts/TapZoneViewModel.ts`.** Add `myThingVisible: boolean`, `myThingX/Y: number`, `myThingImage: TextureAsset`, and trigger ints for any storyboards (`myThingPulseTrigger`, `myThingCollectTrigger`).
5. **Controller wiring in `scripts/TapZoneController.ts`.** Add a `_syncMyThing()` method called from `onUpdate`, mirroring service state onto the VM. Only push position on the rising edge (`!wasActive && active`) so the sprite doesn't teleport every frame while visible.
6. **XAML in `xaml/tap_zone.xaml`.** Add a `Border` as a sibling of the Row-1 `Grid` (so coords map 1:1). Use `HorizontalAlignment="Left" VerticalAlignment="Top"` + `TranslateTransform X="{Binding myThingX}" Y="{Binding myThingY}"` + a second `TranslateTransform X="-W/2" Y="-H/2"` so the binding represents the center. Set `IsHitTestVisible="False"` (the hit test lives in the service, not XAML). Use `Panel.ZIndex` higher than other tap-zone layers so it draws on top.
7. **Register the service in `scripts/GameManager.ts`.** Add `MyThingService.get()` to the `services` array so it instantiates.

#### Common mistakes the agent makes

- **Using 1080 × 1920 coords.** `PlayerTap` is in the 480 × 850 canvas. Don't confuse the `CustomUiComponent` canvas with the tap canvas.
- **Nesting inside Row 1 without subtracting 128.** Row 1's local y=0 is canvas y=128. Either put the clickable outside Row 1's grid, or subtract 128 from `tapY` before hit testing.
- **Forgetting `HorizontalAlignment="Center"` math.** If you center-align the Border, its anchor is (240, anchorY) — your TranslateTransform represents the offset from the center, not the absolute position. Use `HorizontalAlignment="Left"` + `VerticalAlignment="Top"` to keep things simple.
- **Letting `isAuto` taps trigger it.** Auto-cursors fire `PlayerTap` with `isAuto: true` and no meaningful tapX/tapY. Check `if (p.isAuto) return;` if your clickable should require a real tap.
- **Hit-testing in XAML with `Button`s.** Don't. XAML `IsHitTestVisible="True"` on multiple overlapping `CustomUiComponent`s will cause taps to get consumed by the wrong layer. The whole tap-zone UI uses `isInteractable: false` and routes input through `FocusedInteractionSetup`. Do hit testing in services using the coords from `PlayerTap`.

### Change tuning values
- All baseline tuning lives in `scripts/Constants.ts`. Changing values there shifts the game balance without touching logic.
- Per-action cost / cap / unlock chain lives in `scripts/Defs/ActionDefs.ts`.
- Per-generator output and upgrade multipliers live in `scripts/Defs/GeneratorDefs.ts`.

### Replace the background art
1. Replace `sprites/tap_zone_background.png` (jungle/temple scene) and/or `sprites/title_background.png` (cave scene). Both are 512×512, opaque, `premultiplyAlpha: false`.
2. Replace `sprites/title_logo.png` if you want a new wordmark.
3. Per `Docs/ART_DIRECTION.md`, keep the chunky stylised painted look and the warm-rim/jewel-tone palette to stay consistent with the icons.

---

## Known Issues

| Severity | File | Description |
|---|---|---|
| Low | `scripts/FocusedInteractionSetup.ts` | Letterbox math assumes a 9:16 screen aspect. On screens with a different aspect, the tap-position-to-canvas mapping drifts slightly — affects only the pickaxe's animated swing direction, not whether the tap is registered. |
| Low | `scripts/TapZoneViewModel.ts` | `gem_deposit.png` and `tap_zone_background.png` are loaded inline as `new TextureAsset(...)` rather than via `scripts/Assets.ts`. Inconsistent with the rest of the codebase but functional. |
