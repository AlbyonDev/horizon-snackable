/**
 * Story_Eel — NPC eel (single 4-beat puzzle).
 *
 * Cunning and calculating: rewards patience through drift — letting the
 * line go slack shows confidence the eel respects.
 *
 * Puzzle combo: DRIFT → DRIFT → DRIFT → REEL.
 *   Any wrong action → eel leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 */

export const EEL_STORY: string = `

// Entry dispatcher — NPC always routes to its single cast.
=== eel_entry ===
-> eel_t1_c1_b1

// ============================================================
// Beat 1 — a ripple in the dark. Correct: DRIFT.
// ============================================================

=== eel_t1_c1_b1 ===
*Something long and dark passes beneath the surface.*
*No splash. No sound.*
*The water bends where it moves.*

* [WAIT] #delta:0 #icon:hesitation
    *You hold still.*
    *The eel pauses — then continues past. Unimpressed.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait twitches.*
    *The eel recoils — too obvious. Gone.*
    -> END

* [DRIFT] #delta:18 #icon:curiosity #flag:fact.eel.calculating
    *The line goes slack.*
    *The eel pauses. Turns. Considers.*
    *Something that does not fight is worth studying.*
    -> eel_t1_c1_b2

* [REEL] #delta:0 #icon:shock
    *The line snaps taut.*
    *The eel dissolves into the murk. Gone.*
    -> END


// ============================================================
// Beat 2 — testing. Correct: DRIFT.
// ============================================================

=== eel_t1_c1_b2 ===
*The eel returns, closer now.*
*It winds around the float's reflection.*
*A slow, deliberate orbit.*

* [WAIT] #delta:0 #icon:hesitation
    *The eel winds tighter, then uncoils and is gone.*
    *Stillness bores it.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait jerks.*
    *The eel ripples backward. Distaste. Gone.*
    -> END

* [DRIFT] #delta:17 #icon:contentment #flag:fact.eel.fluid
    *The float drifts again — slack, weightless.*
    *The eel follows, mirroring the current.*
    *It respects what flows.*
    -> eel_t1_c1_b3

* [REEL] #delta:0 #icon:shock
    *The eel snaps its body sideways and vanishes.*
    *Force will never work here.*
    -> END


// ============================================================
// Beat 3 — closing in. Correct: DRIFT.
// ============================================================

=== eel_t1_c1_b3 ===
*The eel coils beneath the float.*
*Its body forms a question mark in the water.*
*Watching. Waiting for you to make a mistake.*

* [WAIT] #delta:0 #icon:boredom
    *The eel uncoils slowly and sinks.*
    *It expected movement — not nothing.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *A twitch.*
    *The eel narrows its eye. Predictable. Gone.*
    -> END

* [DRIFT] #delta:15 #icon:warmth #flag:fact.eel.trust
    *The line goes slack once more.*
    *The eel rises, its body pressed against the float.*
    *Trust, earned through surrender.*
    -> eel_t1_c1_b4

* [REEL] #delta:0 #icon:shock
    *The eel whips sideways.*
    *You feel the line tremble — then it slips free.*
    -> END


// ============================================================
// Beat 4 — the coil. Correct: REEL.
// ============================================================

=== eel_t1_c1_b4 ===
*The eel wraps itself around the line.*
*The float sinks an inch.*
*A decision hangs in the dark water.*

* [WAIT] #delta:0 #icon:hesitation
    *The eel unwinds and sinks.*
    *The moment passes like smoke.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait twitches in the eel's coils.*
    *It releases and fades into the murk.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts free of the eel's grip.*
    *It watches you go.*
    -> END

* [REEL] #delta:1 #icon:shock
    *The line tightens around the coil.*
    *The eel holds — caught in its own embrace.*
    -> END

`;
