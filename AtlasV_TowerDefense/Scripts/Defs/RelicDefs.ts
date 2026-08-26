/**
 * RelicDefs.ts — Static data table for all relic types and their effects.
 *
 * Pure data — no side effects, no service calls.
 * Each relic defines an id, display name, description, and a modifier key/value
 * that RelicService uses to apply buffs to relevant systems.
 *
 * Modifier keys:
 *   - goldMultiplier: multiplier applied to START_GOLD on level reset
 *   - damageMultiplier: multiplier applied to all tower damage in HitService pipeline
 *   - fireRateMultiplier: multiplier applied to tower fire rate in TowerService
 *   - rangeMultiplier: multiplier applied to tower range in TowerService
 *   - bonusLives: flat bonus added to starting lives on level reset
 *   - slowDurationMultiplier: multiplier applied to slow duration in HitService pipeline
 *   - killGoldBonus: flat gold bonus added per enemy kill (additive)
 *   - projectileSpeedMultiplier: multiplier applied to projectile speed
 *   - splashRadiusMultiplier: multiplier applied to splash radius
 *   - wardBreaker: flag (1 = active) \u2014 instantly destroys shaman shields on target
 *   - fireballSpeedReduction: flat reduction applied to fireball projectile speed (0.4 = 40%)
 *   - towerDefenseMultiplier: multiplier applied to all tower damage (stacks with damageMultiplier)
 *   - eliteKillGoldBonus: flat gold bonus per elite/special enemy kill (additive)
 */

export interface IRelicDef {
  id: string;
  name: string;
  description: string;
  modifierKey: string;
  modifierValue: number;
  iconPath: string;
  /** If set, this relic only appears as a choice when the active biome matches. */
  biomeExclusive?: string;
}

export const RELIC_DEFS: IRelicDef[] = [
  {
    id: 'gold',
    name: 'Gold Relic',
    description: 'Doubles starting gold for the next level.',
    modifierKey: 'goldMultiplier',
    modifierValue: 2.0,
    iconPath: '@sprites/relic_gold.png',
  },
  {
    id: 'damage',
    name: 'Damage Relic',
    description: 'Towers deal 1.2x more damage.',
    modifierKey: 'damageMultiplier',
    modifierValue: 1.2,
    iconPath: '@sprites/relic_damage.png',
  },
  {
    id: 'speed',
    name: 'Speed Relic',
    description: 'Towers fire 1.2x faster.',
    modifierKey: 'fireRateMultiplier',
    modifierValue: 1.2,
    iconPath: '@sprites/relic_speed.png',
  },
  {
    id: 'range',
    name: 'Range Relic',
    description: 'Towers have 1.15x more range.',
    modifierKey: 'rangeMultiplier',
    modifierValue: 1.15,
    iconPath: '@sprites/relic_range.png',
  },
  {
    id: 'lives',
    name: 'Fortification Relic',
    description: 'Gain 5 extra starting lives.',
    modifierKey: 'bonusLives',
    modifierValue: 5,
    iconPath: '@sprites/relic_fortification.png',
  },
  {
    id: 'slow',
    name: 'Permafrost Relic',
    description: 'Slow effects last 1.3x longer.',
    modifierKey: 'slowDurationMultiplier',
    modifierValue: 1.3,
    iconPath: '@sprites/relic_permafrost.png',
    biomeExclusive: 'snow',
  },
  {
    id: 'bonfire',
    name: 'Bonfire',
    description: 'Enemies killed by Fire Cannon towers drop double gold.',
    modifierKey: 'fireCannonGoldMultiplier',
    modifierValue: 2.0,
    iconPath: '@sprites/relic_bonfire.png',
    biomeExclusive: 'volcano',
  },
  {
    id: 'harvest',
    name: 'Harvest',
    description: '+2 bonus gold per enemy killed.',
    modifierKey: 'killGoldBonus',
    modifierValue: 2,
    iconPath: '@sprites/relic_harvest.png',
    biomeExclusive: 'grass',
  },
  {
    id: 'frostbite',
    name: 'Frostbite',
    description: 'Projectiles travel 25% faster.',
    modifierKey: 'projectileSpeedMultiplier',
    modifierValue: 1.25,
    iconPath: '@sprites/relic_frostbite.png',
    biomeExclusive: 'snow',
  },
  {
    id: 'eruption',
    name: 'Eruption',
    description: 'Splash radius increased by 30%.',
    modifierKey: 'splashRadiusMultiplier',
    modifierValue: 1.3,
    iconPath: '@sprites/relic_eruption.png',
    biomeExclusive: 'volcano',
  },
  {
    id: 'ward_breaker',
    name: 'Ward Breaker',
    description: 'Instantly destroys shaman shields when targeted.',
    modifierKey: 'wardBreaker',
    modifierValue: 1,
    iconPath: '@sprites/relic_ward_breaker.png',
  },
  {
    id: 'glacial_lens',
    name: 'Glacial Lens',
    description: 'Slows down incoming fireballs by 40%.',
    modifierKey: 'fireballSpeedReduction',
    modifierValue: 0.4,
    iconPath: '@sprites/relic_glacial_lens.png',
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Increases all tower damage by 20%.',
    modifierKey: 'towerDefenseMultiplier',
    modifierValue: 1.2,
    iconPath: '@sprites/relic_iron_will.png',
  },
  {
    id: 'swift_quiver',
    name: 'Swift Quiver',
    description: 'Increases all tower attack speed by 15%.',
    modifierKey: 'fireRateMultiplier',
    modifierValue: 1.15,
    iconPath: '@sprites/relic_swift_quiver.png',
  },
  {
    id: 'bounty_mark',
    name: 'Bounty Mark',
    description: '+5 bonus gold when elite enemies defeated.',
    modifierKey: 'eliteKillGoldBonus',
    modifierValue: 5,
    iconPath: '@sprites/relic_bounty_mark.png',
  },
];
