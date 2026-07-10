# Goblin Clash — Game Design Document

*A player- and designer-facing overview of the current game: what it is, how it feels, and everything that's in it right now.*

---

## 1. The Pitch

**Goblin Clash** is a single-player **tower defense** for mobile (portrait). A goblin-and-orc warband marches along a winding stone path through a sunny meadow, and the player builds and upgrades medieval towers to stop them before they reach the base.

You play it in short, tense loops: a few seconds to build, then a wave attacks. Survive 20 waves to win. Every goblin that slips through costs a life — run out of lives and it's game over.

**What makes it tick:** three pressures pulling against each other every wave —
- **Placement** — where you drop towers along the snaking path (choke points, overlapping ranges).
- **Economy** — gold from kills + a growing end-of-wave income. Spend now to survive, or *bank* for the expensive power-tower?
- **Toolkit** — every enemy type has a counter. No single tower beats every wave, so you're always adapting your line-up.

---

## 2. Art Style

> Sunny battlefield, gritty frame.

A bold, cartoony fantasy look in the spirit of *Kingdom Rush* and *Bloons TD*, with a chunkier, slightly darker edge — orcs and goblins versus medieval towers on a sunlit grassy battlefield.

The art deliberately mixes two moods:

- **The battlefield** is bright, sunny and painterly — vibrant yellow-green grass, soft round bushes, big friendly grey boulders framing the play area. The center stays calm and uncluttered so towers, enemies and the path always read clearly.
- **The UI & branding** (title, buttons, panels) is darker and heavier — stone slabs, iron rivets, cracked rock, fiery orange-gold lettering — like a goblin warband banner.

This contrast — *playful battlefield, gritty frame around it* — is the signature look.

**Environment.** A near top-down view with a slight tilt for a 2.5D feel. The enemy path is a winding cobblestone trail of clustered grey stones, snaking from the spawn at the top to the base at the bottom, with soft painted shadows so it feels embedded in the grass. Lighting is soft and sunny — no skybox, no horizon; the painted ground and stone path carry the whole atmosphere.

**Towers** are chunky 3D cartoon constructions — wood, stone, copper, iron — in warm earthy tones, each family with a clear color and silhouette so roles are instantly recognizable. The turret rotates to aim and punches back with a short recoil on each shot.

**Enemies** are stylized green-skinned goblins/orcs — hunched, exaggerated, full of personality — that read distinctly from above by size, color and posture, with smooth walk/hit/death animation. Small green health bars float above their heads.

**Effects** stay punchy and cartoony — clear shapes, no realistic particles. Placement previews glow **green when valid, red when not**.

---

## 3. The Core Loop

```
Title Screen → [ Build → Wave → short breather ] × 20 waves → Victory
                                                         │
                                       lives reach 0 → Defeat
```

1. **Build phase** — place and upgrade towers. A short timer counts down (~5s), or tap **Skip** to launch the wave early.
2. **Wave phase** — goblins spawn one by one and walk the path. Towers fire automatically. You can still buy, upgrade and sell mid-wave.
3. **Breather** — a brief pause, gold income is paid out, then the next build phase begins.

**First-time onboarding:** on Wave 1 the build timer doesn't start until you place your first tower — a gentle "place your first tower" prompt teaches the core action before any pressure begins.

**Spawn feel:** within a wave, enemy types arrive **shuffled together** rather than in clean blocks, so waves feel chaotic and alive instead of scripted.

---

## 4. Towers

Four towers, four roles. Each costs gold to place and can be upgraded twice.

| Tower | Cost | Role | Behavior |
|-------|------|------|----------|
| **Arrow** 🏹 | 50g | Cheap, fast single-target | Rapid shots, can land **critical hits** (×2 damage, ~20% of the time) |
| **Cannon** 💣 | 100g | Area damage | Slow, heavy arcing shells that **splash** — great against tightly-packed groups |
| **Frost** ❄️ | 75g | Crowd control | Low damage but **slows** enemies it hits (to 50% speed for 1.5s) |
| **Laser** ⚡ | 175g | Boss / tank killer | **Spools up**: the longer it holds one target, the faster it fires |

### The Laser — the signature tower

The Laser is the strategic centerpiece. It **ramps up its fire rate the longer it keeps hitting the same target**, climbing to **5× speed over ~2.5 seconds**. It also **sticks** to its current target until that target dies or escapes its range.

This gives it a sharp identity:
- **Melts** single high-HP targets (tanks, bosses) — exactly what nothing else can do.
- **Sputters** against swarms — every time a small enemy dies, the Laser has to re-target and its spool resets.

Because it's expensive, getting a Laser online is a deliberate economic goal: do you **bank gold** for it before the first boss, or spend on cheaper coverage and hope to leak less?

### Targeting

By default towers fire at the enemy **furthest along the path** (closest to leaking). The Laser is the exception — it **locks onto one target** so its spool can build, only switching when forced to.

---

## 5. Upgrades

Every tower has a **2-tier upgrade tree**: at each tier you pick **one of two** options, so each tower has **four possible final builds**. Upgrades cost gold and visibly change the tower (it gets bigger / fancier each tier).

The building blocks (what an upgrade can do):

