# Characters — Roster Reference

> One file per character lives in [scripts/](../scripts/) as `CharacterData_<Name>.ts`. Sprites in [sprites/](../sprites/). This file summarises each character's authored content as it currently exists in code.

The roster has **9 fish in two groups**:

- **Long-arc romance characters** (3): Nereia, Kasha, Fugu — 5-tier arcs, 10 casts each, full catch sequence with three endings.
- **NPC combo characters** (6): Catfish, Carp, Perch, Eel, Pike, Trout — single 4-beat cast, fixed action combo unlocks the Reel finisher. No tier progression.

Encounters are routed by the recipe system — `(zone, phase, lure)` triplets per character. Full tables in [encounter_probabilities.md](encounter_probabilities.md).

Sprite-prompt reference language (chibi-aquatic art direction) is in [/characters.md](../characters.md) at repo root.

---

## Nereia — Koi (primary, full arc)

- **Id:** `nereia`
- **Species:** Koi
- **Accent colour:** `#9B7FCC` (purple) / `#E8A84C` (gold)
- **Home zone:** far (Day + Night, any lure)
- **Recipes:** `home`, `homeNight`, `anomalyT2` (far/Day/gold_teardrop), `directiveT3` (far/Day/gold_teardrop), `inheritanceT4` (near/Day/gold_teardrop), `dawnT5` (far/Night/any)
- **Arc:** 5 tiers, **10 casts** (`t1_c1` → `t5_c10`)
- **Quest:** *The Patient Offering* — "Gold catches her eye. Patience holds her gaze..."
- **CGs:** `portrait_nereia`, `ending_nereia_reel`, `ending_nereia_release`
- **Sprites:** `nereia_neutral.png`, `nereia_love_end.png`, `nereia_release_end.png`

**Voice & arc shape.** Ornamental, decorative species reputation hides an ancient and secretly lonely creature who has been in the pond for decades. Tier 1–2 voice: long sentences, formal register, no contractions. Tier 3–5: contractions appear, openness grows. Arc beats: suspicion → the float keeps returning → why does she keep surfacing? → she admits she waits → the final choice.

**Catch sequence.** Two options: "Reel" (Reel ending) or "Nereia" (Release ending). She has no `trueName` reveal — both choices use her public name.

---

## Kasha — Siamese Fighting Fish / Betta (primary, full arc)

- **Id:** `kasha`
- **True name:** `Aki` (revealed when `secret.kasha.real_name_given` is set)
- **Species:** Siamese Fighting Fish (Betta)
- **Accent colour:** `#D33A2C` (scarlet) / `#E07A2B` (burnt orange)
- **Home zone:** mid (Day + Night, any lure)
- **Recipes:** `home`, `homeNight`, `challenge` (mid/Day/red_spinner), `corner` (mid/Night/bare_hook), `offer` (mid/Night/any), `name` (mid/Day/any)
- **Arc:** 5 tiers, **10 casts**
- **Quest:** *The Championship* — "She tests everyone. Stay when she tells you to leave..."
- **CGs:** `portrait_kasha`, `ending_kasha_reel`, `ending_kasha_release`, `ending_kasha_drift_away`
- **Sprites:** `char_veiltail_neutral.png`, `kasha_love_end.png`, `kasha_release_end.png`, `kasha_drift_away.png`

**Voice & arc shape.** Territorial, solitary, vivid by reputation; in practice loud, competitive, performative, with bravado masking vulnerability. Calls the Floater "baka." Fast speech, contractions, self-corrects mid-line, slips into third person under stress, onomatopoeia ("Tch.", "Hah—", "Pff."). Arc: claims her corner → tests him → performance leaks → offers herself as prize → gives her real name.

**Catch sequence.** At peak the menu becomes "Reel" or "**Aki**" (her true name). The "Aki" option requires the player to have learned her name through dialogue choices.

---

## Fugu — Pufferfish (primary, full arc)

- **Id:** `fugu`
- **Species:** Pufferfish
- **Accent colour:** `#FFB84D` (warm orange)
- **Home zone:** near (Day + Night, any lure)
- **Recipes:** `home`, `homeNight`, `nightT2` (near/Night/any), `spinnerT3` (near/Night/red_spinner), `parkT4` (near/Day/any), `climaxT5` (near/Day/feather_fly)
- **Arc:** 5 tiers, **10 casts**
- **Quest:** *The True Friend* — "He just wants to be heard. Come back. Play. Stay..."
- **CGs:** `portrait_fugu`, `ending_fugu_reel`, `ending_fugu_release`, `ending_fugu_drift_away`
- **Sprites:** `char_pufferfish_neutral.png`, `fugu_love_end.png`, `fugu_release_end.png`, `fugu_drift_away.png`

**Voice & arc shape.** Dangerous and toxic by reputation; in reality desperately lonely, abandoned by family because of his toxic spines. Frenetic energy hides deep sadness. Talks nonstop to fill the silence. Voice: short energetic bursts, repetitions, self-interruptions, sudden silences when loneliness surfaces. Arc: overexcited first contact → reveals his toxic nature → shares childhood abandonment → first comfortable silence → the friendship choice.

