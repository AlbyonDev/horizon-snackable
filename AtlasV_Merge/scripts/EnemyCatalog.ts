/**
 * EnemyCatalog
 *
 * Single source of truth for every enemy in the game. Each entry fully
 * describes an enemy: identity, art, stats, mana gain, and power. Adding
 * a new enemy is a one-entry edit here — every encounter (dungeon rooms,
 * default tutorial encounter) is built from this catalog via
 * `buildEnemy` / `buildEncounter`.
 *
 * Mirrors the HeroCatalog pattern so designers add content the same way
 * everywhere.
 */
import { TextureAsset } from 'meta/worlds';
import { GemType } from './Types';
import { ENEMY_POWERS, type PowerDefinition } from './PowerTypes';
import type { Enemy, EnemyManaGain } from './TeamTypes';
import {
  enemySlimeTexture,
  enemyGoblinTexture,
  enemySlimeForestTexture,
  enemyGoblinForestTexture,
  enemySkeletonTexture,
  enemyGhostTexture,
  enemyFireElementalTexture,
  enemyDemonTexture,
  bossTreantTexture,
  bossLichTexture,
  bossDragonTexture,
} from './Assets';

/** Static, designer-authored definition of an enemy. */
export interface EnemyTemplate {
  /** Stable identifier — also the value of `Enemy.spriteKey` and texture lookup key. */
  id: string;
  /** Display name. */
  name: string;
  /** Battle texture rendered by every enemy-aware view. */
  texture: TextureAsset;
  /** Base max HP. */
  baseHp: number;
  /** Base ATK used by combat damage formulas. */
  baseAtk: number;
  /** Mana gained per turn for each gem color. */
  manaGain: EnemyManaGain;
  /** Active ability triggered when mana fills. */
  power: PowerDefinition;
  /** Whether this template is a boss (single instance, no index suffix). */
  isBoss?: boolean;
}

// ===== Catalog entries =====
// To add a new enemy: append one EnemyTemplate below. No other file needs editing.

// ----- Tutorial / default roster -----

const SLIME: EnemyTemplate = {
  id: 'slime',
  name: 'Slime',
  texture: enemySlimeTexture,
  baseHp: 180,
  baseAtk: 6,
  manaGain: {
    [GemType.Red]: 2, [GemType.Blue]: 1, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.slime,
};

const GOBLIN: EnemyTemplate = {
  id: 'goblin',
  name: 'Goblin',
  texture: enemyGoblinTexture,
  baseHp: 240,
  baseAtk: 8,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 2, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.goblin,
};

const GOBLIN_CHIEF: EnemyTemplate = {
  id: 'goblin_chief',
  name: 'Goblin Chief',
  texture: enemyGoblinTexture,
  baseHp: 300,
  baseAtk: 11,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 1, [GemType.Green]: 2,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.goblin,
};

// ----- Forest dungeon -----

const SLIME_FOREST: EnemyTemplate = {
  id: 'slime_forest',
  name: 'Forest Slime',
  texture: enemySlimeForestTexture,
  baseHp: 165,
  baseAtk: 5,
  manaGain: {
    [GemType.Red]: 2, [GemType.Blue]: 1, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 0,
  },
  power: ENEMY_POWERS.slime_forest,
};

const GOBLIN_FOREST: EnemyTemplate = {
  id: 'goblin_forest',
  name: 'Forest Goblin',
  texture: enemyGoblinForestTexture,
  baseHp: 210,
  baseAtk: 7,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 0, [GemType.Green]: 2,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.goblin_forest,
};

const BOSS_TREANT: EnemyTemplate = {
  id: 'boss_treant',
  name: 'Ancient Treant',
  texture: bossTreantTexture,
  baseHp: 500,
  baseAtk: 22,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 1, [GemType.Green]: 3,
    [GemType.Yellow]: 2, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.boss_treant,
  isBoss: true,
};

// ----- Crypt dungeon -----

const SKELETON: EnemyTemplate = {
  id: 'skeleton',
  name: 'Skeleton',
  texture: enemySkeletonTexture,
  baseHp: 195,
  baseAtk: 8,
  manaGain: {
    [GemType.Red]: 0, [GemType.Blue]: 2, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.skeleton,
};

const GHOST: EnemyTemplate = {
  id: 'ghost',
  name: 'Ghost',
  texture: enemyGhostTexture,
  baseHp: 150,
  baseAtk: 7,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 1, [GemType.Green]: 0,
    [GemType.Yellow]: 1, [GemType.Purple]: 2,
  },
  power: ENEMY_POWERS.ghost,
};

const BOSS_LICH: EnemyTemplate = {
  id: 'boss_lich',
  name: 'Lich King',
  texture: bossLichTexture,
  baseHp: 600,
  baseAtk: 26,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 2, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 3,
  },
  power: ENEMY_POWERS.boss_lich,
  isBoss: true,
};

