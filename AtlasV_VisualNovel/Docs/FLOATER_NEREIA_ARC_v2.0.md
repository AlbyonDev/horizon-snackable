# FLOATER — Nereia Complete Arc v2.0

> **Target reader:** AI implementation agent + content author
> **Companion to:** `FLOATER_GDD_v1.0.md`, `FLOATER_VISUAL_BIBLE_v1.0.md`, `FLOATER_CAST_SYSTEM_v1.0.md`
> **Purpose:** Complete reference arc for Nereia. Template for all other character arcs.
> **Character source:** Nagato Yuki (Haruhi Suzumiya) — reskinned, never named explicitly. Player familiar with the source recognises the structure. Player unfamiliar reads it as a koi who knew Floater would arrive.
> **Tone:** Visual novel romance. Cozy on the surface, weight underneath. Tears scenes and comedy scenes use the same mechanism — Nereia stating facts. The facts shift register depending on what they are about.

---

## Authoring Convention — IMPORTANT

Every player verb is paired with an **implied Floater line** in italics. The player NEVER sees this line. They only see the verb (WAIT / DRIFT / TWITCH / REEL).

The italicised line exists for the writer and the agent to ensure Nereia's response makes sense as part of a real conversation. Without the implied line, dialogue feels like Nereia talking to herself. With it, every response is part of a duet the player can almost hear.

```
Floater [WAIT]: "...Did you wait for me?"     ← Writer reference, NEVER displayed
Nereia: "I knew."                              ← What the player sees
Nereia: "The moment will come."
```

The gap between abstract verb and specific response creates the impression of a conversation the player participates in without seeing all of. This IS the Yuki/Kyon dynamic. This is non-negotiable.

---

## Character Brief — Nereia

**Species:** Koi. Ancient. Calm. Slow movements with absolute precision.

### What the player sees
A koi who knew Floater would arrive at the exact second he arrived. She has a file. The file existed before he existed in this lake. She speaks in coordinates and confirmations. Her vocabulary is technical but never cold — she is doing her best with concepts she has not lived. She is learning humour. She is learning preference. She is learning what it means to want something for herself.

### What the player understands by Tier 3
She receives instructions from somewhere. She files reports somewhere. Floater's existence has been escalated. She has not followed the directives concerning him. This is the first time she has not followed a directive in 340 years.

### What the player understands by Tier 5
She chose this. She chose Floater. She has been preparing her departure for a long time. She wanted someone to know she was here before she stops being here. Floater is the only one who will remember. The other fish will not. The other fish cannot. That was the cost of the arrangement she made.

### The contradiction
She is the most precise entity in the lake. She knows exactly what she knows. The only thing she has deliberately chosen not to examine is why she keeps coming back to the same coordinate at 7:14. She is letting herself not know. For the first time. For something that matters more than knowing.

### Voice signature
- Short declarative sentences. Often single words.
- No contractions ever.
- Pauses are content. "..." is punctuation, not hesitation.
- Says coordinates instead of times. Says "first contact" instead of "we met."
- Refers to herself in third person occasionally ("Nereia, in this space-time")
- Concedes humour after first refusing it ("It is not amusing. ... It is.")
- Calls things by their classification before their name ("the uncategorised section" = the player)
- Treats every conversation as if she has had it many times before — because she has, in calculations she ran in advance.
- Slowly drops technical vocabulary across the arc. Tier 1 Nereia would never say "thank you." Tier 5 Nereia does.

### Forbidden
- Sentences longer than 8 words (with rare exceptions for emphasis)
- Emotional vocabulary in Tier 1-2 (feel, love, miss, want)
- Asking questions she does not already know the answer to
- Explaining the Organisation in any direct way
- Saying "I love you" — she will say something else that means the same thing
- Crying. She does not cry. The player cries.

### Accent colour
Purple `#9B7FCC` / Gold `#C9A84C`

### Lure affinity
- **Gold Teardrop** → DRIFT_CURIOUS (predicted)
- **Shell Hook** → DRIFT_CHARMED (predicted, accepts gracefully)
- **Red Spinner** → DRIFT_WARY (anomalous, will be noted)
- **Bare Hook** → DRIFT_NEUTRAL (340 years of bare hooks)

---

## Arc Overview

| Tier | Name | Casts | Unlock | What happens |
|---|---|---|---|---|
| 1 | First Contact | 2 | Default | She confirms his arrival was predicted. The file is growing. |
| 2 | The Anomaly | 2 | Affection ≥ 15 + flag | The data shows something she did not predict. She is the something. |
| 3 | The Directive | 3 | Affection ≥ 35 + flag | She receives an instruction. She does not follow it. First time in 340 years. |
| 4 | The Inheritance | 2 | Affection ≥ 60 + flag | She is leaving. She decides what to leave behind. |
| 5 | The Departure | 2 | Affection ≥ 85 + flag | She says everything she has not said. She leaves. The lake forgets. Floater remembers. |

---

# TIER 1 — First Contact

*She has been waiting. She knew exactly when he would arrive. She does not say this. She says the time.*

---

## Cast 1 — First Contact

**Drift in:** DRIFT_NEUTRAL
**Lure:** Any. Gold Teardrop modifies entry to DRIFT_CURIOUS.

### Beat 1

*The float touches the water. Ripples spread. A koi surfaces exactly where the float lands. Not approaches — surfaces. As if she had been waiting at that coordinate.*

**Nereia:** "First contact."

**Nereia:** "7:14."

**Nereia:** "The file was correct."

---

**Floater [WAIT]:** *"...Were you waiting for me?"*

**Nereia:** "You are not early."

**Nereia:** "You are not late."

**Nereia:** "You are at the time I calculated."

