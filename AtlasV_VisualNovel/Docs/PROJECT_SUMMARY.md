# Hooked on a Feeling — Project Summary

> **Reference documents:** [game_design.md](game_design.md), [characters.md](characters.md), [ART_DIRECTION.md](ART_DIRECTION.md), [encounter_probabilities.md](encounter_probabilities.md), [INK_AUTHORING_GUIDE.md](INK_AUTHORING_GUIDE.md)

---

## Project Overview

**Hooked on a Feeling** is a cozy mobile visual novel disguised as a fishing game. The player manipulates a fishing float in a pond, attracting fish characters who approach, talk, and form bonds across multiple sessions. The player never speaks — they communicate through four fishing actions.

### Core Identity

- **Platform:** Mobile-only, portrait format (480×800 base canvas)
- **Engine:** Meta Horizon Engine (DrawingSurface 2D + XAML overlays)
- **Genre:** Romance + Slice-of-life hybrid visual novel with fishing metaphor
- **Session target:** 3–7 minutes per Cast
- **Cadence:** One-shot premium — no real-time gating, no timers
- **Roster:** 10 fish — 4 with full 5-tier arcs, 6 single-cast NPCs

### Design Pillars

1. **Cozy first, conflicted second** — Warm and playful by default; emotional weight is earned
2. **Actions, not words** — Player speaks through Wait, Twitch, Drift, Reel
3. **Every fish has a life** — Tiered roster: 4 deep arcs, 6 quick encounters
4. **Discovery over frustration** — Journal hints surface where each fish lives (zone × phase × lure)
5. **The ending is a choice** — Reel at peak affection is a deliberate act, never forced

---

## Core Loop

### State machine (see `GamePhase` in [Types.ts](../scripts/Types.ts))

```
Title → [Intro Cinematic (first time only)] → LakeIdle →
CastCharging → RodCasting → CastFlying → FloatLanded → FloatBounce →
                                ├─ NothingBites ───────────────┐
                                └─ Approach                    │
                                     └─ Exchange ⇄ ActionSelect ⇄ FishReaction
                                          ├─ Departure → Idle → LakeIdle (loop)
                                          └─ Ending (Reel / Release / Drift-Away)
```

`NothingBites` fires when [EncounterSystem](../scripts/EncounterSystem.ts) finds no matching recipe → auto-return to LakeIdle (~2.5s).

### The Cast in three phases

**1. Approach (~30s)** — Player has a lure equipped (persists across casts). Pressing **Cast** enters aim mode; the player drags to set a trajectory (Y maps to power → zone, X maps to lateral offset), releases to launch the float in a ballistic arc. On landing, [EncounterSystem](../scripts/EncounterSystem.ts) resolves a recipe from `(zone, phase, lure)` and the matching fish approaches.

**2. Exchange (3–5 min)** — Beats play in sequence. Each beat: fish line(s) → Action menu → player picks one of four actions → fish reaction (affection delta + emotion icon + optional flag mutations) → next beat. Long-arc characters (Nereia/Kasha/Fugu) play tier-appropriate beats; NPC characters play a single fixed 4-beat sequence whose correct action combo unlocks the Reel finisher.

**3. Departure (~30s)** — Fish leaves. Departure mood becomes the `mood.<id>` `DriftState` carried into the next cast with that character.

### Catch Sequence

