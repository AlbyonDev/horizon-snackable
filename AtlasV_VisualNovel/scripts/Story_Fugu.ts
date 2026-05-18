/**
 * Story_Fugu — Fugu's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   fugu_t<tier>_c<cast>_b<beat>
 *
 * Character voice: Short energetic bursts, repetitions, self-interruptions,
 * sudden silences when loneliness surfaces. Signature phrase: "Trust me!"
 *
 * Engine integration notes:
 *   - `from.fugu.<recipeId>` one-shot signals are set by the encounter
 *     system and auto-cleared by the engine after fugu_entry dispatch.
 *   - `mood.fugu.last_drift` is a synthetic string flag set by the engine
 *     from the fish's departure drift, used for bridge dialogues.
 *   - `-> END` triggers the visual departure fade directly; goodbye lines
 *     belong inside the terminal choice's response (Ink Authoring Guide §4.4).
 *
 * Intent format (Guide §1.2): cold meta-verb categories, 1–3 words, no
 * adverbs. The emotion lives in the fish's reaction, not in the tooltip.
 *   WAIT   → Hold space. / Observe. / Listen. / Let him vent.
 *   TWITCH → Tease. / Nudge. / Prompt. / Match energy. / Break the ice.
 *   DRIFT  → Comfort. / Empathize. / Reassure. / Validate. / Yield.
 *   REEL   → Push back. / Ground him. / Confront. / Set boundary. / Take charge.
 *
 * Delta calibration:
 *   +5  emotional breakthrough, vulnerability accepted
 *   +4  real opening, significant moment
 *   +3  sincere positive, marked interest
 *   +2  slightly positive
 *   +1  neutral-positive
 *    0  deflection
 *   -2  mild rejection
 *   -5  harsh rejection, fear triggered
 */

