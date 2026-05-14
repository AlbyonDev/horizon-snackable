/**
 * FishDefs — static catalog of all catchable species.
 *
 * depthMin = world Y at which the species starts appearing (absent = surface).
 * No depthMax — all species remain eligible at any depth below their depthMin.
 * The wave formula creates natural density cycles so they're not uniform forever.
 */
import { Assets } from './Assets';
import type { IFishDef } from './Types';

// Wave formula per slot:
//   wave = sin(depth/wave1Period + wave1Offset) × sin(depth/wave2Period + wave2Offset)
//   effectiveChance = spawnChance × max(0, wave)
//
// Period ratios use irrational numbers (√2, √3, φ) so biome patterns never repeat.
//   √2 ≈ 1.4142   √3 ≈ 1.7321   φ ≈ 1.6180

export const FISH_DEFS: IFishDef[] = [

  // ── Shallow ──────────────────────────────────────────────────────────────────
  { id:  1, name: 'Clownfish',        rarity: 'common',    gold:  5,
    spawnChance: 0.70, depthMin: 0,
    wave1Period: 18,    wave1Offset: 0.0,
    wave2Period: 25.46, wave2Offset: 1.1,   // 18 × √2
    sizeMin: 1.05, sizeMax: 1.65, speedMin: 1.2, speedMax: 2.2  },

  { id:  2, name: 'Koi',              rarity: 'common',    gold:  6,
    spawnChance: 0.65, depthMin: 0,
    wave1Period: 22,    wave1Offset: 1.8,
    wave2Period: 38.10, wave2Offset: 0.4,   // 22 × √3
    sizeMin: 1.65, sizeMax: 2.55, speedMin: 0.8, speedMax: 1.6     },

  { id:  3, name: 'Blue Discus',      rarity: 'common',    gold:  8,
    spawnChance: 0.60, depthMin: -5,
    wave1Period: 15,    wave1Offset: 0.9,
    wave2Period: 24.27, wave2Offset: 2.3,   // 15 × φ
    sizeMin: 1.50, sizeMax: 2.25, speedMin: 0.6, speedMax: 1.2    },

  { id:  4, name: 'Butterflyfish',    rarity: 'rare',      gold: 15,
    spawnChance: 0.45, depthMin: -5,
    wave1Period: 30,    wave1Offset: 2.5,
    wave2Period: 42.43, wave2Offset: 0.7,   // 30 × √2
    sizeMin: 1.65, sizeMax: 2.40, speedMin: 1.0, speedMax: 1.8  },

  { id:  5, name: 'Angelfish',        rarity: 'rare',      gold: 18,
    spawnChance: 0.40, depthMin: -10,
    wave1Period: 35,    wave1Offset: 1.3,
    wave2Period: 56.62, wave2Offset: 3.0,   // 35 × φ
    sizeMin: 1.65, sizeMax: 2.55, speedMin: 0.7, speedMax: 1.4     },

  { id:  6, name: 'Rainbow Fish',     rarity: 'legendary', gold: 25,
    spawnChance: 0.55, depthMin: 0,
    wave1Period: 50,    wave1Offset: 0.3,
    wave2Period: 86.60, wave2Offset: 1.7,   // 50 × √3
    sizeMin: 1.20, sizeMax: 1.80, speedMin: 2.0, speedMax: 3.2 },

  // ── Mid ───────────────────────────────────────────────────────────────────────
  { id:  7, name: 'Silver Carp',      rarity: 'common',    gold: 10,
    spawnChance: 0.65, depthMin: -15,
    wave1Period: 28,    wave1Offset: 0.6,
    wave2Period: 39.60, wave2Offset: 2.1,   // 28 × √2
    sizeMin: 2.10, sizeMax: 3.15, speedMin: 0.9, speedMax: 1.7   },

  { id:  8, name: 'Green Discus',     rarity: 'common',    gold: 12,
    spawnChance: 0.60, depthMin: -20,
    wave1Period: 32,    wave1Offset: 1.5,
    wave2Period: 51.78, wave2Offset: 0.2,   // 32 × φ
    sizeMin: 1.80, sizeMax: 2.70, speedMin: 0.6, speedMax: 1.2   },


  { id:  9, name: 'Dolphin',           rarity: 'rare',      gold: 20,
    spawnChance: 0.40, depthMin: -10,
    wave1Period: 38,    wave1Offset: 1.0,
    wave2Period: 53.74, wave2Offset: 2.4,   // 38 × √2
    sizeMin: 2.40, sizeMax: 3.60, speedMin: 1.5, speedMax: 2.8  },

  { id: 10, name: 'Flame Angelfish',  rarity: 'rare',      gold: 22,
    spawnChance: 0.45, depthMin: -20,
    wave1Period: 45,    wave1Offset: 2.2,
    wave2Period: 63.64, wave2Offset: 0.9,   // 45 × √2
    sizeMin: 1.80, sizeMax: 2.70, speedMin: 1.0, speedMax: 1.8  },

  { id: 11, name: 'Sand Flounder',    rarity: 'rare',      gold: 28,
    spawnChance: 0.40, depthMin: -30,
    wave1Period: 40,    wave1Offset: 0.8,
    wave2Period: 69.28, wave2Offset: 2.6,   // 40 × √3
    sizeMin: 2.10, sizeMax: 3.15, speedMin: 0.5, speedMax: 1.0   },

  { id: 12, name: 'Sea Turtle',       rarity: 'rare',      gold: 22,
    spawnChance: 0.38, depthMin: -12,
    wave1Period: 42,    wave1Offset: 1.7,
    wave2Period: 67.96, wave2Offset: 0.5,   // 42 × φ
    sizeMin: 2.40, sizeMax: 3.60, speedMin: 0.4, speedMax: 0.9   },

  // ── Abyss ──────────────────────────────────────────────────────────────────
  { id: 13, name: 'Violet Barracuda', rarity: 'rare',      gold: 30,
    spawnChance: 0.35, depthMin: -25,
    wave1Period: 44,    wave1Offset: 2.8,
    wave2Period: 76.20, wave2Offset: 1.3,   // 44 × √3
    sizeMin: 2.70, sizeMax: 4.05, speedMin: 1.8, speedMax: 3.0   },

  { id: 14, name: 'Blue Flounder',    rarity: 'common',    gold: 18,
    spawnChance: 0.55, depthMin: -28,
    wave1Period: 36,    wave1Offset: 0.4,
    wave2Period: 58.25, wave2Offset: 1.9,   // 36 × φ
    sizeMin: 2.10, sizeMax: 3.15, speedMin: 0.5, speedMax: 1.1   },

  { id: 15, name: 'Reef Shark',       rarity: 'rare',      gold: 35,
    spawnChance: 0.30, depthMin: -30,
    wave1Period: 55,    wave1Offset: 1.6,
    wave2Period: 77.78, wave2Offset: 2.8,   // 55 × √2
    sizeMin: 3.00, sizeMax: 4.50, speedMin: 1.5, speedMax: 2.8   },

  { id: 16, name: 'Pink Dolphin',     rarity: 'legendary', gold: 60,
    spawnChance: 0.20, depthMin: -32,
    wave1Period: 65,    wave1Offset: 0.2,
    wave2Period: 105.17, wave2Offset: 2.5,  // 65 × φ
    sizeMin: 2.70, sizeMax: 4.05, speedMin: 1.6, speedMax: 2.8   },

  { id: 17, name: 'Barracuda',        rarity: 'common',    gold: 16,
    spawnChance: 0.60, depthMin: -26,
    wave1Period: 34,    wave1Offset: 2.0,
    wave2Period: 48.08, wave2Offset: 0.8,   // 34 × √2
    sizeMin: 2.70, sizeMax: 4.05, speedMin: 2.0, speedMax: 3.2   },

  { id: 18, name: 'Pink Shark',       rarity: 'legendary', gold: 65,
    spawnChance: 0.18, depthMin: -35,
    wave1Period: 70,    wave1Offset: 1.2,
    wave2Period: 121.24, wave2Offset: 1.8,  // 70 × √3
    sizeMin: 3.30, sizeMax: 5.10, speedMin: 1.4, speedMax: 2.5   },

  { id: 19, name: 'Lanternfish',      rarity: 'common',    gold: 30,
    spawnChance: 0.55, depthMin: -90,
    wave1Period: 48,    wave1Offset: 1.4,
    wave2Period: 77.66, wave2Offset: 0.6,   // 48 × φ
    sizeMin: 1.50, sizeMax: 2.10, speedMin: 1.0, speedMax: 1.8 },

  { id: 20, name: 'Abyssal Anglerfish', rarity: 'legendary', gold: 120,
    spawnChance: 0.65, depthMin: -120,
    wave1Period: 100,   wave1Offset: 0.5,
    wave2Period: 173.21, wave2Offset: 2.0,  // 100 × √3
    sizeMin: 4.50, sizeMax: 6.30, speedMin: 0.3, speedMax: 0.8 },

  // ── New Species (IDs 21-30) ────────────────────────────────────────────────
  { id: 21, name: 'Manta Ray',        rarity: 'rare',      gold: 24,
    spawnChance: 0.35, depthMin: -12,
    wave1Period: 40,    wave1Offset: 0.7,
    wave2Period: 64.72, wave2Offset: 2.2,   // 40 × φ
    sizeMin: 3.00, sizeMax: 4.50, speedMin: 0.8, speedMax: 1.5   },

  { id: 22, name: 'Emperor Snapper',  rarity: 'common',    gold:  7,
    spawnChance: 0.65, depthMin: -3,
    wave1Period: 20,    wave1Offset: 1.4,
    wave2Period: 28.28, wave2Offset: 0.6,   // 20 × √2
    sizeMin: 1.80, sizeMax: 2.70, speedMin: 0.9, speedMax: 1.7   },

  { id: 23, name: 'Neon Tetra',       rarity: 'common',    gold:  4,
    spawnChance: 0.75, depthMin: 0,
    wave1Period: 14,    wave1Offset: 2.1,
    wave2Period: 24.25, wave2Offset: 1.0,   // 14 × √3
    sizeMin: 0.90, sizeMax: 1.35, speedMin: 1.4, speedMax: 2.6   },

  { id: 24, name: 'Hammerhead Shark',  rarity: 'legendary', gold: 55,
    spawnChance: 0.22, depthMin: -28,
    wave1Period: 60,    wave1Offset: 0.9,
    wave2Period: 97.08, wave2Offset: 2.7,   // 60 × φ
    sizeMin: 3.60, sizeMax: 5.40, speedMin: 1.5, speedMax: 2.8   },

  { id: 25, name: 'Lionfish',         rarity: 'rare',      gold: 26,
    spawnChance: 0.38, depthMin: -14,
    wave1Period: 36,    wave1Offset: 2.6,
    wave2Period: 62.35, wave2Offset: 0.3,   // 36 × √3
    sizeMin: 1.80, sizeMax: 2.70, speedMin: 0.6, speedMax: 1.2   },

  { id: 26, name: 'Electric Eel',     rarity: 'rare',      gold: 32,
    spawnChance: 0.32, depthMin: -26,
    wave1Period: 46,    wave1Offset: 1.5,
    wave2Period: 65.05, wave2Offset: 2.0,   // 46 × √2
    sizeMin: 3.00, sizeMax: 4.80, speedMin: 1.0, speedMax: 2.0   },

  { id: 27, name: 'Goblin Shark',     rarity: 'legendary', gold: 90,
    spawnChance: 0.15, depthMin: -40,
    wave1Period: 80,    wave1Offset: 0.4,
    wave2Period: 138.56, wave2Offset: 1.6,  // 80 × √3
    sizeMin: 3.60, sizeMax: 5.40, speedMin: 0.5, speedMax: 1.0   },

  { id: 28, name: 'Sunfish',          rarity: 'common',    gold: 14,
    spawnChance: 0.55, depthMin: -15,
    wave1Period: 26,    wave1Offset: 1.8,
    wave2Period: 42.07, wave2Offset: 0.9,   // 26 × φ
    sizeMin: 2.70, sizeMax: 4.20, speedMin: 0.4, speedMax: 0.9   },

  { id: 29, name: 'Jellyfish',        rarity: 'common',    gold: 12,
    spawnChance: 0.58, depthMin: -25,
    wave1Period: 30,    wave1Offset: 0.5,
    wave2Period: 51.96, wave2Offset: 2.4,   // 30 × √3
    sizeMin: 1.50, sizeMax: 2.40, speedMin: 0.3, speedMax: 0.7   },

  { id: 30, name: 'Golden Seahorse',  rarity: 'legendary', gold: 100,
    spawnChance: 0.12, depthMin: -45,
    wave1Period: 90,    wave1Offset: 2.3,
    wave2Period: 145.62, wave2Offset: 0.8,  // 90 × φ
    sizeMin: 1.20, sizeMax: 1.80, speedMin: 0.3, speedMax: 0.6   },

  { id: 31, name: 'Phantom Pufferfish', rarity: 'rare',    gold: 28,
    spawnChance: 0.38, depthMin: -18,
    wave1Period: 38,    wave1Offset: 2.9,
    wave2Period: 61.48, wave2Offset: 1.4,   // 38 × φ
    sizeMin: 1.80, sizeMax: 2.70, speedMin: 0.7, speedMax: 1.3   },

];
