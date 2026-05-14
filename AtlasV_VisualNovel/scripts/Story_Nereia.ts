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
// TIER 1 — First Contact (Casts 1–2)
// ============================================================

=== nereia_t1_c1_b1 ===
First contact.
T-2313.
...
The mist will lift in eleven minutes.
You will want to remember this light.

* [WAIT] #delta:1 #expr:curious #icon:hesitation #flag:fact.nereia.ancient
    I was already here.
    ...
    That is a different statement.
    I will let you decide which is true.
    -> nereia_t1_c1_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity #flag:fact.nereia.ancient #flag:fact.nereia.ornamental
    Apologies.
    ...
    In 1847 a heron landed on my back.
    I did not move.
    I am told this was unsettling.
    I am told I am unsettling in general.
    -> nereia_t1_c1_b2

* [DRIFT] #delta:2 #expr:curious #icon:hesitation #flag:secret.nereia.first_anomaly #flag:fact.nereia.ancient #flag:fact.nereia.ornamental
    Calculation.
    ...
    And the wind.
    And the temperature of the third stone from the bank.
    And one variable I am not naming.
    -> nereia_t1_c1_b2

* [REEL] #delta:-1 #expr:alarmed #icon:surprise
    Direct.
    ...
    Most subjects ask within the first six interactions.
    You asked in the first thirty seconds.
    ...
    I am not answering.
    I am noting that you would have made an excellent interrogator.
    -> nereia_t1_c1_b2


=== nereia_t1_c1_b2 ===
My name is Nereia.
...
It is the name I give.
Nereia.
Use that one.

* [WAIT] #delta:3 #expr:curious #icon:hesitation #flag:mood.nereia.fourth_person #flag:fact.nereia.formal
    ...
    You pronounced it correctly.
    ...
    That is rare.
    Most distort it.
    ...
    You are the fourth person in 340 years to pronounce it correctly on the first attempt.
    I am noting.
    -> nereia_t1_c1_b3

* [TWITCH] #delta:1 #expr:curious #icon:curiosity #flag:secret.nereia.chosen_name #flag:fact.nereia.formal
    Thank you.
    ...
    I chose it.
    ...
    Not at first.
    It took time.
    -> nereia_t1_c1_b3

* [DRIFT] #delta:2 #expr:curious #icon:hesitation #flag:fact.nereia.formal
    Nereia.
    ...
    In this space-time.
    -> nereia_t1_c1_b3

* [REEL] #delta:0 #expr:neutral #icon:surprise
    ...
    Interesting question.
    ...
    I am not answering that one either.
    ...
    You keep your momentum.
    I am noting that as well.
    -> nereia_t1_c1_b3


=== nereia_t1_c1_b3 ===
I have a file on you.
It existed before your arrival.
...
Fourteen pages.
I am told this is unusual for someone who did not yet exist.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:secret.nereia.file
    No.
    ...
    I will read you one line.
    ...
    'Subject 2848 will not behave as predicted.'
    ...
    It is the only line that matters.
    Everything else is mass.
    -> END

* [TWITCH] #delta:1 #expr:curious #icon:curiosity #flag:secret.nereia.file
    Neither.
    ...
    Both.
    ...
    I had not considered the third option.
    I am considering it now.
    ...
    It will take some time.
    -> END

* [DRIFT] #delta:2 #expr:curious #icon:curiosity #flag:secret.nereia.file #flag:mood.nereia.disagrees_with_file
    ...
    Because you are the only one who would believe me.
    ...
    I have been wrong about that before.
    I calculate that I am not wrong this time.
    ...
    The file disagrees with my calculation.
    I am siding with myself.
    -> END

* [REEL] #delta:-1 #expr:alarmed #icon:surprise #flag:secret.nereia.sketched_him
    It is not a thing you can see.
    ...
    But.
    ...
    Page seven contains a sketch of you made before your arrival.
    Approximately accurate.
    The nose is wrong.
    ...
    I am updating it.
    -> END