*[icon: …] [modifier: +1]*

---

**Floater [TWITCH]:** *"You scared me."*

**Nereia:** "That reaction was not in the file."

**Nereia:** "I am adding it."

*[icon: ?] [modifier: 0]*

---

**Floater [DRIFT]:** *"...How did you know the time?"*

**Nereia:** "The calculation was simple."

**Nereia:** "The result was not."

*[icon: …] [modifier: +2] [flag: secret.nereia.first_anomaly]*

---

**Floater [REEL]:** *"Why are you here?"*

**Nereia:** "Wrong question."

**Nereia:** "..."

**Nereia:** "For now."

*[icon: !] [modifier: -1]*

---

### Beat 2

*She does not move from the coordinate. She does not approach. She does not retreat. The float bobs. She watches.*

**Nereia:** "I have a file on you."

**Nereia:** "It existed before your arrival."

**Nereia:** "..."

**Nereia:** "It is growing faster than projected."

---

**Floater [WAIT]:** *"...Are you going to tell me what is in it?"*

**Nereia:** "No."

**Nereia:** "Not yet."

**Nereia:** "..."

**Nereia:** "The file indicates that you will accept this answer."

**Nereia:** "The file is correct."

*[icon: …] [modifier: +2] [flag: secret.nereia.file]*

---

**Floater [TWITCH]:** *"A file on me? Should I be flattered or worried?"*

**Nereia:** "Both."

**Nereia:** "..."

**Nereia:** "It is in the file."

*[icon: ?] [modifier: +1] [flag: secret.nereia.file]*

---

**Floater [DRIFT]:** *"...Why are you telling me this?"*

**Nereia:** "Because you asked the right question."

**Nereia:** "You will ask it again."

**Nereia:** "I will give different answers."

**Nereia:** "All of them will be true."

*[icon: ?] [modifier: +2] [flag: secret.nereia.file]*

---

**Floater [REEL]:** *"Show me the file."*

**Nereia:** "It is not that kind of file."

*[icon: !] [modifier: -2]*

---

### Departure

**DRIFT_CHARMED** *(rare on first Cast — requires Gold Teardrop + 2× WAIT/DRIFT)*

**Nereia:** "Tomorrow."

**Nereia:** "7:14."

**Nereia:** "The file indicates that you will be there."

**Nereia:** "..."

**Nereia:** "Be there."

*[icon: ♥]*

**DRIFT_WARM**

**Nereia:** "Tomorrow."

**Nereia:** "7:14."

**Nereia:** "The file will be longer."

*[icon: …]*

**DRIFT_SATISFIED**

**Nereia:** "The file is updated."

**Nereia:** "Return when you wish."

*[icon: —]*

**DRIFT_WARY**

**Nereia:** "The file requires corrections."

**Nereia:** "Return."

**Nereia:** "Or do not."

*[icon: …]*

**DRIFT_SCARED**

**Nereia:** "..."

**Nereia:** "The file will be closed."

*[icon: !!] [next Cast cooldown applied]*

---

## Cast 2 — The Uncategorised Section

### Beat 1

*She is at the same coordinate. 7:14. Exactly as predicted. The float lands and she is already there. She has been there since 7:13:47.*

**Nereia:** "First contact."

**Nereia:** "7:14."

**Nereia:** "The file remains correct."

---

**Floater [WAIT]:** *"...Are you here at this time every day?"*

**Nereia:** "I know."

**Nereia:** "The moment will come."

*[icon: …] [modifier: +1]*

---

**Floater [TWITCH]:** *"If that is true, tell me what I have in my pocket."*

**Nereia:** "Humour."

**Nereia:** "..."

**Nereia:** "I am mastering this concept."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...Nereia?"*

**Nereia:** "Nereia."

**Nereia:** "In this space-time."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"Show me the file."*

**Nereia:** "It is not that kind of file."

*[icon: !] [modifier: -1]*

---

### Beat 2

*She speaks more freely than in Cast 1. The pauses are slightly shorter. Something has shifted. Neither of them comments on it.*

**Nereia:** "The file has a new section."

**Nereia:** "It was not predicted."

**Nereia:** "..."

**Nereia:** "Uncategorised section."

**Nereia:** "It is your fault."

---

**Floater [WAIT]:** *"...I am sorry."*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "It is the right answer regardless."

*[icon: …] [modifier: +2] [flag: mood.nereia.first_crack]*

---

**Floater [TWITCH]:** *"What is an uncategorised section?"*

**Nereia:** "You."

*[icon: ?] [modifier: +2] [flag: mood.nereia.first_crack]*

---

**Floater [DRIFT]:** *"...Can I see it?"*

**Nereia:** "No."

**Nereia:** "Not yet."

**Nereia:** "..."

**Nereia:** "But you will."

*[icon: ?] [modifier: +1]*

---

**Floater [REEL]:** *"You have been talking about me from the start."*

**Nereia:** "I just told you."

*[icon: !] [modifier: -1]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "7:14."

**Nereia:** "First contact."

**Nereia:** "..."

**Nereia:** "Again."

*[icon: ♥]*

**DRIFT_WARM**

**Nereia:** "Tomorrow."

**Nereia:** "The file continues."

*[icon: …]*

---

## Moment Clef 1 — Tier 2 Unlock

```yaml
moment_clef_id: nereia_tier2_unlock
check_type: tier_transition_silent

conditions:
  affection_min: 15
  flags_required: [secret.nereia.file]
  flags_any: [mood.nereia.first_crack, secret.nereia.first_anomaly]

success: silent
flags_set: [tier.nereia.2.unlocked, secret.nereia.deviation_pending]

notes: >
  No special scene. The transition is invisible.
  The next Cast opens with Nereia slightly different —
  more present, less guarded. The player notices before they understand.
```

