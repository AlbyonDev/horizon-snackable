# FLOATER — Cast System v1.0
> **Target reader:** AI implementation agent
> **Companion to:** `FLOATER_GDD_v1.0.md`, `FLOATER_VISUAL_BIBLE_v1.0.md`
> **Purpose:** Define the cast dialogue structure, verb system, affection modifiers, and authoring format precisely enough for consistent implementation and content generation.

---

## 1. Cast Structure

A Cast is the atomic unit of play. One fish, one encounter, two verb choices, one departure.

```
CAST

[APPROACH]
Fish arrives — determined by equipped Lure
Initial Drift state applied
Fish portrait appears, mood icon visible

[BEAT 1]
Fish dialogue — 6 to 8 lines
→ Player selects a verb
Fish response — 4 to 6 lines
Emotion icon appears briefly above portrait
Affection modifier applied silently

[BEAT 2]
Fish dialogue — 5 to 7 lines
→ Player selects a verb
Fish response — 3 to 5 lines
Emotion icon appears briefly above portrait
Affection modifier applied silently

[DEPARTURE]
Fish departure dialogue — 3 to 5 lines
Departure state determined by cumulative modifier
Emotion icon — final state
Fish exits
```

**Rules:**
- Every Cast has exactly 2 verb choices — no more, no less
- If Beat 1 produces a strongly negative modifier (-2), Beat 2 is shortened — fish is closing off
- If Beat 1 produces a strongly positive modifier (+2), Beat 2 opens a deeper dialogue branch
- The fish never explains what Floater said or did — they simply continue the conversation
- Floater is never described, never named, never given a voice

---

## 2. The Verb System

Four verbs. Fixed set. Always available. No labels beyond the verb name and colour.

| Verb | Colour | Hex | Physical action |
|---|---|---|---|
| WAIT | White | `#E8EAD8` | The float holds perfectly still |
| DRIFT | Green | `#4ABFB0` | The float sinks slightly, line loosens |
| TWITCH | Yellow | `#E8D080` | The float makes a small sharp movement |
| REEL | Red | `#CC4422` | The float pulls toward the rod |

**Critical rule — no intrinsic value:**
No verb is inherently good or bad. The affection modifier is determined entirely by the combination of verb + current dialogue context + fish personality + arc tier. The same verb produces different results with different fish, in different moments, at different tiers.

**The player learns by reading the fish, not by memorising a formula.**

---

## 3. Affection Modifier System

Based on Mystic Messenger's silent point system. Modifiers are never shown to the player. The player infers results from the fish's emotional response and icon.

### Modifier scale

| Value | Meaning |
|---|---|
| +2 | Exactly right for this fish in this moment |
| +1 | Good — fish responds warmly |
| 0 | Neutral — fish continues unaffected |
| -1 | Slightly wrong — fish deflects or closes slightly |
| -2 | Wrong for this moment — fish shuts down or reacts strongly |

### Cumulative modifier → Departure state

Sum of Beat 1 modifier + Beat 2 modifier:

| Total | Departure State | Final Icon |
|---|---|---|
| +4 | `DRIFT_CHARMED` | ♥ |
| +2 to +3 | `DRIFT_WARM` | … (soft) |
| +1 | `DRIFT_SATISFIED` | — |
| 0 | `DRIFT_NEUTRAL` | … (flat) |
| -1 to -2 | `DRIFT_WARY` | … (cold) |
| -3 to -4 | `DRIFT_SCARED` | !! |

### Affection delta per Cast

The cumulative modifier feeds into the global affection meter (SYS-01-AFFECTION):

| Departure State | Affection delta |
|---|---|
| `DRIFT_CHARMED` | +8 to +10 |
| `DRIFT_WARM` | +4 to +6 |
| `DRIFT_SATISFIED` | +1 to +2 |
| `DRIFT_NEUTRAL` | 0 |
| `DRIFT_WARY` | -1 to -2 |
| `DRIFT_SCARED` | -3 to -5 |

**Note:** Affection never resets to zero once the Familiar tier (35+) is reached. Floor mechanic applies per SYS-01-AFFECTION rules.

---

## 4. Context-Driven Modifier Table