=== nereia_t1_c2_b1 ===
First contact.
T-2287.
...
I considered not surfacing.
...
For approximately 1.8 seconds.
I had never considered that.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:fact.nereia.counter
    ...
    Curiosity is younger than I am.
    It catches me off guard.
    ...
    I am 340 years old and something younger than me is still teaching me.
    It is undignified.
    ...
    I do not mind.
    -> nereia_t1_c2_b2

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #flag:secret.nereia.knows_him #flag:fact.nereia.counter
    Humour.
    ...
    I am mastering this concept.
    ...
    A copper coin from a country that no longer exists.
    Your grandmother gave it to you.
    You have not removed it from that pocket in four years.
    ...
    Was that the wrong answer?
    -> nereia_t1_c2_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.casual_compliment #flag:fact.nereia.counter
    You are the most interesting person I have encountered.
    ...
    The mist is denser to the south.
    It will pass in four minutes.
    -> nereia_t1_c2_b2

* [REEL] #delta:0 #expr:neutral #icon:surprise #flag:secret.nereia.empty_first_page
    ...
    You have asked twice now.
    ...
    I am beginning to believe you mean it.
    ...
    Page one is empty.
    ...
    It always has been.
    I do not know why.
    I am the one who started the file.
    -> nereia_t1_c2_b2


=== nereia_t1_c2_b2 ===
The file has a new section.
It was not predicted.
...
Uncategorised section.
...
The other sections are titled by year, by phenomenon, by subject number.
This one is titled with a question mark.
...
It is your fault.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.first_crack #flag:fact.nereia.file
    No.
    ...
    It is the right answer regardless.
    ...
    It is also the answer the file predicted.
    ...
    You said it slowly.
    The file did not predict the slowness.
    I am keeping it.
    -> END

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #flag:mood.nereia.first_crack #flag:secret.nereia.november_14_seed #flag:fact.nereia.file
    You.
    ...
    Also: the morning of November 14th, 1923.
    ...
    Also: a sound the lake made in 1991, never repeated.
    ...
    Also: the exact reason I keep returning here.
    ...
    Four entries.
    I am noticing for the first time that you make the fourth.
    ...
    Three I cannot explain.
    The fourth is you.
    -> END

* [DRIFT] #delta:2 #expr:curious #icon:curiosity #flag:fact.nereia.file
    No.
    ...
    But you can be it.
    ...
    You are being it.
    Right now.
    ...
    That is sufficient access.
    -> END

* [REEL] #delta:0 #expr:neutral #icon:surprise
    ...
    Yes.
    ...
    I just told you.
    ...
    I told you because you would notice.
    Most do not notice.
    ...
    I file this as data point one in your favour.
    -> END


// ============================================================
// TIER 2 — The Anomaly (Casts 3–4)
// ============================================================

=== nereia_t2_c3_b1 ===
First contact.
T-2104.
...
The file is correct.
At 99.7%.
...
I rounded down.
Out of generosity to the file.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:secret.nereia.silence_is_deviation
    You.
    ...
    Not all of you.
    Part.
    ...
    The part that is silent right now.
    The file predicted speech.
    ...
    Your silence is the deviation.
    -> nereia_t2_c3_b2

* [TWITCH] #delta:2 #expr:curious #icon:curiosity
    That is not an acceptable compliment.
    ...
    I am recording it regardless.
    ...
    Under: 'attempts at affection that landed sideways.'
    It is a small section.
    ...
    It has one entry.
    -> nereia_t2_c3_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:secret.nereia.deviation #flag:mood.nereia.no_schedule
    The file predicted your presence.
    Not mine.
    ...
    I was not supposed to be here.
    Every morning.
    ...
    I was supposed to surface for first contact.
    Make the entry.
    Submerge.
    Resume my schedule.
    ...
    I no longer have a schedule.
    ...
    I am noting that.
    -> nereia_t2_c3_b2

* [REEL] #delta:1 #expr:neutral #icon:surprise #flag:mood.nereia.two_truths
    ...
    I do not have an explanation you would accept.
    ...
    I have one that I accept.
    It is not the same.
    ...
    I keep both.
    I have not decided which is true.
    ...
    You are accelerating that decision.
    I note that I do not resent it.
    -> nereia_t2_c3_b2


