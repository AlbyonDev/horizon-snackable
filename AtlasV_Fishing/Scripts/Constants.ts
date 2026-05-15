// ─── Play Area ────────────────────────────────────────────────────────────────
// Portrait mobile: 9 × 16 world units, centered at origin (Y-up).
export const HALF_W = 4.5;

// ─── Water ────────────────────────────────────────────────────────────────────
export const WATER_SURFACE_Y = 4.5;

// ─── Fish spawn bounds (world X) ─────────────────────────────────────────────
export const FISH_LEFT  = -5.5;
export const FISH_RIGHT =  5.5;

// ─── Hook idle position (tip of rod) ─────────────────────────────────────────
export const TIP_X       = -2.85;
export const TIP_Y       =  7.15;
export const HOOK_IDLE_X =  TIP_X;
export const HOOK_IDLE_Y =  WATER_SURFACE_Y + 0.2;
export const BAIT_IDLE_X =  HOOK_IDLE_X;
export const BAIT_IDLE_Y =  HOOK_IDLE_Y;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLOR_LINE       = { r: 0.95, g: 0.95, b: 0.82 };
export const COLOR_LINE_WATER = { r: 0.78, g: 0.90, b: 1.00 };
export const COLOR_BUBBLE     = { r: 0.85, g: 0.95, b: 1.00 };

// ─── Cast physics ─────────────────────────────────────────────────────────────
export const CAST_CENTER_VX      =  2.5;   // base rightward velocity; lands hook near center from TIP_X=-2.5
export const CAST_VX_RANDOM      =  1.0;   // ± random spread applied at cast moment
export const CAST_VX_MIN         =  1.2;   // absolute floor so the arc never goes straight up
export const CAST_VY             = 12.0;   // initial upward velocity on cast
export const CAST_GRAVITY        = -16.0;  // gravity applied during cast arc
 
// ─── Dive physics ─────────────────────────────────────────────────────────────
export const DIVE_SPEED          =  6.0;   // terminal descent speed once arc ends (units/s)
export const DIVE_MAX_DEPTH      =  15.0;   // default (line level 0); runtime uses lineDepthAtLevel
export const DIVE_SWIPE_FORCE    = 18.0;   // X velocity impulse per swipe unit (screen-space → world)
export const DIVE_X_DRAG         =  1.8;   // horizontal drag during dive
export const DIVE_BOUNCE         =  0.55;  // velocity restitution on wall bounce (0=dead, 1=perfect)
export const DIVE_CENTER_PULL    =  1.2;   // gentle spring force pulling hook toward center X
export const DIVE_SWIPE_MAX_SPEED = 6.0;  // max horizontal hook speed from swipe input (units/s)
export const HOOK_MAX_FISH       = 3;      // default (hook level 0); runtime uses HOOK_MAX_FISH_LEVELS
export const HOOK_COLLECT_RADIUS = 0.9;    // collision radius multiplier (× fish size)

// ─── Hook line ────────────────────────────────────────────────────────────────
export const LINE_THICKNESS = 0.04;        // X/Z scale of the line mesh cube

// ─── Surface physics ─────────────────────────────────────────────────────────
export const SURFACE_SPEED       = 30.0;  // units/s upward during Surfacing (max, at deep dives)

// ─── Launch physics (reward anim) ────────────────────────────────────────────
export const LAUNCH_VY_MIN       = 12.0;  // min upward velocity per fish (max scale)
export const LAUNCH_VY_MAX       = 18.0;  // max upward velocity per fish (max scale)
export const LAUNCH_VX_SPREAD    =  4.0;  // ± horizontal spread
export const LAUNCH_GRAVITY      = -9.0;  // gravity applied during launch arc
export const LAUNCH_STAGGER      =  0.08; // seconds between each fish launch
export const LAUNCH_EXIT_Y       = 10.0;  // Y above which a fish is considered "collected" (apex-or-Y, whichever first)
export const LAUNCH_ANCHOR_X     =  0.0;  // X where the hook docks at reeling-end and fish are launched from

// Hook spring-back during Launching — pseudo-physics return to idle position
export const HOOK_RETURN_STIFFNESS = 18.0; // spring constant pulling hook toward idle
export const HOOK_RETURN_DAMPING   =  4.5; // damping coefficient (lower = more bounce)
export const LAUNCH_TIMEOUT      =  4.0;  // max seconds before AllFishCollected fires regardless

