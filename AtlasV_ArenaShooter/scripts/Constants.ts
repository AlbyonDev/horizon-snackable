// Arena Vermin — Game Constants (Milestones 1 & 2)

// === Canvas ===
export const CANVAS_W = 390;
export const CANVAS_H = 844;

// === Projection ===
export const PIXELS_PER_UNIT = 64; // 1 world unit = 64 screen pixels (flat top-down)

// === Tile Dimensions (legacy, kept for sprite sizing) ===
export const TILE_W = 64; // Tile width in pixels
export const TILE_H = 64; // Tile height in pixels
export const GRID_COLS = 16;
export const GRID_ROWS = 16;

// World size in tile units
export const WORLD_W = GRID_COLS;
export const WORLD_H = GRID_ROWS;

// === Hero ===
export const HERO_SPEED = 3.2; // Units per second
export const HERO_HP = 100;

// Hero sprite rendering size
export const HERO_BODY_W = 54;
export const HERO_BODY_H = 81;
export const HERO_SWORD_W = 48;
export const HERO_SWORD_H = 24;

// Weapon hand offset from body anchor (px right, px up from center-bottom)
export const HERO_HAND_OFFSET_X = 21;
export const HERO_HAND_OFFSET_Y = -33;

// Weapon grip anchor (px from weapon sprite center)
export const SWORD_GRIP_X = -15;
export const SWORD_GRIP_Y = 0;

// Hero minigun (visible when minigun upgrade is active). Drawn on the
// off-hand side (mirror of sword) so both can be shown without overlap.
export const HERO_MINIGUN_W = 44;
export const HERO_MINIGUN_H = 22;
// Hand offset for the minigun, in screen pixels relative to body anchor.
// Negative X = off-hand (mirrored from sword's HERO_HAND_OFFSET_X = +21).
export const HERO_MINIGUN_HAND_OFFSET_X = -22;
export const HERO_MINIGUN_HAND_OFFSET_Y = -30;
// Recoil kick when firing — small backward offset that decays over RECOIL_DUR.
export const HERO_MINIGUN_RECOIL_DUR = 0.08; // seconds
export const HERO_MINIGUN_RECOIL_PX = 4; // pixels of horizontal kick
// Muzzle position offset from hero feet, in world units (where bullets/flash spawn).
// X is in facing direction, Y is "up" in screen-space (negative = above feet).
export const HERO_MINIGUN_MUZZLE_DX = 0.45; // tile units forward of feet
export const HERO_MINIGUN_MUZZLE_DY = -0.45; // tile units above feet (visual)

// Hero hurt flash
export const HERO_HURT_FLASH_DUR = 0.15; // seconds

// Hero invincibility frames after taking damage
export const HERO_IFRAME_DUR = 0.6; // seconds of invulnerability after any hit

// === Joystick ===
export const JOY_DEAD_ZONE = 0.08; // 8% of radius
export const JOY_MAX_ZONE = 0.80; // Full speed at 80% radius
export const JOY_RADIUS = 60; // Visual outer ring radius (px)
export const JOY_FADE_TIME = 0.5; // Seconds before fading to low opacity
export const JOY_FADE_ALPHA = 0.4; // Opacity when faded

// === Animation Parameters ===
// Idle body bob (disabled — was causing floating appearance)
export const IDLE_BOB_PERIOD = 1.8; // seconds
export const IDLE_BOB_AMP_Y = 0; // pixels (set to 0 to remove idle bob)

// Walk body bob
export const WALK_BOB_PERIOD = 0.45; // seconds
export const WALK_BOB_AMP_Y = 5; // pixels
export const WALK_BOB_AMP_X = 1.5; // pixels

// Weapon idle sway
export const WEAPON_SWAY_PERIOD = 2.6; // seconds
export const WEAPON_SWAY_AMP_DEG = 4; // degrees

// Animation blend time
export const ANIM_BLEND_TIME = 0.1; // seconds

