/**
 * Story_Pike — NPC pike (single 4-beat puzzle).
 *
 * Predator, intense: respects aggression and direct provocation.
 * Only confident, repeated challenges will earn its respect.
 *
 * Puzzle combo: TWITCH → TWITCH → TWITCH → REEL.
 *   Any wrong action → pike leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 */

export const PIKE_STORY: string = `

// Entry dispatcher — NPC always routes to its single cast.
=== pike_entry ===
-> pike_t1_c1_b1

// ============================================================
// Beat 1 — the predator arrives. Correct: TWITCH.
// ============================================================

=== pike_t1_c1_b1 ===
*A torpedo shape hangs in the green.*
*Jaws slightly parted. Eyes fixed.*
*The pike does not drift — it aims.*

* [WAIT] #delta:0 #icon:boredom
    *You wait.*
    *The pike loses interest. Prey does not sit still.*
    -> END

* [TWITCH] #delta:18 #icon:curiosity #flag:fact.pike.predator
    *The bait jerks.*
    *The pike surges forward — then stops. Measuring.*
    *It respects what fights back.*
    -> pike_t1_c1_b2

* [DRIFT] #delta:0 #icon:boredom
    *The float drifts lazily.*
    *The pike turns away. Weakness.*
    -> END

* [REEL] #delta:0 #icon:shock
    *The line screams.*
    *The pike bares teeth and vanishes. Not like this.*
    -> END


// ============================================================
// Beat 2 — sizing up. Correct: TWITCH.
// ============================================================

=== pike_t1_c1_b2 ===
*The pike returns, closer.*
*Its body coils like a spring.*
*It wants to strike — but not yet.*

* [WAIT] #delta:0 #icon:boredom
    *Stillness.*
    *The pike's attention drifts to something else. Gone.*
    -> END

* [TWITCH] #delta:17 #icon:delight #flag:fact.pike.intense
    *Another twitch — sharp, defiant.*
    *The pike's body tightens. Good.*
    *A worthy challenge.*
    -> pike_t1_c1_b3

* [DRIFT] #delta:0 #icon:boredom
    *The float goes slack.*
    *The pike does not chase the weak. It is gone.*
    -> END

* [REEL] #delta:0 #icon:shock
    *Metal on scale.*
    *The pike thrashes once and breaks free.*
    -> END


// ============================================================
// Beat 3 — the standoff. Correct: TWITCH.
// ============================================================

=== pike_t1_c1_b3 ===
*The pike hovers inches from the bait.*
*Gills flare wide. Muscles bunched.*
*One more. Show me one more.*

* [WAIT] #delta:0 #icon:boredom
    *Nothing.*
    *The pike's fire dims. It sinks back into the green.*
    -> END

* [TWITCH] #delta:15 #icon:shock #flag:fact.pike.respect
    *The bait snaps sideways.*
    *The pike lunges — stops — trembles with energy.*
    *Respect. Earned through defiance.*
    -> pike_t1_c1_b4

* [DRIFT] #delta:0 #icon:hesitation
    *The float goes limp.*
    *The pike turns away in disgust.*
    -> END

* [REEL] #delta:0 #icon:shock
    *Too soon — the pike was ready, and you were not.*
    *It spits the hook and dives.*
    -> END


// ============================================================
// Beat 4 — the strike. Correct: REEL.
// ============================================================

=== pike_t1_c1_b4 ===
*The pike opens its jaws around the bait.*
*The line goes tight as iron.*
*Now or never.*

* [WAIT] #delta:0 #icon:hesitation
    *The pike holds the bait — then spits it.*
    *The moment dissolves.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait jerks in its mouth.*
    *The pike shakes its head and releases.*
    -> END

* [DRIFT] #delta:0 #icon:boredom
    *The float drifts from its jaws.*
    *The pike watches it go with contempt.*
    -> END

* [REEL] #delta:1 #icon:shock
    *The hook bites deep.*
    *The pike fights — but you hold.*
    -> END

`;
