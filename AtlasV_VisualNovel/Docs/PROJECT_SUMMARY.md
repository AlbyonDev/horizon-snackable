# Hooked on a Feeling — Project Summary

> **Last updated:** 2026-05-16 — synced against current code state
> **Reference documents:** [game_design.md](game_design.md), [characters.md](characters.md), [ART_DIRECTION.md](ART_DIRECTION.md), [encounter_probabilities.md](encounter_probabilities.md)

---

## Project Overview

**Hooked on a Feeling** is a cozy mobile visual novel disguised as a fishing game. The player manipulates a fishing float in a pond, attracting fish characters who approach, talk, and form bonds across multiple sessions. The player never speaks — they communicate through five fishing actions.

### Core Identity

- **Platform:** Mobile-only, portrait format (480×800 base canvas)
- **Engine:** Meta Horizon Engine (DrawingSurface 2D + XAML overlays)
- **Genre:** Romance + Slice-of-life hybrid visual novel with fishing metaphor
- **Session target:** 3–7 minutes per Cast
- **Cadence:** One-shot premium — no real-time gating, no timers
- **Roster:** 9 fish — 3 with full 5-tier arcs, 6 single-cast NPCs

### Design Pillars

1. **Cozy first, conflicted second** — Warm and playful by default; emotional weight is earned
2. **Actions, not words** — Player speaks through Wait, Twitch, Drift, Reel
3. **Every fish has a life** — Tiered roster: 3 deep arcs, 6 quick encounters
4. **Discovery over frustration** — Quest hints visible in Journal, lure preferences learned
5. **The ending is a choice** — Reel at max affection is a deliberate act, never forced

---

## Core Loop

### State machine (14 phases — see [scripts/Types.ts](../scripts/Types.ts))

```
Title → [Intro Cinematic (first time only)] → LakeIdle → CastFlying →
FloatLanded → FloatBounce → Approach → Exchange ⇄ ActionSelect ⇄ FishReaction
                                            ↓
                                     Departure → Idle → LakeIdle (loop)
                                            ↓
                                       Ending (Reel / Release / Drift-Away)

NothingBites: timeout state when no fish matches the cast → auto-return to LakeIdle (2.5s)
```

### The Cast in three phases

**1. Approach (~30s)** — Player equips a lure (persists across casts), presses the Cast button to enter aiming mode (HUD hides, "Drag to cast" instruction appears), then drags to aim a trajectory preview (distance determines lake zone: Near, Mid, Far) with horizontal left/right control for lateral targeting, releases to launch the float in a 3D ballistic arc, the float lands, a fish is selected via [EncounterSystem](../scripts/EncounterSystem.ts) and approaches.

**2. Exchange (3–5min)** — Beats play in sequence. Each beat: fish line(s) → Action menu → player picks one of four actions → fish reaction with affection delta and emotion icon → next beat. Long-arc characters (Nereia/Kasha/Fugu) play tier-appropriate beats; NPC characters play a single fixed 4-beat sequence whose correct action combo unlocks the Reel finisher.

**3. Departure (~30s)** — Fish leaves. Departure mood becomes the DRIFT flag carried into the next cast with that character.

### Catch Sequence