// === Environment Palette ===
export const COL_ROAD_DARK = '#3C3C44';
export const COL_ROAD_MID = '#4C4C55';
export const COL_GRASS_LIGHT = '#5A7A3A';
export const COL_GRASS_DARK = '#3A5A20';
export const COL_OUTLINE = '#1A1A20';

// === Milestone 2: Combat Stats ===
export const ATTACK_RANGE = 3.0; // tile units
export const ATTACK_SPEED = 1.3; // attacks per second
export const ATTACK_DAMAGE = 10;
export const CRIT_CHANCE = 0.10;
export const CRIT_MULT = 2.0;
export const TARGET_EVAL_INTERVAL = 0.25; // seconds between target re-evaluations

// === Grunt Rat Stats ===
export const GRUNT_HP = 25;
export const GRUNT_SPEED = 2.3; // units/sec
export const GRUNT_CONTACT_DMG = 8;
export const GRUNT_CONTACT_TICK = 0.5; // seconds between contact damage ticks
export const GRUNT_AGGRO = 6; // tile units aggro radius
export const GRUNT_BODY_W = 36;
export const GRUNT_BODY_H = 54;

// === Attack Ring ===
export const RING_INNER_COLOR = '#4090FF';
export const RING_INNER_OPACITY = 0.4;
export const RING_INNER_WIDTH = 2;
export const RING_OUTER_COLOR = '#FFA020';
export const RING_OUTER_OPACITY = 0.5;
export const RING_OUTER_WIDTH_MIN = 3;
export const RING_OUTER_WIDTH_MAX = 5;
export const RING_PULSE_PERIOD = 2.0; // seconds
export const RING_GAP_PX = 4;

// Ring glow strokes (wider, behind main strokes)
export const RING_INNER_GLOW_WIDTH = 6;
export const RING_INNER_GLOW_OPACITY = 0.15;
export const RING_OUTER_GLOW_WIDTH = 8;
export const RING_OUTER_GLOW_OPACITY = 0.2;

// === Attack Swing Timings ===
export const ANTIC_DUR = 0.06; // seconds
export const ANTIC_ROT = -35; // degrees
export const STRIKE_DUR = 0.08; // seconds
export const STRIKE_ROT = 55; // degrees
export const SETTLE_DUR = 0.12; // seconds
export const SWING_BODY_SCALE_X = 1.08;
export const SWING_BODY_SCALE_Y = 0.94;

// === Hit Feedback ===
export const HIT_PAUSE_DUR = 0.05; // seconds (freeze game logic)
export const HURT_FLASH_DUR = 0.05; // seconds (white flash on enemy)
export const RECOIL_DIST = 8; // pixels
export const RECOIL_OUT_DUR = 0.08; // seconds
export const RECOIL_BACK_DUR = 0.10; // seconds

// === Death Animation Timings ===
export const DEATH_FALL_DUR = 0.3; // seconds
export const DEATH_BOUNCE_DUR = 0.08; // seconds
export const DEATH_FADE_START = 0.38; // seconds after death starts
export const DEATH_FADE_END = 0.80; // seconds (fully faded out)
export const DEATH_WEAPON_FADE_DUR = 0.1; // seconds

// === Spawn Drop-in Animation ===
export const SPAWN_FALL_DUR = 0.2; // seconds
export const SPAWN_SQUASH_DUR = 0.08; // seconds
export const SPAWN_STRETCH_DUR = 0.08; // seconds
export const SPAWN_SETTLE_DUR = 0.11; // seconds
export const SPAWN_TOTAL_DUR = SPAWN_FALL_DUR + SPAWN_SQUASH_DUR + SPAWN_STRETCH_DUR + SPAWN_SETTLE_DUR; // 0.47s
export const SPAWN_Y_OFFSET = -80; // pixels above final position