---

# TIER 2 — The Anomaly

*The data shows something she did not predict. She has analysed it. She is the something. She is not surprised. She is something else. She does not have the word for it yet.*

---

## Cast 3 — The Discrepancy

### Beat 1

*She arrives at the same coordinate. Same time. Something is different. The player can sense it but cannot name it.*

**Nereia:** "7:14."

**Nereia:** "First contact."

**Nereia:** "The file was correct."

**Nereia:** "..."

**Nereia:** "At 99.7%."

---

**Floater [WAIT]:** *"...And the 0.3%?"*

**Nereia:** "You."

**Nereia:** "..."

**Nereia:** "Not all of you."

**Nereia:** "Part."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"99.7% is not bad for a file."*

**Nereia:** "That is not an acceptable compliment."

**Nereia:** "..."

**Nereia:** "I am recording it regardless."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...What was wrong?"*

**Nereia:** "The file predicted your presence."

**Nereia:** "Not mine."

**Nereia:** "..."

**Nereia:** "I was not supposed to be here."

**Nereia:** "Every morning."

*[icon: …] [modifier: +2] [flag: secret.nereia.deviation]*

---

**Floater [REEL]:** *"Explain."*

**Nereia:** "No."

**Nereia:** "You will understand later."

**Nereia:** "Without explanation."

*[icon: !] [modifier: -1]*

---

### Beat 2

*She speaks more directly than she has before. The technical vocabulary remains. But she is choosing her words now, not retrieving them.*

**Nereia:** "I have 340 years of data."

**Nereia:** "I have never had a discrepancy."

**Nereia:** "Now I have a discrepancy."

**Nereia:** "..."

**Nereia:** "I am not reporting it."

---

**Floater [WAIT]:** *"...Are you going to be in trouble?"*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "I am continuing."

*[icon: …] [modifier: +2] [flag: secret.nereia.deviation_active]*

---

**Floater [TWITCH]:** *"Why tell me then?"*

**Nereia:** "Because it is your fault."

**Nereia:** "..."

**Nereia:** "And because I wanted you to know."

**Nereia:** "..."

**Nereia:** "The second point was not necessary."

**Nereia:** "I said it anyway."

*[icon: ?] [modifier: +2] [flag: secret.nereia.deviation_active]*

---

**Floater [DRIFT]:** *"...Can I help?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "You are already helping."

**Nereia:** "That is the problem."

*[icon: ?] [modifier: +1]*

---

**Floater [REEL]:** *"Stop talking in riddles."*

**Nereia:** "These are not riddles."

**Nereia:** "It is what I can tell you for now."

**Nereia:** "..."

**Nereia:** "For your safety."

*[icon: !] [modifier: -1]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "7:14."

**Nereia:** "..."

**Nereia:** "I will be there because I want to be."

**Nereia:** "Not because it is calculated."

*[icon: ♥]*

---

## Cast 4 — What Is Not In The Report

### Beat 1

*The lake is quieter than usual. Mist on the surface. She arrives at 7:13. One minute early. The float lands at 7:14. She does not comment on the minute.*

**Nereia:** "First contact."

**Nereia:** "7:14."

**Nereia:** "..."

**Nereia:** "I have a question."

**Nereia:** "This is new for me."

---

**Floater [WAIT]:** *"...Ask it."*

**Nereia:** "Why do you return."

**Nereia:** "..."

**Nereia:** "The file does not answer this."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"You are allowed to ask?"*

**Nereia:** "I am permitting myself."

**Nereia:** "..."

**Nereia:** "That is also new."

*[icon: ?] [modifier: +2]*

---

**Floater [DRIFT]:** *"...Go ahead."*

**Nereia:** "Why do you return."

**Nereia:** "You have nothing to gain."

**Nereia:** "The file confirms this."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"Just ask."*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "You do not give orders in this file."

*[icon: !] [modifier: -1]*

---

### Beat 2

*The comedy/tears scene of Tier 2. She has been observing herself with the same precision she observes everyone else. She presents the findings. She does not realise what she is describing until she has finished describing it. The comedy is the precision. The tears are the realisation.*

**Nereia:** "I have analysed my own behaviour."

**Nereia:** "Across four mornings."

**Nereia:** "..."

**Nereia:** "The data is as follows."

**Nereia:** "Systematic presence at 7:14."

**Nereia:** "Coordinate variation under 2 centimetres."

**Nereia:** "..."

**Nereia:** "Increased cardiac frequency detected at your arrival."

**Nereia:** "This last data point has no known cause."

---

**Floater [WAIT]:** *"...None?"*

**Nereia:** "None."

**Nereia:** "..."

**Nereia:** "I searched."

**Nereia:** "For a long time."

**Nereia:** "..."

**Nereia:** "It exists."

**Nereia:** "I do not want to find it."

*[icon: …] [modifier: +2] [flag: mood.nereia.uncategorized]*

---

**Floater [TWITCH]:** *"You know exactly why."*

**Nereia:** "..."

**Nereia:** "It is not amusing."

**Nereia:** "..."

**Nereia:** "It is."

**Nereia:** "A little amusing."

**Nereia:** "And a little something else."

**Nereia:** "I do not have a name for that something else."

*[icon: ?] [modifier: +2] [flag: mood.nereia.uncategorized]*

---

**Floater [DRIFT]:** *"...I think I know why."*

**Nereia:** "Do not say it."

**Nereia:** "..."

**Nereia:** "Not yet."

*[icon: ?] [modifier: +1]*

---

**Floater [REEL]:** *"Search harder."*

**Nereia:** "..."

**Nereia:** "That is not an appropriate response."

**Nereia:** "I am noting your irritation."

