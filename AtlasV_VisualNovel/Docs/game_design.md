# Hooked on a Feeling — Game Design Reference

> Companion to [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md). This file holds the design rules, schemas, and numerical specs. PROJECT_SUMMARY holds the narrative/structural overview. Encounter tables: [encounter_probabilities.md](encounter_probabilities.md). Ink contract: [INK_AUTHORING_GUIDE.md](INK_AUTHORING_GUIDE.md).

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

See `GamePhase` in [Types.ts](../scripts/Types.ts):

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

`NothingBites` fires when EncounterSystem finds no matching recipe; auto-returns to LakeIdle after `NOTHING_BITES_DURATION` (2.5s).

## Cast Flow

### 1. Approach (~30s)

- Player taps **Cast** from LakeIdle (gated on an equipped lure — otherwise a 2s "Equip a lure first" warning fires)
- **Aiming:** the player drags to set a trajectory. Vertical drag → power → zone; horizontal drag → lateral offset.
- Power maps to **zone:** `near` 0–33, `mid` 34–66, `far` 67–100
- Rod animation → float arcs (ballistic) → lands → splash ripples → bounce
- [EncounterSystem](../scripts/EncounterSystem.ts) resolves a recipe from `(zone, phase, equippedLure)`; the matched fish's `from.<fishId>.<recipeId>` flag is set, then the fish's entry knot is launched
- Fish fades in; HUD shows portrait, name, current affection label, mood icon

### 2. Exchange (3–5 min)

- Beats play sequentially. Long arcs draw beats by tier; NPCs play their single 4-beat cast.
- Per beat: fish line(s) typewriter-render → Action menu appears (Wait, Twitch, Drift, Reel) → player selects → fish reaction (emotion icon, affection delta, optional flag mutations) → next beat
- Save fires 0.5s after each beat resolves
- Already-seen beats can be skipped (per-beat seen tracking)

### 3. Departure (~30s)

- A departure line plays. The departure's `DriftState` becomes `mood.<characterId>` for the next cast.
- Transition back to Idle, then LakeIdle.

### Catch Sequence

Triggered when `affection >= AFFECTION_MAX` and arc-specific catch beats are ready:

