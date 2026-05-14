# VISUAL NOVEL SYSTEMS BIBLE
## Version 2.0 — Implementation Specification for AI Agents
## Target: Mobile visual novel games, system-by-system implementation
## Companion to v1.1 (which remains the human-readable rationale layer)

---

## HOW TO USE THIS DOCUMENT

This is an implementation reference for AI agents building visual novel systems from scratch. It is structured for query and build, not for reading end-to-end.

### Document map

| Section | Purpose | When to consult |
|---|---|---|
| **A** | Game-Type Decision Tree | At project start — determines which systems to implement for a given brief |
| **B** | System Registry | Quick lookup — stable IDs and one-line purposes for all 26 systems |
| **C** | Dependency Graph | After picking systems — determines build order and prerequisites |
| **D** | System Specifications | During implementation — full spec per system (schema, rules, acceptance, anti-patterns) |
| **E** | Global Anti-Patterns | After implementation — cross-system issues to detect |
| **F** | Emotional Beats Library | Content-generation reference (writing dialogue and scenes) |
| **G** | Build Checklist | Sequential implementation guide for a new VN from scratch |

### Spec language (RFC 2119 style)

- **MUST / MUST NOT** — Hard requirement. Implementations violating these are broken.
- **SHOULD / SHOULD NOT** — Strong recommendation. Document any deviation.
- **MAY** — Optional behavior.
- **DETECT** — Anti-pattern flag. If the condition matches at validation, raise it.

### Stable IDs

Every system has a stable identifier of the form `SYS-NN-NAME`. References across the document use these IDs. Future versions of this document MUST preserve IDs; new systems get new IDs rather than reusing retired ones.

### Workflow for implementing a new VN from scratch

1. **Read the brief** — game type, target audience, platform, session length, monetization model
2. **Apply Section A** decision tree → produces the *system shortlist* (which systems to build)
3. **Walk Section C** dependency graph → produces the *build order*
4. **For each system in build order:**
   - Read its Section D spec
   - Implement data schema (`Data Schema` block)
   - Implement core rules (`Core Rules` block)
   - Wire dependencies per `Dependencies` block
   - Validate against `Acceptance Criteria`
   - Check against `Anti-Patterns to Detect`
5. **Run Section E** global anti-pattern checks across the full system
6. **Use Section F** when generating content (dialogue, choices, journal entries, scenes)
7. **Use Section G** as the master checklist for project-level milestones

### Scope boundaries

This document specifies **VN-specific game mechanics**. Out of scope: monetization (gacha, energy systems, paywalls), generic mobile features (login bonuses, push for retention only), localization tooling, asset pipelines, Live2D/animation systems. These exist in any mobile game; this document focuses on what makes a VN a VN.

---

# SECTION A — GAME-TYPE DECISION TREE

## A.1 Read the brief first

Before picking systems, the agent MUST extract these parameters from the project brief. If any are missing, the agent SHOULD ask before proceeding.

| Parameter | Values | Why it matters |
|---|---|---|
| **Game type** | Romance / Mystery / Horror / Loop / Slice-of-life / Stat-raise / Hybrid | Determines core systems |
| **Cast size** | Single-route / 2-3 routes / 4-8 routes / 9+ routes | Drives tier structure & route lock decisions |
| **Session length target** | Short (<5 min) / Medium (5-20 min) / Long (20+ min) | Drives mechanic density per session |
| **Cadence** | One-shot / Episodic-paid / Live-service / Real-time | Determines save model, time mechanics |
| **Platform** | Mobile-only / Mobile-first / Cross-platform | Drives UI patterns and input modalities |
| **Monetization** | Premium / F2P with chapter unlocks / F2P with gacha cards / Hybrid | Affects save model and route gating |
| **Mastery layer** | Pure narrative / One mastery layer / Multiple mastery layers | Determines Part II inclusions |

## A.2 Core stack — always include

These systems are present in every VN. No decision needed.

- `SYS-02-CHOICE` — dialogue choices
- `SYS-03-FLAGS` — state memory
- `SYS-09-SKIP` — already-seen text handling
- `SYS-10-SAVE` — checkpoint and persistence
- `SYS-11-PACING` — exchange-level compression rules

## A.3 Game-type → required systems

Apply by game-type tag. Multiple tags compose (a Romance + Mystery game gets both rows).

| Game type | Required additional systems | Strongly recommended |
|---|---|---|
| **Romance / Dating sim** | `SYS-01-AFFECTION`, `SYS-04-TIERS` | `SYS-23-GIFTS`, `SYS-07-RIVALRY`, `SYS-24-GALLERY` |
| **Mystery / Detective** | `SYS-14-DEDUCTION`, `SYS-05-JOURNAL` (workshop variant) | `SYS-15-PUZZLE`, `SYS-25-FLOWCHART` |
| **Horror / Thriller** | `SYS-06-ENDINGS` (with bad-as-canon), `SYS-22-TIMER` | `SYS-26-MULTIPROTAG`, `SYS-15-PUZZLE` |
| **Loop / Iterative** | `SYS-12-NGPLUS`, `SYS-25-FLOWCHART` | `SYS-26-MULTIPROTAG` |
| **Slice-of-life** | `SYS-04-TIERS` (episodic variant), `SYS-05-JOURNAL` (museum variant) | `SYS-20-ACTIVITY` |
| **Stat-raise / Raise-a-character** | `SYS-17-STATS`, `SYS-16-SCHEDULE`, `SYS-06-ENDINGS` | `SYS-08-QUESTS`, `SYS-23-GIFTS` |
| **Multi-route narrative** | `SYS-04-TIERS`, `SYS-06-ENDINGS`, `SYS-13-ROUTELOCK` | `SYS-12-NGPLUS`, `SYS-24-GALLERY` |

## A.4 Cadence → save and time models

| Cadence | Save model | Time model | Notes |
|---|---|---|---|
| **One-shot premium** | `SYS-10-SAVE` (manual + auto, save anywhere) | None or in-fiction calendar | Save scumming is intended exploration |
| **Episodic paid** | `SYS-10-SAVE` (auto-only, chapter-replay rewind) | None or per-chapter | Manual saves rare; chapter select replaces them |
| **Live-service F2P** | `SYS-10-SAVE` (auto-only, cloud sync) | None or `SYS-16-SCHEDULE` | No manual saves — chapter replay is rewind |
| **Real-time** | `SYS-10-SAVE` (auto-only, server-anchored) | `SYS-18-REALTIME` (required) | Real clock drives content unlocks |

## A.5 Platform → UI and input

| Platform | Input rules | Required adaptations |
|---|---|---|
| **Mobile-only** | Tap-to-advance, one line per tap rhythm | `SYS-25-FLOWCHART` becomes chapter-select; `SYS-11-PACING` enforces 1-line beats |
| **Mobile-first** | Tap primary, keyboard supported | Same as mobile-only with desktop fallback |
| **Cross-platform** | Multi-input | Allow both 1-line (mobile) and 3-line (PC) pacing modes |

## A.6 Mastery-layer picker

Decide how many mastery layers (Part II systems) to include. This is the single most important architectural decision.

| Mastery layer count | Profile | Examples |
|---|---|---|
| **0** | Pure narrative VN | Higurashi, classic Key VAs, indie Ren'Py |
| **1** | Single hook layer | VA-11 Hall-A (activity), Long Live the Queen (stats) |
| **2-3** | Standard mobile stack | Tears of Themis (deduction + cards + gallery), Mystic Messenger (real-time + chat-UI + schedule) |
| **4+** | Hybrid AAA | Persona series (stats + schedule + dating + dungeon RPG) |

**Decision rule for mobile VNs:** Default to 2-3 mastery layers. Fewer than 2 risks low retention; more than 3 risks cognitive overload in short mobile sessions unless one of them is fully optional.

### Mastery layer compatibility matrix