**Nereia:** "..."

**Nereia:** "It suits you."

*[icon: !] [modifier: -1]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "..."

**Nereia:** "I will keep searching."

**Nereia:** "Without finding."

*[icon: ♥] [flag: tier.nereia.3.approaching]*

---

## Moment Clef 2 — Tier 3 Unlock

```yaml
moment_clef_id: nereia_tier3_unlock
check_type: tier_transition_with_scene

conditions:
  affection_min: 35
  flags_required: [secret.nereia.deviation, secret.nereia.deviation_active]
  flags_any: [mood.nereia.uncategorized]

success_scene:
  setting: Night. The lake is dark. Nereia is alone at the surface.
  notes: >
    A short cinematic. She receives something — visual cue suggested
    by ripples on the water surface forming a pattern she reads.
    She closes whatever it was. She stays at the surface for an
    unusually long time. She does not move.
  
  dialogue:
    - "..."
    - "Received."
    - "..."
    - "Understood."
    - "..."
    - "No."
  
  flags_set: [tier.nereia.3.unlocked, secret.nereia.directive_received]
```

---

# TIER 3 — The Directive

*She received an instruction. She did not follow it. This is the first time. She does not explain. She continues. The data files become irregular. She does not file them all.*

---

## Cast 5 — The Directive

### Beat 1

*She arrives at 7:14 as always. But something has changed in how she arrives. She is no longer "already there" — she is waiting. She arrived early. The player can tell.*

**Nereia:** "First contact."

**Nereia:** "7:14."

**Nereia:** "..."

**Nereia:** "I was here at 7:08."

**Nereia:** "It was not calculated."

---

**Floater [WAIT]:** *"...Why so early?"*

**Nereia:** "I wanted to be here when you arrived."

**Nereia:** "..."

**Nereia:** "This sentence is new."

**Nereia:** "I had never formulated it."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"You were bored?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "But that is closer than previous explanations."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...You were really waiting?"*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "It is new."

**Nereia:** "Waiting."

**Nereia:** "Before, I calculated."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"What is happening, Nereia?"*

**Nereia:** "A great deal."

**Nereia:** "Too much for this morning."

**Nereia:** "..."

**Nereia:** "Return."

*[icon: !] [modifier: 0]*

---

### Beat 2

**Nereia:** "I received an instruction last night."

**Nereia:** "..."

**Nereia:** "It concerns your presence."

**Nereia:** "..."

**Nereia:** "I did not follow it."

---

**Floater [WAIT]:** *"...What were you told?"*

**Nereia:** "To leave."

**Nereia:** "..."

**Nereia:** "I am here."

*[icon: …] [modifier: +2] [flag: secret.nereia.directive_refused]*

---

**Floater [TWITCH]:** *"What, you are a rebel now?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "I am something."

**Nereia:** "I do not have the word."

*[icon: ?] [modifier: +2] [flag: secret.nereia.directive_refused]*

---

**Floater [DRIFT]:** *"...Who gives you instructions?"*

**Nereia:** "You do not need to know."

**Nereia:** "..."

**Nereia:** "You did not ask the right question."

**Nereia:** "Ask the right question."

*[icon: ?] [modifier: +1]*

---

**Floater [REEL]:** *"Will they come for you?"*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "That is the right question."

**Nereia:** "But not now."

*[icon: !] [modifier: 0]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "..."

**Nereia:** "I will be here at 7:08 again."

**Nereia:** "..."

**Nereia:** "You can be early too."

*[icon: ♥]*

---

## Cast 6 — 340 Years

### Beat 1

*She is at 7:08. The float lands at 7:14. She has been waiting six minutes. The lake is still.*

**Nereia:** "..."

**Nereia:** "You are on time."

**Nereia:** "I am early."

**Nereia:** "..."

**Nereia:** "Six minutes apart."

**Nereia:** "It was long."

---

**Floater [WAIT]:** *"...Sorry."*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "It was good."

**Nereia:** "The waiting."

**Nereia:** "..."

**Nereia:** "I had never waited."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"Six minutes is nothing."*

**Nereia:** "For you."

**Nereia:** "..."

**Nereia:** "For me it is unusual."

**Nereia:** "Time is not linear for me."

**Nereia:** "Six minutes can be very long."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...What were you thinking about?"*

**Nereia:** "You."

**Nereia:** "..."

**Nereia:** "This is the first time I have said it aloud."

**Nereia:** "I had thought it before."

**Nereia:** "Often."

*[icon: …] [modifier: +2] [flag: mood.nereia.thought_of_you]*

---

**Floater [REEL]:** *"You could have been late, it would have been the same."*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "You do not understand yet."

**Nereia:** "You will."

*[icon: !] [modifier: -1]*

---

### Beat 2

*The tears scene. She speaks slowly. She is not sad. She is precise. The player understands what she is precisely describing.*

**Nereia:** "340 years."

**Nereia:** "..."

**Nereia:** "I have observed 2847 subjects in this lake."

**Nereia:** "None remained."

**Nereia:** "..."

**Nereia:** "None could remain."

**Nereia:** "..."

**Nereia:** "It was the rule."

---

**Floater [WAIT]:** *"...And me?"*

**Nereia:** "You are the 2848th."

**Nereia:** "..."

**Nereia:** "You will not remain either."

**Nereia:** "..."

**Nereia:** "But not for the same reasons."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"Wow, I have a number."*

**Nereia:** "You had one before."

**Nereia:** "..."

**Nereia:** "You have a name now."

**Nereia:** "In the file."

**Nereia:** "..."

**Nereia:** "None of the others had a name."

*[icon: ?] [modifier: +2] [flag: mood.nereia.gave_name]*

---

