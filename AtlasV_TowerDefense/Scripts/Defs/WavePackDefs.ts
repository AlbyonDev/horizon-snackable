/**
 * WavePackDefs.ts — Wave pack definitions and tier slot patterns for procedural level generation.
 *
 * Pure data — no side effects, no service calls.
 * Each pack defines a fixed composition of enemies for a single wave.
 * Tier slot patterns determine which tier of pack is used at each wave position in a level.
 * The LevelGeneratorService picks a random pack from the tier pool for each slot.
 *
 * Tier 1: Early/breather waves (easy)
 * Tier 2: Mid waves (moderate challenge)
 * Tier 3: Late/hard waves (high pressure)
 * Boss: Final wave of level 5 only
 */
import type { IWaveGroup } from '../Types';

// ─── Pack definition ────────────────────────────────────────────────────────────

export interface IWavePack {
  /** Unique name for debugging / no-repeat logic. */
  readonly name: string;
  /** Enemy groups that compose this wave. */
  readonly groups: ReadonlyArray<IWaveGroup>;
}

// ─── Tier enum ──────────────────────────────────────────────────────────────────

export enum WavePackTier {
  T1 = 1,
  T2 = 2,
  T3 = 3,
  T4 = 4,
  Boss = 5,
  Projectile = 6,
}

// ─── Tier 1 packs (Early/breather) ─────────────────────────────────────────────

export const TIER_1_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'Trickle',
    groups: [{ enemyId: 'basic', count: 5 }],
  },
  {
    name: 'ScoutParty',
    groups: [{ enemyId: 'basic', count: 3 }, { enemyId: 'fast', count: 2 }],
  },
  {
    name: 'Patrol',
    groups: [{ enemyId: 'basic', count: 6 }],
  },
];

// ─── Tier 2 packs (Mid) ────────────────────────────────────────────────────────

export const TIER_2_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'Rush',
    groups: [{ enemyId: 'fast', count: 6 }],
  },
  {
    name: 'TankLite',
    groups: [{ enemyId: 'tank', count: 1 }, { enemyId: 'basic', count: 4 }],
  },
  {
    name: 'ShamanRaid',
    groups: [{ enemyId: 'shaman', count: 2 }],
  },
  {
    name: 'Swarm',
    groups: [{ enemyId: 'basic', count: 12 }],
  },
];

// ─── Tier 3 packs (Late/hard) ──────────────────────────────────────────────────

export const TIER_3_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'TankPush',
    groups: [{ enemyId: 'tank', count: 4 }, { enemyId: 'fast', count: 4 }],
  },
  {
    name: 'Split',
    groups: [{ enemyId: 'fast', count: 7 }, { enemyId: 'tank', count: 3 }],
  },
  {
    name: 'ShamanRaid',
    groups: [{ enemyId: 'fast', count: 4 }, { enemyId: 'shaman', count: 3 }],
  },
  {
    name: 'EliteRush',
    groups: [{ enemyId: 'fast', count: 8 }, { enemyId: 'basic', count: 4 }],
  },
  {
    name: 'Swarm',
    groups: [{ enemyId: 'basic', count: 20 }],
  },
  {
    name: 'ChargerAssault',
    groups: [{ enemyId: 'charger', count: 2 }, { enemyId: 'fast', count: 3 }],
  },
  {
    name: 'ChargerAssault',
    groups: [{ enemyId: 'charger', count: 4 }, { enemyId: 'basic', count: 2 }],
  },
];

// ─── Tier 4 packs (Hardest non-boss, featuring Charger as mini-boss) ────────────

export const TIER_4_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'ChargerAssault',
    groups: [{ enemyId: 'charger', count: 2 }, { enemyId: 'fast', count: 6 }],
  },
  {
    name: 'ChargerEscort',
    groups: [{ enemyId: 'charger', count: 1 }, { enemyId: 'tank', count: 3 }, { enemyId: 'basic', count: 8 }],
  },
  {
    name: 'ChargerSwarm',
    groups: [{ enemyId: 'charger', count: 3 }, { enemyId: 'fast', count: 4 }],
  },
  {
    name: 'ChargerSiege',
    groups: [{ enemyId: 'charger', count: 2 }, { enemyId: 'tank', count: 4 }, { enemyId: 'fast', count: 5 }],
  },
];

// ─── Boss pack (level 5 final wave only) ────────────────────────────────────────

