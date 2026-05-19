/**
 * Story_Carp — NPC carp (single 4-beat puzzle).
 *
 * Old and wise: settles in slowly, rewards patience and drift.
 *
 * Puzzle combo: WAIT → DRIFT → WAIT → REEL.
 *   Any wrong action → carp leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 *
 * No partial credit. The carp is a pure-pattern fish.
 */

export const CARP_STORY: string = `

// Entry dispatcher — NPC carp always routes to its single cast.
=== carp_entry ===
-> carp_t1_c1_b1

// ============================================================
// Beat 1 — the old shadow. Correct: WAIT.
// ============================================================

=== carp_t1_c1_b1 ===
*A broad, gold-flecked shape rises from the silt.*
*It moves like something that has outlived seasons.*
*The water barely stirs.*

* [WAIT] #delta:18 #icon:contentment #flag:fact.carp.ancient
    *The carp holds still, eye to eye with the float.*
    *An old understanding passes between line and scale.*
    -> carp_t1_c1_b2

* [TWITCH] #delta:0 #icon:boredom
    *The bait jerks. The carp does not flinch.*
    *It sinks back into the silt without a ripple.*
    -> END

* [DRIFT] #delta:0 #icon:boredom
    *The float drifts too soon. The carp is unimpressed.*
    *It turns away.*
    -> END

* [REEL] #delta:0 #icon:surprise
    *The line snaps tight. Too soon.*
    *The carp descends without hurry, and is gone.*
    -> END


// ============================================================
// Beat 2 — quiet interest. Correct: DRIFT.
// ============================================================

=== carp_t1_c1_b2 ===
*The carp surfaces again, mouth working slowly.*
*Barbels sway like rooted weeds.*

* [WAIT] #delta:0 #icon:boredom
    *Stillness meets stillness — but the moment has already passed.*
    *The carp retreats.*
    -> END

* [TWITCH] #delta:0 #icon:boredom
    *The bait hops. The carp turns its flank — a slow dismissal.*
    *It descends.*
    -> END

* [DRIFT] #delta:17 #icon:warmth #flag:fact.carp.patient
    *The float drifts with the current.*
    *The carp follows, gliding alongside like an old companion.*
    -> carp_t1_c1_b3

* [REEL] #delta:0 #icon:surprise
    *The carp drops to the bottom in one smooth motion.*
    *Patience cannot be forced.*
    -> END


// ============================================================
// Beat 3 — trust. Correct: WAIT.
// ============================================================

=== carp_t1_c1_b3 ===
*The carp rests directly beneath the float.*
*Golden scales catch the faint light.*
*It waits, as if testing you.*

* [WAIT] #delta:15 #icon:contentment #flag:fact.carp.trusting
    *You wait.*
    *The carp breathes. The water breathes.*
    *Something settles between you.*
    -> carp_t1_c1_b4

* [TWITCH] #delta:0 #icon:boredom
    *The bait twitches. The carp sighs through its gills.*
    *It sinks away.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts. The trust breaks with the current.*
    *The carp turns and is gone.*
    -> END

* [REEL] #delta:0 #icon:surprise
    *The carp rolls sideways and sinks.*
    *Not yet — and never now.*
    -> END


// ============================================================
// Beat 4 — the offering. Correct: REEL.
// ============================================================

=== carp_t1_c1_b4 ===
*The carp opens its mouth around the float.*
*The line goes heavy with the weight of years.*

* [WAIT] #delta:0 #icon:hesitation
    *The carp holds the bait, then releases it.*
    *It sinks away like a thought you cannot hold.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait twitches in its mouth.*
    *The carp spits it out and descends.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float pulls free as the current takes it.*
    *The carp watches it go.*
    -> END

* [REEL] #delta:1 #icon:delight #ending:reel
    *The line tightens.*
    *The old carp yields.*
    -> END

`;