// === Floating Text ===
export const MAX_FLOATING_TEXTS = 12;
export const FLOAT_TEXT_DUR_NORMAL = 0.5; // seconds
export const FLOAT_TEXT_DUR_CRIT = 0.7; // seconds
export const FLOAT_TEXT_RISE_SPEED = 60; // px/s
export const FLOAT_TEXT_SCALE_NORMAL = 1.0;
export const FLOAT_TEXT_SCALE_CRIT = 1.4;
export const FLOAT_TEXT_CRIT_LABEL_SCALE = 1.6;
export const FLOAT_TEXT_COLOR_NORMAL = '#FFFFFF';
export const FLOAT_TEXT_COLOR_CRIT = '#FF8020';

// === Particle Specs ===
export const PARTICLE_HIT_COUNT_MIN = 4;
export const PARTICLE_HIT_COUNT_MAX = 6;
export const PARTICLE_HIT_SIZE = 2;
export const PARTICLE_HIT_SPEED_MIN = 40;
export const PARTICLE_HIT_SPEED_MAX = 80;
export const PARTICLE_HIT_LIFE_MIN = 0.2;
export const PARTICLE_HIT_LIFE_MAX = 0.35;
export const PARTICLE_HIT_COLORS = ['#FFE040', '#FF8020', '#FFFFFF'];

export const PARTICLE_CRIT_COUNT_MIN = 8;
export const PARTICLE_CRIT_COUNT_MAX = 12;
export const PARTICLE_CRIT_SIZE = 3;
export const PARTICLE_CRIT_SPEED_MIN = 80;
export const PARTICLE_CRIT_SPEED_MAX = 140;
export const PARTICLE_CRIT_RING_COLOR = '#FFE040';
export const PARTICLE_CRIT_RING_START = 4;
export const PARTICLE_CRIT_RING_END = 24;
export const PARTICLE_CRIT_RING_DUR = 0.2;

export const PARTICLE_DEATH_COUNT_MIN = 6;
export const PARTICLE_DEATH_COUNT_MAX = 8;
export const PARTICLE_DEATH_SIZE = 3;
export const PARTICLE_DEATH_SPEED_MIN = 50;
export const PARTICLE_DEATH_SPEED_MAX = 90;
export const PARTICLE_DEATH_LIFE_MIN = 0.25;
export const PARTICLE_DEATH_LIFE_MAX = 0.45;

// === Dust Trail Particles ===
export const DUST_SPAWN_INTERVAL = 0.05; // seconds (~every 3-4 frames at 72fps)
export const DUST_COUNT_PER_SPAWN = 2; // particles per spawn event
export const DUST_SIZE_MIN = 3; // pixels
export const DUST_SIZE_MAX = 5;
export const DUST_SPEED_MIN = 20; // px/s outward/upward
export const DUST_SPEED_MAX = 40;
export const DUST_LIFE_MIN = 0.3; // seconds
export const DUST_LIFE_MAX = 0.4;
export const DUST_SPAWN_OFFSET = 10; // pixels behind hero (opposite velocity)
export const DUST_COLORS: string[] = ['#C8C0B0', '#A89880', '#D8D0C0'];

// === Camera Shake ===
export const SHAKE_MAGNITUDE = 4; // pixels
export const SHAKE_DURATION = 0.2; // seconds
export const SHAKE_FREQUENCY = 30; // Hz

// === Enemy Spawn ===
export const INITIAL_WAVE_COUNT_MIN = 8;
export const INITIAL_WAVE_COUNT_MAX = 10;
export const MIN_SPAWN_DIST = 5; // tile units from hero

// === Hurt Squash (code-driven on idle sprite) ===
export const HURT_SQUASH_SCALE_X = 1.2;
export const HURT_SQUASH_SCALE_Y = 0.8;
export const HURT_SQUASH_DUR = 0.05; // seconds
export const HURT_SQUASH_SETTLE = 0.08; // seconds

