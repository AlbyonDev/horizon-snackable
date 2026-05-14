/**
 * PowerTypes.ts
 *
 * Enums, interfaces, and constant definitions for the Power System.
 * Defines all hero and enemy powers, effect types, targets, and status effects.
 */
import { GemType } from './Types';

// ===== Power Effect Types =====
export enum PowerEffectType {
  DAMAGE_DIRECT = 0,
  DAMAGE_BURST = 1,
  DAMAGE_DOT = 2,
  HEAL = 3,
  SHIELD = 4,
  DEBUFF_ATK = 5,
  BUFF_ATK = 6,
  MANA_BOOST = 7,
  /** Convert board gems of one color to another, then optionally trigger a secondary effect */
  GEM_CONVERT = 8,
  /** Randomly reshuffle all gems on the board to break bad patterns */
  BOARD_SHUFFLE = 9,
  /** Destroy all gems of convertFromColor; deal atkMultiplier × ATK × count damage to all enemies */
  GEM_DESTROY_DAMAGE = 10,
  /** Apply a heal-over-time (REGEN) to all targets for duration turns */
  HEAL_DOT = 11,
}

// ===== Power Targets =====
export enum PowerTarget {
  SINGLE_ENEMY = 0,
  ALL_ENEMIES = 1,
  ALL_ALLIES = 2,
  SELF = 3,
  RANDOM_ENEMY = 4,
}

// ===== Status Effect Types =====
export enum StatusEffectType {
  DOT = 0,
  SHIELD = 1,
  DEBUFF_ATK = 2,
  BUFF_ATK = 3,
  REGEN = 4,
}

// ===== Interfaces =====

/** A power definition attached to a hero or enemy */
export interface PowerDefinition {
  name: string;
  manaColor: GemType;
  manaCost: number;
  effectType: PowerEffectType;
  target: PowerTarget;
  description: string;
  
  // Effect parameters (used by different effect types)
  atkMultiplier?: number;      // Damage/heal multiplier (e.g., 1.5 = 150% ATK)
  duration?: number;            // Turns for DOT/buffs/debuffs/shield
  shieldHits?: number;          // Number of hits shield absorbs
  buffMultiplier?: number;      // Buff/debuff multiplier (e.g., 1.5 = +50% ATK, 0.5 = -50% ATK)
  /** Mana to grant per colour on activation. Keys are GemType values. */
  manaGrant?: Partial<Record<GemType, number>>;
  // Board interaction (GEM_CONVERT)
  convertFromColor?: GemType;  // Source gem color to replace
  convertToColor?: GemType;    // Replacement gem color
  convertCount?: number;        // Max gems to convert (0 = all matching gems)
  
  /** Optional secondary effect (e.g., Necromancer's Life Drain heals self) */
  secondaryEffect?: {
    effectType: PowerEffectType;
    atkMultiplier?: number;
    buffMultiplier?: number;
    duration?: number;
  };
}

/** An active status effect on a character */
export interface StatusEffect {
  type: StatusEffectType;
  /** For SHIELD: hits remaining. For DOT: damage per tick. For BUFF/DEBUFF: multiplier (e.g. 0.5 = +50%) */
  value: number;
  /** Turns remaining (decremented at start of relevant turn) */
  turnsRemaining: number;
  /** Source hero/enemy ID for tracking (optional) */
  sourceId?: string;
}

/** Result of executing a power */
export interface PowerResult {
  damageDealt: number;
  healingDone: number;
  targetsHit: number;
  /** Mana granted per colour. Keys are GemType values. */
  manaGrant?: Partial<Record<GemType, number>>;
  /** True when the power requests a full board shuffle (handled by GameComponent). */
  boardShuffle?: boolean;
  /** Gem conversion request — GameComponent mutates the board in place. */
  gemConvert?: { fromColor: GemType; toColor: GemType; count: number };
  /** Gem destruction request — GameComponent removes all gems of this color. */
  gemDestroy?: { color: GemType };
}

