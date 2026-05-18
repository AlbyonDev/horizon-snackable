# Encounter Probabilities

Derived from [EncounterSystem.ts](../scripts/EncounterSystem.ts) and the per-character data in [scripts/CharacterData_*.ts](../scripts/). Updated for the full 9-character roster.

## Algorithm

1. **Filter by ending** — characters with `${id}.ending_complete = true` are removed
2. **Filter by quest** — characters whose `questRequirement` is unmet are removed (they never appear before their quest opens)
3. **Filter by zone** — keep only characters whose `lakeZones` includes the cast zone (`near` 0–33, `mid` 34–66, `far` 67–100)
4. **Weighted random selection**, weight per character:

```
weight = encounterRate × lureModifier × questBoost

  encounterRate     uniformly 1.0 for every character (no per-character rarity)
  lureModifier      ×2.0  if equipped lure ∈ preferredLures
                    ×0.5  if equipped lure ∈ dislikedLures
                    ×1.0  otherwise
  questBoost        ×3.0  if quest was recently completed
                    ×1.0  otherwise
```

## Roster (lure preferences and zones)

| Character | Zones | Preferred lures | Disliked lures | encounterRate |
|---|---|---|---|---|
| **Nereia** | near, mid | gold_teardrop, shell_hook | red_spinner | 1.0 |
| **Kasha** | mid, far | red_spinner, bone_whistle* | gold_teardrop | 1.0 |
| **Fugu** | near, far | feather_fly, red_spinner | gold_teardrop, bare_hook | 1.0 |
| **Catfish** | mid | — | — | 1.0 |
| **Carp** | far | — | — | 1.0 |
| **Perch** | near | — | — | 1.0 |
| **Eel** | far | — | — | 1.0 |
| **Pike** | mid | — | — | 1.0 |
| **Trout** | near | — | — | 1.0 |

\* `bone_whistle` is referenced by Kasha but not defined in [LureData.ts](../scripts/LureData.ts); it has no effect.

## Zone roster

| Zone | Power range | Characters |
|---|---|---|
| **Near** | 0–33% | Nereia, Fugu, Perch, Trout |
| **Mid** | 34–66% | Nereia, Kasha, Catfish, Pike |
| **Far** | 67–100% | Kasha, Fugu, Carp, Eel |

> The roster is wider than it used to be — every zone has at least four candidates, so `NothingBites` only triggers in late-game when most endings have completed.

---

## NEAR ZONE (0–33%)

Candidates: **Nereia, Fugu, Perch, Trout**.

### Weights by equipped lure

| Lure | Nereia | Fugu | Perch | Trout | Total |
|---|---|---|---|---|---|
| none | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| red_spinner | 0.5 *(disliked)* | 2.0 *(preferred)* | 1.0 | 1.0 | 4.5 |
| gold_teardrop | 2.0 *(preferred)* | 0.5 *(disliked)* | 1.0 | 1.0 | 4.5 |
| feather_fly | 1.0 | 2.0 *(preferred)* | 1.0 | 1.0 | 5.0 |
| night_lure | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| shell_hook | 2.0 *(preferred)* | 1.0 | 1.0 | 1.0 | 5.0 |
| bare_hook | 1.0 | 0.5 *(disliked)* | 1.0 | 1.0 | 3.5 |

### Probabilities by equipped lure

| Lure | Nereia | Fugu | Perch | Trout |
|---|---|---|---|---|
| **none** | 25.0% | 25.0% | 25.0% | 25.0% |
| **red_spinner** | 11.1% | **44.4%** | 22.2% | 22.2% |
| **gold_teardrop** | **44.4%** | 11.1% | 22.2% | 22.2% |
| **feather_fly** | 20.0% | **40.0%** | 20.0% | 20.0% |
| **night_lure** | 25.0% | 25.0% | 25.0% | 25.0% |
| **shell_hook** | **40.0%** | 20.0% | 20.0% | 20.0% |
| **bare_hook** | 28.6% | 14.3% | 28.6% | 28.6% |

### Best lures (Near zone)

| To find… | Best lure | Probability |
|---|---|---|
| Nereia | gold_teardrop | 44.4% |
| Fugu | red_spinner | 44.4% |
| Perch | bare_hook or shell_hook* | 28.6% / 20.0% |
| Trout | bare_hook* | 28.6% |

\* Perch / Trout have no lure preferences, so the best result is using a lure that *suppresses* a rival; `bare_hook` halves Fugu's weight, helping the no-preference fish.

---

## MID ZONE (34–66%)

Candidates: **Nereia, Kasha, Catfish, Pike**.

### Weights by equipped lure

| Lure | Nereia | Kasha | Catfish | Pike | Total |
|---|---|---|---|---|---|
| none | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| red_spinner | 0.5 *(disliked)* | 2.0 *(preferred)* | 1.0 | 1.0 | 4.5 |
| gold_teardrop | 2.0 *(preferred)* | 0.5 *(disliked)* | 1.0 | 1.0 | 4.5 |
| feather_fly | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| night_lure | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| shell_hook | 2.0 *(preferred)* | 1.0 | 1.0 | 1.0 | 5.0 |
| bare_hook | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |

### Probabilities

