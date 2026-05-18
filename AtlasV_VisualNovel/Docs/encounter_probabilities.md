# Encounter Recipes

Derived from [EncounterSystem.ts](../scripts/EncounterSystem.ts) and the per-character `recipes` arrays in [scripts/CharacterData_*.ts](../scripts/).

## Algorithm — deterministic, zero RNG

Each character declares a list of **recipes**: stable slots identified by an id, each pinned to a `(zone, phase, lure)` triplet. The encounter system selects exactly one recipe based on the cast inputs.

```
input:  zone (from cast power)  +  phase (Day | Night)  +  equippedLureId
```

1. **Drop ended characters** — anyone with `${id}.ending_complete = true` is removed.
2. **Filter active recipes** — for each remaining character, keep recipes that are *active* given the current flag state:
   - `recipe.${fishId}.${recipeId}` flag set truthy → active
   - flag set falsy → inactive
   - flag absent and `recipe.initial === true` → active by default
   - otherwise → inactive
3. **Match zone + phase exactly.**
4. **Lure match** — split candidates into two buckets:
   - *Specific*: `recipe.lure === equippedLureId`
   - *Wildcard*: `recipe.lure === ANY_LURE`
5. **Specific beats wildcard** — if any specific match exists, wildcards are discarded.
6. **Tie-break** — sort by `recipe.priority` descending (main fish use `priority: 1`, ambient NPCs default to `0`), then `fishId` alphabetically.
7. **Winner is the head of the sorted pool.** On match, set the one-shot `from.${fishId}.${recipeId}` signal flag and launch the fish's entry knot. If no pool has anything → `NothingBites`.

Ink controls recipe activation by setting `recipe.<fishId>.<recipeId>` flags at story checkpoints — this is how arcs unlock new encounter slots as the player progresses.

## Cast power → zone

| Power | Zone |
|---|---|
| 0–33 | `near` |
| 34–66 | `mid` |
| 67–100 | `far` |

## Phase

The player toggles Day/Night manually from a button on the idle screen. Time never advances on its own; there is no clock.

## Recipe tables

### Long-arc characters (`priority: 1`)

**Nereia (Koi)**

| Recipe | Zone | Phase | Lure | Initial |
|---|---|---|---|---|
| `home` | far | Day | any | ✓ |
| `homeNight` | far | Night | any | ✓ |
| `anomalyT2` | far | Day | gold_teardrop | — |
| `directiveT3` | far | Day | gold_teardrop | — |
| `inheritanceT4` | near | Day | gold_teardrop | — |
| `dawnT5` | far | Night | any | — |

**Kasha (Betta)**

| Recipe | Zone | Phase | Lure | Initial |
|---|---|---|---|---|
| `home` | mid | Day | any | ✓ |
| `homeNight` | mid | Night | any | ✓ |
| `challenge` | mid | Day | red_spinner | — |
| `corner` | mid | Night | bare_hook | — |
| `offer` | mid | Night | any | — |
| `name` | mid | Day | any | — |

**Fugu (Pufferfish)**

| Recipe | Zone | Phase | Lure | Initial |
|---|---|---|---|---|
| `home` | near | Day | any | ✓ |
| `homeNight` | near | Night | any | ✓ |
| `nightT2` | near | Night | any | — |
| `spinnerT3` | near | Night | red_spinner | — |
| `parkT4` | near | Day | any | — |
| `climaxT5` | near | Day | feather_fly | — |

### Ambient NPCs (`priority: 0`, single recipe each)

| Character | Zone | Phase | Lure |
|---|---|---|---|
| Perch | near | Day | any |
| Eel | near | Night | any |
| Trout | mid | Day | any |
| Catfish | mid | Night | any |
| Carp | far | Day | any |
| Pike | far | Night | any |

Each zone × phase grid cell has exactly one ambient NPC plus the main fish whose `home` lands there, so something always bites once initial recipes are active.

## NothingBites

When the resolved pool is empty (e.g. all initial recipes for a slot have been deactivated and no other recipe matches), the cast lands but no fish approaches. The state lasts ~2.5s, then the player returns to LakeIdle.
