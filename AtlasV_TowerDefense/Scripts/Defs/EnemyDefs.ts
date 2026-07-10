/**
 * EnemyDefs.ts — Static data table for all enemy types.
 *
 * Pure data — no side effects, no service calls.
 * To add a new enemy: add an entry here and its template in Assets.ts.
 * HP is base value — EnemyController applies wave scaling: hp × (1 + waveIndex × HP_SCALE_PER_WAVE).
 * color is applied at runtime to all ColorComponent children of the entity.
 * Read by EnemyService.onReady() into its internal catalog.
 */
import { type IEnemyDef } from '../Types';
import { Assets } from '../Assets';

// Threat triangle (validated in-engine):
//   basic = BUNCHED swarm (slow → Cannon solos it)        | fast = SPREAD swarm (fast → needs Frost to re-bunch, dodge resists Cannon)
//   tank  = bulk HP (needs Laser's concentrated DPS)      | boss = bulk+ & slow-immune (Laser only; banked-for investment)
export const ENEMY_DEFS: IEnemyDef[] = [
  { id: 'basic', name: 'Basic', hp: 55,  speed: 1.25, reward: 4,  color: { r: 0.94, g: 0.27, b: 0.27 }, template: Assets.EnemyBasic },
  { id: 'fast',  name: 'Fast',  hp: 30,  speed: 2.60, reward: 5,  color: { r: 0.98, g: 0.80, b: 0.08 }, template: Assets.EnemyFast,  dodgeChance: 0.18 },
  { id: 'tank',  name: 'Tank',  hp: 260, speed: 0.70, reward: 12, color: { r: 0.23, g: 0.51, b: 0.96 }, template: Assets.EnemyTank,  regenPerSec: 6 },
  { id: 'boss',  name: 'Boss',  hp: 900, speed: 0.55, reward: 40, color: { r: 0.66, g: 0.33, b: 0.97 }, template: Assets.EnemyBoss,  slowImmune: true },
];
