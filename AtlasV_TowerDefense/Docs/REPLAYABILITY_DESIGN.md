# H5 Tower Defense — Replayability & Balance Design

Working document for the depth/replayability rebalance. Captures the diagnosis,
the design levers, and the decisions made per lever so future iterations do not
re-litigate settled questions.

## VALIDATED BASELINE (committed to defs, in-engine playtested)

Economy (Constants): start gold **100**, wave bonus **8**, income **5% uncapped**, HP
scale **0.12**. Tower costs (clean ×25 for the UI): Arrow 50, Frost 75, Cannon 100,
Laser 175 (upgrades 50/75 · 75/100 · 100/150 · 175/250). Enemy stats: basic 55hp/1.25,
fast 30hp/2.6/0.18dodge, tank 260hp/0.7/6regen, boss 900hp/0.55/slow-immune; rewards
4/5/12/40. Cannon damage 50 (raised from 40 to chip early tanks). Frost damage 8.
20-wave arc reworked around the threat triangle (see LevelDefs).

Playtest results (the design WORKING):
- Run died W13 with a diversified board (Laser+Frost+Arrow+Cannon), "fair and fun" —
  NOT autopilot. Lost the wave by ONE boss escaping at very low HP = a fair "needed a
  2nd Laser" skill-check. W13 left as-is.
- Run reached W14 holding: built 2 Arrow+Frost+Cannon early, LEAKED bosses W6/W9 (no
  boss-answer yet, −2 lives), then bought + upgraded Laser at W10 "covering my weakness."
  This IS the dynamic-counterplay loop: experienced weakness → recognized it → bought the
  specific answer. 250g banked at W14 (healthy — no runaway, not starved).

KEY VALIDATED DESIGN POINT — the first boss (W6) poses an unavoidable-by-design economic
fork, NOT a tax: banking everything affords a Laser by W6 (~380g) BUT leaves you tower-less
(early swarms/tanks leak); building to survive early means no spare 175 for a Laser (boss
leaks). No free answer → the central early-game decision. Confirmed fair in playtest. Do
not "fix" the boss-before-Laser gap — it's the puzzle.

### FULL 20-WAVE CLEAR — Lever 2 validated end-to-end.

A complete playtest WON at W20 with **7/10 lives** (3 lost: 2 bosses early pre-Laser, 1 tank
on the W15 bulk-stack). Final board: 2 Arrow, Frost, Cannon, 2× T3 Laser — fully diversified,
reached by USING the niches per threat. Economy paced perfectly: full board by W16, exactly
200g for a 2nd Laser right before the W17 boss rush (the hoarding-vs-commit decision at the
peak moment), 340g reserve at W20. Player reported "feels good / fair and fun" throughout.

This confirms the whole thesis: NO autopilot (mono-tower fails), every leak was legible
(knew why + what to do), win-by-mastery not gold-accumulation, and a clear no-leak run to
chase (the 3 lost lives are all avoidable with better play/timing = the replayability hook).
Lever 2 (tower differentiation + scaling + economy) is DONE and validated. Next: decide
Lever 3 (more enemy counters) vs polish, or a 2nd-run no-leak attempt to test the skill ceiling.

> **Method:** one lever at a time, in depth, until each is a confirmed plan —
> not in parallel. Numbers are validated against a simulator/spreadsheet, never
> tuned by eye. The sim reads the real defs (EnemyDefs, LevelDefs, TowerDefs,
> UpgradeDefs, Constants) so it stays honest.

> **Simulator:** `Tools/balance-sim.mjs` (run `node Tools/balance-sim.mjs`).
> Time-stepped combat model; faithfully models damage, fireRate (incl. Laser
> spool-up), splash, slow, slow-immunity, regen, dodge, crit. Abstracts AWAY
> placement/path geometry via a labeled range→engagement model (reach + splash
> catch). Def values are MIRRORED at the top of the file — keep in sync with the
> real .ts files. Calibrated against in-engine test runs (see Calibration Findings).

---

## Calibration Findings (in-engine test runs vs sim)