export const PROJECTILE_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FireballBarrage',
    groups: [{ enemyId: 'fireball', count: 4 }, { enemyId: 'fast', count: 3 }],
  },
  {
    name: 'FireballRush',
    groups: [{ enemyId: 'fireball', count: 3 }, { enemyId: 'tank', count: 1 }],
  },
  {
    name: 'FireballRush',
    groups: [{ enemyId: 'fireball', count: 3 }, { enemyId: 'basic', count: 5 }],
  },
  {
    name: 'FireballOnly',
    groups: [{ enemyId: 'fireball', count: 6 }],
  },
];

// ─── Boss pack (level 5 final wave only) ────────────────────────────────────────

export const BOSS_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'CaveBossWave',
    groups: [{ enemyId: 'caveBoss', count: 1 }, { enemyId: 'basic', count: 5 }, { enemyId: 'fast', count: 3 }],
  },
];

// ─── Tier slot patterns per level ───────────────────────────────────────────────
// Index = level index (0-based). Each array entry is the tier for that wave slot.

export const LEVEL_TIER_PATTERNS: ReadonlyArray<ReadonlyArray<WavePackTier>> = [
  // Level 1: 3 waves — T1 → T1 → T1
  [WavePackTier.T1, WavePackTier.T1, WavePackTier.T1],

  // Level 2: 5 waves — T1 → T2 → T1 → T2
  [WavePackTier.T1, WavePackTier.T2, WavePackTier.T2, WavePackTier.T1, WavePackTier.T2],

  // Level 3: 7 waves — T1 → T2 → T2 → T1 → T3
  [WavePackTier.T1, WavePackTier.T2, WavePackTier.T2, WavePackTier.T2, WavePackTier.T2, WavePackTier.T2, WavePackTier.T3],

  // Level 4: 8 waves — T1 → T2 → T3 → T4 → T2 → T3
  [WavePackTier.T1, WavePackTier.T2, WavePackTier.T3, WavePackTier.T2, WavePackTier.T2, WavePackTier.T2, WavePackTier.T3, WavePackTier.T3],

  // Level 5 (Boss): 10 waves — T1 → T2 → T3 → T4 → T3 → T4 → T3 → Boss
  [WavePackTier.T1, WavePackTier.T1, WavePackTier.Projectile, WavePackTier.T2, WavePackTier.T3, WavePackTier.T2, WavePackTier.T3, WavePackTier.Projectile, WavePackTier.T3, WavePackTier.Boss],
];

// ─── Tier → pack pool lookup ────────────────────────────────────────────────────

/** Snow biome Tier 1 packs (Frost Goblin patrols) */
export const SNOW_TIER_1_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FrostPatrol',
    groups: [{ enemyId: 'frostGoblin', count: 5 }],
  },
  {
    name: 'FrostScouts',
    groups: [{ enemyId: 'frostGoblin', count: 3 }, { enemyId: 'basic', count: 2 }],
  },
  {
    name: 'FrostScouts',
    groups: [{ enemyId: 'frostGoblin', count: 6 }],
  },
];

/** Snow biome Tier 2 packs */
export const SNOW_TIER_2_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FrostRush',
    groups: [{ enemyId: 'fast', count: 4 }, { enemyId: 'frostGoblin', count: 4 }],
  },
  {
    name: 'FrostSuper',
    groups: [{ enemyId: 'frostGoblin', count: 12 }],
  },
  {
    name: 'FrostSiege',
    groups: [{ enemyId: 'frostGoblin', count: 6 }, { enemyId: 'fast', count: 3 }],
  },
];

/** Snow biome Tier 3 packs (heavier frost presence) */
export const SNOW_TIER_3_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FrostHorde',
    groups: [{ enemyId: 'frostGoblin', count: 8 }, { enemyId: 'fast', count: 2 }],
  },
  {
    name: 'FrostMix',
    groups: [{ enemyId: 'frostGoblin', count: 5 }, { enemyId: 'tank', count: 2 }, { enemyId: 'fast', count: 1 }],
  },
  {
    name: 'IceWall',
    groups: [{ enemyId: 'tank', count: 2 }, { enemyId: 'frostGoblin', count: 6 }],
  },
];

