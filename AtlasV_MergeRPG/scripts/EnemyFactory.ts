/**
 * EnemyFactory
 *
 * Default (non-dungeon) encounter roster. All stats / mana tables / powers
 * live in EnemyCatalog — this file only picks which templates appear in
 * the default encounter.
 */
import type { Enemy } from './TeamTypes';
import { buildEnemy } from './EnemyCatalog';

export function createSlime(): Enemy { return buildEnemy('slime', 1); }
export function createGoblin(): Enemy { return buildEnemy('goblin', 1); }
export function createGoblinChief(): Enemy { return buildEnemy('goblin_chief', 2); }

/** Default starting encounter. */
export function defaultEncounter(): Enemy[] {
  return [createSlime(), createGoblin(), createGoblinChief()];
}
