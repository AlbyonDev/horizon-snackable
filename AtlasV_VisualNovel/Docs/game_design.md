# Hooked on a Feeling — Game Design Reference

> Companion to [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md). This file holds the design rules, schemas, and numerical specs. PROJECT_SUMMARY holds the narrative/structural overview.

## Overview

Hooked on a Feeling is a cozy mobile visual novel disguised as a fishing game. The player manipulates a float in a pond to draw out fish characters who approach, talk, and form bonds. The player never speaks — communication happens through four fishing actions.

## Technical Parameters

| Parameter | Value |
|---|---|
| Platform | Mobile, portrait |
| Canvas | 480×800 base (DrawingSurface 2D) |
| Engine | Meta Horizon Engine |
| Session target | 3–7 min per Cast |
| Save model | AUTO_ONLY, debounced 0.5s after each beat |
| Roster | 9 fish (3 full arcs + 6 NPCs) |
| Monetization | Premium one-shot, out of scope |

## Game-Phase State Machine

15 phases in `GamePhase` ([Types.ts](../scripts/Types.ts)):

```
Title
  └─ LakeIdle ◄────────────────────────────────────────────┐
       └─ CastCharging                                     │
            └─ RodCasting                                  │
                 └─ CastFlying                             │
                      └─ FloatLanded                       │
                           └─ FloatBounce                  │
                                ├─ NothingBites ───────────┤
                                └─ Approach                │
                                     └─ Exchange ⇄ ActionSelect ⇄ FishReaction
                                          ├─ Departure ──► Idle ─►─┘
                                          └─ Ending (Reel / Release / Drift-away)
```

`NothingBites` fires when EncounterSystem returns no valid character; auto-returns to LakeIdle after 2.5s.

## Cast Flow

### 1. Approach (~30s)

- Player taps **Cast** from LakeIdle (gated on an equipped lure — otherwise a 2s warning "Equip a lure first" appears)
- **Power gauge:** vertical ping-pong indicator (~1.5s cycle); tap locks the value 0–100
- Power maps to **zone:** `near` 0–33, `mid` 34–66, `far` 67–100
- Rod animation → float arcs (parabolic, height ∝ power) → lands → ripple VFX (0.5s) → bounce
- EncounterSystem resolves a fish for `(zone, equippedLure, flags)`
- Fish fades in; HUD shows portrait, name, current affection label, mood icon

### 2. Exchange (3–5 min)

- Beats play sequentially from the current cast index. Long arcs draw beats by tier; NPCs play their single 4-beat cast.
- Per beat: fish line(s) typewriter-render → Action menu appears (Wait, Twitch, Drift, Reel) → player selects → fish reaction (emotion icon, affection delta, optional flag mutations) → next beat
- Save fires 0.5s after each beat resolves
- Already-seen beats can be skipped (per-beat seen tracking)

### 3. Departure (~30s)

- A departure line plays. The departure's `DriftState` becomes `mood.<characterId>` for next cast.
- Transition back to Idle, then LakeIdle.

### Catch Sequence

Triggered when `affection ≥ 50` (Bonded) and arc-specific catch beats are ready:

