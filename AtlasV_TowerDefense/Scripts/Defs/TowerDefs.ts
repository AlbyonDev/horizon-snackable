/**
 * TowerDefs.ts — Static data table for all tower types and their upgrade trees.
 *
 * Pure data — no side effects, no service calls.
 * To add a new tower: add an entry to TOWER_DEFS, declare its template in Assets.ts.
 * Upgrade trees are built with tree() from UpgradeDefs. Cost rule: T1≤base, T2≤1.5×.
 * Design constraints: no splash on arrow, no slow on non-frost, crit on arrow (×2/path max)
 *   and cannon (×1/path), range on laser max once per path.
 * Read by TowerService.onReady() into its internal catalog.
 */
import type { ITowerDef } from '../Types';
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
    stats: { damage: 40, range: 2.10, fireRate: 0.6, projectileSpeed: 4.5,
      props: { splashRadius: 0.5, projectileScale: 0.15, projectileColor: { r: 0.15, g: 0.18, b: 0.12 }, arcHeight: 1.5 } },
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
    id: 'frost', name: 'Frost', cost: 80, biomeExclusive: 'snow',
    stats: { damage: 5, range: 2.28, fireRate: 1.0, projectileSpeed: 5.5,
      props: { slowFactor: 0.5, slowDuration: 1.5,
               projectileColor: { r: 0.40, g: 0.91, b: 0.97 }, projectileScale: 0.12, arcHeight: 1.5 } },
    template: Assets.Frost,
    upgrades: tree(
      [Upg.splash(80),        Upg.slowDuration(80)],
      [[Upg.slowFactor(120),  Upg.range(120)],        [Upg.rate(120),         Upg.splash(120)]],
    ),
  },
  // ── Laser ──────────────────────────────────────────────────────────────────
  // Long-range sustained DPS. Rapid beam OR focused power.
  // Rate path → rapid fire, then heavier hits or longer reach (max 1× Range)
  // Damage path → focused beam, then speed burst or longer reach (max 1× Range)
  {
    id: 'laser', name: 'Laser', cost: 200,
    stats: { damage: 8, range: 3.60, fireRate: 5.0, projectileSpeed: 12.5,
      props: { projectileColor: { r: 0.75, g: 0.52, b: 0.98 }, projectileScale: 0.1, arcHeight: 0.3 } },
    template: Assets.Laser,
    upgrades: tree(
      [Upg.rate(175),    Upg.damage(175)],
      [[Upg.damage(250), Upg.range(250)],    [Upg.rate(250),    Upg.range(250)]],
    ),
  },
  // ── Fire Cannon ───────────────────────────────────────────────────────────────
  // Heavy AoE with burn flavor. Bigger explosions OR rapid bombardment.
  // Splash path → massive fire zone, then faster salvos or longer reach
  // Damage path → devastating blasts, then rapid fire or extended range
  {
    id: 'fire_cannon', name: 'Fire Cannon', cost: 120, biomeExclusive: 'volcano',
    stats: { damage: 35, range: 2.20, fireRate: 0.7, projectileSpeed: 4.5,
      props: { splashRadius: 0.9, projectileScale: 0.15, projectileColor: { r: 0.95, g: 0.35, b: 0.05 }, arcHeight: 1.5 } },
    template: Assets.FireCannon,
    upgrades: tree(
      [Upg.splash(100),  Upg.damage(100)],
      [[Upg.rate(150),   Upg.range(150)],    [Upg.rate(150),    Upg.splash(150)]],
    ),
  },
  // ── Lightning ─────────────────────────────────────────────────────────────────
  // Chain lightning, multi-target. Bolts chain to nearby enemies.
  // Damage path → heavier bolts, then faster zaps or extended reach
  // Range path → longer reach, then more chains or faster fire
  {
    id: 'lightning', name: 'Lightning', cost: 300,
    stats: { damage: 15, range: 2.00, fireRate: 2.0, projectileSpeed: 10,
      props: { chainCount: 5, chainRange: 10, chainDamageFalloff: 0.5,
               projectileColor: { r: 0.3, g: 0.7, b: 1.0 }, projectileScale: 0.08, arcHeight: 0.2 } },
    template: Assets.Lightning,
    upgrades: tree(
      [Upg.damage(125), Upg.range(125)],
      [[Upg.rate(200),  Upg.range(200)],    [Upg.damage(200), Upg.rate(200)]],
    ),
  },
  // ── Poison ────────────────────────────────────────────────────────────────────
  // Damage over time. Lobs toxic globs that stack lingering poison.
  // Damage path → more potent venom, then faster lobs or wider splash
  // Rate path → rapid lobbing, then bigger DoT or longer reach
  {
    id: 'poison', name: 'Poison', cost: 90,
    stats: { damage: 0, range: 2.00, fireRate: 1.2, projectileSpeed: 6,
      props: { dotDamage: 1, dotDuration: 15, dotTickRate: 1.0,
               projectileColor: { r: 0.2, g: 0.8, b: 0.1 }, projectileScale: 0.12, arcHeight: 1.0 } },
    template: Assets.Poison,
    upgrades: tree(
      [Upg.damage(80),  Upg.rate(80)],
      [[Upg.range(120), Upg.rate(120)],     [Upg.damage(120), Upg.range(120)]],
    ),
  },
  // ── Pillar ─────────────────────────────────────────────────────────────────
  // Single-use trap. Tips over onto the first enemy in range, instant-killing it,
  // then self-destructs. No projectile, no upgrades (consumed on use).
  {
    id: 'pillar', name: 'Pillar', cost: 20,
    stats: { damage: 99999, range: 2.0, fireRate: 1.0, projectileSpeed: 0,
      props: { singleUse: true } },
    template: Assets.Pillar,
  },
];
