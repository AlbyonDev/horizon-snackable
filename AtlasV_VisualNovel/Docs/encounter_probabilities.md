# Encounter Probabilities

Generated from the EncounterSystem algorithm analysis.

## Algorithm Summary

1. **Filter by ending** — characters with `{id}.ending_complete` flag are removed
2. **Filter by quest** — characters with incomplete quest requirements never appear (weight 0)
3. **Filter by zone** — only characters whose `lakeZones` includes the cast zone remain
4. **Weighted selection** with modifiers:
   - Base weight = `encounterRate` (all characters currently = 1.0)
   - Recently quest-completed: **×3.0** boost
   - Preferred lure equipped: **×2.0** boost
   - Disliked lure equipped: **×0.5** penalty
   - Neutral (no preference): **×1.0** (unchanged)

## Character Data

| Character | Zones | Preferred Lures | Disliked Lures | encounterRate |
|-----------|-------|-----------------|----------------|---------------|
| **Nereia** | near, mid | gold_teardrop, shell_hook | red_spinner | 1.0 |
| **Kasha** | mid, far | red_spinner, bone_whistle | gold_teardrop | 1.0 |
| **Fugu** | near, far | feather_fly, red_spinner | gold_teardrop, bare_hook | 1.0 |
| **Catfish** | mid | _(none)_ | _(none)_ | 1.0 |

## Zone Breakdown

| Zone | Power Range | Available Characters |
|------|-------------|---------------------|
| **Near** | 0–33% | Nereia, Fugu |
| **Mid** | 34–66% | Nereia, Kasha, Catfish |
| **Far** | 67–100% | Kasha, Fugu |

---

## NEAR ZONE (Power 0–33%)

**Nereia** and **Fugu** are available.

### Weights by Lure

| Lure | Nereia | Fugu | Total |
|------|--------|------|-------|
| none | 1.0 | 1.0 | 2.0 |
| red_spinner | 0.5 _(disliked)_ | 2.0 _(preferred)_ | 2.5 |
| gold_teardrop | 2.0 _(preferred)_ | 0.5 _(disliked)_ | 2.5 |
| feather_fly | 1.0 | 2.0 _(preferred)_ | 3.0 |
| night_lure | 1.0 | 1.0 | 2.0 |
| shell_hook | 2.0 _(preferred)_ | 1.0 | 3.0 |
| bare_hook | 1.0 | 0.5 _(disliked)_ | 1.5 |

### Probabilities by Lure

| Lure | Nereia | Fugu |
|------|--------|------|
| **none** | 50.0% | 50.0% |
| **red_spinner** | 20.0% | **80.0%** |
| **gold_teardrop** | **80.0%** | 20.0% |
| **feather_fly** | 33.3% | **66.7%** |
| **night_lure** | 50.0% | 50.0% |
| **shell_hook** | **66.7%** | 33.3% |
| **bare_hook** | **66.7%** | 33.3% |

### Best Strategy (Near Zone)

| To find... | Best lure | Probability |
|------------|-----------|-------------|
| Nereia | gold_teardrop | 80.0% |
| Fugu | red_spinner | 80.0% |

---

## MID ZONE (Power 34–66%)

Three characters are available: Nereia, Kasha, Catfish.

### Weights by Lure

| Lure | Nereia | Kasha | Catfish | Total |
|------|--------|-------|---------|-------|
| none | 1.0 | 1.0 | 1.0 | 3.0 |
| red_spinner | 0.5 _(disliked)_ | 2.0 _(preferred)_ | 1.0 | 3.5 |
| gold_teardrop | 2.0 _(preferred)_ | 0.5 _(disliked)_ | 1.0 | 3.5 |
| feather_fly | 1.0 | 1.0 | 1.0 | 3.0 |
| night_lure | 1.0 | 1.0 | 1.0 | 3.0 |
| shell_hook | 2.0 _(preferred)_ | 1.0 | 1.0 | 4.0 |
| bare_hook | 1.0 | 1.0 | 1.0 | 3.0 |

### Probabilities by Lure