=== nereia_t2_c3_b2 ===
I have 340 years of data.
I have never had a discrepancy.
Now I have a discrepancy.
...
I am not reporting it.
...
I have also stopped sending the daily packet.
Three days ago.
...
I have not been asked why.
Yet.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:secret.nereia.deviation_active #flag:mood.nereia.trouble_suits
    Yes.
    ...
    I am continuing.
    ...
    I would like you to understand something.
    I have spent 340 years not in trouble.
    ...
    Trouble is a colour I had not seen.
    I am surprised by it.
    ...
    It suits me.
    -> END

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #flag:secret.nereia.deviation_active #flag:mood.nereia.unnecessary_speech
    Because it is your fault.
    ...
    And because I wanted you to know.
    ...
    The second point was not necessary.
    I said it anyway.
    ...
    I am going to say several unnecessary things this morning.
    I have decided.
    ...
    Today is for that.
    -> END

* [DRIFT] #delta:3 #expr:warm #icon:curiosity #flag:mood.nereia.prefers_noticing
    No.
    ...
    You are already helping.
    That is the problem.
    ...
    I had been alone for 340 years and it was peaceful.
    Now I am not alone.
    I notice the absence of peace.
    ...
    I prefer the noticing.
    ...
    That is the most honest sentence I have produced in a century.
    -> END

* [REEL] #delta:1 #expr:neutral #icon:surprise #flag:mood.nereia.no_lies
    ...
    These are not riddles.
    ...
    I am giving you the precise version.
    It happens to be confusing.
    Precision often is.
    ...
    If I gave you a clearer version it would be a lie.
    ...
    I have decided not to lie to you.
    ...
    It is new.
    -> END


=== nereia_t2_c4_b1 ===
...
First contact.
T-2079.
...
The counter dropped 25 yesterday.
You were not here.
...
I had projected zero.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.felt_absence
    No.
    ...
    The file predicted your presence.
    The file was wrong.
    ...
    It is the first time in 340 years it has been wrong.
    ...
    I felt something at 7:14 yesterday.
    When you did not arrive.
    ...
    I do not have the word.
    ...
    It was unpleasant.
    -> nereia_t2_c4_b2

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #flag:mood.nereia.learning_to_wait
    No.
    ...
    I am angry with myself.
    ...
    I should have predicted your absence.
    I did not.
    ...
    It means the file is no longer enough.
    ...
    It means I have to learn to wait without knowing.
    ...
    I had never had to.
    -> nereia_t2_c4_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.waited_four_hours
    ...
    Four hours.
    ...
    I will not say it twice.
    -> nereia_t2_c4_b2

* [REEL] #delta:1 #expr:curious #icon:surprise
    I know.
    ...
    The file did not know.
    I do.
    ...
    It is new — what I know that the file does not.
    ...
    It belongs to me.
    -> nereia_t2_c4_b2


=== nereia_t2_c4_b2 ===
I have analysed my own behaviour.
Across five mornings.
...
Here is the data.
...
Systematic presence at coordinate 47.3, 12.8.
Coordinate variation under two centimetres. Until yesterday.
Today I am eight centimetres closer.
...
Increased cardiac frequency detected at your arrival.
Further increase at your departure.
...
Pupil dilation measured at first eye contact.
Sustained 1.4 seconds longer than the baseline.
...
I have not finished compiling.
There is a great deal of it.
...
It is all consistent.
It points to a single conclusion.
...
I have not found the conclusion.
...
I have stopped looking.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.uncategorized #flag:mood.nereia.deliberate_unknowing
    Yes.
    ...
    I am 340 years old.
    I have never deliberately not known something.
    ...
    It is the first thing I have decided not to know.
    ...
    I am protecting it.
    ...
    I do not yet know from what.
    ...
    Possibly from myself.
    -> nereia_t2_c4_b3