| Lure | Nereia | Kasha | Catfish | Pike |
|---|---|---|---|---|
| **none** | 25.0% | 25.0% | 25.0% | 25.0% |
| **red_spinner** | 11.1% | **44.4%** | 22.2% | 22.2% |
| **gold_teardrop** | **44.4%** | 11.1% | 22.2% | 22.2% |
| **feather_fly** | 25.0% | 25.0% | 25.0% | 25.0% |
| **night_lure** | 25.0% | 25.0% | 25.0% | 25.0% |
| **shell_hook** | **40.0%** | 20.0% | 20.0% | 20.0% |
| **bare_hook** | 25.0% | 25.0% | 25.0% | 25.0% |

### Best lures (Mid zone)

| To find… | Best lure | Probability |
|---|---|---|
| Nereia | gold_teardrop | 44.4% |
| Kasha | red_spinner | 44.4% |
| Catfish | any neutral | 25.0% |
| Pike | any neutral | 25.0% |

---

## FAR ZONE (67–100%)

Candidates: **Kasha, Fugu, Carp, Eel**.

### Weights by equipped lure

| Lure | Kasha | Fugu | Carp | Eel | Total |
|---|---|---|---|---|---|
| none | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| red_spinner | 2.0 *(preferred)* | 2.0 *(preferred)* | 1.0 | 1.0 | 6.0 |
| gold_teardrop | 0.5 *(disliked)* | 0.5 *(disliked)* | 1.0 | 1.0 | 3.0 |
| feather_fly | 1.0 | 2.0 *(preferred)* | 1.0 | 1.0 | 5.0 |
| night_lure | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| shell_hook | 1.0 | 1.0 | 1.0 | 1.0 | 4.0 |
| bare_hook | 1.0 | 0.5 *(disliked)* | 1.0 | 1.0 | 3.5 |

### Probabilities

| Lure | Kasha | Fugu | Carp | Eel |
|---|---|---|---|---|
| **none** | 25.0% | 25.0% | 25.0% | 25.0% |
| **red_spinner** | **33.3%** | **33.3%** | 16.7% | 16.7% |
| **gold_teardrop** | 16.7% | 16.7% | **33.3%** | **33.3%** |
| **feather_fly** | 20.0% | **40.0%** | 20.0% | 20.0% |
| **night_lure** | 25.0% | 25.0% | 25.0% | 25.0% |
| **shell_hook** | 25.0% | 25.0% | 25.0% | 25.0% |
| **bare_hook** | 28.6% | 14.3% | 28.6% | 28.6% |

### Best lures (Far zone)

| To find… | Best lure | Probability |
|---|---|---|
| Kasha | red_spinner | 33.3% |
| Fugu | feather_fly | 40.0% |
| Carp | gold_teardrop* | 33.3% |
| Eel | gold_teardrop* | 33.3% |

\* Carp / Eel have no preferences; equipping `gold_teardrop` suppresses both Kasha and Fugu, boosting the neutral fish.

---

## "Recently completed" boost (×3.0)

When a character's quest is recently completed, the system multiplies their weight by **×3.0** on top of the lure modifier. Stacking effect:

- Preferred lure + recently completed = `1.0 × 2.0 × 3.0` = **×6.0**
- Neutral lure + recently completed = `1.0 × 1.0 × 3.0` = **×3.0**
- Disliked lure + recently completed = `1.0 × 0.5 × 3.0` = **×1.5**

### Example: Mid zone, gold_teardrop equipped, Nereia recently completed

| Character | Base | Lure | Quest | Final | Probability |
|---|---|---|---|---|---|
| Nereia | 1.0 | ×2.0 | ×3.0 | **6.0** | **63.2%** |
| Kasha | 1.0 | ×0.5 | ×1.0 | 0.5 | 5.3% |
| Catfish | 1.0 | ×1.0 | ×1.0 | 1.0 | 10.5% |
| Pike | 1.0 | ×1.0 | ×1.0 | 1.0 | 10.5% |
| | | | | **Total: 9.5** | |

---

## "Nothing Bites" conditions

EncounterSystem returns `null` (→ `NothingBites` phase, 2.5s timeout) when:

1. All zone-matched characters have `ending_complete = true`
2. No zone-matched character passes the quest filter
3. The zone is empty after filtering for any reason

With four candidates per zone in the current roster, `NothingBites` should only trigger in late-game when the player has caught/released most of the fish in a zone.

---

## Optimal lure selection cheat sheet

| Target | Zone | Best lure | P(target) |
|---|---|---|---|
| Nereia | Near | gold_teardrop | 44.4% |
| Nereia | Mid | gold_teardrop | 44.4% |
| Kasha | Mid | red_spinner | 44.4% |
| Kasha | Far | red_spinner | 33.3% |
| Fugu | Near | red_spinner | 44.4% |
| Fugu | Far | feather_fly | 40.0% |
| Catfish | Mid | any neutral | 25.0% |
| Carp | Far | gold_teardrop | 33.3% |
| Perch | Near | bare_hook | 28.6% |
| Eel | Far | gold_teardrop | 33.3% |
| Pike | Mid | any neutral | 25.0% |
| Trout | Near | bare_hook | 28.6% |

---

## Notes

- `bone_whistle` is listed as preferred by Kasha but is not registered in [LureData.ts](../scripts/LureData.ts) — no effect.
- All `encounterRate` values are uniformly 1.0; if per-character rarity is introduced later, base weights scale proportionally.
- The "recently completed" boost is transient and hard to control deliberately — lure + zone is the player's primary lever.
- The 6 NPC characters have no lure preferences, so the only way to bias toward them is to *suppress* the preference-having fish in their zone with a disliked lure.