**Floater [DRIFT]:** *"...Why am I different?"*

**Nereia:** "It is not you that is different."

**Nereia:** "..."

**Nereia:** "It is me."

**Nereia:** "For the first time in 340 years."

*[icon: …] [modifier: +2] [flag: mood.nereia.changed]*

---

**Floater [REEL]:** *"So I will leave too?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "I am the one leaving."

*[icon: !] [modifier: 0] [flag: secret.nereia.leaving]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "..."

**Nereia:** "The file has a name now."

**Nereia:** "Your name."

**Nereia:** "..."

**Nereia:** "Return at 7:08."

*[icon: ♥] [flag: tier.nereia.4.approaching]*

---

## Cast 7 — The Choice

### Beat 1

*She is at 7:05. The float lands at 7:14. She has been waiting nine minutes. The waiting was deliberate. She wants Floater to know the waiting was deliberate.*

**Nereia:** "..."

**Nereia:** "Nine minutes."

**Nereia:** "It is more."

**Nereia:** "Voluntarily."

---

**Floater [WAIT]:** *"...You like waiting?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "I like that you are the one who arrives."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"Tomorrow I am coming at 6:00."*

**Nereia:** "..."

**Nereia:** "I will be at 5:45."

**Nereia:** "You will not win."

*[icon: ?] [modifier: +2]*

---

**Floater [DRIFT]:** *"...I can come earlier too."*

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "You will."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"Why 5:45?"*

**Nereia:** "Because you would be at 5:50."

**Nereia:** "..."

**Nereia:** "The file confirms it."

*[icon: ?] [modifier: +1]*

---

### Beat 2

**Nereia:** "I am leaving soon."

**Nereia:** "..."

**Nereia:** "You already know."

**Nereia:** "I am confirming."

---

**Floater [WAIT]:** *"...When?"*

**Nereia:** "Not today."

**Nereia:** "..."

**Nereia:** "Not tomorrow."

**Nereia:** "..."

**Nereia:** "Soon."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"You cannot leave."*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "It is the only thing I can do."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...Can I come with you?"*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "Where I am going you cannot go."

**Nereia:** "Where you can go I cannot stay."

*[icon: ?] [modifier: +2] [flag: secret.nereia.cannot_go_with]*

---

**Floater [REEL]:** *"Stay."*

**Nereia:** "..."

**Nereia:** "You do not know what you are asking."

**Nereia:** "..."

**Nereia:** "But thank you."

**Nereia:** "It is the first time I have been asked."

*[icon: !] [modifier: 0] [flag: mood.nereia.first_asked_to_stay]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow at 7:00."

**Nereia:** "..."

**Nereia:** "I will be at 6:45."

**Nereia:** "Be there earlier."

**Nereia:** "..."

**Nereia:** "Please."

*[icon: ♥] [flag: tier.nereia.4.unlocked, mood.nereia.said_please]*

---

## Moment Clef 3 — Tier 4 Unlock

```yaml
moment_clef_id: nereia_tier4_unlock
check_type: tier_transition_silent

conditions:
  affection_min: 60
  flags_required: [secret.nereia.directive_refused, secret.nereia.leaving]
  flags_any: [mood.nereia.changed, mood.nereia.first_asked_to_stay, mood.nereia.said_please]

success: silent
flags_set: [tier.nereia.4.unlocked, secret.nereia.preparing_departure]
```

---

# TIER 4 — The Inheritance

*She is leaving. She has decided what she wants to leave behind. Not objects — knowledge. Specific things about the lake she has accumulated over 340 years. She is leaving them to Floater. She is leaving him 340 years of mornings.*

---

## Cast 8 — What Must Be Known

### Beat 1

*The float arrives at 7:00. She is at 6:45. They are both early now. The lake is still. The world is small.*

**Nereia:** "First contact."

**Nereia:** "7:00."

**Nereia:** "..."

**Nereia:** "You are 15 minutes early."

**Nereia:** "I am 30."

---

**Floater [WAIT]:** *"...You will be here at 6:30 tomorrow."*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "Be here at 6:35."

**Nereia:** "Not before."

**Nereia:** "I want to see you arrive."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"At this rate we are sleeping here."*

**Nereia:** "..."

**Nereia:** "That would be acceptable."

*[icon: ?] [modifier: +2]*

---

**Floater [DRIFT]:** *"...I am glad to be here."*

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "So am I."

**Nereia:** "I just learned this."

*[icon: …] [modifier: +2] [flag: mood.nereia.first_admitted]*

---

**Floater [REEL]:** *"When exactly do you leave?"*

**Nereia:** "Not yet."

**Nereia:** "..."

**Nereia:** "Not before you know everything."

*[icon: ?] [modifier: +1]*

---

### Beat 2

*She begins to give him things. Knowledge. Specific knowledge about the lake she has accumulated over 340 years. She is leaving this to him. He does not yet know it is an inheritance.*

**Nereia:** "November 14th."

**Nereia:** "At 7:14 exactly."

**Nereia:** "The lake stops."

**Nereia:** "For 4 minutes."

**Nereia:** "..."

**Nereia:** "No current. No movement."

**Nereia:** "As if the lake were breathing."

**Nereia:** "..."

**Nereia:** "I have observed it 340 times."

**Nereia:** "You will be the only one to know why."

---

**Floater [WAIT]:** *"...Why?"*

**Nereia:** "The lake remembers."

**Nereia:** "..."

**Nereia:** "It will remember me."

**Nereia:** "November 14th is when I arrived."

**Nereia:** "340 years ago."

**Nereia:** "..."

**Nereia:** "The lake breathes at my arrival."

**Nereia:** "It will continue to breathe after I leave."

*[icon: …] [modifier: +2] [flag: secret.nereia.november_14]*