Four single/dual-tower configs were play-tested from wave 1, leaks logged by type,
and compared to the sim. Headline results:

| Config (fully upgraded) | Walled / died at | To what |
|-------------------------|------------------|---------|
| Solo Arrow (Range→Dmg)  | W7  | tanks + volume |
| Solo Laser (Dmg→Rate)   | W14 | 10 tanks |
| Solo Cannon (Splash→Dmg)| W7  | 8 tanks |
| Frost + Arrow           | W7  | 8 tanks |

### BIGGEST FINDING — tanks/bosses are the universal wall.

**Every current tower configuration dies to bulk HP, and tanks/bosses are the
ONLY things that ever leak.** Basics and fast are never the problem when placed
well; high-HP units always are. The roster has **zero good answer to concentrated
bulk HP**. The "skill-check" tank waves (W7 tank wall, W14 tank tide) are already
the hardest content — but they are *unbeatable* rather than *solvable*, because no
tool concentrates enough single-target DPS. → This is the gap the spooled-Laser
boss/tank-killer fills, and the strongest justification for the niche redesign.

### Laser behaves OPPOSITE to its intended niche (current stats).

Its high fire rate (16 dmg @ 10/s upgraded) makes it an accidental *swarm-clearer*
that chokes on bulk HP — it handled every fast/swarm wave fine and died to tanks.
The planned spool-up redesign (slow base → fast on held target, reset on switch)
inverts exactly this: shreds single tanks/bosses, chokes on swarms. Well-motivated.

### Frost's slow does NOT answer tanks.

Frost+Arrow still leaked 7–8 tanks at W7. Slow delays bulk; it cannot kill it.
→ Frost's niche must be explicitly "fast/swarm control," NEVER sold as an answer
to bulk HP.

### PLACEMENT is a first-order lever (sim's blind spot).

Identical Frost+Arrow at W5: **clustered at entrance leaked 7; spread to cover a
later path stretch leaked 1.** A 7× swing from positioning alone. Coverage is
already one of the dominant axes — confirms Lever 4 is not optional. Implication:
**the sim is an UPPER BOUND assuming good placement.** It can tell us whether stats
suffice for an ideal layout; it cannot tell us a layout is bad. Tune stats so even
a well-placed defense needs the right tools.

### Tuning target (CONFIRMED) — dynamic counter-play, not a fixed build.

We do NOT tune toward "one fully-upgraded tower clears wave X" — that optimizes the
autopilot we're killing. Single-tower-full-upgrade was a *diagnostic*, not a target.

The intended winning strategy is **per-threat counter-play**: the player reads the
upcoming wave and assembles the efficient answer, which must cost enough that they
must *plan / bank* for it. Two named combos become tuning REQUIREMENTS:

1. **Boss → concentrated single-target DPS (spooled Laser).** Laser expensive
   enough that you must *save up* before a boss wave — an unprepared boss punishes.
   (Directly ties to Lever 1 hoarding: "bank for the Laser before the boss".)
2. **Dense wave → Frost + Cannon combo.** Slow bunches the swarm, splash hits the
   cluster. Must be meaningfully better *together* than either alone, and reward
   overlapping placement.

We tune against TWO reference lines simultaneously (sim runs both already):
- **Poor line** (mono-tower / one-type spam) — must FAIL in Act 2–3.
- **Decent line** (right tool per threat, placed well, banked for) — must SUCCEED
  but be TESTED: each skill-check wave needs its matching tool; no wave brute-
  forceable by the wrong tool. The greedy solver surfaces the cheapest exploit;
  tune until it is FORCED to diversify.

Phasing (CONFIRMED): **tune stats first** (enemy/tower/upgrade numbers for good
mix-and-match), **then rework waves** as the stress test that forces the combos.

### SIM GAP to close before tuning: slow→splash synergy.

The sim's splash catch is FLAT (ignores slow). But the Frost+Cannon combo relies on
slowed enemies *bunching* so splash catches more. Without modeling this, the sim
will UNDERVALUE the exact combo we want to reward. Close this (e.g. splash catch
scales up when targets are currently slowed) before trusting tuning numbers.

