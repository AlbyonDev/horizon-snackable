import { StatsService } from '../Services/StatsService';
import { ResourceService } from '../Services/ResourceService';

/**
 * Returns true if all conditions in the unlock map are satisfied.
 *
 * Special key:
 *   'gold' — current gold on hand (ResourceService), not cumulative.
 * All other keys are StatsService counters.
 */
export function isUnlocked(unlock?: Readonly<Record<string, number>>): boolean {
  if (!unlock) return true;
  return Object.entries(unlock).every(([key, required]) => {
    if (key === 'gold') return ResourceService.get().getGold() >= required;
    return StatsService.get().get(key) >= required;
  });
}