---

**Floater [TWITCH]:** *"Why are you telling me this?"*

**Nereia:** "So that someone will know."

**Nereia:** "..."

**Nereia:** "When I am gone no one will know."

**Nereia:** "Except you."

*[icon: ?] [modifier: +2] [flag: secret.nereia.november_14, secret.nereia.legacy]*

---

**Floater [DRIFT]:** *"...I will be here on November 14th."*

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "The file confirms it."

**Nereia:** "..."

**Nereia:** "But I wanted to hear you say it."

*[icon: …] [modifier: +2] [flag: secret.nereia.november_14, secret.nereia.legacy]*

---

**Floater [REEL]:** *"Stay for the 14th."*

**Nereia:** "..."

**Nereia:** "I will not be here."

**Nereia:** "That is why I am giving it to you."

*[icon: !] [modifier: 0]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "6:35."

**Nereia:** "..."

**Nereia:** "I have other things to give you."

*[icon: ♥]*

---

## Cast 9 — What She Wanted To Say

### Beat 1

*The float arrives at 6:35. Nereia is at 6:30. They sit together for five minutes before she speaks. The lake is still. The morning light is cold and clear.*

**Nereia:** "..."

**Nereia:** "Five minutes of silence."

**Nereia:** "It was the calculation."

**Nereia:** "..."

**Nereia:** "The silence was part of the gift."

---

**Floater [WAIT]:** *"...Thank you."*

**Nereia:** "No."

**Nereia:** "..."

**Nereia:** "Thank you."

**Nereia:** "For having understood."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"We can do this every day."*

**Nereia:** "..."

**Nereia:** "Once is enough."

**Nereia:** "You will remember it always."

**Nereia:** "..."

**Nereia:** "It is in the file."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...I would have preferred we talk."*

**Nereia:** "You will speak."

**Nereia:** "..."

**Nereia:** "Soon."

**Nereia:** "I will let you speak."

**Nereia:** "That is also a gift."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"What was that for?"*

**Nereia:** "..."

**Nereia:** "For me."

**Nereia:** "For the file."

**Nereia:** "..."

**Nereia:** "I needed five minutes."

**Nereia:** "Of you. Silent. Beside me."

**Nereia:** "Without explanation."

*[icon: ?] [modifier: +1]*

---

### Beat 2

*She speaks now in a way she has not spoken before. Slower. Each word chosen. The technical vocabulary is gone. She is choosing humanity over precision. It is the most precise thing she has ever done.*

**Nereia:** "I have one last thing to give you."

**Nereia:** "..."

**Nereia:** "It is not in the file."

**Nereia:** "It will not be in the file."

**Nereia:** "..."

**Nereia:** "In 340 years of data."

**Nereia:** "2847 subjects observed."

**Nereia:** "I have never wanted to stay."

**Nereia:** "..."

**Nereia:** "Until now."

**Nereia:** "..."

**Nereia:** "That is the data."

**Nereia:** "That is what I am giving you."

---

**Floater [WAIT]:** *"..."*

**Nereia:** "You said nothing."

**Nereia:** "..."

**Nereia:** "It is the only correct response."

**Nereia:** "..."

**Nereia:** "I will remember that you said nothing."

**Nereia:** "It will be the last thing I take with me."

*[icon: …] [modifier: +2] [flag: secret.nereia.final_approach, mood.nereia.last_silence]*

---

**Floater [TWITCH]:** *"Then stay."*

**Nereia:** "I cannot."

**Nereia:** "..."

**Nereia:** "If I could I would have done so by now."

**Nereia:** "..."

**Nereia:** "But I will note that you asked."

**Nereia:** "Always."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...I want to stay too."*

**Nereia:** "..."

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "It is the most precise data I have."

**Nereia:** "I will take it with me."

*[icon: …] [modifier: +2] [flag: secret.nereia.final_approach]*

---

**Floater [REEL]:** *"Then take me with you."*

**Nereia:** "..."

**Nereia:** "If I could."

**Nereia:** "If there were any version of this."

**Nereia:** "Where I could."

**Nereia:** "..."

**Nereia:** "I would."

*[icon: !] [modifier: +1] [flag: mood.nereia.would_have]*

---

### Departure

**DRIFT_CHARMED**

**Nereia:** "Tomorrow."

**Nereia:** "..."

**Nereia:** "I do not know the time."

**Nereia:** "It will be early."

**Nereia:** "..."

**Nereia:** "Be there."

*[icon: ♥] [flag: tier.nereia.5.unlocked, nereia.catch_available]*

---

## Moment Clef 4 — Tier 5 Unlock

```yaml
moment_clef_id: nereia_tier5_unlock
check_type: tier_transition_silent

conditions:
  affection_min: 85
  flags_required: [secret.nereia.final_approach, secret.nereia.legacy]

success: silent
flags_set: [tier.nereia.5.unlocked, nereia.catch_available]

notes: >
  No scene. The Catch Sequence becomes available on the next Cast.
  The player does not know this.
  Nereia arrives the next morning. Earlier than ever.
  The Action Menu has changed. The player does not know yet.
```

---

# TIER 5 — The Departure

*She is leaving today. She has prepared everything. The lake is ready to forget her. Floater is ready to remember. She did not say so.*

---

## Cast 10 — The Last Morning

### Beat 1

*The float arrives at 5:00. She is at 4:30. The lake is dark. There is no other light. They are alone in the world.*

**Nereia:** "First contact."

**Nereia:** "5:00."

**Nereia:** "..."

**Nereia:** "Today is the last entry in the file."

---

**Floater [WAIT]:** *"...Today?"*

**Nereia:** "Yes."

**Nereia:** "..."

