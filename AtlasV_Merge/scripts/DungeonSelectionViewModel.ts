/**
 * DungeonSelectionViewModel.ts
 *
 * ViewModel for the dungeon selection screen.
 * Shows available dungeons and a "Manage Team" button.
 */
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';

// ===== Events =====

@serializable()
export class DungeonSelectPayload {
  readonly parameter: string = "";
}

/** Parameterized dungeon selection. CommandParameter = DungeonId string. */
export const onDungeonSelectClicked = new UiEvent('onDungeonSelectClicked', DungeonSelectPayload);
export const onManageTeamClicked = new UiEvent('onManageTeamClicked');

// ===== ViewModel =====

@uiViewModel()
export class DungeonSelectionViewModel extends UiViewModel {
  // Average party level display
  levelText: string = 'Avg Lv.1';
  xpText: string = '';

  override readonly events = {
    onDungeonSelectClicked,
    onManageTeamClicked,
  };
}

export const dungeonSelectionVM = new DungeonSelectionViewModel();