When affection ≥ 50 (Bonded tier), the next action menu replaces "Reel" semantics with a two-choice moment: **Reel** (capture → Reel ending CG, fish removed from pond) or **[fish's name]** (release → Release ending CG, arc closed warmly). Both outcomes unlock content; neither is "correct".

---

## Implemented Systems

All systems are present in [scripts/](../scripts/). One file per system, single responsibility.

| System | File | Role |
|---|---|---|
| **Affection** | [AffectionSystem.ts](../scripts/AffectionSystem.ts) | Per-fish meter (-10 → 50), 8 tier labels (Estranged → Bonded), drift modifiers, catch readiness (≥50), drift-away threshold (≤-10) |
| **Encounter** | [EncounterSystem.ts](../scripts/EncounterSystem.ts) | Picks the fish per cast: ending-filter → quest-filter → zone-filter → weighted random (×3 recently-completed boost, ×2 preferred lure, ×0.5 disliked) |
| **Flags** | [FlagSystem.ts](../scripts/FlagSystem.ts) | Centralised key-value store with namespace prefixes (`met.`, `secret.`, `quest.`, `mood.`, `count.`, `cross.`, `run.`, `time.`, `fact.`) |
| **Save** | [SaveSystem.ts](../scripts/SaveSystem.ts) | AUTO_ONLY — debounced 0.5s after each beat. Persists via PlayerVariablesService |
| **Journal** | [JournalSystem.ts](../scripts/JournalSystem.ts) | Characters + Facts tabs. Records expressions seen, casts made, fact unlocks driven by flag changes |
| **CG Gallery** | [CGGallerySystem.ts](../scripts/CGGallerySystem.ts) | Aggregates all CGs from registered characters. Unlock per-CG, persisted in save |
| **Quest** | [QuestSystem.ts](../scripts/QuestSystem.ts) | Tracks quest completion (use_lure / talk_to_fish / talk_to_x_fish / make_fish_leave / custom flag). Incomplete-quest chars are never selected by EncounterSystem |
| **Global Stats** | [GlobalStatsSystem.ts](../scripts/GlobalStatsSystem.ts) | Totals (casts, characters met, facts), 8 badges, derived on load |
| **Character Registry** | [CharacterRegistry.ts](../scripts/CharacterRegistry.ts) | Central registry: 9 characters registered, lookup by id, zone, lure preference |
| **Ink Pipeline** | [InkParser.ts](../scripts/InkParser.ts) · [InkRunner.ts](../scripts/InkRunner.ts) · [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) | Dialogue authored as Ink-like syntax in `Story_<Name>.ts`, parsed to AST, converted to `Beat[]` via the BeatAdapter (cached per character+startNode) |

### Explicitly excluded (design decisions)

- **SYS-07-RIVALRY** — replaced by lighter cross-fish flags
- **SYS-12-NGPLUS** — no inter-run memory in v1
- **SYS-13-ROUTELOCK** — arcs are independent
- **SYS-18-REALTIME / SYS-22-TIMER** — no timers anywhere

---

## Fish Roster (9 characters)

Full per-character data: see [characters.md](characters.md).

### Long arcs — 5 tiers, 10 casts each

| Character | Species | Accent | Zones | Preferred lures | True name |
|---|---|---|---|---|---|
| **Nereia** | Koi | `#9B7FCC` purple | near, mid | gold_teardrop, shell_hook | — |
| **Kasha** | Siamese fighting fish (betta) | `#D33A2C` scarlet | mid, far | red_spinner, bone_whistle* | **Aki** (revealed at peak) |
| **Fugu** | Pufferfish | `#FFB84D` orange | near, far | feather_fly, red_spinner | — |

*`bone_whistle` is referenced in Kasha's preferred lures but not declared in `LureData.ts` — it has no effect currently.*

### NPC characters — 1 cast, 4 beats, combo-based catch

These act as quick fishing puzzles. Each has a "correct action combo" hinted in their Quest entry; complete the combo and you unlock the portrait CG. No tier progression, no romance arc.

| Character | Species | Accent | Zone | Combo |
|---|---|---|---|---|
| **Catfish** | Catfish | `#7A6850` | mid | WAIT → TWITCH → DRIFT → REEL |
| **Carp** | Carp | `#8B7D3C` | far | WAIT → DRIFT → WAIT → REEL |
| **Perch** | Perch | `#C87533` | near | TWITCH → WAIT → TWITCH → REEL |
| **Eel** | Eel | `#2D4A3E` | far | DRIFT → DRIFT → DRIFT → REEL |
| **Pike** | Pike | `#3A5C2E` | mid | TWITCH → TWITCH → TWITCH → REEL |
| **Trout** | Trout | `#6B8FA3` | near | WAIT → TWITCH → DRIFT → REEL |

---

## Actions (4)

Defined in [Constants.ts](../scripts/Constants.ts).

| Action | Fishing meaning | Emotional intent | Animation |
|---|---|---|---|
| **Wait** | Hold perfectly still | Listen / be patient | 2.0s gentle bob (4px amplitude) |
| **Twitch** | Small jerk of the line | Flirt / get noticed | 0.4s sharp jerk (-10px, 4px wiggle) |
| **Drift** | Slack in the line | Give space / relax | 1.8s horizontal sway (±20px) |
| **Reel** | Strong pull | Assert / capture | 0.8s upward pull (3 bounce cycles) |

Note: the design vocabulary used to include "Slight Reel", "Loosen Line", and "Firm Tug" as separate verbs — these were consolidated into the 4 actions above.

---

## Affection Tiers

Single-meter affection in range **[-10, 50]**, displayed via 8 named labels — no raw numbers shown.

| Value range | Label | Tier idx | Display colour |
|---|---|---|---|
| < -5 | Estranged | 0 | `#5A6A7A` |
| -5 to -1 | Wary | 1 | `#6A8AA8` |
| 0 | Indifferent | 2 | `#77BBEE` |
| 1–12 | Curious | 3 | `#8AC8D8` |
| 13–25 | Interested | 4 | `#48C8B0` |
| 26–37 | Fond | 5 | `#88D888` |
| 38–46 | Devoted | 6 | `#E8A84C` |
| 47–50 | Bonded | 7 | `#C8A0FF` |

- **Catch ready:** affection ≥ 50
- **Drift-away ending:** affection ≤ -10
- **Drift modifiers** (applied at cast start): Warm +3, Charmed +5, Wary −2, Angry −5, Troubled 0

---

## Lures (7)

Defined in [LureData.ts](../scripts/LureData.ts). Equipped lure persists across casts.

| Id | Display name | Effect |
|---|---|---|
| `none` | No Lure | Bare hook, default drift |
| `red_spinner` | Red Spinner | Reliable, all fish |
| `gold_teardrop` | Gold Teardrop | Cautious fish (Warm drift) |
| `feather_fly` | Feather Fly | Surface dwellers (Charmed drift) |
| `night_lure` | Night Lure | Deep dwellers (Troubled drift) |
| `shell_hook` | Shell Hook | Adorned freshwater shell (Charmed drift) |
| `bare_hook` | Bare Hook | Vulnerability cue (Troubled drift) |

**Starting inventory:** `red_spinner`, `gold_teardrop`, `feather_fly`.
**Default equipped:** `red_spinner`.

Per-fish drift overrides are declared on the character (e.g. Nereia: red_spinner → Wary, gold_teardrop → Warm, shell_hook → Charmed).

> **Implementation note:** the `attractedFish` array on every lure currently points only to `nereia`. Encounter routing is done by `EncounterSystem` using zone + `preferredLures`/`dislikedLures` weights, not by the lure's attractedFish list. See [encounter_probabilities.md](encounter_probabilities.md).

---

## Drift States

13 named departure moods in `DriftState` enum ([Types.ts](../scripts/Types.ts)): Warm, Troubled, Wary, Charmed, Scared, Angry, Satisfied, Neutral, Intrigued, Guarded, Raw, Opened, Destabilised. Five carry affection modifiers; the rest are narrative tags consumed by the Ink scripts.

- **DRIFT_SCARED:** fish does not appear in the next cast (1-cast cooldown)
- **DRIFT_ANGRY:** affection drops one tier
- **DRIFT_CHARMED:** fish arrives early next cast, skips one beat

---

## Journal

Accessible from Title and Idle. Two functional tabs plus the global stats screen.

1. **Characters** — one card per registered fish; locked entries show a teaser silhouette and quest-hint riddle; unlocked entries show species, accent colour, cast count, expressions seen, the Personal Quest hint, and a "Where to find" location hint (zone, time of day, preferred lure) derived from currently active encounter recipes
2. **Facts** — flag-gated discoveries: each character declares a `facts: FactDefinition[]` with a `flagKey`; when that flag becomes truthy, the fact unlocks in the Journal
3. **Stats & Badges** — totals + 8 badge unlocks: First Line, First Ripple, Patient Angler (5 casts), Dedicated Fisher (10), Full Pond (meet all 9), Treasured Gift (stub), Deep Listener (10 facts), Night Owl (20 casts)

The legacy "Keepsakes / Lure Box" tabs have been removed; some scaffolding remains in older save fields and is ignored on load.

---

## CG Gallery — 16 declared CGs

Aggregated from all registered characters. See [CGGallerySystem.ts](../scripts/CGGallerySystem.ts).

| Character | CGs |
|---|---|
| Nereia | portrait, reel ending, release ending |
| Kasha | portrait, reel, release, drift-away |
| Fugu | portrait, reel, release, drift-away |
| Catfish, Carp, Perch, Eel, Pike, Trout | portrait only (one each) |

- Portrait CG unlocks on first encounter
- Ending CGs unlock at the corresponding choice / threshold
- Locked CGs show a padlock and "???" placeholder; unlocked CGs open in a fullscreen tap-to-dismiss viewer
- Unlock state persists in the save

---

## Dialogue / Ink Pipeline

Stories are authored as Ink-like syntax stored in TypeScript files:

- `Story_<Name>.ts` exports a const string (Nereia / Kasha / Fugu ~26–27KB each; NPCs ~4KB)
- [InkParser.ts](../scripts/InkParser.ts) parses to AST (knots, stitches, choices, diverts, conditions, tags)
- [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) converts AST → `Beat[]` / `CastData`, cached by (characterId, startNode)
- [InkRunner.ts](../scripts/InkRunner.ts) is the runtime engine for richer choice branching (Phase B)

No `.ink` source files; everything ships as compiled TS strings.

---

## Visual Style

See [ART_DIRECTION.md](ART_DIRECTION.md) for the full brief. Quick summary:

- **Style:** Nocturnal Pond Illustration — Mobile Otome Premium (Tears of Themis colour discipline, chibi-aquatic subject)
- **Palette:** dark dominant — `#080D14` void, `#0D1E35` pond deep, `#1A3A5C` water; warm lantern `#E8A84C`, cool moonlight `#C8D8E8`
- **Fish portraits:** square 1:1, chibi proportions, large reflective eyes carry all emotion
- **Backgrounds:** portrait 9:19.5, painterly, fishing rod tip at top-right, bottom 30% / left 25% darkened for UI
- **Sprite emotion variants:** declared as optional in `CharacterPortraitAssets` (curious / warm / alarmed) but only `neutral` portraits currently exist for every character

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

## Known Inconsistencies

Tracked here so docs and code stay in sync:

1. `bone_whistle` listed in `KASHA_CHARACTER.preferredLures` but not declared in `LureData.ts` → no effect
2. Every lure's `attractedFish` array contains only `['nereia']` — historical artifact; encounter routing actually uses zone + preferred/disliked weights
3. Character `encounterRate` is uniformly `1.0` — no per-character base rarity yet
4. `CharacterPortraitAssets` allows `curious / warm / alarmed` variants but only `neutral` portraits are shipped
5. NPC combo casts (Catfish–Trout) show combo hints in quest text but the action-by-action feedback in their 4 beats is minimal — combo correctness is checked at the Reel finisher

---

*The float bobs. The fish decide.*