### Sim calibration status.

Reproduces the headline truths (solo Arrow dies ~W7; tank walls; economy runaway —
gold ceiling 120→14,439 by W20). Bias: slightly *under*-credits single-target
throughput (Laser W12: sim 7 vs real 3) and *over*-credits clustered/AoE coverage
(assumes full-stream engagement regardless of position). Trustworthy for direction
and for "are these stats sufficient"; not to the last gold piece. Sharpen the
range→engagement model when Lever 4 lands.

---

## Design north star

A **tight puzzle on one map**. The acceptance test for the whole effort:

> There must exist **no strategy that clears all 20 waves on autopilot.** The
> only builds that reach wave 20 (and especially a no-leak run) are ones that
> committed DPS efficiently, placed for coverage/path-time, and diversified to
> answer the skill-check waves. A lazy "one upgraded tower + spend gold" line
> must die somewhere in Act 3–4.

Advanced players should feel it is **mandatory** to play deliberately, out of
fear of dying on the later waves — or at least to perfect a no-leak 20-wave run.

---

## Diagnosis

Two distinct problems were conflated at first:

1. **The economy runs away** (interest compounds → money floods → spend pressure
   gone). Real, but it is the **accelerant, not the fire**.
2. **The scaling mismatch trivializes the board.** Towers scale DPS
   *multiplicatively* (×2 damage **and** ×2 fire rate per upgrade tier → one tower
   grows ~16×) while enemies scale HP *linearly* (`1 + waveIndex × 0.15` → wave 20
   is only ~3.85× HP). Even with **zero income**, good placement + upgrades on a
   single tower beats every wave. **This is the root cause.**

Consequence: income only changes *how fast* you reach a dominant board, not
*whether* you do. Fixing income alone leaves a shallow game.

Supporting issues:
- No enemy hard-counters raw DPS, so a single Laser is a universal answer
  (high rate beats dodge, raw DPS beats regen, ignores slow-immunity).
- Placement is nearly consequence-free: open grid, fixed "furthest-along"
  targeting, range upgrades available, single lane.

---

## The four levers

Sequenced by impact on the root cause. **Lever 2 goes first** (root cause);
income (Lever 1) is designed but tunes *after* Lever 2 defines what a tight wave
costs to beat.

| Lever | Scope | Status |
|-------|-------|--------|
| **2 — Scaling / upgrades** | Upgrade multipliers (×2/×2 → ~×1.5–1.6), HP curve, late-wave density | **NEXT — root cause** |
| **1 — Economy / income** | Keep interest, recontextualize; leaks = hard loss | **DESIGNED** (numbers pending sim) |
| **3 — Enemy counters** | Armor / split / slow-shield so DPS isn't universal | On the table |
| **4 — Placement** | Path geometry, limited build tiles, targeting modes | On the table |

The levers **multiply**, they are not independent. Lever 1 + Lever 2 together
create the core loop (limited money + no single-tower solution → must choose
which towers, which upgrades, where). Lever 3 makes the *choice* meaningful
(forces diversity). Lever 4 turns "solved by diversity" into "solved by
diversity *and* skill".

---

## Lever 1 — Economy / income — **DESIGNED**

### Decision: keep interest, recontextualized as hoarding-with-opportunity-cost.

The skill expression is **timing your commitment** (WC3-TD income lineage):
each wave the player chooses between

- **build to full strength now** — safe this wave, no economy growth, vs.
- **hold a reserve** — earn interest, bet you survive under-built, be
  overwhelming at the next skill check.

This is a genuine fork with no default answer; the right choice depends on
reading the upcoming waves. It delivers the north star natively: the player who
builds everything immediately is comfortable now but poor at the wave that needs
a burst of new towers, and dies. The fear of the late skill check is *what makes
you hoard*; hoarding well is *what beats it*.

### Why NOT the alternatives considered (do not revisit without new reasoning):