The same verb produces different modifiers depending on what the fish just said. Authors define the modifier for each verb in each Beat context. The agent must reference this table when authoring dialogue.

### Context types

| Context Code | Description | Example |
|---|---|---|
| `CTX_OPEN` | Fish is being open, sharing something genuine | Nereia mentions Rémi unprompted |
| `CTX_DEFLECT` | Fish changes subject or avoids something | Nereia suddenly talks about the weather |
| `CTX_TENSE` | Fish has said something charged or vulnerable | Nereia admits she looks toward the exit every morning |
| `CTX_LIGHT` | Fish is in a playful or casual register | Vélo explaining his theory about lures |
| `CTX_HOSTILE` | Fish is closed off or prickly | Nereia correcting Floater about something minor |
| `CTX_QUESTION` | Fish has asked something directly | Nereia: "Tu viens d'où ?" |

### Modifier matrix (author reference)

This is a **reference guide** — not a rule. Authors may deviate with justification. The goal is that no verb has a universally correct application.

| Context | WAIT | DRIFT | TWITCH | REEL |
|---|---|---|---|---|
| `CTX_OPEN` | +2 | +1 | 0 | -1 |
| `CTX_DEFLECT` | +1 | +2 | -1 | -2 |
| `CTX_TENSE` | +2 | +1 | -2 | -1 |
| `CTX_LIGHT` | -1 | 0 | +2 | +1 |
| `CTX_HOSTILE` | +1 | +2 | -1 | -2 |
| `CTX_QUESTION` | -1 | +1 | +2 | 0 |

**Reading this table:**
- WAIT is almost always safe in serious or tense moments — silence is rarely wrong when someone is being vulnerable
- DRIFT is the generous verb — it works in most contexts but almost never maximises
- TWITCH is the high-risk verb — excellent in light moments, damaging in tense ones
- REEL is the assertive verb — occasionally right, often slightly wrong, sometimes exactly what was needed

---

## 5. Flag System Integration

Some Beat responses set flags silently. Flags are set based on verb + context + fish arc tier.

### Flag types set during Casts

| Flag type | When set | Example |
|---|---|---|
| `secret.fish.X` | Player finds a sensitive topic via correct verb | `secret.nereia.remi` — Rémi mentioned |
| `mood.fish.X` | Fish's emotional state after a Cast | `mood.nereia.unsettled` |
| `count.fish.casts` | Number of Casts with this fish | `count.nereia.casts` |
| `cross.fish.X` | Cross-character interaction | `cross.merlan.shell` — shell given |

### Flag checks — moment clef

At specific points in the arc, the game checks accumulated flags before deciding which version of a scene to show. These checks are silent — the player never sees a "checking flags" moment.

```
MOMENT CLEF CHECK

if (affection >= tier_threshold)
  AND (required_flags_present)
  → unlock deeper scene variant OR tier transition OR ending branch

if (affection < tier_threshold)
  OR (required_flags_absent)
  → standard scene continues, tier does not advance
```

**Rule:** A moment clef never tells the player why they did or didn't get a specific scene. The scene simply plays or doesn't.

---

## 6. Authoring Format

Every Cast is authored as a structured data block. The agent uses this format for all dialogue content.

