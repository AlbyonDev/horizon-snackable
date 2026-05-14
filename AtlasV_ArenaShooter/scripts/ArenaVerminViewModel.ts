// Arena Vermin — ViewModel (XAML sprite rendering + HUD)
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';
import { TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CharacterSpriteViewModel } from './CharacterSpriteViewModel';

export const onStartClicked = new UiEvent('onStartClicked');
export const onPauseClicked = new UiEvent('onPauseClicked');
export const onResumeClicked = new UiEvent('onResumeClicked');
export const onRestartClicked = new UiEvent('onRestartClicked');
export const onRetryClicked = new UiEvent('onRetryClicked');
export const onReturnToMenuClicked = new UiEvent('onReturnToMenuClicked');
export const onUpgrade0Clicked = new UiEvent('onUpgrade0Clicked');
export const onUpgrade1Clicked = new UiEvent('onUpgrade1Clicked');
export const onUpgrade2Clicked = new UiEvent('onUpgrade2Clicked');

@uiViewModel()
export class ArenaVerminViewModel extends UiViewModel {
  drawCommands: DrawingCommandData = new DrawingCommandData();
  critDrawCommands: DrawingCommandData = new DrawingCommandData();
  titleVisible: boolean = true;

  // === Character Sprites Collection (ItemsControl binding) ===
  // Replaces all numbered enemy/hero/flash/weapon slot properties.
  // Collection is replaced to trigger XAML re-evaluation when pool size changes.
  // Individual item properties are updated in-place each frame for performance.
  characterSprites: readonly CharacterSpriteViewModel[] = [];

  // === HUD Properties (Milestone 3) ===
  hudVisible: boolean = false;

  // HUD sprite textures
  hudCoinCountTexture: Maybe<TextureAsset> = null;
  hudEnnemiCountTexture: Maybe<TextureAsset> = null;
  hudLevelBarTexture: Maybe<TextureAsset> = null;
  hudTimerBoardTexture: Maybe<TextureAsset> = null;
  hudWaveBarContourTexture: Maybe<TextureAsset> = null;
  hudWaveBarInTexture: Maybe<TextureAsset> = null;
  hudPauseButtonTexture: Maybe<TextureAsset> = null;
  hudCartoucheTexture: Maybe<TextureAsset> = null;

  hpBarWidth: number = 290;
  hpBarColorHex: string = '#40C040';
  hpText: string = '100 / 100';
  levelBarWidth: number = 0;
  levelBarText: string = '0 / 20';
  waveNumber: number = 1;
  playerLevel: number = 1;
  timerBarWidth: number = 218;
  timerColorHex: string = '#50D050';
  waveBarWidth: number = 0;
  enemyCountText: string = '0';
  coinCountText: string = '0';
  pauseMenuVisible: boolean = false;
  waveAnnouncementText: string = '';
  waveAnnouncementVisible: boolean = false;

  // === Elite Warning ===
  eliteWarningVisible: boolean = false;

  // === Boss HP Bar & Warning ===
  bossHpBarVisible: boolean = false;
  bossHpBarWidth: number = 0;
  bossHpBarText: string = '';
  bossWarningVisible: boolean = false;

  // === Upgrade Selection Screen ===
  upgradeScreenVisible: boolean = false;
  upgrade0Name: string = '';
  upgrade0Desc: string = '';
  upgrade0Level: string = '';
  upgrade1Name: string = '';
  upgrade1Desc: string = '';
  upgrade1Level: string = '';
  upgrade2Name: string = '';
  upgrade2Desc: string = '';
  upgrade2Level: string = '';
  upgrade0Visible: boolean = false;
  upgrade1Visible: boolean = false;
  upgrade2Visible: boolean = false;

  // === Death Screen ===
  deathOverlayVisible: boolean = false;
  deathOverlayOpacity: number = 0;
  deathScreenVisible: boolean = false;
  deathWavesText: string = '';
  deathCoinsText: string = '';
  deathXpText: string = '';

  override readonly events = {
    onStartClicked,
    onPauseClicked,
    onResumeClicked,
    onRestartClicked,
    onRetryClicked,
    onReturnToMenuClicked,
    onUpgrade0Clicked,
    onUpgrade1Clicked,
    onUpgrade2Clicked,
  };
}
