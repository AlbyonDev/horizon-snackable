// Arena Vermin — Type Definitions (Milestones 1–4)

// === Milestone 1 Types ===

export interface HeroState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  isMoving: boolean;
  animTime: number;
}

export interface CameraState {
  offsetX: number;
  offsetY: number;
}

export interface JoystickState {
  active: boolean;
  centerX: number;
  centerY: number;
  currentX: number;
  currentY: number;
  dirX: number;
  dirY: number;
  magnitude: number;
  idleTime: number;
}

// === Milestone 2 Types ===

export enum EnemyAI {
  IDLE = 0,
  CHASE = 1,
  ATTACK = 2,
}

export enum BodyVariant {
  IDLE = 0,
  HURT = 1,
  DEAD = 2,
}

// === Milestone 4: Enemy Types ===
export enum EnemyType {
  GruntRat = 0,
  GunnerMouse = 1,
  DroneRat = 2,
  SewerBruiser = 3,
  GasRat = 4,
  Boss = 5,
}

export interface EnemyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  hp: number;
  maxHp: number;
  aiState: EnemyAI;
  speed: number;
  contactDmg: number;
  contactTickInterval: number;
  lastContactTime: number;
  animTime: number;
  bodyVariant: BodyVariant;
  spawnTimer: number;
  isSpawning: boolean;
  hurtTimer: number;
  hurtOffsetX: number;
  hurtSquashTimer: number;
  flashTimer: number;
  deathTimer: number;
  isDead: boolean;
  deathOpacity: number;
  // === Milestone 4 fields ===
  enemyType: EnemyType;
  preferredDist: number;
  fireTimer: number;
  fireBurstCount: number;
  burstShotDelay: number;
  sinePhase: number;
  gasTimer: number;
  gasSpawnFlag: boolean;
  // Throw animation timer (gas rat canister wind-up), counts up from 0 to GAS_RAT_THROW_DUR.
  // Active while > 0; cloud spawns when it reaches GAS_RAT_THROW_DUR. -1 means inactive.
  throwAnimTimer: number;
  splashImmune: boolean;
  isElite: boolean;
  // Boss-specific fields
  bossPhase: number; // 0=CHASE, 1=CHARGE, 2=SUMMON
  bossPhaseTimer: number;
  bossSummonCount: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorHex: string;
}

export interface ExpandingRing {
  cx: number;
  cy: number;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  colorHex: string;
}

export interface FloatingTextEntry {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  text: string;
  colorHex: string;
  scale: number;
  fadeStart: number;
}

export interface AttackSwingState {
  active: boolean;
  phase: number;
  timer: number;
  weaponRotDeg: number;
  bodyScaleX: number;
  bodyScaleY: number;
}

export interface CameraShakeState {
  active: boolean;
  timer: number;
  magnitude: number;
  frequency: number;
  offsetX: number;
  offsetY: number;
}

export interface SlashEffect {
  x: number;
  y: number;
  angleDeg: number;
  timer: number;
  duration: number;
}

// World-space muzzle flash burst (no rotation; sprites stay parallel to screen).
export interface MuzzleFlash {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  scale: number;
  colorHex: string;
}

// === Milestone 3 Types ===

export enum PickupType {
  GreenGem = 0,
  GoldCoin = 1,
  HealthHeart = 2,
}

export interface PickupState {
  x: number;
  y: number;
  type: PickupType;
  age: number;
  maxAge: number;
  flashAge: number;
  collected: boolean;
  collectAnimTimer: number;
  floatPhase: number;
  magnetSpeed: number;
  magnetActive: boolean;
  magnetScale: number;
}

export interface WaveState {
  waveNumber: number;
  waveTimer: number;
  waveDuration: number;
  breatherTimer: number;
  burstTimer: number;
  burstCooldown: number;
  spawnedThisWave: number;
  isBreather: boolean;
  isActive: boolean;
  lastEliteTime: number;
  eliteWarningTimer: number;
}

export interface GameStats {
  xp: number;
  coins: number;
  level: number;
  xpToNext: number;
}

// === Milestone 4: Projectile & Gas Cloud ===

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  damage: number;
}

export interface GasCloudState {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  radius: number;
  damage: number;
  lastTickTime: number;
}

// === Upgrade/Weapon System ===

export enum WeaponId {
  Drone = 0,
  Minigun = 1,
  DamageCircle = 2,
}

export interface DroneState {
  angle: number;
  hitCooldownMap: Map<number, number>; // enemy index -> last hit time
  lastFireTime: number; // last time this drone fired a projectile
}

export interface DroneProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  damage: number;
}

export interface MinigunState {
  lastFireTime: number;
  // Recoil kick timer for the visible hero minigun (counts down from
  // HERO_MINIGUN_RECOIL_DUR after each shot). 0 = no kick.
  recoilTimer: number;
}

export interface MinigunBulletState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  damage: number;
}

export interface DamageCircleState {
  // Current orbit angle in radians.
  angle: number;
  // Per-enemy last-hit timestamps (gameTime). Keyed by enemy reference so it
  // survives reordering of the enemies array.
  hitCooldownMap: Map<EnemyState, number>;
}

export interface UpgradeOption {
  weaponId: WeaponId;
  currentLevel: number;
  nextLevel: number;
  name: string;
  description: string;
}

export type WeaponLevels = Map<WeaponId, number>;

// === Sprite-based impact/crit effects ===
export enum SpriteEffectType {
  Impact = 0,
  Splash = 1,
  Critique = 2,
}

export interface SpriteEffect {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  type: SpriteEffectType;
  scale: number;
  rotation: number;
}
