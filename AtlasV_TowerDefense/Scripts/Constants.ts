/**
 * Constants.ts — All tuning values, grid dimensions, timing, and economy constants.
 *
 * No imports from sibling files — zero local dependencies.
 * Add named constants here instead of magic numbers anywhere in the codebase.
 * Also exports hexColor() utility for converting CSS hex strings to normalized RGB.
 */

// ─── Grid ─────────────────────────────────────────────────────────────────────

export const GRID_COLS = 7;
export const GRID_ROWS = 14;
export const CELL_WIDTH  = 1; // world units per cell along X axis (rows)
export const CELL_HEIGHT = 1; // world units per cell along Z axis (cols)

// col → Z axis (horizontal, left/right on screen)
// row → X axis (vertical, top/bottom on screen)
export const GRID_ORIGIN_X = -((GRID_ROWS - 1) / 2) * CELL_WIDTH;  // top row X
export const GRID_ORIGIN_Z = -((GRID_COLS - 1) / 2) * CELL_HEIGHT; // left col Z

// Y position for ground-level entities (towers, enemies, tiles)
export const GROUND_Y = 0;

// ─── Wave timing ──────────────────────────────────────────────────────────────

export const WAVE_BUILD_DURATION   = 5;    // seconds of build phase before wave starts
export const WAVE_CLEAR_DURATION   = 0.5;  // seconds between last kill and next build phase
export const ENEMY_SPAWN_INTERVAL  = 0.75; // seconds between enemy spawns within a wave

// ─── Economy ──────────────────────────────────────────────────────────────────

export const TOTAL_LEVELS = 6; // number of procedurally generated levels per run

export const START_GOLD  = 120;
export const START_LIVES = 10;
export const WAVE_BONUS_GOLD = 15; // flat gold awarded at end of each wave
export const INCOME_RATE = 0.15;   // 15% of gold on hand → bonus at wave end

// ─── Enemy scaling ────────────────────────────────────────────────────────────

export const HP_SCALE_PER_WAVE = 0.15; // HP multiplier = 1 + waveIndex * HP_SCALE_PER_WAVE

// ─── Economy (continued) ──────────────────────────────────────────────────────

export const SELL_RATIO = 0.6; // fraction of totalInvested refunded on sell

// ─── Projectile ───────────────────────────────────────────────────────────────

export const PARTICLE_POOL_SIZE    = 100;
export const PROJECTILE_HIT_RADIUS = 0.3; // world units — distance to trigger hit detection
export const PROJECTILE_PARTICLE_INTERVAL = 0.015;
export const PROJECTILE_SCALE      = 2; // world units — visual size of spawned projectiles
export const PROJECTILE_POOL_SIZE  = 30;   // pre-spawned projectile instances
export const PROJECTILE_POOL_Y     = -100; // off-screen park position Y
export const HEALTHBAR_POOL_SIZE   = 30;   // pre-spawned health bar instances
export const HEALTHBAR_OFFSET_X    = 0.75; // world units ahead of enemy (X axis)
export const HEALTHBAR_WIDTH       = 0.4;  // world units (matches cell size)
export const HEALTHBAR_HEIGHT      = 0.06; // world units (thin bar)
export const HEALTHBAR_DEPTH       = 0.02; // world units (flat)

// ─── Theme colors ────────────────────────────────────────────────────────────

export const GROUND_COLOR    = '#2d5a27'; // vibrant grass green
export const PATH_CELL_COLOR = '#c4823a'; // warm sandy earth

/** Convert a CSS hex color string to normalized { r, g, b } in [0, 1]. */
export function hexColor(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

// ─── Tower Destruction Animation ──────────────────────────────────────────────

export const TOWER_DESTROY_FLIGHT_DURATION = 1.0;    // seconds for meteor projectile to reach tower
export const TOWER_DESTROY_SHAKE_DURATION  = 0.3;    // seconds of tower shaking on impact
export const TOWER_DESTROY_SCALE_DURATION  = 0.4;    // seconds for tower to scale to 0
export const TOWER_DESTROY_SPAWN_OFFSET_X  = 8;      // X offset from tower where rock spawns (positive = top of screen in top-down view)
export const TOWER_DESTROY_PROJECTILE_SCALE = 2.5;   // visual scale of the rock projectile (small thrown rock feel)

// ─── Floating Text ────────────────────────────────────────────────────────────
export const FLOATING_TEXT_POOL_SIZE = 10;   // pre-spawned floating text instances
export const FLOATING_TEXT_PARK_Y    = -100; // off-screen park position Y
