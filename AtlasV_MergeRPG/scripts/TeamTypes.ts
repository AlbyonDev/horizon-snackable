/**
 * TeamTypes.ts
 *
 * Interfaces and enums for the team panel system (heroes and enemies).
 * Layout: Allies on LEFT, enemies on RIGHT, cascading depth stacking.
 */
import { GemType } from './Types';
import type { PowerDefinition, StatusEffect } from './PowerTypes';

// ===== Hero / Enemy Definitions =====

/** Color affinities: how strongly a hero is tied to each gem color (0-1 scale) */
export interface ColorAffinities {
  [GemType.Red]: number;
  [GemType.Blue]: number;
  [GemType.Green]: number;
  [GemType.Yellow]: number;
  [GemType.Purple]: number;
}

/** A hero in the player's team. Identity / art / stats come from HeroCatalog. */
export interface Hero {
  /** Card id from HeroCatalog — also the texture lookup key. */
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  /** Attack stat used in damage calculations */
  atk: number;
  /** Color affinities determine which gem colors this hero is assigned to */
  affinities: ColorAffinities;
  /** Power ability definition */
  power: PowerDefinition;
  /** Active status effects on this hero */
  statusEffects: StatusEffect[];
}

/** Mana gain per turn for each gem color (enemy-specific) */
export interface EnemyManaGain {
  [GemType.Red]: number;
  [GemType.Blue]: number;
  [GemType.Green]: number;
  [GemType.Yellow]: number;
  [GemType.Purple]: number;
}

/** An enemy in the opposing team */
export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  /** Attack stat used in damage calculations */
  atk: number;
  /** Sprite key (e.g., 'slime', 'goblin') */
  spriteKey: string;
  /** Mana gained per turn for each color */
  manaGain: EnemyManaGain;
  /** Power ability definition */
  power: PowerDefinition;
  /** Current accumulated mana (toward power cost) */
  currentMana: number;
  /** Active status effects on this enemy */
  statusEffects: StatusEffect[];
  /** True for boss enemies — used for oversized centered rendering. */
  isBoss?: boolean;
}

// ===== Team Panel Visual State =====

/** Visual state for a team member in the depth-stacked layout */
export interface TeamMemberVisual {
  /** Current X position */
  x: number;
  /** Current Y position */
  y: number;
  /** Target X position (for smooth animation) */
  targetX: number;
  /** Target Y position (for smooth animation) */
  targetY: number;
  /** Current opacity (front=1.0, back=0.7) */
  opacity: number;
  /** Target opacity for animation */
  targetOpacity: number;
  /** Current scale (front=1.0, back=0.65) */
  scale: number;
  /** Target scale for animation */
  targetScale: number;
  /** Depth index: 0=front (closest to viewer), 1=mid, 2=back */
  depthIndex: number;
  /** Target depth index for sorting during transitions */
  targetDepthIndex: number;
  /** Current rotation in degrees (for code effects) */
  rotation: number;
  /** Target rotation */
  targetRotation: number;
  /** Bounce Y offset (sinusoidal animation for attack/hurt effects) */
  bounceOffset: number;
  /** Bounce timer (seconds remaining, 0 = no bounce) */
  bounceTimer: number;
  /** Hurt flash timer (seconds remaining, 0 = no flash) */
  hurtFlashTimer: number;
  /** Attack lunge timer (seconds remaining, 0 = idle) */
  attackTimer: number;
  /** Attack lunge direction: +1 toward right (allies), -1 toward left (enemies) */
  attackDirection: number;
  /** Computed lunge offset in X applied during attack animation */
  attackOffsetX: number;
  /** Random hit-shake X offset (driven by hurtFlashTimer) */
  shakeOffsetX: number;
  /** Random hit-shake Y offset (driven by hurtFlashTimer) */
  shakeOffsetY: number;
  /** Whether this character is dead (scale to 0 + fade) */
  isDead: boolean;
}

/** Color assignment: which hero is responsible for which gem color */
export interface ColorAssignment {
  gemType: GemType;
  heroId: string;
}

// ===== Turn System =====
export enum TurnOwner {
  Player = 0,
  Enemy = 1,
}