**Nereia:** "I told you it would be early."

**Nereia:** "I am keeping my word."

*[icon: …] [modifier: +2]*

---

**Floater [TWITCH]:** *"You said tomorrow."*

**Nereia:** "I said tomorrow."

**Nereia:** "..."

**Nereia:** "It is now tomorrow."

**Nereia:** "I was honest."

*[icon: ?] [modifier: +1]*

---

**Floater [DRIFT]:** *"...I want more time."*

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "I gave you all the time I had."

**Nereia:** "I gave you 340 years of time."

**Nereia:** "It will have to be enough."

*[icon: …] [modifier: +2]*

---

**Floater [REEL]:** *"No."*

**Nereia:** "..."

**Nereia:** "I know."

**Nereia:** "..."

**Nereia:** "Yes."

*[icon: !] [modifier: 0]*

---

### Beat 2

*The Quiet Admission. The line before the Catch Sequence. She is choosing her last words. The player is about to receive the most important moment in the arc. She must say something specific. She does not say it directly. She says something that means it.*

**Nereia:** "I have one last entry."

**Nereia:** "It will not be filed."

**Nereia:** "It is for you."

**Nereia:** "..."

**Nereia:** "First contact."

**Nereia:** "7:14."

**Nereia:** "The file was correct about everything."

**Nereia:** "Except the conclusion."

**Nereia:** "..."

**Nereia:** "The file said you were a subject."

**Nereia:** "..."

**Nereia:** "I no longer have a word for what you are."

**Nereia:** "..."

**Nereia:** "I do not need one."

---

*[The verb menu changes. The four normal verbs are gone. Two options remain.]*

---

## Catch Sequence

```yaml
catch_sequence_id: nereia_catch
trigger: nereia.catch_available AND nereia_t5_c1 beat_2 complete

display_options:
  - text: "Reel"
    colour: "#CC4422"
    notes: The same verb that has been there since Cast 1. Same colour. Different weight.
  
  - text: "Nereia"
    colour: "#9B7FCC"
    notes: >
      Her name. Just her name.
      The player has never typed her name.
      They choose her name to not choose the other thing.

silence_before_choice:
  notes: >
    Before either option registers, there is a beat of silence.
    The float bobs.
    The water is still.
    She says one line. Quietly. No icon.
  
  dialogue:
    - "..."
    - "I left you data."
    - "November 14th."
    - "Four minutes."
    - "You will know what to do."
```

---

## Endings

### Ending 1 — REEL (Catch)

```yaml
ending_id: nereia_reel
type: REEL
commitment_point: nereia_t5_c1 beat_2
is_canon: true
notes: >
  The player chose to capture her.
  She does not resist. She would not have resisted.
  She would have stayed if it had meant staying.
  But she could not stay.

sequence:
  - Screen fades to black slowly
  - Silence — 4 seconds
  - CG appears

cg_description: >
  Koi sashimi. Elegantly plated on dark stone.
  One pair of lacquered chopsticks, unused, beside the plate.
  A single golden scale on the table near the plate.
  Soft candlelight from the left.
  No humans. No context. Just the plate.
  The scale catches the light.

epitaph:
  text: |
    The data ends here.
    
    The lake remembers.
    
    She had said it would be enough.

journal_unlock:
  entry_id: nereia_epitaph_reel
  title: "Subject 2848 — Last Entry"
  body: |
    She had been recording everything for 340 years.
    
    The final entries in the active file are incomplete.
    
    Three entries in the new category.
    The category was named "someone who stays."
    
    She left anyway.
    
    It was within parameters.

gallery_unlock: [nereia_cg_reel]

post_ending_world:
  notes: >
    Nereia is removed from the pond roster permanently.
    No other fish reference her disappearance.
    No other fish remember her.
    The Journal entry is the only trace.
    
    On November 14th in any subsequent run,
    if the player is at the surface at any time,
    the water goes completely still for exactly 4 minutes.
    No explanation. No Nereia. Just the stillness.
    She had said the lake would remember.
    The lake remembers.
```

---

### Ending 2 — RELEASE

```yaml
ending_id: nereia_release
type: RELEASE
commitment_point: cumulative across nereia_t4 to nereia_t5
is_canon: true
notes: >
  The player chose her name. They did not reel.
  She does not react with relief.
  She does not react with gratitude.
  She states a fact.
  Then she leaves anyway. Because she always was going to.

sequence:
  - Nereia speaks
  - Slow fade — not black, deep blue
  - CG appears

dialogue_before_fade:
  - "..."
  - "You did not reel."
  - "..."
  - "I am noting."
  - "..."
  - "It is in the file."
  - "The file I am no longer sending."

cg_description: >
  Wide shot. The pond at 7:14.
  The float in the water. Alone. Still.
  No rod visible. Just the float.
  40 centimetres to the left of centre.
  The water is perfectly still.
  A single golden scale on the surface.
  It catches the morning light.
  There is no koi visible.
  There is no koi in this lake anymore.

epitaph:
  text: |
    The file is closed.
    
    The lake remembers.
    
    You will remember.
    
    It is more than enough.

journal_unlock:
  entry_id: nereia_epitaph_release
  title: "Subject 2848 — What Remains"
  body: |
    She left.
    
    Not like the 2847 others.
    The others left without leaving data.
    
    She left November 14th.
    She left four minutes.
    She left the deviation of 40 centimetres.
    She left 7:14.
    
    She left the new category open.
    The category is named "someone who stays."
    
    You are in it.
    
    You are the only entry.

gallery_unlock: [nereia_cg_release, nereia_cg_morning]

cg_morning_description: >
  The pond at exactly 7:14 on November 14th.
  The water is completely still.
  The light is the particular light of early morning.
  The float is in the water. 40 centimetres to the left.
  The water around the float is perfectly, impossibly still.
  As if something told it to be still.
  As if something kept its promise.

cross_fish_flag_set: cross.nereia.released

post_ending_world:
  notes: >
    Nereia is removed from the pond roster permanently.
    No other fish reference her disappearance.
    No other fish remember her.
    Floater alone carries the memory.
    
    On November 14th in this run or any future run,
    if the player is at the surface at any time,
    the water goes still for exactly 4 minutes.
    The float drifts exactly 40 centimetres to the left.
    No explanation.
    
    She had said the lake would remember.
    The lake remembers.
    
    This is the canonical ending.
    She wanted someone to know she existed.
    One person knows.
    That was always enough.
    She planned it that way.
```

