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
 */

export interface IRelicDef {
  id: string;
  name: string;
  description: string;
  modifierKey: string;
  modifierValue: number;
  iconPath: string;
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
  },
];
