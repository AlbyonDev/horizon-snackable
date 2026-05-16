# Crystal Vanguard — Gameplay Reference

This document explains how the game works end-to-end and maps each mechanic to the code that drives it. It also lists every extension axis so new content can be added without touching unrelated systems.

---

## 1. Core Loop

```
Title Screen → Dungeon Selection → [Roster Management] → Dungeon Run
  └─ Room 1..N  →  Combat  →  Room Reward  →  (repeat)
  └─ Room N (Boss) → Victory/Defeat → Back to Dungeon Selection
```

State is tracked by `GameState` enum in [Types.ts](../scripts/Types.ts):  
`Title → Playing → DungeonSelection → RosterManagement → InDungeon`

---

## 2. Match-3 Board

**Grid:** 7 columns × 8 rows (`BOARD_COLS`/`BOARD_ROWS` in [Constants.ts](../scripts/Constants.ts))  
**Gem types:** 5 colors — Red, Blue, Green, Yellow, Purple

### Swap & Match Flow

1. Player taps a gem → taps an adjacent gem → `InputHandler` emits a `SwapRequest`
2. `SwapHandler.startSwap()` validates via `swapProducesMatch()` ([MatchValidator.ts](../scripts/MatchValidator.ts))
3. If **valid**: swap animation plays, gems are exchanged in the board array, `MatchResolver.process()` runs
4. If **invalid**: forward-then-return animation, no board change

### Match Detection ([MatchDetector.ts](../scripts/MatchDetector.ts))

| Shape | Mana gained |
|-------|-------------|
| 3 in a row/column | +3 |
| 4 in a row/column | +5 |
| 5 in a row/column | +8 |
| L or T shape (5+ gems) | +10 |

### Cascade

After each board fill, `detectMatches()` runs again. If new matches are found, `MatchResolver.process()` fires again with `registerCascade()` incrementing the cascade counter. This repeats until no matches remain.

### Anti-Block Shuffle ([ShuffleHandler.ts](../scripts/ShuffleHandler.ts))

After every board state change, `hasValidMoves()` ([ValidMoveChecker.ts](../scripts/ValidMoveChecker.ts)) scans all possible swaps. If none produce a match, a full board shuffle triggers: fade-out → random refill (match-free, valid-move-guaranteed) → fade-in. No mana or damage during a shuffle.

---

## 3. Combat

### Turn Structure

```
PLAYER TURN
  └─ One gem swap → match resolution → cascade loop → ApplyingDamage phase
  └─ (optional) Activate hero powers before/after swap
ENEMY TURN
  └─ Front enemy deals physical damage to front hero
  └─ (future) Enemy powers fire when mana threshold met
```

Driven by `CombatFlowController` ([CombatFlowController.ts](../scripts/CombatFlowController.ts)):  
`PlayerTurn → CombatAnimating → ResolvingDeaths → ReorganizingTeam → (EnemyTurn | PlayerTurn | CombatOver)`

### Damage Formula

**Match damage:**
```
damage = ATK(hero_for_color) × Affinity[hero][color] × MatchBonus(matchSize) × LevelMultiplier(heroLevel)
```

**Enemy physical attack:**
```
damage = ATK(front_enemy)   (no randomness)
```

**Power damage:**
```
damage = ATK(hero) × power.atkMultiplier × LevelMultiplier(heroLevel)
```

All formulas live in [Damage.ts](../scripts/Damage.ts). Level multipliers in [RosterManager.ts](../scripts/RosterManager.ts).

### Front-Hero System

Each gem color is assigned to the hero with the highest affinity for it (`TeamState.assignColors()`). When a match occurs, the assigned hero is promoted to "front" — they take the next enemy hit and their portrait scales up. On hero death, colors are immediately reassigned to surviving heroes.

### Status Effects ([StatusEffectEngine.ts](../scripts/StatusEffectEngine.ts))

| Type | Effect |
|------|--------|
| `DOT` | Damage per turn applied at turn end |
| `REGEN` | HP gain per turn |
| `SHIELD` | Absorbs N hits before expiring |
| `BUFF_ATK` | ATK multiplier for N turns |
| `DEBUFF_ATK` | ATK multiplier (< 1) for N turns |

---

## 4. Mana & Powers

### Mana Bank ([ManaBank.ts](../scripts/ManaBank.ts))

5 independent banks, one per color. Cap: 20 per color. Overflow is discarded. Mana resets on dungeon exit.

### Power Activation Flow

1. Mana ≥ cost → power-ready indicator shown on hero portrait
2. Player taps portrait → `PowerActivationController.handleHeroTap()` opens preview panel
3. Player confirms → mana spent → cinematic starts (`PowerAnimationSystem`)
4. `ApplyEffect` phase fires `PowerResolver.executeHero()` → damage/heal/status applied
5. Cinematic settles → input unlocked

### Power Effect Types ([PowerTypes.ts](../scripts/PowerTypes.ts))

| Type | Description |
|------|-------------|
| `DAMAGE_DIRECT` | Instant ATK-based damage to front or all enemies |
| `DAMAGE_BURST` | AoE damage to all enemies |
| `DAMAGE_DOT` | Applies a DOT status to target(s) |
| `HEAL` | Heals self or all allies |
| `SHIELD` | Gives N-hit shield to self or all allies |
| `BUFF_ATK` | ATK multiplier to self or all allies |
| `DEBUFF_ATK` | ATK reduction on target(s) |
| `MANA_BOOST` | Instantly adds mana to a color |
| `BOARD_SHUFFLE` | Triggers a board reshuffle (+ optional mana boost) |
| `GEM_CONVERT` | Converts N gems of one color to another on the board |
| `GEM_DESTROY_DAMAGE` | Destroys all gems of a color; damage scales with count |
| `HEAL_DOT` | Applies a REGEN status to self or all allies |