// === Slash VFX ===
export const SLASH_DURATION = 0.20; // seconds
export const SLASH_ARC_HALF_ANGLE = 60; // degrees
export const SLASH_RADIUS = 52; // pixels
export const SLASH_WIDTH = 16; // pixels (arc thickness)
export const SLASH_SCALE_START = 0.6;
export const SLASH_SCALE_END = 1.4;
export const SLASH_COLOR_INNER = '#FFFFA0'; // bright yellow-white core
export const SLASH_COLOR_GLOW = '#FFA030';  // orange glow

// === Milestone 4: Enemy Type Stats ===

// Gunner Mouse
export const GUNNER_HP = 45;
export const GUNNER_SPEED = 1.5;
export const GUNNER_CONTACT_DMG = 4;
export const GUNNER_CONTACT_TICK = 0.5;
export const GUNNER_AGGRO = 8;
export const GUNNER_BODY_W = 48;
export const GUNNER_BODY_H = 72;
export const GUNNER_PREFERRED_DIST_MIN = 4;
export const GUNNER_PREFERRED_DIST_MAX = 6;
export const GUNNER_FIRE_INTERVAL = 2.0; // seconds between bursts
export const GUNNER_BURST_COUNT = 3;
export const GUNNER_PROJECTILE_DMG = 8;
// Gunner weapon sprite
export const GUNNER_WEAPON_W = 36;
export const GUNNER_WEAPON_H = 18;
export const GUNNER_HAND_OFFSET_X = 15;
export const GUNNER_HAND_OFFSET_Y = -24;

// Drone Rat weapon sprite (energy blades)
export const DRONE_WEAPON_W = 28;
export const DRONE_WEAPON_H = 14;
export const DRONE_HAND_OFFSET_X = 14;
export const DRONE_HAND_OFFSET_Y = -22;

// Sewer Bruiser weapon sprite (heavy club)
export const BRUISER_WEAPON_W = 42;
export const BRUISER_WEAPON_H = 22;
export const BRUISER_HAND_OFFSET_X = 18;
export const BRUISER_HAND_OFFSET_Y = -30;

// Gas Rat weapon sprite (gas canister)
export const GAS_RAT_WEAPON_W = 32;
export const GAS_RAT_WEAPON_H = 18;
export const GAS_RAT_HAND_OFFSET_X = 15;
export const GAS_RAT_HAND_OFFSET_Y = -24;

// Drone Rat
export const DRONE_HP = 35;
export const DRONE_SPEED = 2.7;
export const DRONE_CONTACT_DMG = 12;
export const DRONE_CONTACT_TICK = 0.5;
export const DRONE_AGGRO = 8;
export const DRONE_BODY_W = 48;
export const DRONE_BODY_H = 72;
export const DRONE_SINE_AMP = 1.5; // tile units lateral offset
export const DRONE_SINE_FREQ = 2.0; // Hz

// Sewer Bruiser
export const BRUISER_HP = 150;
export const BRUISER_SPEED = 0.9;
export const BRUISER_CONTACT_DMG = 25;
export const BRUISER_CONTACT_TICK = 0.5;
export const BRUISER_AGGRO = 8;
export const BRUISER_BODY_W = 63;
export const BRUISER_BODY_H = 96;
export const BRUISER_FRONTAL_ARMOR = 0.5; // 50% damage reduction from front

// Gas Rat
export const GAS_RAT_HP = 55;
export const GAS_RAT_SPEED = 1.8;
export const GAS_RAT_CONTACT_DMG = 6;
export const GAS_RAT_CONTACT_TICK = 0.5;
export const GAS_RAT_AGGRO = 8;
export const GAS_RAT_BODY_W = 48;
export const GAS_RAT_BODY_H = 72;
export const GAS_RAT_CLOUD_INTERVAL_MIN = 6; // seconds
export const GAS_RAT_CLOUD_INTERVAL_MAX = 8;
export const GAS_RAT_CLOUD_DAMAGE = 5;
export const GAS_RAT_CLOUD_RADIUS = 2; // tile units
export const GAS_RAT_CLOUD_DURATION = 4; // seconds

