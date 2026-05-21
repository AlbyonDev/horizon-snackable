// ── Game Rules ───────────────────────────────────────────────────────────────

export const TOTAL_SHOTS       = 6;
export const COMBO_THRESHOLD   = 3;    // consecutive goals before multiplier kicks in
export const MAX_COMBO_MULTI   = 6;

// ── Scoring ──────────────────────────────────────────────────────────────────

export const PTS_GOAL          = 100;
export const PTS_CORNER_MULTI  = 1.8;  // corner: |ballX| > seuil_X AND ballY > seuil_Y
export const PTS_CHIP_MULTI    = 1.5;  // chip:   ballY > seuil_Y AND |ballX| <= seuil_X
export const CORNER_THRESHOLD  = 0.65; // |ballX| > GOAL_HALF_W * this → lateral zone
export const HEIGHT_THRESHOLD  = 0.72; // ballY  > GOAL_HEIGHT  * this → high zone (~1.73m)

// ── Ball Physics ─────────────────────────────────────────────────────────────

export const BALL_RADIUS       = 0.28;
export const BALL_START_X      = 0;
export const BALL_START_Y      = 0.28; // resting on ground
export const BALL_START_Z      = 9.0;  // penalty spot

export const BALL_SPEED_BASE   = 0.12; // minimum forward speed
export const BALL_SPEED_POWER  = 0.38; // added per unit of swipe power
export const BALL_SIDE_FACTOR  = 1.1;  // lateral velocity multiplier
export const BALL_ARC_BASE     = 0.08; // minimum upward velocity
export const BALL_ARC_POWER    = 0.22; // added per unit of swipe power
export const BALL_GRAVITY      = 0.012;

export const BALL_SPIN_FORWARD = 4.0;  // visual spin speed (forward)
export const BALL_SPIN_SIDE    = 2.0;  // visual spin speed (lateral)

// Ball bounce factors
export const BOUNCE_VY_FAR     = 0.5;  // vertical bounce when far from goal
export const BOUNCE_DAMP_FAR   = 0.85; // horizontal damp when far from goal
export const BOUNCE_VY_NEAR    = 0.4;
export const BOUNCE_DAMP_NEAR  = 0.8;
export const BALL_STOP_SPEED   = 0.015; // total vel below this = stopped

// Result state bounce
export const RESULT_BOUNCE_VY  = 0.45;
export const RESULT_BOUNCE_XZ  = 0.82;
export const NET_BOUNCE_DAMP   = 0.4;

// Save deflection
export const SAVE_BOUNCE_Z     = 0.5;
export const SAVE_BOUNCE_Z_MIN = 0.08;
export const SAVE_BOUNCE_X     = -0.4;
export const SAVE_BOUNCE_VY    = 0.1;

// Post deflection
export const POST_BOUNCE_X     = -0.6;
export const POST_BOUNCE_Z     = -0.4;

// ── Goal Geometry ────────────────────────────────────────────────────────────

export const GOAL_WIDTH        = 6.2;  // posts at ±3.1 m
export const GOAL_HEIGHT       = 2.4;
export const GOAL_DEPTH        = 1.4;
export const GOAL_POST_RADIUS  = 0.07;
export const GOAL_HALF_W       = GOAL_WIDTH / 2;

// Combined radius used for post / crossbar collision (post surface + ball surface)
export const POST_HIT_RADIUS   = GOAL_POST_RADIUS + 0.28; // BALL_RADIUS = 0.28

// ── Goalkeeper ───────────────────────────────────────────────────────────────

export const GK_START_Z        = 0.6;  // standing distance in front of goal line
export const GK_SPEED          = 0.055;
export const GK_IDLE_SPEED     = 0.018;
export const GK_REACTION_MS    = 200;
export const GK_DIVE_CHANCE    = 0.75;
export const GK_DIVE_SPEED     = 1.8;  // diveT increment per second
export const GK_DIVE_LATERAL   = 1.6;  // how far the dive moves sideways
export const GK_DIVE_HEIGHT    = 0.5;  // peak vertical offset during dive

// GK collision box (standing)
// Sprite expected: 1.25 m wide, pivot at feet → top at 1.85 m
export const GK_HALF_W         = 0.625; // half the sprite width
export const GK_STAND_H        = 1.85; // full sprite height (pivot at Y=0)
export const GK_FOOT_Y         = 0.10; // ignore the feet/ground fringe below this

// GK collision box (diving) — expands with diveT
// Sprite expected: body stretches to ~1.9 m wide and ~1.1 m tall at full dive
export const GK_DIVE_HALF_W_BASE  = 0.55; // half-width at diveT=0 (arms out, not yet extended)
export const GK_DIVE_HALF_W_GROW  = 0.40; // additional half-width at diveT=1  → total 0.95 m half, 1.9 m wide
export const GK_DIVE_H_BASE       = 0.55; // hitbox height at diveT=0
export const GK_DIVE_H_GROW       = 0.30; // additional height at diveT=1       → total 0.85 m tall