- **Remove interest entirely.** Rejected. Interest is not the root cause
  (scaling is). Removing it just makes the player poorer on the same autopilot
  win; the game still feels shallow. Interest, recontextualized by tight Lever-2
  waves, becomes the *payout for the risk of being under-built* — same mechanic,
  different meaning.
- **Cap interest low (Bloons-style).** Deferred, not adopted. A soft cap is only
  needed if the sim shows uncapped interest still trivializes *even with tight
  Lever-2 scaling*. Decide against the sim, do not guess. The WC3 instinct favors
  uncapped (banking should be genuinely powerful).
- **Speed / fast-clear bonus.** Rejected as the income mechanic. Fatal flaw: fast
  killing is *already* the dominant survival strategy, so paying gold for it
  **reinforces the obvious line instead of creating a decision**, and converges
  players onto one repeated build (anti-replayability). A good income mechanic
  must pull *against* the survival incentive (hoarding does); speed pulls *with*
  it. (Its one virtue — teaching placement via firing-arc coverage — is recovered
  under Lever 4 instead.)
- **Clean-play / no-leak bonus.** Rejected. With only 10 lives, surviving with no
  leak is already what a competent player does and is already +EV (lives kept).
  Paying extra for it is a flat bonus with extra steps — no decision, no skill
  expression.

### Income source roles (each does one honest job):

- **Kill reward** — variable, skill-correlated backbone. Kill more → earn more.
- **Flat round bonus** — the stabilizing floor that prevents an income
  death-spiral (a bad wave earning less → harder next wave → even less).
- **Interest** — the skill lever: payout for the risk of hoarding while
  under-built. NOT a free reward for sitting on gold.

### Mechanics changes this lever implies:

- **Leaks must be a hard net loss** — losing an enemy costs the life *and*
  forfeits its kill reward, tuned so "milk income by riding the edge of leaking"
  is never +EV. This is what the *free* interest version lacked and what made
  edge-riding degenerate.
- **Fix the START_GOLD inconsistency.** `Constants.START_GOLD = 120` but
  `LevelDefs[0].startGold = 100`. ResourceService reads the Constants value, so
  the LevelDef field is dead. Resolve to one source of truth.

### Pending sim (tune after Lever 2):

Interest rate, cap-or-not, flat bonus magnitude, reward levels, start gold —
all locked against the simulator once Lever 2 establishes the cost-to-beat-a-wave
target. Tuning income before scaling is tuning against a moving target.

---

## Reframing — scaling is NOT the root of "shallow" (important)

A balancing pass (Lever 2) tunes *how much DPS the player needs*. It never
changes *whether the player has to think*. Harder/easier curves, tower-side or
enemy-side, are all tweaking the **same single relation** (DPS output vs effective
HP). Get it right and the difficulty *feels* correct — but the core loop stays
`money → kill → money` on autopilot, and the choices still don't matter.

The verified numbers confirm this. Full upgrade path reaches only **×4 DPS**
(one damage doubling + one rate doubling — NOT the ×16 first assumed; atoms don't
all stack). Enemy HP at wave 20 is **×3.85**. The two curves are nearly parallel,
so a single upgraded Laser (160 DPS) kills a wave-20 boss in ~14s and never stops
being sufficient — the late game *plays identically* to the early game. Regen
(8/s vs 160 DPS = 5%) and dodge are cosmetic against a real DPS tower.

