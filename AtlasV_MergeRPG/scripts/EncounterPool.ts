/**
 * EncounterPool.ts
 *
 * Defines the enemy pools and boss pool used for procedural run generation.
 * Each biome lists the minion ids that can appear in its combat rooms.
 * Rooms are assembled at runtime by EncounterBuilder — no hand-authored
 * fixed combinations are needed here.
 *
 * CR formula (per enemy, for reference):
 *   CR = round((HP/70 + ATK/14) / 2 * 10)
 */
import {
  bgForestTexture,
  bgCryptTexture,
  bgVolcanoTexture,
  dungeonBackgroundTexture,
} from './Assets';
import type { TextureAsset } from 'meta/worlds';

export type BiomeId = 'dungeon' | 'forest' | 'crypt' | 'volcano';

/** A biome groups a background texture with its pool of minion enemy ids. */
export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  backgroundTexture: TextureAsset;
  /** All minion enemy template ids available in this biome. */
  minions: string[];
}

/** A boss pool entry — always a single boss enemy. */
export interface BossTemplate {
  enemyId: string;
  name: string;
  /** The biome this boss belongs to (used for background texture). */
  biomeId: BiomeId;
}

export const BIOME_POOL: BiomeDefinition[] = [
  {
    id: 'dungeon',
    name: 'Dark Dungeon',
    backgroundTexture: dungeonBackgroundTexture,
    minions: ['slime', 'goblin', 'goblin_chief'],
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    backgroundTexture: bgForestTexture,
    minions: ['slime_forest', 'goblin_forest'],
  },
  {
    id: 'crypt',
    name: 'Forgotten Crypt',
    backgroundTexture: bgCryptTexture,
    minions: ['skeleton', 'ghost'],
  },
  {
    id: 'volcano',
    name: 'Inferno Crater',
    backgroundTexture: bgVolcanoTexture,
    minions: ['fire_elemental', 'demon'],
  },
];

export const BOSS_POOL: BossTemplate[] = [
  { enemyId: 'boss_treant', name: 'Ancient Treant', biomeId: 'forest'  },
  { enemyId: 'boss_lich',   name: 'Lich King',      biomeId: 'crypt'   },
  { enemyId: 'boss_dragon', name: 'Inferno Dragon', biomeId: 'volcano' },
];

/** Number of combat rooms before the boss room. */
export const RUN_COMBAT_ROOMS = 4;

/** Total rooms per run including boss. */
export const RUN_TOTAL_ROOMS = RUN_COMBAT_ROOMS + 1;

/** Enemies per combat room. */
export const ROOM_SIZE = 3;