```yaml
cast_id: nereia_t1_c1
fish_id: nereia
tier: 1
cast_number: 1
lure_required: null  # null = any lure works
drift_in: DRIFT_NEUTRAL  # initial state on first Cast

beat_1:
  context: CTX_HOSTILE
  dialogue:
    - "Tu as pris la place de Rémi."
    - "Il était là depuis trois ans. Il est parti le mois dernier."
    - "Tu ne le connais pas, évidemment."
    - "Personne ne te demande de le connaître."
    - "C'est juste que c'était sa place."
  
  responses:
    WAIT:
      modifier: +1
      icon: "…"
      dialogue:
        - "Hmm."
        - "Au moins tu n'essaies pas de t'excuser."
        - "Les gens qui s'excusent d'exister sont épuisants."
    
    DRIFT:
      modifier: +2
      icon: "?"
      flags_set:
        - secret.nereia.remi
      dialogue:
        - "..."
        - "Tu veux savoir qui c'était ?"
        - "Personne ne demande d'habitude."
    
    TWITCH:
      modifier: -1
      icon: "!"
      dialogue:
        - "Ce n'est pas une accusation."
        - "C'est une information."
        - "Tu n'as pas à te justifier."
    
    REEL:
      modifier: -2
      icon: "!!"
      dialogue:
        - "Je ne t'ai pas demandé ton avis."

beat_2:
  # Beat 2 has two variants — standard and deep
  # Deep variant unlocks if Beat 1 modifier >= +2 AND secret.nereia.remi is set

  standard:
    context: CTX_DEFLECT
    dialogue:
      - "Il faisait beaucoup de bruit."
      - "Les nouveaux font toujours beaucoup de bruit au début."
      - "Après ça se calme."
      - "Ou ils partent."
      - "L'un ou l'autre."
    
    responses:
      WAIT:
        modifier: +1
        icon: "…"
        dialogue:
          - "..."
          - "Tu ne dis rien."
          - "C'est déjà mieux que la moyenne."
      
      DRIFT:
        modifier: +2
        icon: "?"
        dialogue:
          - "Tu ne demandes pas si tu vas partir toi aussi."
          - "..."
          - "Intéressant."
      
      TWITCH:
        modifier: -1
        icon: "!"
        dialogue:
          - "Oui bon."
          - "Inutile de s'agiter."
      
      REEL:
        modifier: -1
        icon: "…"
        dialogue:
          - "On ne se connaît pas."
          - "Ce n'est pas le moment."

  deep:
    context: CTX_OPEN
    unlock_conditions:
      - beat_1_modifier: "+2"
      - flag: secret.nereia.remi
    dialogue:
      - "Rémi."
      - "Il parlait tout le temps. De tout, de rien."
      - "Il avait toujours une anecdote sur quelque chose que personne ne lui avait demandé."
      - "C'était épuisant."
      - "..."
      - "Le quartier est beaucoup plus silencieux depuis qu'il est parti."
      - "Ce n'est pas un compliment pour le silence."
    
    responses:
      WAIT:
        modifier: +2
        icon: "…"
        flags_set:
          - mood.nereia.compared_you
        dialogue:
          - "Tu ne dis rien."
          - "Rémi n'aurait pas pu tenir deux secondes sans dire quelque chose à ce stade."
          - "..."
          - "Ce n'est pas forcément un défaut chez toi."
      
      DRIFT:
        modifier: +1
        icon: "?"
        flags_set:
          - secret.nereia.remi_said_hed_come_back
        dialogue:
          - "Il a dit qu'il reviendrait voir le quartier."
          - "Les gens disent ça."
          - "..."
          - "En général."
      
      TWITCH:
        modifier: +1
        icon: "?"
        flags_set:
          - mood.nereia.compared_you
        dialogue:
          - "Qu'est-ce qu'il y a de drôle ?"
          - "..."
          - "Rémi aussi trouvait ça drôle."
          - "Quand je disais des choses."
          - "Je n'ai jamais compris pourquoi."
      
      REEL:
        modifier: -1
        icon: "!"
        dialogue:
          - "Ce n'est pas le sujet."
          - "Le sujet c'est que tu as pris une place."
          - "C'est tout."

departures:
  DRIFT_CHARMED:
    dialogue:
      - "Il faut que j'y aille."
      - "..."
      - "Le mercredi matin il y a moins de monde ici."
      - "Si tu comptes rester."
      - "Ce n'est pas une invitation."
      - "C'est une information."
    icon: "♥"

  DRIFT_WARM:
    dialogue:
      - "Il faut que j'y aille."
      - "..."
      - "Tu n'es pas aussi bruyant que je pensais."
    icon: "…"

  DRIFT_SATISFIED:
    dialogue:
      - "Je dois y aller."
      - "Bonne journée."
    icon: "—"

  DRIFT_NEUTRAL:
    dialogue:
      - "Je dois y aller."
    icon: "…"

  DRIFT_WARY:
    dialogue:
      - "Je dois y aller."
      - "Ne prends pas trop tes aises."
    icon: "…"

  DRIFT_SCARED:
    dialogue:
      - "..."
    icon: "!!"
    # She leaves without another word
    # Next Cast cooldown applied
```

