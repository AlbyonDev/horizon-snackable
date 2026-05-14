/**
 * Story_Perch — NPC perch (single 4-beat cast).
 *
 * Alert and confident: responds to action, then needs calm reassurance.
 *
 * Combo: TWITCH → WAIT → TWITCH → REEL.
 *   Beat 1 TWITCH +18  | other actions +1
 *   Beat 2 WAIT   +17  | other actions +1
 *   Beat 3 TWITCH +15  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 */

export const PERCH_STORY: string = `

// ============================================================
// Beat 1 — flash of stripes. Combo step: TWITCH.
// ============================================================

=== perch_t1_c1_b1 ===
*A striped bolt cuts across the shallows.*
*Sharp fins flare — then stillness.*
*Two golden eyes lock onto the float.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *The perch stares.*
    *Nothing moves. It loses interest.*
    -> perch_t1_c1_b2

* [TWITCH] #delta:18 #expr:curious #icon:curiosity #flag:fact.perch.hunter
    *The bait twitches.*
    *The perch darts forward — hooked by movement.*
    -> perch_t1_c1_b2

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts lazily.*
    *The perch watches but does not follow. Too slow.*
    -> perch_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The line tears through water.*
    *The perch vanishes in a spray of silver.*
    -> perch_t1_c1_b2


// ============================================================
// Beat 2 — circling. Combo step: WAIT.
// ============================================================

=== perch_t1_c1_b2 ===
*The perch circles once, twice.*
*Its dorsal spine rises — alert but not afraid.*

* [WAIT] #delta:17 #expr:curious #icon:contentment #flag:fact.perch.confident
    *You hold still.*
    *The perch settles. Confidence meets calm.*
    -> perch_t1_c1_b3

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *Another twitch.*
    *The perch flinches — too much, too soon.*
    -> perch_t1_c1_b3

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts.*
    *The perch hangs back, uninterested.*
    -> perch_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *Steel bites water.*
    *The perch bolts three lengths and freezes.*
    -> perch_t1_c1_b3


// ============================================================
// Beat 3 — the dare. Combo step: TWITCH.
// ============================================================

=== perch_t1_c1_b3 ===
*The perch hovers nose-to-float.*
*Its tail flicks — a challenge.*
*Show me something.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *Nothing.*
    *The perch's interest fades.*
    -> perch_t1_c1_b4

* [TWITCH] #delta:15 #expr:warm #icon:delight #flag:fact.perch.playful
    *The bait dances.*
    *The perch lunges — and stops just short. Pleased.*
    -> perch_t1_c1_b4

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts away from the perch.*
    *It does not follow what flees.*
    -> perch_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *Too aggressive.*
    *The perch flares its gills and retreats.*
    -> perch_t1_c1_b4


// ============================================================
// Beat 4 — strike window. REEL with affection 50 → catch.
// ============================================================

=== perch_t1_c1_b4 ===
*The perch closes its mouth around the bait.*
*A test bite — firm but not final.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The perch releases the bait.*
    *It darts away — the moment gone.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait jerks in its mouth.*
    *The perch spits it out and vanishes.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float pulls free.*
    *The perch does not chase what leaves.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:shock
    *The hook sets.*
    *The perch thrashes once — then surrenders.*
    -> END

`;