// ─── Depth-based intensity scaling ───────────────────────────────────────────
// Surfacing speed and launch velocity scale with how deep the dive went.
// Shallow dives feel gentle; deep dives (with line upgrades) feel violent.
export const DEPTH_SCALE_MIN     =  0.4;  // intensity factor at zero depth
export const DEPTH_SCALE_FULL_AT = 40.0;  // dive depth (units) at which factor reaches 1.0

// ─── Camera ───────────────────────────────────────────────────────────────────
export const HALF_SCREEN_WORLD_HEIGHT  = 8.0;  // half-height of viewport in world units
export const CAMERA_SCROLL_LERP_SPEED  = 4.0;  // how quickly camera lerps to scroll target (units/s factor)

// ─── Fish behavior ────────────────────────────────────────────────────────────
export const FISH_PAUSE_DUR_MIN = 1.2;  // min pause duration between swim targets (s)
export const FISH_PAUSE_DUR_MAX = 3.2;  // max pause duration between swim targets (s)
export const FISH_BOB_AMP       = 0.06; // vertical bob amplitude while swimming (units)
export const FISH_BOB_FREQ      = 0.55; // vertical bob frequency (cycles/s)
export const FISH_MIN_MOVE_DIST = 2.5;  // minimum distance to new swim target (prevents tiny hops)

// ─── Timing ───────────────────────────────────────────────────────────────────
export const RESET_DELAY  = 0.5;

// ─── Fish pool ────────────────────────────────────────────────────────────────
// Pool counts per rarity (× number of species per rarity = total entities)
// common: 6 species × 5 = 30  rare: 6 × 3 = 18  legendary: 6 × 1 = 6  → 54 total
export const POOL_COUNT_COMMON    = 8;
export const POOL_COUNT_RARE      = 5;
export const POOL_COUNT_LEGENDARY = 2;
export const POOL_PARK_Y          = 1000; // world Y used to park off-screen pool entities

// Slot-based spawning — non-linear spacing.
// Slots start dense just under the water surface and stretch out with depth:
//   - depth = 0 (surface)     → step = POOL_SLOT_STEP_MIN  (1 m, dense)
//   - depth ≥ POOL_SLOT_STEP_RAMP_DEPTH → step = POOL_SLOT_STEP_MAX (8 m, sparse)
//   - linear lerp between, then constant
// This keeps early-game fish reachable (no waiting 8 m for first catch) and
// also fills the visible idle/title screen, while giving mid/late-game enough
// breathing room between strata to swipe and aim.
export const POOL_SLOT_STEP_MIN        = 1.0;
export const POOL_SLOT_STEP_MAX        = 8.0;
export const POOL_SLOT_STEP_RAMP_DEPTH = 15.0;
export const POOL_SLOT_SPREAD          = 28.0; // total Y range below camBottom covered by slots (world units)
/**
 * How far a hooked-slot's fish can drift from its assigned slotY before the slot
 * is considered "vacated" (even if the fish is still within the global buffer).
 * Prevents the bug where a fish spawned far above the camera holds its slot for
 * 5–8 seconds while it drifts toward bufferTop, starving downstream spawns.
 */
export const POOL_SLOT_DRIFT_MAX  = 6.0;
export const POOL_SLOT_TOLERANCE  = 1.5;  // minimum vertical distance between active fish (prevents stacking)
export const POOL_BENCH_MARGIN    = 8.0;  // extra Y below the slot zone when parking a benched fish
export const POOL_SCALE_VARIANCE  = 0.12; // ± scale randomisation on re-activation (e.g. 0.12 → ±12%)
/**
 * Compresses each species' [sizeMin, sizeMax] range toward its mean.
 * 1.0 = full range as defined in FishDefs.ts; 0.0 = always the mean.
 * Lowering this makes small fish less tiny and big fish less huge.
 */
export const FISH_SIZE_RANGE_COMPRESSION = 0.6;

