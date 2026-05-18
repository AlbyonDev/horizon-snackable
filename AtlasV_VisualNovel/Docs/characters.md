# Characters — Roster Reference

> One file per character lives in [scripts/](../scripts/) as `CharacterData_<Name>.ts`. Sprites in [sprites/](../sprites/). This file summarises each character's authored content as it currently exists in code.

The roster has **9 fish in two groups**:

- **Long-arc romance characters** (3): Nereia, Kasha, Fugu — 5-tier arcs, 10 casts each, full catch sequence with three endings.
- **NPC combo characters** (6): Catfish, Carp, Perch, Eel, Pike, Trout — single 4-beat cast, fixed action combo unlocks the Reel finisher. No tier progression.

Sprite-prompt reference language (chibi-aquatic art direction) is in [/characters.md](../characters.md) at repo root.

---

## Nereia — Koi (primary, full arc)

- **Id:** `nereia`
- **Species:** Koi
- **Accent colour:** `#9B7FCC` (purple) / `#E8A84C` (gold)
- **Zones:** near, mid
- **Lures preferred:** `gold_teardrop`, `shell_hook`
- **Lures disliked:** `red_spinner`
- **Lure drift overrides:** red_spinner → Wary · gold_teardrop → Warm · shell_hook → Charmed
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
- **Zones:** mid, far
- **Lures preferred:** `red_spinner`, `bone_whistle`*
- **Lures disliked:** `gold_teardrop`
- **Arc:** 5 tiers, **10 casts**
- **Quest:** *The Championship* — "She tests everyone. Stay when she tells you to leave..."
- **CGs:** `portrait_kasha`, `ending_kasha_reel`, `ending_kasha_release`, `ending_kasha_drift_away`
- **Sprites:** `char_veiltail_neutral.png`, `kasha_love_end.png`, `kasha_release_end.png`, `kasha_drift_away.png`

\* *`bone_whistle` is declared in her preferred-lures list but is not registered in [LureData.ts](../scripts/LureData.ts) — it currently has no effect.*

**Voice & arc shape.** Territorial, solitary, vivid by reputation; in practice loud, competitive, performative, with bravado masking vulnerability. Calls the Floater "baka." Fast speech, contractions, self-corrects mid-line, slips into third person under stress, onomatopoeia ("Tch.", "Hah—", "Pff."). Arc: claims her corner → tests him → performance leaks → offers herself as prize → gives her real name.

**Catch sequence.** At peak the menu becomes "Reel" or "**Aki**" (her true name). The "Aki" option requires the player to have learned her name through dialogue choices.

---

## Fugu — Pufferfish (primary, full arc)

- **Id:** `fugu`
- **Species:** Pufferfish (Poisson-globe)
- **Accent colour:** `#FFB84D` (warm orange)
- **Zones:** near, far
- **Lures preferred:** `feather_fly`, `red_spinner`
- **Lures disliked:** `gold_teardrop`, `bare_hook`
- **Arc:** 5 tiers, **10 casts**
- **Quest:** *The True Friend* — "He just wants to be heard. Come back. Play. Stay..."
- **CGs:** `portrait_fugu`, `ending_fugu_reel`, `ending_fugu_release`, `ending_fugu_drift_away`
- **Sprites:** `char_pufferfish_neutral.png`, `fugu_love_end.png`, `fugu_release_end.png`, `fugu_drift_away.png`

**Voice & arc shape.** Dangerous and toxic by reputation; in reality desperately lonely, abandoned by family because of his toxic spines. Frenetic energy hides deep sadness. Talks nonstop to fill the silence. Voice: short energetic bursts, repetitions ("Vraiment !"), self-interruptions, "crois-moi !" as a verbal signature, sudden silences when loneliness surfaces. Arc: overexcited first contact → reveals his toxic nature → shares childhood abandonment → first comfortable silence → the friendship choice.

**Catch sequence.** "Reel" or "Fugu" (let him swim free).

---

## NPC Characters (6) — single cast, combo-based catch

Each NPC has **one cast of 4 beats**. The author has chosen a fixed action combo as the "correct" path; completing it lets the Reel choice fire and unlocks the portrait CG. NPCs have no romance arc, no tier progression, no true name, no Release/Drift-Away ending content. They're quick fishing puzzles that fill the roster and reward exploration of zones and actions.

| Character | Species | Accent | Zone | Lure prefs | Combo | Quest |
|---|---|---|---|---|---|---|
| **Catfish** | Catfish | `#7A6850` | mid | — | WAIT → TWITCH → DRIFT → REEL | *The Catfish* — "Read the water. Wait, twitch, drift — then strike." |
| **Carp** | Carp | `#8B7D3C` | far | — | WAIT → DRIFT → WAIT → REEL | *The Carp* — "Patience is the oldest wisdom. Wait, drift, wait — then strike." |
| **Perch** | Perch | `#C87533` | near | — | TWITCH → WAIT → TWITCH → REEL | *The Perch* — "Twitch to get its attention. Wait to earn its trust..." |
| **Eel** | Eel | `#2D4A3E` | far | — | DRIFT → DRIFT → DRIFT → REEL | *The Eel* — "Let the line go slack. Drift, drift, drift — then strike." |
| **Pike** | Pike | `#3A5C2E` | mid | — | TWITCH → TWITCH → TWITCH → REEL | *The Pike* — "Challenge it. Twitch, twitch, twitch — prove you are not prey." |
| **Trout** | Trout | `#6B8FA3` | near | — | WAIT → TWITCH → DRIFT → REEL | *The Trout* — "Show it everything. Wait, twitch, drift — it craves variety." |

**Sprites:** `<id>_neutral.png` for each. NPC characters do not have ending CGs in the gallery — only the portrait unlocks.

**Catch behaviour.** All NPCs use "Reel" as the catch verb; `reelEpitaph` is a short stock line (e.g. *"Catfish has been caught."*). No Release branch is authored.

---

## Adding a New Character

1. Copy [CharacterData_Nereia.ts](../scripts/CharacterData_Nereia.ts) (for a long arc) or any NPC file (for a quick character)
2. Set `id`, `name`, `species`, `accentColor`, `lakeZones`, `preferredLures`, `dislikedLures`
3. Author `getCasts()` (long arcs return many CastData; NPCs return one)
4. Define `catchSequenceData` (Reel verb / option label / epitaphs)
5. Declare `cgs: CGData[]` (portrait minimum; reel/release/drift-away for long arcs)
6. Define `questRequirement` if the character should be quest-gated (see [QuestSystem.ts](../scripts/QuestSystem.ts))
7. Add the portrait PNG + ending PNGs to `sprites/`, register them in [Assets.ts](../scripts/Assets.ts)
8. Import + `characterRegistry.register(YOUR_CHARACTER)` in [CharacterRegistry.ts](../scripts/CharacterRegistry.ts)

Registry insertion order determines display order in the Journal Characters tab and the EncounterSystem's tie-breaking.

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

`CharacterPortraitAssets` allows optional `curious`, `warm`, `alarmed` variants — the code falls back to `neutral` everywhere when those aren't shipped, which is the current state for all 9 characters.
