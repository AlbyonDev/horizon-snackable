/**
 * balance-sim.mjs — Tower-defense balance simulator (Lever 2 validation harness).
 *
 * Purpose: compare a decent strategy vs a poor one per wave, and flag waves that
 * demand more than the gold a player could realistically have (impossible/frustrating).
 * It abstracts AWAY placement/path geometry (see RANGE MODEL below) and models the
 * COMBAT STATS faithfully: damage, fireRate (incl. Laser spool-up), range (as an
 * engagement-window + concurrency abstraction), projectile travel, splash, slow,
 * slow-immunity, regen, dodge, crit.
 *
 * The def values below are MIRRORED from the real game files. Keep them in sync:
 *   EnemyDefs.ts, TowerDefs.ts, UpgradeDefs.ts, LevelDefs.ts, Constants.ts
 *
 * Run: node Tools/balance-sim.mjs
 *
 * KNOWN SOFT SPOT: range -> engagement abstraction is an estimate, not geometry.
 * Good enough to separate decent vs poor strategy and catch impossible waves;
 * NOT trustworthy to the last gold piece. Sharpen when Lever 4 (placement) lands.
 */

// ─────────────────────────────────────────────────────────────────────────────
// MIRRORED DEFS  (edit these to test rebalances; this is the whole point)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  HP_SCALE_PER_WAVE: 0.15,      // Constants.ts
  ENEMY_SPAWN_INTERVAL: 0.75,   // Constants.ts
  WAVE_BUILD_DURATION: 5,       // Constants.ts
  START_GOLD: 120,              // Constants.ts (NOTE: LevelDefs says 100 — dead value)
  WAVE_BONUS_GOLD: 15,          // Constants.ts
  INCOME_RATE: 0.15,            // Constants.ts
};

// EnemyDefs.ts — hp is base; effective = hp * (1 + waveIndex * HP_SCALE_PER_WAVE)
const ENEMIES = {
  basic: { hp: 60,  speed: 1.25, reward: 5,  dodge: 0,    regen: 0, slowImmune: false },
  fast:  { hp: 35,  speed: 2.50, reward: 8,  dodge: 0.15, regen: 0, slowImmune: false },
  tank:  { hp: 220, speed: 0.75, reward: 15, dodge: 0,    regen: 8, slowImmune: false },
  boss:  { hp: 600, speed: 0.60, reward: 50, dodge: 0,    regen: 0, slowImmune: true  },
};

// Path length proxy: enemies traverse roughly this many world units before leaking.
// Real path (PathDefs) is a zigzag ~ this length. Used as travelTime = PATH_LEN / speed.
const PATH_LEN = 22; // world units (estimate from PATH_WAYPOINTS_LEVEL_0 segment sum)

// TowerDefs.ts + UpgradeDefs.ts — base stats and the two upgrade tiers.
// Upgrade atoms: rate => fireRate*2, damage => damage*2, range => +1.0,
//   splash => splashRadius+0.5, slowFactor => *0.7 (min .15), slowDuration => +1.0, crit.
// We encode each tower's full-upgrade BEST raw-dps path (damage*2 then rate*2 = x4).
const TOWERS = {
  arrow:  { cost: 50,  damage: 12, fireRate: 1.5, range: 2.70, projectileSpeed: 7,
            splash: 0, slowFactor: 1, slowDuration: 0, crit: 0.2, critMult: 2, spool: null,
            upgradeCost: 50 + 75 },
  cannon: { cost: 100, damage: 40, fireRate: 0.6, range: 2.10, projectileSpeed: 4.5,
            splash: 0.75, slowFactor: 1, slowDuration: 0, crit: 0, critMult: 1, spool: null,
            upgradeCost: 100 + 150 },
  frost:  { cost: 80,  damage: 5,  fireRate: 1.0, range: 2.28, projectileSpeed: 5.5,
            splash: 0, slowFactor: 0.5, slowDuration: 1.5, crit: 0, critMult: 1, spool: null,
            upgradeCost: 80 + 120 },
  // Laser spool-up: MULTIPLIER on base fireRate (composes with Rate upgrades, works on any tower).
  // spool.peak = max multiplier, spool.time = seconds-on-target to reach it. Resets on switch.
  // First-draft (to tune): fireRate 1.5 × (1→5.33) ≈ 8/s peak over 2.5s. Per-hit stays low (8).
  laser:  { cost: 200, damage: 8,  fireRate: 1.5, range: 3.60, projectileSpeed: 12.5,
            splash: 0, slowFactor: 1, slowDuration: 0, crit: 0, critMult: 1,
            spool: { peak: 5.33, time: 2.5 },
            upgradeCost: 175 + 250 },
};

