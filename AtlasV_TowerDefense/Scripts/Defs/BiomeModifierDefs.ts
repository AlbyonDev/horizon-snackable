/**
 * BiomeModifierDefs.ts — Static data table for biome-based tower buffs/debuffs.
 *
 * Pure data — no side effects, no service calls.
 * Each entry specifies a tower ID, a biome ID, and a damage multiplier.
 *   multiplier > 1.0 = buff (tower is stronger in this biome)
 *   multiplier < 1.0 = debuff (tower is weaker in this biome)
 *   multiplier = 1.0 or no entry = neutral (no modifier)
 *
 * Read by TowerService.getBiomeModifier() for runtime stat application,
 * and by TowerShopHud for UI arrow indicator display.
 */

export interface IBiomeModifier {
  towerId: string;
  biomeId: string;
  damageMultiplier: number;
}

export const BIOME_MODIFIERS: readonly IBiomeModifier[] = [
  // Frost tower is weaker in volcano (ice melts in the heat)
  { towerId: 'frost', biomeId: 'volcano', damageMultiplier: 0.5 },

  // Fire Cannon is stronger in snow (fire thrives against cold)
  { towerId: 'fire_cannon', biomeId: 'snow', damageMultiplier: 1.5 },
];

/**
 * Look up the damage multiplier for a given tower in a given biome.
 * Returns 1.0 (neutral) if no modifier is defined.
 */
export function getBiomeDamageMultiplier(towerId: string, biomeId: string): number {
  const entry = BIOME_MODIFIERS.find(m => m.towerId === towerId && m.biomeId === biomeId);
  return entry ? entry.damageMultiplier : 1.0;
}

/**
 * Returns 'buff', 'debuff', or 'neutral' for a given tower in a given biome.
 * Used by the tower shop UI to determine which arrow indicator to show.
 */
export function getBiomeModifierState(towerId: string, biomeId: string): 'buff' | 'debuff' | 'neutral' {
  const mult = getBiomeDamageMultiplier(towerId, biomeId);
  if (mult > 1.0) return 'buff';
  if (mult < 1.0) return 'debuff';
  return 'neutral';
}
