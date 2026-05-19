/**
 * Story_Soma — Sōma's narrative content in Ink format.
 *
 * Parsed by parseInk() in InkParser.ts.
 *
 * Naming convention:
 *   soma_t<tier>_c<cast>_b<beat>
 *
 * Character voice: Dry, laconic, deadpan humor. Short sentences. Occasional
 * long philosophical tangent that he cuts off with "...forget it." Self-
 * deprecating. Uses dark humor when cornered emotionally. Trailing ellipses.
 * Never raises his voice — gets quieter when hurt.
 *
 * Species: Tench — the "doctor fish" of European folklore. Former community
 * center worker / informal therapist. Lives alone, reads paperbacks on a
 * bench, drinks cheap coffee from a thermos.
 *
 * Arc: Humor-as-deflection → reluctant engagement → burnout reveal →
 * terror of caring again → choosing vulnerability or peaceful departure.
 *
 * Engine integration notes:
 *   - `from.soma.<recipeId>` one-shot signals are set by the encounter
 *     system and auto-cleared by the engine after soma_entry dispatch.
 *   - `mood.soma.last_drift` is a synthetic string flag set by the engine
 *     from the fish's departure drift, used for bridge dialogues.
 *   - `-> END` triggers the visual departure fade directly; goodbye lines
 *     belong inside the terminal choice's response (Ink Authoring Guide §4.4).
 *
 * Intent format (Guide §1.2): cold meta-verb categories, 1–2 words, no
 * adverbs. The emotion lives in the fish's reaction, not in the tooltip.
 *   WAIT   → Hold space. / Observe. / Listen. / Let him deflect.
 *   TWITCH → Tease. / Nudge. / Prompt. / Poke. / Challenge.
 *   DRIFT  → Comfort. / Empathize. / Reassure. / Validate. / Yield.
 *   REEL   → Push back. / Confront. / Call out. / Demand. / Press.
 *
 * Delta calibration:
 *   +5  emotional breakthrough, vulnerability accepted
 *   +4  real opening, significant moment
 *   +3  sincere positive, marked interest
 *   +2  slightly positive
 *   +1  neutral-positive
 *    0  deflection
 *   -2  mild rejection
 *   -4/-5  harsh rejection, fear triggered
 */