// Apply the "full upgrade" (damage x2 + rate x2) to a tower stat block. Toggle per-strategy.
// Rate doubles fireRate; for spool towers the peak scales automatically (spool multiplies fireRate).
function upgraded(t) {
  return { ...t, damage: t.damage * 2, fireRate: t.fireRate * 2 };
}

// LevelDefs.ts — WAVES_LEVEL_0
const WAVES = [
  [['basic',1]],
  [['basic',6]],
  [['basic',5],['fast',3]],
  [['tank',2],['basic',6]],
  [['basic',8],['fast',4],['tank',1]],
  [['basic',8],['boss',1]],
  [['tank',8],['basic',5]],
  [['fast',14],['basic',6]],
  [['boss',2],['tank',5],['basic',8]],
  [['fast',25]],
  [['basic',20]],
  [['tank',6],['fast',12],['basic',8]],
  [['boss',3],['fast',15]],
  [['tank',10],['basic',10]],
  [['boss',3],['tank',8],['basic',10]],
  [['basic',20],['fast',15],['tank',8]],
  [['boss',6],['fast',10]],
  [['basic',25],['fast',20]],
  [['tank',15],['boss',3],['basic',10]],
  [['boss',5],['tank',12],['fast',20],['basic',15]],
];

// ─────────────────────────────────────────────────────────────────────────────
// RANGE MODEL (engagement-window + concurrency abstraction)
// ─────────────────────────────────────────────────────────────────────────────
//
// Without geometry we approximate a tower's range two ways:
//  (1) engagementWindow: how long (s) a tower keeps firing at one passing enemy.
//      Longer range = more shots per enemy. windowFraction = clamp(range / REF_RANGE).
//  (2) concurrency: how many of the SPREAD-OUT live enemies a tower can reach at once.
//      Longer range = reach more of a swarm. We model this as: a tower may pick from
//      the front `concurrencyReach` enemies on the timeline (more range = reach deeper).
//
// These are deliberately simple, single-knob functions, labeled so Lever 4 can sharpen.
// CALIBRATED against real-game observation (see Tools/balance-sim notes):
//   A single upgraded Arrow (range+damage upg, ~125g) leaks at W2, W4, W5, dies W7.
//   => towers are far more single-target-bound than first modeled. Reach ~1, splash ~1-2.
function rangeReach(range) {
  // how many concurrent enemies a tower can engage. Real towers mostly focus one target;
  // longer range only marginally helps reach a spread group. Tuned low to match observation.
  return range >= 3.4 ? 2 : 1; // laser (3.6) reaches 2; everyone else 1
}
// Splash catch: real Cannon catches 1-2 normally (in-engine observation).
// DESIGN DECISION: slow does NOT bunch enemies into a fatter splash target — slow only
// "buys time" (enemies move slower → towers get more shots before they cross). So splash
// catch does NOT scale with slow; the Frost+Cannon synergy is "more time", modeled by the
// slowed enemies' reduced movement in the main loop, not by a splash bonus here.
function splashCatch(splashRadius) {
  if (splashRadius <= 0) return 1;
  return 1 + Math.min(2, Math.round(splashRadius)); // 0.75 -> 2, grows slowly with upgrades
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

const DT = 0.05;          // timestep seconds
const SPOOL_RESET = true; // laser spool resets on target switch

function effHp(enemyId, waveIndex) {
  return ENEMIES[enemyId].hp * (1 + waveIndex * C.HP_SCALE_PER_WAVE);
}

// Build the ordered spawn list for a wave (shuffled in-game; order doesn't change totals,
// and for an abstraction we keep grouped arrival, which is the HARDEST case for coverage).
function buildSpawns(waveComp) {
  const list = [];
  for (const [id, count] of waveComp) for (let i = 0; i < count; i++) list.push(id);
  return list;
}

/**
 * Simulate one wave against a tower composition.
 * comp: array of { type, upgraded } tower instances.
 * Returns { leaked, killed, lives, clearTime, perTower: {type: damageDealt} }.
 */
function simulateWave(waveIndex, waveComp, comp) {
  const spawnList = buildSpawns(waveComp);
  const towers = comp.map((c, i) => {
    const base = c._override ? { ...c._override } : c.upgraded ? upgraded(TOWERS[c.type]) : { ...TOWERS[c.type] };
    return {
      id: i, type: c.type, ...base,
      cooldown: 0,
      lockedId: -1, // sticky-targeting: currently committed enemy id
      // spool state (laser): time-on-current-target, current target id
      spoolTarget: -1, spoolTime: 0,
      reach: rangeReach(base.range),
      damageDealt: 0,
    };
  });

  // Enemy instances enter over time; each has a leak deadline.
  const enemies = []; // {id, type, hp, maxHp, enterT, leakT, alive, leaked, slowUntil, slowFactor}
  let nextSpawn = 0, spawnIdx = 0;
  let t = 0, killed = 0, leaked = 0;
  const leakedByType = {};
  const maxT = 120; // safety
  let nextEnemyId = 0;

  while (t < maxT) {
    // spawn
    while (spawnIdx < spawnList.length && t >= nextSpawn) {
      const type = spawnList[spawnIdx++];
      enemies.push({
        id: nextEnemyId++, type, hp: effHp(type, waveIndex), maxHp: effHp(type, waveIndex),
        progress: 0, // 0..PATH_LEN distance traveled
        alive: true, slowUntil: -1, slowFactor: 1,
      });
      nextSpawn += C.ENEMY_SPAWN_INTERVAL;
    }

    const live = enemies.filter(e => e.alive);
    if (spawnIdx >= spawnList.length && live.length === 0) break;

    // advance enemies (movement + regen + slow expiry)
    for (const e of live) {
      if (t >= e.slowUntil) { e.slowFactor = 1; }
      const def = ENEMIES[e.type];
      e.progress += def.speed * e.slowFactor * DT;
      if (def.regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + def.regen * DT);
      if (e.progress >= PATH_LEN) { e.alive = false; e.leaked = true; leaked++; leakedByType[e.type] = (leakedByType[e.type] || 0) + 1; }
    }

    // sort live by progress descending = "furthest along" priority (closest to leak)
    const ordered = enemies.filter(e => e.alive).sort((a, b) => b.progress - a.progress);

    // towers fire
    for (const tw of towers) {
      if (tw.cooldown > 0) tw.cooldown -= DT;
      if (ordered.length === 0) { tw.spoolTarget = -1; tw.spoolTime = 0; tw.lockedId = -1; continue; }

      // STICKY TARGETING — ONLY for spool towers (Laser): hold one target so it can ramp.
      // Non-spool towers re-pick furthest-along each tick (Frost must keep spreading slow).
      const candidates = ordered.slice(0, tw.reach);
      let target = null;
      if (tw.spool) {
        const inRangeIds = new Set(candidates.map(e => e.id));
        if (tw.lockedId >= 0 && inRangeIds.has(tw.lockedId)) {
          target = candidates.find(e => e.id === tw.lockedId) ?? null;
        }
        if (!target) { target = candidates[0]; tw.lockedId = target.id; }
      } else {
        target = candidates[0]; // plain furthest-along
      }

      // spool-up: MULTIPLIER on base fireRate, ramped by time-on-target (resets on switch).
      let fireRate = tw.fireRate;
      if (tw.spool) {
        if (target.id !== tw.spoolTarget) {
          if (SPOOL_RESET) tw.spoolTime = 0;
          tw.spoolTarget = target.id;
        } else {
          tw.spoolTime += DT;
        }
        const ramp = Math.min(1, tw.spoolTime / tw.spool.time);
        fireRate = tw.fireRate * (1 + (tw.spool.peak - 1) * ramp);
      }

      if (tw.cooldown > 0) continue;
      tw.cooldown = 1 / fireRate;

      // resolve hit(s). Splash draws from the full ordered front (near the primary target),
      // not the reach-limited candidate set — AoE catches bystanders the tower isn't aiming at.
      // (Slow does NOT increase splash catch — it only buys time; see splashCatch note.)
      const hitTargets = tw.splash > 0 ? ordered.slice(0, splashCatch(tw.splash)) : [target];
      for (const ht of hitTargets) {
        const def = ENEMIES[ht.type];
        // dodge
        if (def.dodge && Math.random() < def.dodge) continue;
        // crit
        let dmg = tw.damage;
        if (tw.crit && Math.random() < tw.crit) dmg *= tw.critMult;
        ht.hp -= dmg;
        tw.damageDealt += dmg;
        // slow
        if (tw.slowFactor < 1 && !def.slowImmune) {
          ht.slowFactor = Math.min(ht.slowFactor, tw.slowFactor);
          ht.slowUntil = t + tw.slowDuration;
        }
        if (ht.hp <= 0 && ht.alive) { ht.alive = false; killed++; }
      }
    }

    t += DT;
  }

  const perTower = {};
  for (const tw of towers) perTower[tw.type] = (perTower[tw.type] || 0) + Math.round(tw.damageDealt);
  return { leaked, killed, lives: leaked, clearTime: t, perTower, leakedByType };
}

// ─────────────────────────────────────────────────────────────────────────────
// ECONOMY — gold a player could realistically have entering each wave
// ─────────────────────────────────────────────────────────────────────────────
//
// Optimistic-but-fair: assume the player kills everything (no leak), banks nothing
// extra beyond what a strategy costs. Returns cumulative gold available entering wave i
// if they earned all rewards + bonus + interest and spent nothing. This is the CEILING
// of affordability — if a wave's required comp costs more than this, it's impossible.

function goldCeiling() {
  const ceiling = [];
  let gold = C.START_GOLD;
  for (let w = 0; w < WAVES.length; w++) {
    ceiling.push(Math.floor(gold));
    // earn rewards for clearing wave w
    let reward = 0;
    for (const [id, count] of WAVES[w]) reward += ENEMIES[id].reward * count;
    gold += reward + C.WAVE_BONUS_GOLD;
    gold += Math.floor(gold * C.INCOME_RATE);
  }
  return ceiling;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

const compCost = comp => comp.reduce((s, c) =>
  s + TOWERS[c.type].cost + (c.upgraded ? TOWERS[c.type].upgradeCost : 0), 0);

// Scripted archetypes (the player lines we want to compare)
const SCRIPTED = {
  'mono-laser (poor: 1 upgraded laser)': () => [{ type: 'laser', upgraded: true }],
  'mono-laser x2':                       () => [{ type: 'laser', upgraded: true }, { type: 'laser', upgraded: true }],
  'balanced (laser+cannon+frost)':       () => [{ type: 'laser', upgraded: true }, { type: 'cannon', upgraded: true }, { type: 'frost', upgraded: false }],
  'cannon-heavy (anti-swarm)':           () => [{ type: 'cannon', upgraded: true }, { type: 'cannon', upgraded: true }, { type: 'frost', upgraded: false }],
};

// Greedy solver: from an affordable pool, pick the comp (up to N towers) that minimizes
// leaks for this wave. Brute over a small tower-set since the roster is tiny.
function greedyBest(waveIndex, waveComp, budget) {
  const types = ['arrow', 'cannon', 'frost', 'laser'];
  const options = [];
  for (const ty of types) { options.push({ type: ty, upgraded: false }); options.push({ type: ty, upgraded: true }); }
  let best = null;
  const MAXT = 4;
  // enumerate multisets up to size MAXT (small)
  function rec(start, comp) {
    if (comp.length > 0) {
      const cost = compCost(comp);
      if (cost <= budget) {
        // average over a few runs to smooth dodge/crit RNG
        let leaks = 0; const RUNS = 5;
        for (let r = 0; r < RUNS; r++) leaks += simulateWave(waveIndex, waveComp, comp).leaked;
        leaks /= RUNS;
        if (!best || leaks < best.leaks || (leaks === best.leaks && cost < best.cost))
          best = { comp: comp.map(c => `${c.type}${c.upgraded ? '+' : ''}`), leaks, cost };
      }
    }
    if (comp.length >= MAXT) return;
    for (let i = start; i < options.length; i++) rec(i, [...comp, options[i]]);
  }
  rec(0, []);
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────────────────────────────────────

function avgLeaks(waveIndex, waveComp, comp, runs = 8) {
  let l = 0; for (let r = 0; r < runs; r++) l += simulateWave(waveIndex, waveComp, comp).leaked;
  return l / runs;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION — replay the real observed run to validate the abstraction.
// Observed (single Arrow): range-upg only W1-3 -> leak W2(1); +damage-upg W4 ->
//   leak W4(1 tank), W5(2), W6(4), DEAD W7. Match this before trusting the sim.
// ─────────────────────────────────────────────────────────────────────────────
// Exact test-config stat blocks (atoms applied explicitly to match in-engine picks).
const TEST_CONFIGS = {
  // Test A: Laser, T1 Damage + T2 Rate (full upgrade), single-target boss-killer.
  // Rate doubles fireRate (peak scales automatically); damage doubles per-hit.
  laserDmgRate: () => ({ ...TOWERS.laser, damage: TOWERS.laser.damage * 2, fireRate: TOWERS.laser.fireRate * 2 }),
  // Test B: Cannon, T1 Splash (+0.5) + T2 Damage (x2).
  cannonSplashDmg: () => ({ ...TOWERS.cannon, splash: TOWERS.cannon.splash + 0.5, damage: TOWERS.cannon.damage * 2 }),
  // Test C: Frost, T1 Duration (+1.0) + T2 Splash (+0.5) — the real path picked in-engine
  // (Slow-factor is NOT reachable via Duration; it lives under the Splash T1 branch).
  // Arrow, T1 Range (+1.0) + T2 Damage (x2).
  frostDurSplash: () => ({ ...TOWERS.frost, slowDuration: TOWERS.frost.slowDuration + 1.0, splash: TOWERS.frost.splash + 0.5 }),
  arrowRangeDmg: () => ({ ...TOWERS.arrow, range: TOWERS.arrow.range + 1.0, damage: TOWERS.arrow.damage * 2 }),
};

// Run a fixed comp across specified waves, report leaks by enemy type. For calibration.
function testConfig(label, comp, waveIndices) {
  console.log(`--- ${label} ---`);
  for (const w of waveIndices) {
    const byType = {};
    const R = 16;
    let total = 0;
    for (let r = 0; r < R; r++) {
      // re-run; tally leaked types by instrumenting a single run
      const res = simulateWave(w, WAVES[w], comp);
      total += res.leaked;
      for (const [t, n] of Object.entries(res.leakedByType)) byType[t] = (byType[t] || 0) + n;
    }
    const typeStr = Object.entries(byType).map(([t, n]) => `${t}:${(n / R).toFixed(1)}`).join(' ');
    console.log(`  W${(w + 1).toString().padStart(2)}: leaks=${(total / R).toFixed(1).padStart(4)}  [${typeStr}]`);
  }
  console.log('');
}

function calibrationRun() {
  console.log('--- CALIBRATION: single Arrow, observed run (range from W1, +damage from W3) ---');
  console.log('Target: leak W2=1, W4=1, W5=2, W6=4, dead W7 (cumulative lives lost vs 10)');
  // Build the partially-upgraded arrow stat blocks.
  // Real timing: 120g start -> arrow(50)+range(50) before W1. damage(75) bought after W2 -> from W3.
  const arrowRange = { ...TOWERS.arrow, range: TOWERS.arrow.range + 1.0 };               // W1-2
  const arrowRangeDmg = { ...arrowRange, damage: TOWERS.arrow.damage * 2 };               // W3+
  let lives = 10;
  for (let w = 0; w < WAVES.length; w++) {
    const stat = w < 2 ? arrowRange : arrowRangeDmg;
    const comp = [{ type: 'arrow', _override: stat }];
    // average leaks
    let l = 0; const R = 12;
    for (let r = 0; r < R; r++) l += simulateWave(w, WAVES[w], comp).leaked;
    l = l / R;
    lives -= l;
    console.log(`  W${(w + 1).toString().padStart(2)}: leaks=${l.toFixed(1).padStart(4)}  lives=${Math.max(0, lives).toFixed(1)}`);
    if (lives <= 0) { console.log(`  -> DEAD at W${w + 1}`); break; }
  }
  console.log('');
}

console.log('=== H5 TD Balance Sim ===\n');
console.log('Path length proxy:', PATH_LEN, '| spawn interval:', C.ENEMY_SPAWN_INTERVAL, 's | DT:', DT, 's');
console.log('Laser spool:', TOWERS.laser.spool ? JSON.stringify(TOWERS.laser.spool) : 'OFF (current flat fireRate)\n');

calibrationRun();

// Calibration test configs — compare these sim outputs against the in-engine runs.
console.log('=== CALIBRATION TESTS (compare vs in-engine) ===\n');
testConfig('TEST A: 1 Laser (Dmg+Rate) vs boss waves W6, W13, W17',
  [{ type: 'laser', _override: TEST_CONFIGS.laserDmgRate() }], [5, 12, 16]);
// Spool-up sanity: how does 1 Laser do on a PURE-boss wave (holds one target -> spools)?
// Synthetic wave injected only here to isolate the boss-killer upside from swarm interference.
{
  const PURE_BOSS = [['boss', 3]];
  const savedW = WAVES[12]; WAVES[12] = PURE_BOSS;
  testConfig('TEST A-bis: 1 Laser vs PURE 3-boss wave (spool isolation, scaled @ W13)',
    [{ type: 'laser', _override: TEST_CONFIGS.laserDmgRate() }], [12]);
  WAVES[12] = savedW;
}
testConfig('TEST B: 1 Cannon (Splash+Dmg) vs W5,W6,W7(tanks),W8,W10',
  [{ type: 'cannon', _override: TEST_CONFIGS.cannonSplashDmg() }], [4, 5, 6, 7, 9]);
testConfig('TEST C: Frost(Dur+Splash) + Arrow(Range+Dmg), survival run W5-W12',
  [{ type: 'frost', _override: TEST_CONFIGS.frostDurSplash() }, { type: 'arrow', _override: TEST_CONFIGS.arrowRangeDmg() }],
  [4, 5, 6, 7, 8, 9, 10, 11]);

const ceiling = goldCeiling();

console.log('--- Scripted archetypes: leaks per wave (avg of 8 runs) ---');
const names = Object.keys(SCRIPTED);
const header = 'wave'.padStart(4) + ' | ' + names.map(n => n.split(' ')[0].padStart(11)).join(' ') + ' | goldCeil';
console.log(header);
for (let w = 0; w < WAVES.length; w++) {
  const cells = names.map(n => {
    const comp = SCRIPTED[n]();
    const l = avgLeaks(w, WAVES[w], comp);
    return (l === 0 ? '.' : l.toFixed(1)).padStart(11);
  });
  console.log(`${(w + 1).toString().padStart(4)} | ${cells.join(' ')} | ${ceiling[w]}`);
}

console.log('\n--- Greedy best-affordable comp per wave (catches impossible waves) ---');
console.log('wave | gold | best comp (min leaks within budget) | leaks | cost');
for (let w = 0; w < WAVES.length; w++) {
  const best = greedyBest(w, WAVES[w], ceiling[w]);
  if (!best) { console.log(`${(w + 1).toString().padStart(4)} | ${ceiling[w].toString().padStart(4)} | (nothing affordable!)`); continue; }
  const flag = best.leaks > 0.5 ? '  <-- FRUSTRATING: even best affordable comp leaks' : '';
  console.log(`${(w + 1).toString().padStart(4)} | ${ceiling[w].toString().padStart(4)} | ${best.comp.join(',').padEnd(34)} | ${best.leaks.toFixed(1).padStart(4)} | ${best.cost}${flag}`);
}

console.log('\nNote: gold ceiling = optimistic (all rewards, no spending). Real players have less.');
console.log('Reading: mono-laser leaking on swarm waves + not leaking on boss waves = niche walls working.');
