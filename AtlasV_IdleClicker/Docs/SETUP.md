# Setup — Connecting gameplay code to the scene

The TS gameplay code lives in `scripts/`. After Horizon Studio rescans the project,
make sure the following entities are present and correctly wired in `space.hstf`.

---

## 1. GameManagerEntity

- **Name:** `GameManagerEntity`
- **Components:**
  - `TransformPlatformComponent`
  - **Script:** `GameManager`

Instantiates all services (Resource, Action, Stats, Tap, Generator, Crit, Frenzy,
Interest, Vault) and fires `Events.Tick` every `TICK_INTERVAL` (0.1s).
Without it nothing moves — no passive income, no timers, no cursor auto-clicks.

---

## 2. TitleScreenUI

- **Components:**
  - `CustomUiComponent` — `ScreenSpace`, xaml: `xaml/title_screen.xaml`, 1080×1920, `renderOrderOffset: 20`, `isInteractable: true`
  - **Script:** `TitleScreenController`

---

## 3. UpgradeBarUI

- **Components:**
  - `CustomUiComponent` — `ScreenSpace`, xaml: `xaml/upgrade_bar.xaml`, 1080×1920, `renderOrderOffset: 10`, `isInteractable: false`
  - **Script:** `UpgradeBarController`

---

## 4. TapZoneUI

- **Components:**
  - `CustomUiComponent` — `ScreenSpace`, xaml: `xaml/tap_zone.xaml`, 1080×1920, `renderOrderOffset: 5`, `isInteractable: false`
  - **Scripts:** `TapZoneController`, `CrystalShardController`, `FocusedInteractionSetup`

`FocusedInteractionSetup` enables FocusedInteractionService on client start, hides
default VR overlays (exit + emotes), and converts touch events into `Events.PlayerTap`.

---

## 5. ShopZoneUI

- **Components:**
  - `CustomUiComponent` — `ScreenSpace`, xaml: `xaml/shop_zone.xaml`, 1080×1920, `renderOrderOffset: -10`, `isInteractable: true`
  - **Script:** `ShopZoneController`

Setting `isInteractable: true` ensures shop touch events do not fall through to the
tap zone and double-register as gameplay taps.

---

## 6. FloatingTextUI

- **Components:**
  - `CustomUiComponent` — `ScreenSpace`, xaml: `xaml/floating_text.xaml`, 1080×1920, `renderOrderOffset: 15`, `isInteractable: false`
  - **Script:** `FloatingTextUIComponent`

Displays the "+N" floating text pool (20 dynamic slots). Listens to `Events.GainApplied`.

---

## Notes

- All gameplay runs **client-side only** — services guard `isServerContext()` at entry.
- **No persistence** — every reload resets all state.
- Tab icon assignment and action→tab routing live in `ShopZoneController`
  (`tabForActionId`, `iconForActionId`). Add new actions there when extending the game.
- Cost curves are controlled per-action via `costPow` in `Defs/ActionDefs.ts`.
  Tap/generator buys use `1.15`; upgrades default to `2`.