| Upgrade | Effect |
|---------|--------|
| **Rate** | Fire twice as fast |
| **Damage** | Hit twice as hard |
| **Range** | Reach further |
| **Splash** | Bigger explosion radius |
| **Slow** | Stronger slow effect |
| **Duration** | Slow lasts longer |
| **Crit** | Adds / increases critical-hit chance & multiplier |

Each tower's tree is tuned to its identity (e.g. Frost specializes in wider/longer crowd control; the Laser can become a full-map **sniper** by stacking Range). You can also **sell** a tower at any time for a **60% refund** of everything you invested in it — useful for repositioning or pivoting your strategy.

---

## 6. Enemies

Four enemy archetypes form a "rock-paper-scissors" of threats — each one is best answered by a different tower.

| Enemy | HP | Speed | Reward | Personality | Best counter |
|-------|----|-------|--------|-------------|--------------|
| **Basic** | 55  | slow   | 4g  | Bunches up in clumps | Cannon (splash mows the clump) |
| **Fast**  | 30  | fast   | 5g  | Spreads out, **dodges** ~18% of shots | Frost to re-bunch + Cannon |
| **Tank**  | 260 | slow   | 12g | Big bag of HP, **slowly regenerates** | Laser's concentrated damage |
| **Boss**  | 900 | slowest| 40g | Huge HP, **immune to slows** | Laser only — the banked-for payoff |

**Difficulty scaling:** enemy HP grows **+12% per wave**, so by the final wave the same goblin has roughly **3× more health** than in Wave 1. Speed and traits stay constant — the pressure comes from tougher, more numerous, more mixed crowds.

---

## 7. Waves — the 20-wave campaign

The campaign is **20 waves in 4 acts**. It constantly alternates threat *types* to keep the player switching tools. Difficulty comes from **speed and spread** (a fast, scattered swarm is far harder than a slow clump of the same size), and several waves are deliberate **skill-checks** that punish a one-tower strategy.

| Act | Waves | What it's about |
|-----|-------|-----------------|
| **Act 1 — Onboarding** | 1–5 | One new threat introduced per wave. Low pressure; learn the toys. |
| **Act 2 — Sharpening** | 6–10 | First boss, first hoarding decision, first real swarm tests. |
| **Act 3 — Combos** | 11–15 | Waves that demand the *full* toolkit at once. |
| **Act 4 — Endgame** | 16–20 | Economy and toolkit tested hard. A weak economy loses here. |

**Signature / named waves:**

- **W1 — Tutorial:** a single Basic. See a tower fire, learn the loop.
- **W6 — First Boss:** a slow-immune wall of HP. Did you bank for a Laser?
- **W8 — Spread Swarm:** a flood of Fast goblins. Cannon alone leaks — you need Frost to re-bunch them.
- **W10 — "Speed Run":** 22 pure Fast (spread + dodgy). A hard Frost+Cannon check.
- **W13 — "Boss Escort":** bosses *and* a fast escort — you need the Laser **and** crowd control simultaneously.
- **W15 — Bulk Overload:** bosses + tanks + basics, no single answer.
- **W17 — "Boss Rush":** four bosses with escort. The payoff wave for everyone who invested in the Laser.
- **W20 — Finale:** everything at once. A poorly-managed economy loses lives here.

---

## 8. Economy

Gold is the spine of every decision.

| Source | Amount |
|--------|--------|
| **Starting gold** | 100g — enough for one Cannon, or two Arrows, or a Frost + change |
| **Kill reward** | 4–40g per enemy, depending on type — drops as a **coin** that flies into your purse |
| **End-of-wave bonus** | +8g flat |
| **End-of-wave income** | **+10% of the gold you're currently holding** — uncapped |

The **income mechanic is the key strategic lever**: because you earn a percentage of your savings, *hoarding compounds*. Every wave poses the same question — **spend now to plug leaks, or sit on gold so it grows toward a game-changing Laser?** The flat +8g bonus is a small safety floor that keeps a struggling player from spiraling to zero.

You start with **10 lives**. Each enemy that reaches the base costs one. Sell refunds (60%) let you recover and pivot if a build isn't working.

---

## 9. Systems at a Glance

A quick tour of the moment-to-moment systems a player will feel:

- **Drag-to-place** — pick a tower from the shop and drag it onto the grid; a preview shows its range and turns **green/red** for valid/invalid spots.
- **Critical hits** — Arrow (and any tower that takes the Crit upgrade) occasionally lands a big hit, shown as a pop of red damage text.
- **Slow / freeze** — Frost paints enemies blue and drags their speed down; bosses ignore it.
- **Splash** — Cannon shells explode, hitting everything near the impact.
- **Spool-up** — the Laser visibly ramps as it locks a target.
- **Loot coins** — kills drop physical coins that bounce and fly to the gold counter — satisfying, readable feedback.
- **Juice** — towers recoil when firing, enemies squash when hit and shrink-pop on death, the screen shakes when one reaches your base, and floating text calls out gold gains and crits.

---

## 10. Win / Lose

- **Victory** — survive all 20 waves.
- **Defeat** — lose all 10 lives.

Either way you reach an end screen with your result and can **restart** for another run. The campaign is one fixed level today; the systems (towers, enemies, waves, economy) are all built so more levels and content can be added later.