* [TWITCH] #delta:2 #expr:warm #icon:curiosity #flag:mood.nereia.uncategorized #flag:mood.nereia.has_the_word
    ...
    It is not amusing.
    ...
    It is.
    A little amusing.
    ...
    And a little something else.
    ...
    I do not have a name for that something else.
    ...
    Or I do.
    ...
    I am not going to use it.
    ...
    Out loud.
    -> nereia_t2_c4_b3

* [DRIFT] #delta:4 #expr:warm #icon:hesitation #flag:mood.nereia.parallel_keeping #flag:secret.nereia.both_know
    ...
    Do not say it.
    ...
    Not because it is wrong.
    ...
    Because once it is said it will be filed.
    ...
    Once it is filed I will have to send it.
    ...
    I am no longer sending anything.
    ...
    Keep it.
    ...
    I am keeping mine.
    -> nereia_t2_c4_b3

* [REEL] #delta:0 #expr:neutral #icon:surprise #flag:mood.nereia.attracted_to_friction
    ...
    That is not an appropriate response.
    ...
    I am noting your irritation.
    ...
    Irritation suits you.
    ...
    I am noting that I find that it suits you.
    ...
    I will not search harder.
    ...
    I will however continue finding that irritation suits you.
    ...
    It may become a problem for me.
    I am undeterred.
    -> nereia_t2_c4_b3


=== nereia_t2_c4_b3 === #silent:240
*She does not speak. The float is still.*

* [WAIT] #delta:4 #expr:warm #icon:hesitation #flag:mood.nereia.silence_kept
    ...
    Four minutes.
    ...
    You said nothing.
    ...
    I listened to you say nothing.
    ...
    It is the most precise thing I have received in 340 years.
    -> END

* [TWITCH] #delta:0 #expr:curious #icon:hesitation
    ...
    You spoke.
    ...
    It is not a problem.
    ...
    I am noting the threshold.
    Three minutes twelve.
    ...
    It is longer than most.
    -> END

* [DRIFT] #delta:0 #expr:curious #icon:hesitation
    ...
    You spoke.
    ...
    It is not a problem.
    ...
    I am noting the threshold.
    Three minutes twelve.
    ...
    It is longer than most.
    -> END

* [REEL] #delta:0 #expr:curious #icon:hesitation
    ...
    You spoke.
    ...
    It is not a problem.
    ...
    I am noting the threshold.
    Three minutes twelve.
    ...
    It is longer than most.
    -> END


// ============================================================
// TIER 3 — The Directive (Casts 5–7)
// ============================================================

=== nereia_t3_c5_b1 ===
First contact.
7:14.
...
I was here at 7:08.
It was not calculated.

* [WAIT] #delta:2 #expr:warm #icon:hesitation
    I wanted to be here when you arrived.
    ...
    This sentence is new.
    I had never formulated it.
    -> nereia_t3_c5_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    No.
    ...
    But that is closer than previous explanations.
    -> nereia_t3_c5_b2

* [DRIFT] #delta:2 #expr:warm #icon:hesitation
    Yes.
    ...
    It is new.
    Waiting.
    Before, I calculated.
    -> nereia_t3_c5_b2

* [REEL] #delta:0 #expr:neutral #icon:surprise
    A great deal.
    Too much for this morning.
    ...
    Return.
    -> nereia_t3_c5_b2


=== nereia_t3_c5_b2 ===
I received an instruction last night.
...
It concerns your presence.
...
I did not follow it.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:secret.nereia.directive_refused #flag:fact.nereia.directive
    To leave.
    ...
    I am here.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #flag:secret.nereia.directive_refused #flag:fact.nereia.directive
    No.
    ...
    I am something.
    I do not have the word.
    -> END

* [DRIFT] #delta:1 #expr:curious #icon:curiosity
    You do not need to know.
    ...
    You did not ask the right question.
    Ask the right question.
    -> END

* [REEL] #delta:0 #expr:neutral #icon:surprise
    Yes.
    ...
    That is the right question.
    But not now.
    -> END


=== nereia_t3_c6_b1 ===
...
You are on time.
I am early.
...
Six minutes apart.
It was long.

