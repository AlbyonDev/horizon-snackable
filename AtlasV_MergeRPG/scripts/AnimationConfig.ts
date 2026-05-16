/**
 * AnimationConfig
 *
 * Centralized animation/visual tuning constants. Anything that controls
 * the *feel* of the game (durations, amplitudes, easing speeds, particle
 * counts) lives here — not scattered as private constants in handlers.
 *
 * Game-rules constants (board size, scoring, mana costs) stay in Constants.ts;
 * this file is reserved for things a designer might tweak without changing logic.
 */

// ===== Swap =====
export const SWAP_VALID_DURATION = 0.2;          // s - successful swap
export const SWAP_INVALID_FORWARD_DURATION = 0.1; // s - reject animation forward
export const SWAP_INVALID_RETURN_DURATION = 0.15; // s - reject animation return
export const SWAP_INVALID_FORWARD_PERCENT = 0.25; // fraction of full distance for invalid forward
export const SWAP_VALID_ROTATION_DEG = 5;         // peak rotation during valid swap
export const SWAP_INVALID_ROTATION_DEG = 3;       // peak rotation during invalid swap

// ===== Destruction =====
export const BURST_DURATION = 0.2;        // s
export const BURST_MAX_SCALE = 1.4;       // peak scale during burst
export const PARTICLES_PER_GEM = 5;
export const PARTICLE_GRAVITY = 200;      // px/s²
export const PARTICLE_MIN_SPEED = 80;
export const PARTICLE_SPEED_RANGE = 120;
export const PARTICLE_MIN_LIFE = 0.4;
export const PARTICLE_LIFE_RANGE = 0.2;
export const PARTICLE_MAX_LIFE = 0.6;
export const PARTICLE_MIN_SIZE = 3;
export const PARTICLE_SIZE_RANGE = 3;

// ===== Fall =====
export const FALL_DURATION_PER_ROW = 0.15;
export const FALL_BOUNCE_OVERSHOOT = 0.06;     // fraction of fall distance
export const FALL_BOUNCE_SETTLE_DURATION = 0.08;
export const FALL_COLUMN_STAGGER = 0.02;       // s offset per column

// ===== Spawn =====
export const SPAWN_FALL_DURATION_PER_ROW = 0.15;
export const SPAWN_LAND_BOUNCE_DURATION = 0.12;
export const SPAWN_LAND_BOUNCE_SCALE = 1.1;

// ===== Idle pulse =====
export const IDLE_PULSE_PERIOD = 2.0;     // s
export const IDLE_PULSE_MIN = 0.98;
export const IDLE_PULSE_MAX = 1.0;
export const IDLE_PULSE_PHASE_PER_GEM = 0.4;

// ===== Team visuals =====
export const TEAM_LERP_SPEED = 8.0;       // exp-decay speed for x/y/scale/opacity
export const TEAM_DEATH_LERP_SPEED = 4.0; // slower lerp during death fade
export const TEAM_HP_DRAIN_SPEED = 5.0;   // exp-decay speed for HP bar drain

export const ATTACK_LUNGE_DURATION = 0.32;     // s — exported as ATTACK_DURATION too
export const ATTACK_LUNGE_AMPLITUDE = 28;      // px forward thrust
export const ATTACK_LUNGE_PUNCH_FRACTION = 0.35; // fraction of duration spent punching out

export const HURT_FLASH_DURATION = 0.18;
export const HURT_SHAKE_AMPLITUDE = 10;

export const HITSTOP_DURATION = 0.08;

export const BOUNCE_DURATION = 0.4;       // s
export const BOUNCE_AMPLITUDE = 10;       // px

// ===== Match-cascade timing =====
export const MATCH_STAGGER_MS = 130;      // ms between staggered match visuals
export const ATTACK_PEAK_FRACTION = 0.6;  // when in lunge to apply damage / spawn popup
export const POPUP_READ_BUFFER_MS = 150;  // extra wait before applying-damage timer fires
export const DEATH_ANIM_WAIT = 0.6;       // s — wait for death fade before reorganizing

// ===== Damage popups =====
export const POPUP_BASE_FONT = 36;
export const POPUP_CRIT_FONT = 44;
export const POPUP_SUPERCRIT_FONT = 50;
export const POPUP_HEAL_FONT = 40;
export const POPUP_POWER_FONT = 44;
export const POPUP_POWER_BURST_FONT = 42;
export const POPUP_ENEMY_FONT = 36;

export const POPUP_COLOR_NORMAL = '#FFFFFF';
export const POPUP_COLOR_CRIT = '#FFD700';
export const POPUP_COLOR_SUPERCRIT = '#FF9030';
export const POPUP_COLOR_HEAL = '#50FF50';
export const POPUP_COLOR_POWER = '#FF9030';
export const POPUP_COLOR_ENEMY_DAMAGE = '#FF6060';
export const POPUP_COLOR_DOT = '#AA44FF';
export const POPUP_DOT_FONT = 32;

// ===== Crit thresholds (gem count) =====
export const CRIT_GEM_COUNT = 4;
export const SUPERCRIT_GEM_COUNT = 5;

// ===== Score =====
export const SCORE_PER_MATCHED_GEM = 50;
