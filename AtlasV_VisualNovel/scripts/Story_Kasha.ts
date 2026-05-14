/**
 * Story_Kasha — Kasha's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   kasha_t<tier>_c<cast>_b<beat>
 *   e.g. kasha_t1_c1_b1 = Tier 1, Cast 1, Beat 1
 *
 * Choice tags:
 *   #delta:N      affection delta (integer, may be negative)
 *   #expr:NAME    result expression — neutral | curious | warm | alarmed
 *   #icon:NAME    emotion icon — curiosity | surprise | warmth | shock |
 *                                hesitation | contentment | sadness |
 *                                boredom | delight | none
 *   #drift:NAME   result drift — Warm | Charmed | Wary | Angry |
 *                                Satisfied | Neutral | Intrigued |
 *                                Guarded | Raw | Opened | ...
 *   #flag:KEY     flag to set true (multiple #flag tags allowed per choice)
 *
 * Diverts:
 *   -> kasha_t1_c1_b2     jump to that node
 *   -> END                end of cast (departure phase begins)
 *   -> DONE               end of game (final ending sequence)
 *
 * Delta calibration (scale -10 / +50):
 *   +5  breakthrough moment, aveu, silence partagé profond
 *   +4  réaction très chaude, vraie ouverture
 *   +3  positif sincère, intérêt marqué
 *   +2  légèrement positif, toléré avec plaisir
 *   +1  neutre-positif, accepté
 *    0  deflection pure, ni chaud ni froid
 *   -1  légère gêne, mise mal à l'aise
 *   -2  blessée, froissée
 *   -3  rejet marqué, heurte quelque chose de profond
 *
 * Cumulative (worst / best play):
 *   Cast 1: -2 / +6   Cast 2: -2 / +7   Cast 3: -4 / +7
 *   Cast 4: +2 / +8   Cast 5: -2 / +7   Cast 6: -2 / +8
 *   Cast 7: +3 / +7   Cast 8: -1 / +7   Cast 9: +1 / +10
 *   Cast 10: -2 / +12
 *   → Drift-away (−10) reachable at C6 with worst choices
 *   → Catch (+50) reachable at C7 with best choices
 */

