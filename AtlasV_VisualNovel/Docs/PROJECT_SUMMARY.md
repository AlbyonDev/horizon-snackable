# Hooked on a Feeling — Project Summary

> **Last updated:** Milestone 1 Foundation implementation complete  
> **Reference documents:** `FLOATER_GDD_v1.0.md`, `FLOATER_VISUAL_BIBLE_v1.0.md`, `VN_SYSTEMS_BIBLE_v2.0.md`

---

## Project Overview

**Hooked on a Feeling** is a cozy mobile visual novel disguised as a fishing game. The player manipulates a fishing float in a pond, attracting fish characters who approach, talk, and form bonds across multiple sessions. The game's central tension lives in a single question the player is never asked directly: what do you actually intend to do with the fish you've grown to love?

### Core Identity

- **Platform:** Mobile-only, portrait format (480×800 base canvas)
- **Genre:** Romance + Slice-of-life hybrid visual novel with fishing metaphor
- **Session target:** 3–7 minutes per Cast (fishing session)
- **Cadence:** One-shot premium — no real-time gating
- **Cast size:** 6 fish characters (3 primary arcs, 2 secondary, 1 hidden)

### Design Pillars

1. **Cozy first, conflicted second** — Warm and playful by default; emotional weight is earned, not imposed
2. **Actions, not words** — Player communicates through fishing verbs (Twitch, Wait, Reel, Loosen, Tug)
3. **Every fish has a life** — Six distinct characters with full arcs, secrets, and multiple endings
4. **Discovery over frustration** — Hints always visible in Journal; clear pistes with rewarding branches
5. **The ending is a choice, not a surprise** — Reeling a fish at max affection is a deliberate act the game never forces

---

## Core Loop — The Cast

A **Cast** is the atomic unit of play — equivalent to a chatroom session in Mystic Messenger or a client visit in VA-11 Hall-A. Each Cast has three phases:

### Phase 1 — Approach (~30 seconds)
- Player equips one Lure from inventory
- Lure determines which fish species are attracted and their initial Drift state (mood)
- Fish approaches with ambient animation; name and Affection tier appear in HUD

### Phase 2 — Exchange (3–5 minutes)
- Core dialogue phase structured as 2–4 Beats per Cast
- After each Beat, player selects one Action from the Action Menu:
  - **Twitch** — Get Noticed / Flirt
  - **Wait** — Be Patient / Listen
  - **Slight Reel** — Invite Closer
  - **Loosen Line** — Give Space / Relax
  - **Firm Tug** — Assert / Challenge
  - **Reel** — Capture (only available at max Affection tier)

### Phase 3 — Departure (~30 seconds)
- Fish always leaves at end of Cast (unless Catch Sequence triggers)
- Departure state becomes the DRIFT flag carried into next Cast
- States: Satisfied, Troubled, Suspicious, Charmed, Frightened, Angry