// ─── Bubbles ─────────────────────────────────────────────────────────────────
export const BUBBLE_POOL_SIZE       = 40;
export const BUBBLE_RISE_SPEED_MIN  = 0.22;
export const BUBBLE_RISE_SPEED_MAX  = 0.65;
export const BUBBLE_SCALE_MIN       = 0.04;
export const BUBBLE_SCALE_MAX       = 0.15;
export const BUBBLE_INTERVAL_MIN    = 8.0;
export const BUBBLE_INTERVAL_MAX    = 15.0;
export const BUBBLE_LIFETIME_MIN    = 2.5;
export const BUBBLE_LIFETIME_MAX    = 6.5;
export const BUBBLE_SPAWN_OFFSET_X  = 0.35;
export const BUBBLE_SPAWN_OFFSET_Y  = 0.10;
export const BUBBLE_SPAWN_MIN_Y     = -40.0; // lower Y bound for bubble initial position
export const BUBBLE_DRIFT_FREQ_MIN  = 1.2;   // horizontal wobble frequency range (cycles/s)
export const BUBBLE_DRIFT_FREQ_MAX  = 2.8;
export const BUBBLE_DRIFT_AMP_MIN   = 0.04;  // horizontal wobble amplitude range (units)
export const BUBBLE_DRIFT_AMP_MAX   = 0.10;
export const BUBBLE_BREATH_FREQ_MIN = 1.8;   // scale "breathing" frequency range (cycles/s)
export const BUBBLE_BREATH_FREQ_MAX = 3.2;
export const BUBBLE_ALPHA_FREQ_MIN  = 0.8;   // alpha oscillation frequency range (cycles/s)
export const BUBBLE_ALPHA_FREQ_MAX  = 1.6;

// ─── Hook bubble trail ────────────────────────────────────────────────────────
export const HOOK_BUBBLE_INTERVAL_DIVE    = 0.12;  // seconds between bubbles while diving
export const HOOK_BUBBLE_INTERVAL_SURFACE = 0.07;  // faster during surfacing for turbulence
export const HOOK_BUBBLE_X_JITTER         = 0.3;   // ± random X offset for natural look

// ─── Flash ────────────────────────────────────────────────────────────────────
export const FLASH_DUR = 0.22;

// Brief hit-stop after the dive-end flash, before the hook starts surfacing.
export const SURFACE_FREEZE_MS = 180;

// ─── Upgrades ─────────────────────────────────────────────────────────────────
// All upgrade formulas use level n (1-based, n=0 means no upgrade bought yet).

export const LINE_MAX_LEVEL  = 100;
export const HOOK_MAX_LEVEL  =  90;

/** Max dive depth at upgrade level n. depth(0)=15, each level adds 16 (one full screen). */
export function lineDepthAtLevel(n: number): number {
  return 15 + n * 16;
}

/** Max fish per run at hook upgrade level n. fish(0)=1, fish(90)=90. */
export function hookMaxFishAtLevel(n: number): number {
  return n + 1;
}

/** Gold cost to buy upgrade level n (1-based). cost(1)=8g, cost(100)≈50k. */
export function upgradeCost(n: number): number {
  return Math.floor(8 * Math.pow(n, 1.9));
}

// ─── Gold coins animation ─────────────────────────────────────────────────────
export const COIN_POOL_SIZE     = 60;   // max simultaneous coin sprites in the animator
export const TEXT_POOL_SIZE     = 10;   // max simultaneous gold-value text sprites
export const COIN_ROT_SPEED_MIN = 280;  // coin spin speed range (deg/s)
export const COIN_ROT_SPEED_MAX = 600;

// ─── GoldCoins Canvas (GoldCoinsAnimator entity) ──────────────────────────────
// Canvas design is 600×600 px (square). The entity is placed at
// (0, CANVAS_CENTER_WORLD_Y, -0.1) and scaled uniformly to CANVAS_ENTITY_SCALE.
// Tune CANVAS_ENTITY_SCALE until the canvas visually covers the above-water area.
export const CANVAS_SIZE           = 600;   // design px
export const CANVAS_WORLD_SPAN     = 12.0;  // world units the canvas covers on each axis
export const CANVAS_CENTER_WORLD_Y = 7.0;   // world Y at canvas center (covers ~Y 1–13)
export const CANVAS_ENTITY_SCALE   = 12.0;  // uniform entity scale (1 unit ≈ 1 world unit — tune me)

/**
 * Convert a world position to canvas TranslateTransform (x, y) for a 50×50 coin icon.
 * The returned offset places the icon's visual center at (wx, wy) in world space.
 * Mirrors the XAML coin Image Width/Height="50" — update both if icon size changes.
 */
export function worldToCanvas(wx: number, wy: number): { x: number; y: number } {
  const scale = CANVAS_SIZE / CANVAS_WORLD_SPAN;
  return {
    x:  wx * scale + CANVAS_SIZE / 2 - 25,
    y: -(wy - CANVAS_CENTER_WORLD_Y) * scale + CANVAS_SIZE / 2 - 25,
  };
}

