# Project Summary — AtlasV Idle Clicker

## Overview
An idle clicker game built for Meta Horizon Studio (v79), targeting VR/mobile (Meta Quest). Fullscreen 2D UI — no 3D world visible. All logic runs client-side in TypeScript via the Worlds SDK.

---

## Architecture

Service-oriented + MVVM pattern.

- **Services** (`scripts/Services/`) — autonomous singletons owning all game logic
- **Defs** (`scripts/Defs/`) — static data catalogs (actions, generators)
- **ViewModels** — plain data objects bound to XAML
- **Controllers** — bridge between services (events) and ViewModels (writes)
- **Types.ts** — single source of truth for enums, interfaces, events (zero sibling imports)
- **Constants.ts** — all tuning values (no magic numbers in logic files)

---

## Gameplay Systems

### ResourceService
Gold storage + gain modifier pipeline. All gains flow through `addGain(amount, source)`, which runs registered modifiers in priority order before emitting `GainApplied`.

### TapService
Direct player tap → gold. Tap multiplier upgrades (up to 50 levels). Auto-cursor cycle: up to 10 cursors, each fires proportionally to CURSOR_CYCLE_TIME.

### GeneratorService
Passive income. Two generators: Jungle Shrine (2.5/s, 5s cycle) and Crystal Mine (40/s, 10s cycle). Each has 10 upgrade ranks (chained unlock, geometric multipliers ~×1.5 per rank).

### CritService
Rolls on every gain. Base 5% chance, ×2.5 multiplier. Upgrades: `crit.chance` (+5% each, max 8) and `crit.power` (+0.5× each, max 50). Modifier registered on unlock purchase.

### FrenzyService
Tap-count threshold → timed all-gain multiplier. Default: 30 taps → 10s → ×2. Upgrades: lower threshold, extend duration, increase power.

### InterestService
% of current gold paid on a timer. Base 1% / 30s. Upgrades: increase rate, decrease interval.

### VaultService
Lock 50% of gold for a duration; auto-returns with bonus. Base: 30s → +50%. Upgrades: shorter duration, higher bonus.

### ActionService
Central registry of all purchasable actions. Systems declare actions via `declare(id, factory)`; the factory is called on every `refreshDeclared()` to recompute cost/enabled state. Drives the shop UI.

### StatsService
Global named counters. Tracks taps, gold earned, crit procs, purchase counts, generator ownership, etc.

---

## Scene Structure

- **space.hstf** — Main scene. Skybox disabled. All gameplay via UI overlays.
- **player.hstf** — Player template with avatar scale set to 0 (hidden).

### Entities & render order

| Entity | renderOrderOffset | Role |
|---|---|---|
| TitleScreenUI | 20 | Fullscreen intro, fades out on Play |
| FloatingTextUI | 15 | "+N" particle pool (20 slots) |
| UpgradeBarUI | 10 | Top HUD: 4 feature slots |
| TapZoneUI | 5 | Tap area, gem, cursors, resource counter |
| ShopZoneUI | −10 | Bottom shop panel |

---

## UI System

### Title Screen
- **XAML:** `xaml/title_screen.xaml`
- **Scripts:** `TitleScreenController`, `TitleScreenViewModel`
- Temple background (`title_background.png`), golden logo (`title_logo.png`), Play button. 800ms fade-to-black on press then panel hidden.

### Upgrade Bar (Top HUD)
- **XAML:** `xaml/upgrade_bar.xaml`
- **Scripts:** `UpgradeBarController`, `UpgradeBarViewModel`
- 4 fixed slots (Critical, Interest, Vault, Frenzy). Each hidden until the corresponding feature is unlocked. Live data: value, progress bar, animated border flash on events.

