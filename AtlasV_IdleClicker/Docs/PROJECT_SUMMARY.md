# Project Summary — AtlasV Idle Clicker

**Genre:** Idle Clicker
**Platform:** Meta Horizon Studio — Mobile Portrait 1080×1920 (Meta Quest / mobile)
**Art Style:** Stylised painterly fantasy temple / crystal-mine scene, golden HUD accents
**Engine:** Meta Worlds SDK (TypeScript) + XAML UI (Noesis), client-side only

---

## Game Overview

A fullscreen 2D idle/clicker. The player taps a gem deposit to earn gold, then spends gold in the shop to buy auto-cursor miners, passive generators (Jungle Shrine, Crystal Mine), and four upgrade perks (Critical, Frenzy, Interest, Vault). There is no win/loss condition — the loop is open-ended progression. No persistence: every reload resets all state.

---

## Technical Architecture

Service-oriented + MVVM. The single tick from `GameManager` drives all autonomous services.

```
GameManager.ts                — instantiates services, fires Events.Tick every 0.1s
scripts/Services/
├── ResourceService           — gold store + gain modifier pipeline
├── ActionService             — registry of all purchasable actions (drives shop UI)
├── StatsService              — global named counters (taps, purchases, gold earned)
├── TapService                — player tap → gold; auto-cursor (1..10) cycle
├── GeneratorService          — passive income per generator def + upgrade ranks
├── CritService               — chance-based gain multiplier (modifier on ResourceService)
├── FrenzyService             — tap-streak-triggered timed all-gain multiplier
├── InterestService           — % of current gold paid on a timer
└── VaultService              — lock 50% of gold for a duration, return with bonus
scripts/Defs/
├── ActionDefs.ts             — catalog of every buyable action (id, label, cost, unlock chain)
└── GeneratorDefs.ts          — catalog of generators (baseOutput, cycleTime, upgrade multipliers)
scripts/Utils/checkUnlock.ts  — shared dependency-check helper
scripts/Utils/hitTest.ts      — bbox helpers for matching PlayerTap coords to XAML elements
scripts/                       (ViewModels + Controllers, MVVM pairs per UI screen)
├── TitleScreenViewModel + TitleScreenController     (xaml/title_screen.xaml)
├── UpgradeBarViewModel + UpgradeBarController       (xaml/upgrade_bar.xaml)
├── TapZoneViewModel + TapZoneController             (xaml/tap_zone.xaml)
├── ShopZoneViewModel + ShopZoneController           (xaml/shop_zone.xaml)
├── FloatingTextItemViewModel + FloatingTextUIComponent (xaml/floating_text.xaml)
├── CrystalShardViewModel + CrystalShardController   (shard VFX on tap, lives in tap_zone.xaml)
└── FocusedInteractionSetup                          — touch → Events.PlayerTap with canvas coords
scripts/Types.ts              — single source of truth: enums, IAction, all Events.* payloads
scripts/Constants.ts          — tuning values; zero sibling imports
scripts/Assets.ts             — TextureAsset registry (shared instances)
```

---

## Current Content

- **Generators:** 2 (`Jungle Shrine` 2.5/s base / 5s cycle, `Crystal Mine` 40/s base / 10s cycle), each with 10 upgrade ranks unlocked in a chain (`upgrade.N.0`..`upgrade.N.9`).
- **Tap actions:** `tap.buy` (auto-cursor miner, max 10) and `tap.upgrade` (multiplier, max 50).
- **Perks:** 4 unlockable systems — `crit.*` (3 actions), `frenzy.*` (4 actions), `interest.*` (3 actions), `vault.*` (4 actions including `vault.lock`).
- **Total ActionDefs:** 33 entries (see `scripts/Defs/ActionDefs.ts`).
- **Resources:** 1 (`ResourceType.Gold`).
- **UI screens:** 5 — title, upgrade bar (top HUD), tap zone, shop zone (bottom), floating text overlay.
- **Sprites on disk:** 15 PNGs in `sprites/`.

---

## Scene Structure

- **`space.hstf`** — main scene. Skybox disabled. All gameplay via fullscreen `CustomUiComponent` ScreenSpace UIs.
- **`player.hstf`** — player template, avatar scale = 0 (player is invisible).

| Entity | renderOrderOffset | XAML | isInteractable |
|---|---|---|---|
| TitleScreenUI | 20 | `xaml/title_screen.xaml` | true |
| FloatingTextUI | 15 | `xaml/floating_text.xaml` | false |
| UpgradeBarUI | 10 | `xaml/upgrade_bar.xaml` | false |
| TapZoneUI | 5 | `xaml/tap_zone.xaml` | false |
| ShopZoneUI | −10 | `xaml/shop_zone.xaml` | true |
| GameManagerEntity | — | (no UI) | — |

All UI canvases are 1080×1920 ScreenSpace. See `Docs/SETUP.md` for the component wiring contract per entity.

---

## Events (single source of truth: `scripts/Types.ts`)

| Event | Emitter | Listeners |
|---|---|---|
| `PlayerTap` | `FocusedInteractionSetup` (real touch), `TapService` (auto-cursor) | `TapService`, `FrenzyService`, `CrystalShardController`, `TapZoneController` |
| `ActionTriggered` | `ActionService.trigger()` (from shop button) | `TapService`, `GeneratorService`, `CritService`, `FrenzyService`, `InterestService`, `VaultService` |
| `ActionRegistryChanged` | `ActionService` | `ShopZoneController` |
| `StatsChanged` | `StatsService.increment()` | `ActionService`, `TapZoneController`, `UpgradeBarController` |
| `ResourceChanged` | `ResourceService` | `TapZoneController`, `ShopZoneController`, `UpgradeBarController` |
| `GainApplied` | `ResourceService.addGain()` | `FloatingTextUIComponent`, `UpgradeBarController` |
| `Tick` | `GameManager` (every `TICK_INTERVAL` = 0.1s) | every service with a heartbeat + several controllers |

---

## Key Design Principles

- **Single tick.** `GameManager` is the only driver. Services subscribe to `Events.Tick`; no `setTimeout` / `setInterval` for gameplay logic.
- **Client-side only.** Every service guards `NetworkingService.isServerContext()` at entry; nothing runs on the server.
- **Modifier pipeline for gains.** Crit and Frenzy do not double-write to `ResourceService` — they register a modifier function with priority. All gold flows through `ResourceService.addGain()`.
- **Type isolation.** `Types.ts` and `Constants.ts` import nothing from siblings — they're the dependency floor.
- **Action declarations are live.** Services call `ActionService.declare(id, factory)` once in `onReady`; the factory is re-run on every `refreshDeclared()` so cost/enabled state stay current without bookkeeping.
- **Cost curves in defs, not logic.** `ActionDefs.costPow` controls scaling (1.15 for buys, 2.0 for upgrades by default).
- **No persistence.** Reload = reset. There is no save system.