When `affection ≥ AFFECTION_MAX` and the arc has reached its catch beats, the action menu replaces "Reel" semantics with a two-choice moment: **Reel** (capture → Reel ending CG, `${id}.ending_complete` set, character removed from future encounters) or **[fish's name]** (release → Release ending CG, arc closed warmly). Both outcomes unlock content; neither is "correct".

### Drift-Away Ending

Triggered automatically when affection drops to `AFFECTION_DRIFT_AWAY_THRESHOLD = -10`. Plays a quiet "they're gone" CG, sets `${id}.ending_complete`.

---

## Implemented Systems

All systems live in [scripts/](../scripts/). One file per system, single responsibility.

| System | File | Role |
|---|---|---|
| **Affection** | [AffectionSystem.ts](../scripts/AffectionSystem.ts) | Per-fish meter clamped to `[-10, AFFECTION_MAX]`, 8 tier labels, drift modifiers, catch readiness (≥ AFFECTION_MAX), drift-away (≤ -10). No floor locks. |
| **Encounter** | [EncounterSystem.ts](../scripts/EncounterSystem.ts) | Deterministic recipe selection: filter active recipes by `(zone, phase)`; specific lure beats wildcard; `priority` then `fishId` breaks ties. Zero RNG. |
| **Flags** | [FlagSystem.ts](../scripts/FlagSystem.ts) | Central key-value store with namespace prefixes (`met.`, `secret.`, `quest.`, `mood.`, `count.`, `cross.`, `recipe.`, `from.`, `fact.`) |
| **Save** | [SaveSystem.ts](../scripts/SaveSystem.ts) · [PersistentSaveManager.ts](../scripts/PersistentSaveManager.ts) | AUTO_ONLY — debounced 0.5s after each beat. Persists via PlayerVariablesService |
| **Journal** | [JournalSystem.ts](../scripts/JournalSystem.ts) | Characters + Stats/Badges tabs. Records expressions seen, cast counts, fact unlocks. Builds card data for the structured journal UI. |
| **CG Gallery** | [CGGallerySystem.ts](../scripts/CGGallerySystem.ts) | Aggregates CGs from registered characters. Unlock per-CG, persisted to a separate PVar |
| **Quest** | [QuestSystem.ts](../scripts/QuestSystem.ts) | Tracks quest completion for journal hint display. Does *not* gate encounters — recipe activation flags handle that. |
| **Global Stats** | [GlobalStatsSystem.ts](../scripts/GlobalStatsSystem.ts) | Totals (casts, characters met, facts, sessions), 7 badges, derived stats reconstructed on load |
| **Character Registry** | [CharacterRegistry.ts](../scripts/CharacterRegistry.ts) | Central registry: 10 characters registered, lookup by id |
| **Ink Pipeline** | [InkParser.ts](../scripts/InkParser.ts) · [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) | Dialogue authored as Ink-like syntax in `Story_<Name>.ts`, parsed to AST, converted to `Beat[]` by the BeatAdapter (cached per character+startNode). See [INK_AUTHORING_GUIDE.md](INK_AUTHORING_GUIDE.md). |

---

## Fish Roster (10 characters)

Full per-character data: see [characters.md](characters.md). Recipe tables: see [encounter_probabilities.md](encounter_probabilities.md).

### Long arcs — 5 tiers, 10 casts each (`priority: 1`)

| Character | Species | Accent | Home zone | True name |
|---|---|---|---|---|
| **Nereia** | Koi | `#9B7FCC` purple | far | — |
| **Kasha** | Siamese fighting fish (betta) | `#D33A2C` scarlet | mid | **Aki** (revealed at peak) |
| **Fugu** | Pufferfish | `#FFB84D` orange | near | — |
| **Sōma** | Tench | `#5B8A72` green | near | — |

### NPC characters — 1 cast, 4 beats, combo-based catch (`priority: 0`)

These act as quick fishing puzzles. Each has a "correct action combo" hinted in their Quest entry; complete the combo and you unlock the portrait CG. No tier progression, no romance arc. NPCs lose ties to main fish at the same `(zone, phase, lure)` cell.

| Character | Species | Accent | Zone × Phase | Combo |
|---|---|---|---|---|
| **Perch** | Perch | `#C87533` | near × Day | TWITCH → WAIT → TWITCH → REEL |
| **Eel** | Eel | `#2D4A3E` | near × Night | DRIFT → DRIFT → DRIFT → REEL |
| **Trout** | Trout | `#6B8FA3` | mid × Day | WAIT → TWITCH → DRIFT → REEL |
| **Catfish** | Catfish | `#7A6850` | mid × Night | WAIT → TWITCH → DRIFT → REEL |
| **Carp** | Carp | `#8B7D3C` | far × Day | WAIT → DRIFT → WAIT → REEL |
| **Pike** | Pike | `#3A5C2E` | far × Night | TWITCH → TWITCH → TWITCH → REEL |

---

## Actions (4)

Defined in [Constants.ts](../scripts/Constants.ts) as `ActionId`.

| Action | Fishing meaning | Emotional intent | Animation |
|---|---|---|---|
| **Wait** | Hold perfectly still | Listen / be patient | 2.0s gentle bob (4px amplitude) |
| **Twitch** | Small jerk of the line | Flirt / get noticed | 0.4s sharp jerk (-10px, 4px wiggle) |
| **Drift** | Slack in the line | Give space / relax | 1.8s horizontal sway (±20px) |
| **Reel** | Strong pull | Assert / capture | 0.8s upward pull (3 bounce cycles) |

---

## Affection Tiers

Single linear meter clamped to `[AFFECTION_DRIFT_AWAY_THRESHOLD = -10, AFFECTION_MAX = 50]`, displayed via 8 named labels — no raw numbers shown. **No floor locks** — affection can drop freely; only the drift-away threshold matters.

| Value range | Label | Tier idx | Display colour |
|---|---|---|---|
| < -5 | Estranged | 0 | `#5A6A7A` |
| -5 to -1 | Wary | 1 | `#6A8AA8` |
| 0 | Indifferent | 2 | `#77BBEE` |
| 1–12 | Curious | 3 | `#8AC8D8` |
| 13–25 | Interested | 4 | `#48C8B0` |
| 26–37 | Fond | 5 | `#88D888` |
| 38–46 | Devoted | 6 | `#E8A84C` |
| > 46 | Bonded | 7 | `#C8A0FF` |

- **Catch ready:** `affection >= AFFECTION_MAX`
- **Drift-away ending:** `affection <= AFFECTION_DRIFT_AWAY_THRESHOLD`
- **Per-action delta cap:** ±30
- **Drift modifiers** (applied at cast start): Warm +3, Charmed +5, Wary −2, Angry −5, Troubled 0

---

## Lures

Defined in [LureData.ts](../scripts/LureData.ts). Equipped lure persists across casts.

| Id | Display name |
|---|---|
| `none` | No Lure |
| `red_spinner` | Red Spinner |
| `gold_teardrop` | Gold Teardrop |
| `feather_fly` | Feather Fly |
| `night_lure` | Night Lure |
| `shell_hook` | Shell Hook |
| `bare_hook` | Bare Hook |

**Starting inventory:** `red_spinner`, `gold_teardrop`, `feather_fly`. **Default equipped:** `red_spinner`.

Lures route encounters via the **recipe system** — a recipe pinned to a specific lure id wins over a wildcard recipe at the same `(zone, phase)`. There are no per-character preferred/disliked lure tables anymore.

---

## Drift States

Named departure moods in `DriftState` ([Types.ts](../scripts/Types.ts)): Warm, Troubled, Wary, Charmed, Scared, Angry, Satisfied, Neutral, Intrigued, Guarded, Raw, Opened, Destabilised. Five carry affection modifiers (Warm/Charmed/Wary/Angry/Troubled); the rest are narrative tags consumed by the Ink scripts.

- **DRIFT_SCARED:** fish does not appear in the next cast (1-cast cooldown)
- **DRIFT_ANGRY:** affection drops one tier on next cast start (-5)
- **DRIFT_CHARMED:** fish arrives warmer next cast (+5)

---

## Journal

Accessible from Title and Idle. **3 tabs:**

1. **Characters** — one card per registered fish; locked entries show a teaser silhouette and quest-hint riddle; unlocked entries show species, accent colour, cast count, observations count, current Personal Quest hint, and a "Where to find" location card (zone, phase, lure icon) derived from the next active recipe
2. *(reserved)* — character detail overlay opens from any unlocked Characters card
3. **Stats & Badges** — totals + badge unlocks

### Badges (7)

| Id | Name | Condition |
|---|---|---|
| `first_cast` | First Line | totalCasts ≥ 1 |
| `first_meeting` | First Ripple | totalCharactersMet ≥ 1 |
| `five_casts` | Patient Angler | totalCasts ≥ 5 |
| `ten_casts` | Dedicated Fisher | totalCasts ≥ 10 |
| `meet_all` | Full Pond | totalCharactersMet ≥ 10 |
| `ten_facts` | Deep Listener | totalFactsDiscovered ≥ 10 |
| `twenty_casts` | Night Owl | totalCasts ≥ 20 |

---

## CG Gallery

Aggregated from all registered characters via [CGGallerySystem.ts](../scripts/CGGallerySystem.ts). Persisted in a separate PVar from the main save.

| Character | CGs |
|---|---|
| Nereia | portrait, reel ending, release ending |
| Kasha | portrait, reel, release, drift-away |
| Fugu | portrait, reel, release, drift-away |
| Sōma | portrait, reel ending, release ending |
| Catfish, Carp, Perch, Eel, Pike, Trout | portrait only (one each) |

Portrait unlocks on first encounter. Ending CGs unlock at the corresponding choice / threshold. Locked CGs show a padlock; unlocked CGs open in a fullscreen tap-to-dismiss viewer.

---

## Dialogue / Ink Pipeline

Stories are authored as Ink-like syntax in TypeScript files:

- `Story_<Name>.ts` exports a const string (Nereia / Kasha / Fugu ~26–27 KB; NPCs ~4 KB)
- [InkParser.ts](../scripts/InkParser.ts) parses to AST (knots, stitches, choices, diverts, conditions, tags)
- [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) converts AST → `Beat[]` / `CastData`, cached by `(characterId, startNode)`
- [Stories.ts](../scripts/Stories.ts) exposes `getStory(characterId)` over the source registry

No `.ink` source files; everything ships as compiled TS strings. See [INK_AUTHORING_GUIDE.md](INK_AUTHORING_GUIDE.md) for the authoring contract.

---

## Visual Style

See [ART_DIRECTION.md](ART_DIRECTION.md) for the full brief. Quick summary:

- **Style:** Nocturnal Pond Illustration — Mobile Otome Premium (Tears of Themis colour discipline, chibi-aquatic subject)
- **Palette:** dark dominant — `#080D14` void, `#0D1E35` pond deep, `#1A3A5C` water; warm lantern `#E8A84C`, cool moonlight `#C8D8E8`
- **Fish portraits:** square 1:1, chibi proportions, large reflective eyes carry all emotion
- **Backgrounds:** portrait 9:19.5, painterly, fishing rod tip at top-right, bottom 30% / left 25% darkened for UI
- **Sprite emotion variants:** declared as optional in `CharacterPortraitAssets` (curious / warm / alarmed) but only `neutral` portraits currently exist

---

## Canvas Layout (480×800)

- Background: full-screen pond illustration (day/night toggle available)
- Fish portrait: centre, 35–65% vertical
- Float: centre, ~58% vertical (code-drawn, sine bob + per-action dips)
- Fishing line: top-right rod tip to float (code-drawn, tension curve)
- Dialogue box: left-centre, semi-transparent `#0D1520` at 85%
- Action menu: bottom 28–52%, full-width tap targets (≥44pt)
- HUD top-left: fish thumbnail + name + tier label + mood icon
- Day/Night toggle button: top-left utility button (☽/☀ icon), fades through black over 0.5s

---

*The float bobs. The fish decide.*