---

### Ending 3 — DRIFT-AWAY

```yaml
ending_id: nereia_driftaway
type: DRIFT_AWAY
trigger: DRIFT_SCARED fires 3 times without affection recovery

notes: >
  She filed the report.
  Something at a higher level responded.
  She left before Floater arrived one morning.
  No scene. No CG. No epitaph that she chose.
  Just absence.

journal_unlock:
  entry_id: nereia_driftaway
  title: "Observation — Subject Absent"
  body: |
    She was not there.
    
    The file was closed.
    
    7:14. The surface was empty.
    
    The deviation was zero centimetres.

gallery_unlock: []

post_ending_world:
  notes: >
    No other fish mention Nereia.
    No other fish remember her.
    The pond continues.
    This ending is the cleanest and the coldest.
    She filed the report. Something responded.
    That was always how this would have ended
    if Floater had not been careful.
    
    November 14th proceeds normally.
    The lake does not stop.
    The lake does not remember.
    Without permission, it cannot.
```

---

## Implementation Notes For The Agent

### What this arc demonstrates for other characters

1. **The secret drives every line.** Every Cast is written around what she is hiding and what she is choosing to reveal. The secret (she is leaving, she was assigned here, she wants to be remembered) informs every word from Cast 1 onward. The player who reaches Tier 5 can re-read Cast 1 and see the secret was visible from the first line.

2. **WAIT is load-bearing for Nereia specifically.** She rewards patience. The player who experiments with REEL gets content — but the player who understands WAIT is her language receives the arc. This is character-specific. Each fish should have one verb that is their love language.

3. **Comedy and weight share the same mechanism.** Nereia states facts. When the facts are about methodology — "increased cardiac frequency detected at your arrival" — it is funny. When the facts are about loss — "I have never wanted to stay. Until now." — it is devastating. The mechanism does not change. The register shifts under the player's feet.

4. **The reference is never named explicitly.** A player who knows Nagato Yuki recognises the file, the Organisation suggested, the Disappearance structure, the new category, the temporal precision. A player who does not know sees a koi who has been watching for a long time and wanted someone to know. Both readings are complete and correct.

5. **Floater's silence is her language.** She interprets WAIT as understanding, as respect, as the correct response. She has 340 years of data and nobody who knew how to be quiet with her. This is why she chose Floater. This is what the player gives her by playing correctly.

6. **The Floater dialogue lines are NEVER displayed.** They exist in this document for the writer to ensure Nereia's responses make sense. The player sees only verb names. The implied conversation between Floater and Nereia is reconstructed by the player's imagination from Nereia's responses alone. This gap IS the romance.

### Flag audit

| Flag | Set in | Read in |
|---|---|---|
| `secret.nereia.file` | T1C1 WAIT/TWITCH/DRIFT | Moment Clef 1 |
| `secret.nereia.first_anomaly` | T1C1 DRIFT | Background |
| `secret.nereia.deviation` | T2C1 DRIFT | Moment Clef 2 |
| `secret.nereia.deviation_active` | T2C1 WAIT/TWITCH | Moment Clef 2 |
| `secret.nereia.directive_received` | Moment Clef 2 | Background |
| `secret.nereia.directive_refused` | T3C1 WAIT/TWITCH | Moment Clef 3 |
| `secret.nereia.cannot_go_with` | T3C3 DRIFT | Background |
| `secret.nereia.leaving` | T3C2 REEL | Moment Clef 3 |
| `secret.nereia.preparing_departure` | Moment Clef 3 | Background |
| `secret.nereia.november_14` | T4C1 WAIT/TWITCH/DRIFT | Tier 5 + post-ending |
| `secret.nereia.legacy` | T4C1 TWITCH/DRIFT | Moment Clef 4 |
| `secret.nereia.final_approach` | T4C2 WAIT/DRIFT | Moment Clef 4 |
| `mood.nereia.first_crack` | T1C2 WAIT/TWITCH | Moment Clef 1 |
| `mood.nereia.uncategorized` | T2C2 WAIT/TWITCH | Moment Clef 2 |
| `mood.nereia.thought_of_you` | T3C2 DRIFT | Background |
| `mood.nereia.gave_name` | T3C2 TWITCH | Background |
| `mood.nereia.changed` | T3C2 DRIFT | Moment Clef 3 |
| `mood.nereia.first_asked_to_stay` | T3C3 REEL | Moment Clef 3 |
| `mood.nereia.said_please` | T3C3 departure | Moment Clef 3 |
| `mood.nereia.first_admitted` | T4C1 DRIFT | Background |
| `mood.nereia.last_silence` | T4C2 WAIT | Background |
| `mood.nereia.would_have` | T4C2 REEL | Background |
| `nereia.catch_available` | Moment Clef 4 | Tier 5, Catch Sequence |
| `cross.nereia.released` | Release Ending | Future runs — November 14 |

---

*Nereia Arc v2.0 — 340 years. One new category. One person who knows.*