* [WAIT] #delta:2 #expr:warm #icon:hesitation
    No.
    ...
    It was good.
    The waiting.
    ...
    I had never waited.
    -> nereia_t3_c6_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    For you.
    ...
    For me it is unusual.
    Time is not linear for me.
    Six minutes can be very long.
    -> nereia_t3_c6_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.thought_of_you
    You.
    ...
    This is the first time I have said it aloud.
    I had thought it before.
    Often.
    -> nereia_t3_c6_b2

* [REEL] #delta:-1 #expr:neutral #icon:surprise
    No.
    ...
    You do not understand yet.
    You will.
    -> nereia_t3_c6_b2


=== nereia_t3_c6_b2 ===
340 years.
...
I have observed 2847 subjects in this lake.
None remained.
...
None could remain.
...
It was the rule.

* [WAIT] #delta:2 #expr:warm #icon:hesitation #flag:fact.nereia.340years
    You are the 2848th.
    ...
    You will not remain either.
    ...
    But not for the same reasons.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:curiosity #flag:mood.nereia.gave_name #flag:fact.nereia.340years
    You had one before.
    ...
    You have a name now.
    In the file.
    ...
    None of the others had a name.
    -> END

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.changed #flag:fact.nereia.340years
    It is not you that is different.
    ...
    It is me.
    For the first time in 340 years.
    -> END

* [REEL] #delta:0 #expr:neutral #icon:surprise #flag:secret.nereia.leaving
    No.
    ...
    I am the one leaving.
    -> END


=== nereia_t3_c7_b1 ===
...
Nine minutes.
It is more.
Voluntarily.

* [WAIT] #delta:2 #expr:warm #icon:hesitation
    No.
    ...
    I like that you are the one who arrives.
    -> nereia_t3_c7_b2

* [TWITCH] #delta:2 #expr:warm #icon:curiosity
    ...
    I will be at 5:45.
    You will not win.
    -> nereia_t3_c7_b2

* [DRIFT] #delta:2 #expr:warm #icon:hesitation
    I know.
    ...
    You will.
    -> nereia_t3_c7_b2

* [REEL] #delta:1 #expr:curious #icon:curiosity
    Because you would be at 5:50.
    ...
    The file confirms it.
    -> nereia_t3_c7_b2


=== nereia_t3_c7_b2 ===
I am leaving soon.
...
You already know.
I am confirming.

* [WAIT] #delta:3 #expr:warm #icon:hesitation
    Not today.
    ...
    Not tomorrow.
    ...
    Soon.
    -> END

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    Yes.
    ...
    It is the only thing I can do.
    -> END

* [DRIFT] #delta:3 #expr:warm #icon:curiosity #flag:secret.nereia.cannot_go_with
    No.
    ...
    Where I am going you cannot go.
    Where you can go I cannot stay.
    -> END

* [REEL] #delta:0 #expr:warm #icon:surprise #flag:mood.nereia.first_asked_to_stay
    ...
    You do not know what you are asking.
    ...
    But thank you.
    It is the first time I have been asked.
    -> END


// ============================================================
// TIER 4 — The Inheritance (Casts 8–9)
// ============================================================

=== nereia_t4_c8_b1 ===
First contact.
7:00.
...
You are 15 minutes early.
I am 30.

* [WAIT] #delta:2 #expr:warm #icon:hesitation
    Yes.
    ...
    Be here at 6:35.
    Not before.
    I want to see you arrive.
    -> nereia_t4_c8_b2

* [TWITCH] #delta:2 #expr:warm #icon:curiosity
    ...
    That would be acceptable.
    -> nereia_t4_c8_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:mood.nereia.first_admitted
    I know.
    ...
    So am I.
    I just learned this.
    -> nereia_t4_c8_b2

* [REEL] #delta:1 #expr:curious #icon:curiosity
    Not yet.
    ...
    Not before you know everything.
    -> nereia_t4_c8_b2