// Gas Rat throw wind-up — canister lifts up & forward, cloud spawns at the apex.
export const GAS_RAT_THROW_DUR = 0.32; // seconds
export const GAS_RAT_THROW_LIFT_PX = 18; // canister rises this many pixels at apex
export const GAS_RAT_THROW_FORWARD_PX = 12; // canister drifts forward (toward facing) at apex
export const GAS_RAT_THROW_SCALE_BOOST = 0.15; // canister scales up by +15% at apex
// World-space height (tile units) at which the cloud spawns from the canister
// (above the rat's feet — gas appears to leave the canister, not the floor).
export const GAS_RAT_CLOUD_SPAWN_FORWARD = 0.35; // tile units, in facing direction

// Hero contact damage range
export const HERO_CONTACT_RANGE = 0.2; // world units — distance for enemy contact damage

// Projectile
export const PROJECTILE_SPEED = 4; // tile units/sec
export const PROJECTILE_MAX_AGE = 3; // seconds
export const PROJECTILE_SIZE_PX = 20; // diameter in screen pixels
export const PROJECTILE_COLOR = '#6B7B8B';

// Gas Cloud rendering
export const GAS_CLOUD_COLOR = '#60FF40';
export const GAS_CLOUD_OPACITY = 0.3;
export const GAS_CLOUD_TICK_INTERVAL = 0.5; // damage tick rate (same as contact)

// Per-type loot drop rates
export const GUNNER_GEM_DROP = 2;
export const GUNNER_COIN_CHANCE = 0.3;
export const DRONE_GEM_DROP = 2;
export const DRONE_COIN_CHANCE = 0.2;
export const BRUISER_GEM_DROP = 5;
export const BRUISER_COIN_DROP = 2;
export const BRUISER_COIN_CHANCE = 0.6;
export const GAS_RAT_GEM_DROP = 3;
export const GAS_RAT_COIN_CHANCE = 0.4;

// === Elite Enemy System ===
export const ELITE_HP_MULT = 2.5;
export const ELITE_SPEED_MULT = 1.3;
export const ELITE_DAMAGE_MULT = 1.5;
export const ELITE_LOOT_MULT = 2;
export const ELITE_SCALE = 1.5;
export const ELITE_GLOW_PULSE_PERIOD = 1.5; // seconds for full pulse cycle
export const ELITE_GLOW_ALPHA_MIN = 0.6;
export const ELITE_GLOW_ALPHA_MAX = 1.0;
export const ELITE_GLOW_SIZE_MULT = 2.0; // glow ellipse is 2× enemy body dims
export const ELITE_FIRST_WAVE = 5; // First wave where elites can appear
export const ELITE_GUARANTEED_WAVE = 15; // Wave where 60s guaranteed elite starts
export const ELITE_GUARANTEED_INTERVAL = 60; // seconds between guaranteed elites
export const ELITE_WARNING_DURATION = 3.0; // seconds for "ELITE INCOMING!" warning
export const ELITE_BASE_CHANCE = 0.10; // 10% at wave 5
export const ELITE_CHANCE_PER_WAVE = 0.01; // +1% per wave above 5

// Elite glow colors per EnemyType (indexed by EnemyType enum)
export const ELITE_GLOW_COLORS: string[] = [
  '#FFD040', // GruntRat - gold
  '#60CFFF', // GunnerMouse - bright cyan
  '#40FFD0', // DroneRat - bright teal
  '#FFE040', // SewerBruiser - bright gold
  '#80FF40', // GasRat - bright green
  '#FF4040', // Boss - red
];

// === Boss (Rat King) Stats ===
export const BOSS_BASE_HP = 500;
export const BOSS_HP_SCALE_PER_WAVE = 200;
export const BOSS_SPEED = 1.0;
export const BOSS_CHARGE_SPEED = 4.5;
export const BOSS_CONTACT_DMG = 30;
export const BOSS_CONTACT_TICK = 0.5;
export const BOSS_BODY_W = 90;
export const BOSS_BODY_H = 135;
export const BOSS_PHASE_INTERVAL = 6.0;
export const BOSS_CHARGE_DURATION = 2.0;
export const BOSS_SUMMON_COUNT = 4;
export const BOSS_GEM_DROP = 8;
export const BOSS_COIN_DROP = 3;
export const BOSS_COIN_CHANCE = 1.0;
export const BOSS_WARNING_DURATION = 3.0;
export const BOSS_AGGRO = 99;