**The root cause of "shallow / not a puzzle" is that no threat forces a
*categorical* response.** Every wave is answered by the same category of tool,
just more of it. Scaling makes difficulty correct; **counters make the game a
puzzle.** Replayability lives in the moment a working solution *stops working*
and the player must *recognize* it and respond with a different *kind* of thing —
not a bigger thing. (KR/BTD fliers don't have more HP; they break the rules the
player's towers play by.)

Design principle for the puzzle (the real target):

> Every threat type must be answerable by exactly one category of tool the player
> isn't already using, and **unanswerable by simply scaling up** the tool they
> are. The puzzle is *identifying* the threat and *placing the specific counter
> at the specific place* — not affording more DPS.

→ This makes **Lever 3 (counters)**, not Lever 2 (scaling), the lever that
addresses replayability. Lever 2 is now **secondary**: a numbers pass to make the
curve feel right, done in parallel/after, not as the fix for shallowness.

---

## Lever 2 — Tower differentiation + scaling pass

### Reframed by a key insight: "Laser is just Arrow on steroids."

The towers are not differentiated. Laser (8 dmg × 5.0 rate = 40 DPS, range 3.60)
is strictly better than Arrow (12 × 1.5 = 18 DPS, range 2.70) at Arrow's own
single-target job — more DPS, more range, same profile. The strongest generalist
wins by default; that, not DPS scaling, is the real "collapses to one tower"
mechanism. So Lever 2's spine is **give each tower a hard-walled niche** (same
principle as Lever 3, applied to the roster): each tower is the best answer to
ONE thing and physically cannot do another tower's job. **Hard walls**, not soft
preferences (confirmed).

### Niche framework (CONFIRMED spine):

| Tower | Niche | The hard wall (why the wrong tool fails) |
|-------|-------|------------------------------------------|
| **Arrow** | Cheap early generalist | No wall — you *outgrow* it. The starter you replace. Stays ~as-is. |
| **Cannon** | AoE / anti-swarm | Only AoE clears a tight swarm before it crosses; single-target tools can't kill N enemies in the spawn window. |
| **Frost** | Control / enabler | Deals ~0 damage — never kills alone, only slows so others get more shots. Building only Frost must feel *wrong*. |
| **Laser** | Single-target boss-killer | Spool-up mechanic (below): destroys one boss, sputters on swarms. |

### Targeting modes — DATA-DRIVEN per tower (CONFIRMED, remixable):

Target selection is a **per-tower property**, not a Laser special-case, so the game
stays remixable (players/agents can try targeting rules on any tower or add new ones).
Flow a future agent follows to add a mode:
1. add a value to `TargetingMode` enum (Types.ts),
2. handle it in `TowerController._acquireTarget()` (one switch),
3. set `targeting:` on a tower in TowerDefs (data).

Implemented now (only what's used — no speculative modes):
- **First** (default, omitted) — furthest along the path (closest to leaking).
- **Sticky** — hold current target while alive + in range; re-acquire by First when lost.

The **Laser uses Sticky** so its spool can ramp (hold a boss while chaff runs past).
Frost/Cannon/Arrow stay **First** — deliberately: sticky is DETRIMENTAL to Frost (an
enabler must keep spreading slow to fresh enemies, not glue to one already-slowed
target). Spool-up is DECOUPLED from targeting — it ramps on time-on-target regardless
of how the target was chosen, so a future mode could pair with spool freely.

(Earlier mistake, corrected: sticky was first applied GLOBALLY to all towers without
consulting the user — reverted. Sticky ⇔ targeting mode, opt-in per tower.)

### DEFERRED idea — reset spool on dodge (test base spool first):

Resetting the spool when a shot is DODGED (fast enemy, 15% dodge) would deepen the
Laser's anti-swarm wall through an existing mechanic — a dodged beam loses its
lock-on ramp, making Laser-vs-fast distinctly worse. HELD until after the in-engine
test: the spool + sticky already make Laser bad at swarms (constant retargeting
never ramps), so this may be gilding. Add only if swarms still feel too survivable
for the Laser. Wiring when revisited (recommended): fire a "shot dodged" event
carrying the origin tower id so the tower resets its spool — keeps dodge resolution
in ProjectileController (line ~149) rather than moving it to fire-time (which would
risk splash/other dodge readers). Requires projectiles to carry a tower ref.

### Laser spool-up mechanic (CONFIRMED — new code, TowerController):

Fire rate **ramps up the longer it holds the same target, resets to base rate on
target switch.** Boss = holds one target → spools to max rate → melts it. Swarm =
constantly switches targets → constantly resets → stuck at slow base rate →
pathetic DPS. This is a **self-enforcing hard wall you cannot upgrade around**
(the reset is mechanical, not a stat), and it makes Laser play *mechanically*
different from Arrow, not just stat-different. Readable on mobile (beam visibly
intensifies on a boss, sputters on a swarm).
Knobs (sim-tuned): base rate (slow ~1.0/s), max rate (~6–8/s), spool time to max
(~2–3s), ramp curve (linear vs eased).

**VALIDATED IN-ENGINE** (first-draft profile base 1.5 → max 8 over 2.5s, per-hit 8):
single spooled Laser held W7's 8-tank wall to 1 leak (old Cannon DIED here), leaked
2 on W9's bulk-stacked 2-boss+5-tank wave (correct: one boss-killer can't solo bulk),
and **DIED to W10's 25-fast swarm** (the swarm wall works — constant retarget never
ramps). Niche flip confirmed: from accidental swarm-clearer → single-target
boss/tank specialist helpless vs swarms.

