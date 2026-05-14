# Project Summary — Crystal Vanguard

**Genre:** Match-3 RPG  
**Platform:** Meta Horizon Studio — Mobile Portrait 1080×1920  
**Art Style:** 2D Anime JRPG with chibi proportions  
**Engine:** DrawingSurface API + XAML UI (Noesis)  
**Current Milestone:** Milestone 8 complete — Per-Hero XP & Leveling

---

## Overview

Crystal Vanguard is a turn-based Match-3 RPG. The player swaps colored gems on a 7×8 board to deal damage to enemies and fill mana banks that power hero abilities. The game runs through procedural dungeon runs made of combat rooms and a final boss.

---

## Completed Milestones

| # | Feature |
|---|---------|
| 1 | Match-3 board: swap, match detection (3/4/5/L-T), cascade, anti-block shuffle, mana bank |
| 2 | Hero portraits, front-hero system, depth layout, color assignments |
| 3 | Full combat loop: player damage, enemy AI, win/loss, flee, death & color reassignment |
| 4 | Power system: 8 effect types, mana costs, fullscreen cinematic, preview panel |
| 5 | Dungeon system: 3 dungeons × 3 rooms, room transitions, XP/gold rewards |
| 6 | Hero roster: scrollable collection, detail overlay, 3-slot party selection, HP tracking |
| 7 | Persistent save/load via PlayerVariablesService (with auto-save and retry) |
| 8 | Per-hero XP/level (1–10), linear damage multiplier 1.0×–2.0×, migration from global XP |

---

## Technical Architecture

```
GameComponent           — top-level orchestrator, frame loop, event routing
├── BoardState          — gem grid data
├── InputHandler        — touch → grid coordinates, hero tap detection
├── SwapHandler         — swap animation + validation
├── AnimationHandler    — destruction → fall → spawn pipeline
├── ShuffleHandler      — anti-block board reshuffle animation
├── MatchResolver       — match detection, mana award, staggered lunge/damage visuals
├── CombatFlowController — phase machine (PlayerTurn → EnemyTurn → Deaths → Reorg)
├── TeamState           — heroes + enemies, color assignments, visual states
├── PowerActivationController — preview panel, confirm, cinematic, effect dispatch
├── PowerResolver       — 8 power effect handlers (pure logic, no rendering)
├── DungeonState        — room sequence, progress tracking, gold
├── RoomTransitionHandler — XP distribution, status-effect reset between rooms
├── RosterManager       — hero collection, roster slots, HP/XP persistence, offline regen
├── ManaBank            — per-color mana (cap 20), spend/gain
└── SaveManagerComponent — server-side PVar save/load (networked, server-owned)
```

**Key design principles:**
- All animation is frame-driven (delta-time, no setTimeout for gameplay logic)
- Damage is calculated instantly; visuals are queued on an internal timeline (`MatchResolver`)
- `CombatFlowController` is a pure state machine polled every frame — no async callbacks
- Power effects are dispatched through `PowerResolver` (pure class, no side effects) then applied by `PowerActivationController` which owns the cinematic

---

## Current Content

- **Heroes:** 16 defined in `HeroCatalog.ts`, player starts with 3 free
- **Enemies:** Catalog in `EnemyCatalog.ts`, encounter pools by biome in `EncounterPool.ts`
- **Dungeons:** 3 (Enchanted Forest, Shadow Crypt, Volcanic Depths), each with 3 rooms
- **Power types:** 12 (`DAMAGE_DIRECT`, `DAMAGE_BURST`, `DAMAGE_DOT`, `HEAL`, `SHIELD`, `DEBUFF_ATK`, `BUFF_ATK`, `MANA_BOOST`, `BOARD_SHUFFLE`, `GEM_CONVERT`, `GEM_DESTROY_DAMAGE`, `HEAL_DOT`)

---

## Known Issues & Fragilities

See [GAMEPLAY.md](./GAMEPLAY.md) for the full list. Critical items:

1. **SaveManagerComponent retry** — on player-not-found, retry fires via `setTimeout` and returns immediately without awaiting; the caller has no confirmation a save landed. Low blast-radius (server-side only) but worth converting to a Promise chain.
2. **Hero/enemy index bounds** — `getHeroIndexForColor()` falls back to `0` on missing assignment. Correct but silent; a stricter assert in debug builds would surface bad states earlier.
3. **Level cap not clamped on load** — `restoreFromSave` calls `Math.min(MAX_HERO_LEVEL, Math.max(1, entry.level))` ✓ but `heroHp.max` is not re-derived from the capped level, so a corrupted save with `level: 999` would use the stored HP max verbatim.

---

## Next Steps

- **Milestone 9:** Hero unlocking / gacha (purchase + random draw from `HeroCatalog`)
- Extend dungeon count (more biomes)
- Enemy powers: wire `executeEnemyPower` into the `CombatFlowController` enemy-turn path (currently only basic attacks fire)
