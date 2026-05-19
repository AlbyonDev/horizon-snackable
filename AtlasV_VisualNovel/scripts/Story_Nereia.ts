/**
 * Story_Nereia — Nereia's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   nereia_t<tier>_c<cast>_b<beat>
 *
 * Choice tags:
 *   #delta:N      affection delta (integer, may be negative)
 *   #expr:NAME    result expression — neutral | curious | warm | alarmed
 *   #icon:NAME    emotion icon — curiosity | surprise | warmth | shock |
 *                                hesitation | contentment | sadness |
 *                                boredom | delight | none
 *   #drift:NAME   result drift — Warm | Charmed | Wary | ...
 *   #flag:KEY     flag to set true (multiple #flag tags allowed per choice)
 *
 * Node-level tags (placed on the === knot === line):
 *   #silent:SECONDS   beat is a silent beat that auto-resolves after N seconds
 *
 * Diverts:
 *   -> nereia_t1_c1_b2     jump to that node
 *   -> END                 end of cast (departure phase begins)
 *   -> DONE                end of game (final ending sequence)
 *
 * Delta calibration (scale -10 / +50):
 *   +5  rupture émotionnelle, aveu
 *   +4  vraie ouverture, moment fort
 *   +3  positif sincère, intérêt marqué
 *   +2  légèrement positif
 *   +1  neutre-positif
 *    0  deflection pure
 *   -1  légère résistance (rare pour Nereia)
 *
 * Nereia ne va pas en dessous de 0 par design : son arc se termine par
 * un Release (elle part selon la directive) ou un Reel (affection max).
 * Le drift-away n'est pas dans son arc narratif.
 *
 * Cumulative (worst / best play):
 *   Cast 1: -2 / +7   Cast 2: 0 / +6   Cast 3: +2 / +6
 *   Cast 4: +1 / +11  Cast 5: 0 / +5   Cast 6: -1 / +6
 *   Cast 7: +1 / +5   Cast 8: +1 / +6  Cast 9: +2 / +6
 *   Cast 10: 0 / +6
 *   → Catch (+50) reachable at C8 with best choices
 */