**SPOOL IS INNATE — settled (do not revisit without new reasoning).** Spool is the
Laser's fixed IDENTITY, not a leanable modifier like crit/splash. Considered making
spool an unlock/choice (flat-rate vs spool) for expressiveness — REJECTED: it would
reintroduce the flat-rate generalist (the "arrow on steroids" we removed) and re-open
the balance just closed. Expressiveness comes from MODIFIERS on top of the fixed
spool identity (damage/crit/range/+target), not from making the core optional. The
expensive innate-spool Laser IS the reward for the Lever-1 hoarding decision: banking
gold for a Laser before a boss wave → you get the one tool that melts the boss. The
economy decision and the combat tool are the same decision from two ends.

### Laser upgrade tree — sticky point: range/+target can't compete on DPS.

Math (total damage per boss engagement, accounting for time-in-range + spool ramp):
Dmg→Rate 2814 (assassin, dominant) · Dmg→Crit 1688+spikes (gamble/juice) ·
Range→Dmg 1833 · Range→Range 1130 (worst boss). Range NEVER wins a DPS matchup —
throughput dominates the integral; range's real value is COVERAGE (reach a segment
no other tower covers), invisible to single-target DPS math (placement / Lever 4).
Decision goal (per user): tree leaves need not be EQUAL — they must be situational
OPTIONS for per-tower expressiveness (one Laser as chokepoint assassin, another as
back-of-map sniper catching leakers). Proposed: T1 [Damage, Range]; Damage→[Crit,
Rate] (assassin: gamble or max-DPS); Range→[Range, +1 target] (coverage: sniper-reach
for leakers, or multi-lane chip). Guardrail keeping it honest: Range builds do ~1/3
the boss DPS (916–1130 vs 2814), so picking coverage is a real sacrifice, not creep.
PENDING: needs a `+1 target` atom + multi-target firing; the swarm impact of +1
target must be validated IN-ENGINE (sim swarm math currently unreliable — it claimed
the assassin clears W10, contradicting the in-engine death). NOT yet built.

Crit added to the tree for feel/juice — crit numbers fly at full spool speed; reuses
existing CritService (`isCrit` + `critMultiplier` display path).

### Laser upgrade tree — SETTLED (shipped in TowerDefs):

```
T1: [ Range , Rate ]
  Range → [ Range , Damage ]   sniper (max reach, low DPS) / marksman (reach + punch)
  Rate  → [ Crit  , Range  ]   fast-crit (rapid crit stream) / fast-reach
```
Boss-total DPS: sniper 1129 (range 5.6) · marksman 1832 · fast-crit 1687 · fast-reach 1832.

KEY FINDING that drove this (proven in sim, do not re-litigate): with `Rate = ×2
fireRate`, **Rate and Damage are mathematically IDENTICAL for DPS in every matchup**
(confirmed at all retargeting rates — they are true twins). So four NUMERICALLY
distinct leaves are impossible from these 4 atoms unless you either (a) stack
Damage+Rate (→ runaway 2812 assassin, rejected as "too good") or (b) redefine Rate
as "faster spool ramp / lower spoolTime" (the only thing that breaks the symmetry —
diverges vs short-lived targets, and stacking then adds only ~5% on bosses).