### The Catch Sequence
When Affection reaches maximum tier during an active Cast:
- Normal Action Menu replaced with two options: **Reel** or **[Fish's name]**
- **Reel** → Screen fades, CG unlocks, fish removed from pond permanently
- **[Fish's name]** → Fish responds with relief/confusion/gratitude, Cast ends with DRIFT_CHARMED, Release Route opens
- There is no correct choice; both outcomes unlock content

---

## Systems Architecture

All systems reference **VN Systems Bible v2.0** by ID. Implementation follows the Bible's specifications, anti-patterns, and acceptance criteria.

### Core Stack (Always Present)
- **SYS-02-CHOICE** — Dialogue Choice (Action Menu)
- **SYS-03-FLAGS** — Flag System (Drift, arc progress, cross-fish flags)
- **SYS-09-SKIP** — Skip / Already-Seen
- **SYS-10-SAVE** — AUTO_ONLY, saves after every Beat resolution
- **SYS-11-PACING** — Mobile rules: 1 line per bubble, max 80 chars

### Narrative Layer
- **SYS-04-TIERS** — Arc tiers per fish (ROMANCE_5ACT for primary, SLICE_EPISODIC for secondary)
- **SYS-05-JOURNAL** — MUSEUM variant: observations, hints, lure notes, keepsakes
- **SYS-06-ENDINGS** — Reel / Release / Drift-Away per fish + cross-fish surprises

### Relationship Layer
- **SYS-01-AFFECTION** — Per-fish hidden meter, TIER_ONLY visibility (mood icon + tier name, no numbers)
- **SYS-23-GIFTS** — Lures as strategic items; fish-gifted items as narrative rewards

### Mastery Layer
- **SYS-08-QUESTS** — Personal Quest hints per fish, always visible in Journal

### Retention Layer
- **SYS-24-GALLERY** — Catch CGs, Release CGs, arc moment CGs with locked silhouettes

### Systems Explicitly Excluded
- SYS-07-RIVALRY — Replaced by cross-fish flags (simpler, more elegant)
- SYS-12-NGPLUS — Deferred to future iteration
- SYS-13-ROUTELOCK — Arcs are independent by default
- SYS-18-REALTIME — Premium one-shot model, no scheduled content
- SYS-22-TIMER — No timers anywhere in Hooked on a Feeling (confirmed design decision)

---

## Fish Roster

The game uses a **modular character system** where each fish is a self-contained configuration registered in `CharacterRegistry.ts`. Adding a new character requires only creating a `CharacterData_<Name>.ts` file and registering it.

### Currently Implemented

#### Nereia — Koi (Primary, 5-tier ROMANCE_5ACT arc)
- **Species reputation:** Ornamental, kept, decorative
- **Actual personality:** Ancient, imperious, secretly lonely; has been in pond for decades
- **Arc:** Suspicion → The float keeps returning → Why does she keep surfacing? → She admits she waits → The choice
- **Voice:** Long sentences, formal register, no contractions in Tier 1–2
- **Lure affinity:** Gold Teardrop, Shell Hook; refuses Red Spinner
- **Accent colour:** Purple / gold

#### Kasha — Siamese Fighting Fish / Betta (Primary, 5-tier ROMANCE_5ACT arc)
- **Species reputation:** Territorial, solitary, vivid
- **Actual personality:** Loud, competitive, performative. Hides vulnerability behind bravado. Calls Floater "baka."
- **Arc:** Claims her corner → Tests him → Performance leaks → Offers herself as prize → Gives her real name (Aki)
- **Voice:** Fast, contractions, self-corrects, third-person slips when stressed, onomatopoeia ("Tch.", "Hah—", "Pff.")
- **Lure affinity:** Red Spinner, Bone Whistle; dislikes Gold Teardrop
- **Accent colour:** Scarlet #D33A2C / Burnt orange #E07A2B
- **Zones:** Mid, Far (contrasts with Nereia's Near/Mid)
- **Catch Sequence:** Choice is "Reel" or "Aki" (her real name)

#### Fugu — Poisson-Globe / Pufferfish (Primary, 5-tier ROMANCE_5ACT arc)
- **Species reputation:** Dangerous, toxic, avoided
- **Actual personality:** Desperately lonely, abandoned by family due to toxic spines. Frenetic energy hides deep sadness. Talks nonstop to fill the silence.
- **Arc:** Overexcited first contact → Reveals toxic nature → Shares childhood abandonment → First comfortable silence → The friendship choice
- **Voice:** Short energetic bursts, repetitions ("Vraiment !"), self-interruptions, "crois-moi !" as verbal signature, sudden silences when loneliness surfaces
- **Lure affinity:** Feather Fly, Red Spinner; dislikes Gold Teardrop, Bare Hook
- **Accent colour:** Warm orange #FFB84D
- **Zones:** Near, Far (found in shallows and deep waters)
- **Catch Sequence:** Choice is "Reel" or "Fugu" (let him swim free)

### Future Characters (Not Yet Implemented)
The architecture supports up to 6 fish characters (3 primary arcs, 2 secondary, 1 hidden). Additional characters can be added by:
1. Creating a single `CharacterData_<Name>.ts` file containing ALL content (metadata, dialogue for all tiers, lure preferences, quest hints, catch sequence, endings)
2. Registering in `CharacterRegistry.ts`

Each character is fully self-contained in ONE file — no separate tier files needed.

---

## Lure System

Lures are the primary strategic layer. Player equips one lure before each Cast.

### Starter Lure Set
- **Red Spinner** — Attracts all fish (default), Nereia arrives WARY
- **Gold Teardrop** — Nereia's preferred lure, arrives WARM
- **Feather Fly** — General attraction, CHARMED drift

### Unlockable Lures (Future)
- **Night Lure** — For future deep-dwelling characters
- **Shell Hook** — Nereia-specific, DRIFT_CHARMED on arrival (future cross-fish unlock)
- **Bare Hook** — DRIFT_TROUBLED, vulnerability dialogue

### Fish-Gifted Items
- Occasionally a fish attaches an item to the hook during a Cast
- Items added to Inventory automatically
- Some function as equippable Lures for future Casts
- Some are purely narrative — unlock Journal entries or satisfy Personal Quest conditions

---

## Journal System (SYS-05-JOURNAL, MUSEUM variant)

Accessible freely at any time. Four tabs:

### Tab 1 — Pond Notes
- One entry per fish (locked fish shown as dark silhouette)
- Each entry: portrait, species sketch, known facts, **Personal Quest** hint
- Personal Quest hints use progressive precision:
  - **Tier 1:** Poetic, implies lure type without naming
  - **Tier 2:** More specific, mentions time/distance/lure category
  - **Tier 3:** Precise, names conditions directly
  - **Tier 4+:** Tactical, tells what moment to watch for

### Tab 2 — Fish (Character Teasing)
- Shows ALL characters (unlocked + locked) in a structured list
- Unlocked characters: name, species, bond tier, cast count, observations, quest hint
- Locked characters: "???" with mysterious silhouette hint (e.g., "Dwells in the middle depths...")
- Character met counter at top: "X/Y characters met"
- Encourages exploration and curiosity about unmet characters

### Tab 3 — Lure Box
- All lures player owns
- Notes on which fish each has been used with and observed reactions
- Functions as preference-learning record

### Tab 4 — Collection (CG Gallery)
- 2-column grid of unlockable CG cards
- CG types: Fish portraits (unlocked on first encounter), Ending CGs (Reel/Release)
- Unlocked CGs show thumbnail and title, tappable to view fullscreen
- Locked CGs show lock icon with "???" placeholder
- Fullscreen viewer: semi-transparent background, centered image, close button at bottom
- CG IDs: "portrait_[fishId]" and "ending_[fishId]_[type]"
- Unlock state persists in save data (cgUnlocks array)

### Tab 5 — Stats & Achievements
- **Angler Statistics:** Total casts, characters met, facts discovered, keepsakes collected, highest bond tier, play sessions
- **Achievements/Badges:** 10 unlockable badges with conditions (First Cast, First Meeting, Patient Angler, Full Pond, Growing Trust, Soulbound, etc.)
- Progress indicator: "X/10 earned"
- All stats and badge unlock state persist in save data with backward compatibility

---

## Endings (SYS-06-ENDINGS)

### Per-Fish Endings
- **REEL (Catch)** — Player chooses Reel in Catch Sequence → CG unlock → Gallery CG + Journal epitaph
- **RELEASE (Let go)** — Player declines Reel → warm CG → Gallery CG + new arc branch + Journal note
- **DRIFT-AWAY (Left)** — DRIFT_SCARED triggers 3× with no recovery → empty pond CG → Journal note "they're gone"

### Cross-Fish Endings (Future)
- Specific flags from another fish's arc will trigger unique combinations
- Hidden Gallery slots planned

---

## Build Order (7 Milestones)

### Milestone 1 — Foundation
- Implement SYS-03-FLAGS, SYS-10-SAVE, SYS-02-CHOICE, SYS-09-SKIP, SYS-11-PACING
- Implement Cast loop: Approach → Exchange (2 Beats) → Departure for Nereia Tier 1 only
- Implement DRIFT flag system
- Asset prompt: 1 pond background (Nereia territory), Nereia sprite set (4 expressions)
- Code-animate: Float (red/white bobber, sine idle, dip on action), fishing line
- **Test:** Full Cast loop completes, saves, reloads correctly, skip works on repeated Cast

### Milestone 2 — Affection & Relationship Layer
- Implement SYS-01-AFFECTION, SYS-04-TIERS
- Wire Action → affection delta, Drift state → affection modifier
- Implement tier transition UI cue
- Author: Nereia Tier 1–2 Beat content
- **Test:** Reach Nereia Tier 2 via correct action sequence, verify floor mechanic, tier transition fires

### Milestone 3 — Journal & Hints
- Implement SYS-05-JOURNAL (MUSEUM variant, 3 tabs)
- Implement Personal Quest hint system
- Implement SYS-23-GIFTS (Lures): starting 3 lures, equip before Cast
- Wire Lure → fish attraction + initial Drift state
- Asset prompt: Emotion icon set (9 icons)
- **Test:** Journal updates after each Cast, hints match current arc tier, Lure equip changes Drift

### Milestone 4 — Catch Sequence & Endings
- Implement Catch Sequence: two-choice moment (Reel / [fish name])
- Implement Reel ending, Release ending, Drift-Away ending
- Implement SYS-06-ENDINGS, SYS-24-GALLERY
- Author: Nereia Tier 3–5 Beat content including Catch Sequence
- Asset prompt: Nereia Reel CG, Nereia Release CG
- **Test:** Both Nereia endings reachable, CGs unlock, Gallery updates

### Milestone 5 — Full Roster
- Asset prompts: All remaining fish sprite sets (Merlan, Gilles, Brume, Vélo, Hidden)
- Asset prompts: Remaining pond backgrounds (one per fish territory)
- Author and implement: Merlan, Gilles, Brume, Vélo, Hidden full arcs
- Implement: Remaining Lures (Night Lure, Shell Hook, Bare Hook)
- Implement: All cross-fish flags
- Asset prompts: All remaining CGs (Reel + Release per remaining fish)
- **Test:** All fish reachable, all endings reachable, all cross-fish flags trigger correctly

### Milestone 6 — Polish & Validation
- Run `SYS-03-FLAGS flag_audit()`: no orphan flags, no dangling checks
- Run global anti-pattern check (Bible Section E): all Critical and High issues resolved
- Wire SYS-08-QUESTS: Personal Quest hints connected to quest progression tracking
- Implement new game / restart flow
- Mobile audit: all tap targets ≥ 44pt, no dialogue bubble exceeds 80 chars
- Playtest: 3 distinct run paths produce coherent experiences
- Save stress test: app-kill at 20 random points — no data loss

### Milestone 7 — Content Authoring (Parallel)
- Each fish has documented voice signature
- Emotional beats library (Bible Section F) referenced: 3–5 beats landed per route
- No flag set without in-fiction acknowledgement
- No choice without effect

---

## Technical Parameters

| Parameter | Value |
|---|---|
| Platform | Mobile-only, portrait format |
| Base canvas | 480×800 (portrait) |
| Session target | 3–7 minutes per Cast |
| Game type (Bible §A.3) | Romance + Slice-of-life hybrid |
| Cast size | 6 fish characters |
| Cadence | One-shot premium — no real-time gating |
| Save model (Bible §A.4) | AUTO_ONLY — saves after every Beat resolution |
| Mastery layers (Bible §A.6) | 2 — SYS-01-AFFECTION + SYS-23-GIFTS (lures) |
| Monetization | Premium — out of scope for this GDD |

---

## Agent Capability Constraints

Design decisions made specifically to work within known agent capabilities:

### Leveraged (Agent Does Well)
- Single-state sprite prompting: all fish use 4 independently prompted portraits
- Full-art backgrounds: one per fish territory, prompted individually
- CG art: each CG is self-contained full-screen illustration
- Code animation: float bob, line tension, emotion icons, UI transitions
- UI from description: all layout described in proportional anchors
- System implementation with named references: all systems cited by SYS-NN-NAME

### Mitigated (Agent Struggles With)
- Sprite consistency across states: limited to 4 max per fish, prompting each with identical base parameters
- Cross-sprite composition: eliminated — fish sprites are standalone square portraits overlaid on background in code
- Day/night variants: eliminated — each fish has one fixed time-of-day for their background
- Anthropomorphic character consistency: eliminated — fish are stylised animals, not humanoid
- Rigged animation: eliminated — expression changes are instant state swaps between 4 static images

### Deferred to Future Iterations
- Inter-run memory (SYS-12-NGPLUS) — pond resets cleanly in v1
- Rivalry system (SYS-07-RIVALRY) — cross-fish flags handle this more simply
- Additional fish beyond 6 — architecture supports easy addition
- Localization — structure supports it but tooling not specified

---

## Key References

All implementation must reference:
- **FLOATER_GDD_v1.0.md** — Complete game design specification
- **FLOATER_VISUAL_BIBLE_v1.0.md** — Visual asset specifications and prompting templates
- **VN_SYSTEMS_BIBLE_v2.0.md** — System implementation rules, anti-patterns, acceptance criteria

When implementing any system, consult the Bible by SYS-NN-NAME for:
- Data schema
- Core rules (MUST/SHOULD/MAY)
- Acceptance criteria
- Anti-patterns to detect
- Reference implementations

---

---

## Current Implementation State

### Milestone 1 — Foundation (COMPLETE)
All core systems implemented and compiled:
- **Flag System** — Centralized key-value store with namespace validation and audit function
- **Save System** — AUTO_ONLY model, saves after each Beat resolution
- **Cast Loop** — Full Approach → Exchange → ActionSelect → FishReaction → Departure → Idle flow
- **Action Menu** — 5 XAML buttons (Twitch, Wait, Slight Reel, Loosen Line, Firm Tug) with UiEvent bindings
- **Skip System** — Per-beat seen tracking, skip button appears on repeated Beats
- **DRIFT System** — Departure state persists and modifies next Cast behavior
- **Nereia Tier 1 Content** — 2 Beats authored with all 5 action reactions per Beat
- **Rendering** — Pond background, fish portrait (4 expressions), animated float (sine bob + action dips), fishing line with tension curve, dialogue box with typewriter effect
- **Scene Setup** — ScreenSpace CustomUi entity with DrawingSurface + XAML overlays

### Milestone 2 — Affection & Relationship Layer (COMPLETE)
Relationship progression systems implemented:
- **SYS-01-AFFECTION** — Formal `AffectionSystem` class with floor enforcement, ±30 per-action cap, peak tracking, stagnation session detection, and TIER_ONLY visibility (mood icon + tier name, never raw numbers)
- **SYS-04-TIERS** — 5-tier ROMANCE_5ACT structure for Nereia with tier-based beat selection (`getBeatsForTier()`)
- **Action → Affection Delta** — Every fishing action produces a tier-specific affection change
- **Drift → Affection Modifier** — Arrival mood applies an affection modifier on Cast start (WARM +3, CHARMED +5, WARY -2, ANGRY -5)
- **Tier Transition UI** — Centered notification overlay auto-dismisses after 2.5s on tier promotion; mood icon updates in HUD
- **Nereia Tier 2 Content** — 2 new Beats (3 & 4) with "Curious" arc voice shift (occasional contractions, more openness)
- **Save Persistence** — Extended save data includes peakValue, floor, lastChangeDelta, lastChangeSessionId with backward-compatible loading

### Milestone 4 — Catch Sequence & Endings (COMPLETE)
Catch sequence and endings systems implemented:
- **Catch Sequence** — When fish reaches max affection tier (Bonded) and all beats played, two-choice moment appears: "Reel" or "[Fish's name]"
- **Reel Ending** — Choosing Reel displays epitaph text, unlocks CG, marks catch as used
- **Release Ending** — Choosing fish's name displays release epitaph, sets cross-fish flag
- **Drift-Away Ending** — Triggered automatically when DRIFT_SCARED occurs 3× without recovery
- **SYS-24-GALLERY (CG Collection)** — New Journal tab "Gallery" showing unlocked/locked CGs per character
  - Unlocked CGs show name and description with "[Tap to view]" prompt
  - Locked CGs show padlock icon and "???" placeholder
  - Fullscreen CG viewer overlay with tap-to-dismiss
  - CGs unlock automatically on Reel ending (first CG: Nereia's "The Last Morning")
  - Unlock state persists in save data
- **Nereia Full Arc Content** — Tiers 1–5 complete (10 Casts total) with catch sequence dialogue

### Awaiting Playtest
- Full Cast loop should be testable in Preview
- Verify tap-to-advance dialogue, action selection, and departure flow
- Verify tier progression: play 3+ Casts with patient actions (Wait, Loosen Line) to reach Tier 2
- Verify tier transition notification appears when crossing from Unaware to Curious
- Verify Tier 2 beats (deeper dialogue) unlock after tier promotion
- Verify fishing cast mechanic: power gauge, float arc trajectory, splash VFX
- Verify Journal accessible from title screen and idle state (3 tabs functional)
- Verify Lure selection appears before each Cast (after pressing Cast button)
- Verify selected lure affects fish's initial drift state
- Verify Journal updates after each Cast with new observations

### Milestone 3 — Journal & Hints (COMPLETE)
Journal and Lure systems implemented:
- **SYS-05-JOURNAL (MUSEUM variant)** — Three-tab journal (Pond Notes, Lure Box, Keepsakes) accessible from title screen and idle state. Scrollable text content, fish entries unlock on first meeting, locked fish shown as placeholder text.
- **Personal Quest Hints** — Progressive precision hints per fish (Tier 1 poetic → Tier 2 specific → Tier 3 precise → Tier 4+ tactical). Always visible in Pond Notes tab per fish.
- **SYS-23-GIFTS (Lures)** — Three starting lures (Red Spinner, Gold Teardrop, Feather Fly). Lure selection overlay appears before each Cast. Selected lure determines fish's initial drift state.
- **Lure → Fish Attraction** — Each lure defines which fish it attracts and per-fish drift overrides. Resolution logic finds first valid candidate from lure's attraction list.
- **Lure Reaction Tracking** — After each Cast, the lure-fish pair observation is recorded (positive/negative, cast count). Visible in Journal's Lure Box tab.
- **Emotion Icons** — 9 emotion icon sprites generated (curiosity, surprise, warmth, shock, hesitation, contentment, sadness, boredom, delight) with premultiply alpha enabled.
- **Save Persistence** — Save data extended with lure inventory, journal entries, and lure reactions. Backward-compatible with Milestone 2 saves (default values provided for missing fields).
- Verify Journal opens from title and idle screens, all 3 tabs navigate correctly
- Verify Lure selection appears before each Cast (after pressing "Cast" button)
- Verify selected lure affects initial drift state of approaching fish
- Verify Journal updates after each Cast with new observations

### Milestone 3 — Journal & Hints (COMPLETE)
Systems for player knowledge tracking and strategic lure selection:
- **SYS-05-JOURNAL (MUSEUM variant)** — Three-tab journal accessible from title screen and idle state:
  - Tab 1: Pond Notes — one entry per fish (locked/unlocked), species, known facts, Personal Quest hint
  - Tab 2: Lure Box — all owned lures with observed reactions per fish
  - Tab 3: Keepsakes — gifted items with dual perspective descriptions
- **Personal Quest Hints** — Progressive precision from poetic (Tier 1) to tactical (Tier 4+), always visible in Journal
- **SYS-23-GIFTS (Lures)** — Inventory-based equipment system:
  - Starting set: Red Spinner (attracts all), Gold Teardrop (cautious fish), Feather Fly (surface dwellers)
  - **Tackle Box** inventory overlay accessible from LakeIdle, Idle, and Title screens
  - Player equips a lure from inventory; equipped lure persists across casts (no per-cast selection)
  - Cast button gates on equipped lure — if none equipped, shows "Equip a lure first" warning (auto-dismiss 2s)
  - Equipped lure name shown near Cast button in LakeIdle state
  - Each lure defines fish attraction tables and initial drift modifiers per fish
  - Observed reactions tracked across sessions for Journal display
- **Emotion Icons** — 9 generated sprite icons (curiosity, surprise, warmth, shock, hesitation, contentment, sadness, boredom, delight) with premultiplied alpha
- **Save Backward Compatibility** — Milestone 2 saves load cleanly with default lure/journal data

### Fishing Cast Mechanic (NEW)
Added a fishing minigame sequence before each dialogue Cast begins:
- **Title Screen** — Button text changed to "Play"
- **LakeIdle State** — After pressing Play (or Cast Again), pond is shown with only the float/line and an orange "Cast" button — no character visible
- **CastCharging State** — Pressing Cast shows a vertical power gauge on the right side; indicator ping-pongs up and down (~1.5s cycle). Player taps screen to lock power level
- **CastFlying State** — Float launches in a parabolic arc toward the center of the pond; arc height varies with locked power (higher power = higher arc)
- **FloatLanded State** — Float arrives at rest position, expanding ripple VFX plays for 0.5s
- **Approach** — Character fades in and dialogue begins as before

This creates the flow: Title → LakeIdle → CastCharging → CastFlying → FloatLanded → Approach → Exchange → ... → Idle → (loop back to LakeIdle)

---

*The float bobs. The fish decide.*
