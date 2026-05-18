/**
 * Story_Perch — NPC perch (single 4-beat puzzle).
 *
 * Alert and confident: responds to action, then needs calm reassurance.
 *
 * Puzzle combo: TWITCH → WAIT → TWITCH → REEL.
 *   Any wrong action → perch leaves immediately (-> END).
 *   Correct sequence through beat 4 REEL → catch.
 */

export const PERCH_STORY: string = `

// Entry dispatcher — NPC always routes to its single cast.
=== perch_entry ===
-> perch_t1_c1_b1

// ============================================================
// Beat 1 — flash of stripes. Correct: TWITCH.
// ============================================================

=== perch_t1_c1_b1 ===
*A striped bolt cuts across the shallows.*
*Sharp fins flare — then stillness.*
*Two golden eyes lock onto the float.*

* [WAIT] #delta:0 #icon:boredom
    *The perch stares.*
    *Nothing moves. It loses interest and is gone.*
    -> END

* [TWITCH] #delta:18 #icon:curiosity #flag:fact.perch.hunter
    *The bait twitches.*
    *The perch darts forward — hooked by movement.*
    -> perch_t1_c1_b2

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts lazily.*
    *The perch watches but does not follow. Too slow.*
    -> END

* [REEL] #delta:0 #icon:shock
    *The line tears through water.*
    *The perch vanishes in a spray of silver.*
    -> END


// ============================================================
// Beat 2 — circling. Correct: WAIT.
// ============================================================

=== perch_t1_c1_b2 ===
*The perch circles once, twice.*
*Its dorsal spine rises — alert but not afraid.*

* [WAIT] #delta:17 #icon:contentment #flag:fact.perch.confident
    *You hold still.*
    *The perch settles. Confidence meets calm.*
    -> perch_t1_c1_b3

* [TWITCH] #delta:0 #icon:surprise
    *Another twitch.*
    *The perch flinches — too much, too soon. It bolts.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts.*
    *The perch hangs back, uninterested, then is gone.*
    -> END

* [REEL] #delta:0 #icon:shock
    *Steel bites water.*
    *The perch bolts and does not return.*
    -> END


// ============================================================
// Beat 3 — the dare. Correct: TWITCH.
// ============================================================

=== perch_t1_c1_b3 ===
*The perch hovers nose-to-float.*
*Its tail flicks — a challenge.*
*Show me something.*

* [WAIT] #delta:0 #icon:boredom
    *Nothing.*
    *The perch's interest fades. It drifts off.*
    -> END

* [TWITCH] #delta:15 #icon:delight #flag:fact.perch.playful
    *The bait dances.*
    *The perch lunges — and stops just short. Pleased.*
    -> perch_t1_c1_b4

* [DRIFT] #delta:0 #icon:hesitation
    *The float drifts away from the perch.*
    *It does not follow what flees.*
    -> END

* [REEL] #delta:0 #icon:shock
    *Too aggressive.*
    *The perch flares its gills and retreats.*
    -> END


// ============================================================
// Beat 4 — strike window. Correct: REEL.
// ============================================================

=== perch_t1_c1_b4 ===
*The perch closes its mouth around the bait.*
*A test bite — firm but not final.*

* [WAIT] #delta:0 #icon:hesitation
    *The perch releases the bait.*
    *It darts away — the moment gone.*
    -> END

* [TWITCH] #delta:0 #icon:surprise
    *The bait jerks in its mouth.*
    *The perch spits it out and vanishes.*
    -> END

* [DRIFT] #delta:0 #icon:hesitation
    *The float pulls free.*
    *The perch does not chase what leaves.*
    -> END

* [REEL] #delta:1 #icon:shock
    *The hook sets.*
    *The perch thrashes once — then surrenders.*
    -> END

`;