- The action menu replaces its options with `Reel` and `[CharacterName]` (the second uses the character's `trueName` if `trueNameFlag` is set — e.g. Kasha → "Aki")
- **Reel** → reel epitaph text, `ending_<id>_reel` CG unlocks, `${id}.ending_complete` flag set, character removed from future encounters
- **Release** → release epitaph, `ending_<id>_release` CG unlocks, `${id}.ending_complete` flag set; some characters set a cross-fish flag

### Drift-Away Ending

Triggered automatically when `affection <= AFFECTION_DRIFT_AWAY_THRESHOLD` (-10). Plays a quiet "they're gone" CG, sets `ending_complete`.

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

- **Range:** `[AFFECTION_DRIFT_AWAY_THRESHOLD = -10, AFFECTION_MAX = 50]`
- **Display:** label + colour, never the raw number (8 tiers below)
- **Per-action cap:** ±30 per delta (clamped)
- **No floor locks** — affection drops freely; only the drift-away threshold matters
- **Catch ready:** `affection >= AFFECTION_MAX`

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
| > 46 | Bonded | 7 (catch-ready) | `#C8A0FF` |

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

[EncounterSystem.ts](../scripts/EncounterSystem.ts) — full recipe tables in [encounter_probabilities.md](encounter_probabilities.md).

The system is **deterministic and recipe-based**. Each character declares an array of `recipes: Recipe[]`, where every recipe is a stable slot identified by an id and pinned to `(zone, phase, lure)`:

```ts
interface Recipe {
  id: string;        // stable, fish-local (e.g. 'home', 'dawnT5')
  zone: LakeZone;    // 'near' | 'mid' | 'far'
  phase: Phase;      // Day | Night
  lure: string;      // specific lure id or ANY_LURE wildcard
  initial?: boolean; // active by default unless flag explicitly disables
  priority?: number; // ties: higher wins. Main fish = 1, NPCs = 0
}
```

**Resolution:**

1. Drop characters with `${id}.ending_complete = true`.
2. For each remaining character, keep recipes where `isRecipeActive(fishId, recipe)` returns true. Activation is driven by `recipe.<fishId>.<recipeId>` flags set by Ink; `initial: true` recipes are active unless explicitly disabled.
3. Filter by exact `zone` + `phase` match.
4. Bucket by lure: `recipe.lure === equippedLureId` → specific; `recipe.lure === ANY_LURE` → wildcard. Specific always wins over wildcard when both exist.
5. Tie-break by `priority` desc, then `fishId` ascending alphabetically.
6. On match: set `from.<fishId>.<recipeId> = true` (one-shot signal), launch the fish's entry knot. Empty pool → `NothingBites`.

**There is no RNG, no weighted random, no per-character `encounterRate`. Lure routing is per-recipe, not per-character.**

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

QuestSystem tracks progress for **journal display only**. It does *not* filter EncounterSystem — encounter gating is done entirely via recipe-activation flags. Ink stories typically set `recipe.<fishId>.<recipeId>` flags when a quest condition becomes true, which is how new encounter slots open up over the arc.

## Lure System

[LureData.ts](../scripts/LureData.ts) — 7 lure definitions.

| Id | Display name |
|---|---|
| `none` | No Lure |
| `red_spinner` | Red Spinner |
| `gold_teardrop` | Gold Teardrop |
| `feather_fly` | Feather Fly |
| `night_lure` | Night Lure |
| `shell_hook` | Shell Hook |
| `bare_hook` | Bare Hook |

- **Starting inventory:** `red_spinner`, `gold_teardrop`, `feather_fly`
- **Default equipped:** `red_spinner`
- **Equipped persistence:** lure stays equipped across casts; changed from the Tackle Box overlay accessible in LakeIdle / Idle
- **Cast gating:** if no lure equipped, Cast button shows "Equip a lure first" warning (auto-dismiss 2s)

The recipe system consumes the equipped lure id directly; there are no per-character preferred/disliked lure tables. To make a specific lure attract a specific fish at a specific slot, declare a recipe with that exact `lure` value.

## Flag System

[FlagSystem.ts](../scripts/FlagSystem.ts) — central key-value store with namespace validation. Reserved prefixes:

| Prefix | Meaning |
|---|---|
| `met.<id>` | Player has met this fish |
| `secret.<id>.<key>` | Per-character secrets (e.g. `secret.kasha.real_name_given`) |
| `quest.<id>.<state>` | Quest progression markers |
| `mood.<id>` | Current DriftState (string value) |
| `count.<key>` | Numeric counters |
| `cross.<a>.<b>` | Cross-fish relationship flags |
| `recipe.<id>.<recipeId>` | Recipe activation override |
| `from.<id>.<recipeId>` | One-shot encounter signal flag (read & cleared by Ink) |
| `fact.<id>.<key>` | Fact unlocks (drive Journal Facts/Observations) |

## Save System

[SaveSystem.ts](../scripts/SaveSystem.ts) · [PersistentSaveManager.ts](../scripts/PersistentSaveManager.ts)

- **Model:** AUTO_ONLY — no manual saves, no slots
- **Trigger:** 0.5s debounced timer after each beat resolution
- **Storage:** PlayerVariablesService (key-value pairs by playerId). Main save and CG unlock list live in separate PVars.
- **Schema versioning:** loader applies forward-compat defaults for missing fields (lure inventory, journal facts, etc.)
- **Anti-pattern guard:** save is fire-and-forget — never blocks beat advancement

Persisted: flags, current character/cast/beat index, per-fish affection (value, lastDelta, lastSessionId, ceiling), equipped lure + inventory, journal entries, CG unlocks (separate PVar), global stats, badges.

## Journal System

[JournalSystem.ts](../scripts/JournalSystem.ts) — accessible from Title, LakeIdle, Idle. **3 tabs:**

1. **Characters** — one card per registered fish
   - Locked: silhouette + teaser hint derived from the fish's primary recipe zone
   - Unlocked: portrait, species, accent colour, cast count, observations count, Personal Quest hint; tapping opens a detail overlay with quest name + "Where to find" (zone, phase, lure icon) from the next active recipe
2. **(detail overlay)** — opened from any unlocked Characters card; shows the full per-fish detail
3. **Stats & Badges** — totals + 7 badges (see Global Stats)

The legacy text-blob tabs (Pond Notes, Lure Box, Keepsakes) have been removed. Only the structured card UI remains.

### Personal Quest Hints

Each character has one `questHint` string. Authoring convention: hints get more concrete as the player makes progress on that character. (Currently delivered as a single string per character; tier-pegged variants are future work.)

## CG Gallery

[CGGallerySystem.ts](../scripts/CGGallerySystem.ts) — aggregates `cgs: CGData[]` from every registered character. Persisted in a separate PVar from the main save.

**Declared CGs:**

- 3 full-arc fish: portrait + reel + release (+ drift-away for Kasha & Fugu) = 3 + 4 + 4 = 11
- 6 NPCs: portrait only = 6
- **Total = 17** (Nereia has no drift-away CG yet)

Unlock fires programmatically:

- Portrait → on first encounter (`met.<id>`)
- Reel ending → on "Reel" choice in catch sequence
- Release ending → on `[name]` choice in catch sequence
- Drift-away → on `affection <= AFFECTION_DRIFT_AWAY_THRESHOLD`

UI: 2-column grid. Locked = padlock + "???". Unlocked = thumbnail, title, "[Tap to view]" → fullscreen viewer, tap-to-dismiss.

## Global Stats & Badges

[GlobalStatsSystem.ts](../scripts/GlobalStatsSystem.ts)

**Tracked:**
- `totalCasts` (persisted, +1 per cast started)
- `totalCharactersMet` (derived from journal entries on load)
- `totalFactsDiscovered` (derived from flags + registry on load)
- `totalPlaySessions` (+1 on game start)
- `unlockedBadges[]` (persisted)

**7 badges:**

| Id | Name | Condition | Icon |
|---|---|---|---|
| `first_cast` | First Line | totalCasts ≥ 1 | 🎣 |
| `first_meeting` | First Ripple | totalCharactersMet ≥ 1 | 🐟 |
| `five_casts` | Patient Angler | totalCasts ≥ 5 | ⏳ |
| `ten_casts` | Dedicated Fisher | totalCasts ≥ 10 | 🌟 |
| `meet_all` | Full Pond | totalCharactersMet ≥ 9 | ✨ |
| `ten_facts` | Deep Listener | totalFactsDiscovered ≥ 10 | 📖 |
| `twenty_casts` | Night Owl | totalCasts ≥ 20 | 🦉 |

## Ink Pipeline

Stories live in TypeScript as Ink-like syntax strings. Authoring contract: [INK_AUTHORING_GUIDE.md](INK_AUTHORING_GUIDE.md).

- `Story_<Name>.ts` exports the raw Ink string
- [InkParser.ts](../scripts/InkParser.ts) → AST (knots, stitches, choices, diverts, conditions, tags)
- [InkBeatAdapter.ts](../scripts/InkBeatAdapter.ts) → `Beat[]` / `CastData` (cached by `(characterId, startNode)`)
- [Stories.ts](../scripts/Stories.ts) → `getStory(characterId)` returns the parsed story

No `.ink` source files. 3 large stories (Nereia, Kasha, Fugu ≈ 26–27 KB each) + 6 small NPC stories (≈ 4 KB each).

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