DECISION: accept ONE numeric twin (Range→Damage ≡ Rate→Range) rather than redefine
Rate. Justification: the twin differs in FEEL (big slow hits vs rapid small hits) and
in the `fireRate`-vs-`damage` stat split, which WILL matter once hit-size-dependent
effects exist (armor / dodge-reset). Ceiling is capped at 1832 (no dominant assassin
build — the "too good" concern). T1 is a real fork: coverage (Range) vs aggression
(Rate). Crit lives on the Rate branch (rapid crits = juiciest). The "redefine Rate =
faster spool" option remains on the table if the twin ever feels bad or if we want 4
truly-distinct leaves later.

Updated TowerDefs design-constraint: laser MAY take range twice (Range→Range sniper);
crit moved to laser's Rate path. (Old "range on laser max once" constraint was retired.)

### Cannon niche — VALIDATED IN-ENGINE: it's about BUNCHING, not numbers/HP.

Key finding (in-engine, base HP, Cannon Splash→Damage):
- Solo Cannon vs **25 fast** → leaked **9**. Fast (speed 2.5) STRING OUT along the path
  → splash catches singles → Cannon drowns.
- Solo Cannon vs **30 basic** → **CLEARED**, splash one-shotting **2–3 at a time**. Basic
  (speed 1.25) stay naturally BUNCHED → splash hits clusters → Cannon solos them.
- Cannon + Frost vs **25 fast** → leaked **2** (down from 9). Frost slows the fast to
  basic-like speed → they RE-BUNCH → splash works again. The 2 leaks were **dodges**
  (fast 15% dodge vs Cannon's slow 0.6/s fire rate — too few shells to beat the RNG).

**Conclusion — the niche is precise:** Cannon's effectiveness is ENTIRELY about whether
the swarm is BUNCHED. Spread is the enemy, not count or HP.
- Cannon **solos slow/bunched swarms** (basic).
- Fast/SPREAD swarms break the Cannon → that's when **Frost re-bunches them** (the combo).
- Dodge keeps even the combo honest vs fast (a few trickle through) → leaves room for a
  high-rate mop-up tool. Not a perfect solve.

So the Frost+Cannon combo is specifically the answer to **fast/spread** swarms, not
swarms generically. Dynamic counterplay: read the wave — basic-dense → Cannon alone;
fast-heavy → Cannon+Frost placed to bunch. Frost placed UPSTREAM of the Cannon so
enemies bunch passing through the slow, then get shelled.

**Wave-authoring lever (later phase):** swarm difficulty is controlled by SPEED/SPREAD,
not just count — a fast swarm is a hard Cannon-check demanding Frost; a basic swarm is a
soft Cannon-solo check. Two pressures from one "swarm" concept.

### DO NOT "FIX": fast enemies spread out (it's the niche, not a bug).

Spawn interval is constant (0.75s), so faster enemies travel further between spawns and end
up MORE spaced out along the path; slow enemies (basic) bunch naturally. This speed→spacing
relationship is the MECHANICAL FOUNDATION of the Cannon/Frost niche: fast = spread → Cannon's
splash catches singles → you need Frost to slow them back into bunches. "Fixing" the spacing
(e.g. spawning fast closer together) would let Cannon solo fast swarms and COLLAPSE the combo
niche. Leave it. (Confirmed intended after a player flagged it.) If a specific wave should feel
like a sudden RUSH rather than an even stream, the lever is BURST-spawning per wave — a
wave-authoring tool — NOT changing enemy speed or the global spawn rate.

### CORRECTION to earlier "slow = time only, no bunching" decision:

That decision was WRONG — in-engine proof shows bunching is real and is the whole
mechanism of the combo (9→2 on fast). Slow induces bunching by reducing speed so trailing
enemies catch up. The sim must model this (slow → denser cluster → bigger splash catch);
the "no bunching" sim change made for that decision must be REVERTED.

### Cannon's job via authored swarm waves (CONFIRMED — data only):

No new enemy. Author **swarm waves** = big tight bursts of cheap low-HP enemies
(`basic`/`fast`) in a short spawn window, so only AoE clears them in time. This
REQUIRES the late spawn-density knob (shorter `ENEMY_SPAWN_INTERVAL` or bursting
groups) — a slow trickle is killable one-at-a-time and is not a Cannon-check.
So "swarm wave" = high count + tight timing; wave-comp work and density knob are
coupled.

### Stat rework direction (numbers TBD via sim):

- **Arrow** — low cost, moderate rate, low damage. Disposable early generalist. ~as-is.
- **Cannon** — splash central; reliably clears bursts (maybe wider radius / faster).
- **Frost** — damage → ~0, lean fully into slow. Pure enabler.
- **Laser** — spool-up profile; single-target; long range. Loses swarm-spray entirely.

### Scaling numbers — set LAST, to enforce the niches:

- **Upgrade multipliers** — `×2.0` dmg / `×2.0` rate per tier (full path = ×4 DPS).
- **HP scaling** — linear `+15%/wave` (wave 20 = ×3.85). The curves are nearly
  parallel today (tower ×4 vs HP ×3.85) → flat difficulty.
- **Wave compositions** — existing comps were tuned for old math; rework needed.

Target curve is an OUTPUT of the niches, not a guess: pick numbers so "by wave X,
the threats present cannot all be answered by one tower." Validate in the sim so a
pass doesn't trade one degenerate strategy for another. (When exactly one tower
should become insufficient = TBD from the sim, not pre-decided.)