export const SOMA_STORY: string = `
// ============================================================
// STORY_SOMA — THE EXHAUSTED CARETAKER
// ============================================================

=== soma_entry ===
{ from.soma.climaxT5 :
    { quest.soma.t5_c9_done :
        -> soma_t5_c10_b1
    - else :
        -> soma_t5_c9_b1
    }
- from.soma.parkT4 :
    { quest.soma.t4_c7_done :
        -> soma_t4_c8_b1
    - else :
        -> soma_t4_c7_b1
    }
- from.soma.nightT3 :
    { quest.soma.t3_c5_done :
        -> soma_t3_c6_b1
    - else :
        -> soma_t3_c5_b1
    }
- from.soma.benchT2 :
    { quest.soma.t2_c3_done :
        -> soma_t2_c4_b1
    - else :
        -> soma_t2_c3_b1
    }
- from.soma.home :
    { quest.soma.t1_done :
        -> soma_loop
    - met.soma :
        -> soma_t1_c2_b1
    - else :
        -> soma_t1_c1_b1
    }
- else :
    -> soma_t1_c1_b1
}

// ============================================================
// FAIL-SAFE LOOP — reached when home is somehow still active after T1.
// ============================================================

=== soma_loop ===
*Sōma is resting on the lakebed. Same spot. Same thermos-shaped stone beside him.*
*He flicks a fin upward, then settles back into the silt.*
*He doesn't seem inclined to move.*
-> END

// ============================================================
// TIER 1 — DEFLECTION: "Go bother someone who cares"
// ============================================================

=== soma_t1_c1_b1 ===
...
Oh. You're standing there.
I'm reading.
...
Look, the bench has room. Sit if you want. But I'm not making conversation.

* [WAIT] Sit. #delta:3 #expr:neutral #icon:hesitation #drift:CHARMED #flag:met.soma #flag:fact.soma.appearance
    ...
    Huh.
    Most people ask me what I'm reading within ten seconds. You just... sat.
    That's either very zen or very weird.
    ...forget it. It's fine.
    -> soma_t1_c1_b2

* [TWITCH] Greet. #delta:2 #expr:neutral #icon:curiosity #drift:WARM #flag:met.soma #flag:fact.soma.appearance
    Yeah, hi. Sōma. Don't wear it out.
    ...
    You're still standing there.
    The coffee's mine. Get your own.
    -> soma_t1_c1_b2

* [DRIFT] Apologize. #delta:1 #expr:neutral #icon:hesitation #drift:NEUTRAL #flag:met.soma #flag:fact.soma.appearance
    Disturbing me? Eh. You'd have to try harder than that.
    I'm already disturbed. By the pigeon that won't leave my windowsill.
    Three weeks. Same pigeon. Every night.
    ...why am I telling you this.
    -> soma_t1_c1_b2

* [REEL] Insist. #delta:-2 #expr:neutral #icon:boredom #drift:WARY #flag:met.soma #flag:fact.soma.appearance
    You want my name? My life story? A blood sample?
    Sōma. There. Happy?
    I'm not a vending machine. You don't put friendliness in and get warmth out.
    -> soma_t1_c1_b2

=== soma_t1_c1_b2 ===
...
*He nudges a pebble with his nose. Doesn't look up.*
This book is terrible, by the way. Guy finds love on page forty and I'm on page three hundred and the love is still there.
Unrealistic.
...
You're still here.

* [WAIT] Stay. #delta:3 #expr:warm #icon:contentment #drift:CHARMED #flag:fact.soma.reads
    ...
    Fine. You can stay.
    But I'm not going to be interesting.
    -> END

* [TWITCH] Joke. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:fact.soma.reads
    Spoil the ending?
    He dies. Everyone dies. That's how all books end if you zoom out far enough.
    ...that was dark. Sorry. My default setting.
    -> END

* [DRIFT] Relate. #delta:1 #expr:neutral #icon:hesitation #drift:NEUTRAL #flag:fact.soma.reads
    ...huh. You've got that look. The "I-understand-paperback-people" look.
    ...
    Great. We can be two people sitting on a bench not talking about books.
    Revolutionary.
    -> END

* [REEL] Challenge. #delta:-2 #expr:neutral #icon:boredom #drift:WARY #flag:fact.soma.reads
    Cynical?
    I prefer the word "observant." But sure. Cynical works.
    Do you critique everyone you meet within five minutes, or am I special?
    -> END

=== soma_t1_c2_b1 ===
{ mood.soma.last_drift == "WARY" :
    Oh. You again.
    ...
    Look, I wasn't trying to be rude last time. That's just... how I talk.
- mood.soma.last_drift == "SCARED" :
    ...
    *He sees the bobber and almost drifts away.*
    *Settles back down.*
    ...fine. Sit down.
- else :
    Same bench. Same thermos.
    ...
    I'd say "fancy meeting you here" but we both know this is the only bench with shade.
}
...
The coffee's cold tonight. Didn't bother reheating it.
Some nights you just... don't bother.
...
That came out heavier than I meant it to.

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED
    ...
    You're doing that thing again. Where you just... let me exist without requiring anything.
    It's unsettling.
    ...in a good way. Maybe.
    -> soma_t1_c2_b2

* [TWITCH] Probe. #delta:3 #expr:curious #icon:curiosity #drift:WARM
    ...you really want the depressing version or the funny version?
    ...eh. It's a thermos. The whole point is it stays warm. Mine doesn't.
    Broken seal. Had it for years. Could replace it. Don't.
    ...forget it. It's just coffee.
    -> soma_t1_c2_b2

* [DRIFT] Offer. #delta:2 #expr:warm #icon:hesitation #drift:WARM
    Share yours?
    ...
    No one's offered me anything in a long time.
    The answer is no. But... noted.
    -> soma_t1_c2_b2

* [REEL] Push. #delta:-3 #expr:neutral #icon:boredom #drift:SCARED
    ...
    "Heavy" doesn't need to be unpacked. Some things just sit there.
    You don't need to fix me. Nobody asked you to.
    ...
    -> soma_t1_c2_b2

=== soma_t1_c2_b2 ===
I used to talk to a lot of people. All day, every day.
...
Decided to stop.
Best decision I ever made.
...second best. The first was this bench. Good lumbar support.
*Almost stirs a fin. Doesn't.*

* [WAIT] Accept. #delta:3 #expr:warm #icon:contentment #drift:CHARMED #flag:quest.soma.t1_done #flag:recipe.soma.benchT2 #disable-flag:recipe.soma.home
    You're not going to ask why I stopped.
    ...
    Alright. You've earned... something. I don't know what.
    There's a bench closer to the plaza. I'm there sometimes. Late evenings.
    If you happen to pass by. No obligations.
    -> END

* [TWITCH] Tease. #delta:2 #expr:neutral #icon:curiosity #drift:WARM #flag:quest.soma.t1_done #flag:recipe.soma.benchT2 #disable-flag:recipe.soma.home
    ...heh. You and the bench. Competing for the title.
    ...yeah. The bench doesn't ask follow-up questions.
    But it also doesn't show up twice.
    ...the plaza bench. Late evenings. If you want.
    -> END

* [DRIFT] Validate. #delta:3 #expr:warm #icon:warmth #drift:WARM #flag:quest.soma.t1_done #flag:recipe.soma.benchT2 #disable-flag:recipe.soma.home
    ...don't therapize me.
    But... yeah.
    Plaza bench. Late evenings. Don't bring anything. Especially not expectations.
    -> END

* [REEL] Demand. #delta:-4 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t1_done #flag:recipe.soma.benchT2 #disable-flag:recipe.soma.home
    ...
    *His jaw sets.*
    Because they never stopped taking.
    Plaza. Late evenings. If you can handle not getting answers.
    -> END

// ============================================================
// TIER 2 — RELUCTANT ENGAGEMENT: "Stop making me like you"
// ============================================================

=== soma_t2_c3_b1 ===
{ mood.soma.last_drift == "WARY" :
    ...you actually came to the plaza.
    I half-expected you wouldn't. After how I was.
- mood.soma.last_drift == "SCARED" :
    ...
    *He has his paperback up like a shield.*
    ...I thought about what I said. It was too much.
    Sit. Please.
- else :
    The plaza bench. Better shade here.
    ...
    You found it.
}
...
I finished that terrible book. He dies at the end.
Called it. Page forty love, page four hundred funeral.
Predictable.

* [WAIT] Sit. #delta:3 #expr:warm #icon:contentment #drift:CHARMED #flag:fact.soma.deflects
    ...
    You're consistent. I'll give you that.
    Same silence. Same patience. Same seat.
    It's almost like you're doing it on purpose.
    -> soma_t2_c3_b2

* [TWITCH] Probe. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:fact.soma.deflects
    ...eh. Gives me something to be disappointed in that isn't myself.
    ...that was a joke. Mostly.
    -> soma_t2_c3_b2

* [DRIFT] Relate. #delta:2 #expr:warm #icon:hesitation #drift:WARM #flag:fact.soma.deflects
    ...heh. Kindred spirit of low expectations.
    "Like" is a strong word. I expect them. There's a difference.
    ...
    But yeah. Expectations met is its own comfort.
    -> soma_t2_c3_b2

* [REEL] Challenge. #delta:-2 #expr:neutral #icon:boredom #drift:WARY #flag:fact.soma.deflects
    ...wow. Okay.
    Not everything.
    Some things are just disappointing without being funny.
    ...like this conversation suddenly.
    -> soma_t2_c3_b2

=== soma_t2_c3_b2 ===
A kid on the plaza asked me for directions yesterday.
I gave them. Perfectly. Right down to the shortcut behind the bakery.
And then I stood there for ten minutes feeling exhausted.
...
From giving directions. To a twelve-year-old.
Pathetic, right?

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t2_c3_done
    You didn't laugh.
    Most people would laugh. "Tired from giving directions? Come on."
    But you just... let it be what it is.
    ...I appreciate that more than I'll ever say out loud.
    -> END

* [TWITCH] Joke. #delta:2 #expr:neutral #icon:curiosity #drift:WARM #flag:quest.soma.t2_c3_done
    The bakery shortcut is impressive?
    ...heh. Yeah. It saves four minutes.
    My one remaining superpower. Efficient navigation.
    ...forget it. See you around.
    -> END

* [DRIFT] Empathize. #delta:4 #expr:warm #icon:sadness #drift:OPENED #flag:quest.soma.t2_c3_done
    ...
    You get it. You actually get it.
    It's not about the directions. It's about... having anything left.
    ...forget I said that.
    -> END

* [REEL] Press. #delta:-3 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t2_c3_done
    ...
    *His voice drops very quiet.*
    I don't owe you an explanation.
    I said it's pathetic. Isn't that enough?
    -> END

=== soma_t2_c4_b1 ===
{ mood.soma.last_drift == "SCARED" :
    ...
    I shouldn't have shut down like that. Last time.
    You asked a fair question. I just... couldn't.
- mood.soma.last_drift == "WARY" :
    ...back again.
    You're persistent. I'll give you that much.
- else :
    Same bench. Brought a new book. Haven't opened it yet.
    ...
    Was waiting for you, I guess. Don't read into that.
}
...
You know what's weird? I notice when you're not here.
The bench feels different. Emptier.
...
That's not a confession. It's an observation. Like noting the weather.

* [WAIT] Accept. #delta:4 #expr:warm #icon:warmth #drift:CHARMED
    ...
    Stop looking at me like that. Like what I just said means something.
    It means the bench is long and you take up space on it. That's physics.
    ...fine. Maybe it's not just physics.
    -> soma_t2_c4_b2

* [TWITCH] Tease. #delta:3 #expr:curious #icon:delight #drift:CHARMED
    Missing me?
    I said "notice." There's a clinical difference between noticing an absence and missing someone.
    ...
    ...shut up.
    -> soma_t2_c4_b2

* [DRIFT] Mirror. #delta:2 #expr:warm #icon:hesitation #drift:WARM
    ...great. Two people cataloguing absences. Very efficient. Very adult.
    We should start a club. "People Who Notice Things And Say Nothing About It."
    -> soma_t2_c4_b2

* [REEL] Call out. #delta:-2 #expr:neutral #icon:shock #drift:WARY
    ...
    *He looks away.*
    I'm noting patterns. That's all. Don't make it into something it isn't.
    -> soma_t2_c4_b2

=== soma_t2_c4_b2 ===
I had a dream last night.
Some old colleague from years back. Showing up at my door. Asking for help.
And in the dream, I said yes. Like I always used to.
Woke up exhausted.
...
Funny how dreams can take from you too.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t2_done #flag:recipe.soma.nightT3 #disable-flag:recipe.soma.benchT2
    ...
    The silence after that. You just let it sit.
    ...
    I think I could talk more. About the old days. But not here. Too many people pass by.
    Come by this area at night sometime. It's quieter.
    -> END

* [TWITCH] Probe. #delta:2 #expr:curious #icon:curiosity #drift:WARM #flag:quest.soma.t2_done #flag:recipe.soma.nightT3 #disable-flag:recipe.soma.benchT2
    ...the kind that costs you everything and doesn't come with a receipt.
    ...forget it. I'll tell you more another time. At night, maybe. When it's quieter.
    -> END

* [DRIFT] Comfort. #delta:3 #expr:warm #icon:sadness #drift:WARM #flag:quest.soma.t2_done #flag:recipe.soma.nightT3 #disable-flag:recipe.soma.benchT2
    ...my body doesn't know the difference.
    But... thanks. For saying that.
    Come by at night. This area. I'll tell you more when there's fewer ears around.
    -> END

* [REEL] Confront. #delta:-4 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t2_done #flag:recipe.soma.nightT3 #disable-flag:recipe.soma.benchT2
    ...
    *Very quiet.*
    I know I can't keep dodging it.
    ...
    At night. Come by at night. I'll try. That's all I can promise.
    -> END

// ============================================================
// TIER 3 — REVELATION: The burned-out caretaker
// ============================================================

=== soma_t3_c5_b1 ===
{ mood.soma.last_drift == "WARY" :
    ...you came. Even though I basically told you nothing last time.
- mood.soma.last_drift == "SCARED" :
    ...
    *He's pressed flat against the lakebed. Perfectly still.*
    I owe you an honest conversation. I know.
- else :
    Night. Fewer people.
    ...
    Alright. I said I'd try. So.
}
...
I used to work at the community center. On Third Avenue.
"Worked" is generous. I was there. Every day. Unpaid after the first year.
People came to me with... everything.
Rent problems. Relationship crises. Panic attacks at 2am. Lost kids. Lost adults.
I said yes to all of it.

* [WAIT] Listen. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:fact.soma.burnout
    ...
    You're doing that thing. Where you don't fill the silence with advice.
    Everyone else would say "that sounds hard" right about now. You just... breathe.
    ...that helps more than any words would.
    -> soma_t3_c5_b2

* [TWITCH] Probe. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:fact.soma.burnout
    How long?
    Seven years. Give or take.
    Seven years of being everyone's anchor.
    ...the anchor rusted. Eventually.
    -> soma_t3_c5_b2

* [DRIFT] Empathize. #delta:4 #expr:warm #icon:sadness #drift:OPENED #flag:fact.soma.burnout
    ...
    *He looks up for the first time.*
    You said "of course it broke you."
    ...nobody's ever said that. They always say "you're so strong." As if that helps.
    -> soma_t3_c5_b2

* [REEL] Press. #delta:-2 #expr:neutral #icon:shock #drift:WARY #flag:fact.soma.burnout
    ...
    Because when someone's crying in your hallway at midnight, "no" feels like murder.
    You wouldn't understand.
    -> soma_t3_c5_b2

=== soma_t3_c5_b2 ===
The last night. I remember the exact hour.
Someone called. Past midnight. Needed me to drive them to the hospital. Third time that month.
I said yes. Got dressed. Made it halfway down the stairs.
And just... stopped.
Sat on the step. For an hour.
Couldn't move.
...
That was two years ago. Haven't gone back.

* [WAIT] Stay. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t3_c5_done #flag:fact.soma.collapse
    ...
    You're just sitting with me. On this metaphorical staircase.
    ...
    Thank you.
    That's the first time I've told anyone the staircase story.
    -> END

* [TWITCH] Ask. #delta:2 #expr:curious #icon:hesitation #drift:WARM #flag:quest.soma.t3_c5_done #flag:fact.soma.collapse
    ...someone else drove them. They were fine.
    ...everyone was always fine without me. That's the punch line.
    ...forget it.
    -> END

* [DRIFT] Validate. #delta:4 #expr:warm #icon:sadness #drift:OPENED #flag:quest.soma.t3_c5_done #flag:fact.soma.collapse
    ...
    *Very long silence.*
    ...yeah. Maybe it did.
    I never thought of it that way.
    -> END

* [REEL] Diagnose. #delta:-3 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t3_c5_done #flag:fact.soma.collapse
    ...
    *His voice drops to almost nothing.*
    I know what it is. I don't need a label from someone on a bench.
    ...
    Please go.
    -> END

=== soma_t3_c6_b1 ===
{ mood.soma.last_drift == "SCARED" :
    ...
    Last time. I shouldn't have asked you to leave.
    That was the exhaustion talking.
    Not me.
- mood.soma.last_drift == "WARY" :
    ...I'm not going to apologize for being guarded.
    But I will say... thanks for coming back anyway.
- else :
    ...you came back.
    After what I told you.
    ...
    I half expected you to find a different bench. A less complicated one.
}
...
You know what the worst part is?
I still care. About all of them.
Every person who showed up at my door. Every 2am phone call.
I still wonder if they're okay.
I just... can't do anything about it anymore.

* [WAIT] Hold space. #delta:4 #expr:warm #icon:warmth #drift:CHARMED
    ...
    The fact that you're here and not trying to solve me.
    That's the difference.
    Everyone else always wanted me to "get back out there." You just let me be tired.
    -> soma_t3_c6_b2

* [TWITCH] Observe. #delta:3 #expr:curious #icon:curiosity #drift:WARM
    ...heh. Or proof I'm an idiot who can't learn.
    ...
    ...okay. Maybe not broken. Just... cracked.
    -> soma_t3_c6_b2

* [DRIFT] Reassure. #delta:3 #expr:warm #icon:sadness #drift:WARM
    ...
    I know. Logically. But it feels like failing.
    Like there's a version of me that could still do it. And I'm letting him down.
    -> soma_t3_c6_b2

* [REEL] Challenge. #delta:-2 #expr:neutral #icon:shock #drift:WARY
    ...
    *Quiet.*
    You say that like it's a switch.
    Seven years of being needed doesn't unhook in a season.
    -> soma_t3_c6_b2

=== soma_t3_c6_b2 ===
...
You want to know the real reason I sit on benches reading bad novels?
Because helping is the only thing I was ever good at.
And I can't do it anymore.
So I fill the hours with something. Anything.
...
Without purpose you're just... a body on a bench.

* [WAIT] Sit with. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t3_done #flag:recipe.soma.parkT4 #disable-flag:recipe.soma.nightT3
    ...
    Two bodies on a bench.
    ...
    Heh. Yeah. That's better than one.
    There's a park. Further out. During the day.
    I go there when the weather's good. If you're ever in the area.
    -> END

* [TWITCH] Reframe. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:quest.soma.t3_done #flag:recipe.soma.parkT4 #disable-flag:recipe.soma.nightT3
    ...that's generous. But I'll take it.
    "Professional bench-occupier and novel-critic."
    ...the park. Further out. I'm there sometimes. Days.
    -> END

* [DRIFT] Comfort. #delta:3 #expr:warm #icon:hesitation #drift:WARM #flag:quest.soma.t3_done #flag:recipe.soma.parkT4 #disable-flag:recipe.soma.nightT3
    ...I heard you. I don't believe it yet. But I heard you.
    The park. During the day. If you want.
    -> END

* [REEL] Confront. #delta:-4 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t3_done #flag:recipe.soma.parkT4 #disable-flag:recipe.soma.nightT3
    ...
    *Very quiet.*
    Maybe. But it's mine.
    ...the park. If you still want to bother.
    -> END

// ============================================================
// TIER 4 — TERROR: "You make me feel things I swore off"
// ============================================================

=== soma_t4_c7_b1 ===
{ mood.soma.last_drift == "SCARED" :
    ...
    *He's hovering near the bottom, fins pressed tight to his sides.*
    ...I didn't think you'd come this far out.
- mood.soma.last_drift == "WARY" :
    The park.
    ...didn't think you'd make the trek after last time.
- else :
    ...
    *The water is quiet. Sediment drifts along the bottom.*
    You found me.
    ...I'm not sure how I feel about that.
}
...
I've been thinking about something. And it's making me uncomfortable.
I look forward to this. To you showing up.
...
That's a problem.

* [WAIT] Listen. #delta:4 #expr:warm #icon:warmth #drift:CHARMED #flag:fact.soma.afraid
    ...
    See? You don't push. You don't ask "why is that a problem?"
    You just let me sit with it.
    ...the problem is that last time I looked forward to someone, I ended up on a staircase at 5am unable to move.
    -> soma_t4_c7_b2

* [TWITCH] Probe. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:fact.soma.afraid
    ...look at you, poking the bruise.
    ...because caring is how I got destroyed last time.
    You care about someone. They need you. You give everything. Then there's nothing left.
    I'm not doing that again.
    ...supposedly.
    -> soma_t4_c7_b2

* [DRIFT] Reassure. #delta:3 #expr:warm #icon:hesitation #drift:WARM #flag:fact.soma.afraid
    ...people always say that.
    ...but you've been pretty consistent so far. I'll give you that.
    -> soma_t4_c7_b2

* [REEL] Confront. #delta:-2 #expr:neutral #icon:shock #drift:WARY #flag:fact.soma.afraid
    ...
    *His hands tighten on the thermos.*
    ...I know. I know that's what I'm doing.
    Knowing doesn't make it easier.
    -> soma_t4_c7_b2

=== soma_t4_c7_b2 ===
There's something else.
When I sit here with you... I feel it coming back.
The instinct. To ask if you're okay. To fix things. To give.
...
I'm terrified that I'll start doing it again. And I won't be able to stop.
And then one day I'll be on a staircase again.
Except this time there won't be anything left to break.

* [WAIT] Stay quiet. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t4_c7_done
    ...
    *Very long silence.*
    ...
    You didn't say "it'll be different this time." Thank you for not saying that.
    Everyone says that. It's never true.
    ...except maybe with you. I don't know.
    -> END

* [TWITCH] Observe. #delta:3 #expr:curious #icon:hesitation #drift:WARM #flag:quest.soma.t4_c7_done
    ...no. You haven't.
    ...
    Huh.
    ...I'll think about that.
    -> END

* [DRIFT] Promise. #delta:4 #expr:warm #icon:sadness #drift:OPENED #flag:quest.soma.t4_c7_done
    ...
    *His breath catches slightly.*
    ...nobody's ever offered to be the guardrail before.
    ...I need to think. Come back.
    -> END

* [REEL] Push. #delta:-3 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t4_c7_done
    ...
    *His voice drops to barely audible.*
    Don't tell me what I need.
    That's what everyone did. "You need to rest. You need boundaries. You need—"
    I know what I need. I need everyone to stop needing me.
    ...go.
    -> END

=== soma_t4_c8_b1 ===
{ mood.soma.last_drift == "SCARED" :
    ...
    I told you to go last time.
    You came back anyway.
    ...
    That's either stubborn or brave. I can't tell.
- mood.soma.last_drift == "WARY" :
    ...back.
    ...
    I was hoping you would be. Don't tell anyone I said that.
- else :
    ...
    *He's not nosing at pebbles today. He just hovers, motionless.*
    I've been thinking.
}
...
I want to tell you something.
It's not a joke. It's not deflection. It's... the real thing.
...
You're the first person in two years I haven't wanted to run away from.

* [WAIT] Receive. #delta:5 #expr:warm #icon:warmth #drift:CHARMED
    ...
    You just heard that. And didn't need to one-up it. Or fix it. Or analyze it.
    ...
    That's why. That's exactly why.
    -> soma_t4_c8_b2

* [TWITCH] Tease. #delta:3 #expr:curious #icon:delight #drift:CHARMED
    Low bar?
    ...heh. Yeah. Running from literally everyone for two years. The bar is underground.
    But you cleared it. Somehow.
    -> soma_t4_c8_b2

* [DRIFT] Mirror. #delta:4 #expr:warm #icon:hesitation #drift:WARM
    You don't run from me either?
    ...
    I want to make a joke right now. Deflect. Change the subject.
    But I'm not going to.
    ...yeah. I don't run from you.
    -> soma_t4_c8_b2

* [REEL] Demand. #delta:-2 #expr:neutral #icon:shock #drift:WARY
    ...
    ...I just told you the most honest thing I've said in two years and you want proof.
    ...I don't know how to prove something like that.
    -> soma_t4_c8_b2

=== soma_t4_c8_b2 ===
...
I spent two years building a wall. Reading books. Drinking cold coffee. Being nobody's person.
And you just... walked up to the wall and sat next to it.
Didn't climb it. Didn't knock on it. Didn't demand I tear it down.
Just sat.
...
And now the wall feels... less necessary.
...forget it. That's too much.

* [WAIT] Let it stand. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t4_done #flag:recipe.soma.climaxT5 #disable-flag:recipe.soma.parkT4 #flag:fact.soma.wall
    ...
    *He exhales slowly.*
    ...
    Tomorrow night. Same park. Bring that copper coin you always carry.
    I want to... try something. An experiment.
    In being less walled.
    -> END

* [TWITCH] Observe. #delta:3 #expr:curious #icon:curiosity #drift:WARM #flag:quest.soma.t4_done #flag:recipe.soma.climaxT5 #disable-flag:recipe.soma.parkT4 #flag:fact.soma.wall
    ...heh.
    Yeah. Professional-grade.
    ...tomorrow night. The copper coin. Bring it.
    I have something I need to say out loud. With a witness.
    -> END

* [DRIFT] Accept. #delta:4 #expr:warm #icon:sadness #drift:WARM #flag:quest.soma.t4_done #flag:recipe.soma.climaxT5 #disable-flag:recipe.soma.parkT4 #flag:fact.soma.wall
    ...
    ...I heard you.
    Tomorrow night. Bring the copper coin. Please.
    -> END

* [REEL] Press. #delta:-3 #expr:neutral #icon:shock #drift:SCARED #flag:quest.soma.t4_done #flag:recipe.soma.climaxT5 #disable-flag:recipe.soma.parkT4 #flag:fact.soma.wall
    ...
    *Very quiet.*
    I said "forget it" and you won't let me.
    ...fine. Tomorrow. Night. The coin.
    I'll... I'll be there. Whether I'm ready or not.
    -> END

// ============================================================
// TIER 5 — CLIMAX: Let someone in, or say goodbye
// ============================================================

=== soma_t5_c9_b1 ===
{ mood.soma.last_drift == "WARY" :
    ...
    You brought the coin. Even after I shut down.
    ...
    I don't deserve that. But here we are.
- mood.soma.last_drift == "SCARED" :
    ...
    *He's risen off the lakebed. Not resting. First time.*
    ...you came. With the coin.
    I... yeah. Okay.
- else :
    ...
    *Night. The deep water. He's hovering above the lakebed, not resting on it.*
    You're here.
    ...
    The coin. You brought it.
}
...
I'm going to say something. And I need you to just... let me finish.
...
I'm not the person I was. Before the staircase.
That Sōma — the one who could carry everyone — he's gone.
What's left is... this. A man on a bench. Cold coffee. Bad novels.
And somehow... you made that enough.

* [WAIT] Listen. #delta:5 #expr:warm #icon:warmth #drift:CHARMED #flag:fact.soma.confession
    ...
    *He's quiet for a long time.*
    You let me finish. The whole thing. No interruption.
    ...
    That's the whole thing, really. That's why I keep coming back to this bench.
    Because you're the one person who doesn't need me to be more than I am.
    -> soma_t5_c9_b2

* [TWITCH] Reflect. #delta:3 #expr:curious #icon:hesitation #drift:WARM #flag:fact.soma.confession
    ...don't say that like it's easy.
    I gave everything to people who said I was enough. And they kept taking.
    But you... haven't taken anything. Not once.
    ...that's different. I know.
    -> soma_t5_c9_b2

* [DRIFT] Affirm. #delta:4 #expr:warm #icon:sadness #drift:OPENED #flag:fact.soma.confession
    ...
    *His gills flutter rapidly.*
    ...don't.
    ...
    ...okay. Thank you.
    For seeing this version of me and not looking for the old one underneath.
    -> soma_t5_c9_b2

* [REEL] Challenge. #delta:-2 #expr:neutral #icon:shock #drift:WARY #flag:fact.soma.confession
    ...
    ...maybe. But underselling is safer than overselling.
    I learned that.
    ...
    Let me finish.
    -> soma_t5_c9_b2

=== soma_t5_c9_b2 ===
...
So here it is. The real question.
Tomorrow... I'll be here again.
If you come with the coin... I'll take it. And that means... I'm choosing this. Choosing to let someone in again.
...
Or you don't come. And that's okay too.
It means you pass by. And I keep my bench. My books. My thermos.
And I'll be okay. Because I got to sit with someone who understood.
...
Either way... this was good. All of it.

* [WAIT] Pause. #delta:3 #expr:warm #icon:warmth #drift:CHARMED #flag:quest.soma.t5_c9_done
    ...
    Take your time. Yeah.
    ...I mean it. Either way.
    ...
    -> END

* [TWITCH] Acknowledge. #delta:2 #expr:curious #icon:hesitation #drift:WARM #flag:quest.soma.t5_c9_done
    Heavy.
    ...yeah. It is.
    ...
    But you're still standing here. So that's something.
    -> END

* [DRIFT] Nod. #delta:1 #expr:warm #icon:sadness #drift:NEUTRAL #flag:quest.soma.t5_c9_done
    ...
    You understand.
    ...good.
    -> END

* [REEL] Decide. #delta:0 #expr:neutral #icon:surprise #drift:NEUTRAL #flag:quest.soma.t5_c9_done
    Already know?
    ...
    Do you?
    ...
    Then I'll see you tomorrow. Or I won't.
    -> END

=== soma_t5_c10_b1 ===
...
*Night. Same depth. Same lakebed.*
*Sōma has risen from the silt.*
...
So.
You're here.
...
I told myself I wouldn't hope. That whatever you chose, I'd be fine.
But I'm not fine. I'm terrified.
Because if you're here with that coin... it means I have to try again.
And trying is the scariest thing I've ever done.

* [WAIT] Hesitate. #delta:3 #expr:warm #icon:warmth #drift:CHARMED #ending:release #unlock-cg:ending_soma_release
    ...
    You need a moment.
    ...yeah. It is a big thing.
    ...whatever you decide. This was the best two years of bad novels and cold coffee I've ever had.
    ...eh. That came out right.
    -> END

* [TWITCH] Gesture. #delta:2 #expr:curious #icon:hesitation #drift:WARM #ending:release #unlock-cg:ending_soma_release
    ...
    You're holding the coin but not giving it.
    Making me sweat?
    ...heh. Fair. I made you wait enough.
    -> END

* [DRIFT] Release. #delta:1 #expr:warm #icon:sadness #drift:WARM #ending:release #unlock-cg:ending_soma_release
    ...
    *He watches the bobber drift back.*
    ...
    Okay.
    ...
    Thank you. For the benches. The silences. All of it.
    I'll be alright.
    ...I mean it this time.
    -> END

* [REEL] Choose. #delta:0 #expr:warm #icon:surprise #drift:CHARMED #ending:reel #unlock-cg:ending_soma_reel
    ...
    *You hold out the coin in the current.*
    ...
    *He stares at it for a very long time.*
    ...
    ...okay.
    ...
    Okay.
    *He takes it. His fin is trembling.*
    ...don't make me regret this.
    ...
    ...I won't regret this.
    -> END`;