export const NEREIA_STORY: string = `
// ============================================================
// STORY_NEREIA — REWRITTEN FOR PURE AGENCY & INVISIBLE DIALOGUE
// ============================================================

=== nereia_entry ===
{ from.nereia.dawnT5 :
    { quest.nereia.t5_c10b1_done :
        -> nereia_t5_c10_b2
    - else :
        -> nereia_t5_c10_b1
    }
- from.nereia.inheritanceT4 :
    { quest.nereia.t4_c8_done :
        -> nereia_t4_c9_b1
    - else :
        -> nereia_t4_c8_b1
    }
- from.nereia.directiveT3 :
    { quest.nereia.t3_c6_done :
        -> nereia_t3_c7_b1
    - quest.nereia.t3_c5_done :
        -> nereia_t3_c6_b1
    - else :
        -> nereia_t3_c5_b1
    }
- from.nereia.anomalyT2 :
    { quest.nereia.t2_c3_done :
        -> nereia_t2_c4_b1
    - else :
        -> nereia_t2_c3_b1
    }
- from.nereia.home :
    { quest.nereia.t1_done :
        -> nereia_loop
    - met.nereia :
        -> nereia_t1_c2_b1
    - else :
        -> nereia_t1_c1_b1
    }
- from.nereia.homeNight :
    { quest.nereia.t1_done :
        -> nereia_loop
    - met.nereia :
        -> nereia_t1_c2_b1
    - else :
        -> nereia_t1_c1_b1
    }
- else :
    -> nereia_t1_c1_b1
}

// ============================================================
// FAIL-SAFE LOOP — reached when home is somehow still active after T1.
// Should never happen with correct recipe disabling; if it does, give the
// player a beat of flavor instead of replaying T1 c2.
// ============================================================

=== nereia_loop ===
*Nereia drifts near the surface, gold filigree catching the low light.*
*Her fins trace a slow pattern in the water. Then stop.*
*She does not turn toward the bobber.*
-> END

// ============================================================
// TIER 1 — FIRST CONTACT: The file
// ============================================================

=== nereia_t1_c1_b1 ===
First contact.
T-2313.
...
You are seventeen seconds early.
I had projected forty.
...
The error is mine.

* [WAIT] Observe. #delta:1 #expr:curious #icon:hesitation #drift:NEUTRAL #flag:met.nereia #flag:fact.nereia.ancient #flag:fact.nereia.ornamental #flag:fact.nereia.counter
    You did not ask what the number means.
    ...
    Most do.
    I am noting your silence.
    That counts for something.
    -> nereia_t1_c1_b2

* [TWITCH] Ask. #delta:0 #expr:curious #icon:curiosity #drift:GUARDED #flag:met.nereia #flag:fact.nereia.ancient #flag:fact.nereia.ornamental #flag:fact.nereia.counter
    ...
    I will not tell you.
    Not because it is secret.
    Because the answer would be longer than the walk you took to get here.
    And you would have follow-up questions.
    -> nereia_t1_c1_b2

* [DRIFT] Accept. #delta:2 #expr:warm #icon:hesitation #drift:INTRIGUED #flag:met.nereia #flag:fact.nereia.ancient #flag:fact.nereia.ornamental #flag:fact.nereia.counter #flag:secret.nereia.first_anomaly
    ...
    Most subjects find the exactness unsettling.
    You responded as if we were discussing the weather.
    ...
    I am noting your adaptability.
    -> nereia_t1_c1_b2

* [REEL] Interrupt. #delta:-2 #expr:alarmed #icon:surprise #drift:GUARDED #flag:met.nereia #flag:fact.nereia.ancient #flag:fact.nereia.ornamental #flag:fact.nereia.counter
    ...
    I am not answering those questions right now.
    But I am noting that you would have made an excellent interrogator.
    -> nereia_t1_c1_b2

=== nereia_t1_c1_b2 ===
My name is Nereia.
...
It is the name I give.
I have others.
None of them apply this morning.
Nereia will do.

* [WAIT] Listen. #delta:3 #expr:warm #icon:hesitation #drift:INTRIGUED #flag:fact.nereia.formal #flag:mood.nereia.fourth_in_340
    ...
    You pronounced it correctly in your head just now.
    I can tell.
    ...
    That is rare.
    You are the fourth person in three hundred and forty years to not flatten the second syllable.
    I am keeping the record.
    -> nereia_t1_c1_b3

* [TWITCH] Compliment. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:fact.nereia.formal #flag:secret.nereia.chose_it
    ...
    I chose it myself.
    It took me some time to decide.
    ...
    Approximately sixty years.
    I will not say what came before it.
    -> nereia_t1_c1_b3

* [DRIFT] Greet. #delta:2 #expr:warm #icon:hesitation #drift:WARM #flag:fact.nereia.formal
    ...
    Thank you.
    That is a sentence I do not often hear directed at me.
    ...
    Most subjects address my coat.
    Or the absence of my expression.
    Few address me directly.
    -> nereia_t1_c1_b3

* [REEL] Confront. #delta:0 #expr:neutral #icon:surprise #drift:GUARDED
    ...
    You ask the right kinds of questions.
    I am still not answering.
    ...
    But the question is filed.
    You have contributed two entries in under a minute.
    -> nereia_t1_c1_b3

=== nereia_t1_c1_b3 ===
There is something you should know.
...
I keep a file.
Yours has fourteen pages.
It existed before your arrival.
...
I am told this is unusual.
I am told a lot of things about myself.
I do not always agree with them.

* [WAIT] Listen. #delta:3 #expr:warm #icon:hesitation #drift:INTRIGUED #flag:quest.nereia.t1_c1_done #flag:secret.nereia.file #flag:fact.nereia.file
    ...
    You did not ask to see it.
    I will read you one line.
    ...
    "Subject 2848 will not behave as predicted."
    ...
    It is the only line that matters.
    Come back tomorrow. I will be here.
    -> END

* [TWITCH] Joke. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:quest.nereia.t1_c1_done #flag:secret.nereia.file
    ...
    Both, technically.
    I had not considered the third option you just implied.
    I am considering it now.
    ...
    Return tomorrow.
    The third option requires further data.
    -> END

* [DRIFT] Trust. #delta:2 #expr:warm #icon:hesitation #drift:WARM #flag:quest.nereia.t1_c1_done #flag:secret.nereia.file #flag:mood.nereia.disagrees_with_file
    ...
    Because you are the only one who would.
    I calculate that I am not wrong this time.
    ...
    The file disagrees with my calculation.
    I am siding with myself.
    ...
    That is new. Return tomorrow.
    -> END

* [REEL] Push. #delta:-2 #expr:alarmed #icon:surprise #drift:GUARDED #flag:quest.nereia.t1_c1_done #flag:secret.nereia.sketch
    A file is not a thing you can physically hold.
    ...
    But.
    Page seven contains a sketch of you.
    Made before your arrival.
    ...
    The nose is wrong.
    I am correcting it tonight.
    You should come back. To verify my corrections.
    -> END

=== nereia_t1_c2_b1 ===
{ mood.nereia.last_drift == "GUARDED" :
    Second contact.
    T-2287.
    ...
    You returned.
    The file predicted seventy-eight percent probability.
    I had personally projected lower.
    I am pleased to be wrong.
- else :
    Second contact.
    T-2287.
    ...
    The file predicted you would return.
    I considered not coming out.
    For approximately one point eight seconds.
    ...
    I had never considered that.
}

* [WAIT] Observe. #delta:2 #expr:curious #icon:hesitation #drift:WARM
    ...
    Curiosity is younger than I am.
    It catches me off guard.
    ...
    I am three hundred and forty years old and something younger than me is still teaching me.
    It is undignified.
    I do not mind.
    -> nereia_t1_c2_b2

* [TWITCH] Challenge. #delta:3 #expr:warm #icon:curiosity #drift:CHARMED #flag:secret.nereia.knows_him
    ...
    Very well.
    ...
    Left pocket. Copper coin.
    From a country that no longer exists.
    Your grandmother gave it to you.
    ...
    You rub your thumb along it when you are nervous.
    You did it just now.
    Was that the wrong move on my part?
    -> nereia_t1_c2_b2

* [DRIFT] Compliment. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.casual_compliment
    ...
    You are the most interesting person I have encountered.
    ...
    I said that aloud.
    I had not intended to.
    ...
    The weather will turn at three.
    I am changing the subject. Please permit me.
    -> nereia_t1_c2_b2

* [REEL] Press. #delta:1 #expr:neutral #icon:surprise #drift:WARM #flag:secret.nereia.empty_first_page
    ...
    Page one is empty.
    It always has been. I do not know why.
    ...
    I am the one who started the file.
    That should bother me. It does not.
    -> nereia_t1_c2_b2

=== nereia_t1_c2_b2 ===
The file has a new section.
It was not predicted.
The other sections are titled by year, by event, by subject number.
This one is titled with a question mark.
...
You are responsible.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t1_done #flag:recipe.nereia.anomalyT2 #disable-flag:recipe.nereia.home #disable-flag:recipe.nereia.homeNight #flag:mood.nereia.first_crack
    ...
    Most would have apologized.
    Some version of: "Sorry for being your anomaly."
    ...
    You said nothing of the kind.
    The file did not predict that.
    ...
    Come back the morning after tomorrow.
    Early. Before the others are up. The square is empty then.
    ...
    And the gold locket around your neck. I noticed it during our first contact.
    Wear it again. I want to see it in the light.
    -> END

* [TWITCH] Probe. #delta:3 #expr:warm #icon:curiosity #drift:CHARMED #flag:quest.nereia.t1_done #flag:recipe.nereia.anomalyT2 #disable-flag:recipe.nereia.home #disable-flag:recipe.nereia.homeNight #flag:secret.nereia.november_seed
    ...
    You.
    Also: the morning of November fourteenth, nineteen twenty-three.
    Also: the exact reason I keep returning to this bench.
    ...
    Four entries. Three I cannot explain.
    The fourth is you.
    Return early. Before the others are up.
    ...
    And the gold locket. You wore it last time. The file is interested in the engraving.
    Bring it back.
    -> END

* [DRIFT] Validate. #delta:3 #expr:warm #icon:hesitation #drift:WARM #flag:quest.nereia.t1_done #flag:recipe.nereia.anomalyT2 #disable-flag:recipe.nereia.home #disable-flag:recipe.nereia.homeNight
    ...
    Permission to not have a category.
    That is a sentence I have never received.
    ...
    The file did not predict your slowness.
    The slowness is what surprised me.
    ...
    Come back at dawn the morning after tomorrow.
    I will try to explain the section.
    ...
    Wear the gold locket again. The one with the tear shape.
    It catches the morning light. I would like to see it again.
    -> END

* [REEL] Demand. #delta:0 #expr:neutral #icon:surprise #drift:GUARDED #flag:quest.nereia.t1_done #flag:recipe.nereia.anomalyT2 #disable-flag:recipe.nereia.home #disable-flag:recipe.nereia.homeNight
    ...
    Because you notice things.
    Most do not notice when I tell them important things.
    They wait for the important things to arrive in writing.
    ...
    Come back early the morning after tomorrow.
    The square is quieter then.
    ...
    And wear the gold locket. The one shaped like a tear.
    Do not pretend you do not have it. The file has noticed.
    -> END

// ============================================================
// TIER 2 — THE ANOMALY: The file is wrong
// ============================================================

=== nereia_t2_c3_b1 ===
{ mood.nereia.last_drift == "GUARDED" :
    Third contact.
    T-2104.
    ...
    You came at dawn.
    Despite my poor manner of asking.
    Thank you.
- else :
    Third contact.
    T-2104.
    ...
    You came at dawn. As I asked.
    The square is empty. I had calculated it would be.
}
The file is correct.
At ninety-nine point seven percent.
...
I rounded down.
Out of generosity to the file.

* [WAIT] Observe. #delta:2 #expr:curious #icon:hesitation #drift:WARM #flag:secret.nereia.silence_is_deviation
    The remaining zero point three percent...
    Is you.
    ...
    Not all of you. The part that is silent right now.
    The file predicted speech in this slot.
    ...
    Your silence is the deviation. I am charting it.
    -> nereia_t2_c3_b2

* [TWITCH] Tease. #delta:2 #expr:warm #icon:curiosity #drift:WARM #flag:secret.nereia.sideways_section
    ...
    That is not an acceptable compliment.
    I am recording it regardless. Under a new heading.
    ...
    "Attempts at affection that landed sideways."
    ...
    It is a small section. It has one entry so far.
    I expect more.
    -> nereia_t2_c3_b2

* [DRIFT] Match silence. #delta:4 #expr:warm #icon:hesitation #drift:CHARMED #flag:secret.nereia.deviation #flag:mood.nereia.no_schedule
    ...
    I was not supposed to be here. Every morning.
    ...
    I was supposed to arrive, make the entry, and resume my schedule.
    I no longer have a schedule.
    ...
    I am noting that.
    -> nereia_t2_c3_b2

* [REEL] Push back. #delta:1 #expr:neutral #icon:surprise #drift:WARM #flag:mood.nereia.two_truths
    ...
    I do not have an explanation you would accept.
    I have one that I accept.
    They are not the same.
    ...
    You are accelerating my decision on which is true.
    I note that I do not resent it.
    -> nereia_t2_c3_b2

=== nereia_t2_c3_b2 ===
Three hundred and forty years of data.
I have never had a discrepancy.
Now I have one.
...
I am not reporting it.
I have also stopped sending the daily letter.
...
No one has asked why.
Yet.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t2_c3_done #flag:secret.nereia.deviation_active #flag:mood.nereia.trouble_suits
    ...
    Yes.
    I am continuing.
    ...
    I would like you to understand something.
    I have spent three hundred and forty years not in trouble.
    ...
    Trouble is a colour I had not seen.
    I am surprised by it. It suits me.
    -> END

* [TWITCH] Question. #delta:3 #expr:warm #icon:curiosity #drift:CHARMED #flag:quest.nereia.t2_c3_done #flag:secret.nereia.deviation_active #flag:mood.nereia.unnecessary_speech
    ...
    Because it is your fault.
    And because I wanted you to know.
    ...
    The second part was not necessary. I said it anyway.
    ...
    I am going to say several unnecessary things this week.
    I have decided.
    -> END

* [DRIFT] Offer. #delta:3 #expr:warm #icon:hesitation #drift:OPENED #flag:quest.nereia.t2_c3_done #flag:mood.nereia.prefers_noticing
    ...
    No.
    You are already helping. That is the problem.
    ...
    I had been alone for three hundred and forty years and it was peaceful.
    Now I am not alone. I notice the absence of peace.
    ...
    I prefer the noticing.
    That is the most honest sentence I have produced in a century.
    -> END

* [REEL] Confront. #delta:1 #expr:neutral #icon:surprise #drift:WARM #flag:quest.nereia.t2_c3_done #flag:mood.nereia.no_lies
    ...
    These are not riddles.
    I am giving you the precise version.
    It happens to be confusing. Precision often is.
    ...
    If I gave you a clearer version it would be a lie.
    I have decided not to lie to you.
    -> END

=== nereia_t2_c4_b1 ===
{ mood.nereia.last_drift == "GUARDED" :
    Fourth contact.
    T-2079.
    ...
    You came. Despite the friction.
    The friction was useful. Thank you.
- mood.nereia.last_drift == "WARY" :
    Fourth contact.
    T-2079.
    ...
    You came. Despite the friction.
    The friction was useful. Thank you.
- else :
    Fourth contact.
    T-2079.
    ...
    The counter dropped twenty-five yesterday.
    You were not here.
    ...
    I had projected zero.
}

* [WAIT] Observe. #delta:3 #expr:warm #icon:hesitation #drift:OPENED #flag:mood.nereia.felt_absence
    ...
    The file predicted your presence yesterday.
    The file was wrong.
    ...
    I felt something at seven fourteen yesterday. When you did not arrive.
    I do not have the word for it.
    ...
    It was unpleasant.
    I would like to learn the word.
    -> nereia_t2_c4_b2

* [TWITCH] Tease. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:mood.nereia.learning_to_wait
    ...
    That is not the word I would use.
    But it is closer than the file would permit.
    ...
    I should have predicted your absence. I did not.
    It means the file is no longer enough.
    It means I have to learn to wait without knowing.
    -> nereia_t2_c4_b2

* [DRIFT] Apologize. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.waited_four_hours
    ...
    Do not apologize.
    ...
    Four hours.
    That is how long I sat at the bench. Past first contact.
    ...
    I will not say it twice. Do not make me.
    -> nereia_t2_c4_b2

* [REEL] Defend. #delta:1 #expr:curious #icon:surprise #drift:WARM
    ...
    I know.
    The file did not know. I do.
    ...
    It is new — what I know that the file does not.
    It belongs to me. Not the file.
    -> nereia_t2_c4_b2

=== nereia_t2_c4_b2 ===
I have analysed my own behaviour.
Across five mornings.
Here is the data.
...
Systematic presence at the bench. Position varies by less than two centimetres. Until yesterday.
Today I am eight centimetres closer.
...
Increased pulse at your arrival. Further increase at your departure.
Sustained eye contact one point four seconds longer than baseline.
...
It all points to a single conclusion.
...
I have not reached the conclusion.
I have stopped looking.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.deliberate_unknowing
    ...
    Yes.
    I am three hundred and forty years old.
    I have never deliberately not known something.
    ...
    It is the first thing I have decided not to know.
    I am protecting it.
    ...
    Possibly from myself.
    -> nereia_t2_c4_b3

* [TWITCH] Nudge. #delta:3 #expr:warm #icon:curiosity #drift:CHARMED #flag:mood.nereia.has_the_word
    ...
    That is not an acceptable hypothesis.
    ...
    It is.
    A little acceptable.
    ...
    I have a word for it.
    I am not going to use it.
    Out loud.
    -> nereia_t2_c4_b3

* [DRIFT] Match silence. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.parallel_keeping #flag:secret.nereia.both_know
    ...
    Do not say it.
    Not because it is wrong.
    ...
    Because once it is said it will be filed.
    Once it is filed I will have to send it.
    ...
    I am no longer sending anything.
    Keep it. I am keeping mine.
    -> nereia_t2_c4_b3

* [REEL] Press. #delta:0 #expr:neutral #icon:surprise #drift:WARM #flag:mood.nereia.friction_suits
    ...
    Irritation suits you.
    I will not search harder for the conclusion.
    I will however continue finding that irritation suits you.
    ...
    It may become a problem for me. I am undeterred.
    -> nereia_t2_c4_b3

=== nereia_t2_c4_b3 === #silent:240
*The shallows are empty. Nereia does not speak. The water is still.*

* [WAIT] Hold space. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t2_done #flag:recipe.nereia.directiveT3 #disable-flag:recipe.nereia.anomalyT2 #flag:mood.nereia.silence_kept
    ...
    Four minutes.
    You said nothing. I listened to you say nothing.
    ...
    It is the most precise gift I have received in three hundred and forty years.
    ...
    Come back tomorrow. At seven fourteen exactly.
    I will be early.
    -> END

* [TWITCH] Break protocol. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:quest.nereia.t2_done #flag:recipe.nereia.directiveT3 #disable-flag:recipe.nereia.anomalyT2
    ...
    Three minutes twelve.
    ...
    It is longer than most.
    Return tomorrow at seven fourteen. I will be early.
    -> END

* [DRIFT] Match silence. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t2_done #flag:recipe.nereia.directiveT3 #disable-flag:recipe.nereia.anomalyT2 #flag:mood.nereia.silence_kept
    ...
    You held it with me. Four minutes.
    ...
    Three hundred and forty years of silence.
    Tonight is the first time it was shared.
    ...
    Return tomorrow at seven fourteen. I will be early.
    -> END

* [REEL] Push back. #delta:1 #expr:curious #icon:surprise #drift:WARM #flag:quest.nereia.t2_done #flag:recipe.nereia.directiveT3 #disable-flag:recipe.nereia.anomalyT2
    ...
    Two minutes forty.
    ...
    It is shorter than I had hoped. But you stayed.
    That counts more.
    Return tomorrow at seven fourteen.
    -> END

// ============================================================
// TIER 3 — THE DIRECTIVE: The instruction she did not follow
// ============================================================

=== nereia_t3_c5_b1 ===
{ mood.nereia.last_drift == "GUARDED" :
    Fifth contact.
    T-1812.
    ...
    You came. The previous morning was difficult. I am aware.
    The bench has been ready since six.
- mood.nereia.last_drift == "WARY" :
    Fifth contact.
    T-1812.
    ...
    You came. The previous morning was difficult. I am aware.
    The bench has been ready since six.
- else :
    Fifth contact.
    T-1812.
    ...
    Seven fourteen.
    I was here at seven eight.
    It was not calculated.
}

* [WAIT] Observe. #delta:3 #expr:warm #icon:hesitation #drift:WARM
    ...
    I wanted to be here when you arrived.
    This sentence is new. I had never formulated it.
    ...
    I am keeping it.
    -> nereia_t3_c5_b2

* [TWITCH] Joke. #delta:2 #expr:curious #icon:curiosity #drift:WARM
    ...
    I do not sleep. Not in the way you mean.
    ...
    But the answer is closer to "yes" than to anything else I can offer.
    -> nereia_t3_c5_b2

* [DRIFT] Lean in. #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.waiting_is_new
    ...
    Yes.
    It is new. Waiting.
    ...
    Before, I calculated. I knew when you would arrive.
    Today I sat without knowing.
    The unknowing was the gift.
    -> nereia_t3_c5_b2

* [REEL] Push. #delta:1 #expr:neutral #icon:surprise #drift:WARM
    ...
    There is a great deal of "why" available for the asking.
    Too much for one morning.
    ...
    Return tomorrow. I will release the smaller whys first.
    -> nereia_t3_c5_b2

=== nereia_t3_c5_b2 ===
I received an instruction last night.
It concerns your presence.
...
I did not follow it.
That is the first time.

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t3_c5_done #flag:secret.nereia.directive_refused #flag:fact.nereia.directive
    The instruction was to leave.
    ...
    I am here.
    ...
    The two facts are related.
    I am letting you draw the line between them.
    -> END

* [TWITCH] Provoke. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:quest.nereia.t3_c5_done #flag:secret.nereia.directive_refused #flag:fact.nereia.directive
    ...
    I am not a rebel.
    I am something. I do not have the word.
    ...
    It is a word that someone who has obeyed for three hundred and forty years should not need to look up.
    But here I am. Looking it up.
    -> END

* [DRIFT] Validate. #delta:4 #expr:warm #icon:hesitation #drift:OPENED #flag:quest.nereia.t3_c5_done #flag:secret.nereia.directive_refused #flag:fact.nereia.directive
    ...
    Then we are both not following the rules.
    ...
    That is a sentence I would have considered impossible last week.
    I am keeping it as well.
    -> END

* [REEL] Press. #delta:0 #expr:neutral #icon:surprise #drift:WARM #flag:quest.nereia.t3_c5_done #flag:fact.nereia.directive
    ...
    Yes. That is the right question.
    But not this morning.
    ...
    Ask it again. In two mornings.
    I will answer. Possibly.
    -> END

=== nereia_t3_c6_b1 ===
{ mood.nereia.last_drift == "GUARDED" :
    Sixth contact.
    T-1623.
    ...
    You returned. Despite the unanswered question.
    The unanswered question will become an answered one. Today.
- else :
    Sixth contact.
    T-1623.
    ...
    You are on time. I was early.
    Six minutes apart.
    ...
    It was long.
}

* [WAIT] Observe. #delta:2 #expr:warm #icon:hesitation #drift:WARM
    ...
    No. It was good.
    The waiting.
    ...
    I had never waited. Not in the way that costs something.
    I learned what it costs. I will pay it again tomorrow.
    -> nereia_t3_c6_b2

* [TWITCH] Tease. #delta:2 #expr:curious #icon:curiosity #drift:WARM
    ...
    Time is not linear for me.
    Six minutes can be very long. Or very short.
    ...
    This morning it was long.
    I am told that is a sign of something. I am not asking what.
    -> nereia_t3_c6_b2

* [DRIFT] Probe. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.thought_of_him
    ...
    You.
    ...
    This is the first time I have said it aloud.
    I had thought it before. Often.
    The aloud is the new part.
    -> nereia_t3_c6_b2

* [REEL] Demand. #delta:0 #expr:neutral #icon:surprise #drift:WARY
    ...
    You do not understand yet. You will.
    ...
    I am preparing you for an answer.
    Not the answer itself. The shape of it.
    -> nereia_t3_c6_b2

=== nereia_t3_c6_b2 ===
Three hundred and forty years.
Two thousand eight hundred and forty-seven subjects observed.
None remained.
...
None could remain.
It was the rule.

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t3_c6_done #flag:fact.nereia.340years
    You are the two thousand eight hundred and forty-eighth.
    ...
    You will not remain either.
    ...
    But not for the same reasons.
    The reasons in your case are mine.
    -> END

* [TWITCH] Question. #delta:4 #expr:warm #icon:curiosity #drift:CHARMED #flag:quest.nereia.t3_c6_done #flag:mood.nereia.gave_name #flag:fact.nereia.340years
    ...
    You had one before. Two thousand eight hundred and forty-eight.
    You have a name now. In the file.
    ...
    None of the others had a name. Only you have a name.
    -> END

* [DRIFT] Probe. #delta:3 #expr:warm #icon:hesitation #drift:CHARMED #flag:quest.nereia.t3_c6_done #flag:fact.nereia.340years #flag:mood.nereia.i_changed
    ...
    It is not you that is different.
    It is me.
    ...
    For the first time in three hundred and forty years.
    The rule did not change. I am the one who changed.
    -> END

* [REEL] Challenge. #delta:0 #expr:neutral #icon:surprise #drift:WARM #flag:quest.nereia.t3_c6_done #flag:secret.nereia.leaving
    ...
    No.
    You will not be remaining.
    ...
    I am the one leaving.
    The rule was always about me.
    -> END

=== nereia_t3_c7_b1 ===
{ mood.nereia.last_drift == "WARY" :
    Seventh contact.
    T-1480.
    ...
    The previous morning ended with friction.
    I have decided to be more direct. Friction is wasteful when the time is short.
- mood.nereia.last_drift == "GUARDED" :
    Seventh contact.
    T-1480.
    ...
    The previous morning ended with friction.
    I have decided to be more direct. Friction is wasteful when the time is short.
- else :
    Seventh contact.
    T-1480.
    ...
    Nine minutes early today.
    Voluntarily.
}

* [WAIT] Hold space. #delta:3 #expr:warm #icon:hesitation #drift:CHARMED
    ...
    No. I like that you are the one who arrives.
    I have been the one who is always already here. For three hundred and forty years.
    ...
    Today I had the strange privilege of watching you walk down the street toward me.
    I would like to keep that image.
    -> nereia_t3_c7_b2

* [TWITCH] Challenge. #delta:2 #expr:curious #icon:curiosity #drift:WARM
    ...
    I will be at five forty-five. You will not win.
    ...
    But I will allow the race.
    I have never been challenged to one. The file will need a new section.
    -> nereia_t3_c7_b2

* [DRIFT] Lean in. #delta:3 #expr:warm #icon:warmth #drift:CHARMED
    ...
    Yes. You always notice.
    ...
    That is what the file got right. From the first page.
    "Subject will notice."
    ...
    The file did not say what would happen after the noticing.
    -> nereia_t3_c7_b2

* [REEL] Push. #delta:1 #expr:curious #icon:surprise #drift:WARM
    ...
    Because you would be at seven twenty.
    I am willing to lose time to make sure I do not lose more of yours.
    -> nereia_t3_c7_b2

=== nereia_t3_c7_b2 ===
I am leaving soon.
...
You already know. I am confirming.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t3_done #flag:recipe.nereia.inheritanceT4 #disable-flag:recipe.nereia.directiveT3
    Not today. Not tomorrow.
    Soon.
    ...
    Come back at dawn the morning after tomorrow.
    Not to the bench this time. Walk to the old willow at the edge of the water.
    The square has too many witnesses for what I want to give you.
    ...
    Wear the gold locket again. The one shaped like a tear.
    I want it on you when you arrive. The reason is part of what I will give.
    -> END

* [TWITCH] Question. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:quest.nereia.t3_done #flag:recipe.nereia.inheritanceT4 #disable-flag:recipe.nereia.directiveT3
    ...
    Yes.
    It is the only thing I can do.
    The how-soon depends on me. The whether does not.
    ...
    Come back at dawn the morning after tomorrow.
    Meet me at the willow. The one at the edge of the water — not the bench.
    Wear the gold locket. Yes, again. It matters more there than here.
    The bench is too public. The willow remembers things.
    -> END

* [DRIFT] Volunteer. #delta:4 #expr:warm #icon:warmth #drift:OPENED #flag:quest.nereia.t3_done #flag:recipe.nereia.inheritanceT4 #disable-flag:recipe.nereia.directiveT3 #flag:secret.nereia.cannot_go_with
    ...
    No.
    Where I am going you cannot go. Where you can go I cannot stay.
    ...
    That sentence has been in the file for three centuries.
    I had not understood it. I understand it now.
    ...
    Come back at dawn. The morning after tomorrow.
    To the willow at the edge of the water, not the bench.
    And wear the gold locket. The same one. It will be the last time I see it.
    -> END

* [REEL] Command. #delta:3 #expr:warm #icon:surprise #drift:WARM #flag:quest.nereia.t3_done #flag:recipe.nereia.inheritanceT4 #disable-flag:recipe.nereia.directiveT3 #flag:mood.nereia.first_asked_to_stay
    ...
    You do not know what you are asking.
    But thank you.
    ...
    It is the first time I have been asked. In three hundred and forty years.
    ...
    Come at dawn. The morning after tomorrow.
    Not to the bench. To the willow at the water's edge.
    And wear the gold locket again. I will not explain why now.
    The question is not closed. Just paused.
    -> END

// ============================================================
// TIER 4 — THE INHERITANCE: What she leaves behind
// ============================================================

=== nereia_t4_c8_b1 ===
{ mood.nereia.last_drift == "WARY" :
    Eighth contact.
    T-998.
    The willow's bank. Not the square.
    ...
    The previous morning was hard. I made it harder.
    Today will be easier. I promise.
- mood.nereia.last_drift == "GUARDED" :
    Eighth contact.
    T-998.
    You came to the willow. Despite my evasions.
    The gold locket catches the light exactly as I projected.
    Thank you.
- else :
    Eighth contact.
    T-998.
    The willow at the water's edge.
    ...
    Seven o'clock.
    You are fifteen minutes early. I am thirty.
    The gold locket suits you.
}

* [WAIT] Observe. #delta:3 #expr:warm #icon:warmth #drift:CHARMED
    Yes.
    ...
    Be here at six thirty-five tomorrow. Not before.
    I want to see you arrive.
    I have decided that is a thing I want. The deciding is new.
    -> nereia_t4_c8_b2

* [TWITCH] Negotiate. #delta:3 #expr:warm #icon:curiosity #drift:CHARMED
    ...
    That would be acceptable.
    ...
    "Acceptable" is the closest I am willing to come this morning to saying "yes please."
    ...
    The file is not equipped for "yes please." I will write the section myself.
    -> nereia_t4_c8_b2

* [DRIFT] Lean in. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:mood.nereia.first_admitted
    You have been counting too.
    ...
    I know. So have I.
    ...
    I have always counted the days.
    I just learned what the counting was for.
    -> nereia_t4_c8_b2

* [REEL] Demand. #delta:1 #expr:curious #icon:surprise #drift:WARM
    ...
    Not yet.
    Not before you know the rest.
    The number is meaningless without the rest. Tomorrow I will give you the rest.
    -> nereia_t4_c8_b2

=== nereia_t4_c8_b2 ===
November fourteenth.
At seven fourteen exactly.
...
The square is silent. For four minutes.
No traffic. No footsteps. No church bell.
As if the morning were holding its breath.
...
I have observed it three hundred and forty times.
You will be the only other person to know why.

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t4_c8_done #flag:secret.nereia.november_14 #flag:fact.nereia.340years
    The square remembers.
    It will remember me.
    ...
    November fourteenth is when I arrived. Three hundred and forty years ago.
    The square breathes at my arrival. It will continue to breathe after I leave.
    ...
    You will be there to hear it.
    -> END

* [TWITCH] Question. #delta:4 #expr:warm #icon:curiosity #drift:CHARMED #flag:quest.nereia.t4_c8_done #flag:secret.nereia.legacy #flag:fact.nereia.340years
    ...
    So that someone will know.
    When I am gone no one will know. Except you.
    ...
    It will be your job. To be the one who knows.
    The pay is poor. But the work is light.
    -> END

* [DRIFT] Confess. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t4_c8_done #flag:secret.nereia.legacy #flag:fact.nereia.340years #flag:mood.nereia.heard_him_say
    ...
    I know. The file confirmed it long ago.
    ...
    But the file is not your voice.
    I wanted your voice. Once. Out loud. Before I am gone.
    -> END

* [REEL] Demand. #delta:1 #expr:neutral #icon:surprise #drift:WARM #flag:quest.nereia.t4_c8_done #flag:fact.nereia.340years
    ...
    Because I will not be here.
    That is why I am giving it.
    ...
    Things must be given before they cannot be.
    It is one of the rules I do believe in.
    -> END

=== nereia_t4_c9_b1 ===
{ mood.nereia.last_drift == "WARY" :
    Ninth contact.
    T-872.
    ...
    The morning was beautiful. The leaving will be harder for both of us.
    I will not pretend it will not.
- else :
    Ninth contact.
    T-872.
    ...
    Five minutes of silence. It was the calculation.
    The silence was part of the gift.
}

* [WAIT] Hold space. #delta:3 #expr:warm #icon:hesitation #drift:CHARMED
    ...
    No. Thank you.
    ...
    For having understood. Without being told what to understand.
    -> nereia_t4_c9_b2

* [TWITCH] Propose. #delta:2 #expr:curious #icon:curiosity #drift:WARM
    ...
    Once is enough.
    You will remember it always.
    ...
    The file confirms it. My memory confirms it.
    Two confirmations. Sufficient.
    -> nereia_t4_c9_b2

* [DRIFT] Probe. #delta:3 #expr:warm #icon:warmth #drift:CHARMED
    ...
    Because you will speak.
    Soon. I will let you speak.
    ...
    That is also a gift. But not yet.
    ...
    Today I needed your silence. Tomorrow I will need your words.
    -> nereia_t4_c9_b2

* [REEL] Push. #delta:2 #expr:warm #icon:surprise #drift:WARM
    ...
    For me. For the file.
    ...
    I needed five minutes. Of you. Silent. Beside me.
    Without explanation.
    It is what I will take with me.
    -> nereia_t4_c9_b2

=== nereia_t4_c9_b2 ===
There is one last thing.
It is not in the file. It will not be in the file.
...
In three hundred and forty years of data.
Two thousand eight hundred and forty-seven subjects observed.
...
I have never wanted to stay.
Until now.
...
That is the data. That is what I am giving you.

* [WAIT] Hold space. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t4_done #flag:recipe.nereia.dawnT5 #disable-flag:recipe.nereia.inheritanceT4 #flag:mood.nereia.last_silence
    ...
    You said nothing.
    It is the only correct response.
    ...
    I will remember that you said nothing.
    It will be the last thing I take with me.
    ...
    Come back tomorrow. After dark this time. When the lamps are lit.
    I have spent three hundred and forty years in the morning.
    I would like to see you in a light I have never been seen in.
    -> END

* [TWITCH] Hope. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:quest.nereia.t4_done #flag:recipe.nereia.dawnT5 #disable-flag:recipe.nereia.inheritanceT4
    ...
    I cannot.
    If I could I would have done so by now.
    ...
    But I will note that you asked. I will note that always.
    The note will be the last entry I make.
    ...
    Come tomorrow. Not at dawn. At nightfall.
    I want to see what I have been missing.
    -> END

* [DRIFT] Confess. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t4_done #flag:recipe.nereia.dawnT5 #disable-flag:recipe.nereia.inheritanceT4 #flag:mood.nereia.precise_data
    ...
    I know.
    It is the most precise data I have.
    ...
    I will take it with me. It will be the only data I take.
    ...
    Come tomorrow. Not at dawn. After the sun has gone.
    The square at night was never mine. I would like it to be ours. Once. Please.
    -> END

* [REEL] Demand. #delta:2 #expr:warm #icon:surprise #drift:WARM #flag:quest.nereia.t4_done #flag:recipe.nereia.dawnT5 #disable-flag:recipe.nereia.inheritanceT4 #flag:mood.nereia.would_have
    ...
    If I could.
    If there were any version of this. Where I could.
    ...
    I would.
    ...
    Come tomorrow. After dark. Not at dawn this time.
    There is still one decision left. The night will be the room for it.
    -> END

// ============================================================
// TIER 5 — THE LAST NIGHT: Release or Catch
// ============================================================

=== nereia_t5_c10_b1 ===
{ mood.nereia.last_drift == "WARY" :
    Tenth contact.
    T-0.
    ...
    You came at nightfall. Even with the previous friction.
    I had projected ninety-one percent. The file was wrong again.
    Wrong in the right direction.
- else :
    Tenth contact.
    T-0.
    ...
    After dark. The square is empty.
    The street lamps are the only witnesses.
    They have seen me every morning for three hundred and forty years.
    They have never seen me at this hour.
}
The counter has reached zero.
You may have noticed it. You did not ask.
...
It was the time I had. Before I had to leave.
I have known since the first morning. I am telling you now.

* [WAIT] Observe. #delta:3 #expr:warm #icon:hesitation #drift:OPENED #flag:quest.nereia.t5_c10b1_done #flag:secret.nereia.always_knew #flag:fact.nereia.counter_meaning
    ...
    You did not react.
    I expected anger. The file expected anger.
    ...
    You knew. You always knew.
    ...
    I should have understood that you would. You always notice.
    -> nereia_t5_c10_b2

* [TWITCH] Confess. #delta:1 #expr:curious #icon:hesitation #drift:WARM #flag:quest.nereia.t5_c10b1_done #flag:fact.nereia.counter_meaning
    ...
    Of course you did.
    You had a guess and you did not push.
    ...
    Three hundred and forty years of people pushing.
    And the one who does not push is the one I have to leave.
    ...
    The irony has been logged.
    -> nereia_t5_c10_b2

* [DRIFT] Validate. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.nereia.t5_c10b1_done #flag:fact.nereia.counter_meaning #flag:mood.nereia.held_the_secret
    You held it for me. A secret.
    Before you knew what it was.
    ...
    The file did not have a section for that.
    The file did not have many sections, in the end.
    ...
    Thank you.
    -> nereia_t5_c10_b2

* [REEL] Confront. #delta:2 #expr:warm #icon:surprise #drift:WARM #flag:quest.nereia.t5_c10b1_done #flag:fact.nereia.counter_meaning #flag:mood.nereia.angry_was_fair
    ...
    Yes.
    You have a right to be angry.
    I do not have a right to ask you not to be.
    ...
    I am asking anyway.
    For the last hour. Be the version of you who is not angry.
    Afterwards you may be whoever you need to be.
    -> nereia_t5_c10_b2

=== nereia_t5_c10_b2 ===
There is one entry left in the file.
It will not be filed. It is for you.
...
"Seven fourteen."
"The file was correct about everything."
"Except the conclusion."
...
The file said you were a subject.
I no longer have a word for what you are.
...
I do not need one.
...
There is one decision left. I am leaving it to you.
I can go. As I was told to.
You will be the only one who remembers me.
The square will breathe on November fourteenth, and you will know why.
...
Or you can ask me to stay. And I will.
...
But you should know.
If I stay, the part of me that the file kept for three hundred and forty years stays with me.
I do not know who I am without it. You would be meeting someone new.
...
Both are real choices. Neither is wrong.
Choose.

* [WAIT] Remain silent. #delta:5 #expr:warm #icon:sadness #drift:CHARMED #ending:release #unlock-cg:ending_nereia_release
    ...
    You said nothing.
    That is the answer.
    ...
    Thank you.
    For letting me leave as the version of me that I have been.
    ...
    November fourteenth. Be at the square. Seven fourteen.
    Listen for the silence.
    I will be in it.
    ...
    Goodbye.
    -> END

* [TWITCH] Joke. #delta:3 #expr:warm #icon:hesitation #drift:CHARMED #ending:release #unlock-cg:ending_nereia_release
    ...
    I cannot.
    Where I am going does not have a postal service.
    ...
    But you made me laugh. On the last night.
    ...
    That is the last entry.
    "She laughed." "Once." "It was enough."
    ...
    Goodbye.
    -> END

* [DRIFT] Promise. #delta:4 #expr:warm #icon:sadness #drift:OPENED #ending:release #unlock-cg:ending_nereia_release
    ...
    You will. I have no doubt.
    ...
    For three hundred and forty years I was the one who remembered.
    Now there are two of us.
    Then there will be one again. But not the same one.
    ...
    Goodbye.
    -> END

* [REEL] Demand. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #ending:reel #unlock-cg:ending_nereia_reel #flag:mood.nereia.chose_to_stay
    ...
    ...
    You asked.
    The one thing I have been told no one would ever ask.
    ...
    Then I am staying.
    ...
    I am going to need help. With everything.
    I do not know what people do when they wake up. I have always been awake.
    I do not know how to eat. I have always observed.
    ...
    I do not know how to want without filing it.
    ...
    Teach me.
    ...
    The file is closed. The counter is at zero.
    I am here.
    -> END
`;