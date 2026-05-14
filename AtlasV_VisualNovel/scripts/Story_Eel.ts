/**
 * Story_Eel — NPC eel (single 4-beat cast).
 *
 * Cunning and calculating: rewards patience through drift — letting the
 * line go slack shows confidence the eel respects.
 *
 * Combo: DRIFT → DRIFT → DRIFT → REEL.
 *   Beat 1 DRIFT  +18  | other actions +1
 *   Beat 2 DRIFT  +17  | other actions +1
 *   Beat 3 DRIFT  +15  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 */

export const EEL_STORY: string = `

// ============================================================
// Beat 1 — a ripple in the dark. Combo step: DRIFT.
// ============================================================

=== eel_t1_c1_b1 ===
*Something long and dark passes beneath the surface.*
*No splash. No sound.*
*The water bends where it moves.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *You hold still.*
    *The eel pauses — then continues past. Unimpressed.*
    -> eel_t1_c1_b2

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait twitches.*
    *The eel recoils — too obvious.*
    -> eel_t1_c1_b2

* [DRIFT] #delta:18 #expr:curious #icon:curiosity #flag:fact.eel.calculating
    *The line goes slack.*
    *The eel pauses. Turns. Considers.*
    *Something that does not fight is worth studying.*
    -> eel_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The line snaps taut.*
    *The eel dissolves into the murk. Gone.*
    -> eel_t1_c1_b2


// ============================================================
// Beat 2 — testing. Combo step: DRIFT.
// ============================================================

=== eel_t1_c1_b2 ===
*The eel returns, closer now.*
*It winds around the float's reflection.*
*A slow, deliberate orbit.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The eel winds tighter, then uncoils.*
    *Stillness bores it.*
    -> eel_t1_c1_b3

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait jerks.*
    *The eel ripples backward. Distaste.*
    -> eel_t1_c1_b3

* [DRIFT] #delta:17 #expr:curious #icon:contentment #flag:fact.eel.fluid
    *The float drifts again — slack, weightless.*
    *The eel follows, mirroring the current.*
    *It respects what flows.*
    -> eel_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The eel snaps its body sideways and vanishes.*
    *Force will never work here.*
    -> eel_t1_c1_b3


// ============================================================
// Beat 3 — closing in. Combo step: DRIFT.
// ============================================================

=== eel_t1_c1_b3 ===
*The eel coils beneath the float.*
*Its body forms a question mark in the water.*
*Watching. Waiting for you to make a mistake.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *The eel uncoils slowly.*
    *It expected movement — not nothing.*
    -> eel_t1_c1_b4

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *A twitch.*
    *The eel narrows its eye. Predictable.*
    -> eel_t1_c1_b4

* [DRIFT] #delta:15 #expr:warm #icon:warmth #flag:fact.eel.trust
    *The line goes slack once more.*
    *The eel rises, its body pressed against the float.*
    *Trust, earned through surrender.*
    -> eel_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The eel whips sideways.*
    *You feel the line tremble — but it slips free.*
    -> eel_t1_c1_b4


// ============================================================
// Beat 4 — the coil. REEL with affection 50 → catch.
// ============================================================

=== eel_t1_c1_b4 ===
*The eel wraps itself around the line.*
*The float sinks an inch.*
*A decision hangs in the dark water.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The eel unwinds and sinks.*
    *The moment passes like smoke.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait twitches in the eel's coils.*
    *It releases and fades into the murk.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts free of the eel's grip.*
    *It watches you go.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:shock
    *The line tightens around the coil.*
    *The eel holds — caught in its own embrace.*
    -> END

`;
