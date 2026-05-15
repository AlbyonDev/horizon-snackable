/**
 * Constants.ts — All tuning values.
 *
 * Rules:
 *   - ZERO imports from sibling files
 *   - Magic numbers belong here, not in gameplay code
 */

// ─── Debug ────────────────────────────────────────────────────────────────────
/** Starting gems granted on session start. Set to 0 for normal play. */
export const INITIAL_RESOURCES = 10000;

// ─── Click ────────────────────────────────────────────────────────────────────
export const BASE_CLICK_VALUE = 1;

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
