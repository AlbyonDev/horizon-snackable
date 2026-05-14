/**
 * Story_Carp — NPC carp (single 4-beat cast).
 *
 * Old and wise: settles in slowly, rewards patience and drift.
 *
 * Combo: WAIT → DRIFT → WAIT → REEL.
 *   Beat 1 WAIT   +18  | other actions +1
 *   Beat 2 DRIFT  +17  | other actions +1
 *   Beat 3 WAIT   +15  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 */

export const CARP_STORY: string = `

// ============================================================
// Beat 1 — the old shadow. Combo step: WAIT.
// ============================================================

=== carp_t1_c1_b1 ===
*A broad, gold-flecked shape rises from the silt.*
*It moves like something that has outlived seasons.*
*The water barely stirs.*

* [WAIT] #delta:18 #expr:curious #icon:contentment #flag:fact.carp.ancient
    *The carp holds still, eye to eye with the float.*
    *An old understanding passes between line and scale.*
    -> carp_t1_c1_b2

* [TWITCH] #delta:1 #expr:neutral #icon:boredom
    *The bait jerks.*
    *The carp does not flinch. It has seen this before.*
    -> carp_t1_c1_b2

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts away.*
    *The carp watches, unimpressed.*
    -> carp_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *The line snaps tight.*
    *The carp descends without hurry. Too soon.*
    -> carp_t1_c1_b2


// ============================================================
// Beat 2 — quiet interest. Combo step: DRIFT.
// ============================================================

=== carp_t1_c1_b2 ===
*The carp surfaces again, mouth working slowly.*
*Barbels sway like rooted weeds.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *Stillness meets stillness.*
    *The carp remains, but does not advance.*
    -> carp_t1_c1_b3

* [TWITCH] #delta:1 #expr:neutral #icon:boredom
    *The bait hops.*
    *The carp turns its flank — a slow dismissal.*
    -> carp_t1_c1_b3

* [DRIFT] #delta:17 #expr:curious #icon:warmth #flag:fact.carp.patient
    *The float drifts with the current.*
    *The carp follows, gliding alongside like an old companion.*
    -> carp_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *The carp drops to the bottom in one smooth motion.*
    *Patience cannot be forced.*
    -> carp_t1_c1_b3


// ============================================================
// Beat 3 — trust. Combo step: WAIT.
// ============================================================

=== carp_t1_c1_b3 ===
*The carp rests directly beneath the float.*
*Golden scales catch the faint light.*
*It waits, as if testing you.*

* [WAIT] #delta:15 #expr:warm #icon:contentment #flag:fact.carp.trusting
    *You wait.*
    *The carp breathes. The water breathes.*
    *Something settles between you.*
    -> carp_t1_c1_b4

* [TWITCH] #delta:1 #expr:neutral #icon:boredom
    *The bait twitches.*
    *The carp sighs through its gills.*
    -> carp_t1_c1_b4

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts once more.*
    *The carp stays put this time.*
    -> carp_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *The carp rolls sideways and sinks.*
    *Not yet.*
    -> carp_t1_c1_b4


// ============================================================
// Beat 4 — the offering. REEL with affection 50 → catch.
// ============================================================

=== carp_t1_c1_b4 ===
*The carp opens its mouth around the float.*
*The line goes heavy with the weight of years.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The carp holds the bait, then releases it.*
    *It sinks away like a thought you cannot hold.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait twitches in its mouth.*
    *The carp spits it out and descends.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float pulls free as the current takes it.*
    *The carp watches it go.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:delight
    *The line tightens.*
    *The old carp yields.*
    -> END

`;
