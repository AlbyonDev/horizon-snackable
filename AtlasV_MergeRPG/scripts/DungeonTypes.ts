/**
 * DungeonTypes.ts
 *
 * Shared types for the procedural run system.
 * Encounter content lives in EncounterPool.ts.
 * Run logic lives in DungeonState.ts + EncounterBuilder.ts.
 */
import type { TextureAsset } from 'meta/worlds';
import type { BiomeId } from './EncounterPool';

// ===== Room Types =====
export enum RoomType {
  Combat = 0,
  Boss = 1,
}

// ===== A single rolled room in the run sequence =====
export interface RunRoom {
  type: RoomType;
  biomeId: BiomeId;
  backgroundTexture: TextureAsset;
  /** Enemy template ids to spawn (3 for combat, 1 for boss). */
  enemies: string[];
  /** Enemy level applied to all enemies in this room. */
  enemyLevel: number;
  /** Precomputed XP reward (scales with room CR). */
  xpReward: number;
  /** Precomputed gold reward (scales with room CR). */
  goldReward: number;
  /** CR of this room (for logging / future UI). */
  cr: number;
}

// ===== Reward handed back after a room clear =====
export interface RoomReward {
  xp: number;
  gold: number;
  /** Boss rooms may grant a hero card (hero id from HeroCatalog). */
  heroCard?: string;
}

// ===== Progress snapshot for HUD =====
export interface RunProgress {
  currentRoomIndex: number;
  totalRooms: number;
  isComplete: boolean;
}
