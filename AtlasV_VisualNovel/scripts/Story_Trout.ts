/**
 * Story_Trout — NPC trout (single 4-beat cast).
 *
 * Quick, curious, balanced: rewards variety. Each beat needs
 * a different action — it wants to see everything you can do.
 *
 * Combo: WAIT → TWITCH → DRIFT → REEL.
 *   Beat 1 WAIT   +17  | other actions +1
 *   Beat 2 TWITCH +17  | other actions +1
 *   Beat 3 DRIFT  +16  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 */

export const TROUT_STORY: string = `

// ============================================================
// Beat 1 — a flash of silver. Combo step: WAIT.
// ============================================================

=== trout_t1_c1_b1 ===
*A silver shape breaks the surface — gone before the ripple fades.*
*It circles back, curious.*
*Quick eyes study the float from every angle.*

* [WAIT] #delta:17 #expr:curious #icon:curiosity #flag:fact.trout.curious
    *You hold still.*
    *The trout circles closer — fascinated by stillness.*
    *What doesn't move must be worth studying.*
    -> trout_t1_c1_b2

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait twitches.*
    *The trout darts sideways — too predictable.*
    -> trout_t1_c1_b2

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts.*
    *The trout follows briefly, then loses interest.*
    -> trout_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The line screams.*
    *The trout is gone in a silver flash.*
    -> trout_t1_c1_b2


// ============================================================
// Beat 2 — playful approach. Combo step: TWITCH.
// ============================================================

=== trout_t1_c1_b2 ===
*The trout returns, tail flicking rapidly.*
*It noses the float — bump, bump.*
*Testing. Tasting.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *Stillness again.*
    *The trout already saw that trick. It wants something new.*
    -> trout_t1_c1_b3

* [TWITCH] #delta:17 #expr:curious #icon:delight #flag:fact.trout.playful
    *The bait dances.*
    *The trout chases it in a tight circle — delighted.*
    *A new game!*
    -> trout_t1_c1_b3

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts away.*
    *The trout tilts its head but does not follow.*
    -> trout_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The trout spooks and scatters.*
    *It peeks back from behind a stone.*
    -> trout_t1_c1_b3


// ============================================================
// Beat 3 — earning trust. Combo step: DRIFT.
// ============================================================

=== trout_t1_c1_b3 ===
*The trout swims alongside the float.*
*Its breathing slows. Scales shimmer.*
*It wants one more thing — something gentle.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The trout waits with you.*
    *But it has already seen patience. It craves variety.*
    -> trout_t1_c1_b4

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *Another twitch.*
    *The trout flinches — it already played that game.*
    -> trout_t1_c1_b4

* [DRIFT] #delta:16 #expr:warm #icon:warmth #flag:fact.trout.balanced
    *The line goes slack.*
    *The trout drifts beside the float — side by side.*
    *Together in the current. Complete.*
    -> trout_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The trout rolls away from the sudden pull.*
    *Trust takes time.*
    -> trout_t1_c1_b4


// ============================================================
// Beat 4 — the rise. REEL with affection 50 → catch.
// ============================================================

=== trout_t1_c1_b4 ===
*The trout rises to the float.*
*Its mouth opens — a question.*
*The whole river holds its breath.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The trout holds the bait, then lets it go.*
    *It slips downstream like a silver thought.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait jerks.*
    *The trout releases and darts away.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts from its open mouth.*
    *The trout watches it leave.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:delight
    *The line sings tight.*
    *The trout leaps once — bright and brilliant — then yields.*
    -> END

`;
