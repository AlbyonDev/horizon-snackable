/**
 * Story_Catfish — NPC catfish (single 4-beat puzzle).
 *
 * Wild fish: no dialogue, only narration. Each line is wrapped in *...* so
 * the engine's scenery mode kicks in (italic, centered, no speaker name).
 *
 * Puzzle combo: WAIT → TWITCH → DRIFT → REEL.
 *   Any wrong action → catfish leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 */

export const CATFISH_STORY: string = `

// Entry dispatcher — NPC always routes to its single cast.
=== catfish_entry ===
-> catfish_t1_c1_b1

// ============================================================
// Beat 1 — surface contact. Correct: WAIT.
// ============================================================

=== catfish_t1_c1_b1 ===
*A heavy shape stalls under the float.*
*The line tightens, then slacks.*
*Whiskers brush the surface.*

* [WAIT] #delta:18 #icon:hesitation #flag:fact.catfish.bottom_dweller
    *The catfish hangs still beneath the float.*
    *Calm answers calm.*
    -> catfish_t1_c1_b2

* [TWITCH] #delta:0 #icon:surprise
    *The catfish flinches at the sudden jerk.*
    *It vanishes into the silt.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts wide. The catfish keeps its distance.*
    *Gone.*
    -> END

* [REEL] #delta:0 #icon:surprise
    *Too soon. The catfish slips back into the dark.*
    -> END


// ============================================================
// Beat 2 — interest. Correct: TWITCH.
// ============================================================

=== catfish_t1_c1_b2 ===
*The shape drifts closer.*
*Two black eyes, slow, considering.*

* [WAIT] #delta:0 #icon:hesitation
    *The catfish hovers, unmoved.*
    *Patience alone is not enough now — it sinks away.*
    -> END

* [TWITCH] #delta:17 #icon:curiosity #flag:fact.catfish.curious
    *The bait twitches.*
    *The catfish tilts — interested.*
    -> catfish_t1_c1_b3

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts. The catfish does not follow.*
    *Gone.*
    -> END

* [REEL] #delta:0 #icon:surprise
    *Steel scrapes against scale.*
    *The catfish recoils and vanishes.*
    -> END


// ============================================================
// Beat 3 — pursuit. Correct: DRIFT.
// ============================================================

=== catfish_t1_c1_b3 ===
*The catfish circles, head low.*
*A slow, deliberate pass beneath the float.*

* [WAIT] #delta:0 #icon:hesitation
    *The catfish circles once more, then idles.*
    *The moment thins, then breaks.*
    -> END

* [TWITCH] #delta:0 #icon:curiosity
    *The bait twitches a second time.*
    *The catfish has already seen the trick. Gone.*
    -> END

* [DRIFT] #delta:15 #icon:contentment #flag:fact.catfish.follows_drift
    *The float drifts with the current.*
    *The catfish follows, locked in.*
    -> catfish_t1_c1_b4

* [REEL] #delta:0 #icon:surprise
    *The catfish bolts.*
    *Gone before the line settles.*
    -> END


// ============================================================
// Beat 4 — strike window. Correct: REEL.
// ============================================================

=== catfish_t1_c1_b4 ===
*The catfish noses the float.*
*The line pulls taut.*

* [WAIT] #delta:0 #icon:hesitation
    *The catfish hangs there, then sinks back.*
    *The window closes.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait twitches.*
    *The catfish hesitates, then turns away.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts past the catfish.*
    *The line goes slack.*
    -> END

* [REEL] #delta:1 #icon:shock
    *The line snaps tight.*
    -> END

`;
