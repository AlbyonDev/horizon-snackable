/**
 * Story_Trout — NPC trout (single 4-beat puzzle).
 *
 * Quick, curious, balanced: rewards variety. Each beat needs
 * a different action — it wants to see everything you can do.
 *
 * Puzzle combo: WAIT → TWITCH → DRIFT → REEL.
 *   Any wrong action → trout leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 */

export const TROUT_STORY: string = `

// Entry dispatcher — NPC always routes to its single cast.
=== trout_entry ===
-> trout_t1_c1_b1

// ============================================================
// Beat 1 — a flash of silver. Correct: WAIT.
// ============================================================

=== trout_t1_c1_b1 ===
*A silver shape breaks the surface — gone before the ripple fades.*
*It circles back, curious.*
*Quick eyes study the float from every angle.*

* [WAIT] #delta:17 #icon:curiosity #flag:fact.trout.curious
    *You hold still.*
    *The trout circles closer — fascinated by stillness.*
    *What doesn't move must be worth studying.*
    -> trout_t1_c1_b2

* [TWITCH] #delta:0 #icon:surprise
    *The bait twitches. The trout darts sideways — too predictable.*
    *Gone in a silver flash.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts. The trout follows briefly, then loses interest.*
    *Gone.*
    -> END

* [REEL] #delta:0 #icon:shock
    *The line screams.*
    *The trout is gone in a silver flash.*
    -> END


// ============================================================
// Beat 2 — playful approach. Correct: TWITCH.
// ============================================================

=== trout_t1_c1_b2 ===
*The trout returns, tail flicking rapidly.*
*It noses the float — bump, bump.*
*Testing. Tasting.*

* [WAIT] #delta:0 #icon:boredom
    *Stillness again.*
    *The trout already saw that trick. It loses interest and is gone.*
    -> END

* [TWITCH] #delta:17 #icon:delight #flag:fact.trout.playful
    *The bait dances.*
    *The trout chases it in a tight circle — delighted.*
    *A new game!*
    -> trout_t1_c1_b3

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts away.*
    *The trout tilts its head, then swims off.*
    -> END

* [REEL] #delta:0 #icon:shock
    *The trout spooks and scatters.*
    *Gone.*
    -> END


// ============================================================
// Beat 3 — earning trust. Correct: DRIFT.
// ============================================================

=== trout_t1_c1_b3 ===
*The trout swims alongside the float.*
*Its breathing slows. Scales shimmer.*
*It wants one more thing — something gentle.*

* [WAIT] #delta:0 #icon:hesitation
    *The trout waits with you.*
    *But it has already seen patience. It drifts off looking for variety.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *Another twitch.*
    *The trout flinches — it already played that game. Gone.*
    -> END

* [DRIFT] #delta:16 #icon:warmth #flag:fact.trout.balanced
    *The line goes slack.*
    *The trout drifts beside the float — side by side.*
    *Together in the current. Complete.*
    -> trout_t1_c1_b4

* [REEL] #delta:0 #icon:shock
    *The trout rolls away from the sudden pull.*
    *Trust takes time — and you ran out of it.*
    -> END


// ============================================================
// Beat 4 — the rise. Correct: REEL.
// ============================================================

=== trout_t1_c1_b4 ===
*The trout rises to the float.*
*Its mouth opens — a question.*
*The whole river holds its breath.*

* [WAIT] #delta:0 #icon:hesitation
    *The trout holds the bait, then lets it go.*
    *It slips downstream like a silver thought.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait jerks.*
    *The trout releases and darts away.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts from its open mouth.*
    *The trout watches it leave.*
    -> END

* [REEL] #delta:1 #icon:delight
    *The line sings tight.*
    *The trout leaps once — bright and brilliant — then yields.*
    -> END

`;