// ----- Volcano dungeon -----

const FIRE_ELEMENTAL: EnemyTemplate = {
  id: 'fire_elemental',
  name: 'Fire Elemental',
  texture: enemyFireElementalTexture,
  baseHp: 225,
  baseAtk: 9,
  manaGain: {
    [GemType.Red]: 3, [GemType.Blue]: 0, [GemType.Green]: 1,
    [GemType.Yellow]: 1, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.fire_elemental,
};

const DEMON: EnemyTemplate = {
  id: 'demon',
  name: 'Demon',
  texture: enemyDemonTexture,
  baseHp: 255,
  baseAtk: 10,
  manaGain: {
    [GemType.Red]: 1, [GemType.Blue]: 1, [GemType.Green]: 0,
    [GemType.Yellow]: 2, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.demon,
};

const BOSS_DRAGON: EnemyTemplate = {
  id: 'boss_dragon',
  name: 'Inferno Dragon',
  texture: bossDragonTexture,
  baseHp: 800,
  baseAtk: 30,
  manaGain: {
    [GemType.Red]: 3, [GemType.Blue]: 1, [GemType.Green]: 1,
    [GemType.Yellow]: 2, [GemType.Purple]: 1,
  },
  power: ENEMY_POWERS.boss_dragon,
  isBoss: true,
};

/** Full enemy catalog. */
export const ENEMY_CATALOG: EnemyTemplate[] = [
  SLIME, GOBLIN, GOBLIN_CHIEF,
  SLIME_FOREST, GOBLIN_FOREST, BOSS_TREANT,
  SKELETON, GHOST, BOSS_LICH,
  FIRE_ELEMENTAL, DEMON, BOSS_DRAGON,
];

// ===== Lookup helpers =====
// All consumers go through these so the catalog stays the single source
// of truth. Adding an enemy is one entry above; no map lives elsewhere.

const CATALOG_BY_ID: Record<string, EnemyTemplate> = (() => {
  const map: Record<string, EnemyTemplate> = {};
  for (const e of ENEMY_CATALOG) map[e.id] = e;
  return map;
})();

/** Look up a template by id. Returns undefined for unknown ids. */
export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  return CATALOG_BY_ID[id];
}

/**
 * Resolve an enemy texture by its spriteKey. Falls back to the slime
 * texture so renderers always have something to draw — unknown ids are
 * a programmer error (template missing from the catalog).
 */
export function getEnemyTexture(spriteKey: string): TextureAsset {
  return CATALOG_BY_ID[spriteKey]?.texture ?? enemySlimeTexture;
}

/**
 * Build a runtime Enemy instance from a template id.
 *
 * For regular enemies, pass an `instanceIndex` so multiple copies have
 * unique ids (e.g. `slime_forest_0`, `slime_forest_1`). For bosses, omit
 * it — bosses are singletons and use the template id directly.
 */
export function buildEnemy(templateId: string, instanceIndex?: number): Enemy {
  const t = CATALOG_BY_ID[templateId];
  if (!t) {
    throw new Error(`[EnemyCatalog] Unknown enemy template: ${templateId}`);
  }
  const id = t.isBoss || instanceIndex === undefined
    ? t.id
    : `${t.id}_${instanceIndex}`;
  return {
    id,
    name: t.name,
    maxHp: t.baseHp,
    currentHp: t.baseHp,
    atk: t.baseAtk,
    spriteKey: t.id,
    manaGain: t.manaGain,
    power: t.power,
    currentMana: 0,
    statusEffects: [],
    isBoss: t.isBoss,
  };
}

/**
 * Build a full encounter from an explicit list of enemy template ids.
 * Used by dungeon rooms to spawn hand-crafted encounters — any mix of
 * minions and bosses is valid; the order is front-to-back display order.
 *
 * Each id gets a unique instanceIndex so duplicate templates produce
 * distinct Enemy ids (e.g. `skeleton_0`, `skeleton_1`).
 */
export function buildEncounter(templateIds: string[]): Enemy[] {
  return templateIds.map((id, i) => buildEnemy(id, i));
}

/**
 * Build a scaled encounter for the procedural run system.
 * Applies the same level multiplier as heroes: 1.0 + (level-1) / 9.
 * HP and ATK are both scaled; stats are floored to whole numbers.
 */
export function buildEncounterWithLevel(templateIds: string[], enemyLevel: number): Enemy[] {
  const mult = 1.0 + (Math.max(1, Math.min(10, enemyLevel)) - 1) / 9;
  return templateIds.map((id, i) => {
    const e = buildEnemy(id, i);
    e.maxHp     = Math.max(1, Math.floor(e.maxHp  * mult));
    e.currentHp = e.maxHp;
    e.atk       = Math.max(1, Math.floor(e.atk    * mult));
    return e;
  });
}
