---
name: ink-authoring
summary: Information on how to write dialog files in ink format for Hooked on a Feeling
include: on_context
agents: [global]
---

# Ink Authoring Guide — Hooked on a Feeling

This guide is the single source of truth for writing fish dialogue in this project. It covers the narrative design principles, the Ink syntax our custom parser supports, and the conventions the engine relies on.

If you write dialogue that ignores one of these rules, you will break the immersion, violate player agency, or crash the game. Read this carefully and use the checklist at the end to audit your work.

---

## 1. Core Design Principles (The Holy Trinity)

Every line you write must pass these foundational rules. They are the DNA of the game.

### 1.1 The Invisible Dialogue (The Float Speaks)
The player is a silent fishing float on screen, but **to the fish, the float is a fully conversational human protagonist.** However, the player NEVER reads or hears what the float actually says. 

The player chooses a **cold meta-intent** via the UI, and discovers what "they" just said through the fish's immediate reaction.

To write this successfully, you must follow this strict 3-step mental process for every choice:
1. **Player's Intent (UI):** `[REEL] Interrupt.`
2. **Invisible Float Phrase (in the player's head):** *"Wait, what do you mean by T-2313? Explain."*
3. **Fish's Organic Reaction (Ink text):** *"That is three questions in rapid succession. I am not answering them."*

**Never put float dialogue in the text.** The fish's reaction must imply the spoken words.

### 1.2 UI Tooltips as Cold Meta-Intents (1-2 Words MAX)
The tooltip belongs to the mechanical UI; the emotion belongs to the fish. To prevent "false granularity" and protect player agency, the text inside the brackets must be **1 to 2 words maximum, using ONLY action verbs.**

Do not write adverbs (no "gently"), do not describe emotions, and do not write specific dialogue prompts. The player gives the direction; the float executes it.

> ❌ **Bad (Too specific / Dialogue prompt):** `[TWITCH] Ask about her sleep.`
> ❌ **Bad (Too emotional / Adverbs):** `[DRIFT] Empathize deeply.`
> ❌ **Bad (Describing a physical float):** `[WAIT] Bob silently in the water.`
> 
> ✅ **Good (Pure cold agency):** `[TWITCH] Probe.`
> ✅ **Good (Pure cold agency):** `[DRIFT] Comfort.`
> ✅ **Good (Pure cold agency):** `[WAIT] Observe.`

### 1.3 The Anti-Parrot Rule (Organic Reactions)
When the fish reacts to the player's invisible phrase, **the fish must never echo, quote, or clinically describe the player's action.** The fish is a character in a conversation, not a narrator describing the scene. React to the *meaning* of the invisible phrase, not the UI verb.

> ❌ **Bad (Echoing/Parroting):** > * Intent: `[DRIFT] Accept.`
> * Fish: *"You are accepting my apology."* (Robotic, breaks immersion).
> 
> ✅ **Good (Organic Reaction):** > * Intent: `[DRIFT] Accept.`
> * Fish: *"You are dismissing a seventeen-second miscalculation as if we were discussing the weather."* (Implies the float said *"It's no big deal"*).

### 1.4 Mundane Humanization (The Surreal Dissonance)
We are creating a deliberate cognitive dissonance: the player *sees* a fish in a lake, but the dialogue treats them as a **mundane, modern human living in a city**. The lake is simply the "park bench" or "street corner" where they meet.

**The Vocabulary Rules:**
- **BAN ALL FISH WORDS:** Never mention swimming, scales, gills, fins, schools of fish, water, or hooks.
- **TRANSLATE FISHING GEAR:** In the engine, the player equips "lures" (e.g., `red_spinner`, `feather_fly`). In the dialogue, the fish must refer to these as human objects: a "red keychain", a "coffee", a "copper coin", a "feather charm".
- **ENFORCE HUMAN LIFESTYLE:** Characters walk, run, take the bus, live in apartments, and complain about neighbors.

> ❌ Fish: "I swam all the way here and bit your bare hook."
> ✅ Fish: "I walked down from the upper streets to meet you empty-handed."

### 1.5 The Climax Redefined (Catch vs. Release)
Because the fish are treated as humans, the act of "Reeling them in" (Catching) must never be framed as trapping an animal. It is a metaphor for commitment.
- **[REEL] (Catch):** Taking them by the hand, asking them to stay with you, committing to a relationship/friendship, leaving the town together.
- **[WAIT/DRIFT] (Release):** Letting them go, saying a peaceful goodbye, allowing them to move on with their life.

---

## 2. Tier Structure & Narrative Pacing

### 2.1 The 5-Tier ROMANCE Arc
Each primary fish has 5 tiers, marked by a clear emotional shift. Each tier holds **2 casts** by default (the "C1" and "C2" knots).

| Tier | Name | Beat |
|---|---|---|
| 1 | Meeting | The fish notices the float. Curiosity or defensiveness. |
| 2 | Curiosity | The fish opens up a little. Anomaly / First trust. |
| 3 | Confidence | A confession or vulnerability. The core trauma. |
| 4 | Decision | The climax is approaching. Deep bonding. |
| 5 | Climax | The final morning. Reel (Stay) or Release (Goodbye). |

### 2.2 The Compass (Action Mapping)
Always map your intents to these psychological axes:
- **[WAIT] (Passive/Firm):** Hold space, Observe, Surrender, Listen.
- **[TWITCH] (Active/Soft):** Joke, Tease, Probe, Nudge, Question.
- **[DRIFT] (Passive/Soft):** Comfort, Yield, Accept, Confess, Empathize.
- **[REEL] (Active/Firm):** Push, Confront, Interrupt, Demand, Challenge.

### 2.3 Affection Delta Calibration
Set `#delta:N` on every choice.
* `+5` (Breakthrough), `+4` (Real opening), `+3` (Sincere interest), `+2` (Slightly positive), `+1` (Neutral-positive), `0` (Deflection), `-2` (Mild rejection), `-4/-5` (Harsh rejection).

### 2.4 Drift State (Mood at Departure)
Set `#drift:STATE` on choices (e.g., `#drift:CHARMED`, `#drift:WARY`). This modifies the opening of the *next* encounter via **Bridge Dialogues**.

---

## 3. Ink Syntax & Engine Plumbing

### 3.1 Knot Naming Convention
Every cast knot follows this pattern: `<fishId>_t<tier>_c<cast>_b<beat>` (e.g., `nereia_t2_c4_b1`).
The dispatcher knot is always `<fishId>_entry`.

### 3.2 The Choice Syntax
```ink
* [WAIT] Observe. #delta:3 #expr:warm #icon:hesitation #drift:CHARMED #flag:fact.fugu.appearance
    You're just giving me time. Without judging.
    Nobody does that.
    -> fugu_t1_c2_b2

    Intent: 1-2 words MAX inside the brackets.

    #expr: neutral, curious, warm, alarmed.

    #icon: curiosity, surprise, warmth, shock, hesitation, contentment, sadness, boredom, delight, none.

3.3 Bridge Dialogues (Handling Negative Drifts)

If a player makes a bad choice, the fish leaves with a negative drift (WARY, SCARED). Since there are no Game Overs, the player just casts again. You must use a Bridge Dialogue at the start of the next cast to acknowledge this before re-railing the conversation.
Code snippet

=== fugu_t2_c4_b1 ===
{ mood.fugu.last_drift == "SCARED" :
    I'm calm today. I promise. No sudden spikes.
- else :
    Hey. I thought of something last night.
}
...

3.4 Ending a Cast

Do not write "generic goodbye" knots. When a conversation is over, write the final organic line in the choice response and end with -> END. The engine will handle the visual departure automatically.
4. Recipe System & The Dispatcher

The _entry knot routes the player based on flags. It must check from.* signals (which recipe triggered this cast) and quest.* flags (where the player is in the story).
Code snippet

=== fugu_entry ===
{ from.fugu.nightT2 :
    { quest.fugu.t2_c3_done :
        -> fugu_t2_c4_b1
    - else :
        -> fugu_t2_c3_b1
    }
- from.fugu.home :
    { met.fugu :
        -> fugu_t1_c2_b1
    - else :
        -> fugu_t1_c1_b1
    }
- else :
    -> fugu_t1_c1_b1
}

To move a player from Tier 1 to Tier 2, your final choice in Tier 1 must DISABLE the old recipe and activate the new one:
#disable-flag:recipe.fugu.home #disable-flag:recipe.fugu.homeNight #flag:recipe.fugu.nightT2 #flag:quest.fugu.t1_done

### Flag-mutation tags: three flavors

| Tag | Engine call | Use when |
|---|---|---|
| `#flag:X` | `set(X, true)` | Activate or mark something (most common). |
| `#clear-flag:X` | `clear(X)` — DELETE the flag | RESET TO DEFAULT. A `recipe.X` whose recipe is `initial:true` becomes active again. Use for loop-back-to-home scenarios. |
| `#disable-flag:X` | `set(X, false)` — explicit FALSE | DISABLE EXPLICITLY. A `recipe.X` becomes inactive even if `initial:true`. Use at tier closures and permanent-off scenarios. |

⚠ **Common pitfall:** using `#clear-flag` on `recipe.fish.home` does NOT close the home slot — it RE-OPENS it because `home` is `initial:true`. Always use `#disable-flag` to permanently close a recipe slot.
5. QUALITY ASSURANCE CHECKLIST (Audit Your Work)

Before submitting any Ink script, you MUST verify:

    [ ] The "Word Count" Check: Look at your intents inside the brackets (e.g., [TWITCH] Joke.). Are there more than 2 words? Are there adverbs? If yes -> FAIL. Rewrite to 1-2 cold action verbs.

    [ ] The "Parrot" Check: Read the fish's immediate response to a choice. Does the fish explicitly state what the player just did? (e.g., "You are demanding an explanation.") If yes -> FAIL. Rewrite it to react to the implied words.

    [ ] The "Aquarium" Check: Do the words "water", "swim", "lure", "hook", "scales", or "fish" appear anywhere in the text? If yes -> FAIL. Translate them into human objects and actions.

    [ ] The "Bridge" Check: Do c1 knots in Tiers 2 to 5 include a { mood.fish.last_drift } conditional block to handle negative carryovers? If no -> FAIL.

    [ ] The "Divert" Check: Does every choice end with a -> knot_name or -> END? If no -> FAIL.

