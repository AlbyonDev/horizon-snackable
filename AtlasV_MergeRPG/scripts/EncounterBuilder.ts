/**
 * EncounterBuilder.ts
 *
 * Builds a procedural run sequence (3 combat rooms + 1 boss) from the
 * enemy pools defined in EncounterPool.
 *
 * Room generation:
 *   - Each combat room picks ROOM_SIZE enemies randomly from the biome's
 *     minion pool (repetition allowed — e.g. 3 slimes is valid).
 *   - The boss room picks a random boss from BOSS_POOL. The boss biome
 *     determines the background texture for that room.
 *   - Biomes are drawn without replacement across combat rooms so every
 *     run visits all 3 biomes in a random order.
 *
 * Enemy level scaling:
 *   enemyLevel = clamp(avgTeamLevel + depthOffset[depth], 1, 10)
 *   depthOffset = [-1, 0, +1] for combat rooms 0-2, +2 for boss
 *
 * Rewards scale with room CR:
 *   XP   = round(roomCR * 2)
 *   Gold = round(roomCR * 2.5)
 */
import {
  BIOME_POOL,
  BOSS_POOL,
  RUN_COMBAT_ROOMS,
  RUN_TOTAL_ROOMS,
  ROOM_SIZE,
  type BiomeDefinition,
} from './EncounterPool';
import { getEnemyTemplate } from './EnemyCatalog';
import { RoomType, type RunRoom } from './DungeonTypes';

const DEPTH_OFFSET = [-1, 0, 1, 2, 3]; // index 4 = boss

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** CR formula: round((HP/70 + ATK/14) / 2 * 10). Returns 0 for unknown ids. */
function enemyCR(templateId: string): number {
  const t = getEnemyTemplate(templateId);
  if (!t) return 0;
  return Math.round(((t.baseHp / 70) + (t.baseAtk / 14)) / 2 * 10);
}

/** Pick ROOM_SIZE random enemies from the biome pool and return their ids + total CR. */
function generateCombatRoom(biome: BiomeDefinition): { enemies: string[]; cr: number } {
  const enemies: string[] = [];
  let cr = 0;
  for (let i = 0; i < ROOM_SIZE; i++) {
    const id = pickRandom(biome.minions);
    enemies.push(id);
    cr += enemyCR(id);
  }
  return { enemies, cr };
}

/**
 * Roll a full run sequence for the given average team level.
 * Returns RUN_TOTAL_ROOMS RunRoom entries (3 combat + 1 boss).
 */
export function buildRunSequence(avgTeamLevel: number): RunRoom[] {
  const rooms: RunRoom[] = [];

  // Visit all 3 biomes in a random order
  const biomeOrder = shuffle([...BIOME_POOL]);

  for (let depth = 0; depth < RUN_COMBAT_ROOMS; depth++) {
    const biome      = biomeOrder[depth];
    const enemyLevel = clamp(avgTeamLevel + DEPTH_OFFSET[depth], 1, 10);
    const { enemies, cr } = generateCombatRoom(biome);

    rooms.push({
      type:              RoomType.Combat,
      biomeId:           biome.id,
      backgroundTexture: biome.backgroundTexture,
      enemies,
      enemyLevel,
      xpReward:          Math.round(cr * 2),
      goldReward:        Math.round(cr * 2.5),
      cr,
    });
  }

  // Boss room: random boss, background from its home biome
  const boss      = pickRandom(BOSS_POOL);
  const bossLevel = clamp(avgTeamLevel + DEPTH_OFFSET[3], 1, 10);
  const bossBiome = BIOME_POOL.find(b => b.id === boss.biomeId) ?? biomeOrder[RUN_COMBAT_ROOMS - 1];
  const bossCR    = enemyCR(boss.enemyId);

  rooms.push({
    type:              RoomType.Boss,
    biomeId:           boss.biomeId,
    backgroundTexture: bossBiome.backgroundTexture,
    enemies:           [boss.enemyId],
    enemyLevel:        bossLevel,
    xpReward:          Math.round(bossCR * 2),
    goldReward:        Math.round(bossCR * 2.5),
    cr:                bossCR,
  });

  return rooms;
}

/** Serialize a run sequence to a compact JSON string for save data. */
export function serializeRunSequence(rooms: RunRoom[]): string {
  return JSON.stringify(rooms.map(r => ({
    t:  r.type,
    b:  r.biomeId,
    e:  r.enemies,
    el: r.enemyLevel,
    xp: r.xpReward,
    g:  r.goldReward,
    cr: r.cr,
  })));
}

/** Deserialize a run sequence from save data. Returns null on failure. */
export function deserializeRunSequence(json: string): RunRoom[] | null {
  try {
    const raw: Array<{ t: number; b: string; e: string[]; el: number; xp: number; g: number; cr: number }> = JSON.parse(json);
    if (!Array.isArray(raw) || raw.length !== RUN_TOTAL_ROOMS) return null;
    return raw.map(r => {
      const biome = BIOME_POOL.find(b => b.id === r.b) ?? BIOME_POOL[0];
      return {
        type:              r.t as RoomType,
        biomeId:           r.b as any,
        backgroundTexture: biome.backgroundTexture,
        enemies:           r.e,
        enemyLevel:        r.el,
        xpReward:          r.xp,
        goldReward:        r.g,
        cr:                r.cr,
      } as RunRoom;
    });
  } catch {
    return null;
  }
}
