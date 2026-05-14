/**
 * Story_Catfish — NPC catfish (single 4-beat cast).
 *
 * Wild fish: no dialogue, only narration. Each line is wrapped in *...* so
 * the engine's scenery mode kicks in (italic, centered, no speaker name)
 * via FloaterGame's `displayedText.startsWith('*')` check.
 *
 * Combo: WAIT → TWITCH → DRIFT → REEL.
 *   Beat 1 WAIT   +18  | other actions +1
 *   Beat 2 TWITCH +17  | other actions +1
 *   Beat 3 DRIFT  +15  | other actions +1
 *   Beat 4 REEL   → catch (intercepted by FloaterGame when affection >= 50)
 *
 * Best path = 50 → REEL beat 4 catches.
 * Off-combo +1 keeps a small carry-over for the next encounter.
 */

export const CATFISH_STORY: string = `

// ============================================================
// Beat 1 — surface contact. Combo step: WAIT.
// ============================================================

=== catfish_t1_c1_b1 ===
*A heavy shape stalls under the float.*
*The line tightens, then slacks.*
*Whiskers brush the surface.*

* [WAIT] #delta:18 #expr:curious #icon:hesitation #flag:fact.catfish.bottom_dweller
    *The catfish hangs still beneath the float.*
    *Calm answers calm.*
    -> catfish_t1_c1_b2

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The catfish flinches.*
    *The line hisses, then settles.*
    -> catfish_t1_c1_b2

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts wide.*
    *The catfish keeps its distance.*
    -> catfish_t1_c1_b2

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *Too soon.*
    *The catfish slips back into the dark.*
    -> catfish_t1_c1_b2


// ============================================================
// Beat 2 — interest. Combo step: TWITCH.
// ============================================================

=== catfish_t1_c1_b2 ===
*The shape drifts closer.*
*Two black eyes, slow, considering.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The catfish hovers, unmoved.*
    *Patience alone is not enough now.*
    -> catfish_t1_c1_b3

* [TWITCH] #delta:17 #expr:curious #icon:curiosity #flag:fact.catfish.curious
    *The bait twitches.*
    *The catfish tilts — interested.*
    -> catfish_t1_c1_b3

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts.*
    *The catfish does not follow.*
    -> catfish_t1_c1_b3

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *Steel scrapes against scale.*
    *The catfish recoils.*
    -> catfish_t1_c1_b3


// ============================================================
// Beat 3 — pursuit. Combo step: DRIFT.
// ============================================================

=== catfish_t1_c1_b3 ===
*The catfish circles, head low.*
*A slow, deliberate pass beneath the float.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The catfish circles once more, then idles.*
    *The moment thins.*
    -> catfish_t1_c1_b4

* [TWITCH] #delta:1 #expr:neutral #icon:curiosity
    *The bait twitches a second time.*
    *The catfish has already seen the trick.*
    -> catfish_t1_c1_b4

* [DRIFT] #delta:15 #expr:warm #icon:contentment #flag:fact.catfish.follows_drift
    *The float drifts with the current.*
    *The catfish follows, locked in.*
    -> catfish_t1_c1_b4

* [REEL] #delta:0 #expr:alarmed #icon:surprise
    *The catfish bolts a half-length, then steadies.*
    *Almost lost it.*
    -> catfish_t1_c1_b4


// ============================================================
// Beat 4 — strike window. REEL with affection 50 → catch.
// ============================================================

=== catfish_t1_c1_b4 ===
*The catfish noses the float.*
*The line pulls taut.*

* [WAIT] #delta:1 #expr:neutral #icon:hesitation
    *The catfish hangs there, then sinks back.*
    *The window closes.*
    -> END

* [TWITCH] #delta:1 #expr:neutral #icon:surprise
    *The bait twitches.*
    *The catfish hesitates, then turns away.*
    -> END

* [DRIFT] #delta:1 #expr:neutral #icon:hesitation
    *The float drifts past the catfish.*
    *The line goes slack.*
    -> END

* [REEL] #delta:1 #expr:warm #icon:shock
    *The line snaps tight.*
    -> END

`;
