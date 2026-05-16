/**
 * DungeonMapViewModel.ts
 *
 * ViewModel for the dungeon map screen.
 * Shows room nodes (completed/current/locked), gold, and level.
 */
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';

// ===== Events =====
export const onEnterBattleClicked = new UiEvent('onEnterBattleClicked');
export const onFleeDungeonClicked = new UiEvent('onFleeDungeonClicked');

// ===== ViewModel =====

@uiViewModel()
export class DungeonMapViewModel extends UiViewModel {
  // Title
  dungeonMapTitle: string = '';

  // Room 1
  room1Label: string = 'Room 1';
  room1Completed: boolean = false;
  room1Current: boolean = false;
  room1Locked: boolean = true;

  // Room 2
  room2Label: string = 'Room 2';
  room2Completed: boolean = false;
  room2Current: boolean = false;
  room2Locked: boolean = true;

  // Room 3 (Boss)
  room3Label: string = 'BOSS';
  room3Completed: boolean = false;
  room3Current: boolean = false;
  room3Locked: boolean = true;

  // HUD info
  dungeonMapGoldText: string = '0';
  dungeonMapLevelText: string = 'Lv.1';

  override readonly events = {
    onEnterBattleClicked,
    onFleeDungeonClicked,
  };
}

export const dungeonMapVM = new DungeonMapViewModel();