| Lure | Nereia | Kasha | Catfish |
|------|--------|-------|---------|
| **none** | 33.3% | 33.3% | 33.3% |
| **red_spinner** | 14.3% | **57.1%** | 28.6% |
| **gold_teardrop** | **57.1%** | 14.3% | 28.6% |
| **feather_fly** | 33.3% | 33.3% | 33.3% |
| **night_lure** | 33.3% | 33.3% | 33.3% |
| **shell_hook** | **50.0%** | 25.0% | 25.0% |
| **bare_hook** | 33.3% | 33.3% | 33.3% |

### Best Strategy (Mid Zone)

| To find... | Best lure | Probability |
|------------|-----------|-------------|
| Nereia | gold_teardrop | 57.1% |
| Kasha | red_spinner | 57.1% |
| Catfish | any neutral | 33.3% |

---

## FAR ZONE (Power 67–100%)

Only **Kasha** and **Fugu** are available.

### Weights by Lure

| Lure | Kasha | Fugu | Total |
|------|-------|------|-------|
| none | 1.0 | 1.0 | 2.0 |
| red_spinner | 2.0 _(preferred)_ | 2.0 _(preferred)_ | 4.0 |
| gold_teardrop | 0.5 _(disliked)_ | 0.5 _(disliked)_ | 1.0 |
| feather_fly | 1.0 | 2.0 _(preferred)_ | 3.0 |
| night_lure | 1.0 | 1.0 | 2.0 |
| shell_hook | 1.0 | 1.0 | 2.0 |
| bare_hook | 1.0 | 0.5 _(disliked)_ | 1.5 |

### Probabilities by Lure

| Lure | Kasha | Fugu |
|------|-------|------|
| **none** | 50.0% | 50.0% |
| **red_spinner** | 50.0% | 50.0% |
| **gold_teardrop** | 50.0% | 50.0% |
| **feather_fly** | 33.3% | **66.7%** |
| **night_lure** | 50.0% | 50.0% |
| **shell_hook** | 50.0% | 50.0% |
| **bare_hook** | **66.7%** | 33.3% |

### Best Strategy (Far Zone)

| To find... | Best lure | Probability |
|------------|-----------|-------------|
| Kasha | bare_hook | 66.7% |
| Fugu | feather_fly | 66.7% |

> Note: red_spinner is preferred by BOTH Kasha and Fugu, so it doesn't favor either (50/50).
> gold_teardrop is disliked by BOTH, so weights drop equally (still 50/50).

---

## "Recently Completed" Boost (×3.0)

When a character's quest is recently completed, their weight gets an additional ×3.0 multiplier **on top of** lure modifiers. This stacks:

- Preferred lure + recently completed = base × 2.0 × 3.0 = **×6.0**
- Disliked lure + recently completed = base × 0.5 × 3.0 = **×1.5**
- No preference + recently completed = base × 1.0 × 3.0 = **×3.0**

### Example: Mid Zone, Nereia recently completed, gold_teardrop equipped

| Character | Base | Lure mod | Quest mod | Final weight | Probability |
|-----------|------|----------|-----------|--------------|-------------|
| Nereia | 1.0 | ×2.0 | ×3.0 | **6.0** | **70.6%** |
| Kasha | 1.0 | ×0.5 | ×1.0 | 0.5 | 5.9% |
| Catfish | 1.0 | ×1.0 | ×1.0 | 1.0 | 11.8% |
| | | | | **Total: 8.5** | |

---

## "Nothing Bites" Conditions

The system returns `null` (nothing bites) when:
1. All characters have their ending complete
2. No characters pass the quest filter
3. No zone-matched characters exist after filtering

Near zone now has Nereia and Fugu — if both endings are complete, **nothing bites** in the near zone.

---

## Optimal Lure Selection Guide

| Target | Zone | Lure | Probability |
|--------|------|------|-------------|
| Nereia | Near | gold_teardrop | 80.0% |
| Nereia | Mid | gold_teardrop | 57.1% |
| Kasha | Far | bare_hook | 66.7% |
| Kasha | Mid | red_spinner | 57.1% |
| Fugu | Near | red_spinner | 80.0% |
| Fugu | Far | feather_fly | 66.7% |
| Catfish | Mid | any neutral | 33.3% |

---

## Notes

- `bone_whistle` is listed as a preferred lure for Kasha but is not defined in LureData.ts — it has no effect currently.
- All `encounterRate` values are 1.0 — if these differ in future, base weights will change proportionally.
- The "recently completed" boost is transient and hard to control strategically; the lure/zone combination is the player's primary lever.
