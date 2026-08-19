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
  { id: 'basic', name: 'Basic', hp: 70,  speed: 1.25, reward: 5,  color: { r: 0.94, g: 0.27, b: 0.27 }, template: Assets.EnemyBasic, shield: 0, followPath: true },
  { id: 'fast',  name: 'Fast',  hp: 55,  speed: 2.50, reward: 8,  color: { r: 0.98, g: 0.80, b: 0.08 }, template: Assets.EnemyFast,  dodgeChance: 0.15, shield: 0, followPath: true },
  { id: 'shaman', name: 'Shaman', hp: 55, speed: 1.75, reward: 7, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyShaman, shield: 4, followPath: true },
  { id: 'frostGoblin', name: 'Frost Goblin', hp: 66, speed: 1.25, reward: 5, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyFrostGoblin, biomeExclusive: 'snow', shield: 0, followPath: true },
  { id: 'fireGoblin', name: 'Fire Goblin', hp: 90, speed: 0.5, reward: 7, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyFireGoblin, biomeExclusive: 'volcano', shield: 0, followPath: true },
  { id: 'tank',  name: 'Tank',  hp: 300, speed: 0.75, reward: 15, color: { r: 0.23, g: 0.51, b: 0.96 }, template: Assets.EnemyTank,  regenPerSec: 8, shield: 0, followPath: true },
  { id: 'charger',  name: 'Charger',  hp: 800, speed: 0.50, reward: 50, color: { r: 0.66, g: 0.33, b: 0.97 }, template: Assets.EnemyCharger,  slowImmune: true, shield: 0, followPath: true, isBoss: true },
  { id: 'giantGoblin', name: 'Giant Goblin', hp: 600, speed: 0.60, reward: 50, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyGiantGoblin, biomeExclusive: 'grass', slowImmune: true, shield: 0, followPath: true, isBoss: true },
  { id: 'yeti',  name: 'Yeti Berserker', hp: 1800, speed: 0.35, reward: 65, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyYetiBerserker, blizzardSpeedBoost: 1, biomeExclusive: 'snow', slowImmune: true, shield: 0, followPath: true, isBoss: true },
  { id: 'fireGolem', name: 'Fire Golem', hp: 1500, speed: 0.60, reward: 60, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyFireGolem, biomeExclusive: 'volcano', slowImmune: true, shield: 0, followPath: true, isBoss: true },
  { id: 'fireball', name: 'Fireball', hp: 10, speed: 1.5, reward: 10, color: { r: 1.0, g: 1.0, b: 1.0 }, template: Assets.EnemyFireball, slowImmune: true, shield: 0, followPath: false },
];