export const KASHA_STORY: string = `

// ============================================================
// TIER 1 — The Champion (Casts 1–2)
// ============================================================

=== kasha_t1_c1_b1 ===
Tch.
Another one.
You picked the wrong corner, you know.
This one is taken.

* [WAIT] #delta:0 #expr:curious #icon:curiosity #flag:fact.kasha.appearance #flag:fact.kasha.champion
    ...What.
    What is that. That face.
    Don't just stand there looking— ugh, whatever. Stay if you want.
    Not like I care.
    -> kasha_t1_c1_b2

* [TWITCH] #delta:3 #expr:curious #icon:surprise #flag:kasha.first_nickname #flag:fact.kasha.appearance #flag:fact.kasha.champion
    Hah—
    Oh, you've got a mouth. Good.
    I was getting bored.
    Don't disappoint me, baka.
    -> kasha_t1_c1_b2

* [DRIFT] #delta:1 #expr:curious #icon:hesitation #flag:fact.kasha.appearance #flag:fact.kasha.champion
    Wait— no, wait.
    I didn't say leave.
    I said it was taken. That's different.
    ...Tch. Forget it. Stay.
    -> kasha_t1_c1_b2

* [REEL] #delta:3 #expr:warm #icon:warmth #flag:kasha.first_test_passed #flag:fact.kasha.appearance #flag:fact.kasha.champion
    ...
    Heh.
    You're either brave or you're stupid.
    I'll figure out which.
    -> kasha_t1_c1_b2


=== kasha_t1_c1_b2 ===
So you're the new face.
Everyone's been whispering about it.
'Someone new is around. Someone who stays.'
Pff. As if that's interesting.
...It's a little interesting.

* [WAIT] #delta:1 #expr:curious #icon:hesitation #flag:kasha.knows_nereia #flag:fact.kasha.baka
    The usual ones.
    The silent one keeps a— she's got a list or something. Files, whatever.
    Creepy. Don't talk to her.
    Actually, do. See if she even answers.
    ...She'll answer you. She doesn't answer me.
    -> END

* [TWITCH] #delta:3 #expr:curious #icon:curiosity #flag:mood.kasha.third_person_slip #flag:fact.kasha.baka #flag:fact.kasha.third_person
    HAH—
    Of who. The walking statue?
    Please.
    Kasha doesn't get jealous.
    ...I just said my own name in third person, didn't I.
    Forget that.
    -> END

* [DRIFT] #delta:-2 #expr:alarmed #icon:surprise #flag:mood.kasha.fissure_first
    —
    ...
    What is that supposed to mean.
    Don't say weird things to people you just met, baka.
    Tch.
    -> END

* [REEL] #delta:2 #expr:curious #icon:curiosity #flag:fact.kasha.baka
    Wow. Direct.
    I like that.
    ...Wait, no. Bad. Boring question.
    Ask me something specific. Anything specific.
    I'll consider answering.
    -> END


=== kasha_t1_c2_b1 ===
You came back.
Hah. Of course you did.
I told you I wasn't done.
...Don't read into that.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:mood.kasha.first_quiet
    Yeah.
    Yeah, you are.
    ...
    Stop looking at me like that. I'm thinking.
    -> kasha_t1_c2_b2

* [TWITCH] #delta:3 #expr:curious #icon:surprise
    I MISSED— no.
    I observed your continued absence. That's different.
    Pff. 'Missed me.' Listen to yourself.
    ...You're insufferable, baka.
    Stay.
    -> kasha_t1_c2_b2

* [DRIFT] #delta:0 #expr:neutral #icon:curiosity
    I— no. I did not.
    I was going to be here regardless.
    Whether you came or not.
    ...That is not the same thing as wanting you to come.
    Stop trying to read me.
    -> kasha_t1_c2_b2

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.told_him_stay
    ...
    You're really pushing it today.
    ...
    Stay.
    Don't make me say it twice.
    -> kasha_t1_c2_b2


=== kasha_t1_c2_b2 ===
So. Things you should know.
Rule one: I'm the loudest person around here. That's not up for debate. That's a fact.
Rule two: nobody — and I mean nobody — has ever bested me.
I am the champion. Of this corner. By right.
Rule three: don't bother trying. You'll embarrass yourself.
Rule four: if you do try, do it well, because if you embarrass yourself I'll have to mock you and I'm tired today.
...
Why are you smiling.

* [WAIT] #delta:1 #expr:curious #icon:hesitation
    That's the wrong answer.
    ...
    But fine.
    Keep your reasons.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity
    Of— shut up.
    Of everything that matters.
    Don't make me list them. The list is long.
    Trust me.
    ...There's a list. There is.
    -> END

* [DRIFT] #delta:-2 #expr:neutral #icon:curiosity #flag:secret.kasha.never_challenged
    ...
    What kind of question is that.
    Of course they have. People challenge me constantly.
    ...Constantly.
    Next question.
    -> END

* [REEL] #delta:3 #expr:warm #icon:warmth #flag:mood.kasha.challenge_accepted
    ...
    To what.
    Don't say something stupid. Be specific.
    I am — I'm listening.
    Specifically.
    -> END


// ============================================================
// TIER 2 — The Test (Casts 3–4)
// ============================================================

=== kasha_t2_c3_b1 ===
Okay.
New rules.
If you want to keep showing up, you have to earn it.
I'm raising the standard.
Don't look at me like that. This is good for you.

* [WAIT] #delta:1 #expr:curious #icon:curiosity
    I— haven't decided yet.
    It will reveal itself.
    Stay alert.
    ...Don't laugh. I am being serious.
    -> kasha_t2_c3_b2

* [TWITCH] #delta:3 #expr:curious #icon:surprise
    Hah—!
    That's the right energy.
    Wrong attitude, but right energy.
    I'll allow it.
    ...
    ...You're enjoying this. Aren't you.
    -> kasha_t2_c3_b2

* [DRIFT] #delta:-1 #expr:neutral #icon:curiosity #flag:mood.kasha.fissure_widen
    Yes I do.
    ...
    Yes I do, baka.
    You wouldn't understand.
    -> kasha_t2_c3_b2

* [REEL] #delta:3 #expr:warm #icon:warmth #flag:mood.kasha.prize_admitted
    ...
    Why would you ask that.
    What — what kind of question is that.
    You don't get anything. You get to keep showing up. That's the prize.
    ...That's a real prize.
    Stop smirking.
    -> kasha_t2_c3_b2


=== kasha_t2_c3_b2 ===
Question one: who is the most important person around here.
Answer carefully.

* [WAIT] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.unmasked_briefly
    ...
    Don't say it like that.
    Say it like you're joking. Say it like a joke.
    Don't just say it.
    ...
    Pass. You pass.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:surprise
    Pff.
    Correct answer. Acceptable delivery.
    B+.
    I'm a hard grader.
    -> END

* [DRIFT] #delta:-1 #expr:neutral #icon:hesitation
    ...
    Yes.
    ...
    No.
    I don't know. Move on. Next question.
    -> END

* [REEL] #delta:-3 #expr:alarmed #icon:surprise #flag:mood.kasha.wounded_pride
    ...
    Wow.
    Get out.
    Get out of my corner.
    ...
    I'm joking. ...Mostly. Sit back down.
    But also — wow.
    -> END


=== kasha_t2_c4_b1 ===
Took you long enough.
I was about to leave.
You're lucky I'm patient.
...Don't laugh. I AM patient.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:mood.kasha.would_have_whistled
    ...
    Yeah.
    I noticed.
    ...
    Took you a minute. I was about to whistle.
    I would not have whistled.
    -> kasha_t2_c4_b2

* [TWITCH] #delta:2 #expr:curious #icon:curiosity
    —
    I did not.
    I was bored. I move when I'm bored.
    Don't read into it.
    ...Stop smirking. That was not an admission.
    -> kasha_t2_c4_b2

* [DRIFT] #delta:1 #expr:curious #icon:hesitation #flag:mood.kasha.tender_hit
    ...
    Don't say things like that.
    Just — don't.
    ...
    Sit down.
    -> kasha_t2_c4_b2

* [REEL] #delta:4 #expr:warm #icon:warmth
    Hah—
    Listen to him.
    'Stay where I can find you.' Bossy.
    ...
    Maybe.
    -> kasha_t2_c4_b2


=== kasha_t2_c4_b2 ===
About what I said. Last time.
About people challenging me constantly.
...
That was a slight exaggeration.
Slight.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:secret.kasha.never_challenged_truth #flag:fact.kasha.origin
    ...
    Significantly slight.
    ...
    Nobody challenges me, baka.
    Nobody bothers.
    ...
    I'm the champion because I'm the only one playing.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity #flag:secret.kasha.lonely #flag:fact.kasha.origin
    EXCUSE me. It is not bluffing.
    It is — strategic positioning.
    I am a strategist.
    ...I am a very lonely strategist.
    Tch.
    Forget I said that last part.
    -> END

* [DRIFT] #delta:1 #expr:curious #icon:hesitation
    Don't.
    Don't apologise for things that aren't yours.
    It's annoying.
    ...
    It's nice. But it's annoying.
    -> END

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.first_real_challenge
    ...
    You said that already.
    Last time.
    ...
    Are you actually going to.
    Or are you just going to keep saying it.
    -> END


// ============================================================
// TIER 3 — The Slip (Casts 5–7)
// ============================================================

=== kasha_t3_c5_b1 ===
Okay. So.
There was this time— no.
Forget that. There was a— no, also bad.
...
Why is this hard.
It shouldn't be hard. It's a story.

* [WAIT] #delta:3 #expr:warm #icon:hesitation #flag:mood.kasha.first_thank_you
    ...
    Don't say that.
    When people say that I take longer.
    ...
    Thank you.
    ...Don't react to that.
    -> kasha_t3_c5_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity #flag:secret.kasha.somebody_better
    Hah. Bossy.
    Fine.
    Story one. Once. Before.
    There was somebody who was better at me at everything I did.
    End of story.
    ...
    Wait. That's a bad story. Forget that one too.
    -> kasha_t3_c5_b2

* [DRIFT] #delta:2 #expr:curious #icon:hesitation #flag:mood.kasha.wants_to_tell
    ...
    I want to.
    ...
    I want to and I don't want to.
    Stop being kind. It's making it worse.
    -> kasha_t3_c5_b2

* [REEL] #delta:2 #expr:warm #icon:warmth #flag:secret.kasha.came_from_elsewhere #flag:fact.kasha.origin
    ...
    I came from somewhere else.
    Before here.
    I left it.
    The end.
    ...Don't ask follow-up questions, baka.
    -> kasha_t3_c5_b2


=== kasha_t3_c5_b2 ===
There was a person.
I'm not going to say who.
And there was another person, and the second person liked the first person more than they liked me.
It wasn't a fair fight.
...
It wasn't a fight at all, actually.
I just lost. Without playing.

* [WAIT] #delta:4 #expr:warm #icon:hesitation #flag:mood.kasha.silence_understood
    ...
    Yeah.
    ...
    That's how I felt about it too.
    -> END

* [TWITCH] #delta:-3 #expr:alarmed #icon:surprise #flag:mood.kasha.shut_down
    ...
    Wow.
    Tell me how it works, then.
    Since you know.
    ...
    Tch. Forget it. I shouldn't have said anything.
    -> END

* [DRIFT] #delta:3 #expr:curious #icon:hesitation #flag:mood.kasha.acknowledged_hurt
    ...
    Yeah.
    ...
    Yeah, it did.
    Don't make me say more about it.
    -> END

* [REEL] #delta:-2 #expr:alarmed #icon:surprise #flag:mood.kasha.do_not_measure
    ...
    Don't.
    Don't do that.
    Don't compare me to them. Don't measure me against them.
    That's the whole — that's exactly the —
    Forget it.
    -> END


=== kasha_t3_c6_b1 ===
Hey.
...
Don't say anything.
About yesterday.
I'm pretending I didn't say it.
Help me pretend.

* [WAIT] #delta:4 #expr:warm #icon:hesitation #flag:mood.kasha.thank_you_recurring
    ...
    Thank you.
    ...
    I said it again. I'm doing it more now. Stop me.
    -> kasha_t3_c6_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    ...
    Tch.
    You're cruel.
    ...
    Fine. It happened.
    But we are not doing that again. Not today.
    -> kasha_t3_c6_b2

* [DRIFT] #delta:2 #expr:curious #icon:hesitation #flag:mood.kasha.needs_noise
    ...
    Good.
    ...
    Sit down. Be loud about something else.
    I need noise.
    -> kasha_t3_c6_b2

* [REEL] #delta:0 #expr:neutral #icon:surprise #flag:mood.kasha.thanked_under_protest
    —
    Stop.
    Stop right there.
    We agreed.
    ...
    ...Thank you.
    But stop.
    -> kasha_t3_c6_b2


=== kasha_t3_c6_b2 ===
Question.
If you had to pick one of the three idiots around the corner — not me, three other idiots — to fight you in a duel, who would you pick.
Don't say a name. Describe them.
I want to test your judgment.

* [WAIT] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.melted_briefly
    ...
    That is the worst answer.
    That is the best worst answer.
    ...
    How do you do that.
    How do you say something so stupid that it works.
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity
    Hah—
    Wrong answer. There is no match for me.
    Try again.
    ...
    Actually, don't try again. That answer is fine. I was being dramatic.
    -> END

* [DRIFT] #delta:-2 #expr:alarmed #icon:surprise #flag:mood.kasha.nereia_jealousy
    ...
    You're really committed to making me jealous of her, huh.
    ...
    Fine. Pick her. See if I care.
    I don't.
    ...I do. A little. Stop.
    -> END

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.demanded_repeat
    ...
    ...
    You can't just say things like that.
    There are rules.
    ...
    Say it again.
    -> END


=== kasha_t3_c7_b1 ===
I have a question.
Don't make a thing about it.
It's a small question.
...
It's not a small question.

* [WAIT] #delta:2 #expr:curious #icon:hesitation #flag:mood.kasha.real_question_asked
    ...
    Why do you keep coming back.
    ...
    Don't say something cute. Don't say 'because of you.' I will lose my mind.
    Tell me actually.
    -> kasha_t3_c7_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    ...
    Why do you keep coming back.
    And don't be cute.
    I am asking actually.
    -> kasha_t3_c7_b2

* [DRIFT] #delta:1 #expr:curious #icon:hesitation
    ...
    Don't be generous.
    I'm trying to ask a specific thing.
    ...
    Why do you keep coming back.
    -> kasha_t3_c7_b2

* [REEL] #delta:1 #expr:curious #icon:curiosity #flag:mood.kasha.why_me
    ...
    Why.
    Why me.
    ...
    And not — you know. Not anyone else.
    -> kasha_t3_c7_b2


=== kasha_t3_c7_b2 ===
...
Tell me why you're here.

* [WAIT] #delta:5 #expr:warm #icon:warmth #flag:mood.kasha.alive_compliment_received
    ...
    ...
    That is.
    ...
    That is the worst possible thing you could have said and also the only acceptable thing.
    Get out.
    Don't get out. Stay.
    ...
    I hate you.
    (I don't.)
    -> END

* [TWITCH] #delta:2 #expr:curious #icon:curiosity
    Pff.
    Acceptable.
    True.
    I am very interesting.
    ...Thanks.
    Did I just— forget that. Forget I said that.
    -> END

* [DRIFT] #delta:4 #expr:warm #icon:hesitation #flag:secret.kasha.first_let
    ...
    ...
    That's not.
    That's not how I would have phrased it.
    ...
    But yeah.
    I do let you.
    ...
    I've never let anyone before.
    -> END

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.want_word
    ...
    Want is a strong word.
    ...
    I like that word.
    Use it more.
    -> END


// ============================================================
// TIER 4 — The Trophy (Casts 8–9)
// ============================================================

=== kasha_t4_c8_b1 ===
Okay.
Listen.
I've been thinking.
Don't comment on that. I do think. Sometimes.
...
I want to offer you something.

* [WAIT] #delta:2 #expr:warm #icon:hesitation #flag:secret.kasha.offering_self
    ...
    Me.
    ...
    I'm offering you me.
    ...
    Don't make that face. Hear me out.
    -> kasha_t4_c8_b2

* [TWITCH] #delta:1 #expr:curious #icon:curiosity
    ...
    Fine. Fine.
    I'm offering me. As a— prize. Or something.
    Don't make that face.
    I knew you'd make a face.
    -> kasha_t4_c8_b2

* [DRIFT] #delta:1 #expr:curious #icon:hesitation
    ...
    Stop being patient at me.
    It's working and I hate it.
    ...
    I want to offer you me. As — yeah. As something.
    I haven't worked out what.
    -> kasha_t4_c8_b2

* [REEL] #delta:1 #expr:curious #icon:curiosity
    ...
    I'm offering myself.
    To you.
    ...
    Don't say anything yet.
    I am not done explaining.
    -> kasha_t4_c8_b2


=== kasha_t4_c8_b2 ===
Here is the thing.
I've been the champion of this corner because nobody has ever bothered to take it from me.
I told you that already.
I'm telling you again because it matters for what I'm about to say.
...
If you wanted to. You could take it.
I'm telling you that you could.
I'm — I'm saying.
I would let you.

* [WAIT] #delta:5 #expr:warm #icon:hesitation #flag:mood.kasha.offer_understood
    ...
    I knew you'd do that.
    Just sit there. Quietly. Like she would.
    ...
    I hate that you understood what I meant.
    ...
    Thank you.
    -> END

* [TWITCH] #delta:-2 #expr:neutral #icon:curiosity #flag:mood.kasha.framing_failed
    ...
    Wow.
    Wow, baka.
    You took me literally.
    ...
    You — actually, fine. That's on me. I framed it badly.
    Move on. We're moving on.
    -> END

* [DRIFT] #delta:4 #expr:warm #icon:hesitation #flag:mood.kasha.first_gift
    ...
    I know.
    ...
    I wanted to.
    ...
    It's the first time I've wanted to give somebody something.
    Don't make me explain it more than that.
    -> END

* [REEL] #delta:5 #expr:warm #icon:warmth #flag:mood.kasha.want_you_received
    ...
    ...
    Oh.
    ...
    That's — okay.
    That's a lot.
    ...
    Say it again. Slower.
    -> END


=== kasha_t4_c9_b1 ===
Hey.
...
I'm going to do something today.
I'm going to be quiet.
Just for a minute.
Don't panic. I'll be loud again. I just want to try it.

* [WAIT] #delta:5 #expr:warm #icon:warmth #flag:mood.kasha.shared_silence
    ...
    Thank you.
    ...
    I think I want to keep being quiet for a while.
    Sit with me.
    -> kasha_t4_c9_b2

* [TWITCH] #delta:0 #expr:neutral #icon:curiosity
    ...
    Yeah.
    I am.
    ...
    It's okay. I'll be normal again in a second.
    Just — don't make it harder.
    -> kasha_t4_c9_b2

* [DRIFT] #delta:4 #expr:warm #icon:hesitation
    ...
    Stop.
    ...
    Stop being good at this. It's annoying.
    ...
    Don't stop.
    -> kasha_t4_c9_b2

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.callback_first_day
    ...
    ...
    You said that to me on the first day.
    I almost left.
    ...
    I'm glad I didn't.
    -> kasha_t4_c9_b2


=== kasha_t4_c9_b2 ===
Here is a fact.
When I came here.
I came here because somewhere else, I was second.
...
I was second to a memory.
Of someone who wasn't there anymore.
And I couldn't compete with a memory because memories don't have flaws.
I could only ever be a worse version of someone who wasn't there.
...
So I left.
I came here. And I made up a championship I could win.
Because here, there was nobody to be second to.
...
Until you showed up.

* [WAIT] #delta:5 #expr:warm #icon:warmth #flag:secret.kasha.told_the_truth
    ...
    ...
    Yeah.
    I knew you wouldn't say anything.
    That's why I told you.
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:curiosity
    Pff.
    Yeah.
    I know.
    ...
    Don't make me say more.
    I'm done for today.
    -> END

* [DRIFT] #delta:4 #expr:warm #icon:hesitation #flag:mood.kasha.thanked_softly
    ...
    I know.
    ...
    I knew before you said it.
    But — yeah.
    It's still nice to hear.
    ...
    Thank you, baka.
    -> END

* [REEL] #delta:1 #expr:neutral #icon:curiosity #flag:mood.kasha.no_qualifier
    ...
    Don't say 'here' like that.
    Like there's a 'here' and an 'elsewhere.'
    ...
    Just say I'm not second.
    Say it without the qualifier.
    -> END


// ============================================================
// TIER 5 — The Name (Cast 10)
// ============================================================

=== kasha_t5_c10_b1 ===
Okay.
I've been thinking about this all day.
Don't comment on that.
I'm going to say a thing. And then another thing. And then a third thing.
Don't interrupt me. Please.
...Yeah, I said please. We are past that, you and I.

* [WAIT] #delta:5 #expr:warm #icon:warmth #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    ...
    Good.
    Thank you.
    ...
    First thing.
    My name is not Kasha.
    ...
    Kasha is a thing I called myself when I came here.
    It means 'fire-cart.' I thought it sounded fierce.
    It does sound fierce. But it isn't my name.
    ...
    My name is Aki.
    It just means 'autumn.'
    I have always thought it was too soft.
    ...
    I am telling it to you anyway.
    -> kasha_t5_c10_b2

* [TWITCH] #delta:-3 #expr:neutral #icon:curiosity #flag:mood.kasha.real_name_rushed
    ...
    ...
    Don't do that to me. Not today.
    ...
    Fine. Skipping.
    I'm Aki.
    That's the first thing.
    -> kasha_t5_c10_b2

* [DRIFT] #delta:5 #expr:warm #icon:warmth #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    ...
    I will.
    Thank you.
    ...
    First thing.
    My name is Aki.
    Kasha is a thing I called myself.
    Aki is what I was first.
    -> kasha_t5_c10_b2

* [REEL] #delta:5 #expr:warm #icon:warmth #flag:secret.kasha.real_name_given #flag:fact.kasha.real_name
    ...
    Aki.
    That's my name.
    ...
    Don't say it back yet.
    Wait till I'm done.
    -> kasha_t5_c10_b2


=== kasha_t5_c10_b2 ===
Second thing.
I've been calling you 'baka' since the first day.
I never picked a real name for you.
...
I'm going to.
...
I'm going to call you Hikaru.
It means 'light.'
Don't say anything yet.
I picked it because the first time I ever caught myself smiling about you, you weren't there.
It was morning.
Light through the leaves.
I thought of you.
...
That is the most embarrassing thing I have ever said.
We are not going to talk about it.

* [WAIT] #delta:4 #expr:warm #icon:warmth #flag:mood.kasha.named_him #flag:kasha.release_ready
    ...
    Thank you for not saying anything.
    ...
    Hikaru.
    I'm going to use that now.
    Get used to it.
    -> kasha_t5_c10_b3

* [TWITCH] #delta:-2 #expr:neutral #icon:curiosity #flag:kasha.release_ready
    ...
    DON'T.
    Don't make fun of it.
    I picked it. It's mine. It's yours. Don't make it weird.
    ...
    Ugh. Now I'm second-guessing it.
    Too late. Decision made. You are Hikaru.
    -> kasha_t5_c10_b3

* [DRIFT] #delta:4 #expr:warm #icon:warmth #flag:kasha.release_ready
    ...
    ...
    Don't say my name back yet.
    Just — Hikaru. Yes. That.
    Good.
    -> kasha_t5_c10_b3

* [REEL] #delta:4 #expr:warm #icon:warmth #flag:kasha.release_ready
    ...
    Yes.
    ...
    Yes you will.
    -> kasha_t5_c10_b3


=== kasha_t5_c10_b3 ===
Third thing.
...
I never wanted to be the champion of this corner.
I wanted to be somebody's favourite person.
...
I am yours.
Aren't I.
...
Don't answer.
I know.

-> END

`;
