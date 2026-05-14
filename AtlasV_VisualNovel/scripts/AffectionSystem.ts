/**
 * SYS-01-AFFECTION: Per-fish hidden affection meter.
 *
 * Single linear meter per character — no tiers, no floor locks.
 * Two thresholds matter:
 *   - Catch trigger: usually set via flag (`<id>.catch_available`) by the
 *     dialogue itself, then resolved by the catch sequence flow.
 *   - Drift-away threshold: when affection drops to or below this value,
 *     the character is treated as having abandoned the player and the
 *     drift-away ending fires.
 *
 * Rules:
 *   - Single action delta capped to ±30
 *   - Value clamped to [0, ceiling] (default ceiling = AFFECTION_MAX)
 */

import { AFFECTION_MAX, AFFECTION_DRIFT_AWAY_THRESHOLD } from './Constants';
import { DriftState } from './Types';
import type { FishAffection } from './Types';

// === Drift → Affection Modifier Table ===
const DRIFT_AFFECTION_MODIFIERS: Partial<Record<DriftState, number>> = {
  [DriftState.Warm]: 3,
  [DriftState.Troubled]: 0,
  [DriftState.Wary]: -2,
  [DriftState.Charmed]: 5,
  [DriftState.Angry]: -5,
  // Scared: fish doesn't appear, no modifier
};

// === Max affection delta per single action ===
const MAX_DELTA_PER_ACTION = 30;

export class AffectionSystem {
  /**
   * Apply an affection delta to a FishAffection record.
   * Enforces: ±30 cap, ceiling, absolute minimum 0.
   * Returns the actual delta applied.
   */
  applyDelta(affection: FishAffection, rawDelta: number, sessionId: string): number {
    const cappedDelta = Math.max(-MAX_DELTA_PER_ACTION, Math.min(MAX_DELTA_PER_ACTION, rawDelta));

    const oldValue = affection.value;
    let newValue = oldValue + cappedDelta;

    // Clamp to [drift-away threshold, ceiling]. Affection can go negative but
    // bottoms out at the threshold, where shouldDriftAway() will fire.
    newValue = Math.min(affection.ceiling, newValue);
    newValue = Math.max(AFFECTION_DRIFT_AWAY_THRESHOLD, newValue);

    affection.value = newValue;
    affection.lastChangeDelta = newValue - oldValue;
    affection.lastChangeSessionId = sessionId;

    if (newValue > affection.peakValue) {
      affection.peakValue = newValue;
    }

    return affection.lastChangeDelta;
  }

  /**
   * Apply drift modifier to affection on Cast start.
   * Returns the delta applied (0 if drift has no effect).
   */
  applyDriftModifier(affection: FishAffection, drift: DriftState, sessionId: string): number {
    const modifier = DRIFT_AFFECTION_MODIFIERS[drift];
    if (modifier === undefined || modifier === 0) return 0;
    return this.applyDelta(affection, modifier, sessionId);
  }

  /** True when affection has dropped to the drift-away threshold (character leaves). */
  shouldDriftAway(affection: FishAffection): boolean {
    return affection.value <= AFFECTION_DRIFT_AWAY_THRESHOLD;
  }

  /** True when affection is at max and REEL can trigger catch sequence. */
  isCatchReady(affection: FishAffection): boolean {
    return affection.value >= AFFECTION_MAX;
  }

  /**
   * Adjective label representing the current affection level.
   * Updates at cast boundaries to avoid mid-cast toggling.
   */
  getAffectionLabel(value: number): string {
    if (value < -5)  return 'Estranged';
    if (value < 0)   return 'Wary';
    if (value === 0) return 'Indifferent';
    if (value <= 12) return 'Curious';
    if (value <= 25) return 'Interested';
    if (value <= 37) return 'Fond';
    if (value <= 46) return 'Devoted';
    return 'Bonded';
  }

  /** Create a fresh FishAffection record for a new character. */
  createAffection(characterId: string): FishAffection {
    return {
      characterId,
      value: 0,
      ceiling: AFFECTION_MAX,
      lastChangeSessionId: '',
      lastChangeDelta: 0,
      peakValue: 0,
    };
  }

  /** Restore a FishAffection record from save data, filling in defaults for missing fields. */
  restoreFromSave(characterId: string, saved: Partial<FishAffection>): FishAffection {
    const fresh = this.createAffection(characterId);
    return {
      ...fresh,
      ...saved,
      characterId, // always use the key, not saved value
    };
  }

  /**
   * Get tier info (name + color) based on affection value.
   * Uses getAffectionLabel() for the name to ensure consistency across
   * HUD, journal, and all other displays.
   * Each of the 8 affection labels has a unique color, progressing
   * from cold to warm:
   *   Tier 0: Estranged  (< -5)  — #5A6A7A grey froid
   *   Tier 1: Wary       (< 0)   — #6A8AA8 bleu-gris
   *   Tier 2: Indifferent (= 0)  — #77BBEE bleu clair
   *   Tier 3: Curious    (<= 12) — #8AC8D8 cyan pâle
   *   Tier 4: Interested (<= 25) — #48C8B0 turquoise
   *   Tier 5: Fond       (<= 37) — #88D888 vert tendre
   *   Tier 6: Devoted    (<= 46) — #E8A84C or lanterne
   *   Tier 7: Bonded     (> 46)  — #C8A0FF violet
   */
  getTierInfo(affectionValue: number): { name: string; color: string; tier: number } {
    const label = this.getAffectionLabel(affectionValue);

    if (affectionValue < -5)  return { name: label, color: '#5A6A7A', tier: 0 };
    if (affectionValue < 0)   return { name: label, color: '#6A8AA8', tier: 1 };
    if (affectionValue === 0) return { name: label, color: '#77BBEE', tier: 2 };
    if (affectionValue <= 12) return { name: label, color: '#8AC8D8', tier: 3 };
    if (affectionValue <= 25) return { name: label, color: '#48C8B0', tier: 4 };
    if (affectionValue <= 37) return { name: label, color: '#88D888', tier: 5 };
    if (affectionValue <= 46) return { name: label, color: '#E8A84C', tier: 6 };
    return { name: label, color: '#C8A0FF', tier: 7 };
  }
}