---

## 7. Authoring Rules

Rules the agent must follow when writing Cast content.

### Dialogue
- Maximum 8 lines per Beat opening dialogue
- Maximum 6 lines per verb response
- Maximum 5 lines per departure
- Maximum 80 characters per line
- No line explains what Floater said or did
- No line names Floater or describes Floater
- Fish speaks as if in a normal conversation — the silence of the other party is not remarkable

### Voice consistency
- Each fish has a documented voice signature in `FLOATER_GDD_v1.0.md` §6.1
- A blind read test should identify the fish from the dialogue alone
- Voice does not change between Casts — it evolves gradually across tiers

### Modifier assignment
- No verb has a fixed modifier — always context-dependent
- At least one verb per Beat should produce +2
- At least one verb per Beat should produce -2
- The +2 verb should not be obviously "correct" from the dialogue alone
- The -2 verb should produce unique content, not just a shorter scene

### Flag discipline
- Flags are set sparingly — maximum 2 flags per Cast
- Every flag set must be read somewhere in the arc (no orphan flags per SYS-03-FLAGS)
- Long-arc flags must be marked explicitly as `long_arc: true`

### Deep variant rule
- Not every Cast has a deep variant — reserve for tier 2+ moments
- Deep variants unlock via modifier threshold AND flag combination
- Deep variant content must justify its existence — it reveals something the standard path doesn't

---

## 8. Moment Clef Format

The check that gates tier transitions and endings. Authored separately from Cast files.

```yaml
moment_clef_id: nereia_tier2_unlock
fish_id: nereia
tier_target: 2
check_type: tier_transition

conditions:
  affection_min: 15
  flags_required:
    - secret.nereia.remi
  flags_any:
    - mood.nereia.compared_you
    - mood.nereia.unsettled

success:
  scene_id: nereia_t1_conclusion
  dialogue:
    - "..."
    - "Tu es encore là."
    - "La semaine prochaine aussi probablement."
    - "Les gens comme toi restent."
    - "Je ne sais pas encore si c'est bien."
  drift_out: DRIFT_TROUBLED
  flags_set:
    - tier.nereia.2.unlocked

failure:
  # No scene — next Cast continues at tier 1
  # Player has no signal that a check occurred
```

---

## 9. Cast Sequence per Fish

Reference for implementation — how many Casts per tier, what unlocks between tiers.

### Primary fish (5 tiers)

```
Tier 1 — 2 Casts → Moment Clef → Tier 2
Tier 2 — 2 Casts → Moment Clef → Tier 3
Tier 3 — 3 Casts → Moment Clef → Tier 4
Tier 4 — 2 Casts → Moment Clef → Tier 5
Tier 5 — 2 Casts → Catch Sequence available
```

Total per primary fish: **11 Casts + 5 Moment Clefs**

### Secondary fish (3 tiers)

```
Tier 1 — 2 Casts → Moment Clef → Tier 2
Tier 2 — 2 Casts → Moment Clef → Tier 3
Tier 3 — 2 Casts → Ending
```

Total per secondary fish: **6 Casts + 3 Moment Clefs**

### Hidden fish (2 tiers)

```
Tier 1 — 2 Casts → Moment Clef → Tier 2
Tier 2 — 2 Casts → Release ending only
```

Total: **4 Casts + 1 Moment Clef**

---

## 10. Content Volume Estimate

| Element | Count | Words each | Total |
|---|---|---|---|
| Primary fish Casts (standard) | 33 | ~300 | ~9 900 |
| Primary fish Casts (deep variants) | ~15 | ~200 | ~3 000 |
| Secondary fish Casts | 18 | ~250 | ~4 500 |
| Hidden fish Casts | 4 | ~250 | ~1 000 |
| Moment Clef scenes | 14 | ~150 | ~2 100 |
| Ending scenes | 14 | ~300 | ~4 200 |
| **Total** | | | **~24 700 words** |

Comparable to Hatoful Boyfriend without BBL (~25 000 words). Sufficient for 4 to 6 hours of first-playthrough content at the dialogue density established in the tone exercise.

---

*FLOATER Cast System v1.0 — The float moves. The fish decides what it means.*