| Layer | Pairs well with | Conflicts with |
|---|---|---|
| `SYS-14-DEDUCTION` | `SYS-05-JOURNAL`, `SYS-25-FLOWCHART`, `SYS-21-CARDS` | None |
| `SYS-15-PUZZLE` | `SYS-14-DEDUCTION`, `SYS-12-NGPLUS` | None |
| `SYS-16-SCHEDULE` | `SYS-17-STATS`, `SYS-08-QUESTS`, `SYS-18-REALTIME` | None |
| `SYS-17-STATS` | `SYS-16-SCHEDULE`, `SYS-23-GIFTS`, `SYS-02-CHOICE` (gated options) | None |
| `SYS-18-REALTIME` | `SYS-19-CHATUI`, `SYS-16-SCHEDULE`, `SYS-22-TIMER` | `SYS-10-SAVE` manual-save model (real-time can't be save-scummed) |
| `SYS-19-CHATUI` | `SYS-18-REALTIME`, `SYS-22-TIMER` | None |
| `SYS-20-ACTIVITY` | `SYS-23-GIFTS`, `SYS-01-AFFECTION` | `SYS-21-CARDS` (mechanic overload) |
| `SYS-21-CARDS` | `SYS-24-GALLERY`, `SYS-01-AFFECTION` | `SYS-20-ACTIVITY` (mechanic overload) |
| `SYS-22-TIMER` | `SYS-18-REALTIME`, `SYS-19-CHATUI` | None |
| `SYS-26-MULTIPROTAG` | `SYS-25-FLOWCHART`, `SYS-12-NGPLUS` | `SYS-13-ROUTELOCK` (locks fight perspective shifts) |

## A.7 Decision tree summary (compact)

```
START
│
├─ Apply Core Stack (SYS-02, 03, 09, 10, 11) — always
│
├─ Match game-type tags → add required systems from A.3
│
├─ Pick cadence → add save/time model from A.4
│
├─ Pick platform → add UI adaptations from A.5
│
├─ Pick mastery layer count from A.6
│   │
│   ├─ 0 layers: ship narrative-only
│   ├─ 1 layer: pick one Part II system aligned with game type
│   ├─ 2-3 layers: pick from compatibility matrix in A.6
│   └─ 4+ layers: scope warning — verify cast/team capacity
│
└─ OUTPUT: System shortlist → proceed to Section C
```

---

# SECTION B — SYSTEM REGISTRY

Quick-lookup index. Each ID links to a Section D spec. "Layer" indicates which architectural layer the system belongs to.

| ID | Name | Layer | One-line purpose |
|---|---|---|---|
| `SYS-01-AFFECTION` | Affection Meter | Relationship | Hidden/visible numerical relationship strength per character; thresholds gate content |
| `SYS-02-CHOICE` | Dialogue Choice | Core | Player-selected branching points; the genre's primary verb |
| `SYS-03-FLAGS` | Flag System | Core | Boolean/integer state memory underlying continuity |
| `SYS-04-TIERS` | Chapter / Tier Structure | Narrative | Discretized acts per character/route; primary pacing engine |
| `SYS-05-JOURNAL` | Journal / Codex / Memo | Narrative | Persistent record of earned facts; rewards engagement |
| `SYS-06-ENDINGS` | Multiple Ending Structure | Narrative | Branched conclusion architecture |
| `SYS-07-RIVALRY` | Jealousy / Rivalry | Relationship | Cross-character awareness of player's other relationships |
| `SYS-08-QUESTS` | Quest / Event System | Narrative | Active tasks bridging passive reading to active play |
| `SYS-09-SKIP` | Skip / Already-Seen | Core | Fast-forward through seen text; replay infrastructure |
| `SYS-10-SAVE` | Save / Checkpoint | Core | State persistence and rewind mechanism |
| `SYS-11-PACING` | Compression / Pacing | Core | Exchange-level rules for keeping flow tight |
| `SYS-12-NGPLUS` | New Game Plus | Narrative | Cross-run knowledge and unlock carry-forward |
| `SYS-13-ROUTELOCK` | Route Lock | Narrative | Commitment gating; restricts character routes after a point |
| `SYS-14-DEDUCTION` | Investigation & Deduction | Mastery | Information identification/presentation as mechanic |
| `SYS-15-PUZZLE` | Puzzle Integration | Mastery | Diegetic non-dialogue problem-solving layer |
| `SYS-16-SCHEDULE` | Time Management & Scheduling | Mastery | Player-allocated time units across competing activities |
| `SYS-17-STATS` | Stat Building & Parameters | Mastery | Numerical player-character attributes; gates content |
| `SYS-18-REALTIME` | Real-Time / Live Interactions | Mastery | Real-clock-anchored content unlocks |
| `SYS-19-CHATUI` | Chat / Messaging UI | Presentation | Dialogue rendered as messaging app |
| `SYS-20-ACTIVITY` | Activity-Driven (Crafting) | Mastery | Crafting/doing minigame as primary verb |
| `SYS-21-CARDS` | Card / Deck Battle | Mastery | Card-collection battle layer atop romance/story |
| `SYS-22-TIMER` | Timed Choices | Mastery | Choice menus with countdown pressure |
| `SYS-23-GIFTS` | Gift-Giving & Preferences | Relationship | Item-based affection mechanic with hidden preferences |
| `SYS-24-GALLERY` | CG Gallery / Recollection | Retention | Unlocked-illustration grid as completion driver |
| `SYS-25-FLOWCHART` | Flowchart Navigation | Presentation | Branch visualization as navigable interface |
| `SYS-26-MULTIPROTAG` | Multi-Protagonist Perspective | Narrative | Multiple POV characters with interlocking information |

### Layer legend

- **Core** — required in every VN
- **Narrative** — story architecture systems
- **Relationship** — dating-sim / romance systems
- **Mastery** — Part II hook layers (the active verbs)
- **Presentation** — how the game shows itself to the player
- **Retention** — long-term return-engagement drivers

---

# SECTION C — DEPENDENCY GRAPH

## C.1 How to read this graph

- **Requires** — System B cannot function without System A. Build A first.
- **Recommends** — System B is significantly better with System A. Build A first if both are in scope.
- **Conflicts with** — A and B should not both be implemented in the same game without explicit reconciliation.
- **Decorates** — System B optionally enhances System A but can be added later.

## C.2 Master dependency map

```
                          ┌─────────────────────────────────────────┐
                          │  CORE (always present)                  │
                          │  SYS-02-CHOICE                          │
                          │     │                                   │
                          │     ▼                                   │
                          │  SYS-03-FLAGS  ◄─── used by all systems │
                          │     │                                   │
                          │     ▼                                   │
                          │  SYS-10-SAVE  (persists all state)      │
                          │  SYS-09-SKIP  (uses seen-flag from 03)  │
                          │  SYS-11-PACING (rules layer over 02)    │
                          └──────────────┬──────────────────────────┘
                                         │
       ┌─────────────────────────────────┼─────────────────────────────────┐
       │                                 │                                 │
       ▼                                 ▼                                 ▼
   NARRATIVE LAYER                 RELATIONSHIP LAYER               MASTERY LAYER
                                                                  
   SYS-04-TIERS                    SYS-01-AFFECTION                SYS-14-DEDUCTION ──┐
      requires: 03                    requires: 02, 03                requires: 03,05 │
      requires: 01 (if romance)       gated by: 02, 17                                │
                                                                    SYS-15-PUZZLE     │
   SYS-05-JOURNAL                  SYS-07-RIVALRY                     requires: 03    │
      requires: 03                    requires: 01                                    │
      decorates: 14, 23                                              SYS-16-SCHEDULE  │
                                                                       requires: 03   │
   SYS-06-ENDINGS                  SYS-23-GIFTS                                       │
      requires: 03, 04                requires: 01, 03               SYS-17-STATS     │
      recommends: 12                  recommends: 05                    requires: 02,3│
                                                                        gates: 02     │
   SYS-08-QUESTS                                                                      │
      requires: 03                                                   SYS-18-REALTIME ◄┘
      decorates: 01, 17                                                 requires: 10
                                                                        recommends: 19,16
   SYS-12-NGPLUS                                                        conflicts: 10-manual
      requires: 03, 06                                              
      recommends: 25                                                SYS-19-CHATUI
                                                                        recommends: 18
   SYS-13-ROUTELOCK                                                     decorates: 02
      requires: 04
      conflicts: 26                                                 SYS-20-ACTIVITY
                                                                        requires: 02
   SYS-26-MULTIPROTAG                                                   decorates: 01
      requires: 03                                                      conflicts: 21
      recommends: 25
      conflicts: 13                                                 SYS-21-CARDS
                                                                        requires: 03
                                                                        decorates: 01
                                  PRESENTATION LAYER                    conflicts: 20
                                                                  
                                  SYS-25-FLOWCHART                  SYS-22-TIMER
                                     requires: 03, 06                   decorates: 02
                                     recommends: 26                     recommends: 18
                                  
                                  RETENTION LAYER                   
                                                                  
                                  SYS-24-GALLERY
                                     requires: 03
                                     recommends: 06
```

## C.3 Build order (topologically sorted)

When implementing multiple systems, build in this order. Skip any system not in your shortlist.

### Phase 1 — Foundation (always)
1. `SYS-03-FLAGS` (zero dependencies; everything else uses this)
2. `SYS-10-SAVE` (persists flags and all subsequent state)
3. `SYS-02-CHOICE` (depends on flags; needed before any branching content)
4. `SYS-09-SKIP` (uses seen-flags from CHOICE/FLAGS)
5. `SYS-11-PACING` (rules layer; can be applied as content authoring proceeds)

### Phase 2 — Core narrative architecture (most VNs)
6. `SYS-04-TIERS`
7. `SYS-05-JOURNAL`
8. `SYS-06-ENDINGS`

### Phase 3 — Relationship layer (romance/dating sim)
9. `SYS-01-AFFECTION` (must exist before tiers gate on it)
10. `SYS-23-GIFTS` (decorates affection)
11. `SYS-07-RIVALRY` (cross-character effect; requires affection complete)

### Phase 4 — Mastery layers (project-specific, parallel-safe)
12. `SYS-17-STATS` (build before SCHEDULE if both included)
13. `SYS-16-SCHEDULE`
14. `SYS-14-DEDUCTION`
15. `SYS-15-PUZZLE`
16. `SYS-20-ACTIVITY` (XOR with SYS-21)
17. `SYS-21-CARDS` (XOR with SYS-20)
18. `SYS-22-TIMER` (decorator; can be added late)

### Phase 5 — Real-time and presentation (mobile live service)
19. `SYS-18-REALTIME`
20. `SYS-19-CHATUI`

### Phase 6 — Long-game and replay
21. `SYS-08-QUESTS`
22. `SYS-12-NGPLUS`
23. `SYS-13-ROUTELOCK` (XOR with SYS-26)
24. `SYS-26-MULTIPROTAG` (XOR with SYS-13)
25. `SYS-25-FLOWCHART` (post-content, retention layer)
26. `SYS-24-GALLERY` (post-content, retention layer)

### Conflict resolution rules

- `SYS-20-ACTIVITY` ⨯ `SYS-21-CARDS`: Pick one. Two heavy mastery layers in the same game crowds out narrative. If both are wanted, make one optional/skippable.
- `SYS-13-ROUTELOCK` ⨯ `SYS-26-MULTIPROTAG`: Route lock commits the player to one path; multi-protagonist requires perspective fluidity. Pick one.
- `SYS-18-REALTIME` ⨯ `SYS-10-SAVE` (manual model): Real-time content cannot be save-scummed. If real-time is in scope, use auto-only save model.

---
# SECTION D — SYSTEM SPECIFICATIONS

Each system spec is structured identically. Implementations following all `MUST` rules and passing all acceptance criteria are conformant.

---

## SYS-01-AFFECTION — Affection Meter

**Layer:** Relationship  
**Required by:** Romance, Dating sim  
**Skip when:** Pure mystery, horror without romance subplot, slice-of-life without romance

### Dependencies
- Requires: `SYS-02-CHOICE`, `SYS-03-FLAGS`
- Gated by: `SYS-02-CHOICE` (changes triggered by choices), `SYS-17-STATS` (if option visibility depends on stats)
- Decorated by: `SYS-23-GIFTS`, `SYS-07-RIVALRY`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `character_id` | string | required | Stable identifier; FK to character record |
| `value` | int | 0 | Current affection. Recommended range: 0–100 or -100 to 100 |
| `tier` | enum | `STRANGER` | Named threshold (see Implementation notes) |
| `floor` | int | 0 | Once reached, value cannot drop below this |
| `ceiling` | int | 100 | Maximum value |
| `last_change_session_id` | string | null | For stagnation detection |
| `last_change_delta` | int | 0 | Magnitude of last change (for anti-pattern detection) |
| `peak_value` | int | 0 | Highest value ever reached (for some endings) |
| `visibility_mode` | enum | `TIER_ONLY` | `HIDDEN` / `TIER_ONLY` / `NUMERIC` / `BAR` |

### Core rules

- **MUST** define at least 3 named tiers with explicit threshold values
- **MUST** floor the value at `floor` once `floor > 0` is established (relationships do not reset to zero overnight)
- **MUST** trigger at least one unique scene/dialogue change at each tier transition (up and down)
- **MUST NOT** allow a single choice to grant more than 30% of the meter's range — single-choice gains beyond this trivialize earlier choices
- **SHOULD** prefer `TIER_ONLY` visibility for story-led VNs; reserve `NUMERIC`/`BAR` for stat-led/strategic VNs
- **SHOULD** make every tier transition visible to the player via UI cue, dialogue acknowledgement, or both
- **SHOULD** produce a character animation/expression change on any change, not only on tier transitions
- **MAY** carry `peak_value` across runs even when `value` resets (for "true ending requires high prior peak" patterns)

### Acceptance criteria

- [ ] At least 3 named tiers exist and are reachable in normal play
- [ ] Each tier has at least one tier-exclusive scene
- [ ] Maximum tier is reachable but not in fewer than 50% of intended choices
- [ ] Every choice that affects affection produces a visible character reaction in the same scene
- [ ] Floor mechanic is verified: scripted attempt to drop below floor results in floor value
- [ ] Tier-down events trigger appropriate negative scenes, not just number decrements
- [ ] Save/load preserves all fields; verified by save-reload-compare test

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-AFFECTION-DUMP` | Any single choice grants > 30% of `(ceiling - floor)` | High |
| `AP-AFFECTION-STAGNATION` | More than 5 player sessions elapse with `value` unchanged | Medium |
| `AP-AFFECTION-EARLY-MAX` | `peak_value` reaches `ceiling` before 60% of route content consumed | High |
| `AP-AFFECTION-INVISIBLE` | A change of `abs(delta) >= 5` produces no character expression/dialogue change | Medium |
| `AP-AFFECTION-MATHEMATICAL` | Player surveys (or playtest data) show meter is treated as score to optimize | High — design issue, indicates choices too legible |
| `AP-AFFECTION-NO-FLOOR` | After tier 3 reached, value can drop to 0 without major story event | High |

### Reference implementations

- **Persona 5 (2017)** — Tiered, named (Acolyte → Disciple → ... → Confidant). Tier visible, point-to-next hidden. Tier-up scenes are unique events. Gold standard for `TIER_ONLY` mode.
- **Tokimeki Memorial (1994)** — Numeric meter visible to player; explicit strategic optimization is intended. `NUMERIC` mode reference.
- **Clannad (2004)** — Hidden meter; tier transitions communicated only via narrative beats. `HIDDEN` mode reference.
- **Tears of Themis (2020/2021)** — Mood icon as visual proxy for hidden numeric value. Mobile-native `TIER_ONLY` execution.

### Implementation notes

- Recommended named tier set for romance: `STRANGER` → `ACQUAINTANCE` → `FRIEND` → `CLOSE` → `INTIMATE`. Adapt names to game tone.
- Tier thresholds at 0/15/35/60/85 (out of 100) is a tested distribution: easy entry, harder late tiers.
- `value` and `tier` are denormalized — `tier` is computed from `value` but cached for query speed and to track tier-change events. Recompute on every change.
- For mobile, prefer `TIER_ONLY` with mood icon. `NUMERIC` reads as RPG-stat and breaks immersion in mainstream romance.
- If the game has multiple romanceable characters, instantiate one row per character. The meter is per-character, not global.

---

## SYS-02-CHOICE — Dialogue Choice

**Layer:** Core  
**Required by:** All VNs  
**Skip when:** Never

### Dependencies
- Requires: `SYS-03-FLAGS` (choice options may be flag-gated; choice outcomes set flags)
- Decorated by: `SYS-22-TIMER` (timed-choice decoration), `SYS-19-CHATUI` (presentation skin)

### Data schema

#### Choice

| Field | Type | Default | Notes |
|---|---|---|---|
| `choice_id` | string | required | Stable, unique |
| `prompt_text` | string | optional | Optional pre-choice context line |
| `options` | list<Option> | required | 2–4 typical; up to N for evidence-presentation systems |
| `category` | enum | `TONE` | `TONE` / `INFORMATION` / `COMMITMENT` / `DEDUCTION` |
| `required_flags_any` | list<flag_id> | [] | Choice appears only if any of these is true |
| `required_flags_all` | list<flag_id> | [] | Choice appears only if all of these are true |
| `seen` | bool | false | Set true once player has reached this choice |
| `chosen_option_id` | string | null | Persists across saves; null if not yet reached |
| `timer_seconds` | float | null | If set, choice is timed (see `SYS-22-TIMER`) |
| `timer_default_option_id` | string | null | Resolves on timeout |

#### Option

| Field | Type | Default | Notes |
|---|---|---|---|
| `option_id` | string | required | Stable within choice |
| `text` | string | required | 2–12 words; see `SYS-11-PACING` |
| `effects` | list<Effect> | [] | What happens when this option is chosen |
| `required_flags_any` | list<flag_id> | [] | Visibility gate; option hidden if not satisfied |
| `required_stat_thresholds` | list<StatGate> | [] | E.g., `{stat: "Charm", min: 4}` |

#### Effect

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `SET_FLAG` / `DELTA_AFFECTION` / `DELTA_STAT` / `UNLOCK_TIER` / `UNLOCK_CG` / `START_QUEST` / `JOURNAL_ENTRY` / `BRANCH_TO` |
| `target` | string | flag_id, character_id, tier_id, etc. |
| `value` | any | Delta or boolean |

### Core rules

- **MUST** ensure every choice produces at least one effect (sets a flag, changes a value, branches a route, or marks a journal entry). A choice with no effect is a button press, not a choice.
- **MUST NOT** include choices where all options produce identical effects with only surface text variation
- **MUST** flag-gate options that should be invisible to certain players (versus showing them as visible-but-unchosen)
- **SHOULD** use 2 options for high-tension `COMMITMENT` choices, 3 for `TONE` and `INFORMATION`, more for `DEDUCTION`
- **SHOULD** include a "Stay silent" / null-action option in scenes where any verbal response would be wrong
- **SHOULD NOT** include cruel options that produce no unique content branch
- **SHOULD NOT** place a `COMMITMENT` choice within 1 beat after a long monologue — let the player breathe
- **MAY** include "wall-of-text" options only in `DEDUCTION` category where evidence-presenting requires it
- **SHOULD** front-load at least one choice early in any exchange of >5 beats

### Acceptance criteria

- [ ] Every choice in the game has at least one option that sets a flag or changes affection/stats
- [ ] No two options within a single choice produce identical effect lists
- [ ] All option text is between 2 and 12 words (auto-checkable)
- [ ] At least 70% of choices in the game produce visible character reaction within 1 beat
- [ ] Flag-gated options are correctly hidden when conditions unmet (verified by playthrough sweep)
- [ ] Save/load preserves `chosen_option_id` for all reached choices

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-CHOICE-FALSE` | All options' effect lists are identical (modulo surface text) | High |
| `AP-CHOICE-WALL-OF-TEXT` | Any non-deduction option has text >12 words | Medium |
| `AP-CHOICE-DEAD-CRUEL` | An option marked `cruel` (or matching tone heuristic) has no unique downstream content | Medium |
| `AP-CHOICE-NO-EFFECT` | Any option has empty `effects` list | High |
| `AP-CHOICE-FATIGUE` | More than 2 choices appear within a single exchange of <10 beats | Low |
| `AP-CHOICE-POST-MONOLOGUE` | A `COMMITMENT` choice appears within 1 beat of a >6-line monologue | Medium |

### Reference implementations

- **Phoenix Wright: Ace Attorney (2001)** — Evidence presentation = N-option `DEDUCTION` choice; press/present mechanic. Reference for many-options pattern.
- **Telltale's The Walking Dead (2012)** — Established "Stay silent" as canonical option; binary `COMMITMENT` choices with consequence indicators.
- **Doki Doki Literature Club (2017)** — Word-selection as `INFORMATION` choice with hidden affinity weights. Reference for choice-as-stat-allocation.
- **The Quarry / Until Dawn (2022/2015)** — Timed `COMMITMENT` choices with diegetic pressure. Reference for timer-decorated choices.

### Implementation notes

- For mobile, render options as full-width tap targets, minimum 44pt height, vertically stacked.
- "Stay silent" should not be a default fallback — only include it when the silence is content. If included, give it real `effects`.
- Choice categories drive UI cues: `COMMITMENT` may use a different button color or animation; `DEDUCTION` may surface the journal toolbox.
- Track `seen` per choice for `SYS-09-SKIP` integration.

---

## SYS-03-FLAGS — Flag System

**Layer:** Core  
**Required by:** All VNs  
**Skip when:** Never

### Dependencies
- Requires: `SYS-10-SAVE` (flags must persist)
- Used by: every other system

### Data schema

#### Flag

| Field | Type | Default | Notes |
|---|---|---|---|
| `flag_id` | string | required | Stable, namespace-prefixed (e.g., `met.alex`, `secret.alex.1`) |
| `flag_type` | enum | `BOOLEAN` | `BOOLEAN` / `INTEGER` / `COUNTER` / `TIMESTAMP` |
| `value` | any | type-default | bool: false; int: 0; counter: 0; timestamp: null |
| `set_at_session_id` | string | null | When first set; for visibility-rule check |
| `set_at_event_id` | string | null | What event set it |
| `references_count` | int | 0 | How many checks reference this flag (for orphan detection) |

#### Recommended namespace prefixes

| Prefix | Use |
|---|---|
| `met.` | Has-met-character flags |
| `secret.` | Discovered-secret flags |
| `quest.` | Quest state |
| `mood.` | Emotional state |
| `count.` | Visit/repeat counters (use `COUNTER` type) |
| `cross.` | Cross-character interaction flags |
| `run.` | Per-playthrough flags |
| `time.` | Time-of-day / condition flags |

### Core rules

- **MUST** give every flag a unique stable ID; flag IDs MUST NOT be reused across game versions
- **MUST** provide a referenced-by index — every flag MUST be referenced by at least one content gate or check somewhere in the game
- **MUST** persist all flags via `SYS-10-SAVE` immediately on change, not at session boundaries
- **SHOULD** surface short-arc flags within 1–3 sessions of being set (player must perceive cause-effect)
- **MAY** allow long-arc flags to remain dormant for hours if the eventual payoff is large enough that the player retroactively connects cause and effect — flag the long-arc flag explicitly to avoid orphan detection
- **SHOULD** namespace all flag IDs by prefix (see table above)
- **SHOULD** prefer soft continuity (flag changes a line) over hard continuity (flag locks content) — soft continuity makes characters feel aware; hard continuity makes routes inflexible

### Acceptance criteria

- [ ] Static analysis: no orphan flags (every flag is read by at least one gate or check)
- [ ] Static analysis: no dangling references (every check references a defined flag)
- [ ] Save/reload test: all flag values preserved across save/load cycle
- [ ] Manual review: at least 80% of short-arc flags surface within 3 sessions of being set
- [ ] Long-arc flags are explicitly marked as such in flag definition

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-FLAG-ORPHAN` | A flag is set somewhere but never read | High (silently kills consequence) |
| `AP-FLAG-DANGLING-CHECK` | A check references a flag never set | High (dead branch) |
| `AP-FLAG-DORMANT` | A non-long-arc flag is set but unread for > 5 sessions | Medium |
| `AP-FLAG-COLLISION` | Two flags differ only in capitalization or trivial naming | Medium |
| `AP-FLAG-OVERFLOW` | A `COUNTER` flag exceeds 1000 — likely a bug | Low |
| `AP-FLAG-NOT-NAMESPACED` | Flag ID has no recognized prefix | Low (style) |

### Reference implementations

- **Steins;Gate (2009)** — Phone-trigger flags as the only branching mechanism for the main route. Reference for invisible flag systems.
- **Persona 5 (2017)** — Cross-character flags ("did you talk to A this week with B's quest active") for confidant mood variation. Reference for cross-flag patterns.
- **Umineko (2007–10)** — Long-arc flags spanning multiple chapters. Reference for legitimate long-arc flag patterns.

### Implementation notes

- Implement flags as a key-value store, not as scattered booleans across systems. Centralized store enables static analysis.
- Provide a `flag_audit()` function for build-time orphan/dangling detection.
- For counters (e.g., `count.visits.alex`), provide convenience methods for increment/decrement.
- Timestamp flags (`set_at_session_id`) enable the dormant-flag check.

---

## SYS-04-TIERS — Chapter / Tier Structure

**Layer:** Narrative  
**Required by:** Multi-route narrative, Romance, Slice-of-life, Stat-raise (with adapted shape)  
**Skip when:** Single-track narrative with no character routes

### Dependencies
- Requires: `SYS-03-FLAGS`
- Requires: `SYS-01-AFFECTION` (if romance/dating sim)
- Requires: `SYS-17-STATS` (if stat-gated tiers)

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `tier_id` | string | required | E.g., `alex.tier3` |
| `route_id` | string | required | Character or arc this tier belongs to |
| `tier_index` | int | required | 1-based ordering |
| `tier_name` | string | required | Named beat (Introduction, Friction, Depth, etc.) |
| `unlock_conditions` | list<Condition> | required | Combination of flag, affection, stat, time gates |
| `state` | enum | `LOCKED` | `LOCKED` / `AVAILABLE` / `IN_PROGRESS` / `COMPLETE` |
| `completion_flag` | flag_id | required | Set true on tier completion |
| `tier_shape` | enum | `ROMANCE_5ACT` | `ROMANCE_5ACT` / `MYSTERY_CASE` / `LOOP_ITERATION` / `SLICE_EPISODIC` / `LIVE_DAILY` |

### Tier shapes (pick one per route)

#### ROMANCE_5ACT (5 tiers per character)
1. **Introduction** — surface personality
2. **Friction** — first relationship test
3. **Depth** — first significant secret
4. **Vulnerability** — defense drops
5. **Resolution** — confession/conclusion

#### MYSTERY_CASE (5 tiers per case/incident)
1. **Setup** — incident occurs
2. **Investigation** — evidence gathering
3. **Confrontation** — accusation/trial
4. **Twist** — reframe
5. **Resolution** — verdict

#### LOOP_ITERATION (variable tiers per loop)
1. **Initial Loop** — naive playthrough
2. **Awareness Loop** — protagonist learns of loop
3. **Strategic Loop** — protagonist acts on knowledge
4. **Truth Loop** — full information
5. **Resolution** — break the loop

#### SLICE_EPISODIC (open-ended tier count)
- Each "tier" is a self-contained episode/day
- No fixed shape; episodes accumulate intimacy through repetition
- Use 3+ tiers minimum for emotional arc

#### LIVE_DAILY (daily/weekly cadence)
- Tiers map to days/weeks of live-service content
- `unlock_conditions` includes real-time clock gates
- See `SYS-18-REALTIME`

### Core rules

- **MUST** assign a `tier_shape` to each route at design time; do not mix shapes within a single route
- **MUST** define explicit unlock conditions per tier (no implicit "after the previous one")
- **MUST** ensure between-tier gaps contain content — quests, other characters, ambient activity (the gap is maintenance, not downtime)
- **SHOULD** support compressed routes (3 tiers) for minor characters and expanded routes (7 tiers) for primary characters
- **SHOULD** signal tier transitions clearly in UI (chapter card, tier-name reveal)
- **SHOULD NOT** require >2 weeks of real-time wait between tiers in non-live games
- **MAY** branch tiers (tier 4 has variant 4a / 4b based on prior choices)

### Acceptance criteria

- [ ] Every route has a declared `tier_shape`
- [ ] Every tier has explicit `unlock_conditions`
- [ ] Tier transitions trigger UI cue (card, fade, music change)
- [ ] No tier requires more than 60 minutes of player time to complete (mobile target: 10–20 min)
- [ ] Between-tier gaps offer at least one parallel activity to keep the player engaged

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-TIER-EMPTY-GAP` | Between two tiers, no content/activity is available to the player | High |
| `AP-TIER-MIXED-SHAPE` | A single route mixes tier shapes (e.g., starts ROMANCE then switches to MYSTERY without a meta-frame) | Medium |
| `AP-TIER-UNREACHABLE` | A tier has unlock conditions that cannot be satisfied via any path | High |
| `AP-TIER-FRONT-LOADED` | First tier contains >50% of route content; later tiers feel hollow | Medium |
| `AP-TIER-ROMANCE-FOR-MYSTERY` | Mystery game uses ROMANCE_5ACT shape (common error) | Medium |

### Reference implementations

- **Clannad (2004)** — Canonical ROMANCE_5ACT structure. Per-character routes follow the five-act shape rigidly.
- **Ace Attorney series** — MYSTERY_CASE per case. 4–5 cases per game.
- **Steins;Gate (2009)** — LOOP_ITERATION; the same time period replayed with new knowledge per iteration.
- **VA-11 Hall-A (2016)** — SLICE_EPISODIC; each shift is a tier with no fixed romance arc.
- **Mystic Messenger (2016)** — LIVE_DAILY; tiers are days and unlock by real-clock.

### Implementation notes

- For mobile live-service VNs, prefer LIVE_DAILY or SLICE_EPISODIC. ROMANCE_5ACT can work but requires careful pacing across short sessions (each tier may span multiple sessions).
- Tier completion should set both a `tier.X.complete` flag and trigger a tier-up scene; do not collapse these into one event.

---

## SYS-05-JOURNAL — Journal / Codex / Memo

**Layer:** Narrative  
**Required by:** Mystery (workshop variant), recommended for most VNs  
**Skip when:** Pure short-form (<2hr) VNs

### Dependencies
- Requires: `SYS-03-FLAGS`
- Used by: `SYS-14-DEDUCTION` (workshop variant), `SYS-23-GIFTS` (preference recording)

### Two variants — pick at design time

#### MUSEUM variant (read-only)
- Player browses entries that record discovered facts
- Entries are passive — read but not interacted with
- Use for romance, slice-of-life, narrative-driven VNs

#### WORKSHOP variant (used in mechanics)
- Entries are interactive items the player presents/combines/selects
- Required for `SYS-14-DEDUCTION` (Ace Attorney's Court Record, Danganronpa's Truth Bullets)
- Use for mystery, deduction, evidence-presentation games

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `entry_id` | string | required | Stable |
| `category` | enum | required | `CHARACTER` / `EVIDENCE` / `LOCATION` / `EVENT` / `SECRET` / `PREFERENCE` |
| `title` | string | required | Display name |
| `body` | string | required | Entry text |
| `unlock_flag` | flag_id | required | Flag that gates this entry |
| `unlocked` | bool | false | Computed from unlock_flag |
| `slot_visible` | bool | true | Slot shown as locked silhouette even when not unlocked |
| `actionable` | bool | false | Workshop variant: can be selected for `present`/`combine` actions |
| `voice` | enum | `OBSERVER` | `OBSERVER` / `CHARACTER_VOICE` / `EVIDENCE_NEUTRAL` |

### Core rules

- **MUST** declare variant (MUSEUM or WORKSHOP) at design time
- **MUST** ensure every entry's `body` adds information beyond what the player just saw in-scene (passes "worth reading" test)
- **MUST** use a consistent narrative voice across MUSEUM entries (recommended: second-person past tense)
- **MUST** show locked slots as visible silhouettes (not hidden entirely) — visible-locked is the genre's strongest pull mechanic
- **SHOULD** unlock at least one entry per major character interaction
- **SHOULD** record gift preferences (if `SYS-23-GIFTS` present) automatically once learned
- **MAY** offer entry filtering/search for games with >50 entries
- **WORKSHOP variant MUST** mark actionable entries with a distinct UI affordance

### Acceptance criteria

- [ ] Variant declared
- [ ] Every entry passes the "worth reading" test (manual review)
- [ ] Locked slots visible in UI
- [ ] Save/load preserves unlocked state
- [ ] WORKSHOP entries are selectable in deduction/presentation contexts
- [ ] Entry voice is consistent across at least 90% of entries

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-JOURNAL-RESTATEMENT` | Entry body is a near-duplicate (>80% similarity) of recent in-game dialogue | High |
| `AP-JOURNAL-VOICE-DRIFT` | Entry voice differs notably from established journal voice | Medium |
| `AP-JOURNAL-INVISIBLE-LOCKED` | Locked entries are hidden rather than shown as silhouettes | High |
| `AP-JOURNAL-UNUSED-WORKSHOP` | WORKSHOP variant entry is actionable but never required by any deduction | Medium |
| `AP-JOURNAL-NO-PULL` | All entries unlock simultaneously with no progression mechanic | Medium |

### Reference implementations

- **Persona series** — MUSEUM variant; Social Link records narrate the relationship from observer voice. Locked slots visible.
- **Phoenix Wright: Ace Attorney** — WORKSHOP variant; Court Record is the evidence selection menu used in cross-examinations.
- **Danganronpa** — WORKSHOP variant; Truth Bullets are loaded into a weapon metaphor for class trials.
- **Ace Attorney Investigations: Logic Mode** — WORKSHOP variant with a combine action (pair logic pieces).
- **Ace Attorney: Press / Present (1.5)** — WORKSHOP variant where Court Record entries are *presented* against testimony lines.
- **VA-11 Hall-A (2016)** — MUSEUM variant; conversation logs and news feeds layer ambient world-building.

### Implementation notes

- For MUSEUM journals on mobile, organize by category tabs to avoid long scrolls.
- For WORKSHOP journals, the entry-selection UI is the deduction interface — design them together.
- Consider unlocking entries with a small fanfare and toast — players miss subtle journal updates without one.

---

## SYS-06-ENDINGS — Multiple Ending Structure

**Layer:** Narrative  
**Required by:** Multi-route narrative, Stat-raise, Horror, Loop  
**Skip when:** Pure single-ending narrative

### Dependencies
- Requires: `SYS-03-FLAGS`, `SYS-04-TIERS`
- Recommends: `SYS-12-NGPLUS`, `SYS-24-GALLERY`

### Standard ending taxonomy

| Ending type | Trigger | Function |
|---|---|---|
| `TRUE` / `BEST` | High commitment + cross-route knowledge or specific path | The "you got it right" payoff |
| `GOOD` | Standard route completion with success conditions | Reward for a coherent playthrough |
| `NEUTRAL` | Threshold met but not exceptional | "You got an ending" baseline |
| `BAD` / `BITTERSWEET` | Conditions failed in a meaningful way | Often canonical content; not punishment |
| `JOKE` / `EARLY` | Specific (often silly) conditions early-game | Surprise reward, signposts other endings |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `ending_id` | string | required | Stable |
| `route_id` | string | required | Which route this ending belongs to |
| `ending_type` | enum | required | See taxonomy above |
| `trigger_conditions` | list<Condition> | required | Flag/affection/stat checks |
| `commitment_point_event_id` | string | optional | The earlier moment that *actually* determined this ending |
| `is_canon` | bool | false | If true, considered required reading (e.g., bad endings in DDLC, 999) |
| `unlocks` | list<reward_id> | [] | Gallery entries, NG+ items, codex entries unlocked on viewing |
| `recontextualizes_event_ids` | list<event_id> | [] | Earlier events whose meaning shifts after this ending |

### Core rules

- **MUST** define at least one `commitment_point_event_id` per ending — the moment the ending was actually determined (not the final scene)
- **MUST NOT** rely on a "choose your ending" final menu — endings should be consequences of accumulated play
- **SHOULD** include at least one `BAD` ending per route marked `is_canon = true` for full-route understanding
- **SHOULD** ensure each ending recontextualizes earlier content (`recontextualizes_event_ids` non-empty)
- **SHOULD** unlock something tangible per ending viewed (gallery slot, codex entry, NG+ item)
- **MAY** gate `TRUE` endings behind cross-route knowledge (requires `SYS-12-NGPLUS`)

### Acceptance criteria

- [ ] Each route has at least 2 reachable endings
- [ ] Each ending has a documented `commitment_point_event_id`
- [ ] Each ending is reachable via at least one verified path (test playthrough)
- [ ] Bad endings are not unreachable accidentally; player can deliberately reach them on replay
- [ ] Each ending unlocks at least one persistent reward
- [ ] Ending UI presents a static card with name and brief epitaph

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-ENDING-METER-ONLY` | Ending differs from another only in final scene with no earlier divergence | High |
| `AP-ENDING-MENU` | Final scene presents a "pick your ending" menu | High |
| `AP-ENDING-UNREACHABLE` | An ending exists in data but no flag combination reaches its trigger | High |
| `AP-ENDING-BAD-AS-PUNISHMENT` | Bad ending offers no unique content / journal entries / unlocks | Medium |
| `AP-ENDING-NO-RECONTEXT` | Ending's `recontextualizes_event_ids` is empty | Medium |
| `AP-ENDING-TRUE-WITHOUT-NGPLUS` | TRUE ending reachable on first playthrough trivializes the structure | Low (design choice) |

### Reference implementations

- **999: Nine Hours, Nine Persons, Nine Doors (2009)** — Bad endings are canon-required. The TRUE ending requires having seen a specific bad ending.
- **Doki Doki Literature Club (2017)** — Bad ending content is required reading for the full game.
- **Steins;Gate (2009)** — Multiple endings recontextualize earlier scenes; commitment points planted hours earlier.
- **Clannad (2004)** — Per-route endings + meta-route TRUE ending requiring multi-route completion.
- **Nier: Automata (2017)** — Each ending lettered A through Z; specific endings unlock NG+ content.

### Implementation notes

- For mobile F2P with chapter unlocks, treat each ending as a distinct chapter the player can replay-into.
- An "ending card" UI element is genre-canonical — illustrated CG + ending name + brief text. Do not skip this.
- Track `endings_seen` per save and per global account; many gallery and NG+ systems hook into this.

---

## SYS-07-RIVALRY — Jealousy / Rivalry

**Layer:** Relationship  
**Required by:** Multi-character dating sim where characters share narrative space  
**Skip when:** Single-romance VN, isolated-route VN where characters never overlap

### Dependencies
- Requires: `SYS-01-AFFECTION` (multi-character)
- Requires: `SYS-03-FLAGS`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `character_id` | string | required | Character whose rivalry awareness is tracked |
| `awareness_threshold` | int | 3 | How many "successful exchange with rival" events before this character notices |
| `rivals_aware_of` | list<character_id> | [] | Other characters this one notices |
| `last_neglect_session_count` | int | 0 | Sessions since last visit |
| `cooled_state` | bool | false | True if the character is currently giving the player a cooler reception |
| `tone` | enum | `COMEDY` | `COMEDY` / `DRAMA` — affects line variation |

### Core rules

- **MUST** declare `tone` per character — drama and comedy rivalry use different writing
- **MUST** have at least one alternate opening line per character that triggers when `cooled_state` is true
- **MUST NOT** have characters explicitly name rivals by name (preserves elegance — let the player infer)
- **SHOULD** trigger awareness implicitly via behavior change, not on-screen confrontation
- **SHOULD** clear `cooled_state` after a successful interaction with this character
- **SHOULD NOT** apply hard penalty to affection from rivalry alone — the cooled reception is the content; the affection penalty is optional and small

### Acceptance criteria

- [ ] Every character with `rivals_aware_of` non-empty has at least 1 cooled-state opening line
- [ ] Cooled state triggers within stated thresholds (verified in test runs)
- [ ] No dialogue line explicitly names a rival character (manual review)
- [ ] Drama and comedy tones are distinguishable in writing voice

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-RIVALRY-EXPLICIT` | Line text contains another character's name in a "I know about X" pattern | Medium |
| `AP-RIVALRY-PUNISHING` | Rivalry triggers >5 affection drop without player choice | Medium |
| `AP-RIVALRY-NEVER-FIRES` | A character has rivalry data but no playtest produces cooled state | Low |
| `AP-RIVALRY-TONE-MIX` | Same character mixes COMEDY and DRAMA rivalry lines | Medium |

### Reference implementations

- **Tokimeki Memorial (1994)** — Rival girls phone the player to complain about neglect. Reference for explicit-but-comedic rivalry.
- **Persona 4/5** — Implicit social link timing creates jealousy without confrontation.
- **Story of Seasons / Harvest Moon** — Rival hearts system; villagers court each other if not pursued by player.
- **Rune Factory** — Rival heart events occur regardless of player; other characters pair off independently.

### Implementation notes

- The implicit pattern (Persona) is more elegant than the explicit one (Tokimeki) for modern audiences. Default to implicit.
- For mobile, where players may visit characters non-sequentially across short sessions, calibrate thresholds higher — players won't always remember which character they last neglected.

---

## SYS-08-QUESTS — Quest / Event System

**Layer:** Narrative  
**Required by:** Optional but recommended for stat-raise, dating sim, sandbox VNs  
**Skip when:** Linear narrative, time-based real-life simulators where the calendar replaces quests

### Dependencies
- Requires: `SYS-03-FLAGS`
- Decorates: `SYS-01-AFFECTION`, `SYS-17-STATS`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `quest_id` | string | required | Stable |
| `giver_character_id` | string | required | Which character issues this quest (do NOT make character-agnostic) |
| `state` | enum | `INACTIVE` | `INACTIVE` / `OFFERED` / `ACTIVE` / `COMPLETE` / `EXPIRED` |
| `objective_text` | string | required | What the player must do |
| `triggers` | list<Trigger> | required | Conditions to mark complete (location + item + time) |
| `recurrence` | enum | `ONESHOT` | `ONESHOT` / `RECURRING` / `MISSED_RECURS` |
| `time_window` | range | null | Optional in-fiction time window |
| `reward_unlocks` | list<reward_id> | [] | Affection delta, scene unlock, item, journal entry |
| `foreshadows_event_id` | string | null | Required: what scene/secret this quest sets up |

### Core rules

- **MUST** assign every quest to a `giver_character_id` — quests issued by no one feel like chores
- **MUST** define `foreshadows_event_id` — the scene/secret the quest is preparing the player for
- **MUST NOT** have more than 3 quests `ACTIVE` simultaneously across all characters at any time
- **SHOULD** use `MISSED_RECURS` (Harvest Moon model) for cozy/story VNs — missed quests recur with variation
- **SHOULD** reserve permanent quest failure (`ONESHOT` with hard-fail) for games where loss is a core theme
- **SHOULD** make the quest action diegetic to the giver's personality (a bookish character sends you for books, not generic errands)
- **MUST** track `state` transitions for save/load

### Acceptance criteria

- [ ] Every quest has a non-null `giver_character_id`
- [ ] Every quest has a non-null `foreshadows_event_id`
- [ ] Active quest count never exceeds 3 across the game (testable)
- [ ] Each quest's reward includes at least one persistent unlock
- [ ] Cozy-VN quests use `MISSED_RECURS` (verified by checking game type tag)

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-QUEST-AGNOSTIC` | Quest text could plausibly be issued by any character in the cast | High |
| `AP-QUEST-WAITING-PERIOD` | Quest's `foreshadows_event_id` is empty — quest is filler | High |
| `AP-QUEST-OVERFLOW` | More than 3 quests `ACTIVE` simultaneously | Medium |
| `AP-QUEST-PERMA-FAIL-COZY` | Cozy-game quest is `ONESHOT` and produces hard-fail | High |
| `AP-QUEST-NO-REWARD` | Quest completion has empty `reward_unlocks` | Medium |

### Reference implementations

- **Story of Seasons / Harvest Moon** — Heart events triggered by location + time + affection. `MISSED_RECURS` model.
- **Persona series** — Confidant rank-up requirements as quests with stat thresholds.
- **Fire Emblem: Three Houses** — Tea time / bonding events with character-specific topics.

### Implementation notes

- For mobile, surface active quests in a compact tracker UI rather than a quest log — short sessions don't tolerate menu drilling.
- Quest objective text should be 1 line (mobile) or 2 lines max (PC).

---

## SYS-09-SKIP — Skip / Already-Seen System

**Layer:** Core  
**Required by:** All VNs with replay value (multi-route, multi-ending, NG+)  
**Skip when:** Strictly linear single-playthrough VNs (rare)

### Dependencies
- Requires: `SYS-03-FLAGS` (uses seen-flags from `SYS-02-CHOICE` and per-line markers)

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `dialogue_line_id` | string | required | Per-line stable ID |
| `seen` | bool | false | Mark true on first display |
| `chapter_id` | string | required | Parent chapter for batch operations |

### Skip modes

| Mode | Behavior |
|---|---|
| `OFF` | Normal playback |
| `SKIP_SEEN` | Fast-forward through seen lines; pause on unseen |
| `SKIP_ALL` | Fast-forward all (use sparingly; usually only available after first full completion) |

### Core rules

- **MUST** mark every dialogue line as `seen` on first display
- **MUST** auto-pause skip on encountering an unseen line (default `SKIP_SEEN` mode behavior)
- **MUST** auto-pause skip at every choice point regardless of seen status
- **MUST** persist seen-flags via `SYS-10-SAVE`
- **SHOULD** display a UI indicator when skip is approaching unseen content (Umineko/Higurashi pattern)
- **SHOULD** offer per-chapter "skip to next chapter" jump for replays
- **SHOULD** make skip toggleable via held-input (PC) or sustained tap (mobile)
- **MUST NOT** allow skip to bypass timed choices (`SYS-22-TIMER`) — timed choices always pause

### Acceptance criteria

- [ ] First-pass: no lines incorrectly marked seen (verified by fresh-save test)
- [ ] Replay: previously-seen lines are skippable, choices are not
- [ ] New content (unseen) auto-pauses skip
- [ ] Held-input (or hold-button) skip is responsive within 100ms
- [ ] Mode toggle visible in UI

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-SKIP-MISSING` | Multi-route VN ships without skip system | Critical |
| `AP-SKIP-CHOICE-BYPASS` | Skip mode advances past a choice without player input | Critical |
| `AP-SKIP-TIMER-BYPASS` | Skip advances past a timed choice | Critical |
| `AP-SKIP-NO-INDICATOR` | No UI warning when skip approaches unseen content (in long VNs) | Medium |

### Reference implementations

- **Higurashi remakes / Umineko (07th Expansion)** — Visual indicator when skip nears unseen content.
- **All Ren'Py-based VNs** — Standard `Ctrl` to skip seen, auto-pause on unseen.
- **Most Aksys / Idea Factory localizations** — Skip with menu mode toggle and choice-pause guarantee.

### Implementation notes

- Mark seen at the *line* level, not chapter level — players who quit mid-chapter expect resume to know which lines are seen.
- For mobile, surface skip as a holdable button on the side rail; tap-and-hold initiates skip, release stops.

---

## SYS-10-SAVE — Save / Checkpoint System

**Layer:** Core  
**Required by:** All VNs  
**Skip when:** Never

### Dependencies
- Used by: every other system (state persistence)

### Save model decision (driven by `SYS-A.4`)

| Cadence | Save model | Slots |
|---|---|---|
| One-shot premium | `MANUAL_PLUS_AUTO` | Many manual + 5–10 auto |
| Episodic paid | `AUTO_ONLY` | Auto-only, chapter-replay rewind |
| Live-service F2P | `AUTO_ONLY_CLOUD` | Auto-only, cloud-synced |
| Real-time | `AUTO_ONLY_SERVER` | Server-anchored, no rollback |

### Data schema (save record)

| Field | Type | Notes |
|---|---|---|
| `save_id` | string | Stable; "auto", "auto.N", or user-named |
| `save_type` | enum | `AUTO` / `MANUAL` / `CHECKPOINT` |
| `created_at` | timestamp | Real-clock |
| `chapter_id` | string | Current chapter |
| `event_id` | string | Last completed event |
| `flags_snapshot` | map | Full flag state |
| `affection_snapshot` | map | All character meters |
| `stats_snapshot` | map | All player stats |
| `inventory_snapshot` | map | Items |
| `journal_snapshot` | map | Unlocked entries |
| `tier_progress_snapshot` | map | Per-route tier states |
| `run_counter` | int | NG+ depth |
| `playtime_seconds` | int | Cumulative |
| `screenshot_thumbnail` | image | UI preview (manual saves) |

### Core rules

- **MUST** save all listed snapshot fields atomically — partial saves cause state corruption
- **MUST** auto-save after every meaningful event: end of exchange, choice resolution, tier change, item unlock, quest state change
- **MUST** persist within 1 second of state change to survive app interruption
- **SHOULD** support cloud sync for cross-device players (mobile)
- **SHOULD** save before every choice (enables branch-save pattern in PC titles)
- **SHOULD NOT** expose manual saves in `AUTO_ONLY` modes — chapter replay is the rewind affordance
- **MAY** offer save-state previews (screenshot + chapter name + playtime)

### Acceptance criteria

- [ ] Every snapshot field correctly persisted (round-trip test)
- [ ] Auto-save fires within 1s of state change (timing test)
- [ ] App-kill at any point recovers to within 1 meaningful beat
- [ ] Cloud sync resolves correctly on multi-device test
- [ ] Save model matches game cadence per Section A.4

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-SAVE-PARTIAL` | A save record missing any snapshot field | Critical |
| `AP-SAVE-LOSS-WINDOW` | App kill produces > 1 beat regression | Critical |
| `AP-SAVE-MANUAL-IN-LIVE` | Manual saves enabled in real-time/live-service game | High |
| `AP-SAVE-NO-CLOUD-MOBILE` | Mobile F2P without cloud sync (cross-device gap) | Medium |

### Reference implementations

- **Most PC VNs (Ren'Py-based)** — Save anywhere + auto-save. Branch-save pattern is the intended exploration mechanism.
- **Choices, Episode (mobile F2P)** — `AUTO_ONLY` with chapter-replay rewind. No manual saves exposed to player.
- **Mystic Messenger** — `AUTO_ONLY_SERVER`. Real-time content cannot be save-scummed.

### Implementation notes

- For mobile, prefer atomic save-on-tap-advance — every story tap commits the new state.
- Cloud sync conflicts: prefer last-write-wins on a per-flag basis with a merge log; full-snapshot conflicts are user-confusing.
- Keep one "rewind" save (last 5 minutes) even in `AUTO_ONLY` modes for crash recovery.

---

## SYS-11-PACING — Compression / Pacing

**Layer:** Core (rules layer over `SYS-02-CHOICE` and content authoring)  
**Required by:** All VNs  
**Skip when:** Never

### Dependencies
- Layered over: `SYS-02-CHOICE`

### Data schema

This system is rules-only; no persistent state. The fields below are content-authoring constraints.

| Constraint | Mobile target | PC target |
|---|---|---|
| Lines per character per beat | 1 | 1–3 |
| Beats per exchange before choice | 8–15 | 10–25 |
| Words per option | 2–12 | 2–12 |
| Beats between choices | 5+ | 8+ |
| Max line length (chars) | 80 | 140 |

### Core rules

- **MUST** keep individual dialogue lines under platform max chars
- **MUST** present at least one choice per exchange of >15 beats
- **MUST NOT** present a `COMMITMENT` choice within 1 beat of a >6-line monologue
- **SHOULD** reach a choice within 8–15 beats on mobile, 10–25 on PC
- **SHOULD** show a character reaction (expression/animation) before the verbal response when introducing a major emotional shift
- **SHOULD** use ellipsis ("...") and structural pauses as character voice — silence carries content
- **SHOULD** write the last line of each exchange first, then construct the exchange to land on it

### Acceptance criteria

- [ ] Auto-check: no line exceeds platform max chars
- [ ] Auto-check: no exchange exceeds 15 beats (mobile) without a choice
- [ ] Auto-check: no `COMMITMENT` choice within 1 beat of a >6-line monologue
- [ ] Manual review: at least 60% of major exchanges end on a memorable last line
- [ ] Manual review: ellipsis/silence used intentionally, not as filler

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-PACING-LINE-OVERFLOW` | A dialogue line exceeds platform max chars | Medium |
| `AP-PACING-NO-CHOICE` | An exchange of >15 beats (mobile) has no choices | High |
| `AP-PACING-CHOICE-AFTER-MONOLOGUE` | A `COMMITMENT` choice within 1 beat of a >6-line monologue | Medium |
| `AP-PACING-FILLER-EXCHANGE` | An exchange contains no flag set, no affection delta, no choice, no memorable last line | High |

### Implementation notes

- The "three-line rule" is PC convention; mobile runs on **one line per tap**. Default to one-line beats for mobile.
- "Memorable last line" is qualitative — use playtest tagging or LLM-assisted review to flag exchanges ending on a flat line.

---

## SYS-12-NGPLUS — New Game Plus

**Layer:** Narrative / Retention  
**Required by:** Multi-route narrative VNs, Loop games  
**Skip when:** Single-route, no replay incentive

### Dependencies
- Requires: `SYS-03-FLAGS`, `SYS-06-ENDINGS`
- Recommends: `SYS-25-FLOWCHART`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `run_number` | int | 1 | Increments on each NG+ start |
| `carryover_inventory` | list<item_id> | [] | Items kept across runs |
| `carryover_journal_archive` | list<entry_id> | [] | Journal entries marked archive |
| `carryover_endings_seen` | list<ending_id> | [] | Endings already viewed |
| `carryover_routes_completed` | list<route_id> | [] | Cleared routes |
| `meta_unlocks` | list<unlock_id> | [] | Cross-run unlocks (e.g., new starting choices) |
| `relationship_meters_reset` | bool | true | Should always be true |
| `quest_states_reset` | bool | true | Should always be true |

### Core rules

- **MUST** reset relationship meters and quest states each run
- **MUST** preserve player knowledge artifacts (journal archive, endings seen)
- **MUST NOT** gate `TRUE` ending behind run number alone — gate it behind player knowledge applied via choices
- **SHOULD** unlock at least one new dialogue option per run-2 character (recognition of player familiarity)
- **SHOULD** carry inventory and codex across runs to reward engagement
- **MAY** introduce content visible only on run 2+ (new choices, new scenes)

### Acceptance criteria

- [ ] Run start: meters and quests verified reset
- [ ] Run start: archive and inventory verified preserved
- [ ] At least one run-2-only piece of content per route
- [ ] TRUE ending requires player knowledge that could only be gathered across runs

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-NGPLUS-METER-CARRY` | Affection meter persists across runs | High (breaks the "journey matters" rule) |
| `AP-NGPLUS-NO-NEW-CONTENT` | Run 2+ has no new lines / scenes / unlocks | Medium |
| `AP-NGPLUS-RUN-GATE-ONLY` | TRUE ending is gated on `run_number >= 2` alone | Medium |
| `AP-NGPLUS-NO-ARCHIVE` | Journal/codex resets across runs | Medium |

### Reference implementations

- **Clannad (2004)** — Knowledge of which choices matter in earlier routes unlocks the true ending.
- **Nier: Automata (2017)** — Run 2 reframes Run 1 with new perspective.
- **Zero Escape series (2009–16)** — Cross-run knowledge is the explicit puzzle.
- **Fate/stay night (2004)** — Routes unlock in sequence; later routes recontextualize earlier.

### Implementation notes

- For mobile F2P, NG+ may be implicit via chapter-replay rather than full restart. Treat each chapter replay as its own NG+ unit.
- Surface "new content available" indicators on subsequent runs (similar to `SYS-09-SKIP` unseen-content marker).

---

## SYS-13-ROUTELOCK — Route Lock System

**Layer:** Narrative  
**Required by:** Long, intensive character routes (Key VAs, otome with deep routes)  
**Skip when:** Variety-per-session VNs, mobile live-service, multi-protagonist (`SYS-26`)

### Dependencies
- Requires: `SYS-04-TIERS`
- Conflicts: `SYS-26-MULTIPROTAG` (perspective fluidity vs commitment lock)

### Lock variants

| Variant | Mechanism | Use case |
|---|---|---|
| `HARD_LOCK` | After lock-point event, only chosen route's content available | Key VAs, intensive single-character arcs |
| `SOFT_LOCK` | Diminishing returns; other characters' content slows | Mid-length VNs that want focus without restriction |
| `UNLOCK_BY_PRIOR` | Routes gate by completion of prior routes | Fate/stay night model; modern mobile multi-character |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `route_id` | string | required | Locked-into route |
| `lock_variant` | enum | required | See variants table |
| `lock_event_id` | string | required | When the lock activates |
| `prior_route_requirements` | list<route_id> | [] | For UNLOCK_BY_PRIOR variant |
| `unlocked_routes` | list<route_id> | [] | Currently accessible routes (computed) |

### Core rules

- **MUST** declare `lock_variant` at design time
- **HARD_LOCK MUST** signal the lock point clearly to the player before lock activates ("you are about to commit")
- **SOFT_LOCK SHOULD** make the diminishing returns visible (e.g., other characters become "busy")
- **UNLOCK_BY_PRIOR MUST** show locked routes with an unlock condition hint (not invisible)
- **SHOULD NOT** use `HARD_LOCK` in mobile live-service VNs — variety per session is the appeal

### Acceptance criteria

- [ ] Lock variant declared and consistent across all routes
- [ ] HARD_LOCK lock point is signaled to the player at least 1 beat before activation
- [ ] UNLOCK_BY_PRIOR routes display unlock hints
- [ ] Save/load preserves locked-route state correctly

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-ROUTELOCK-UNSIGNALED` | HARD_LOCK activates without prior warning to player | High |
| `AP-ROUTELOCK-HIDDEN-PRIOR` | UNLOCK_BY_PRIOR routes are invisible rather than locked-with-hint | Medium |
| `AP-ROUTELOCK-MOBILE-LIVE` | HARD_LOCK in live-service mobile game | High |

### Reference implementations

- **Fate/stay night (2004)** — UNLOCK_BY_PRIOR. Fate → Unlimited Blade Works → Heaven's Feel.
- **Little Busters (2007)** — HARD_LOCK after route entry.
- **Hakuoki series** — UNLOCK_BY_PRIOR with route-completion gating.
- **Persona series** — SOFT_LOCK via calendar — committed time to one confidant means less for others.

### Implementation notes

- For mobile multi-character VNs, `UNLOCK_BY_PRIOR` is usually the cleanest pattern — never block a desired character forever, just require earned context.
- The signal for HARD_LOCK should be in-fiction ("If you go with her now, you can't come back tonight") rather than a system popup ("Route locked").

---
## SYS-14-DEDUCTION — Investigation & Deduction

**Layer:** Mastery  
**Required by:** Mystery, Detective, Class-trial-style VNs  
**Skip when:** Pure romance, slice-of-life, non-mystery narratives

### Dependencies
- Requires: `SYS-03-FLAGS`, `SYS-05-JOURNAL` (WORKSHOP variant)
- Pairs well with: `SYS-25-FLOWCHART`, `SYS-21-CARDS` (mobile-native abstraction)

### Variants — pick one

| Variant | Mechanic | Reference |
|---|---|---|
| `PRESS_PRESENT` | Press statements for elaboration; Present evidence on contradiction | Ace Attorney |
| `BULLET_DEBATE` | Statements as projectiles; load truth/evidence as ammunition | Danganronpa |
| `LOGIC_COMBINE` | Pair logic pieces in a separate menu | Ace Attorney Investigations |
| `CARD_DEBATE` | Card-attribute counter system (mobile-friendly) | Tears of Themis |
| `INTERROGATE_MENU` | Verb menu (Look/Ask/Show/Think) with topic gating | Famicom Detective Club, Hotel Dusk |
| `STORYBOARD_INTERVENE` | Navigate a non-linear story map; intervene at correct points | Paranormasight |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `encounter_id` | string | required | A trial / cross-examination / debate session |
| `variant` | enum | required | See variants table |
| `phases` | list<Phase> | required | Sub-stages (e.g., trial → cross-ex → closing) |
| `penalty_type` | enum | `PENALTY_BAR` | `PENALTY_BAR` / `HP` / `RETRY_GRACEFUL` / `NONE` |
| `penalty_max` | int | 5 | Strikes available |
| `penalty_current` | int | 0 | Current strikes |
| `required_evidence_set` | list<journal_entry_id> | required | What journal entries must exist before encounter starts |
| `state` | enum | `LOCKED` | `LOCKED` / `READY` / `IN_PROGRESS` / `COMPLETE` / `FAILED` |

#### Phase

| Field | Type | Notes |
|---|---|---|
| `phase_id` | string | Stable |
| `phase_type` | enum | `TESTIMONY` / `CROSS_EX` / `DEBATE` / `CLOSING` / `INTERROGATION` |
| `target_data` | object | Variant-specific (statement set, card pool, etc.) |
| `success_condition` | Condition | Required correct selection(s) |

### Core rules

- **MUST** ensure all required evidence is in the journal *before* the encounter starts
- **MUST** allow the player to be wrong without progressing; wrong → penalty + retry
- **MUST NOT** soft-lock the player; ensure either retry, hint after N failures, or graceful exit
- **MUST NOT** rely on information the player was never shown — every required deduction input is in `SYS-05-JOURNAL`
- **SHOULD** vary the variant within a long game to avoid repetition (Danganronpa stacks 4 minigames per trial for this reason)
- **SHOULD** offer a hint system after N consecutive failures (3 is a common threshold)
- **SHOULD** not over-highlight the "interesting" statement — that removes the deduction

### Acceptance criteria

- [ ] Variant declared and consistent within encounter
- [ ] All required evidence is unlocked before encounter is reachable (verified by playthrough)
- [ ] Wrong answer produces penalty without soft-lock
- [ ] Hint system fires after configured failure count
- [ ] On `COMPLETE`, narrative reaction immediately follows correct deduction (no dead time)

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-DEDUCTION-MISSING-EVIDENCE` | Required evidence not in journal at encounter start | Critical |
| `AP-DEDUCTION-SOFT-LOCK` | Penalty exhausted with no retry/hint path | Critical |
| `AP-DEDUCTION-HAND-HOLD` | Correct answer is highlighted in UI before player chooses | High |
| `AP-DEDUCTION-NO-PENALTY` | Wrong answer advances story regardless | High |
| `AP-DEDUCTION-FATIGUE` | Single encounter exceeds 30 minutes of mobile playtime without phase change | Medium |

### Reference implementations

- **Phoenix Wright: Ace Attorney (2001)** — `PRESS_PRESENT`. Court Record as evidence menu. Penalty bar.
- **Danganronpa (2010)** — `BULLET_DEBATE` + Hangman + Bullet Time Battle + Closing Argument stacked per trial.
- **Tears of Themis (2020)** — `CARD_DEBATE`. Empathy/Logic/Intuition counter system. Mobile-native abstraction.
- **Paranormasight: The Seven Mysteries of Honjo (2023)** — `STORYBOARD_INTERVENE`. Story-map navigation as deduction.
- **Famicom Detective Club (1988, 2021 remake)** — `INTERROGATE_MENU`. Verb-based command menus.

### Implementation notes

- For mobile, `CARD_DEBATE` is the native abstraction — it gives players a "battle" feedback loop without action gameplay, and integrates cleanly with `SYS-21-CARDS`.
- `PRESS_PRESENT` requires more text and longer screen time; better suited to PC/console or premium mobile titles.
- Keep encounter-time scoped to ~10–20 minutes on mobile; 30–60 minutes on PC.

---

## SYS-15-PUZZLE — Puzzle Integration

**Layer:** Mastery  
**Required by:** Optional; Zero Escape-style narratives, Steins;Gate-style invisible-mechanic VNs  
**Skip when:** Pure narrative, romance with no diegetic puzzle space

### Dependencies
- Requires: `SYS-03-FLAGS`
- Recommends: `SYS-12-NGPLUS` (puzzles whose meaning shifts on replay)

### Variants

| Variant | Description | Reference |
|---|---|---|
| `ESCAPE_ROOM` | Examine objects, combine items, solve locks within a defined space | 999, Zero Escape series |
| `INVISIBLE_TRIGGER` | Diegetic actions (answer phone, ignore message) are the only branches; no menu | Steins;Gate |
| `WORD_SELECTION` | Pick words/items from a pool; cumulative selection determines outcome | Doki Doki Literature Club poem |
| `LOGIC_PAIRING` | Pair information units to derive new ones | Ace Attorney Logic Mode |
| `DELUSION_CHOICE` | Choose protagonist's mental state at specific moments | Steins;Gate 0, Chaos;Head |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `puzzle_id` | string | required | Stable |
| `variant` | enum | required | See variants |
| `diegetic_frame` | string | required | What the puzzle *is* in fiction (a phone, a code, a poem) |
| `solution_data` | object | required | Variant-specific |
| `state` | enum | `LOCKED` | `LOCKED` / `AVAILABLE` / `IN_PROGRESS` / `SOLVED` |
| `time_estimate_minutes` | int | required | Author's intended time-to-solve |
| `hint_levels` | list<Hint> | [] | Tiered hints; player requests them |
| `solved_flag` | flag_id | required | Set on solve |
| `replayable` | bool | true | Available in NG+/replay |
| `skip_after_solved` | bool | true | Auto-skip on subsequent runs |

### Core rules

- **MUST** be diegetic — the puzzle must arise from the fiction (a code in a spy VN, not a sliding puzzle in a romance VN)
- **MUST** target ≤ 10 minutes of solve time on mobile, ≤ 20 on PC for typical puzzles; longer puzzles MUST be acts unto themselves with mid-puzzle save
- **MUST** offer a hint or skip path after sustained failure (3+ minutes idle, or 5+ wrong attempts)
- **MUST** mark puzzle as auto-skipped on replay (unless puzzle's meaning changes per run)
- **SHOULD** make the puzzle's solution a story beat — solving advances/reveals plot, not just unlocks the next chapter
- **SHOULD** scale difficulty to readers, not gamers — VN audience is text-led, not puzzle-trained
- **MAY** invisible-trigger variants (Steins;Gate) eliminate explicit puzzle UI — diegetic actions are the verb

### Acceptance criteria

- [ ] Puzzle is diegetic (manual review)
- [ ] Time estimate respected by 80% of playtest population (within 1.5× target)
- [ ] Hint system reachable in ≤3 taps
- [ ] Replay auto-skips solved puzzles unless puzzle is run-variant
- [ ] Solution reveals story content (not just chapter advance)

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-PUZZLE-NON-DIEGETIC` | Puzzle has no fictional grounding (random sliding puzzle in a love story) | High |
| `AP-PUZZLE-NO-SKIP-REPLAY` | Solved puzzle replays in NG+ with no skip option | Medium |
| `AP-PUZZLE-UNFAIR` | Required information for solution is not in-game | Critical |
| `AP-PUZZLE-MOBILE-OVERLONG` | Mobile puzzle exceeds 15 minutes target | Medium |
| `AP-PUZZLE-DEAD-CONTENT` | Solving the puzzle reveals nothing story-meaningful | Medium |

### Reference implementations

- **999 / Virtue's Last Reward / Zero Time Dilemma** — `ESCAPE_ROOM`. Per-chapter rooms carry plot data; cipher solutions are story keys.
- **Steins;Gate (2009)** — `INVISIBLE_TRIGGER`. The phone is the entire branching mechanism. No traditional menus.
- **Doki Doki Literature Club (2017)** — `WORD_SELECTION`. Hidden affinity weights drive routing.
- **Ace Attorney Investigations** — `LOGIC_PAIRING`. Combine logic pieces to derive deductions.
- **Steins;Gate 0 (2015)** — `DELUSION_CHOICE`. Pick positive/negative/no delusion at specific moments.

### Implementation notes

- For mobile, prefer `WORD_SELECTION` and `INVISIBLE_TRIGGER` over `ESCAPE_ROOM` — escape rooms require precise touch interaction with multiple objects in tight spaces.
- Always provide a "show me the solution" option after extended failure — frustration kills retention faster than skipping kills mastery feel.

---

## SYS-16-SCHEDULE — Time Management & Scheduling

**Layer:** Mastery  
**Required by:** Stat-raise, Live-service VNs, Persona-likes  
**Skip when:** Linear narrative, single-session VNs

### Dependencies
- Requires: `SYS-03-FLAGS`
- Pairs with: `SYS-17-STATS` (the stats that scheduling allocates to), `SYS-08-QUESTS`, `SYS-18-REALTIME`

### Variants

| Variant | Time unit | Reference |
|---|---|---|
| `CALENDAR_FIXED` | Day, with N slots per day; total fixed-length campaign | Persona, Long Live the Queen |
| `WEEKLY_BUDGET` | Weekly action point allocation | Princess Maker, Tokimeki Memorial |
| `REAL_TIME_DAILY` | Real-clock anchored daily slots | Mystic Messenger |
| `SESSION_AS_DAY` | Each player session = one fictional day | Compressed mobile model |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `current_time_unit` | int | 1 | Day / week index |
| `time_unit_max` | int | required | Total campaign length |
| `slots_per_unit` | int | required | E.g., 2 for Persona's after-school + evening |
| `slots_used_this_unit` | int | 0 | Resets each unit |
| `available_activities` | list<Activity> | computed | What can be scheduled this slot |
| `scheduled_activity_id` | string | null | Currently committed activity |
| `forecast` | list<Event> | required | Upcoming non-optional events with dates |

#### Activity

| Field | Type | Notes |
|---|---|---|
| `activity_id` | string | Stable |
| `slot_cost` | int | How many slots this consumes |
| `effects` | list<Effect> | Stat/affection deltas, flags |
| `availability_conditions` | list<Condition> | Day-of-week, weather, prior flags |

### Core rules

- **MUST** make time scarce — total slots across the campaign MUST be less than total content (player cannot do everything in one run)
- **MUST** allow the player to plan — surface the calendar/schedule view at any time
- **MUST** provide forecast — show known upcoming non-optional events (e.g., "school festival on day 15")
- **SHOULD** vary activity slot costs (some take 1 slot, some take 2) to add planning depth
- **SHOULD** carry stats (or other progress) into NG+ so a second run lets the player complete more (Persona model)
- **SHOULD NOT** punish missing one day with permanent route loss — provide catch-up windows
- **MUST NOT** converge to one optimal strategy — multiple viable schedules MUST exist (verified by playtest)

### Acceptance criteria

- [ ] Total content > time available (player must choose)
- [ ] Multiple viable strategies verified via playtest
- [ ] Calendar/forecast view available always (≤2 taps)
- [ ] Auto-save fires after every slot commitment
- [ ] NG+ carries forward progress per `SYS-12-NGPLUS`

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-SCHEDULE-OPTIMAL-CONVERGENCE` | Playtest reveals one strategy dominates all others | High (mechanic reduces to checklist) |
| `AP-SCHEDULE-NO-FORECAST` | Player cannot see upcoming required events | High |
| `AP-SCHEDULE-OVER-VARIABLE` | More than 8 simultaneous tracked stats — opacity threshold | Medium |
| `AP-SCHEDULE-PUNISHING-GAP` | Missing one day produces permanent loss with no catch-up | High |
| `AP-SCHEDULE-RNG-GAINS` | Stat gains include RNG (genre's most-hated pattern) | High |

### Reference implementations

- **Persona 5 (2017)** — `CALENDAR_FIXED`. School year, 1–3 slots per day, 20+ confidants competing for time.
- **Long Live the Queen (2012)** — `WEEKLY_BUDGET`. 40 weeks, 2 slots/week, mood modifiers on stat gains.
- **Tokimeki Memorial (1994)** — `WEEKLY_BUDGET`. 3-year span, weekly action allocation.
- **Princess Maker series** — `WEEKLY_BUDGET`. Monthly schedule, multi-year spans.
- **Mystic Messenger (2016)** — `REAL_TIME_DAILY`. Real clock drives chatroom availability.

### Implementation notes

- For mobile, prefer 5–15 day arcs over 365-day arcs. Persona's full year is too heavy for mobile session patterns.
- The `SESSION_AS_DAY` compression converts schedule depth into per-session decision: each return to the game advances one day.
- Always show stat-up amounts deterministically. RNG on stat gains breaks the planning loop.

---

## SYS-17-STATS — Stat Building & Parameter Systems

**Layer:** Mastery  
**Required by:** Stat-raise, Persona-likes  
**Skip when:** Pure narrative, simple romance

### Dependencies
- Requires: `SYS-02-CHOICE`, `SYS-03-FLAGS`
- Pairs with: `SYS-16-SCHEDULE`, `SYS-23-GIFTS`
- Gates: `SYS-02-CHOICE` (option visibility/unlocks)

### Data schema

#### Stat definition

| Field | Type | Default | Notes |
|---|---|---|---|
| `stat_id` | string | required | E.g., `charm`, `knowledge`, `composure` |
| `stat_name` | string | required | Display |
| `stat_type` | enum | `LINEAR_5` | `LINEAR_5` (1–5 named ranks) / `LINEAR_100` (raw 0–100) / `PAIRED` (with weakness modifier) |
| `min_value` | int | 0 | Floor |
| `max_value` | int | 5 | Ceiling |
| `tier_names` | list<string> | required for LINEAR_5 | E.g., `[Awkward, Charming, Confident, Magnetic, Captivating]` |
| `paired_stat_id` | string | null | For PAIRED variant; gain rate inversely affected |
| `visible_to_player` | bool | true | Almost always true |
| `gates_choices` | bool | true | Whether choice options check this stat |

#### Stat instance (per-player)

| Field | Type | Default | Notes |
|---|---|---|---|
| `stat_id` | string | required | FK to definition |
| `value` | int | 0 | Current |
| `last_change_session_id` | string | null | For tracking |

### Core rules

- **MUST** show stats numerically and as named tiers if `LINEAR_5` (e.g., "Charm: 4 (Magnetic)")
- **MUST** make stats matter at choice-time — at least 30% of stats should appear in `required_stat_thresholds` somewhere
- **MUST NOT** include RNG in stat gain rates — gains are deterministic (mood modifiers per Long Live the Queen are deterministic, just contextual)
- **MUST** keep stat count ≤ 8 for legibility (Long Live the Queen's 16+ is the upper edge; default to 5–6)
- **SHOULD** foreshadow endgame stat checks — if a stat threshold matters in chapter 10, the stat must have been visible from chapter 1
- **SHOULD** show stat-check failures *after the fact* even if not before — the player who failed needs to know which stat was the issue
- **SHOULD** name tiers — "Charm: 4 (Magnetic)" reads better than "Charm: 47/100"

### Acceptance criteria

- [ ] Stat count is ≤ 8
- [ ] Each stat has tier names if `LINEAR_5`
- [ ] At least 30% of stats appear in choice gates somewhere
- [ ] No RNG in stat gain rates (verified by static analysis of effect definitions)
- [ ] Failed stat checks produce post-fact "which stat" feedback
- [ ] Endgame stat checks have visibility from at least chapter 1 of the relevant route

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-STATS-BLOAT` | Stat count > 8 | Medium |
| `AP-STATS-RNG` | Any stat gain has RNG component | High |
| `AP-STATS-HIDDEN-CHECK` | Stat check exists but stat is invisible to player | High |
| `AP-STATS-NEVER-CHECKED` | Stat exists but appears in zero choice gates | Medium |
| `AP-STATS-NO-TIER-NAMES` | LINEAR_5 stat has no tier names | Low (style) |
| `AP-STATS-DECOUPLED` | Max-tier stat produces no narrative variation | Medium |

### Reference implementations

- **Persona 5 (2017)** — 5 stats, `LINEAR_5`, named tiers, gate confidant access and choice options. Reference standard.
- **Hatoful Boyfriend (2011)** — 3 stats (Wisdom, Vitality, Charisma). Minimum-viable stat system.
- **Long Live the Queen (2012)** — 40+ paired stats with mood modifiers. Upper edge of complexity.
- **Princess Maker (1991)** — Multi-vector lifestyle stats with non-linear interactions.

### Implementation notes

- Default to 5–6 stats for mobile. Less is more — Hatoful's 3 is a tested minimum.
- Stat-up animations (Persona's "Charm increased!" toast) are essential feedback — the integer change is the dopamine.
- For F2P mobile, ensure stat caps don't make late-game players feel stalled — provide late-route stat-cap raises if applicable.

---

## SYS-18-REALTIME — Real-Time / Live Interactions

**Layer:** Mastery  
**Required by:** Mobile live-service VNs (Mystic Messenger model)  
**Skip when:** Premium one-shot VNs, console releases

### Dependencies
- Requires: `SYS-10-SAVE` (`AUTO_ONLY_SERVER` model)
- Pairs with: `SYS-19-CHATUI`, `SYS-16-SCHEDULE` (`REAL_TIME_DAILY` variant), `SYS-22-TIMER`
- Conflicts: `SYS-10-SAVE` manual-save model (real-time content cannot be save-scummed)

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `event_id` | string | required | Stable |
| `event_type` | enum | required | `CHATROOM` / `CALL` / `TEXT` / `EMAIL` / `STORY_BEAT` |
| `scheduled_local_time` | time | required | HH:MM in player's local timezone |
| `scheduled_day_offset` | int | required | Day of route (1, 2, 3, ...) |
| `duration_seconds` | int | optional | For chatrooms with active windows |
| `expires_after` | duration | required | When event becomes "missed" |
| `recoverable` | bool | true | Whether `recovery_cost` (currency or wait) can unlock missed |
| `recovery_cost` | int | 0 | Currency or wait-time in seconds |
| `state` | enum | `SCHEDULED` | `SCHEDULED` / `ACTIVE` / `COMPLETED` / `MISSED` / `RECOVERED` |
| `attended_at` | timestamp | null | When player joined |

### Core rules

- **MUST** anchor schedules to player's local timezone, not server time
- **MUST** provide a recovery path for every missed event — no permanent content loss without recovery option
- **MUST** require explicit opt-in for push notifications (mobile platform requirements + UX care)
- **MUST NOT** schedule events between player's local 1:00 AM – 7:00 AM (with rare narrative-justified exceptions, marked explicitly)
- **SHOULD** distribute events across morning / lunch / evening / night windows so any reasonable schedule allows engagement
- **SHOULD** vary character "online" timing — characters should not all reply at uniform speeds
- **SHOULD** detect timezone via device, not user input (with manual override)
- **MAY** include rare diegetic-3am-events (a character has insomnia and messages the player) — these are content, not schedule errors

### Acceptance criteria

- [ ] All events have `scheduled_local_time`, `scheduled_day_offset`, `expires_after`
- [ ] Every missable event has a recovery path
- [ ] No events scheduled in 1:00–7:00 AM local except marked diegetic-overnight
- [ ] Push notifications opt-in flow implemented
- [ ] Timezone detection works; manual override available
- [ ] Test: simulate full route across 24-hour cycle without losing content

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-REALTIME-SERVER-TIME` | Events scheduled in server time, not local | High |
| `AP-REALTIME-NIGHT-CRAM` | Events scheduled in 1–7 AM local without `diegetic_overnight` flag | High |
| `AP-REALTIME-NO-RECOVERY` | Missed event has no recovery path | High |
| `AP-REALTIME-PUSH-SPAM` | More than 6 push notifications scheduled per day | Medium |
| `AP-REALTIME-UNIFORM-PACE` | All character responses fire at identical timing | Low (style) |
| `AP-REALTIME-WORKDAY-CRAM` | All events between 9 AM and 5 PM (workday-inaccessible) | High |

### Reference implementations

- **Mystic Messenger (2016)** — Canonical implementation. ~30 chatrooms across 11 days, real-clock anchored, recovery via in-game currency.
- **Lifeline series (2015)** — Single-protagonist real-time text exchanges with hours-long delays.
- **Bury Me, My Love (2017)** — WhatsApp-style migrant journey, days-long pacing.
- **Obey Me! Shall We Date? (2019)** — Hybrid real-time chat + episodic story.
- **A Normal Lost Phone (2017)** — Asynchronous found-phone variant; time-flow is fictional.

### Implementation notes

- The "the protagonist sleeps too" beat is rare-on-purpose — when a character DOES message at 3 AM, players notice.
- Calibrate push frequency conservatively: 3–4 notifications/day is a good upper bound for non-event days; 6 max on event-heavy days.
- For global launches, consider regional schedule profiles — Asian dinner hours differ from Western dinner hours significantly.

---

## SYS-19-CHATUI — Chat / Messaging UI

**Layer:** Presentation  
**Required by:** Real-time VNs, slice-of-life mobile VNs with phone-as-frame  
**Skip when:** Traditional VN UI suffices

### Dependencies
- Decorates: `SYS-02-CHOICE`
- Recommends: `SYS-18-REALTIME`, `SYS-22-TIMER`

### Variants

| Variant | Reference |
|---|---|
| `GROUP_CHAT` | Mystic Messenger |
| `ONE_ON_ONE_TEXT` | Choices "phone overlay" texts, Lifeline |
| `SOCIAL_FEED` | Simulacra (instagram-like in-game) |
| `JIGSAW_BUBBLES` | Florence (assembly minigame) |
| `FOUND_PHONE` | A Normal Lost Phone, Sara is Missing |

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `conversation_id` | string | required | Stable |
| `variant` | enum | required | See variants |
| `participants` | list<character_id> | required | Group chats can have many |
| `messages` | list<Message> | required | Ordered |
| `typing_indicators` | list<character_id> | [] | Currently "typing" |
| `read_receipts_enabled` | bool | true | Last-read marker per character |

#### Message

| Field | Type | Notes |
|---|---|---|
| `message_id` | string | Stable |
| `sender_id` | string | character_id or `player` |
| `content_type` | enum | `TEXT` / `IMAGE` / `STICKER` / `VOICE` / `LINK` |
| `content` | any | Variant-specific payload |
| `delay_after_previous_seconds` | float | Pacing |
| `read_at` | timestamp | When player saw it |
| `reactions` | list<reaction> | Emoji reactions from other characters |

### Core rules

- **MUST** match the user's mental model of the metaphor — iMessage-shape implies iMessage behaviors (typing indicators, reactions, send/read states)
- **MUST** vary message timing — uniform delays read as scripted; variable delays feel real
- **MUST** support short bubbles (chat metaphor breaks if every message is a paragraph)
- **SHOULD** differentiate character voice in chat vs spoken dialogue — people text differently than they speak
- **SHOULD** use read-receipts as content (a "Read 11:47" with no reply IS a story beat)
- **SHOULD** reserve full-screen VN dialogue for emotional climaxes; the chat metaphor implies casualness
- **MAY** include media (images, stickers, voice notes) per fictional plausibility

### Acceptance criteria

- [ ] Variant declared and consistent within conversation
- [ ] Message timing variable (variance verified)
- [ ] Bubble length distribution: 80%+ of bubbles are ≤ 2 lines on mobile
- [ ] Character voice in chat distinguishable from same character's spoken voice
- [ ] Mode contrast preserved — emotional climaxes leave the chat UI for full VN view

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-CHATUI-RESKIN` | Chat UI is treated as a re-skinned dialogue box (long bubbles, no typing indicators, uniform pacing) | High |
| `AP-CHATUI-SHORT-MERGE` | Chat metaphor used for emotional climax instead of full VN view | Medium |
| `AP-CHATUI-VOICE-COLLAPSE` | Character has identical voice in chat and spoken dialogue | Medium |
| `AP-CHATUI-UNIFORM-TIMING` | All messages display at identical fixed delay | Medium |

### Reference implementations

- **Mystic Messenger (2016)** — `GROUP_CHAT`. Multiple characters, side conversations, in-chat selfies.
- **Choices: Stories You Play** — `ONE_ON_ONE_TEXT` overlays in-fiction texting separate from face-to-face dialogue.
- **Florence (2018)** — `JIGSAW_BUBBLES`. Short, wordless, conversation-as-puzzle.
- **Emily is Away (2015)** — `ONE_ON_ONE_TEXT` (MSN-era). Player presses keys, predetermined message appears.
- **Simulacra (2017)** — `FOUND_PHONE`. Texts + social media + photos + video.
- **Sara is Missing (2016)** — `FOUND_PHONE`. Mystery framing.

### Implementation notes

- "Read receipts as content" is the most underused powerful pattern in this category.
- For mobile, ensure the chat UI scrollback works smoothly — chat-as-UI in a VN means players will scroll back during emotional moments.

---

## SYS-20-ACTIVITY — Activity-Driven (Crafting / Doing)

**Layer:** Mastery  
**Required by:** Bartender / café VNs, "make-something-for-someone" VNs  
**Skip when:** Romance without diegetic crafting space, pure narrative

### Dependencies
- Requires: `SYS-02-CHOICE`
- Decorates: `SYS-01-AFFECTION`
- Conflicts: `SYS-21-CARDS` (mechanic overload)

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `recipe_id` | string | required | Stable |
| `display_name` | string | required | The thing being made |
| `ingredients` | list<Ingredient> | required | Component inputs with quantity |
| `assembly_steps` | list<Step> | required | UI sequence to construct |
| `customer_request` | RequestPattern | required | What customer asked for (may be vague/lying) |
| `match_tolerance` | enum | `EXACT` | `EXACT` / `CATEGORY` / `MOOD` |
| `success_threshold` | float | 0.7 | Match score above which considered success |
| `success_effects` | list<Effect> | required | Affection/flag changes on success |
| `failure_effects` | list<Effect> | required | Reactions on miss (NOT just "no reward") |

#### Ingredient

| Field | Type | Notes |
|---|---|---|
| `ingredient_id` | string | Stable |
| `display_name` | string | UI label |
| `quantity_min` | float | Slider range |
| `quantity_max` | float | Slider range |
| `category_tags` | list<string> | E.g., `bitter`, `strong`, `sweet` |

### Core rules

- **MUST** keep total ingredient pool small — 4–10 ingredients (Coffee Talk has fewer than 10; that's intentional)
- **MUST** make mistakes recoverable — wrong drink → in-character reaction, not soft-lock
- **MUST** make wrong-output content — failure produces a reaction that reveals character, not just no-reward
- **SHOULD** reveal character through preference — knowing what someone drinks is knowing them
- **SHOULD** keep crafting space and dialogue space on the same screen (no full-screen mode switches)
- **SHOULD** vary the framing across sessions — different customer mood, different stakes — to prevent fatigue
- **MUST NOT** let the activity overshadow the dialogue (verified by playtest: are players reading what customer says?)

### Acceptance criteria

- [ ] Ingredient pool size 4–10
- [ ] All wrong-output paths produce in-character reactions
- [ ] Crafting and dialogue rendered on same screen
- [ ] At least 3 distinct customer-mood variants per repeat-customer
- [ ] Playtest: players self-report reading customer dialogue while crafting

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-ACTIVITY-INGREDIENT-BLOAT` | Ingredient pool > 10 | Medium |
| `AP-ACTIVITY-DEAD-FAILURE` | Wrong output produces no in-character reaction | High |
| `AP-ACTIVITY-MODE-SWITCH` | Crafting requires full-screen mode change away from dialogue | Medium |
| `AP-ACTIVITY-REPETITION-FATIGUE` | Same customer, same request, no variation across multiple sessions | Medium |
| `AP-ACTIVITY-DIALOGUE-SUPPRESSED` | Crafting UI obscures customer dialogue text | High |

### Reference implementations

- **VA-11 Hall-A (2016)** — Bartender VN. Customers order via description (sometimes lying), player builds drink from labeled ingredients with quantity sliders. Right drink opens dialogue branches.
- **Coffee Talk (2020)** — Café VN, fewer ingredients, gentler tone. Latte art as tactile touch.
- **Necrobarista (2020)** — Café framing without active brewing — atmosphere over mechanic.

### Implementation notes

- Bartending pattern is touch-native — drag ingredients to mixing area, tap to mix, swipe to serve.
- Per-customer preference recording in `SYS-05-JOURNAL` is highly rewarding — players love seeing their accumulated knowledge.
- Avoid timer pressure on the crafting itself unless the fiction demands it.

---

## SYS-21-CARDS — Card / Deck Battle System

**Layer:** Mastery  
**Required by:** Mobile romance with combat layer (Tears of Themis pattern)  
**Skip when:** Premium narrative, story-only VNs, slice-of-life

### Dependencies
- Requires: `SYS-03-FLAGS`
- Decorates: `SYS-01-AFFECTION`, `SYS-24-GALLERY`
- Conflicts: `SYS-20-ACTIVITY` (mechanic overload)

### Data schema

#### Card

| Field | Type | Default | Notes |
|---|---|---|---|
| `card_id` | string | required | Stable |
| `character_id` | string | required | The love interest depicted (cards MUST be characters) |
| `art_variant` | string | required | Outfit / scene / mood — collectible variants |
| `attribute_type` | enum | required | E.g., `EMPATHY` / `LOGIC` / `INTUITION` for Tears-of-Themis-style triangle |
| `power_value` | int | required | Numeric strength |
| `skill` | object | optional | Active ability |
| `voice_lines` | list<voice_id> | optional | Linked voiced clips |
| `flavor_text` | string | optional | Card lore |
| `rarity` | enum | required | E.g., `R / SR / SSR` |
| `acquired_at` | timestamp | null | Player-side state |

#### Battle

| Field | Type | Notes |
|---|---|---|
| `battle_id` | string | Stable |
| `opponent_argument_type` | enum | The attribute to counter |
| `success_threshold` | int | Total card power required |
| `outcome_branches` | map<outcome, content> | What story content unlocks per outcome |

### Core rules

- **MUST** make cards represent characters — generic minion cards waste the form
- **MUST** include multiple art variants per character (variant collectibility is the engine)
- **MUST** keep attribute system legible — 3 attributes (Tears of Themis triangle) is the upper edge for casual romance audiences; 5+ is bloat
- **MUST** allow auto-battle from a reasonable progress threshold
- **MUST** connect battle outcome to story variation — winning with empathy cards opens empathic branch, etc.
- **SHOULD** integrate with `SYS-24-GALLERY` so cards appear there
- **SHOULD** integrate with voice-line library so cards' voiced lines become collectibles
- **SHOULD** allow battle skip after first viewing
- **MUST NOT** make every battle resolve "win → next chapter" with no narrative variation — that's a tax

### Acceptance criteria

- [ ] All cards in deck list have a `character_id` (no generic cards)
- [ ] At least 3 attribute types declared (or rejected for explicit reason)
- [ ] Auto-battle available at configured progress threshold
- [ ] At least 50% of battles have story variation in outcome branches
- [ ] Battle skip available on replay

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-CARDS-GENERIC` | Card has no `character_id` (generic monster card) | High |
| `AP-CARDS-ATTRIBUTE-BLOAT` | More than 5 attribute types | Medium |
| `AP-CARDS-DECOUPLED` | Battle outcome has identical content regardless of how player won | High |
| `AP-CARDS-NO-AUTO` | No auto-battle option at any progress level | Medium |
| `AP-CARDS-SKIP-MISSING` | Battle cannot be skipped on replay | Medium |
| `AP-CARDS-CROWD-OUT-STORY` | Battles consume > 40% of session time | High |

### Reference implementations

- **Tears of Themis (2020)** — Empathy/Logic/Intuition triangle. Cards are characters with art variants. Battle outcome affects S-rank rewards.
- **Love and Deepspace (2024)** — 3D action-romance hybrid. Cards/skills tied to love interests' powers.
- **Mr Love: Queen's Choice (2017)** — Card-based "missions" with star ratings. Cards as character attribute carriers.
- **Obey Me! Shall We Date? (2019)** — Card dance/rhythm battles with team composition.

### Implementation notes

- Three attributes (rock-paper-scissors) is the proven mobile pattern. Adding a fourth or fifth makes the deck-builder less legible.
- Card-art variants per character are the gallery hook — players collect for the art, the mechanic justifies the collection.
- Always tie battle outcomes to *something* in the story, even minor (a different reaction line) — otherwise battles feel like a tax.

---

## SYS-22-TIMER — Timed Choices

**Layer:** Mastery (decorator)  
**Required by:** None (decorator); strongly recommended for cinematic-VN feel  
**Skip when:** Pure deliberative VNs, chess-mode VNs

### Dependencies
- Decorates: `SYS-02-CHOICE`
- Pairs with: `SYS-18-REALTIME`, `SYS-19-CHATUI`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `timer_seconds` | float | required | Window for choice |
| `default_option_id` | string | required | What resolves on timeout |
| `diegetic_pressure_text` | string | optional | The fictional reason for the timer |
| `show_timer_ui` | bool | false | If false, no visible timer (Steins;Gate pattern) |
| `accessibility_extension_factor` | float | 1.5 | Multiplier when accessibility setting on |

### Core rules

- **MUST** tie timer to fictional pressure — a character is leaving, a phone is ringing, a moment is passing. No timer attached to deliberative scenes
- **MUST** ensure default outcome is narratively coherent (player who didn't react gets a sensible result, not a system-message punishment)
- **MUST** provide an accessibility extension toggle (motor / cognitive accessibility)
- **MUST** localize timer durations per language (German choice text takes longer to read than English)
- **SHOULD** use invisible timers (no UI) when the diegetic pressure is sufficient (a ringing phone is its own timer)
- **SHOULD NOT** time every choice — contrast between deliberate and timed is what makes timed choices feel urgent
- **MUST NOT** allow `SYS-09-SKIP` to bypass timed choices

### Acceptance criteria

- [ ] Every timed choice has `diegetic_pressure_text` filled (verified per content audit)
- [ ] Default outcome is in-character, not punishment
- [ ] Accessibility extension toggle is exposed in settings
- [ ] Timer durations adjusted per locale (≥1.3× for languages with longer text)
- [ ] Skip mode pauses on timed choices (verified)

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-TIMER-NO-PRESSURE` | Timer attached to scene with no fictional urgency | High |
| `AP-TIMER-PUNISHING-DEFAULT` | Timeout produces "fail state" framed as system message | High |
| `AP-TIMER-NO-ACCESSIBILITY` | No extension toggle in settings | High |
| `AP-TIMER-UNIFORM-LOCALE` | Timer duration identical across all locales | Medium |
| `AP-TIMER-EVERYWHERE` | More than 50% of choices in the game are timed | Medium |

### Reference implementations

- **Until Dawn / The Quarry / The Dark Pictures (Supermassive)** — Visible timed choices and "Don't Move" sequences. Reference for cinematic timer pattern.
- **Mystic Messenger** — Real-time chat tap-ins with informal timer (the conversation moves on).
- **Steins;Gate (2009)** — Invisible timer (phone ringing). Best-in-class for diegetic timer.
- **Tokimeki Memorial Girl's Side** — Tap-and-touch within window. Somatic timer.
- **Choices / Episode** — Sometimes-timed monetized choices.

### Implementation notes

- Steins;Gate's invisible timer is the gold standard. Use only when the diegetic frame is strong enough to read as urgent without UI.
- For mobile accessibility, a `timer_disable` toggle (in addition to extension) is increasingly expected.

---

## SYS-23-GIFTS — Gift-Giving & Preference-Learning

**Layer:** Relationship  
**Required by:** Optional; recommended for romance VNs and farming-sim hybrids  
**Skip when:** No item economy, pure dialogue-driven romance

### Dependencies
- Requires: `SYS-01-AFFECTION`, `SYS-03-FLAGS`
- Recommends: `SYS-05-JOURNAL` (preference recording)

### Data schema

#### Gift item

| Field | Type | Notes |
|---|---|---|
| `item_id` | string | Stable |
| `display_name` | string | UI |
| `category_tags` | list<string> | `flowers`, `food`, `craft`, `book`, etc. |

#### Character gift profile

| Field | Type | Default | Notes |
|---|---|---|---|
| `character_id` | string | required | FK |
| `loved_items` | list<item_id> | required | Affection +large |
| `liked_items` | list<item_id> | required | Affection +small |
| `neutral_items` | list<item_id> | required | Affection 0 |
| `disliked_items` | list<item_id> | required | Affection -small + reaction |
| `hated_items` | list<item_id> | required | Affection -large + strong reaction |
| `birthday` | date | optional | For birthday-bonus mechanics |
| `learned_preferences` | list<item_id> | [] | What player has discovered |

### Core rules

- **MUST** make preferences learnable via in-fiction dialogue hints — alert players should be rewarded with gift success without external guides
- **MUST** record learned preferences in `SYS-05-JOURNAL` once discovered — players should not have to remember
- **MUST** make wrong gifts content — a hated gift produces in-character reaction (which itself reveals character)
- **MUST** keep preference structure stable — character who loved roses chapter 1 should not hate them chapter 5 without in-fiction reason
- **SHOULD** keep gift slots constrained (one per occasion, curated shop) — choice paralysis is the failure mode
- **SHOULD NOT** let one gift trivialize affection — gifts should grant meaningful but not enormous deltas
- **MAY** allow special-occasion bonuses (birthday, festival) for thematic depth

### Acceptance criteria

- [ ] Every character has a populated gift profile across all 5 reaction categories
- [ ] Each character has at least 2 hint-lines that reveal a preference in normal dialogue
- [ ] Learned preferences auto-record to journal
- [ ] Wrong-gift reactions are unique (not generic "they didn't like that")
- [ ] Single gift's affection delta is ≤ 10% of meter range

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-GIFTS-OPAQUE` | Preferences not learnable via in-game dialogue | High |
| `AP-GIFTS-SHIFT` | Preference changed without in-fiction event | High |
| `AP-GIFTS-NO-RECORD` | Learned preferences not stored in journal | Medium |
| `AP-GIFTS-OVERSIZED` | Single gift grants > 10% of meter range | Medium |
| `AP-GIFTS-MENU-BLOAT` | Gift menu has > 30 simultaneous selectable items | Medium |
| `AP-GIFTS-DEAD-WRONG` | Wrong-gift response is generic across characters | Medium |

### Reference implementations

- **Story of Seasons / Harvest Moon series** — 5-tier preference (loved/liked/neutral/disliked/hated). Trial and error with hint dialogue.
- **Stardew Valley (2016)** — Same 5-tier; permanent journal recording once discovered.
- **Persona series** — Constrained gift mechanic, specific gifts unlock confidant rank-ups.
- **Tokimeki Memorial / Otome titles** — Date-event gift selection from curated catalog.
- **Princess Maker** — Birthday-gift annual decision with long-term affection effect.

### Implementation notes

- Mobile: surface "preferences known" badges on character profile screens — players love seeing accumulated knowledge.
- Curated shop with 6–12 rotating items beats a 100-item open inventory.

---

## SYS-24-GALLERY — CG Gallery / Recollection

**Layer:** Retention  
**Required by:** Most VNs with multiple endings or character routes  
**Skip when:** Single-ending narrative with no illustrated CGs

### Dependencies
- Requires: `SYS-03-FLAGS`
- Recommends: `SYS-06-ENDINGS`

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `cg_id` | string | required | Stable |
| `route_id` | string | required | Which route this CG belongs to |
| `tier_id` | string | optional | Tier this is unlocked in |
| `unlock_flag` | flag_id | required | Set true when CG first viewed |
| `unlocked` | bool | computed | From unlock_flag |
| `silhouette_visible_when_locked` | bool | true | MUST be true (the lock is the pull) |
| `voice_lines` | list<voice_id> | optional | Linked clips |
| `replay_scene_id` | string | optional | Surrounding scene for memory-room replay |
| `category` | enum | optional | `STORY` / `ROUTE_SPECIFIC` / `ENDING` / `EVENT` |

#### Gallery view

| Field | Type | Notes |
|---|---|---|
| `total_count` | int | Total CGs |
| `unlocked_count` | int | Computed |
| `completion_percent` | float | Computed |
| `category_filters` | list<category> | UI tabs |

### Core rules

- **MUST** show locked CGs as visible silhouettes — this is the entire mechanic; the visible-locked grid creates intrinsic motivation
- **MUST** display total/unlocked counts and completion percentage
- **MUST** make gallery accessible from main menu after first CG unlocks
- **SHOULD** mark CGs to route-distinct moments — shared CGs across routes understate variation
- **SHOULD** provide chapter-select hints showing "this chapter has unseen CGs" for finding missed unlocks
- **SHOULD** include surrounding scene replay (memory room pattern)
- **MAY** include voice line collection per CG

### Acceptance criteria

- [ ] Locked silhouettes visible by default
- [ ] Completion stats displayed
- [ ] Each route has at least 3 route-distinct CGs (not shared)
- [ ] Missed CGs are findable on replay (chapter hints)
- [ ] Replay-scene playback works for any unlocked CG

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-GALLERY-INVISIBLE-LOCKED` | Locked CGs hidden rather than silhouettes | High |
| `AP-GALLERY-NO-COUNT` | Total/unlocked counts not shown | Medium |
| `AP-GALLERY-NO-REPLAY` | CGs displayed standalone without surrounding scene | Medium |
| `AP-GALLERY-IMPOSSIBLE-CG` | A CG is gated behind conditions impossible without external guide | High |
| `AP-GALLERY-NO-FIND-HINT` | Replay/chapter-select offers no hint for missing CGs | Medium |

### Reference implementations

- **Most Aksys / Idea Factory localizations** — Memory mode replays surrounding scene per CG.
- **Mobile otome (Mr Love, Tears of Themis, Love and Deepspace)** — Gallery is primary aesthetic carrot, often with voice + Live2D.
- **Persona / Tokimeki Memorial** — End-of-game personalized album.
- **Standard Ren'Py-based VNs** — Locked silhouette grid is the default pattern.

### Implementation notes

- For mobile, gallery is often visited more than the actual story late-game. Treat it as a first-class UI surface, not a back-of-menu feature.
- Voiced CG lines are particularly engaging — players listen to favorites repeatedly.

---

## SYS-25-FLOWCHART — Flowchart Navigation

**Layer:** Presentation  
**Required by:** Loop VNs, multi-protagonist VNs, replay-driven VNs  
**Skip when:** Mobile-only (use chapter-select instead), single-route VNs

### Dependencies
- Requires: `SYS-03-FLAGS`, `SYS-06-ENDINGS`
- Recommends: `SYS-26-MULTIPROTAG`

### Data schema

#### Node

| Field | Type | Notes |
|---|---|---|
| `node_id` | string | Stable |
| `node_type` | enum | `EVENT` / `CHOICE` / `BRANCH_POINT` / `ENDING` |
| `display_label` | string | What the player sees |
| `unlock_conditions` | list<Condition> | Required flags to even appear in chart |
| `unlocked` | bool | computed |
| `played` | bool | computed; player has experienced this node |
| `connects_to` | list<node_id> | Outgoing edges |
| `route_id` | string | optional | For coloring/grouping |

#### Flowchart view

| Field | Type | Notes |
|---|---|---|
| `total_nodes` | int | Count |
| `unlocked_nodes` | int | Computed |
| `played_nodes` | int | Computed |
| `current_node_id` | string | Where the player is |
| `entry_mode` | enum | `FIRST_PLAY_LIMITED` / `POST_COMPLETION` / `ALWAYS_AVAILABLE` |

### Core rules

- **MUST** reveal *some* hidden nodes (locked-but-shown pattern) to communicate "more exists"
- **MUST NOT** reveal all hidden nodes upfront (overwhelming)
- **MUST** mark played nodes distinctly from unplayed-but-unlocked
- **SHOULD** restrict full flowchart to post-completion or replay mode — first play should be experienced linearly unless the flowchart is the design (13 Sentinels)
- **SHOULD** ground the flowchart diegetically (story system, not menu screen)
- **SHOULD** allow direct jump to any unlocked node (the navigation IS the value)
- **MUST NOT** simply list "the choices required for each ending" — that converts the flowchart into a guide, killing branching discovery

### Acceptance criteria

- [ ] Locked-but-known nodes visible
- [ ] Total locked nodes never exceed 30% of total at any point during normal progression
- [ ] Played nodes visually distinct
- [ ] Direct navigation works to any unlocked node
- [ ] Game type marked: chapter-select fallback for mobile-only releases

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-FLOWCHART-FULL-REVEAL` | All nodes shown from first play | Medium |
| `AP-FLOWCHART-GUIDE` | Flowchart explicitly lists choices needed for each ending | High |
| `AP-FLOWCHART-DENSE` | More than 200 visible nodes simultaneously (mobile: 80) | Medium |
| `AP-FLOWCHART-NO-NAV` | Flowchart shown but no direct-jump navigation | High |
| `AP-FLOWCHART-MOBILE` | Full flowchart used on mobile-only release (tiny screen) | High |

### Reference implementations

- **13 Sentinels: Aegis Rim (2020)** — The flowchart IS the story selection screen. ~13×20 grid.
- **Steins;Gate** — Worldline divergence chart. Post-completion route map.
- **428: Shibuya Scramble (2008)** — Five-protagonist interleaving flowchart with cross-character locks.
- **Detroit: Become Human (2018)** — End-of-chapter flowchart with crowd statistics. Post-hoc.
- **Higurashi / Umineko** — Chapter-select hubs.

### Implementation notes

- For mobile, **prefer chapter-select with branch indicators** over true flowcharts. Mobile screens cannot legibly display dense graphs.
- Use the Detroit: Become Human pattern (end-of-chapter view) on mobile if some flowchart-style is desired without the screen-real-estate cost.

---

## SYS-26-MULTIPROTAG — Multi-Protagonist Perspective Shifting

**Layer:** Narrative  
**Required by:** Multi-perspective mystery VNs  
**Skip when:** Single-protagonist VNs, Romance with locked POV

### Dependencies
- Requires: `SYS-03-FLAGS`
- Recommends: `SYS-25-FLOWCHART`, `SYS-12-NGPLUS`
- Conflicts: `SYS-13-ROUTELOCK` (route lock fights perspective shifts)

### Data schema

| Field | Type | Default | Notes |
|---|---|---|---|
| `protagonist_id` | string | required | Stable; one per playable POV |
| `name` | string | required | Display |
| `voice_signature` | object | required | Vocabulary, sentence-length, monologue tone — distinct |
| `knowledge_set` | list<flag_id> | computed | Flags this protagonist's POV reveals |
| `journal` | journal_id | required | Per-protagonist `SYS-05-JOURNAL` instance |
| `arc_state` | enum | `LOCKED` | `LOCKED` / `AVAILABLE` / `IN_PROGRESS` / `COMPLETE` |
| `intersect_events` | list<event_id> | [] | Events that overlap with other protagonists' arcs |

### Core rules

- **MUST** give each protagonist a distinct narrative voice — vocabulary, sentence shape, monologue tone
- **MUST** maintain per-protagonist `SYS-05-JOURNAL` instances — what one POV knows, another may not
- **MUST** make perspective switches deliberate (player chooses) — never yank between POVs mid-scene without explicit transition
- **MUST** ensure information learned in one POV is *visibly applicable* in another — the "now I know what they meant" payoff is the point
- **SHOULD** limit playable protagonists to 3–5 in most projects (13 Sentinels' 13 required years of dev work)
- **SHOULD** structure intersect events so each POV contributes distinct information about the same moment
- **MUST NOT** repeat the same arc content across protagonists — perspective shifts must add, not duplicate

### Acceptance criteria

- [ ] Each protagonist has a documented voice signature
- [ ] Each protagonist has their own journal instance
- [ ] Switching between POVs is player-initiated
- [ ] At least 3 intersect events demonstrate cross-POV information differentials
- [ ] Voice differentiation passes blind read test (readers identify protagonist from prose alone)

### Anti-patterns to detect

| ID | Detection rule | Severity |
|---|---|---|
| `AP-MULTIPROTAG-VOICE-COLLAPSE` | Protagonists are stylistically indistinguishable | High |
| `AP-MULTIPROTAG-AUTO-SWITCH` | POV swaps mid-scene without player input | High |
| `AP-MULTIPROTAG-DUPLICATE-ARC` | Two protagonists' arcs cover the same content with no new information | High |
| `AP-MULTIPROTAG-JOURNAL-MERGED` | Single journal across all protagonists | Medium |
| `AP-MULTIPROTAG-PROTAG-OVERFLOW` | More than 5 playable protagonists without justification | Medium |

### Reference implementations

- **13 Sentinels: Aegis Rim (2020)** — 13 POVs across 3 time periods. Per-POV scenes contribute non-overlapping pieces.
- **428: Shibuya Scramble (2008)** — 5 POVs interlocking; one POV's choice can lock another's options.
- **Famicom Detective Club: The Missing Heir** — Brief perspective shifts to recontextualize investigation.
- **Higurashi When They Cry (2002)** — Different chapters present different versions of the same week.
- **Fate/stay night** — Same protagonist, different relationship-driven knowledge per route (a softer multi-perspective).

### Implementation notes

- On mobile, multi-protagonist works but adds cognitive load — surface the current protagonist prominently in UI at all times.
- A "what does this protagonist know?" summary screen is highly useful when players return after a break.

---
# SECTION E — GLOBAL ANTI-PATTERNS

These anti-patterns span multiple systems. Per-system anti-patterns are already captured in Section D; this section catches cross-system issues that no single spec can detect alone. Run these checks **after** all chosen systems are implemented and integrated.

## E.1 Cross-system flag/state issues

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-FLAG-UNUSED` | A flag set by one system is never read by any other system or content | `SYS-03` + all | High |
| `AP-X-DANGLING-REF` | A check references a flag that is never set by any system | `SYS-03` + all | High |
| `AP-X-AFFECTION-NO-CHOICE` | Affection meter exists, but ≥ 2 chapters of content advance with no choice that touches it | `SYS-01` + `SYS-02` | High |
| `AP-X-STAT-NO-GATE` | A stat is defined but never appears in any choice option's `required_stat_thresholds` | `SYS-17` + `SYS-02` | Medium |
| `AP-X-QUEST-NO-FLAG` | A quest completion sets no flag readable by other systems (orphaned achievement) | `SYS-08` + `SYS-03` | Medium |
| `AP-X-JOURNAL-NEVER-USED` | WORKSHOP-variant journal entry exists but is never required by any deduction encounter | `SYS-05` + `SYS-14` | Medium |

## E.2 Save / persistence consistency

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-PARTIAL-SNAPSHOT` | Save record omits a snapshot field used by an active system | `SYS-10` + all | Critical |
| `AP-X-LIVE-SAVE-CONFLICT` | `SYS-18-REALTIME` is implemented alongside manual-save model | `SYS-10` + `SYS-18` | High |
| `AP-X-NGPLUS-METER-LEAK` | Affection meter persists across `SYS-12-NGPLUS` runs | `SYS-12` + `SYS-01` | High |
| `AP-X-SAVE-ATOMICITY` | Save commits do not capture all snapshots atomically (verified by mid-save crash test) | `SYS-10` + all | Critical |

## E.3 Pacing and session-length issues

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-MOBILE-SESSION-OVERFLOW` | Average mandatory session content (no save points within) > 5 minutes on mobile | `SYS-11` + `SYS-10` | High |
| `AP-X-MASTERY-OVERLOAD` | Game declares > 3 mastery-layer systems while session length < 10 min | A.6 + chosen mastery | High |
| `AP-X-DEDUCTION-MOBILE-OVERLONG` | Deduction encounter forces > 20 min uninterrupted mobile play | `SYS-14` + `SYS-11` | Medium |
| `AP-X-NO-SHORT-PATH` | Mobile game has no completable interaction loop within 3 minutes | A.5 + `SYS-11` | High |

## E.4 Conflict-of-systems checks

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-CONFLICT-ACTIVITY-CARDS` | Both `SYS-20-ACTIVITY` and `SYS-21-CARDS` implemented as primary mastery layers | `SYS-20` + `SYS-21` | High |
| `AP-X-CONFLICT-LOCK-MULTIPROTAG` | Both `SYS-13-ROUTELOCK` and `SYS-26-MULTIPROTAG` implemented | `SYS-13` + `SYS-26` | High |
| `AP-X-CONFLICT-SAVE-REALTIME` | `SYS-10-SAVE` manual model with `SYS-18-REALTIME` | `SYS-10` + `SYS-18` | High |
| `AP-X-TIER-AFFECTION-MISMATCH` | Tier shape is non-romance but `SYS-01-AFFECTION` is the primary progression gate | `SYS-04` + `SYS-01` | Medium |

## E.5 Information-economy issues

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-DEDUCTION-EVIDENCE-GAP` | Required evidence for an encounter is unlockable only on a different route (without `SYS-12-NGPLUS`) | `SYS-14` + `SYS-05` | Critical |
| `AP-X-IMPOSSIBLE-CG` | A `SYS-24-GALLERY` slot is gated behind a flag set only via guide-required micro-decision | `SYS-24` + `SYS-03` | High |
| `AP-X-TRUE-ENDING-UNREACHABLE` | TRUE ending requires knowledge that no in-game source provides | `SYS-06` + `SYS-12` + `SYS-05` | Critical |
| `AP-X-FLAG-INVISIBLE-CONSEQUENCE` | A flag triggers a downstream effect with zero in-fiction acknowledgement (player has no signal it mattered) | `SYS-03` + content | High |

## E.6 Voice and content consistency

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-CHARACTER-VOICE-DRIFT` | Same character's dialogue voice differs significantly across systems (chat vs spoken vs journal) without in-fiction reason | `SYS-19` + content + `SYS-05` | Medium |
| `AP-X-PROTAG-VOICE-COLLAPSE` | Multi-protag game has indistinguishable narrative voices | `SYS-26` + content | High |
| `AP-X-RIVALRY-NAME-LEAK` | Rivalry/jealousy lines explicitly name rival characters | `SYS-07` + content | Medium |
| `AP-X-WRITING-VS-MECHANIC-MISMATCH` | Game tone is light/comedic but anti-patterns reveal heavy `DRAMA` rivalry, punishing schedule, etc. | A.1 + multiple | Medium |

## E.7 Accessibility and fairness

| ID | Detection rule | Spans | Severity |
|---|---|---|---|
| `AP-X-NO-TIMER-EXTENSION` | Game uses `SYS-22-TIMER` but settings lack accessibility extension | `SYS-22` + UX | High |
| `AP-X-MOBILE-TAP-REGRESSION` | Choice tap targets < 44pt on mobile | A.5 + `SYS-02` | High |
| `AP-X-LOCALE-PACING-MISMATCH` | Timer durations identical across locales with significant text-length variance | `SYS-22` + i18n | Medium |
| `AP-X-NO-SKIP-MISSING-MULTI-ROUTE` | Multi-route game without `SYS-09-SKIP` | `SYS-09` + game type | Critical |

## E.8 Detection workflow

When validating a complete game:

1. Run all per-system anti-pattern checks (Section D)
2. Run all global anti-pattern checks (this Section E)
3. Triage by severity:
   - **Critical** — fix before any further development
   - **High** — fix before vertical slice
   - **Medium** — fix before content lockdown
   - **Low** — track in backlog; address if budget permits
4. Re-run after each milestone — anti-patterns can re-emerge during content authoring

---

# SECTION F — EMOTIONAL BEATS LIBRARY

This section provides reusable beat patterns for content generation. Each pattern is a tested structural shape that converts ordinary dialogue into emotional content. Patterns are voice-agnostic — apply them in the project's specific character voices.

These are **content-generation reference templates**, not systems. Use them when authoring lines, choice options, journal entries, or scene structure.

## F.1 Pattern format

Each pattern lists:
- **Pattern ID** — stable for cross-reference
- **Structure** — the abstract shape
- **Trigger conditions** — when to deploy
- **What it does** — the player effect
- **Example skeleton** — voice-agnostic template
- **Cross-system hook** — which system(s) typically deliver this

## F.2 The patterns

### `BEAT-SLIP` — The Slip

**Structure:** A character drops a single revealing word, fragment, or detail mid-otherwise-mundane sentence. They do not stop or comment on it. The next sentence proceeds as if it had not happened.

**Trigger conditions:** Mid-tier relationship (player has reached `FRIEND` or `CLOSE` per `SYS-01-AFFECTION`); first significant trust moment.

**What it does:** Forces the player to retroactively re-read. Plants information without underlining it. Tests whether the player is paying attention; rewards those who are with private knowledge.

**Example skeleton:**
```
CHARACTER: [casual setup line about the day]. [Word/phrase that contains the secret, dropped without weight]. [Continuation as if nothing happened.]
```

**Cross-system hook:** Sets a flag (`SYS-03-FLAGS`) the player can later reference via `SYS-02-CHOICE`. Optionally generates a `SYS-05-JOURNAL` entry.

### `BEAT-CALLBACK` — The Call-back

**Structure:** A character references something the player did or said hours/sessions earlier, in a context where the reference is not load-bearing for plot.

**Trigger conditions:** Any flag set ≥ 1 session ago that has not been narratively closed.

**What it does:** Confirms continuity. Makes the world feel watched. Rewards player memory.

**Example skeleton:**
```
CHARACTER: [Current-scene action]. [Casual reference to earlier player choice/action]. [Continues].
```

**Cross-system hook:** Read from `SYS-03-FLAGS`; write line variant. The non-load-bearing nature is essential — load-bearing references feel like puzzle elements; throwaway references feel like memory.

### `BEAT-OVERCORRECTION` — The Overcorrection

**Structure:** Character A is asked about Topic X. They produce an answer that is too detailed, too specific, or too deflective relative to a normal response. The asymmetry IS the content.

**Trigger conditions:** Player asks about a sensitive topic for the first time; or character is asked about a hidden flag's domain.

**What it does:** Communicates concealment without exposition. Tells the player "this is a thing" with deniability.

**Example skeleton:**
```
PLAYER: [Casual question about Topic X]
CHARACTER: [Disproportionately precise / disproportionately vague / disproportionately fast denial about X]
[Subject change, possibly clumsy]
```

**Cross-system hook:** Sets a `secret.character.X` flag (`SYS-03-FLAGS`) on first occurrence; subsequent encounters can reference the over-correction itself.

### `BEAT-LATE-HONEST-ANSWER` — The Late Honest Answer

**Structure:** A question is asked. The character answers in social-script mode (cliché, deflection, or "I'm fine"). Beats later — hours later, scenes later, sometimes route-end-later — they return to the question and answer truthfully.

**Trigger conditions:** Used at major tier transitions (`SYS-04-TIERS`); or in pre-confession/pre-resolution chapters.

**What it does:** Demonstrates that the character has been holding the original question. Earned vulnerability.

**Example skeleton:**
```
[Earlier scene]
PLAYER: [Sincere question]
CHARACTER: [Social script answer]

[Later scene]
CHARACTER: [Out-of-the-blue]: [About what you asked earlier — the truth.]
```

**Cross-system hook:** Requires `SYS-03-FLAGS` to track that the question was asked. The interval is part of the content; spans of 1–3 sessions tested as effective.

### `BEAT-QUIET-ADMISSION` — The Quiet Admission

**Structure:** Major emotional content (love, fear, grief) delivered in a deliberately small register — practical, ordinary, off-camera.

**Trigger conditions:** Emotional climax moments that risk over-writing. The opposite of the operatic confession.

**What it does:** The shape contradicts the content. The contrast lands harder than emphasis would. Bypasses player cynicism.

**Example skeleton:**
```
CHARACTER (mid-action — folding laundry, tying shoes, etc.): [Major emotional truth, delivered as if it were practical.]
[No music swell. No reaction shot. The other character may not respond at all. Scene continues.]
```

**Cross-system hook:** Often paired with `SYS-01-AFFECTION` tier transition. Suppress UI cue if possible — the beat is undercut by a "+10 Affection" pop.

### `BEAT-MISDIRECT` — The Misdirect

**Structure:** A scene escalates toward an apparent conclusion. The actual point of the scene is something else entirely — a small detail, an aside, a setup the player did not register as important.

**Trigger conditions:** Mid-route content where the player has begun to predict pacing.

**What it does:** Disrupts trained expectation. Forces re-reading. Communicates that the writer is in control of pacing, the player is not.

**Example skeleton:**
```
[Scene escalates: stakes appear high]
[Apparent climax arrives — and is anticlimactic, or sidestepped]
[Real beat: a small action / line / detail that the player must register for later]
[Scene ends quietly]
```

**Cross-system hook:** Sets a long-arc flag (`SYS-03-FLAGS`) marked `LONG_ARC` to avoid stale-flag detection. Pays off across `SYS-12-NGPLUS` or in late-route content.

### `BEAT-EARNED-JOKE` — The Earned Joke

**Structure:** A piece of wit, dry humor, or callback that becomes funny because of accumulated knowledge — context the player has earned across hours of play. Functionally inaccessible to a new viewer.

**Trigger conditions:** Late-route content (≥ tier 4), or NG+ content.

**What it does:** Rewards investment. Creates an in-group of players who "get it." Makes the world feel known.

**Example skeleton:**
```
CHARACTER: [Line that, on its surface, is ordinary or only mildly amusing.]
[Implicit punchline: only readable if player remembers Event X / Detail Y / Phrase Z]
```

**Cross-system hook:** Read across `SYS-03-FLAGS`, `SYS-05-JOURNAL`, prior chapter completion. Often deliberately not surfaced as a flag-check in dialogue tooling — it is content-side resonance.

### `BEAT-THING-CANNOT-SAY` — The Thing They Cannot Say

**Structure:** A character clearly intends to say something, fails, says something else (or nothing), and the scene moves on. The unsaid thing is the content.

**Trigger conditions:** Pre-confession beats; moments of emotional saturation; trauma-adjacent topics.

**What it does:** The omission carries more weight than the line would have. Trusts the reader. Often the highest-impact beat in a route.

**Example skeleton:**
```
CHARACTER: [Begins a sentence with clear intent]
[Pause beat — visible. Camera, music, or simple ellipsis.]
CHARACTER: [Says something else, or says nothing.]
[Scene moves on. Other character may or may not acknowledge.]
```

**Cross-system hook:** Sets a `secret.character.unspoken` flag. The flag MAY be read in later scenes by a `BEAT-LATE-HONEST-ANSWER` payoff.

### `BEAT-UNEXPECTED-COMPETENCE` — The Unexpected Competence

**Structure:** A character demonstrates skill, knowledge, or capability the audience did not know they had. The reveal is brief, integrated, not commented on.

**Trigger conditions:** Mid-tier (`FRIEND` or later); when a character has been known primarily through one mode (the bookish friend, the cheerful one) and the reveal opens a new dimension.

**What it does:** Adds dimensionality without exposition. Implies a life beyond the player's view.

**Example skeleton:**
```
[Situation arises requiring some skill the character has not demonstrated]
CHARACTER: [Acts efficiently / speaks knowledgeably / produces competent action]
[No "and where did you learn that" line — the moment passes]
[Optional much later: a passing reference that explains, also brief]
```

**Cross-system hook:** Often unlocks a journal entry (`SYS-05-JOURNAL`) and may set a stat or flag (`SYS-17-STATS` / `SYS-03-FLAGS`) that later content can hook.

### `BEAT-WITNESS` — The Witness

**Structure:** The player character notices something true about another character that the other character has not said and does not know is visible. The observation is not voiced — only narrated internally.

**Trigger conditions:** Tier 3+ romance; deep-character POV scenes.

**What it does:** Generates intimacy through observation rather than dialogue. The reader is positioned as the only person who sees this.

**Example skeleton:**
```
[Scene context]
CHARACTER A: [Says something — possibly mundane]
PLAYER (internal narration): [Notices something specific — a hand on a sleeve, a held breath, a pattern. Something true that A does not realize is being seen.]
[Scene continues. The observation is not surfaced.]
```

**Cross-system hook:** Often pairs with `SYS-05-JOURNAL` MUSEUM entries written in observer voice. The journal becomes the record of what was noticed.

## F.3 Pattern stacking

Patterns can compose. Two effective stacks:

| Stack | Patterns | Effect |
|---|---|---|
| **Confession sequence** | `BEAT-OVERCORRECTION` (early) → `BEAT-THING-CANNOT-SAY` (mid) → `BEAT-LATE-HONEST-ANSWER` (climax) | Long-arc emotional payoff across a route |
| **Trust establishment** | `BEAT-SLIP` (initial) → `BEAT-WITNESS` (subsequent) → `BEAT-EARNED-JOKE` (late) | Player feels they "know" the character |

## F.4 Authoring rule

These beats are diluted by overuse. A typical character route should land 3–5 of these total, not one per chapter. The contrast between ordinary scenes and beat-scenes is what makes beats land.

---

# SECTION G — BUILD CHECKLIST

This section converts Section C's dependency graph into a sequential implementation plan. Use it as a project-level milestone tracker.

## G.1 How to use this checklist

1. Determine the system shortlist via Section A
2. Filter the checklist below to only included systems
3. Treat each phase as a milestone — do not start phase N+1 until phase N's acceptance criteria pass
4. Run global anti-pattern detection (Section E) at the end of each phase

## G.2 Phase 0 — Project setup

- [ ] Project brief documented with all Section A.1 parameters
- [ ] Game type tags chosen
- [ ] System shortlist generated via Section A.3
- [ ] Cadence + save model decided (A.4)
- [ ] Platform decided (A.5)
- [ ] Mastery layer count decided (A.6)
- [ ] Compatibility matrix verified (A.6) — no incompatible mastery pairs
- [ ] Dependency graph (Section C) walked; build order generated
- [ ] Stable ID conventions adopted: `SYS-NN-NAME` for systems, `AP-*` for anti-patterns, namespaced flag IDs

## G.3 Phase 1 — Foundation (always)

- [ ] **`SYS-03-FLAGS` implemented**
  - [ ] Centralized key-value flag store
  - [ ] Namespace prefixes adopted
  - [ ] `flag_audit()` function for build-time orphan/dangling detection
  - [ ] Acceptance criteria pass
- [ ] **`SYS-10-SAVE` implemented**
  - [ ] Save model matches game cadence
  - [ ] Atomic save commits
  - [ ] Auto-save fires within 1s of state change
  - [ ] Acceptance criteria pass
- [ ] **`SYS-02-CHOICE` implemented**
  - [ ] Choice/Option/Effect schema
  - [ ] Flag-gated option visibility
  - [ ] Auto-checks: option text ≤ 12 words; effects non-empty
  - [ ] Acceptance criteria pass
- [ ] **`SYS-09-SKIP` implemented**
  - [ ] Per-line seen tracking
  - [ ] Auto-pause on unseen and on choices
  - [ ] Acceptance criteria pass
- [ ] **`SYS-11-PACING` rules adopted**
  - [ ] Lint rules wired into content authoring tools
  - [ ] Mobile/PC targets calibrated
- [ ] **Phase 1 milestone** — vertical slice with one full exchange playable, save/load works, skip works

## G.4 Phase 2 — Core narrative architecture

- [ ] **`SYS-04-TIERS` implemented**
  - [ ] Tier shape declared per route
  - [ ] Unlock conditions explicit
  - [ ] UI cue on transitions
- [ ] **`SYS-05-JOURNAL` implemented**
  - [ ] Variant declared (MUSEUM or WORKSHOP)
  - [ ] Locked-silhouette UI
  - [ ] Auto-recording of unlocks
- [ ] **`SYS-06-ENDINGS` implemented**
  - [ ] Ending taxonomy populated
  - [ ] Commitment points documented per ending
  - [ ] Recontextualization hooks
- [ ] **Phase 2 milestone** — first chapter playable, tier UI working, journal accumulating, at least 2 endings reachable in test paths

## G.5 Phase 3 — Relationship layer (if romance/dating sim)

- [ ] **`SYS-01-AFFECTION` implemented**
  - [ ] Per-character meters
  - [ ] Tier names + thresholds
  - [ ] Floor mechanic verified
  - [ ] Visibility mode set
- [ ] **`SYS-23-GIFTS` implemented** (if in scope)
  - [ ] Per-character gift profiles
  - [ ] Hint dialogue authored
  - [ ] Auto-recording in journal
- [ ] **`SYS-07-RIVALRY` implemented** (if in scope)
  - [ ] Tone declared per character
  - [ ] Cooled-state opening lines
  - [ ] Implicit-only (no explicit name leaks)
- [ ] **Phase 3 milestone** — full romance arc playable for one character, all tier transitions occur, gifts and rivalry trigger correctly

## G.6 Phase 4 — Mastery layers

For each mastery layer in scope, in build order from Section C:

- [ ] **`SYS-17-STATS`** (if in scope) — implement before `SYS-16` if both included
- [ ] **`SYS-16-SCHEDULE`** (if in scope)
- [ ] **`SYS-14-DEDUCTION`** (if in scope) — depends on `SYS-05` WORKSHOP variant
- [ ] **`SYS-15-PUZZLE`** (if in scope)
- [ ] **`SYS-20-ACTIVITY` XOR `SYS-21-CARDS`** (pick one, or make second optional/skippable)
- [ ] **`SYS-22-TIMER`** (decorator; can be added late)

For each:
- [ ] Spec acceptance criteria pass
- [ ] Per-system anti-pattern checks pass
- [ ] Integration with `SYS-02-CHOICE` and `SYS-03-FLAGS` verified

- [ ] **Phase 4 milestone** — all chosen mastery layers playable in vertical slice, no cross-layer interference

## G.7 Phase 5 — Real-time and presentation (if mobile live-service)

- [ ] **`SYS-18-REALTIME` implemented**
  - [ ] Local-timezone scheduling
  - [ ] No-night-cram window enforced
  - [ ] Recovery paths for missed events
  - [ ] Push notification opt-in flow
- [ ] **`SYS-19-CHATUI` implemented**
  - [ ] Variant chosen
  - [ ] Variable timing
  - [ ] Mode contrast preserved (full VN view for climaxes)
- [ ] **Phase 5 milestone** — real-time event simulation across 24 hours produces no missed-content gaps, push notifications fire correctly

## G.8 Phase 6 — Long-game and replay

- [ ] **`SYS-08-QUESTS`** (if in scope) — every quest character-attributed
- [ ] **`SYS-12-NGPLUS`** (if in scope) — meters reset, knowledge persists
- [ ] **`SYS-13-ROUTELOCK` XOR `SYS-26-MULTIPROTAG`** (pick one)
- [ ] **`SYS-25-FLOWCHART`** (if in scope) — chapter-select fallback for mobile-only
- [ ] **`SYS-24-GALLERY`** (if in scope) — locked silhouettes visible

- [ ] **Phase 6 milestone** — full replay loop works, NG+ run produces new content, gallery accumulates

## G.9 Phase 7 — Validation

- [ ] All per-system acceptance criteria pass (Section D)
- [ ] All per-system anti-pattern checks pass (Section D)
- [ ] All global anti-pattern checks pass (Section E)
- [ ] Critical and High severity issues resolved
- [ ] Medium severity tracked or resolved
- [ ] Playtest: at least 3 distinct paths through the game produce coherent experiences
- [ ] Save/load stress test: app-kill at 50 random points produces no data loss
- [ ] Mobile-specific: tap-target audit; offline-graceful behavior; cloud sync verified

## G.10 Content-authoring checklist (parallel to system implementation)

These run in parallel with all phases, not sequentially:

- [ ] Each character has documented voice signature
- [ ] Pacing rules (`SYS-11`) enforced via lint at authoring time
- [ ] Emotional beats library (Section F) referenced by content authors; 3–5 beats landed per route
- [ ] No flag set without an in-fiction acknowledgement somewhere
- [ ] No choice without effect
- [ ] Localization-aware: timer durations, text length, no hardcoded English strings

## G.11 Definition of done — game level

A VN built per this specification is **done** when:

1. The system shortlist from Section A.3 is fully implemented
2. All chosen systems pass their Section D acceptance criteria
3. No Critical or High anti-patterns from Section D or Section E remain
4. The full game is playable end-to-end on the target platform
5. Save/load survives random app-kill testing
6. At least one full playthrough produces an ending with all expected unlocks (gallery slots, journal entries, achievements)

---

# APPENDICES

## Appendix 1 — Stable ID conventions

- **Systems:** `SYS-NN-NAME` — never reuse retired IDs
- **Anti-patterns (per-system):** `AP-SYSTEM-ISSUE` (e.g., `AP-AFFECTION-DUMP`)
- **Anti-patterns (global):** `AP-X-ISSUE` (e.g., `AP-X-FLAG-UNUSED`)
- **Beats:** `BEAT-NAME` (e.g., `BEAT-SLIP`)
- **Flag namespaces:** prefix every flag (`met.`, `secret.`, `quest.`, `mood.`, `count.`, `cross.`, `run.`, `time.`)

## Appendix 2 — RFC language summary

| Term | Meaning |
|---|---|
| **MUST / MUST NOT** | Hard requirement. Implementations violating this are broken. |
| **SHOULD / SHOULD NOT** | Strong recommendation. Document any deviation. |
| **MAY** | Optional behavior. |
| **DETECT** | Anti-pattern flag — if condition matches, raise it. |

## Appendix 3 — Out of scope

This document does not specify:
- Monetization (gacha, energy, paywalls, ads)
- Generic mobile features (login bonuses, push for retention only)
- Asset pipelines (Live2D, animation, voice recording)
- Localization tooling
- Build / deployment infrastructure
- A/B testing frameworks

These exist in any mobile game; this document is scoped to VN-specific mechanics only.

## Appendix 4 — Versioning policy

- This is v2.0
- Future versions MUST preserve all existing system IDs
- New systems get new IDs (e.g., `SYS-27-NAME`); retired systems are marked deprecated, not removed
- Anti-pattern IDs are similarly stable
- Beat IDs are stable

## Appendix 5 — Companion documents

- **v1.0** — original handbook, narrative form
- **v1.1** — expanded handbook with Part II (mechanic survey), narrative form, retained as human-readable rationale layer
- **v2.0** (this document) — implementation specification, agent-targeted

---

*End of VN Systems Bible v2.0*
