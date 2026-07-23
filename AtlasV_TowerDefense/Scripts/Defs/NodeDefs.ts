/**
 * NodeDefs.ts — Overworld node type definitions.
 *
 * Each node type references its three sprite assets for each visual state:
 *   - default/beaten: shown when the level has been completed
 *   - locked: shown when the level is not yet available
 *   - open: shown when the level is the next one to play
 *
 * Node type assignment rules:
 *   1. The LAST node is always a Boss node.
 *   2. Every 3rd node (indices 2, 5, 8, ...) is a Minigame node, unless it's the last (boss) node.
 *   3. All other nodes are Combat nodes.
 *   Pattern: Combat, Combat, Minigame, Combat, Combat, Minigame, ... Boss
 */

export enum OverworldNodeType {
  Combat = 'combat',
  Boss = 'boss',
  Minigame = 'minigame',
}

export interface INodeTypeDef {
  id: OverworldNodeType;
  name: string;
  /** Sprite shown in the beaten (completed) state */
  spriteDefault: string;
  /** Sprite shown in the locked state */
  spriteLocked: string;
  /** Sprite shown in the open (next-to-play) state */
  spriteOpen: string;
}

export const NODE_TYPE_DEFS: Record<OverworldNodeType, INodeTypeDef> = {
  [OverworldNodeType.Combat]: {
    id: OverworldNodeType.Combat,
    name: 'Combat',
    spriteDefault: 'sprites/overworld_node_combat.png',
    spriteLocked: 'sprites/overworld_node_combat_locked.png',
    spriteOpen: 'sprites/overworld_node_combat_open.png',
  },
  [OverworldNodeType.Boss]: {
    id: OverworldNodeType.Boss,
    name: 'Boss',
    spriteDefault: 'sprites/overworld_node_boss.png',
    spriteLocked: 'sprites/overworld_node_boss_locked.png',
    spriteOpen: 'sprites/overworld_node_boss_open.png',
  },
  [OverworldNodeType.Minigame]: {
    id: OverworldNodeType.Minigame,
    name: 'Minigame',
    spriteDefault: 'sprites/overworld_node_minigame.png',
    spriteLocked: 'sprites/overworld_node_minigame_locked.png',
    spriteOpen: 'sprites/overworld_node_minigame_open.png',
  },
};
