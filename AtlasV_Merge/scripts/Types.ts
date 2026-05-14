// ===== Gem Types =====
export enum GemType {
  Red = 0,
  Blue = 1,
  Green = 2,
  Yellow = 3,
  Purple = 4,
}

/**
 * Canonical iteration order for gem colors. The single source of truth — adding
 * a new gem means appending to BOTH the GemType enum and this array. Code that
 * needs a count or an iteration uses ALL_GEM_TYPES / GEM_TYPE_COUNT instead of
 * raw integer ranges so it stays correct as the set grows.
 */
export const ALL_GEM_TYPES: readonly GemType[] = [
  GemType.Red,
  GemType.Blue,
  GemType.Green,
  GemType.Yellow,
  GemType.Purple,
];

export const GEM_TYPE_COUNT = ALL_GEM_TYPES.length;

// ===== Animation States =====
export enum AnimPhase {
  Idle = 0,
  Destroying = 1,
  Falling = 2,
  Spawning = 3,
}

export interface GemAnimation {
  /** Scale multiplier (1 = normal, 0 = gone) */
  scale: number;
  /** Alpha/opacity (1 = fully visible, 0 = invisible) */
  alpha: number;
  /** Whether this gem is currently animating */
  isAnimating: boolean;
}

// ===== Gem State =====
export interface Gem {
  type: GemType;
  row: number;
  col: number;
  // Visual position (for animations)
  visualX: number;
  visualY: number;
  // Animation state
  anim: GemAnimation;
}

// ===== Match Types =====
export enum MatchType {
  Match3 = 0,
  Match4 = 1,
  Match5 = 2,
  MatchLT = 3, // L or T shape (5+ gems)
}

export interface Match {
  positions: Array<{row: number; col: number}>;
  type: MatchType;
  gemType: GemType;
  manaValue: number;
}

// ===== Particles =====
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string; // hex color
}

// ===== Game States =====
export enum GameState {
  Title = 0,
  Playing = 1,
  Paused = 2,
  GameOver = 3,
  DungeonMap = 4,
  RosterManagement = 5,
}

// ===== Combat Phase (within Playing state) =====
export enum CombatPhase {
  /** Player can make moves on the board */
  PlayerTurn = 0,
  /** Board is cascading/animating matches */
  BoardAnimating = 1,
  /** Applying player match damage to enemies */
  ApplyingDamage = 2,
  /** Enemy turn: attack + mana gain */
  EnemyTurn = 3,
  /** Playing combat animations (attack lunge, hurt flash) */
  CombatAnimating = 4,
  /** Checking for deaths, reassigning colors */
  ResolvingDeaths = 5,
  /** Waiting for death animation then reorganizing team ranks */
  ReorganizingTeam = 6,
  /** Combat is over (win or loss) */
  CombatOver = 7,
  /** Enemy power cinematic playing (callback-driven, update() is a no-op) */
  EnemyPowerCinematic = 8,
}
