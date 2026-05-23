/**
 * Constants.ts — All tuning values.
 *
 * Rules:
 *   - ZERO imports from sibling files
 *   - Magic numbers belong here, not in gameplay code
 */

// ─── Canvas (matches Viewbox inner grids in all XAML) ─────────────────────────
export const CANVAS_W = 480;
export const CANVAS_H = 850;
/** Expected device screen aspect (mobile 9:16). Used for letterbox correction. */
export const SCREEN_ASPECT = 9 / 16;

// ─── Title screen ─────────────────────────────────────────────────────────────
export const TITLE_FADE_DURATION_MS = 800;

// ─── Debug ────────────────────────────────────────────────────────────────────
/** Starting gems granted on session start. Set to 0 for normal play. */
export const INITIAL_RESOURCES = 0;

// ─── Click ────────────────────────────────────────────────────────────────────
export const BASE_CLICK_VALUE = 1;
/** Seconds for ALL auto-cursors combined to complete one cycle (split among owned cursors). */
export const CURSOR_CYCLE_TIME = 2;

// ─── Passive Income ───────────────────────────────────────────────────────────
export const TICK_INTERVAL = 0.1;

// ─── Generator Cost Formula ───────────────────────────────────────────────────
export const DEFAULT_COST_MULTIPLIER = 1.15;

// ─── Crit ─────────────────────────────────────────────────────────────────────
export const BASE_CRIT_CHANCE = 0.05;
export const BASE_CRIT_MULTIPLIER = 2.5;

// ─── Frenzy ───────────────────────────────────────────────────────────────────
export const FRENZY_TAP_THRESHOLD = 30;
export const FRENZY_DURATION = 10;
export const FRENZY_MULTIPLIER = 2;

// ─── Interest ─────────────────────────────────────────────────────────────────
export const BASE_INTEREST_RATE = 0.01;
export const BASE_INTEREST_INTERVAL = 30;

// ─── Vault ────────────────────────────────────────────────────────────────────
export const BASE_VAULT_DURATION = 30;
export const BASE_VAULT_BONUS = 1.5;
/** Fraction of current gold sealed when player triggers vault.lock. */
export const VAULT_LOCK_FRACTION = 0.5;

// ─── Bonus Gem ────────────────────────────────────────────────────────────────
/** Reward multiplier when the bonus mini-gem is tapped (× current tap value). */
export const BONUS_GEM_MULTIPLIER = 10;
/** Idle gap between bonus-gem spawns (seconds, uniform random). */
export const BONUS_GEM_SPAWN_DELAY_MIN = 5;
export const BONUS_GEM_SPAWN_DELAY_MAX = 15;
/** How long a bonus gem stays on screen before despawning (seconds, uniform random). */
export const BONUS_GEM_LIFETIME_MIN = 8;
export const BONUS_GEM_LIFETIME_MAX = 12;
/** Bonus-gem on-canvas size (square hit box, 480×850 canvas units). */
export const BONUS_GEM_SIZE = 70;
/** Row-1 spawn rect in the 480×850 canvas (with margin so the sprite isn't clipped). */
export const BONUS_GEM_SPAWN_X_MIN = 60;
export const BONUS_GEM_SPAWN_X_MAX = 420;
export const BONUS_GEM_SPAWN_Y_MIN = 160;
export const BONUS_GEM_SPAWN_Y_MAX = 470;
