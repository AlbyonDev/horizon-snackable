/**
 * GameViewModel.ts (TRIMMED)
 *
 * Combat-board-only ViewModel. Dungeon selection, roster, dungeon map,
 * and victory/defeat state have moved to their own ViewModels.
 */
import { uiViewModel, UiViewModel, UiEvent, DrawingCommandData } from 'meta/custom_ui';
import { TextureAsset, type Maybe } from 'meta/worlds';

import {
  TeamRendererViewModel,
} from './SpriteViewModel';
import {
  dungeonBackgroundTexture,
  gemRedTexture,
  gemBlueTexture,
  gemGreenTexture,
  gemYellowTexture,
  gemPurpleTexture,
} from './Assets';

// ===== Combat-board events (stay here) =====
export const onRestartClicked = new UiEvent('onRestartClicked');
export const onFleeClicked = new UiEvent('onFleeClicked');
export const onPowerCastClicked = new UiEvent('onPowerCastClicked');

@uiViewModel()
export class GameViewModel extends UiViewModel {
  // DrawingSurface commands for the game board
  drawCommands: DrawingCommandData = new DrawingCommandData();

  // Background texture for the combat/team area
  backgroundTexture: Maybe<TextureAsset> = dungeonBackgroundTexture;

  // Team layer (XAML ItemsControl)
  team: TeamRendererViewModel = new TeamRendererViewModel();

  /** False while the fullscreen power cinematic is playing */
  gameUiVisible: boolean = true;

  /** True only during the fullscreen Cinematic phase — drives the XAML text overlay */
  cinematicTextVisible: boolean = false;
  /** Fades in/out with the cinematic background (0–1) */
  cinematicAlpha: number = 0;
  /** Caster or enemy name shown small above the power name */
  cinematicCasterName: string = '';
  /** Power name shown large in the cinematic strip */
  cinematicPowerName: string = '';
  /** Primary VFX colour for the power name text (hex, e.g. "#FF4444") */
  cinematicPowerColorHex: string = '#FFFFFF';

  // HUD state
  comboText: string = '';

  // Shuffle status
  shuffleText: string = '';

  // Mana counter
  redManaText: string = '0/20';
  blueManaText: string = '0/20';
  greenManaText: string = '0/20';
  yellowManaText: string = '0/20';
  purpleManaText: string = '0/20';

  // Gem textures for mana orbs
  redGemTexture: Maybe<TextureAsset> = gemRedTexture;
  blueGemTexture: Maybe<TextureAsset> = gemBlueTexture;
  greenGemTexture: Maybe<TextureAsset> = gemGreenTexture;
  yellowGemTexture: Maybe<TextureAsset> = gemYellowTexture;
  purpleGemTexture: Maybe<TextureAsset> = gemPurpleTexture;

  // Power preview panel
  powerPreviewVisible: boolean = false;
  powerHeroName: string = '';
  powerName: string = '';
  powerDescription: string = '';
  powerManaColorHex: string = '#FFFFFF';
  powerManaCost: string = '0';
  powerCurrentMana: string = '0';
  powerCanCast: boolean = false;
  powerHeroTexture: Maybe<TextureAsset> = null;
  powerGemTexture: Maybe<TextureAsset> = null;

  // Dungeon progress info (displayed during combat)
  dungeonNameText: string = '';
  dungeonRoomText: string = '';
  levelText: string = 'Lv.1';
  xpText: string = '0/100';

  // Legacy game over (kept for backward compat)
  gameOverVisible: boolean = false;
  finalScoreText: string = '';

  override readonly events = {
    onRestartClicked,
    onFleeClicked,
    onPowerCastClicked,
  };
}