---

## Lever 3 — Enemy counters — THE replayability lever (see reframing)

Give threats a **categorical** answer so the player must recognize them and place
a specific counter — not just scale up. This is where the puzzle/replayability
actually comes from.

### Confirmed first rule-breaker: FLYING / path-skip units.

Chosen because it is the most *readable* (instant "oh, a flier" recognition —
right for mobile portrait / limited-commitment sessions), it makes **placement**
matter (you must cover the air lane), and it is **categorically** unanswerable by
upgrading ground towers — the exact "working strategy suddenly has a hole"
feeling targeted. Well-understood TD pattern (KR/BTD).

Mechanics required (a genuine vertical slice, not a number tweak):
- **(a)** enemy movement mode that ignores waypoints (e.g. straight entry→exit
  line) instead of following the path;
- **(b)** a tower capability flag for what can target air, honored by
  `TargetingService.getBestTarget`;
- **(c)** at least one tower (or upgrade branch) that *can* hit air — else the
  threat is unbeatable.

OPEN FORK (decide before building): is the answer a **dedicated counter
tower/type** (own + place the right tool — clean shop choice) or a **counter
upgrade on an existing tower** (spend an upgrade slot on the answer, trading raw
power — folds into the upgrade-tree puzzle and the Lever-1 hoarding tension: bank
for the anti-air upgrade before the flying wave)?

Test plan: drop a flying wave into ~W8, confirm an existing ground laser-wall has
a real hole that upgrading it cannot fix.

### Other rule-breakers on the table (later, same principle):

**Invisible/stealth** (targetable only inside a detector's range — positional
answer; risk on mobile: "why isn't my tower shooting?"), **true immunity**
(physical/magic — forces tower-type switch; existing `slowImmune` is too soft a
resist to count), **split-on-death** (rewards AoE at the kill spot),
**speed/burst spikes** (overwhelm single-point coverage → spread placement).
Armor/flat-reduction is cheapest but least "aha" — feels like a balance dial
unless pushed to a true wall.

---

## Lever 4 — Placement — on the table

Make where-you-build matter: **path geometry** that rewards AoE / firing-arc
coverage (cheap, PathDefs only), **limited build tiles / chokepoints** (strongest
for puzzle feel, real map-design pass), **targeting modes** (most depth, most
build). Note: the placement-teaching virtue of the rejected speed bonus
(entrance towers waste half their arc) is recovered here.
