/**
 * VictoryDefeatViewModel.ts
 *
 * ViewModel for the victory/defeat result screen.
 * Covers: flee/defeat result, JRPG victory animation, and dungeon complete overlay.
 */
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import type { TextureAsset, Maybe } from 'meta/worlds';
import { VictoryHeroViewModel, DefeatHeroViewModel } from './SpriteViewModel';
import { goldIconTexture as goldIconAsset } from './Assets';

// ===== Events =====
export const onReturnClicked = new UiEvent('onReturnClicked');
export const onDungeonContinueClicked = new UiEvent('onDungeonContinueClicked');
export const onDungeonExitClicked = new UiEvent('onDungeonExitClicked');

// ===== Helper =====
function makePool<T>(size: number, build: (i: number) => T): readonly T[] {
  const out: T[] = [];
  for (let i = 0; i < size; i++) out.push(build(i));
  return out;
}

// ===== ViewModel =====

@uiViewModel()
export class VictoryDefeatViewModel extends UiViewModel {
  // Defeat / Flee screen (JRPG-style)
  resultScreenVisible: boolean = false;
  /** "DEFEAT" or "FLED..." */
  defeatTitle: string = 'DEFEAT';
  /** Hex color for the title text — red for defeat, amber for flee */
  defeatTitleColor: string = '#FF3333';
  /** Flavour subtitle */
  defeatSubtitle: string = '';
  /** "Reached Room X / Y" */
  defeatRoomsText: string = '';
  defeatHeroes: readonly DefeatHeroViewModel[] = makePool(3, () => new DefeatHeroViewModel());

  // Victory screen (JRPG-style with animated XP bars)
  victoryScreenVisible: boolean = false;
  victoryScreenActive: boolean = false;
  victoryTitle: string = 'VICTORY!';
  victoryGoldText: string = '';
  victoryTotalXpText: string = '';
  victoryContinueVisible: boolean = false;
  victoryExitVisible: boolean = false;
  victoryHeroes: readonly VictoryHeroViewModel[] = makePool(3, () => new VictoryHeroViewModel());

  // Gold icon texture
  goldIconTexture: Maybe<TextureAsset> = goldIconAsset;

  // Room reward overlay
  roomRewardVisible: boolean = false;
  roomRewardTitle: string = '';
  roomRewardXpText: string = '';
  roomRewardGoldText: string = '';
  roomRewardLevelUpText: string = '';
  goldTotalText: string = '0';

  // Dungeon completion overlay
  dungeonCompleteVisible: boolean = false;
  dungeonCompleteTitle: string = '';
  dungeonCompleteTotalXp: string = '';
  dungeonCompleteTotalGold: string = '';
  dungeonCompleteNewLevel: string = '';

  override readonly events = {
    onReturnClicked,
    onDungeonContinueClicked,
    onDungeonExitClicked,
  };
}

export const victoryDefeatVM = new VictoryDefeatViewModel();