**Catch sequence.** "Reel" or "Fugu" (let him swim free).

---

## NPC Characters (6) — single cast, combo-based catch

Each NPC has **one cast of 4 beats**. The author has chosen a fixed action combo as the "correct" path; completing it lets the Reel choice fire and unlocks the portrait CG. NPCs have no romance arc, no tier progression, no true name, no Release/Drift-Away ending content. They're quick fishing puzzles that fill the roster and reward exploration of zones and time of day.

Each NPC owns a single ambient recipe (`priority: 0`) so they lose ties to main fish at the same `(zone, phase, lure)` cell.

| Character | Species | Accent | Zone × Phase | Combo | Quest |
|---|---|---|---|---|---|
| **Perch** | Perch | `#C87533` | near × Day | TWITCH → WAIT → TWITCH → REEL | *The Perch* — "Twitch to get its attention. Wait to earn its trust..." |
| **Eel** | Eel | `#2D4A3E` | near × Night | DRIFT → DRIFT → DRIFT → REEL | *The Eel* — "Let the line go slack. Drift, drift, drift — then strike." |
| **Trout** | Trout | `#6B8FA3` | mid × Day | WAIT → TWITCH → DRIFT → REEL | *The Trout* — "Show it everything. Wait, twitch, drift — it craves variety." |
| **Catfish** | Catfish | `#7A6850` | mid × Night | WAIT → TWITCH → DRIFT → REEL | *The Catfish* — "Read the water. Wait, twitch, drift — then strike." |
| **Carp** | Carp | `#8B7D3C` | far × Day | WAIT → DRIFT → WAIT → REEL | *The Carp* — "Patience is the oldest wisdom. Wait, drift, wait — then strike." |
| **Pike** | Pike | `#3A5C2E` | far × Night | TWITCH → TWITCH → TWITCH → REEL | *The Pike* — "Challenge it. Twitch, twitch, twitch — prove you are not prey." |

**Sprites:** `<id>_neutral.png` for each. NPC characters do not have ending CGs — only the portrait unlocks.

**Catch behaviour.** All NPCs use "Reel" as the catch verb; `reelEpitaph` is a short stock line. No Release branch is authored.

---

## Sōma — Tench (NEW — not yet integrated)

- **Id:** `soma`
- **Species:** Tench
- **Accent colour:** `#5B8A72` (muted sage green)
- **Personality:** Dry, laconic, exhausted ex-caretaker. Humor as armor.
- **Expression (neutral):** Half-lidded calm eyes with a hint of tiredness, relaxed slightly downturned mouth suggesting mild apathy/bemusement. NOT sad, NOT angry — just "done with it all" energy.
- **Sprites:** `soma_neutral.png`

**Prompt used for sprite generation (CHARACTER_DESCRIPTION):**
> A small round chibi fish-person inspired by the tench, with a chubby muted olive-green and sage body, warmer tan-gold belly, subtle darker mottling across the back, tiny paired barbels near the mouth, half-lidded calm expression conveying mild tiredness and bemusement with a small neutral slightly downturned mouth, huge round glossy dark olive-amber eyes,

---

## Adding a New Character

1. Copy [CharacterData_Nereia.ts](../scripts/CharacterData_Nereia.ts) (long arc) or any NPC file (quick character)
2. Set `id`, `name`, `species`, `accentColor`
3. Define `recipes: Recipe[]` — at least one with `initial: true` so the fish is reachable. Use `priority: 1` for main fish, leave default (0) for NPCs.
4. Author `getCasts()` (long arcs return many CastData; NPCs return one)
5. Define `catchSequenceData` (Reel verb / option label / epitaphs)
6. Declare `cgs: CGData[]` (portrait minimum; reel/release/drift-away for long arcs)
7. Define `questRequirement` if the character should be quest-gated (see [QuestSystem.ts](../scripts/QuestSystem.ts) — note quests are journal hints only and do not gate encounters; use recipe activation flags for that)
8. Add the portrait PNG + ending PNGs to `sprites/`, register them in [Assets.ts](../scripts/Assets.ts)
9. Import + register in [CharacterRegistry.ts](../scripts/CharacterRegistry.ts)

Registry insertion order determines display order in the Journal Characters tab.

---

## At-a-Glance Sprite Status

| Character | neutral | curious | warm | alarmed | love_end | release_end | drift_away |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Nereia | ✓ | — | — | — | ✓ | ✓ | — |
| Kasha | ✓ | — | — | — | ✓ | ✓ | ✓ |
| Fugu | ✓ | — | — | — | ✓ | ✓ | ✓ |
| Catfish | ✓ | — | — | — | — | — | — |
| Carp | ✓ | — | — | — | — | — | — |
| Perch | ✓ | — | — | — | — | — | — |
| Eel | ✓ | — | — | — | — | — | — |
| Pike | ✓ | — | — | — | — | — | — |
| Trout | ✓ | — | — | — | — | — | — |
| Sōma | ✓ | — | — | — | — | — | — |

`CharacterPortraitAssets` allows optional `curious`, `warm`, `alarmed` variants — the code falls back to `neutral` everywhere when those aren't shipped, which is the current state for all 9 characters.
