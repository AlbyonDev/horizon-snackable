/**
 * SYS-23-GIFTS: Lure Definitions & Attraction Tables
 * Lures are the player's strategic tool — they determine which fish appear
 * and their initial emotional state when approaching.
 *
 * Starting set: Red Spinner (default), Gold Teardrop, Feather Fly
 * Unlockable: Night Lure, Shell Hook, Bare Hook
 *
 * NOTE: attractedFish arrays only contain implemented character IDs.
 * Add new character IDs here when they are registered in CharacterRegistry.
 */

import { DriftState } from './Types';
import type { LureDefinition } from './Types';

// === No-Lure Option ===

export const LURE_NONE: LureDefinition = {
  id: 'none',
  name: 'No Lure',
  description: 'Fish without bait. Any fish may come — or none at all.',
  attractedFish: ['nereia'], // All fish can still appear
  initialDrift: DriftState.None,
  driftModifiers: {},
  isGifted: false,
};

// === Starting Lures ===

export const LURE_RED_SPINNER: LureDefinition = {
  id: 'red_spinner',
  name: 'Red Spinner',
  description: 'A cheerful red spinner. Attracts all fish — reliable but unspecific.',
  attractedFish: ['nereia'], // Add new character IDs when implemented
  initialDrift: DriftState.None,
  driftModifiers: {
    nereia: DriftState.Wary,  // Nereia dislikes the Red Spinner
  },
  isGifted: false,
};

export const LURE_GOLD_TEARDROP: LureDefinition = {
  id: 'gold_teardrop',
  name: 'Gold Teardrop',
  description: 'Gleaming gold, shaped like a tear. Cautious fish find it irresistible.',
  attractedFish: ['nereia'], // Add new character IDs when implemented
  initialDrift: DriftState.Warm,
  driftModifiers: {
    nereia: DriftState.Warm,
  },
  isGifted: false,
};

export const LURE_FEATHER_FLY: LureDefinition = {
  id: 'feather_fly',
  name: 'Feather Fly',
  description: 'A delicate feather on a hook. Surface-dwellers can\'t resist the dance.',
  attractedFish: ['nereia'], // Add new character IDs when implemented
  initialDrift: DriftState.Charmed,
  driftModifiers: {},
  isGifted: false,
};

// === Unlockable Lures (for future milestones) ===

export const LURE_NIGHT_LURE: LureDefinition = {
  id: 'night_lure',
  name: 'Night Lure',
  description: 'A dark lure that glows faintly. Deep dwellers and hidden fish notice it.',
  attractedFish: ['nereia'], // Add new character IDs when implemented
  initialDrift: DriftState.Troubled,
  driftModifiers: {},
  isGifted: false,
};

export const LURE_SHELL_HOOK: LureDefinition = {
  id: 'shell_hook',
  name: 'Shell Hook',
  description: 'A hook adorned with a freshwater shell. Gifted by a generous catfish.',
  attractedFish: ['nereia'],
  initialDrift: DriftState.Charmed,
  driftModifiers: {
    nereia: DriftState.Charmed,
  },
  isGifted: true,
  giftedBy: 'merlan', // Future character reference
};

export const LURE_BARE_HOOK: LureDefinition = {
  id: 'bare_hook',
  name: 'Bare Hook',
  description: 'Nothing on it. A statement of vulnerability — or carelessness.',
  attractedFish: ['nereia'], // Add new character IDs when implemented
  initialDrift: DriftState.Troubled,
  driftModifiers: {},
  isGifted: false,
};

// === All Lures Registry ===

export const ALL_LURES: Record<string, LureDefinition> = {
  none: LURE_NONE,
  red_spinner: LURE_RED_SPINNER,
  gold_teardrop: LURE_GOLD_TEARDROP,
  feather_fly: LURE_FEATHER_FLY,
  night_lure: LURE_NIGHT_LURE,
  shell_hook: LURE_SHELL_HOOK,
  bare_hook: LURE_BARE_HOOK,
};

// === Starting Lure IDs ===
export const STARTING_LURES: string[] = ['red_spinner', 'gold_teardrop', 'feather_fly'];
export const DEFAULT_LURE = 'red_spinner';

// === Fish Attraction Resolution ===

/**
 * Given a lure, determine which fish will appear.
 * Currently returns the first attracted fish that matches the available roster.
 * In the full game, this would use weighted random from the attracted pool.
 */
export function resolveFishForLure(lureId: string, availableFish: string[]): string {
  const lure = ALL_LURES[lureId];
  if (!lure) return availableFish[0] || 'nereia';

  // Find intersection of lure-attracted fish and available fish
  const candidates = lure.attractedFish.filter(f => availableFish.includes(f));

  if (candidates.length === 0) {
    // Default fallback: any available fish
    return availableFish[0] || 'nereia';
  }

  // For now, return the first candidate (later: weighted random)
  return candidates[0];
}

/**
 * Get the initial drift state for a specific fish arriving via a specific lure.
 * Uses per-fish override if defined, otherwise the lure's default.
 */
export function getInitialDrift(lureId: string, fishId: string): DriftState {
  const lure = ALL_LURES[lureId];
  if (!lure) return DriftState.None;

  // Check per-fish override first
  const override = lure.driftModifiers[fishId];
  if (override) return override;

  // Fall back to lure's default initial drift
  return lure.initialDrift;
}
