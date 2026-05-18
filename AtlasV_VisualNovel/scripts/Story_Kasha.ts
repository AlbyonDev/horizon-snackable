/**
 * Story_Kasha — Kasha's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   kasha_t<tier>_c<cast>_b<beat>
 *
 * Character voice: "Tch.", "baka", third-person slips when stressed,
 * possessive of her corner, prickly tsundere armor over deep loneliness.
 * She insists she doesn't care while showing she very much does.
 *
 * Engine integration notes:
 *   - `from.kasha.<recipeId>` one-shot signals are set by the encounter
 *     system and auto-cleared by the engine after kasha_entry dispatch.
 *   - `mood.kasha.last_drift` is a synthetic string flag set by the engine
 *     from the fish's departure drift, used for bridge dialogues.
 *   - `-> END` triggers the visual departure fade directly; goodbye lines
 *     belong inside the terminal choice's response (Ink Authoring Guide §4.4).
 *
 * Intent format (Guide §1.2): cold meta-verb categories, 1–3 words, no
 * adverbs. The emotion lives in the fish's reaction, not in the tooltip.
 *   WAIT   → Hold space. / Observe. / Listen. / Let her vent.
 *   TWITCH → Tease. / Nudge. / Prompt. / Match energy. / Break the ice.
 *   DRIFT  → Comfort. / Empathize. / Reassure. / Validate. / Yield.
 *   REEL   → Push back. / Ground her. / Confront. / Set boundary. / Take charge.
 *
 * Delta calibration:
 *   +5  emotional breakthrough, vulnerability accepted
 *   +4  real opening, significant moment
 *   +3  sincere positive, marked interest
 *   +2  slightly positive
 *   +1  neutral-positive
 *    0  deflection
 *   -2  mild rejection
 *   -3  harsh rejection, wounded pride
 */

