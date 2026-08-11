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

export const ENEMY_DEFS: IEnemyDef[] = [
  { id: 'basic', name: 'Basic', hp: 70,  speed: 1.25, reward: 5,  color: { r: 0.94, g: 0.27, b: 0.27 }, template: Assets.EnemyBasic, shield: 0 },
  { id: 'fast',  name: 'Fast',  hp: 55,  speed: 2.50, reward: 8,  color: { r: 0.98, g: 0.80, b: 0.08 }, template: Assets.EnemyFast,  dodgeChance: 0.15, shield: 0 },
  { id: 'shaman', name: 'Shaman', hp: 55, speed: 1.75, reward: 7, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyShaman, shield: 4 },
  { id: 'yeti',  name: 'Yeti Berserker', hp: 500, speed: 0.4, reward: 15, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyYetiBerserker, blizzardSpeedBoost: 1, biomeExclusive: 'snow', shield: 0 },
  { id: 'frostGoblin', name: 'Frost Goblin', hp: 66, speed: 1.25, reward: 5, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyFrostGoblin, biomeExclusive: 'snow', shield: 0 },
  { id: 'tank',  name: 'Tank',  hp: 300, speed: 0.75, reward: 15, color: { r: 0.23, g: 0.51, b: 0.96 }, template: Assets.EnemyTank,  regenPerSec: 8, shield: 0 },
  { id: 'boss',  name: 'Boss',  hp: 1000, speed: 0.60, reward: 50, color: { r: 0.66, g: 0.33, b: 0.97 }, template: Assets.EnemyBoss,  slowImmune: true, shield: 0 },
];
