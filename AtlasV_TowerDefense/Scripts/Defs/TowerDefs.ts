/**
 * TowerDefs.ts — Static data table for all tower types and their upgrade trees.
 *
 * Pure data — no side effects, no service calls.
 * To add a new tower: add an entry to TOWER_DEFS, declare its template in Assets.ts.
 * Upgrade trees are built with tree() from UpgradeDefs. Cost rule: T1≤base, T2≤1.5×.
 * Design constraints: no splash on arrow, no slow on non-frost, crit on arrow (×2/path max),
 *   cannon (×1/path), and laser (Rate path). Laser may take range twice (Range→Range = the
 *   max-reach SNIPER identity, intentionally low DPS / high coverage).
 * Read by TowerService.onReady() into its internal catalog.
 */
import { TargetingMode, type ITowerDef } from '../Types';
import { Assets } from '../Assets';
import { Upg, tree } from './UpgradeDefs';

export const TOWER_DEFS: ITowerDef[] = [
  // ── Arrow ──────────────────────────────────────────────────────────────────
  // Fast single-target. Sniper reach OR lucky crits (×2, arrow-only).
  // Range path → longer reach, then rapid fire or raw power
  // Crit path  → gambler spikes, then bigger hits or faster procs
  {
    id: 'arrow', name: 'Arrow', cost: 50,
    stats: { damage: 12, range: 2.70, fireRate: 1.5, projectileSpeed: 7,
      props: { projectileColor: { r: 0.55, g: 0.35, b: 0.18 }, projectileScale: 0.10, critMultiplier:2, critChance: 0.2, arcHeight: 0 } },
    template: Assets.Arrow,
    upgrades: tree(
      [Upg.range(50),    Upg.crit(50)],
      [[Upg.rate(75),    Upg.damage(75)],    [Upg.damage(75),   Upg.rate(75)]],
    ),
  },
  // ── Cannon ─────────────────────────────────────────────────────────────────
  // Slow AoE, best against groups. Raw power OR area denial.
  // Damage path → rapid heavy shells or long-reach blasts
  // Splash path → massive zone or rapid AoE
  {
    id: 'cannon', name: 'Cannon', cost: 100,
    // damage 55 (was 40): lets one Cannon chip the early tanks (W4–5) before the Laser is
    // affordable (~W6), covering the bulk-threat-before-bulk-answer gap. Still ~7× slower than
    // the Laser on tanks (Laser stays the tank-king), and doesn't fix Cannon's SPREAD weakness.
    stats: { damage: 50, range: 2.10, fireRate: 0.6, projectileSpeed: 4.5,
      props: { splashRadius: 0.75, projectileScale: 0.15, projectileColor: { r: 0.15, g: 0.18, b: 0.12 }, arcHeight: 1.5 } },
    template: Assets.Cannon,
    upgrades: tree(
      [Upg.damage(100),  Upg.splash(100)],
      [[Upg.rate(150),   Upg.range(150)],    [Upg.damage(150),  Upg.rate(150)]],
    ),
  },
  // ── Frost ──────────────────────────────────────────────────────────────────
  // Support/CC. Wide freeze zone OR deep sustained slow.
  // Splash path → broad control, then sustained or wider reach
  // Duration path → longer freeze, then more intense or wider
  {
    id: 'frost', name: 'Frost', cost: 75,
    stats: { damage: 5, range: 2.28, fireRate: 1.0, projectileSpeed: 5.5,
      props: { slowFactor: 0.5, slowDuration: 1.5,
               projectileColor: { r: 0.40, g: 0.91, b: 0.97 }, projectileScale: 0.12, arcHeight: 1.5 } },
    template: Assets.Frost,
    upgrades: tree(
      [Upg.splash(75),        Upg.slowDuration(75)],
      [[Upg.slowFactor(100),  Upg.range(100)],        [Upg.rate(100),         Upg.splash(100)]],
    ),
  },
  // ── Laser ──────────────────────────────────────────────────────────────────
  // Single-target boss/tank-killer via SPOOL-UP: fire rate ramps the longer it holds one
  // target (×1 → ×spoolPeak over spoolTime), resets when its target dies/leaves range.
  // Sticky targeting (TowerController) lets it hold a boss while chaff runs past — so it
  // melts single high-HP targets but SPUTTERS on swarms (constant retargeting never ramps).
  // Spool is a MULTIPLIER on the base fireRate (composes with Rate upgrades, works on any tower).
  {
    id: 'laser', name: 'Laser', cost: 175,
    stats: { damage: 10, range: 3.60, fireRate: 1.2, projectileSpeed: 12,
      props: { projectileColor: { r: 0.75, g: 0.52, b: 0.98 }, projectileScale: 0.1, arcHeight: 0.3,
               spoolPeak: 5, spoolTime: 2.5 } },
    template: Assets.Laser,
    targeting: TargetingMode.Sticky, // hold one target so the spool ramps (boss/tank-killer)
    // T1 fork = COVERAGE vs AGGRESSION:
    //   Range path → max-reach SNIPER (catch leakers across the map) or reach+punch MARKSMAN
    //   Rate  path → rapid-crit gambler (crit numbers fly at full spool) or fast-spool + reach
    // Note: Range→Damage and Rate→Range are numerically twin DPS (rate==damage for raw DPS);
    //   kept as distinct leaves for feel (hit-size vs fire-rate) + future hit-size effects (armor).
    upgrades: tree(
      [Upg.range(175),   Upg.rate(175)],
      [[Upg.range(250),  Upg.damage(250)],    [Upg.crit(250),    Upg.range(250)]],
    ),
  },
];