export const KASHA_STORY: string = `
// ============================================================
// STORY_KASHA — REWRITTEN FOR PURE AGENCY & INVISIBLE DIALOGUE
// ============================================================

=== kasha_entry ===
{ from.kasha.name :
    // T5 is locked-in by the T4 choice (c8_b2): REEL → catch branch,
    // DRIFT → release branch. If neither was chosen at T4 (player took
    // WAIT/TWITCH), fall back to the release branch (default: she lets go).
    { mood.kasha.t4_chose_catch :
        { quest.kasha.t5_catch_b1_done :
            { quest.kasha.t5_catch_b2_done :
                -> kasha_t5_catch_b3
            - else :
                -> kasha_t5_catch_b2
            }
        - else :
            -> kasha_t5_catch_b1
        }
    - else :
        { quest.kasha.t5_release_b1_done :
            { quest.kasha.t5_release_b2_done :
                -> kasha_t5_release_b3
            - else :
                -> kasha_t5_release_b2
            }
        - else :
            -> kasha_t5_release_b1
        }
    }
- from.kasha.offer :
    { quest.kasha.t4_c8_done :
        -> kasha_t4_c9_b1
    - else :
        -> kasha_t4_c8_b1
    }
- from.kasha.corner :
    { quest.kasha.t3_c6_done :
        -> kasha_t3_c7_b1
    - quest.kasha.t3_c5_done :
        -> kasha_t3_c6_b1
    - else :
        -> kasha_t3_c5_b1
    }
- from.kasha.challenge :
    { quest.kasha.t2_c3_done :
        -> kasha_t2_c4_b1
    - else :
        -> kasha_t2_c3_b1
    }
- from.kasha.home :
    { quest.kasha.t1_done :
        -> kasha_loop
    - met.kasha :
        -> kasha_t1_c2_b1
    - else :
        -> kasha_t1_c1_b1
    }
- from.kasha.homeNight :
    { quest.kasha.t1_done :
        -> kasha_loop
    - met.kasha :
        -> kasha_t1_c2_b1
    - else :
        -> kasha_t1_c1_b1
    }
- else :
    -> kasha_t1_c1_b1
}

// ============================================================
// FAIL-SAFE LOOP — reached when home is somehow still active after T1.
// Should never happen with correct recipe disabling; if it does, give the
// player a beat of flavor instead of replaying T1 c2.
// ============================================================

=== kasha_loop ===
*Kasha is practicing fighting stances against her own reflection.*
*Tch. Punch. Tch. Pivot.*
*She does not notice you.*
-> END

// ============================================================
// TIER 1 — THE CHAMPION: This corner is taken
// ============================================================

=== kasha_t1_c1_b1 ===
Tch.
Another one.
You picked the wrong corner to hang around, you know.
This one is taken.

* [WAIT] Observe. #delta:0 #icon:curiosity #drift:NEUTRAL #flag:met.kasha #flag:fact.kasha.appearance #flag:fact.kasha.champion
    What is that face.
    Don't just stand there staring— ugh, whatever. Stay if you want.
    Not like I care.
    -> kasha_t1_c1_b2

* [TWITCH] Tease. #delta:3 #icon:surprise #drift:CHARMED #flag:met.kasha #flag:fact.kasha.appearance #flag:fact.kasha.champion
    Hah—
    Oh, so you've got a mouth. Good.
    I was getting bored of everyone just walking past.
    Don't disappoint me, baka.
    -> kasha_t1_c1_b2

* [DRIFT] Yield. #delta:1 #icon:hesitation #drift:WARM #flag:met.kasha #flag:fact.kasha.appearance #flag:fact.kasha.champion
    Wait— no, wait.
    I didn't say you had to leave right this second.
    I said it was taken. That's different.
    Tch. Forget it. Just stay where you are.
    -> kasha_t1_c1_b2

* [REEL] Push. #delta:3 #icon:warmth #drift:CHARMED #flag:met.kasha #flag:fact.kasha.appearance #flag:fact.kasha.champion
    Heh. 
    You're either incredibly brave or just stupid.
    I'll figure out which.
    -> kasha_t1_c1_b2

=== kasha_t1_c1_b2 ===
I'm Kasha. And you're the new face everyone's been whispering about.
"Someone new is around. Someone who actually stays."
Pff. As if that's interesting.
It's... a little interesting.

* [WAIT] Listen. #delta:1 #icon:hesitation #drift:WARM #flag:fact.kasha.baka
    Yeah, the usual gossips down the street.
    The quiet girl keeps a— she's got a list or something. Files, whatever.
    Creepy. Don't talk to her.
    Actually, do. See if she even answers. She doesn't answer me.
    Tch. You're alright. Maybe.
    -> END

* [TWITCH] Prompt. #delta:3 #icon:curiosity #drift:CHARMED #flag:fact.kasha.baka #flag:fact.kasha.third_person
    HAH—
    Interesting? Who, the walking statue?
    Please. Kasha doesn't get jealous.
    ...I just said my own name in the third person, didn't I.
    Forget that.
    Oi. Come back tomorrow. I'm not done with you. Don't be late, baka.
    -> END

* [DRIFT] Comfort. #delta:-2 #icon:surprise #drift:WARY
    What is that supposed to mean.
    Don't say weird, sappy things to people you just met, baka.
    Tch. You're weird. Not in the good way.
    Maybe try again tomorrow. Or don't. Whatever.
    -> END

* [REEL] Challenge. #delta:2 #icon:curiosity #drift:WARM #flag:fact.kasha.baka
    Wow. Direct.
    I like that.
    Wait, no. Bad. Boring attitude.
    Ask me something specific next time. I'll consider answering.
    Tch. You're alright. Maybe.
    -> END

=== kasha_t1_c2_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came back. After I called you weird and told you to leave.
    Tch. Stubborn.
- mood.kasha.last_drift == "SCARED" :
    Oh. So you didn't take the hint.
    Good. I was bluffing anyway.
- else :
    You came back.
    Hah. Of course you did.
}
I told you I wasn't done.
Don't read into that.

* [WAIT] Stand. #delta:2 #icon:hesitation #drift:WARM
    Yeah. You are here.
    Stop looking at me like that. I'm thinking.
    -> kasha_t1_c2_b2

* [TWITCH] Joke. #delta:3 #icon:surprise #drift:CHARMED
    I MISSED— no.
    I observed your continued absence. That's different.
    Pff. Listen to yourself.
    You're insufferable, baka. Sit down.
    -> kasha_t1_c2_b2

* [DRIFT] Yield. #delta:0 #icon:curiosity #drift:NEUTRAL
    I— no. I did not wait for you.
    I was going to be standing here regardless.
    That is not the same thing as wanting you to come. Stop trying to read me.
    -> kasha_t1_c2_b2

* [REEL] Confront. #delta:4 #icon:warmth #drift:CHARMED
    You're really pushing it today. Bossing me around.
    Just stay. Don't make me ask twice.
    -> kasha_t1_c2_b2

=== kasha_t1_c2_b2 ===
So. Things you should know.
Rule one: I'm the loudest person in this neighborhood. That's a fact.
Rule two: nobody — and I mean nobody — has ever bested me.
I am the champion. Of this corner. By right.
Rule three: don't bother trying. You'll embarrass yourself.
Rule four: if you do try, do it well, because if you embarrass yourself I'll have to mock you and I'm tired today.
Why are you smiling.

* [WAIT] Observe. #delta:1 #icon:hesitation #drift:WARM #flag:quest.kasha.t1_done #flag:recipe.kasha.challenge #disable-flag:recipe.kasha.home #disable-flag:recipe.kasha.homeNight
    That's the wrong answer. Just staring.
    But fine. Keep your reasons.
    I've decided. Come tomorrow.
    Bring that shiny red keychain you were fiddling with yesterday.
    -> END

* [TWITCH] Nudge. #delta:2 #icon:curiosity #drift:WARM #flag:quest.kasha.t1_done #flag:recipe.kasha.challenge #disable-flag:recipe.kasha.home #disable-flag:recipe.kasha.homeNight
    Champion of— shut up.
    Of everything that matters. The list is long. Trust me.
    There's a list. There is.
    Maybe tomorrow.
    Bring the red keychain. The shiny one. A champion needs a proper challenge.
    -> END

* [DRIFT] Empathize. #delta:-2 #icon:curiosity #drift:WARY #flag:quest.kasha.t1_done #flag:recipe.kasha.challenge #disable-flag:recipe.kasha.home #disable-flag:recipe.kasha.homeNight #flag:secret.kasha.never_challenged
    Of course they have. People challenge me constantly.
    Constantly.
    Next topic.
    Maybe think about whether you actually want to come back. I'm not begging.
    Bring the red keychain if you do.
    -> END

* [REEL] Accept. #delta:3 #icon:warmth #drift:CHARMED #flag:quest.kasha.t1_done #flag:recipe.kasha.challenge #disable-flag:recipe.kasha.home #disable-flag:recipe.kasha.homeNight #flag:mood.kasha.challenge_accepted
    Accept what, exactly?
    Don't say something stupid. Be specific.
    Tomorrow. Same corner.
    Don't bring anyone else. Just you.
    And that red keychain. Don't pretend you don't have it. Baka.
    -> END

// ============================================================
// TIER 2 — THE TEST: New rules, new standard
// ============================================================

=== kasha_t2_c3_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You brought the keychain. Even after the cold goodbye.
    Tch. I knew you would.
- else :
    You brought the keychain. The shiny one. Good.
}
Okay. New rules.
If you want to keep showing up here, you have to earn it.
I'm raising the standard.
Don't look at me like that. This is good for you.

* [WAIT] Listen. #delta:1 #icon:curiosity #drift:WARM
    I haven't decided what the test is yet.
    It will reveal itself. Stay alert.
    Don't laugh. I am being serious.
    -> kasha_t2_c3_b2

* [TWITCH] Match. #delta:3 #icon:surprise #drift:CHARMED
    Hah—!
    That's the right energy. Wrong attitude, but right energy.
    I'll allow it.
    You're enjoying this. Aren't you.
    -> kasha_t2_c3_b2

* [DRIFT] Yield. #delta:-1 #icon:curiosity #drift:WARY
    Yes I do have to test you.
    Yes I do, baka. You wouldn't understand.
    -> kasha_t2_c3_b2

* [REEL] Push. #delta:3 #icon:warmth #drift:CHARMED #flag:mood.kasha.prize_admitted
    A prize? You don't get anything.
    You get to keep hanging out with me. That's the prize.
    That's a real prize. Stop smirking.
    -> kasha_t2_c3_b2

=== kasha_t2_c3_b2 ===
Question one: who is the most important person around here.
Answer carefully.

* [WAIT] Observe. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t2_c3_done #flag:mood.kasha.unmasked_briefly
    Don't just look at me like that.
    Say it like a joke. Don't just stare.
    Pass. You pass.
    Acceptable performance. Tomorrow.
    -> END

* [TWITCH] Tease. #delta:2 #icon:surprise #drift:WARM #flag:quest.kasha.t2_c3_done
    Pff.
    Correct answer. Acceptable delivery.
    B+. I'm a hard grader.
    Tomorrow.
    -> END

* [DRIFT] Evade. #delta:-1 #icon:hesitation #drift:NEUTRAL #flag:quest.kasha.t2_c3_done
    Yes, it's hard to say.
    No. I don't know. Move on. Next question.
    We'll see. Maybe.
    -> END

* [REEL] Challenge. #delta:-3 #icon:surprise #drift:WARY #flag:quest.kasha.t2_c3_done #flag:mood.kasha.wounded_pride
    Wow.
    Get out. Get out of my corner.
    I'm joking. Mostly. Stay where you are.
    But also — wow. I expected better. From you specifically.
    -> END

=== kasha_t2_c4_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came back. Even after I said I expected better.
    Tch. So did I.
- else :
    Took you long enough.
    I was about to leave.
}
You're lucky I'm patient.
Don't laugh. I AM patient.

* [WAIT] Stand. #delta:2 #icon:hesitation #drift:WARM #flag:mood.kasha.would_have_whistled
    Yeah. I noticed you're here now.
    Took you a minute. I was about to yell for you.
    I would not have yelled.
    -> kasha_t2_c4_b2

* [TWITCH] Nudge. #delta:2 #icon:curiosity #drift:WARM
    I did not watch the path waiting for you!
    I was bored. I pace when I'm bored.
    Stop smirking. That was not an admission.
    -> kasha_t2_c4_b2

* [DRIFT] Comfort. #delta:1 #icon:hesitation #drift:WARM #flag:mood.kasha.tender_hit
    Don't apologize. Just don't.
    Sit down.
    -> kasha_t2_c4_b2

* [REEL] Command. #delta:4 #icon:warmth #drift:CHARMED
    Hah—
    Listen to you. Bossy.
    Maybe.
    -> kasha_t2_c4_b2

=== kasha_t2_c4_b2 ===
About what I said. Last time.
About people challenging me constantly.
That was a slight exaggeration. Slight.

* [WAIT] Listen. #delta:3 #icon:hesitation #drift:CHARMED #flag:quest.kasha.t2_done #flag:recipe.kasha.corner #disable-flag:recipe.kasha.challenge #flag:secret.kasha.never_challenged_truth #flag:fact.kasha.origin
    Significantly slight.
    Nobody challenges me, baka. Nobody bothers.
    I'm the champion because I'm the only one playing.
    Tomorrow.
    Actually — come at night. Empty hands. Just you.
    The corner is quieter then.
    -> END

* [TWITCH] Poke. #delta:2 #icon:curiosity #drift:WARM #flag:quest.kasha.t2_done #flag:recipe.kasha.corner #disable-flag:recipe.kasha.challenge #flag:secret.kasha.lonely #flag:fact.kasha.origin
    EXCUSE me. It is not bluffing.
    It is strategic positioning. I am a strategist.
    I am a very lonely strategist.
    Tch. Forget I said that last part.
    Tomorrow, then. Same corner. Come at night. Empty hands.
    The neighborhood is different after dark.
    -> END

* [DRIFT] Reassure. #delta:1 #icon:hesitation #drift:WARM #flag:quest.kasha.t2_done #flag:recipe.kasha.corner #disable-flag:recipe.kasha.challenge
    Don't tell me it's okay.
    It's annoying. It's nice, but it's annoying.
    Tomorrow, then.
    Same corner. Come at night this time. Just you.
    I don't want a contest.
    -> END

* [REEL] Push. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t2_done #flag:recipe.kasha.corner #disable-flag:recipe.kasha.challenge #flag:mood.kasha.first_real_challenge
    Are you actually going to do it, or just keep talking about it?
    Tomorrow.
    Come at night. Don't bring anything else, baka. Just you.
    -> END

// ============================================================
// TIER 3 — THE SLIP: The thing about before
// ============================================================

=== kasha_t3_c5_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came at night. Empty hands. Even after I snapped at you.
    Tch. Good.
- else :
    You came at night. Empty hands.
    Good. The corner is yours too tonight.
}
Okay. So.
There was this time in my old town— no.
Forget that. There was a— no, also bad.
Why is this hard. It shouldn't be hard. It's a story.

* [WAIT] Listen. #delta:3 #icon:hesitation #drift:WARM #flag:mood.kasha.first_thank_you
    Don't look so patient. It makes me take longer.
    Thank you.
    Don't react to that.
    -> kasha_t3_c5_b2

* [TWITCH] Prompt. #delta:1 #icon:curiosity #drift:WARM #flag:secret.kasha.somebody_better
    Hah. Bossy.
    Fine. Story one.
    There was somebody who was better than me at everything I did. End of story.
    Wait. That's a bad story. Forget that one too.
    -> kasha_t3_c5_b2

* [DRIFT] Comfort. #delta:2 #icon:hesitation #drift:WARM #flag:mood.kasha.wants_to_tell
    I want to.
    I want to and I don't want to.
    Stop being kind. It's making it worse.
    -> kasha_t3_c5_b2

* [REEL] Ask. #delta:2 #icon:warmth #drift:WARM #flag:secret.kasha.came_from_elsewhere #flag:fact.kasha.origin
    I came from somewhere else.
    Before here. I packed my bags and left.
    The end.
    Don't ask follow-up questions, baka.
    -> kasha_t3_c5_b2

=== kasha_t3_c5_b2 ===
There was a person. I'm not going to say who.
And there was another person, and the second person liked the first person more than they liked me.
It wasn't a fair fight.
It wasn't a fight at all, actually. I just lost. Without playing.

* [WAIT] Observe. #delta:4 #icon:hesitation #drift:OPENED #flag:quest.kasha.t3_c5_done #flag:mood.kasha.silence_understood
    Yeah.
    That's how I felt about it too.
    Tomorrow. Don't bring it up.
    Don't not bring it up either. Just be normal.
    -> END

* [TWITCH] Logic. #delta:-3 #icon:surprise #drift:SCARED #flag:quest.kasha.t3_c5_done #flag:mood.kasha.shut_down
    Wow. Tell me how it works, then. Since you know.
    Tch. Forget it. I shouldn't have said anything.
    Don't come back. I mean it this time.
    -> END

* [DRIFT] Empathize. #delta:3 #icon:hesitation #drift:OPENED #flag:quest.kasha.t3_c5_done #flag:mood.kasha.acknowledged_hurt
    I know it did. 
    Don't make me say more about it.
    Tomorrow. Don't bring it up. Just be normal.
    -> END

* [REEL] Defend. #delta:-2 #icon:surprise #drift:WARY #flag:quest.kasha.t3_c5_done #flag:mood.kasha.do_not_measure
    Don't. Don't do that.
    Don't compare me to them. Don't measure me against them.
    That's exactly the —
    Forget it. I told you too much. I'm not doing that again.
    -> END

=== kasha_t3_c6_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came back. After I said I wasn't doing that again.
    Liar. Apparently I am.
- mood.kasha.last_drift == "SCARED" :
    You ignored me.
    Tch. Good.
- else :
    Hey.
    Don't say anything.
}
About yesterday.
I'm pretending I didn't say it. Help me pretend.

* [WAIT] Agree. #delta:4 #icon:hesitation #drift:CHARMED #flag:mood.kasha.thank_you_recurring
    Thank you.
    I said it again. I'm thanking you more now. Stop me.
    -> kasha_t3_c6_b2

* [TWITCH] Tease. #delta:1 #icon:curiosity #drift:WARM
    Tch. You're cruel.
    Fine. It happened. But we are not doing that again. Not today.
    -> kasha_t3_c6_b2

* [DRIFT] Yield. #delta:2 #icon:hesitation #drift:WARM #flag:mood.kasha.needs_noise
    Good.
    Sit down. Be loud about something else. I need noise.
    -> kasha_t3_c6_b2

* [REEL] Push. #delta:0 #icon:surprise #drift:NEUTRAL #flag:mood.kasha.thanked_under_protest
    Stop. Stop right there. We agreed.
    Thank you. But stop.
    -> kasha_t3_c6_b2

=== kasha_t3_c6_b2 ===
{ mood.kasha.last_drift == "WARY" :
    Since you think you're such an expert on how life works, let's test your pride.
- mood.kasha.last_drift == "SCARED" :
    Since you think you're such an expert on how life works, let's test your pride.
- else :
    Question. I want to test your judgment.
}
If you had to pick one of the three idiots walking around this block — not me, three other idiots — to fight you in a duel, who would you pick?
Don't say a name. Describe them.

* [WAIT] Surrender. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t3_c6_done #flag:mood.kasha.melted_briefly
    Playing dead? Are you serious right now.
    I ask you to pick an opponent and you just lie down.
    ...
    That is the worst answer.
    How do you say something so stupid that it works?
    Tomorrow. Bring nothing again. Just come. Just you, baka.
    -> END

* [TWITCH] Pick him. #delta:2 #icon:curiosity #drift:WARM #flag:quest.kasha.t3_c6_done
    The loud guy? Wow. Picking on the weak, baka.
    If you yelled at him, he'd probably have a panic attack on the sidewalk.
    Actually, you're right, that would be an easy win. I respect the strategy.
    Tomorrow. Be on time.
    -> END

* [DRIFT] Pick her. #delta:-2 #icon:surprise #drift:WARY #flag:quest.kasha.t3_c6_done #flag:mood.kasha.nereia_jealousy
    The quiet girl with the files? You're really committed to making me jealous of her, huh.
    Fine. Pick her. See if I care.
    I don't. ...I do. A little. Stop.
    I don't know if I'll be here tomorrow. Don't count on it.
    -> END

* [REEL] Pick you. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t3_c6_done #flag:mood.kasha.demanded_repeat
    I explicitly said "not me", baka.
    You can't just break the rules of the hypothetical scenario.
    ...
    Say it again.
    Tomorrow. Bring nothing. Just come. Just you, baka.
    -> END

=== kasha_t3_c7_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came. Even after I told you not to count on it.
    Tch. Apparently I was here after all.
- else :
    You came. Good.
}
I have a question.
Don't make a thing about it. It's a small question.
It's not a small question.

* [WAIT] Listen. #delta:2 #icon:hesitation #drift:WARM #flag:mood.kasha.real_question_asked
    Why do you keep coming back.
    Don't say something cute. Don't say "because of you." I will lose my mind.
    Tell me actually.
    -> kasha_t3_c7_b2

* [TWITCH] Prompt. #delta:1 #icon:curiosity #drift:WARM
    Why do you keep coming back.
    And don't be cute. I am asking actually.
    -> kasha_t3_c7_b2

* [DRIFT] Reassure. #delta:1 #icon:hesitation #drift:WARM
    Don't be generous.
    I'm trying to ask a specific thing.
    Why do you keep coming back.
    -> kasha_t3_c7_b2

* [REEL] Demand. #delta:1 #icon:curiosity #drift:WARM #flag:mood.kasha.why_me
    Because I need to know why me.
    And not — you know. Not anyone else.
    -> kasha_t3_c7_b2

=== kasha_t3_c7_b2 ===
Tell me why you're here.

* [WAIT] Stand. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t3_done #flag:recipe.kasha.offer #disable-flag:recipe.kasha.corner #flag:mood.kasha.alive_compliment_received
    That is the worst possible thing you could have said and also the only acceptable thing.
    Get out. Don't get out. Stay.
    I hate you. (I don't.)
    Tomorrow. Bring a coffee. Any coffee. So it feels official. Night. Same corner.
    -> END

* [TWITCH] Tease. #delta:2 #icon:curiosity #drift:WARM #flag:quest.kasha.t3_done #flag:recipe.kasha.offer #disable-flag:recipe.kasha.corner
    Pff. Acceptable.
    True. I am very interesting. Thanks.
    Forget I said that.
    Tomorrow. I won't keep asking why you come. For now.
    Come at night. Bring a coffee.
    -> END

* [DRIFT] Yield. #delta:4 #icon:hesitation #drift:CHARMED #flag:quest.kasha.t3_done #flag:recipe.kasha.offer #disable-flag:recipe.kasha.corner #flag:secret.kasha.first_let
    That's not how I would have phrased it.
    But yeah. I do let you. I've never let anyone before.
    Tomorrow. Bring a coffee. Night. Same corner. Don't be late, baka.
    -> END

* [REEL] Confront. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t3_done #flag:recipe.kasha.offer #disable-flag:recipe.kasha.corner #flag:mood.kasha.want_word
    Want is a strong word.
    I like that word. Use it more.
    Tomorrow. Same corner. Night. Bring a coffee. Don't be late.
    -> END

// ============================================================
// TIER 4 — THE TROPHY: The offer
// ============================================================

=== kasha_t4_c8_b1 ===
{ mood.kasha.last_drift == "GUARDED" :
    Back again. Same corner. Same offer on the table.
    I told you it would stand until you answered. I meant it.
    No more long speech. You already heard the long speech.
- mood.kasha.last_drift == "WARY" :
    You came back at night. Coffee in hand. Even after I got snippy.
    Tch. Fine.
    Okay. Listen.
    I've been thinking. Don't comment on that. I do think.
    I want to offer you something.
- else :
    You came. Night, coffee, the whole thing. Good.
    Okay. Listen.
    I've been thinking. Don't comment on that. I do think.
    I want to offer you something.
}

* [WAIT] Listen. #delta:2 #icon:hesitation #drift:WARM #flag:secret.kasha.offering_self
    Me.
    I'm offering you me.
    Don't make that face. Hear me out.
    -> kasha_t4_c8_b2

* [TWITCH] Prompt. #delta:1 #icon:curiosity #drift:WARM
    Fine. Fine.
    I'm offering me. As a— prize. Or something.
    I knew you'd make a face.
    -> kasha_t4_c8_b2

* [DRIFT] Comfort. #delta:1 #icon:hesitation #drift:WARM
    Stop being patient at me. It's working and I hate it.
    I want to offer you me. As — yeah. As something. I haven't worked out what.
    -> kasha_t4_c8_b2

* [REEL] Push. #delta:1 #icon:curiosity #drift:WARM
    I'm offering myself. To you.
    Don't say anything yet. I am not done explaining.
    -> kasha_t4_c8_b2

=== kasha_t4_c8_b2 ===
Here is the thing.
I've been the champion of this corner because nobody has ever bothered to take it from me.
I told you that already.
If you wanted to. You could take it.
I'm telling you that you could. I would let you.

// =============================================================
// DECISIVE CHOICE — this beat locks in the T5 ending track.
//   [DRIFT] declines the offer  → release branch  (kasha.release_ready)
//   [REEL]  accepts the offer   → catch branch    (kasha.catch_available)
//
//   [WAIT] / [TWITCH] are DODGES. They DO NOT set quest.kasha.t4_c8_done,
//   so the dispatcher routes the player back to kasha_t4_c8_b1 on the next
//   from.kasha.offer cast. They depart in drift GUARDED — the c8_b1 bridge
//   reads mood.kasha.last_drift == "GUARDED" to play a shorter "you came
//   back without answering" opener that disguises the repetition.
//
//   The player must eventually commit to DRIFT or REEL to unlock T5.
// =============================================================

* [WAIT] Observe. #delta:0 #icon:hesitation #drift:GUARDED #flag:mood.kasha.offer_dodged
    You're just sitting there. Quietly.
    ...
    That's not an answer, baka. You know it isn't.
    Fine. We'll do this again tomorrow.
    Same time. Same corner. The offer stands until you take it. Or refuse it.
    -> END

* [TWITCH] Joke. #delta:-2 #icon:curiosity #drift:GUARDED #flag:mood.kasha.offer_dodged
    Don't joke about it. Not this one.
    ...
    No. You don't get to slip out of this with a smirk.
    Tomorrow. Come back when you're ready to actually say something.
    The corner waits. So do I. Tch.
    -> END

* [DRIFT] Empathize. #delta:4 #icon:hesitation #drift:OPENED #flag:quest.kasha.t4_c8_done #flag:mood.kasha.first_gift #flag:mood.kasha.t4_chose_release #flag:kasha.release_ready
    I know.
    It's the first time I've wanted to give somebody something.
    Don't make me explain it more than that.
    The corner stays mine. That's good.
    Tomorrow. I need to think about today.
    -> END

* [REEL] Command. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t4_c8_done #flag:mood.kasha.want_you_received #flag:mood.kasha.t4_chose_catch #flag:kasha.catch_available
    Oh.
    That's a lot.
    Say it again. Slower.
    ...Okay.
    The corner is yours when you want it. Tomorrow.
    Same time. Same corner. I'll be here.
    -> END

=== kasha_t4_c9_b1 ===
{ mood.kasha.last_drift == "WARY" :
    You came back. After I tried to take the offer back.
    Tch. Stubborn.
- else :
    Hey. You came.
}
I'm going to do something today.
I'm going to be quiet. Just for a minute.
Don't panic. I'll be loud again. I just want to try it.

* [WAIT] Stand. #delta:5 #icon:warmth #drift:CHARMED #flag:mood.kasha.shared_silence
    Thank you.
    I think I want to keep being quiet for a while. Sit with me.
    -> kasha_t4_c9_b2

* [TWITCH] Nudge. #delta:0 #icon:curiosity #drift:NEUTRAL
    Yeah. I am okay.
    I'll be normal again in a second. Just — don't make it harder.
    -> kasha_t4_c9_b2

* [DRIFT] Yield. #delta:4 #icon:hesitation #drift:CHARMED
    Stop.
    Stop being good at this. It's annoying.
    Don't stop.
    -> kasha_t4_c9_b2

* [REEL] Confront. #delta:4 #icon:warmth #drift:CHARMED #flag:mood.kasha.callback_first_day
    "This corner is taken"?
    Yeah. I did say that to you on the first day, didn't I.
    I fully expected you to turn around and leave.
    ...
    I'm glad you didn't.
    -> kasha_t4_c9_b2

=== kasha_t4_c9_b2 ===
Here is a fact.
When I came here.
I came here because in my old city, I was second.
I was second to a memory. Of someone who wasn't there anymore.
And I couldn't compete with a memory because memories don't have flaws.
So I packed up and came here. And I made up a championship I could win.
Because here, there was nobody to be second to.
Until you showed up.

* [WAIT] Observe. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t4_done #flag:recipe.kasha.name #disable-flag:recipe.kasha.offer #flag:secret.kasha.told_the_truth #flag:secret.kasha.real_name_intent
    Yeah. I knew you wouldn't say anything.
    That's why I told you.
    Tomorrow. I want to tell you my real name.
    Be on time. Baka. Come during the day. Just come.
    -> END

* [TWITCH] Joke. #delta:1 #icon:curiosity #drift:NEUTRAL #flag:quest.kasha.t4_done #flag:recipe.kasha.name #disable-flag:recipe.kasha.offer
    Pff. Yeah. I know I'm first here.
    Don't make me say more. I'm done for today.
    Tomorrow. Maybe. Day. Just come.
    -> END

* [DRIFT] Comfort. #delta:4 #icon:hesitation #drift:OPENED #flag:quest.kasha.t4_done #flag:recipe.kasha.name #disable-flag:recipe.kasha.offer #flag:mood.kasha.thanked_softly
    I know. I'm first here.
    I knew before you said it. But — yeah. It's still nice to hear.
    Thank you, baka.
    Tomorrow. I have one more thing I want to say. Day this time.
    -> END

* [REEL] Push. #delta:1 #icon:curiosity #drift:NEUTRAL #flag:quest.kasha.t4_done #flag:recipe.kasha.name #disable-flag:recipe.kasha.offer #flag:mood.kasha.no_qualifier
    Don't say "here" like that. Like there's a "here" and an "elsewhere."
    Just say I'm not second. Say it without the qualifier.
    Tomorrow. Maybe. Day. We'll see.
    -> END

// ============================================================
// TIER 5 — THE NAME: Aki
// ============================================================
// The T5 branch is locked in by the T4 c8_b2 choice:
//   REEL at T4  → catch branch (kasha_t5_catch_*)   → kasha.catch_available
//   DRIFT at T4 → release branch (kasha_t5_release_*) → kasha.release_ready
//   WAIT/TWITCH at T4 → default release branch (she keeps her corner)
// The ending flag is already set at T4; the T5 dialogue is a cinematic
// walk to that ending. Player choices in T5 cannot flip the outcome.
// ============================================================


// -----------------------------------------------------------------
// RELEASE BRANCH — she keeps the corner. The original 3-beat arc.
// Player let her be (or stayed neutral). The trophy was refused.
// -----------------------------------------------------------------

=== kasha_t5_release_b1 ===
{ mood.kasha.last_drift == "WARY" :
    Day. You. As promised.
    Tch. Sit down.
- mood.kasha.last_drift == "NEUTRAL" :
    You came. Day, like I asked.
    Good.
- else :
    Okay. You're here. In the daylight. Good.
}
I've been thinking about this all day.
I'm going to say a thing. And then another thing. And then a third thing.
Don't interrupt me. Please.
Yeah, I said please. We are past that, you and I.

* [WAIT] Listen. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    Good. Thank you.
    First thing. My name is not Kasha.
    Kasha is a thing I called myself when I moved here.
    It means "fire-cart." I thought it sounded fierce.
    It does sound fierce. But it isn't my name.
    My name is Aki.
    It just means "autumn." I have always thought it was too soft.
    I am telling it to you anyway.
    -> kasha_t5_release_b2

* [TWITCH] Prompt. #delta:-3 #icon:curiosity #drift:WARY #flag:quest.kasha.t5_release_b1_done #flag:mood.kasha.real_name_rushed
    Don't do that to me. Not today.
    Fine. Skipping.
    I'm Aki. That's the first thing.
    -> kasha_t5_release_b2

* [DRIFT] Empathize. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    I will take my time. Thank you.
    First thing. My name is Aki.
    Kasha is a thing I called myself. Aki is what I was first.
    -> kasha_t5_release_b2

* [REEL] Command. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    Aki.
    That's my name.
    Don't say it back yet. Wait till I'm done.
    -> kasha_t5_release_b2

=== kasha_t5_release_b2 ===
Second thing.
I've been calling you "baka" since the first day.
I never picked a real name for you.
I'm going to.
I'm going to call you Hikaru. It means "light."
Don't say anything yet.
I picked it because the first time I ever caught myself smiling about you, you weren't there.
It was morning. Light through the trees in the park.
I thought of you.
That is the most embarrassing thing I have ever said. We are not going to talk about it.

* [WAIT] Approve. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b2_done #flag:mood.kasha.named_him
    Thank you, I like it too, I picked it.
    Hikaru. I'm going to use that now. Get used to it.
    -> kasha_t5_release_b3

* [TWITCH] Tease. #delta:-2 #icon:curiosity #drift:WARM #flag:quest.kasha.t5_release_b2_done
    DON'T. Don't make fun of it.
    I picked it. It's mine. It's yours. Don't make it weird.
    Ugh. Now I'm second-guessing it.
    Too late. Decision made. You are Hikaru.
    -> kasha_t5_release_b3

* [DRIFT] Comfort. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b2_done
    Don't say my name back yet.
    Just — Hikaru. Yes. That. Good.
    -> kasha_t5_release_b3

* [REEL] Resist. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_release_b2_done
    Too bad. I don't care if you think it's cheesy.
    I picked it, and you will wear it.
    -> kasha_t5_release_b3

=== kasha_t5_release_b3 ===
Third thing.
I never wanted to be the champion of this corner.
I wanted to be somebody's favourite person.
I am yours.
Aren't I.
Don't answer. I know.

// NOTE: kasha.release_ready is already set by the T4 c8_b2 [DRIFT] choice.
// Any choice here ends the cast, the engine reads the flag, plays Release.
// If the player took WAIT/TWITCH at T4 (neither flag), no ending flag is
// set, so the cast just ends with a soft departure — no ending CG.

* [WAIT] Stand. #delta:5 #icon:warmth #drift:CHARMED
    Don't say it.
    I said don't.
    Thank you for saying it.
    -> END

* [TWITCH] Joke. #delta:3 #icon:warmth #drift:CHARMED
    Hah.
    There she is. There you are.
    Baka. Hikaru.
    -> END

* [DRIFT] Yield. #delta:4 #icon:warmth #drift:CHARMED
    Okay.
    Okay. That's enough words for today.
    -> END

* [REEL] Command. #delta:5 #icon:warmth #drift:CHARMED
    Then it's settled, in your way.
    Aki and Hikaru. Both names — you carry them.
    That's the championship. Of letting things stay theirs.
    -> END


// -----------------------------------------------------------------
// CATCH BRANCH — she comes with you. The corner is empty after.
// Player accepted the offer at T4. Now she packs her things.
// -----------------------------------------------------------------

=== kasha_t5_catch_b1 ===
{ mood.kasha.last_drift == "WARY" :
    Day. You came back. With that look.
    Yeah. Today is the day. I know.
- else :
    You're here. In the daylight, like I said.
    Good. I packed my things last night.
}
I've been thinking about this since you said you wanted me.
I've never had to think about leaving before. Not really.
Three hundred and eleven days I've held this corner. By right.
By being the only one who showed up.
You showed up. And then you said the thing.

* [WAIT] Listen. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    Sit. Stay quiet for a second.
    There's a name. The one that's mine. Not the one I gave the corner.
    My name is Aki.
    Autumn. It's soft. I have always hated how soft.
    But you're going to use it. Out there. So you should hear it once. Properly.
    Aki.
    Now you've heard it.
    -> kasha_t5_catch_b2

* [TWITCH] Prompt. #delta:-2 #icon:curiosity #drift:WARM #flag:quest.kasha.t5_catch_b1_done #flag:mood.kasha.real_name_rushed
    Pushy today, baka.
    Fine. Fine. The name first.
    Aki. That's the one. The one that comes with me.
    Don't make me repeat it.
    -> kasha_t5_catch_b2

* [DRIFT] Empathize. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    Yeah. You can tell I'm nervous.
    Names matter on the other side. So I'm bringing mine.
    Aki. That's the one that's mine.
    Keep it. Use it sometimes. Not all the time. I still want to be Kasha for the loud parts.
    -> kasha_t5_catch_b2

* [REEL] Command. #delta:5 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b1_done #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    Okay. Direct. I respect that.
    Aki. That's my name. Use it when it matters.
    The rest of the time I'm still Kasha. Don't get any ideas.
    -> kasha_t5_catch_b2

=== kasha_t5_catch_b2 ===
Second thing.
I've been calling you "baka" since you walked into my corner.
That's not going to work where we're going. Not all the time.
So I picked one.
Hikaru. It means "light."
I'm not going to explain why. You'd make it weird.
But — out there — that's what I'll call you. When it matters.
The rest of the time, still baka. Obviously.

* [WAIT] Approve. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b2_done #flag:mood.kasha.named_him
    Good. You took it without making a face. That's how I knew.
    Hikaru. Get used to it. We're not unpacking it.
    -> kasha_t5_catch_b3

* [TWITCH] Tease. #delta:-2 #icon:curiosity #drift:WARM #flag:quest.kasha.t5_catch_b2_done
    Don't laugh. Don't.
    Yes, it's a soft name. So is mine. We match.
    Stop smiling like that.
    -> kasha_t5_catch_b3

* [DRIFT] Comfort. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b2_done
    Yeah. I picked it for a reason.
    No, I'm not going to tell you the reason. Walk it off, Hikaru.
    -> kasha_t5_catch_b3

* [REEL] Resist. #delta:4 #icon:warmth #drift:CHARMED #flag:quest.kasha.t5_catch_b2_done
    Too bad. You don't get to pick. I do.
    You're Hikaru when I say so. And baka the rest of the time.
    That's the deal.
    -> kasha_t5_catch_b3

=== kasha_t5_catch_b3 ===
Third thing.
The corner stays. I'm not.
Someone else will sit here. Tomorrow. Or in a year. The bench doesn't care.
But the championship — the one I made up to feel like I belonged somewhere —
that comes with me. Folded into a pocket.
You're holding the other half of it.
We're walking out together.

// NOTE: kasha.catch_available is already set by the T4 c8_b2 [REEL] choice.
// All four options here end the cast → engine reads the flag → Catch ending.

* [WAIT] Stand. #delta:5 #icon:warmth #drift:CHARMED
    Yeah.
    Okay.
    Let's go.
    -> END

* [TWITCH] Joke. #delta:3 #icon:warmth #drift:CHARMED
    Don't make a big speech.
    The bench heard enough of those.
    Aki and Hikaru. Walking. Out.
    -> END

* [DRIFT] Comfort. #delta:4 #icon:warmth #drift:CHARMED
    I know. I'll miss the corner too. A little.
    Mostly I'll miss having something to be the champion of.
    But I have you, baka. That's the new championship.
    -> END

* [REEL] Command. #delta:5 #icon:warmth #drift:CHARMED
    Then it's settled.
    Aki and Hikaru. Out the door.
    Don't look back at the bench, baka. It's just a bench.
    -> END
`;