- The action menu replaces its options with `Reel` and `[CharacterName]` (the second uses the character's `trueName` if `trueNameFlag` is set — e.g. Kasha → "Aki")
- **Reel** → reel epitaph text, `ending_<id>_reel` CG unlocks, `${id}.ending_complete` flag set, character removed from future encounters
- **Release** → release epitaph, `ending_<id>_release` CG unlocks, `${id}.ending_complete` flag set; some characters set a cross-fish flag

### Drift-Away Ending

Triggered automatically when `affection ≤ -10` (or repeated DRIFT_SCARED with no recovery, per character). Plays a quiet "they're gone" CG, sets `ending_complete`.

## Action System

Four actions in `ActionId` ([Constants.ts](../scripts/Constants.ts)):

| Action | Verb | Intent | Float animation |
|---|---|---|---|
| **Wait** | Hold still | Listen / patience | 2.0s gentle bob, 4px amplitude |
| **Twitch** | Small jerk | Flirt / be noticed | 0.4s, -10px jerk, 4px wiggle |
| **Drift** | Let line slack | Give space / relax | 1.8s, ±20px horizontal, 2px vertical |
| **Reel** | Strong pull | Assert / capture | 0.8s, -18px upward, 3 bounce cycles |

Each beat defines per-action `effects: { affection: number, flags: {…}, drift?, reaction }` so the same action produces tier- and beat-specific outcomes.

## Affection System

[AffectionSystem.ts](../scripts/AffectionSystem.ts)

- **Range:** -10 to +50 (`AFFECTION_MAX = 50`, `AFFECTION_DRIFT_AWAY_THRESHOLD = -10`)
- **TIER_ONLY display:** label + mood icon + colour, never the raw number
- **Per-action cap:** ±30 per delta (clamped)
- **Floor:** once a tier is reached, affection cannot drop below that tier's lower bound (peak-tracking enforces it)
- **Catch ready:** `affection >= 50`

### Tier table

| Value | Label | Tier | Colour |
|---|---|---|---|
| < -5 | Estranged | 0 | `#5A6A7A` |
| -5 to -1 | Wary | 1 | `#6A8AA8` |
| 0 | Indifferent | 2 | `#77BBEE` |
| 1–12 | Curious | 3 | `#8AC8D8` |
| 13–25 | Interested | 4 | `#48C8B0` |
| 26–37 | Fond | 5 | `#88D888` |
| 38–46 | Devoted | 6 | `#E8A84C` |
| 47–50 | Bonded | 7 (catch-ready) | `#C8A0FF` |

### Drift modifiers (applied at cast start)

| DriftState | Affection delta |
|---|---|
| Charmed | +5 |
| Warm | +3 |
| Troubled | 0 |
| Wary | −2 |
| Angry | −5 |

Other DriftStates (Satisfied, Neutral, Intrigued, Guarded, Raw, Opened, Destabilised, Scared) carry no built-in affection effect — they're narrative tags the Ink scripts can branch on.

## Encounter System

[EncounterSystem.ts](../scripts/EncounterSystem.ts) — full probability tables in [encounter_probabilities.md](encounter_probabilities.md).

**Resolution order:**

1. Drop characters with `${id}.ending_complete = true`
2. Drop characters with incomplete quest requirements (see Quest System)
3. Keep only characters whose `lakeZones` contains the cast zone
4. Compute weight per remaining character: `base × lureMod × questBoost`
   - `base = encounterRate` (currently 1.0 for all)
   - `lureMod = ×2.0` (preferred) / `×0.5` (disliked) / `×1.0` (neutral)
   - `questBoost = ×3.0` if quest was recently completed, else `×1.0`
5. Weighted random select. If list is empty → `NothingBites` phase.

## Quest System

[QuestSystem.ts](../scripts/QuestSystem.ts) — each character declares a `questRequirement`:

| Type | Condition |
|---|---|
| `use_lure` | Player has equipped a specific lure |
| `talk_to_fish` | Player has met a specific other fish |
| `talk_to_x_fish` | Player has met N total fish |
| `make_fish_leave` | Player has triggered a specific drift state on another fish |
| `custom_flag` | Arbitrary flag is set |
| (none) | No gate |

Characters with an incomplete quest are filtered out by EncounterSystem entirely — they never appear until their quest condition is met. This is the discovery mechanism: the Journal hint tells the player roughly what to do; the encounter rolls open the door.

## Lure System

[LureData.ts](../scripts/LureData.ts) — 7 lures defined.

| Id | Display name | Default DriftState |
|---|---|---|
| `none` | No Lure | None |
| `red_spinner` | Red Spinner | None |
| `gold_teardrop` | Gold Teardrop | Warm |
| `feather_fly` | Feather Fly | Charmed |
| `night_lure` | Night Lure | Troubled |
| `shell_hook` | Shell Hook | Charmed |
| `bare_hook` | Bare Hook | Troubled |

- **Starting inventory:** `red_spinner`, `gold_teardrop`, `feather_fly`
- **Default equipped:** `red_spinner` (DEFAULT_LURE)
- **Equipped persistence:** lure stays equipped across casts (no per-cast picker mid-flow); changed from Tackle Box UI accessible in Title / LakeIdle / Idle
- **Cast gating:** if no lure equipped, Cast button shows "Equip a lure first" warning (auto-dismiss 2s)

**Per-fish overrides:** a character can declare `lureDriftOverrides` mapping a lure id → DriftState that overrides the lure's default for that character (e.g. Nereia: `red_spinner → Wary`, `gold_teardrop → Warm`, `shell_hook → Charmed`).

## Flag System

[FlagSystem.ts](../scripts/FlagSystem.ts) — central key-value store with namespace validation. Reserved prefixes:

| Prefix | Meaning |
|---|---|
| `met.<id>` | Player has met this fish |
| `secret.<id>.<key>` | Per-character secrets (e.g. `secret.kasha.real_name_given`) |
| `quest.<id>.<state>` | Quest progression |
| `mood.<id>` | Current DriftState (string value) |
| `count.<key>` | Numeric counters |
| `cross.<a>.<b>` | Cross-fish relationship flags |
| `run.<key>` | Per-run transient state |
| `time.<key>` | Real-time stamps |
| `fact.<id>.<key>` | Fact unlocks (drive Journal Facts tab) |

`flag_audit()` walks all character data and reports unreferenced flags / dangling checks.

## Save System

[SaveSystem.ts](../scripts/SaveSystem.ts)

- **Model:** AUTO_ONLY — no manual saves, no slots
- **Trigger:** 0.5s debounced timer after each beat resolution
- **Storage:** PlayerVariablesService (key-value pairs by playerId)
- **Schema versioning:** loader applies forward-compat defaults for missing fields (lure inventory, journal facts, drift modifier extras, etc.)
- **Anti-pattern guard:** save is fire-and-forget — never blocks beat advancement

Persisted: flags, current character/cast/beat index, affection state per character (value, peakValue, floor, lastDelta, lastSessionId), equipped lure + inventory, journal entries, CG unlocks, global stats, badges.

## Journal System

[JournalSystem.ts](../scripts/JournalSystem.ts) — accessible from Title, LakeIdle, Idle. Three views:

1. **Characters** — one card per registered fish
   - Locked: silhouette + species teaser + quest-hint riddle
   - Unlocked: portrait, species, accent colour, cast count, expressions seen list, current Personal Quest hint
2. **Facts** — flag-gated discoveries from each character's `facts: FactDefinition[]`; unlocked when their `flagKey` becomes truthy
3. **Stats & Badges** — globals + 8 badges (see Global Stats)

The deprecated Keepsakes / Lure Box tabs have been removed; old save fields are ignored on load.

### Personal Quest Hints — progressive precision

Each character has one `questHint` string. Authoring convention: hints get more concrete as the player makes progress on that character — poetic at tier 1, tactical at tier 4+. (Currently delivered as a single string per character; tier-pegged variants are future work.)

## CG Gallery

[CGGallerySystem.ts](../scripts/CGGallerySystem.ts) — aggregates `cgs: CGData[]` from every registered character.

**16 declared CGs** (current state):

- 3 full-arc fish: portrait + reel + release (+ drift-away for Kasha & Fugu) = 3 + 4 + 4 = 11
- 6 NPCs: portrait only = 6
- **Total = 16** (note: Nereia has no drift-away CG yet)

Unlock fires programmatically:

- Portrait → on first encounter (`met.<id>`)
- Reel ending → on "Reel" choice in catch sequence
- Release ending → on `[name]` choice in catch sequence
- Drift-away → on `affection ≤ -10` or DRIFT_SCARED stack threshold

UI: 2-column grid. Locked = padlock + "???". Unlocked = thumbnail, title, "[Tap to view]" → fullscreen viewer, tap-to-dismiss.

## Global Stats & Badges

[GlobalStatsSystem.ts](../scripts/GlobalStatsSystem.ts)

**Tracked:**
- `totalCasts` (persisted, +1 per cast started)
- `totalCharactersMet` (derived from journal entries on load)
- `totalFactsDiscovered` (derived from flags + registry on load)
- `totalPlaySessions` (+1 on game start)
- `unlockedBadges[]` (persisted)

**8 badges:**

| Id | Name | Condition | Icon |
|---|---|---|---|
| `first_cast` | First Line | totalCasts ≥ 1 | 🎣 |
| `first_meeting` | First Ripple | totalCharactersMet ≥ 1 | 🐟 |
| `five_casts` | Patient Angler | totalCasts ≥ 5 | ⏳ |
| `ten_casts` | Dedicated Fisher | totalCasts ≥ 10 | 🌟 |
| `meet_all` | Full Pond | totalCharactersMet ≥ 9 | ✨ |
| `first_keepsake` | Treasured Gift | (stub — always false) | 🎁 |
| `ten_facts` | Deep Listener | totalFactsDiscovered ≥ 10 | 📖 |
| `twenty_casts` | Night Owl | totalCasts ≥ 20 | 🦉 |

## Ink Pipeline

Stories live in TypeScript as Ink-like syntax strings.

- `Story_<Name>.ts` exports the raw Ink string
- [InkParser.ts](../scripts/InkParser.ts) → AST (knots, stitches, choices, diverts, conditions, tags)
- [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) → `Beat[]` / `CastData` (Phase A: linear conversion, cached by `(characterId, startNode)`)
- [InkRunner.ts](../scripts/InkRunner.ts) → runtime branching engine (Phase B, for richer choice trees)
- [Stories.ts](../scripts/Stories.ts) → exports parsed stories per character

No `.ink` source files. ~3 large stories (Nereia, Kasha, Fugu ≈ 26–27KB each) + 6 small NPC stories (≈ 4KB each). Total ~175+ beats.

## Mobile Pacing Rules

- Maximum **80 characters per dialogue line**
- Maximum **1 line per bubble**
- Maximum **2–4 beats per cast**
- All tap targets ≥ **44pt**
- Save must complete within debounce window — never block the UI

## UI Reference

See [ART_DIRECTION.md](ART_DIRECTION.md) for full visual spec. Layout summary:

- Background: full-screen pond illustration
- Fish portrait: centre, 35–65% vertical band
- Float: centre, ~58% vertical (code-drawn)
- Fishing line: top-right rod tip → float (code-drawn, tension curve)
- Dialogue box: left-centre, `#0D1520` @ 85% opacity, 12px corners
- Action menu: bottom 28–52%, four full-width rows
- HUD top-left: thumbnail + name + tier label + mood icon
