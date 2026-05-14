/**
 * Story_Pike — NPC pike (single 4-beat cast).
 *
 * Predator, intense: respects aggression and direct provocation.
 * Only confident, repeated challenges will earn its respect.
 *
 * Combo: TWITCH → TWITCH → TWITCH → REEL.
 *   Beat 1 TWITCH +18  | other actions +1
 *   Beat 2 TWITCH +17  | other actions +1
 *   Beat 3 TWITCH +15  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 */

export const PIKE_STORY: string = `

// ============================================================
// Beat 1 — the predator arrives. Combo step: TWITCH.
// ============================================================

=== pike_t1_c1_b1 ===
*A torpedo shape hangs in the green.*
*Jaws slightly parted. Eyes fixed.*
*The pike does not drift — it aims.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *You wait.*
    *The pike loses interest. Prey does not sit still.*
    -> pike_t1_c1_b2

* [TWITCH] #delta:18 #expr:curious #icon:curiosity #flag:fact.pike.predator
    *The bait jerks.*
    *The pike surges forward — then stops. Measuring.*
    *It respects what fights back.*
    -> pike_t1_c1_b2

* [DRIFT] #delta:1 #expr:neutral #icon:boredom
    *The float drifts lazily.*
    *The pike turns away. Weakness.*
    -> pike_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *The line screams.*
    *The pike bares teeth and vanishes. Not like this.*
    -> pike_t1_c1_b2


// ============================================================
// Beat 2 — sizing up. Combo step: TWITCH.
// ============================================================

=== pike_t1_c1_b2 ===
*The pike returns, closer.*
*Its body coils like a spring.*
*It wants to strike — but not yet.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *Stillness.*
    *The pike's attention drifts to something else.*
    -> pike_t1_c1_b3

* [TWITCH] #delta:17 #expr:curious #icon:delight #flag:fact.pike.intense
    *Another twitch — sharp, defiant.*
    *The pike's body tightens. Good.*
    *A worthy challenge.*
    -> pike_t1_c1_b3

* [DRIFT] #delta:1 #expr:neutral #icon:boredom
    *The float goes slack.*
    *The pike does not chase the weak.*
    -> pike_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *Metal on scale.*
    *The pike thrashes once and breaks free.*
    -> pike_t1_c1_b3


// ============================================================
// Beat 3 — the standoff. Combo step: TWITCH.
// ============================================================

=== pike_t1_c1_b3 ===
*The pike hovers inches from the bait.*
*Gills flare wide. Muscles bunched.*
*One more. Show me one more.*

* [WAIT] #delta:1 #expr:neutral #icon:boredom
    *Nothing.*
    *The pike's fire dims. It sinks back.*
    -> pike_t1_c1_b4

* [TWITCH] #delta:15 #expr:warm #icon:shock #flag:fact.pike.respect
    *The bait snaps sideways.*
    *The pike lunges — stops — trembles with energy.*
    *Respect. Earned through defiance.*
    -> pike_t1_c1_b4

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float goes limp.*
    *The pike turns away in disgust.*
    -> pike_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:shock
    *Too soon — the pike was ready, and you were not.*
    *It spits the hook and dives.*
    -> pike_t1_c1_b4


// ============================================================
// Beat 4 — the strike. REEL with affection 50 → catch.
// ============================================================

=== pike_t1_c1_b4 ===
*The pike opens its jaws around the bait.*
*The line goes tight as iron.*
*Now or never.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The pike holds the bait — then spits it.*
    *The moment dissolves.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait jerks in its mouth.*
    *The pike shakes its head and releases.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:boredom
    *The float drifts from its jaws.*
    *The pike watches it go with contempt.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:shock
    *The hook bites deep.*
    *The pike fights — but you hold.*
    -> END

`;