// === Drone Weapon Levels ===
export interface DroneLevelData {
  count: number;
  rotSpeed: number;    // radians per second
  damage: number;
  radius: number;      // orbit radius in world units
  hitCooldown: number; // seconds between hits on same enemy (legacy, kept for interface compat)
  fireRate: number;    // projectile shots per second per drone
  fireRange: number;   // targeting range in world units
}

export const DRONE_LEVELS: DroneLevelData[] = [
  { count: 1, rotSpeed: 1.5, damage: 8,  radius: 1.5, hitCooldown: 0.5, fireRate: 1.2, fireRange: 4.0 },
  { count: 1, rotSpeed: 2.0, damage: 12, radius: 1.8, hitCooldown: 0.5, fireRate: 1.5, fireRange: 4.5 },
  { count: 2, rotSpeed: 2.0, damage: 12, radius: 2.0, hitCooldown: 0.45, fireRate: 1.5, fireRange: 5.0 },
  { count: 2, rotSpeed: 2.3, damage: 15, radius: 2.2, hitCooldown: 0.4, fireRate: 1.8, fireRange: 5.5 },
  { count: 3, rotSpeed: 2.5, damage: 18, radius: 2.5, hitCooldown: 0.35, fireRate: 2.0, fireRange: 6.0 },
];

// === Drone Projectile Constants ===
export const DRONE_PROJ_SPEED = 6.0;       // world units per second
export const DRONE_PROJ_MAX_AGE = 2.0;     // seconds before auto-expire
export const DRONE_PROJ_RADIUS = 0.2;      // world-unit radius for collision
export const DRONE_PROJ_SIZE_PX = 12;      // diameter in screen pixels
export const DRONE_PROJ_COLOR = '#60E0FF'; // bright cyan
export const DRONE_PROJ_GLOW_COLOR = '#30A0FF'; // outer glow ring color

export const DRONE_MAX_LEVEL = DRONE_LEVELS.length;

// === Minigun Weapon Levels ===
export interface MinigunLevelData {
  fireRate: number;      // shots per second
  damage: number;
  bulletCount: number;   // bullets per shot (spread at higher levels)
  spreadDeg: number;     // spread angle in degrees (per side)
  range: number;         // targeting range in world units
}

export const MINIGUN_LEVELS: MinigunLevelData[] = [
  { fireRate: 3.0, damage: 5,  bulletCount: 1, spreadDeg: 0,  range: 5.0 },
  { fireRate: 4.0, damage: 6,  bulletCount: 1, spreadDeg: 0,  range: 5.5 },
  { fireRate: 5.0, damage: 7,  bulletCount: 2, spreadDeg: 5,  range: 6.0 },
  { fireRate: 6.0, damage: 8,  bulletCount: 2, spreadDeg: 8,  range: 6.5 },
  { fireRate: 8.0, damage: 10, bulletCount: 3, spreadDeg: 10, range: 7.0 },
];

export const MINIGUN_MAX_LEVEL = MINIGUN_LEVELS.length;

// === Damage Circle Weapon Levels ===
// The damage circle is an orbiting Weapon03 sprite that circles the hero at a
// fixed radius and damages any enemy it overlaps with (per-enemy cooldown so
// a single enemy isn't hit every frame while it's near the orbit path).
export interface DamageCircleLevelData {
  radius: number;        // world units — orbit radius around hero
  damage: number;        // damage per hit
  hitCooldown: number;   // seconds before the orb can hit the same enemy again
  orbitSpeed: number;    // radians per second
}