Powers also support a `secondaryEffect` for combo effects (e.g. Pyromancer converts gems then does a burst).

---

## 5. Dungeon System

Dungeons are sequences of `RunRoom` objects ([DungeonTypes.ts](../scripts/DungeonTypes.ts)):
- `RoomType.Combat` — standard enemy encounter
- `RoomType.Elite` — tougher enemies, better rewards
- `RoomType.Boss` — single boss enemy with higher HP/ATK, grants hero card reward

Room sequences are generated by `EncounterBuilder.ts` using pools from `EncounterPool.ts`. Enemy level scales with room depth.

### Persistence

`DungeonState` tracks the active run sequence and room index. If the player quits mid-run, the sequence and index are saved and restored on next load.

---

## 6. Hero Progression

### XP & Levels

- XP awarded per room clear, split evenly among alive roster heroes
- XP to level N: `N × 100` (100 for L2, 200 for L3, …, 900 for L10)
- Level cap: 10
- Level multiplier: linear `1.0×` (L1) → `2.0×` (L10)
- Multiplier applies to all match damage and all power damage

### HP & Offline Regen

- HP persists across rooms and saves
- Alive heroes regen 1 HP/minute offline
- KO'd heroes (0 HP) resurrect after 60 minutes, then regen normally
- Player can spend 50 gold to instantly heal a KO'd hero

---

## 7. Save System

`SaveManagerComponent` (server-owned, networked) handles PVar read/write. `GameComponent` emits `PuzzleSaveRequestEvent` / `PuzzleLoadRequestEvent`; the server component responds with `PuzzleLoadCompleteEvent`.

Auto-save triggers after: room victory, defeat, and flee. Save data version: **2**.

---

## 8. Extension Axes

### Add a New Hero

1. Add an entry to `HERO_CATALOG` in [HeroCatalog.ts](../scripts/HeroCatalog.ts) with `id`, `name`, `baseHp`, `baseAtk`, `affinities` (5 floats), and a `power` definition
2. Add a portrait texture reference in [Assets.ts](../scripts/Assets.ts) and wire it into `getHeroTexture()` in `HeroCatalog.ts`
3. No other files need touching — the roster, collection, color-assignment, and combat systems all work off the catalog

### Add a New Power Effect Type

1. Add the enum value to `PowerEffectType` in [PowerTypes.ts](../scripts/PowerTypes.ts)
2. Add a handler method in `PowerResolver.dispatchHero()` (or `dispatchEnemy()`) in [PowerSystem.ts](../scripts/PowerSystem.ts)
3. Add a cinematic phase mapping in [PowerAnimationSystem.ts](../scripts/PowerAnimationSystem.ts) if it needs a distinct visual
4. Add a particle/VFX case in [PowerEffectParticles.ts](../scripts/PowerEffectParticles.ts) if it needs in-zone effects
5. Assign the new type to heroes in `HeroCatalog.ts`

### Add a New Biome / Dungeon

1. Define enemy templates for the biome in `EnemyCatalog.ts` (or extend with new themed enemies)
2. Add an encounter pool entry in [EncounterPool.ts](../scripts/EncounterPool.ts)
3. Add the dungeon definition (name, rooms, background asset paths) to the dungeon array consumed by `DungeonSelectionComponent`
4. Provide background sprite assets and register them in `Assets.ts`

### Add a New Status Effect

1. Add the enum value to `StatusEffectType` in [PowerTypes.ts](../scripts/PowerTypes.ts)
2. Add tick logic in `StatusEffectEngine.tickDots()` or a new method in [StatusEffectEngine.ts](../scripts/StatusEffectEngine.ts)
3. Add the `effectiveAtk()` modifier branch if the effect modifies ATK
4. Add visual feedback in `CombatFlowController.tickStatusEffects()` (popup spawn)

### Add a New Enemy

1. Add a template to `EnemyCatalog.ts` (same structure as heroes + `manaGain` per color and a `power` definition)
2. Add to the appropriate encounter pool in `EncounterPool.ts`
3. Provide sprite assets (idle/attack/hurt) and register in `Assets.ts`

### Add a New Room Type

1. Add the value to the `RoomType` enum in [DungeonTypes.ts](../scripts/DungeonTypes.ts)
2. Handle the new type in `EncounterBuilder.ts` (or a new handler)
3. Handle it in `GameComponent`'s room-start logic (currently branches on `RoomType.Combat`/`Boss`)

---

## 9. Known Issues & Fragility Points

| Severity | Location | Description |
|----------|----------|-------------|
| Medium | `SaveManagerComponent.onSaveRequest` | Retry uses `setTimeout` + fire-and-forget; no final fallback if second attempt also fails |
| Medium | `CombatFlowController.startEnemyTurn` | Enemy powers (`executeEnemyPower`) are not wired — enemies only perform basic attacks |
| Low | `TeamState.bestHeroIdForColor` | Crashes if `pool` is empty (called only with living heroes, but worth asserting) |
| Low | `RosterManager.restoreFromSave` | `heroHp.max` is restored verbatim from save without re-deriving from level, so a corrupt save could carry an out-of-range max |
| Low | `MatchResolver.resolveEnemyTargets` | `SINGLE_ENEMY` always returns `[0]`; should return `[frontEnemyIndex]` |
| Low | `ShuffleHandler` | `MAX_SHUFFLE_ATTEMPTS = 50` is a safety net, but if hit in production the board may have no valid move; a `console.warn` is emitted but no player-facing feedback |