// Hero power definitions live with their card data in HeroCatalog.ts.

// ===== Enemy Power Definitions =====

export const SLIME_POWER: PowerDefinition = {
  name: 'Acid Spit',
  manaColor: GemType.Green,
  manaCost: 16,
  effectType: PowerEffectType.DAMAGE_DIRECT,
  target: PowerTarget.RANDOM_ENEMY,
  atkMultiplier: 1.3,
  description: 'Spit acid at a random hero!',
};

export const GOBLIN_POWER: PowerDefinition = {
  name: 'Backstab',
  manaColor: GemType.Red,
  manaCost: 20,
  effectType: PowerEffectType.DAMAGE_DIRECT,
  target: PowerTarget.RANDOM_ENEMY,
  atkMultiplier: 1.6,
  description: 'Strike from the shadows!',
};

export const ENEMY_POWERS: Record<string, PowerDefinition> = {
  slime: SLIME_POWER,
  goblin: GOBLIN_POWER,
  // Forest dungeon enemies
  slime_forest: {
    name: 'Vine Lash',
    manaColor: GemType.Red,
    manaCost: 16,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.RANDOM_ENEMY,
    atkMultiplier: 1.2,
    description: 'Lash out with thorny vines!',
  },
  goblin_forest: {
    name: 'Leaf Blade',
    manaColor: GemType.Green,
    manaCost: 18,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.RANDOM_ENEMY,
    atkMultiplier: 1.4,
    description: 'Slash with a razor-sharp leaf!',
  },
  boss_treant: {
    name: 'Root Crush',
    manaColor: GemType.Green,
    manaCost: 14,
    effectType: PowerEffectType.DAMAGE_BURST,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 1.8,
    description: 'Crush all heroes with ancient roots!',
  },
  // Crypt dungeon enemies
  skeleton: {
    name: 'Bone Throw',
    manaColor: GemType.Blue,
    manaCost: 16,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.RANDOM_ENEMY,
    atkMultiplier: 1.3,
    description: 'Hurl a sharpened bone!',
  },
  ghost: {
    name: 'Soul Drain',
    manaColor: GemType.Purple,
    manaCost: 20,
    effectType: PowerEffectType.DAMAGE_DOT,
    target: PowerTarget.RANDOM_ENEMY,
    atkMultiplier: 0.4,
    duration: 3,
    description: 'Haunt a hero, draining life over time!',
  },
  boss_lich: {
    name: 'Death Wave',
    manaColor: GemType.Purple,
    manaCost: 16,
    effectType: PowerEffectType.DAMAGE_BURST,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 2.0,
    description: 'Unleash a wave of necrotic energy!',
  },
  // Volcano dungeon enemies
  fire_elemental: {
    name: 'Flame Bolt',
    manaColor: GemType.Red,
    manaCost: 16,
    effectType: PowerEffectType.DAMAGE_DIRECT,
    target: PowerTarget.RANDOM_ENEMY,
    atkMultiplier: 1.5,
    description: 'Hurl a bolt of pure fire!',
  },
  demon: {
    name: 'Hellfire',
    manaColor: GemType.Yellow,
    manaCost: 24,
    effectType: PowerEffectType.DAMAGE_DOT,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 0.3,
    duration: 3,
    description: 'Set all heroes ablaze!',
  },
  boss_dragon: {
    name: 'Inferno Breath',
    manaColor: GemType.Red,
    manaCost: 18,
    effectType: PowerEffectType.DAMAGE_BURST,
    target: PowerTarget.ALL_ENEMIES,
    atkMultiplier: 2.5,
    description: 'Breathe devastating flames at all heroes!',
  },
};

// ===== Gem Color Hex Values (for UI) =====
export const GEM_COLOR_HEX: Record<GemType, string> = {
  [GemType.Red]: '#E84040',
  [GemType.Blue]: '#3080E8',
  [GemType.Green]: '#30B850',
  [GemType.Yellow]: '#F0C830',
  [GemType.Purple]: '#9030C8',
};