export const DAMAGE_CIRCLE_LEVELS: DamageCircleLevelData[] = [
  { radius: 2.0, damage: 8,  hitCooldown: 1.0, orbitSpeed: 2.0 },
  { radius: 2.3, damage: 10, hitCooldown: 0.9, orbitSpeed: 2.4 },
  { radius: 2.6, damage: 13, hitCooldown: 0.8, orbitSpeed: 2.8 },
  { radius: 2.9, damage: 16, hitCooldown: 0.7, orbitSpeed: 3.2 },
  { radius: 3.2, damage: 20, hitCooldown: 0.6, orbitSpeed: 3.6 },
];

export const DAMAGE_CIRCLE_MAX_LEVEL = DAMAGE_CIRCLE_LEVELS.length;

// === Minigun Bullet Constants ===
export const MINIGUN_BULLET_SPEED = 8.0;       // world units per second
export const MINIGUN_BULLET_MAX_AGE = 1.5;     // seconds before auto-expire
export const MINIGUN_BULLET_RADIUS = 0.15;     // world-unit radius for collision
export const MINIGUN_BULLET_SIZE_PX = 8;       // diameter in screen pixels
export const MINIGUN_BULLET_COLOR = '#FFD040'; // bright yellow core
export const MINIGUN_BULLET_GLOW_COLOR = '#FF8020'; // orange glow ring
export const DRONE_HIT_RADIUS = 0.3; // drone hitbox in world units
export const DRONE_SPRITE_SIZE = 56; // pixels on screen

// === Milestone 3: Wave System ===
export interface WaveDataEntry {
  duration: number; // seconds
  burstMin: number;
  burstMax: number;
  pauseMin: number; // seconds between bursts
  pauseMax: number;
  hpScale: number; // Multiplier applied to base HP
}

export const WAVE_DATA: WaveDataEntry[] = [
  // Waves 1-3: 30s, burst 6-8, pause 2-3s (tighter, larger groups)
  { duration: 30, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.0 },
  { duration: 30, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.15 },
  { duration: 30, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.30 },
  // Waves 4-6: 35s, burst 6-8, pause 2-3s
  { duration: 35, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.48 },
  { duration: 35, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.60 },
  { duration: 35, burstMin: 6, burstMax: 8, pauseMin: 2.0, pauseMax: 3.0, hpScale: 1.72 },
  // Waves 7-9: 35s, burst 5-7, pause 2-3.5s
  { duration: 35, burstMin: 5, burstMax: 7, pauseMin: 2, pauseMax: 3.5, hpScale: 1.84 },
  { duration: 35, burstMin: 5, burstMax: 7, pauseMin: 2, pauseMax: 3.5, hpScale: 1.96 },
  { duration: 35, burstMin: 5, burstMax: 7, pauseMin: 2, pauseMax: 3.5, hpScale: 2.08 },
  // Wave 10: 60s (boss placeholder), burst 6-8, pause 2-3s
  { duration: 60, burstMin: 6, burstMax: 8, pauseMin: 2, pauseMax: 3, hpScale: 2.20 },
  // Waves 11-14: 40s, burst 5-8, pause 2-3s
  { duration: 40, burstMin: 5, burstMax: 8, pauseMin: 2, pauseMax: 3, hpScale: 2.32 },
  { duration: 40, burstMin: 5, burstMax: 8, pauseMin: 2, pauseMax: 3, hpScale: 2.44 },
  { duration: 40, burstMin: 5, burstMax: 8, pauseMin: 2, pauseMax: 3, hpScale: 2.56 },
  { duration: 40, burstMin: 5, burstMax: 8, pauseMin: 2, pauseMax: 3, hpScale: 2.68 },
  // Waves 15-19: 40s, burst 6-8, pause 1.5-2.5s
  { duration: 40, burstMin: 6, burstMax: 8, pauseMin: 1.5, pauseMax: 2.5, hpScale: 2.80 },
  { duration: 40, burstMin: 6, burstMax: 8, pauseMin: 1.5, pauseMax: 2.5, hpScale: 2.92 },
  { duration: 40, burstMin: 6, burstMax: 8, pauseMin: 1.5, pauseMax: 2.5, hpScale: 3.04 },
  { duration: 40, burstMin: 6, burstMax: 8, pauseMin: 1.5, pauseMax: 2.5, hpScale: 3.16 },
  { duration: 40, burstMin: 6, burstMax: 8, pauseMin: 1.5, pauseMax: 2.5, hpScale: 3.28 },
  // Wave 20: 60s (final boss placeholder), burst 7-8, pause 1.5-2s
  { duration: 60, burstMin: 7, burstMax: 8, pauseMin: 1.5, pauseMax: 2, hpScale: 3.40 },
];