/** Volcano biome Tier 1 packs (Fire Goblin patrols) */
export const VOLCANO_TIER_1_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FirePatrol',
    groups: [{ enemyId: 'fireGoblin', count: 6 }],
  },
  {
    name: 'FireScouts',
    groups: [{ enemyId: 'fireGoblin', count: 3 }, { enemyId: 'basic', count: 3 }],
  },
];

/** Volcano biome Tier 2 packs (heavier fire presence) */
export const VOLCANO_TIER_2_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FireRaid',
    groups: [{ enemyId: 'fireGoblin', count: 4 }, { enemyId: 'fast', count: 2 }],
  },
  {
    name: 'MagmaRush',
    groups: [{ enemyId: 'fireGoblin', count: 8 }],
  },
];

/** Volcano biome Tier 3 packs (heavy fire + tank combos) */
export const VOLCANO_TIER_3_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'FireHorde',
    groups: [{ enemyId: 'fireGoblin', count: 5 }, { enemyId: 'tank', count: 2 }],
  },
  {
    name: 'InfernoWave',
    groups: [{ enemyId: 'fireGoblin', count: 8 }],
  },
  {
    name: 'VolcanoSiege',
    groups: [{ enemyId: 'fireGoblin', count: 4 }, { enemyId: 'fast', count: 3 }, { enemyId: 'basic', count: 2 }],
  },
  {
    name: 'MagmaPush',
    groups: [{ enemyId: 'fireGoblin', count: 6 }, { enemyId: 'fast', count: 2 }],
  },
];

/** Grass biome Boss packs (Giant Goblin as grass boss) */
export const GRASS_BOSS_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'GrassGoblinBoss',
    groups: [{ enemyId: 'giantGoblin', count: 1 }, { enemyId: 'basic', count: 4 }, { enemyId: 'fast', count: 3 }],
  },
];

/** Snow biome Boss packs (Yeti Berserker as snow boss) */
export const SNOW_BOSS_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'SnowBoss',
    groups: [{ enemyId: 'yeti', count: 1 }, { enemyId: 'frostGoblin', count: 5 }, { enemyId: 'fast', count: 3 }],
  },
];

/** Volcano biome Boss packs (Fire Golem as volcano boss) */
export const VOLCANO_BOSS_PACKS: ReadonlyArray<IWavePack> = [
  {
    name: 'VolcanoBoss',
    groups: [{ enemyId: 'fireGolem', count: 1 }, { enemyId: 'fireGoblin', count: 4 }, { enemyId: 'fast', count: 2 }],
  },
];


/** Returns the pack pool for a given tier. */
export function getPackPoolForTier(tier: WavePackTier): ReadonlyArray<IWavePack> {
  switch (tier) {
    case WavePackTier.T1: return TIER_1_PACKS;
    case WavePackTier.T2: return TIER_2_PACKS;
    case WavePackTier.T3: return TIER_3_PACKS;
    case WavePackTier.T4: return TIER_4_PACKS;
    case WavePackTier.Projectile: return PROJECTILE_PACKS;
    case WavePackTier.Boss: return BOSS_PACKS;
  }
}

/** Returns the pack pool for a given tier, with biome-specific packs mixed in. */
export function getPackPoolForTierAndBiome(tier: WavePackTier, biome: string): ReadonlyArray<IWavePack> {
  const basePacks = getPackPoolForTier(tier);
  if (biome === 'grass') {
    if (tier === WavePackTier.Boss) return GRASS_BOSS_PACKS;
  }
  if (biome === 'snow') {
    if (tier === WavePackTier.T1) return [...basePacks, ...SNOW_TIER_1_PACKS];
    if (tier === WavePackTier.T2) return [...basePacks, ...SNOW_TIER_2_PACKS];
    if (tier === WavePackTier.T3) return [...basePacks, ...SNOW_TIER_3_PACKS];
    if (tier === WavePackTier.Boss) return SNOW_BOSS_PACKS;
  }
  if (biome === 'volcano') {
    if (tier === WavePackTier.T1) return [...basePacks, ...VOLCANO_TIER_1_PACKS];
    if (tier === WavePackTier.T2) return [...basePacks, ...VOLCANO_TIER_2_PACKS];
    if (tier === WavePackTier.T3) return [...basePacks, ...VOLCANO_TIER_3_PACKS];
    if (tier === WavePackTier.Boss) return VOLCANO_BOSS_PACKS;
  }
  return basePacks;
}
