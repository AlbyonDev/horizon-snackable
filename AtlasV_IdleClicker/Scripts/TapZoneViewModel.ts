/**
 * TapZoneViewModel
 *
 * Root ViewModel for the "Tap to Earn" zone UI (middle of screen).
 * Holds resource display data, gem deposit transform bindings,
 * and a collection of cursor sub-ViewModels (one per owned auto-clicker).
 */
import { uiViewModel, UiViewModel, TextureAsset } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CrystalShardViewModel } from './CrystalShardViewModel';

@uiViewModel()
export class TapZoneCursorViewModel extends UiViewModel {
  public positionX: number = 0;
  public positionY: number = 0;
  public rotation: number = 0;
  public scale: number = 1;
  /** Pre-signed windup angle (-30 for right-side, +30 for left-side cursors). */
  public swingWindup: number = -30;
  /** Pre-signed follow-through angle (+20 for right-side, -20 for left-side cursors). */
  public swingStrike: number = 20;
  /** Pre-signed lunge distance (+18 for right-side, -18 for left-side cursors). */
  public lungeStrike: number = 18;
  /** Pre-signed lunge pullback (-10 for right-side, +10 for left-side cursors). */
  public lungeWindup: number = -10;
  public flipX: number = 1;
  public icon: Maybe<TextureAsset> = null;
  /** Increment to play the swing/pop storyboard once. */
  public animationTrigger: number = 0;
}

@uiViewModel()
export class TapZoneViewModel extends UiViewModel {
  public backgroundImage: Maybe<TextureAsset> = null;

  public resourceText: string = '0';
  public resourceIcon: Maybe<TextureAsset> = null;

  public gemDepositImage: Maybe<TextureAsset> = null;

  public gemPositionX: number = 0;
  public gemPositionY: number = 0;
  public gemRotation: number = 0;
  public gemScale: number = 1;

  /** Increment to play the gem deposit pop/shake storyboard once. */
  public gemAnimationTrigger: number = 0;

  /** Player tap pickaxe — separate from auto-cursors so it's visible from frame 0. */
  public playerPickaxeIcon: Maybe<TextureAsset> = null;
  /** Position offset from the pickaxe's default anchor, in canvas pixels. */
  public playerPickaxeX: number = 0;
  public playerPickaxeY: number = 0;
  /** -1 when tapping the left half — flips the sprite horizontally (applied on outer border, independent of swing animation). */
  public playerPickaxeFlip: number = 1;
  /** Increment to play the player pickaxe swing (right-side tap). */
  public playerPickaxeTrigger: number = 0;
  /** Increment to play the player pickaxe swing mirrored (left-side tap). */
  public playerPickaxeTriggerLeft: number = 0;

  public cursors: readonly TapZoneCursorViewModel[] = [];

  public shards: readonly CrystalShardViewModel[] = [];

  public tapToEarnVisible: boolean = true;

  // ── Bonus mini-gem ────────────────────────────────────────────────────────
  /** Sprite for the bonus mini-gem (reuses gem_deposit.png scaled down). */
  public bonusGemImage: Maybe<TextureAsset> = null;
  /** Whether the bonus gem is currently on screen. */
  public bonusGemVisible: boolean = false;
  /** Bonus gem center position in the 480×850 canvas. */
  public bonusGemX: number = 240;
  public bonusGemY: number = 320;
  /** Increment to play the pulse / shimmer animation. */
  public bonusGemPulseTrigger: number = 0;
  /** Increment to play the pop-out animation when collected. */
  public bonusGemCollectTrigger: number = 0;

  override readonly events = {};
}

/** Creates the root ViewModel with default values (no cursors initially). */
export function createTapZoneViewModel(): TapZoneViewModel {
  const vm = new TapZoneViewModel();

  vm.backgroundImage = new TextureAsset('@sprites/tap_zone_background.png');
  vm.resourceText = '0';
  vm.resourceIcon = new TextureAsset('@sprites/icon_gem_resource.png');
  vm.gemDepositImage = new TextureAsset('@sprites/gem_deposit.png');
  vm.gemPositionX = 0;
  vm.gemPositionY = 20;
  vm.gemRotation = -3;
  vm.gemScale = 1;
  vm.playerPickaxeIcon = new TextureAsset('@sprites/pickaxe_cursor.png');
  vm.cursors = [];

  vm.bonusGemImage = new TextureAsset('@sprites/gem_deposit.png');

  return vm;
}
