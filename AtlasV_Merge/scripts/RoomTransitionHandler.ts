/**
 * RoomTransitionHandler.ts
 *
 * Manages transitions between rooms in a procedural run:
 * - Awards room rewards (XP distributed per-hero via RosterManager)
 * - Resets status effects for next room (HP persists, mana reset externally)
 * - Builds the enemy encounter for the current room with level scaling
 */
import { DungeonState } from './DungeonState';
import { RosterManager } from './RosterManager';
import { type RoomReward } from './DungeonTypes';
import { buildEncounterWithLevel } from './EnemyCatalog';
import type { Hero, Enemy } from './TeamTypes';

export class RoomTransitionHandler {
  private dungeonState: DungeonState;
  private rosterManager: RosterManager;

  constructor(dungeonState: DungeonState, rosterManager: RosterManager) {
    this.dungeonState = dungeonState;
    this.rosterManager = rosterManager;
  }

  /**
   * Process the completion of the current room.
   * Awards XP evenly to ALL roster heroes via RosterManager.
   * Returns the reward, whether there are more rooms, and level-ups per hero.
   */
  processRoomComplete(heroes: Hero[]): { reward: RoomReward; hasNextRoom: boolean; levelsGained: Map<string, number> } {
    const reward = this.dungeonState.completeRoom();

    const rosterIds = this.rosterManager.getRosterIds();
    // Heroes who died mid-combat are spliced out of teamState by reorganizeHeroes(),
    // so they won't appear in `heroes` at all — use an "alive in combat" set instead
    // of a dead-id exclusion to handle both cases (present+dead and absent).
    const aliveInCombat = new Set(heroes.filter(h => h.currentHp > 0).map(h => h.id));
    const aliveRosterIds = rosterIds.filter(id => aliveInCombat.has(id));
    const levelsGained = this.rosterManager.addXpToHeroes(aliveRosterIds, reward.xp);

    const totalLevels = Array.from(levelsGained.values()).reduce((sum, v) => sum + v, 0);
    if (totalLevels > 0) {
    }

    const hasNextRoom = this.dungeonState.advanceToNextRoom();
    return { reward, hasNextRoom, levelsGained };
  }

  /**
   * Build the enemy encounter for the current room, applying the room's
   * enemy level scaling.
   */
  getNextRoomEnemies(): Enemy[] {
    const room = this.dungeonState.currentRoom;
    if (!room) return [];
    return buildEncounterWithLevel(room.enemies, room.enemyLevel);
  }

  /**
   * Prepare heroes for the next room:
   * - HP persists (no healing)
   * - Clear all status effects
   * Note: Mana is reset by the mana bank externally.
   */
  prepareHeroesForNextRoom(heroes: Hero[]): void {
    for (const hero of heroes) {
      hero.statusEffects = [];
    }
  }

  getDungeonState(): DungeonState { return this.dungeonState; }
  getRosterManager(): RosterManager { return this.rosterManager; }
}