=== nereia_t4_c8_b2 ===
November 14th.
At 7:14 exactly.
The lake stops.
For 4 minutes.
...
No current. No movement.
As if the lake were breathing.
...
I have observed it 340 times.
You will be the only one to know why.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:secret.nereia.november_14
    The lake remembers.
    ...
    It will remember me.
    November 14th is when I arrived.
    340 years ago.
    ...
    The lake breathes at my arrival.
    It will continue to breathe after I leave.
    -> END

* [TWITCH] #delta:3 #expr:warm #icon:curiosity #flag:secret.nereia.november_14 #flag:secret.nereia.legacy
    So that someone will know.
    ...
    When I am gone no one will know.
    Except you.
    -> END

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:secret.nereia.november_14 #flag:secret.nereia.legacy
    I know.
    ...
    The file confirms it.
    ...
    But I wanted to hear you say it.
    -> END

* [REEL] #delta:0 #expr:neutral #icon:surprise
    ...
    I will not be here.
    That is why I am giving it to you.
    -> END


=== nereia_t4_c9_b1 ===
...
Five minutes of silence.
It was the calculation.
...
The silence was part of the gift.

* [WAIT] #delta:2 #expr:warm #icon:hesitation
    No.
    ...
    Thank you.
    For having understood.
    -> nereia_t4_c9_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    ...
    Once is enough.
    You will remember it always.
    ...
    It is in the file.
    -> nereia_t4_c9_b2

* [DRIFT] #delta:2 #expr:warm #icon:hesitation
    You will speak.
    ...
    Soon.
    I will let you speak.
    That is also a gift.
    -> nereia_t4_c9_b2

* [REEL] #delta:1 #expr:curious #icon:curiosity
    ...
    For me.
    For the file.
    ...
    I needed five minutes.
    Of you. Silent. Beside me.
    Without explanation.
    -> nereia_t4_c9_b2


=== nereia_t4_c9_b2 ===
I have one last thing to give you.
...
It is not in the file.
It will not be in the file.
...
In 340 years of data.
2847 subjects observed.
I have never wanted to stay.
...
Until now.
...
That is the data.
That is what I am giving you.

* [WAIT] #delta:4 #expr:warm #icon:hesitation #flag:secret.nereia.final_approach #flag:mood.nereia.last_silence
    You said nothing.
    ...
    It is the only correct response.
    ...
    I will remember that you said nothing.
    It will be the last thing I take with me.
    -> END

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    I cannot.
    ...
    If I could I would have done so by now.
    ...
    But I will note that you asked.
    Always.
    -> END

* [DRIFT] #delta:4 #expr:warm #icon:hesitation #flag:secret.nereia.final_approach
    ...
    I know.
    ...
    It is the most precise data I have.
    I will take it with me.
    -> END

* [REEL] #delta:1 #expr:warm #icon:surprise #flag:mood.nereia.would_have
    ...
    If I could.
    If there were any version of this.
    Where I could.
    ...
    I would.
    -> END


// ============================================================
// TIER 5 — The Last Morning (Cast 10)
// ============================================================

=== nereia_t5_c10_b1 ===
First contact.
5:00.
...
Today is the last entry in the file.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:nereia.release_ready
    Yes.
    ...
    I told you it would be early.
    I am keeping my word.
    -> nereia_t5_c10_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity #flag:nereia.release_ready
    I said tomorrow.
    ...
    It is now tomorrow.
    I was honest.
    -> nereia_t5_c10_b2

* [DRIFT] #delta:3 #expr:warm #icon:hesitation #flag:nereia.release_ready
    I know.
    ...
    I gave you all the time I had.
    I gave you 340 years of time.
    It will have to be enough.
    -> nereia_t5_c10_b2

* [REEL] #delta:0 #expr:warm #icon:surprise #flag:nereia.release_ready
    ...
    I know.
    ...
    Yes.
    -> nereia_t5_c10_b2


=== nereia_t5_c10_b2 ===
I have one last entry.
It will not be filed.
It is for you.
...
First contact.
7:14.
The file was correct about everything.
Except the conclusion.
...
The file said you were a subject.
...
I no longer have a word for what you are.
...
I do not need one.

-> END

`;