export const BREATHER_DURATION = 3.0; // seconds between waves
export const WAVE_DESPAWN_FADE = 0.3; // seconds for despawning enemies to dissolve
export const DESPAWN_LOOT_MULT = 0.5; // Reduced loot drop for despawned enemies

// === Milestone 3: Pickup System ===
export const PICKUP_GEM_W = 28; // pixels
export const PICKUP_GEM_H = 20;
export const PICKUP_COIN_W = 24;
export const PICKUP_COIN_H = 12;
export const PICKUP_PERSIST_TIME = 12; // seconds before auto-despawn
export const PICKUP_FLASH_TIME = 9; // seconds before flashing starts
export const PICKUP_COLLECTION_RADIUS = 0.8; // world units — distance threshold for collecting pickups
export const PICKUP_MAGNET_RADIUS = 3.0; // world units — range where pull begins
export const PICKUP_MAGNET_ACCEL = 8.0; // world units/s² — acceleration toward hero
export const PICKUP_MAGNET_MAX_SPEED = 12.0; // world units/s — speed cap
export const PICKUP_MAGNET_SHRINK_DIST = 1.2; // world units — distance at which pickup starts shrinking
export const PICKUP_MAGNET_MIN_SCALE = 0.5; // minimum scale right before collection
export const PICKUP_GEM_FLOAT_AMP = 3; // pixels
export const PICKUP_GEM_FLOAT_PERIOD = 1.5; // seconds
export const PICKUP_COIN_SPIN_PERIOD = 1.2; // seconds
export const PICKUP_SPAWN_OFFSET = 0.3; // tile units random offset from death position

// Pickup colors (from art direction)
export const COL_GEM_LIGHT = '#30D060';
export const COL_GEM_DARK = '#20A040';
export const COL_GEM_GLOW = '#00FF80';
export const COL_COIN_FACE = '#F0C030';
export const COL_COIN_EDGE = '#C08020';

// Drop rates
export const GRUNT_GEM_DROP = 1; // gems per kill
export const GRUNT_COIN_CHANCE = 0.15; // 15% chance

// XP awarded per green gem collected
export const XP_PER_GEM = 1;

// === Health Pickup ===
export const PICKUP_HEALTH_W = 26; // pixels
export const PICKUP_HEALTH_H = 24;
export const HEALTH_RESTORE_AMOUNT = 15; // HP restored per heart
export const HEALTH_DROP_CHANCE = 0.12; // 12% chance per enemy kill



// === Milestone 3: XP / Leveling ===
export const XP_BASE = 20;
export const XP_EXPONENT = 1.4;

// XP formula: xpToNext(level) = Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT))
export function calcXpToNext(level: number): number {
  return Math.floor(XP_BASE * Math.pow(level, XP_EXPONENT));
}

// === Milestone 3: HUD Layout ===
export const HUD_LEVEL_BAR_H = 12;
export const HUD_LEVEL_BAR_MARGIN = 50; // px from left/right edge
export const HUD_LEVEL_BAR_Y = 12;
export const HUD_TIMER_W = 220;
export const HUD_TIMER_H = 32;
export const HUD_TIMER_CELLS = 10;
export const HUD_WAVE_ANNOUNCE_DUR = 2.0; // seconds