// ── Swipe Input (normalised 0..1 screen coordinates) ─────────────────────────

export const SWIPE_DEAD_ZONE    = 0.02; // minimum upward swipe to fire
export const SWIPE_POWER_RANGE  = 0.25; // vertical distance for full power
export const SWIPE_SIDE_RANGE   = 0.50; // horizontal distance for full side aim

// ── Timing ───────────────────────────────────────────────────────────────────

export const NEXT_SHOT_GOAL_MS = 1500;
export const NEXT_SHOT_SAVE_MS = 1300;
export const NEXT_SHOT_POST_MS = 1300;
export const NEXT_SHOT_MISS_MS = 1000;
export const GAME_OVER_DELAY   = 400;

// ── Camera ───────────────────────────────────────────────────────────────────

export const CAMERA_FOV        = 58;

// ── Camera Shake ─────────────────────────────────────────────────────────────

export const SHAKE_GOAL_INTENSITY   = 0.25;  // world units max offset
export const SHAKE_GOAL_DURATION    = 0.5;   // seconds
export const SHAKE_SAVE_INTENSITY   = 0.12;
export const SHAKE_SAVE_DURATION    = 0.3;
export const SHAKE_POST_INTENSITY   = 0.10;
export const SHAKE_POST_DURATION    = 0.25;
export const SHAKE_MISS_INTENSITY   = 0.05;
export const SHAKE_MISS_DURATION    = 0.15;

// ── VFX Particles ─────────────────────────────────────────────────────────────

export const VFX_POOL_SIZE          = 60;    // total particle entities pre-spawned
export const VFX_GRAVITY            = 4.0;   // downward accel (world units/s²)

// Goal confetti burst
export const VFX_GOAL_COUNT         = 20;
export const VFX_GOAL_SPEED_MIN     = 2.5;
export const VFX_GOAL_SPEED_MAX     = 5.0;
export const VFX_GOAL_LIFE          = 0.9;
export const VFX_GOAL_SCALE         = 0.12;

// Save particles
export const VFX_SAVE_COUNT         = 10;
export const VFX_SAVE_SPEED_MIN     = 1.5;
export const VFX_SAVE_SPEED_MAX     = 3.0;
export const VFX_SAVE_LIFE          = 0.55;
export const VFX_SAVE_SCALE         = 0.10;

// Post sparks
export const VFX_POST_COUNT         = 8;
export const VFX_POST_SPEED_MIN     = 2.0;
export const VFX_POST_SPEED_MAX     = 4.0;
export const VFX_POST_LIFE          = 0.45;
export const VFX_POST_SCALE         = 0.08;

// Miss dust puff
export const VFX_MISS_COUNT         = 6;
export const VFX_MISS_SPEED_MIN     = 0.6;
export const VFX_MISS_SPEED_MAX     = 1.4;
export const VFX_MISS_LIFE          = 0.5;
export const VFX_MISS_SCALE         = 0.14;

// ── Ball Trail ────────────────────────────────────────────────────────────────

export const TRAIL_POOL_SIZE       = 24;   // total dot entities pre-spawned
export const TRAIL_EMIT_INTERVAL   = 0.016; // seconds between dot spawns (~20 dots/s)
export const TRAIL_DOT_LIFE        = 0.35; // seconds before a dot fully fades out

// ── Ball Idle Animation ───────────────────────────────────────────────────────

export const IDLE_PAUSE_DURATION  = 0.1;  // seconds of stillness before bounces start
export const IDLE_BOUNCE_COUNT    = 3;    // number of bounces per cycle
export const IDLE_BOUNCE_HEIGHT_0 = 0.55; // peak height of first bounce (world units)
export const IDLE_BOUNCE_DECAY    = 0.48; // height multiplier per successive bounce
export const IDLE_HALF_PERIOD_0   = 0.30; // half-period (up+down) of first bounce (s)
export const IDLE_HALF_PERIOD_DECAY = 0.72; // half-period multiplier per bounce (slows down)
export const IDLE_SQUASH_0        = 0.60; // Y scale at impact for first bounce
export const IDLE_SQUASH_DECAY    = 0.80; // squash intensity multiplier per bounce
export const IDLE_STRETCH_0       = 1.18; // Y scale at peak for first bounce
export const IDLE_STRETCH_DECAY   = 0.85; // stretch intensity multiplier per bounce
export const IDLE_SQUASH_FRAMES   = 0.06; // duration (s) of ground-contact squash flat

// ── Star Rating Thresholds ────────────────────────────────────────────────────

export const STARS_3_ACCURACY    = 0.80;  // accuracy ≥ this → 3 stars
export const STARS_2_ACCURACY    = 0.50;  // accuracy ≥ this → 2 stars

// ── UI Confetti (full-screen overlay, separate from 3D VFX particle pool) ─────

export const CONFETTI_GOAL_COUNT = 50;    // pieces spawned on a goal