export const FUGU_STORY: string = `
// ============================================================
// STORY_FUGU — REWRITTEN FOR PURE AGENCY & INVISIBLE DIALOGUE
// ============================================================

=== fugu_entry ===
{ from.fugu.climaxT5 :
    { quest.fugu.t5_c9_done :
        -> fugu_t5_c10_b1
    - else :
        -> fugu_t5_c9_b1
    }
- from.fugu.parkT4 :
    { quest.fugu.t4_c7_done :
        -> fugu_t4_c8_b1
    - else :
        -> fugu_t4_c7_b1
    }
- from.fugu.spinnerT3 :
    { quest.fugu.t3_c5_done :
        -> fugu_t3_c6_b1
    - else :
        -> fugu_t3_c5_b1
    }
- from.fugu.nightT2 :
    { quest.fugu.t2_c3_done :
        -> fugu_t2_c4_b1
    - else :
        -> fugu_t2_c3_b1
    }
- from.fugu.home :
    { quest.fugu.t1_done :
        -> fugu_loop
    - met.fugu :
        -> fugu_t1_c2_b1
    - else :
        -> fugu_t1_c1_b1
    }
- from.fugu.homeNight :
    { quest.fugu.t1_done :
        -> fugu_loop
    - met.fugu :
        -> fugu_t1_c2_b1
    - else :
        -> fugu_t1_c1_b1
    }
- else :
    -> fugu_t1_c1_b1
}

// ============================================================
// FAIL-SAFE LOOP — reached when home is somehow still active after T1.
// Should never happen with correct recipe disabling; if it does, give the
// player a beat of flavor instead of replaying T1 c2.
// ============================================================

=== fugu_loop ===
*Fugu is already in the middle of something.*
*Talking to a rock. Practicing a speech. Pacing in tight circles.*
-> END

// ============================================================
// TIER 1 — UNAWARE: The desperate need to be seen
// ============================================================

=== fugu_t1_c1_b1 ===
Hey! HEY! You're talking to me?!
For real? You actually stopped to say hi?
Nobody ever stops! Never!
I'm Fugu!
Please tell me you're not lost. Please say you're staying!

* [WAIT] Observe. #delta:3 #icon:warmth #drift:CHARMED #flag:met.fugu #flag:fact.fugu.appearance #flag:fact.fugu.puffs
    You're... you're not much of a talker, are you?
    Just staring at me.
    Nobody has ever just stood here and listened. They usually walk away mid-sentence.
    Thank you. Really. Trust me!
    -> fugu_t1_c1_b2

* [TWITCH] Greet. #delta:5 #icon:delight #drift:CHARMED #flag:met.fugu #flag:fact.fugu.appearance #flag:fact.fugu.puffs
    Nice to meet you too!
    Whoa, we are so in sync already! I feel it!
    Wait, my heart is beating so fast I'm gonna... *puffs up with excitement*
    Oops! Sorry! I puff up when I get too excited.
    But I'm just so glad you're here, trust me!
    -> fugu_t1_c1_b2

* [DRIFT] Reassure. #delta:1 #icon:hesitation #drift:WARM #flag:met.fugu #flag:fact.fugu.appearance #flag:fact.fugu.puffs
    You're staying?! For real?!
    Wow. You have a really calming presence.
    Usually, everything is a rush. Because people want to leave.
    I'll try to slow down.
    -> fugu_t1_c1_b2

* [REEL] Interrupt. #delta:-2 #icon:shock #drift:SCARED #flag:met.fugu #flag:fact.fugu.appearance #flag:fact.fugu.puffs
    What do you mean I'm "too loud"?!
    I'm not loud! I'm just... existing!
    You don't have to snap at me... I just get overly excited.
    *deflates slightly*
    -> fugu_t1_c1_b2

=== fugu_t1_c1_b2 ===
...
Sorry. I talk too much. I know I do.
It's just... the silence in this neighborhood gets so heavy.
So I fill it. All by myself.
...
But you're still standing there. That's... nice.

* [WAIT] Stay. #delta:3 #icon:contentment #drift:CHARMED #flag:fact.fugu.talks
    You really don't mind the quiet?
    ...
    That's actually really restful. Having someone just *be* here.
    Thank you.
    -> END

* [TWITCH] Ask. #delta:2 #icon:curiosity #drift:WARM #flag:fact.fugu.talks
    My day?! You want to know about MY day?!
    Well, I walked down to the lower streets and found a rock that looked like a crab!
    I can show you tomorrow! If... if you come back.
    -> END

* [DRIFT] Validate. #delta:1 #icon:hesitation #drift:INTRIGUED #flag:fact.fugu.talks
    I don't have to talk to be heard?
    ...
    That's... a really beautiful thing to say.
    I'll think about that.
    -> END

* [REEL] Warn. #delta:-2 #icon:sadness #drift:WARY #flag:fact.fugu.talks
    Right. Right, of course. I need to take a breath.
    I'm suffocating you with words.
    I'm toxic like that. Trust me, it's for the best if I shut up.
    -> END

=== fugu_t1_c2_b1 ===
{ mood.fugu.last_drift == "WARY" :
    You... you came back?
    Even after I exhausted you yesterday?
- mood.fugu.last_drift == "SCARED" :
    Oh. It's you.
    I promise I won't yell this time. Don't be mad.
- else :
    YOU CAME BACK!!!
    I... I paced around my place all night hoping you would!
}
...
Wait. Breathe, Fugu.
I practiced saying a normal "Hi" all morning.
Hi. I'm not very good at this.

* [WAIT] Wait. #delta:3 #icon:warmth #drift:CHARMED
    You're just giving me time. Without judging.
    Nobody does that.
    -> fugu_t1_c2_b2

* [TWITCH] Joke. #delta:4 #icon:delight #drift:CHARMED
    Hey! "Hi" is a very hard word when your brain is going a million miles an hour!
    But you laughed! A real laugh!
    Trust me, I'm gonna make you laugh every day!
    -> fugu_t1_c2_b2

* [DRIFT] Comfort. #delta:2 #icon:contentment #drift:WARM
    It was a perfect hi?
    ... Really?
    Wow. You know exactly what to say to make my spikes lay flat.
    -> fugu_t1_c2_b2

* [REEL] Push. #delta:-3 #icon:shock #drift:SCARED
    Act natural?
    I don't know what natural IS! This IS my natural!
    Why does everyone always want me to act like someone else...
    -> fugu_t1_c2_b2

=== fugu_t1_c2_b2 ===
You know... I counted.
You're the second person who ever came back to see me twice.
The first was a snail. His name was Slowpoke.
We used to go for long walks together.
...
He died. Of old age, though!
Not... not because of my poison.
... Probably not because of my poison.

* [WAIT] Listen. #delta:3 #icon:warmth #drift:CHARMED #flag:quest.fugu.t1_done #flag:recipe.fugu.nightT2 #disable-flag:recipe.fugu.home #disable-flag:recipe.fugu.homeNight
    You didn't even flinch when I said the word "poison".
    That's... new. Nobody ever reacts like that.
    Listen... it gets really crowded here during the day.
    Could you... come back tonight? Please? It's quieter.
    -> END

* [TWITCH] Tease. #delta:3 #icon:curiosity #drift:WARM #flag:quest.fugu.t1_done #flag:recipe.fugu.nightT2 #disable-flag:recipe.fugu.home #disable-flag:recipe.fugu.homeNight
    Haha! Yeah, I guess Slowpoke wasn't exactly a fast walker!
    But you... you're way better than Slowpoke. Trust me!
    Hey, come back tonight? The streetlights make this place look cool.
    -> END

* [DRIFT] Reassure. #delta:4 #icon:hesitation #drift:WARM #flag:quest.fugu.t1_done #flag:recipe.fugu.nightT2 #disable-flag:recipe.fugu.home #disable-flag:recipe.fugu.homeNight
    You really think it wasn't my fault?
    ...
    I've told myself that a thousand times. Hearing you say it makes it feel real.
    I want to talk more. But not with all these people around.
    Meet me here tonight?
    -> END

* [REEL] Confront. #delta:-4 #icon:sadness #drift:WARY #flag:quest.fugu.t1_done #flag:recipe.fugu.nightT2 #disable-flag:recipe.fugu.home #disable-flag:recipe.fugu.homeNight
    Am I dangerous?
    ... Yes. Very.
    I shouldn't have brought it up. I'm sorry.
    If you're not too scared... come back tonight. I can explain.
    -> END

// ============================================================
// TIER 2 — CURIOUS: The weight of the poison
// ============================================================

=== fugu_t2_c3_b1 ===
{ mood.fugu.last_drift == "WARY" :
    You actually came tonight. Even after what I said about being dangerous.
- else :
    You came! The night breeze is nice, right?
}
...
You know you're weird?
No! Not mean weird! Good weird!
Like... you're not scared of me.
Look.
*extends an arm*
See these? If I get stressed, my spikes come out. With poison.
A lot of poison.

* [WAIT] Stand. #delta:4 #icon:warmth #drift:CHARMED #flag:fact.fugu.toxic
    You're not going anywhere.
    I showed you my worst side and you stayed.
    The folks in my old neighborhood... they used to run across the street when they saw me.
    Why do you stay?
    -> fugu_t2_c3_b2

* [TWITCH] Probe. #delta:3 #icon:curiosity #drift:WARM #flag:fact.fugu.toxic
    It doesn't hurt me. If that's what you're asking.
    But it hurts everyone else.
    Wait, I can puff up more! *POOF*
    Tadaaaa! See?! I'm like a toxic balloon!
    -> fugu_t2_c3_b2

* [DRIFT] Yield. #delta:-1 #icon:sadness #drift:WARY #flag:fact.fugu.toxic
    Yeah. I get it. That's a lot to take in.
    That's normal. I understand.
    It's toxic. People are right to cross the street.
    -> fugu_t2_c3_b2

* [REEL] Step back. #delta:-3 #icon:shock #drift:SCARED #flag:fact.fugu.toxic
    HEY! I TOLD YOU I CAN'T ALWAYS CONTROL IT!
    ...
    ...please back off. I don't wanna hurt you.
    -> fugu_t2_c3_b2

=== fugu_t2_c3_b2 ===
...
When I was little...
...no, forget it.
...
Ok. I'll say it. Because you're staying.
My family packed their bags and left me behind.
They moved to the deep side of town.
When my toxins got too strong, they said I was a curse.

* [WAIT] Listen. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.fugu.t2_c3_done
    You're just letting me talk.
    Nobody does that. They usually look at their watches and make an excuse to leave.
    But you... you're still here.
    That's enough. Trust me.
    -> END

* [TWITCH] Joke. #delta:2 #icon:hesitation #drift:WARM #flag:quest.fugu.t2_c3_done
    Their loss?
    Haha... yeah. I guess.
    I survived! See? I'm standing right here!
    Strong as a rock! Trust me!
    -> END

* [DRIFT] Empathize. #delta:4 #icon:sadness #drift:OPENED #flag:quest.fugu.t2_c3_done
    Terrifying is the exact word. Yeah.
    I didn't even know how to unlock the front door back then.
    Thank you for understanding.
    -> END

* [REEL] Judge. #delta:-3 #icon:shock #drift:SCARED #flag:quest.fugu.t2_c3_done
    Go after them?
    Stop! I puff up when I'm scared!
    I couldn't! I was a kid, and I was dangerous!
    That's why they left! All of them!
    -> END

=== fugu_t2_c4_b1 ===
{ mood.fugu.last_drift == "SCARED" :
    I'm calm today. I promise. No sudden spikes.
- else :
    Hey. I thought of something last night.
}
...
If I concentrate really, really hard...
I can keep my spikes in. Even when I'm happy.
Look! I'm happy right now. And nothing's coming out!
...ok maybe one. But just one!

* [WAIT] Encourage. #delta:3 #icon:warmth #drift:CHARMED
    I will! See? I'm getting better!
    For you. So you'll keep hanging out with me.
    It's the first time I've had a reason to practice.
    -> fugu_t2_c4_b2

* [TWITCH] Cheer. #delta:4 #icon:delight #drift:CHARMED
    THANK YOU!
    I paced around my living room all night trying to get it right!
    For you! Because you come back!
    -> fugu_t2_c4_b2

* [DRIFT] Praise. #delta:2 #icon:hesitation #drift:WARM
    You're proud of me?
    ...
    I worked so hard... and hearing you say that...
    It means everything.
    -> fugu_t2_c4_b2

* [REEL] Warn. #delta:-2 #icon:shock #drift:SCARED
    Still too dangerous?
    NO! *POOF — puffs up in panic*
    See?! See what happens when you doubt me?!
    The second someone pushes me, I lose control!
    -> fugu_t2_c4_b2

=== fugu_t2_c4_b2 ===
You know what's weird? Nighttime. When I'm alone in my apartment.
I talk to the furniture.
I know the chairs don't answer. I'm not stupid.
But the silence... the silence is too heavy. So I fill it.
Except now. With you, I don't need to fill it as much.

* [WAIT] Observe. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.fugu.t2_done #flag:recipe.fugu.spinnerT3 #disable-flag:recipe.fugu.nightT2
    The silence is nice, isn't it?
    See? It doesn't hurt right now.
    Listen... you know what I'd love?
    That red keychain you have. It's so shiny.
    Could you bring it next time? It would make my day.
    -> END

* [TWITCH] Tease. #delta:2 #icon:curiosity #drift:WARM #flag:quest.fugu.t2_done #flag:recipe.fugu.spinnerT3 #disable-flag:recipe.fugu.nightT2
    A name for the chair?
    Haha! No, it's just a chair! I'm not completely crazy!
    But hey... I am crazy about that red keychain you have.
    Bring it tomorrow night? Please?
    -> END

* [DRIFT] Comfort. #delta:3 #icon:contentment #drift:WARM #flag:quest.fugu.t2_done #flag:recipe.fugu.spinnerT3 #disable-flag:recipe.fugu.nightT2
    I really hope you mean that. That I don't have to be alone anymore.
    If you do... bring that red keychain next time.
    It'll be our little secret signal.
    -> END

* [REEL] Diagnose. #delta:-2 #icon:sadness #drift:WARY #flag:quest.fugu.t2_done #flag:recipe.fugu.spinnerT3 #disable-flag:recipe.fugu.nightT2
    Unhealthy?
    ... I just told you something vulnerable and you...
    Forget what I said.
    Just... bring that red keychain next time, okay? If you even care.
    -> END

// ============================================================
// TIER 3 — FAMILIAR: The imaginary friends
// ============================================================

=== fugu_t3_c5_b1 ===
{ mood.fugu.last_drift == "WARY" :
    You brought the red keychain. Even after I got defensive.
- else :
    You brought the keychain! It's so beautiful...
}
...
I'm gonna tell you something. A real thing. Not a joke.
When I was little. After my family left.
I invented friends. Three of them.
Bizu, Plop, and Big Algae.
I talked to them every day. For a long time.

* [WAIT] Listen. #delta:4 #icon:warmth #drift:CHARMED #flag:fact.fugu.alone
    You're not judging me.
    Usually, when I tell people that, they give me this look of pity.
    But you just want me to keep going.
    That's the best gift anyone's ever given me. Trust me.
    -> fugu_t3_c5_b2

* [TWITCH] Ask. #delta:3 #icon:curiosity #drift:WARM #flag:fact.fugu.alone
    What were they like?!
    Bizu was the brave one! Plop was the quiet listener... kinda like you!
    And Big Algae... she was just tall.
    It's pathetic, right?
    -> fugu_t3_c5_b2

* [DRIFT] Validate. #delta:5 #icon:sadness #drift:OPENED #flag:fact.fugu.alone
    I did what I had to do to survive?
    *sniffles*
    Nobody has ever understood it like that.
    You make me feel... less broken.
    -> fugu_t3_c5_b2

* [REEL] Judge. #delta:-3 #icon:shock #drift:SCARED #flag:fact.fugu.alone
    Grow up?
    *puffs up defensively*
    I DID grow up! I survived on my own!
    You don't know what it was like!
    -> fugu_t3_c5_b2

=== fugu_t3_c5_b2 ===
The day I stopped talking to them...
That's the day I realized they weren't real.
It took a while. I felt so stupid. And so alone.
...
But now... you're real. Right?
Tell me you're real.

* [WAIT] Stand. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.fugu.t3_c5_done
    You're right here. I know.
    ...
    I think I'm gonna cry. Just a little.
    It's happiness, trust me.
    -> END

* [TWITCH] Joke. #delta:3 #icon:delight #drift:CHARMED #flag:quest.fugu.t3_c5_done
    Pinch you?
    Haha! Hey! Yes, I feel that!
    Imaginary friends definitely can't joke like that!
    Okay. You're real.
    -> END

* [DRIFT] Promise. #delta:4 #icon:contentment #drift:WARM #flag:quest.fugu.t3_c5_done
    You're not leaving.
    ...
    I'm going to hold onto those words. Forever.
    -> END

* [REEL] Dismiss. #delta:-4 #icon:sadness #drift:WARY #flag:quest.fugu.t3_c5_done
    Dramatic?
    Right. Sorry.
    I guess asking for reassurance is asking too much.
    -> END

=== fugu_t3_c6_b1 ===
{ mood.fugu.last_drift == "WARY" :
    Look, I know I was needy last time. I'm sorry.
- else :
    Hey... I have a question. A real question.
}
...
Are you scared of me?
It's ok if yes. I'd understand.
My spikes. The poison. The fact that I puff up when I'm stressed.
Everyone who walks past me on the street is scared.
What about you?

* [WAIT] Deny. #delta:4 #icon:warmth #drift:CHARMED
    No?
    ...
    I spent my entire life trying to make myself small. Hiding in alleys.
    And you're still here. Even knowing everything.
    That's... huge. Trust me.
    -> fugu_t3_c6_b2

* [TWITCH] Tease. #delta:3 #icon:curiosity #drift:WARM
    Scary? Me?
    Aha! Playing tough?!
    No, sorry. You ARE tough. Because you're talking to me, of all people.
    You're either very brave or very stupid. I like both.
    -> fugu_t3_c6_b2

* [DRIFT] Confess. #delta:-1 #icon:sadness #drift:WARY
    A little bit.
    That's an honest answer.
    I understand. I really do.
    -> fugu_t3_c6_b2

* [REEL] Confirm. #delta:-4 #icon:shock #drift:SCARED
    A liability.
    SEE! You see!
    You're just like the rest of them!
    Being scared is human... but calling me a liability... that hurts.
    -> fugu_t3_c6_b2

=== fugu_t3_c6_b2 ===
Sometimes I wonder... if I'm a monster.
Not like an evil monster. Just...
Something that hurts people without meaning to.
That can't be touched. That can't be close.
That's what a monster is right? Hurting just by existing?

* [WAIT] Reassure. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.fugu.t3_done #flag:recipe.fugu.parkT4 #disable-flag:recipe.fugu.spinnerT3
    That's the most beautiful "no" I've ever heard.
    Listen... I'm tired of the dark.
    Let's meet tomorrow during the day. I want to stand in the sun with you.
    -> END

* [TWITCH] Joke. #delta:3 #icon:curiosity #drift:WARM #flag:quest.fugu.t3_done #flag:recipe.fugu.parkT4 #disable-flag:recipe.fugu.spinnerT3
    Monsters don't talk to chairs.
    Haha! Okay, fair point!
    Thanks for reminding me how ridiculous I am.
    Hey, come see me tomorrow during the day? The sun feels nice right now.
    -> END

* [DRIFT] Empathize. #delta:0 #icon:hesitation #drift:TROUBLED #flag:quest.fugu.t3_done #flag:recipe.fugu.parkT4 #disable-flag:recipe.fugu.spinnerT3
    We all hurt people sometimes. That's true.
    There's no perfect answer.
    I ask myself every day anyway.
    Meet me during the day tomorrow. I need to see things clearly.
    -> END

* [REEL] Confront. #delta:-3 #icon:shock #drift:SCARED #flag:quest.fugu.t3_done #flag:recipe.fugu.parkT4 #disable-flag:recipe.fugu.spinnerT3
    A pity party.
    ...
    Maybe you're right. Maybe I am just throwing a pity party.
    Come back tomorrow during the day. Let's see if the daylight makes me less miserable.
    -> END

// ============================================================
// TIER 4 — TRUSTING: "I can be myself"
// ============================================================

=== fugu_t4_c7_b1 ===
{ mood.fugu.last_drift == "SCARED" :
    Daylight. Okay. I'm not throwing a pity party today.
- else :
    The sun is so warm today.
}
...
...
...
...

* [WAIT] Share. #delta:5 #icon:warmth #drift:CHARMED
    You feel it too, right?
    We're being silent. Together.
    Usually silence is when I'm alone in my room. And it hurts.
    But right now... it's soft.
    Is this what friendship is?
    -> fugu_t4_c7_b2

* [TWITCH] Poke. #delta:2 #icon:curiosity #drift:WARM
    Oh! Sorry! I was trying to... say nothing.
    It's an exercise. Being silent. Not from loneliness, but by choice.
    It's hard. But with you it's... possible.
    -> fugu_t4_c7_b2

* [DRIFT] Relax. #delta:4 #icon:contentment #drift:CHARMED
    Peaceful. Yeah. It really is.
    I've never felt peace like this. Never.
    -> fugu_t4_c7_b2

* [REEL] Demand. #delta:-2 #icon:sadness #drift:WARY
    Pushing me to speak?
    I was being vulnerable there! Silence is my armor off!
    And you pick this moment to push me... no.
    -> fugu_t4_c7_b2

=== fugu_t4_c7_b2 ===
I'm gonna tell you something. The biggest secret.
I control my spikes now. Completely.
I've been training for days.
So I could...
*steps closer, arms open*
So I could do this. Without danger.
For the first time in my life.

* [WAIT] Trust. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.fugu.t4_c7_done
    You trust me.
    You understand what this means?
    It means someone could... theoretically... give me a hug.
    Without risk.
    Trust me.
    -> END

* [TWITCH] High-five. #delta:3 #icon:delight #drift:CHARMED #flag:quest.fugu.t4_c7_done
    A high-five?!
    REALLY?!
    *concentrates very hard and slaps your hand*
    SEE?! Nothing! No spikes!
    *tears of joy*
    -> END

* [DRIFT] Praise. #delta:3 #icon:hesitation #drift:WARM #flag:quest.fugu.t4_c7_done
    Incredible.
    The fact that I learned... that's already a victory for me.
    But sharing it with you... makes it real.
    -> END

* [REEL] Reject. #delta:-2 #icon:sadness #drift:WARY #flag:quest.fugu.t4_c7_done
    Too close?
    No! Not like that!
    I did all this so I could CHOOSE to be safe.
    You still don't trust me.
    -> END

=== fugu_t4_c8_b1 ===
{ mood.fugu.last_drift == "WARY" :
    I'm keeping my distance today. I promise.
- else :
    Hey. I wanted to tell you something. Seriously.
}
...
No joke. No crazy energy. Just the true thing.
You're my friend.
My first friend.
Not a snail. Not a chair. Not an imaginary voice.
A real one. You.

* [WAIT] Accept. #delta:5 #icon:warmth #drift:CHARMED
    You accept it.
    ...
    It took my whole life to say that to someone.
    -> fugu_t4_c8_b2

* [TWITCH] Celebrate. #delta:4 #icon:delight #drift:CHARMED
    Best friends?!
    Ha! You're matching my joy dance, aren't you?!
    FRIENDS! We're FRIENDS! Trust me!
    -> fugu_t4_c8_b2

* [DRIFT] Slow. #delta:-1 #icon:sadness #drift:TROUBLED
    Rush things?
    I just said the most important thing of my life and you...
    No. It's ok. People pull away when it's too much.
    -> fugu_t4_c8_b2

* [REEL] Correct. #delta:-3 #icon:shock #drift:SCARED
    Don't call you that.
    ...that's not how friendship works.
    You're right. I'm sorry I assumed.
    -> fugu_t4_c8_b2

=== fugu_t4_c8_b2 ===
I have a dream.
It's silly. It's a little kid's dream.
I want a friend who stays. Even knowing everything.
Who walks with me anyway. And comes back the next day.
You do that. You do exactly that.
Trust me. It's more than I deserve.

* [WAIT] Promise. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.fugu.t4_done #flag:recipe.fugu.climaxT5 #disable-flag:recipe.fugu.parkT4 #flag:fact.fugu.dream
    You're here.
    *wipes a tear from his cheek*
    Listen. Tomorrow is a big day for me.
    Bring that feather charm you carry. It means something big.
    Meet me here. Please.
    -> END

* [TWITCH] Tease. #delta:3 #icon:delight #drift:CHARMED #flag:quest.fugu.t4_done #flag:recipe.fugu.climaxT5 #disable-flag:recipe.fugu.parkT4 #flag:fact.fugu.dream
    Two million friends?
    NO! I just need one! You!
    Hey, tomorrow... bring that feather charm.
    I want to show you something. Trust me.
    -> END

* [DRIFT] Comfort. #delta:3 #icon:hesitation #drift:WARM #flag:quest.fugu.t4_done #flag:recipe.fugu.climaxT5 #disable-flag:recipe.fugu.parkT4 #flag:fact.fugu.dream
    You'll always come back.
    Tell me you'll come back tomorrow. With the feather charm.
    It's important. It's the final piece.
    -> END

* [REEL] Warn. #delta:-2 #icon:sadness #drift:WARY #flag:quest.fugu.t4_done #flag:recipe.fugu.climaxT5 #disable-flag:recipe.fugu.parkT4 #flag:fact.fugu.dream
    Pedestal?
    I give you everything and you push me away.
    Think about it. If you actually care... bring the feather charm tomorrow.
    -> END

// ============================================================
// TIER 5 — BONDED: The Climax (Requires Feather Charm)
// ============================================================

=== fugu_t5_c9_b1 ===
{ mood.fugu.last_drift == "WARY" :
    You brought the feather charm. You actually brought it.
- else :
    The feather charm. It's beautiful.
}
...
I counted. You've walked over here to see me... a lot of times.
And every time, the morning before you arrive... my heart beats faster.
Not from fear.
From... hope. For the first time in my life.

* [WAIT] Observe. #delta:4 #icon:warmth #drift:CHARMED
    Hope is good.
    Do you know what it feels like to hope after a whole life without it?
    It's terrifying. And beautiful.
    You gave me that.
    -> fugu_t5_c9_b2

* [TWITCH] Match. #delta:3 #icon:delight #drift:CHARMED
    Your heart too?
    Ha! My heart's doing the thing again! Right now!
    Don't panic! It's JOY! Just joy!
    -> fugu_t5_c9_b2

* [DRIFT] Smile. #delta:0 #icon:hesitation #drift:NEUTRAL
    You're glad.
    You always come back. I know that now.
    I trust you.
    -> fugu_t5_c9_b2

* [REEL] Deflect. #delta:-2 #icon:sadness #drift:WARY
    Not get overly emotional?
    Not now. Not when I'm like this. Open.
    Please.
    -> fugu_t5_c9_b2

=== fugu_t5_c9_b2 ===
Fugu isn't my real name.
My real name is the one my family gave me. Before they packed up.
But Fugu is the name I chose for myself.
Because it's what I am. A pufferfish. Dangerous on the outside.
But on the inside... just someone who wants to be loved.
There. Now you know everything. Absolutely everything.

* [WAIT] Accept. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.fugu.t5_c9_done
    Thank me?
    No... thank YOU.
    For every visit. Every silence. Every walk.
    You're the best thing that ever happened to me. Trust me.
    -> END

* [TWITCH] Joke. #delta:3 #icon:delight #drift:CHARMED #flag:quest.fugu.t5_c9_done
    A softie?
    Haha! We're both ridiculous!
    I love being ridiculous with you.
    -> END

* [DRIFT] Nod. #delta:0 #icon:hesitation #drift:NEUTRAL #flag:quest.fugu.t5_c9_done
    You know.
    I know you do.
    See you next time. For the last step.
    -> END

* [REEL] Step. #delta:-2 #icon:sadness #drift:WARY #flag:quest.fugu.t5_c9_done
    A lot to process.
    Now you know everything.
    At least be honest with yourself about what you're doing.
    -> END

=== fugu_t5_c10_b1 ===
...
You're here.
Today is... different. I can feel it.
You brought the feather charm. We both know what that means.
If you take me with you... I'll be by your side forever.
That's what I want, trust me!
But... if you walk away... I'll walk away knowing I had a true friend.
So... what do you choose?

* [WAIT] Hesitate. #delta:3 #icon:warmth #drift:CHARMED #flag:fugu.release_ready
    You need a moment.
    Yeah. It's a big choice.
    Whatever you decide... it was good. All of it.
    Trust me.
    -> END

* [TWITCH] Tease. #delta:2 #icon:curiosity #drift:WARM #flag:fugu.release_ready
    Guess?
    Even now. Even at the end, you're playing with me.
    That's why you're my best friend.
    -> END

* [DRIFT] Leave. #delta:1 #icon:hesitation #drift:WARM #flag:fugu.release_ready
    You have to go.
    ...
    That's... that's your answer?
    ...ok. I'll never forget you.
    -> END

* [REEL] Choose. #delta:0 #icon:surprise #drift:CHARMED #flag:fugu.catch_available
    You're taking me with you.
    You're choosing me.
    Ok.
    I'm ready. Let's go home.
    -> END`
;