### Tap Zone
- **XAML:** `xaml/tap_zone.xaml`
- **Scripts:** `TapZoneController`, `TapZoneViewModel`, `CrystalShardController`, `CrystalShardViewModel`, `FocusedInteractionSetup`
- Cave background, gem deposit (wiggle on tap), resource counter, auto-cursor sprites (up to 10), player pickaxe (follows tap position, left/right swing animation). Crystal shard VFX on every tap.
- "TAP TO EARN" label: hides 5s after last tap, reappears on inactivity.
- **Sprites:** `tap_zone_background.png`, `gem_deposit.png`, `pickaxe_cursor.png`

### Shop Zone
- **XAML:** `xaml/shop_zone.xaml`
- **Scripts:** `ShopZoneController`, `ShopZoneViewModel`
- Three tabs: MINING, UPGRADES, PERKS. Items driven live from ActionService. Generator buy items show a cycle progress bar. Vault lock item shows lock countdown. Buy button turns red when unaffordable.
- **Tab mapping:**
  - MINING: `tap.buy`, `generator.buy.*`
  - UPGRADES: `tap.upgrade`, `generator.upgrade.*`, `crit.*`, `frenzy.*`, `vault.*`, `interest.*` (excl. `*.unlock`)
  - PERKS: `*.unlock` actions + `vault.lock`
- **Sprites:** `icon_tab_mining.png`, `icon_tab_upgrade.png`, `icon_tab_coins.png`, `icon_critical.png`, `icon_frenzy.png`, `icon_vault.png`, `icon_income.png`

### Floating Text
- **XAML:** `xaml/floating_text.xaml`
- **Script:** `FloatingTextUIComponent`, `FloatingTextItemViewModel`
- Dynamic ItemsControl (20 slots). Spawns on every `GainApplied`. Floats upward, fades, pops on entry. Color-coded by source: gold (tap), green (passive), cyan (interest), orchid (vault), orange (frenzy/crit blend).

### Input
- `FocusedInteractionSetup` on TapZoneUI enables FocusedInteractionService, hides default VR controls (exit, emotes). Converts touch → `Events.PlayerTap` with canvas coordinates.

---

## Events

| Event | Who emits | Who listens |
|---|---|---|
| `PlayerTap` | FocusedInteractionSetup (manual), TapService (auto-cursor) | TapService, FrenzyService, CrystalShardController, TapZoneController |
| `ActionTriggered` | ActionService.trigger() | GeneratorService, TapService, CritService, FrenzyService, InterestService, VaultService |
| `ActionRegistryChanged` | ActionService | ShopZoneController |
| `StatsChanged` | StatsService.increment() | ActionService, TapZoneController, UpgradeBarController |
| `ResourceChanged` | ResourceService | TapZoneController, ShopZoneController, UpgradeBarController |
| `GainApplied` | ResourceService.addGain() | FloatingTextUIComponent, UpgradeBarController |
| `Tick` | GameManager (every 0.1s) | GeneratorService, TapService, FrenzyService, InterestService, VaultService, UpgradeBarController, ShopZoneController, CrystalShardController, FloatingTextUIComponent |

---

## Sprites

| File | Used by |
|---|---|
| `gem_deposit.png` | Tap zone gem |
| `pickaxe_cursor.png` | Auto-cursor + player pickaxe |
| `tap_zone_background.png` | Tap zone background |
| `title_background.png` | Title screen background |
| `title_logo.png` | Title screen logo |
| `icon_critical.png` | Upgrade bar slot, shop item |
| `icon_frenzy.png` | Upgrade bar slot, shop item |
| `icon_vault.png` | Upgrade bar slot, shop item |
| `icon_income.png` | Upgrade bar slot, shop item |
| `icon_tab_mining.png` | Shop tab + mining items |
| `icon_tab_upgrade.png` | Shop tab + upgrade items |
| `icon_tab_coins.png` | Shop tab (Economy/Perks) |

---

## Notes

- No persistence — every reload resets all state.
- All gameplay runs client-side only (`isServerContext()` guards at service entry points).
- Cost curves: tap/generator buys use `costPow: 1.15`; all upgrades default to `costPow: 2`.
