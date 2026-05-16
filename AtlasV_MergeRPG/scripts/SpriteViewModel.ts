/**
 * SpriteViewModel.ts
 *
 * Generic, bindable sprite item used by team_renderer.xaml.
 * One SpriteViewModel = one drawable image with full transform / tint controls.
 *
 * The XAML DataTemplate composites two layers:
 *   1) Image       — the base sprite (always visible)
 *   2) Rectangle   — solid color, masked by the sprite's alpha via OpacityMask
 *                    → silhouette tint for hurt flash, power-up glow, etc.
 *
 * Pool usage: create instances once and mutate their fields each frame.
 * Only reassign the parent collection when sprites are added/removed.
 */
import { uiViewModel, UiViewModel, TextureAsset, type Maybe } from 'meta/worlds';
import { goldIconTexture } from './Assets';

@uiViewModel()
export class SpriteViewModel extends UiViewModel {
  // Position (top-left of the sprite Grid in the parent Canvas)
  public x: number = 0;
  public y: number = 0;

  // Intrinsic sprite size (the inner Grid uses these for layout)
  public width: number = 100;
  public height: number = 100;

  // Render transform (applied around the sprite's center)
  public scale: number = 1;
  public rotation: number = 0;

  // Global alpha applied to the whole sprite Grid (sprite + tint overlay)
  public opacity: number = 1;

  // Texture displayed by both the base Image and the OpacityMask brush
  public spriteTexture: Maybe<TextureAsset> = null;

  // Silhouette tint overlay (color masked by spriteTexture's alpha)
  public tintColor: string = '#FFFFFF';
  public tintOpacity: number = 0; // 0 = no tint, ~0.6 = strong flash

  // Explicit z-order; higher = drawn on top within the parent Canvas
  public zIndex: number = 0;
}

/**
 * Generic floating-text item. Used for damage popups, mana gain numbers,
 * status callouts, etc. Rendered by a separate DataTemplate that uses
 * `noesis:Text.Stroke` for the comic outline.
 *
 * Pool usage: same as SpriteViewModel — instances are created once and
 * mutated; activate by setting opacity > 0 and starting the lifecycle.
 */
@uiViewModel()
export class TextItemViewModel extends UiViewModel {
  // Position of the text Grid (top-left in the parent Canvas)
  public x: number = 0;
  public y: number = 0;

  // Grid dimensions — bind these in XAML so large banners aren't clipped to
  // the default 100×50 damage-popup size.
  public width: number = 100;
  public height: number = 50;

  // Render transform (around the Grid center, like SpriteViewModel)
  public scale: number = 1;
  public rotation: number = 0;
  public opacity: number = 0; // start invisible — activated by spawn

  // Text payload
  public text: string = '';
  public fontSize: number = 36;

  // Fill + stroke (parsed from hex strings by Noesis Color converter)
  public fontColor: string = '#FFFFFF';
  public strokeColor: string = '#000000';
  public strokeThickness: number = 3;

  // Z-order for explicit stacking
  public zIndex: number = 0;
}

/**
 * Chunky JRPG HP bar item. Layout/value driven by the projector; the gradient
 * (green for allies, red for enemies) is hardcoded in the per-team DataTemplate,
 * so this VM stays color-agnostic.
 */
@uiViewModel()
export class HpBarItemViewModel extends UiViewModel {
  // Top-left position of the outer bar (Canvas coords)
  public x: number = 0;
  public y: number = 0;

  // Outer bar dimensions
  public width: number = 70;
  public height: number = 24;

  // Width of the colored inner fill — derives from *currentHp* and updates
  // instantly when damage lands, showing the true remaining HP.
  public fillWidth: number = 0;

  // Width of the white "damage trail" — derives from the smooth-drained
  // displayHp and lags behind fillWidth after a hit.
  public trailWidth: number = 0;

  // Current HP value rendered inside the bar (instant update, not rolling)
  public hpText: string = '0';

  // Mana progression strip (ally bars only). manaFillWidth drives how much
  // of the strip is colored; manaColor is the hero's gem color hex string.
  public manaFillWidth: number = 0;
  public manaColor: string = '#888888';

  // Opacity (set to 0 to hide — used for dead members and empty pool slots)
  public opacity: number = 0;

  // Border color for the outer frame — turns to gem color when power is ready
  public borderColor: string = '#FF000000';
  // Opacity of the inner glow ring — pulsed 0→1 when power is ready
  public borderGlowOpacity: number = 0;
  // Whether to show the CAST! badge above the bar
  public powerReadyVisible: boolean = false;
  // Scale multiplier for the whole bar (lerped to 1.12 when power is ready)
  public barScale: number = 1.0;

  public zIndex: number = 0;
}

/**
 * Hero card slot in the roster-management collection grid. Pool is sized to
 * the visible card count and instances are mutated in place each frame —
 * never re-allocate the parent list.
 */
@uiViewModel()
export class HeroCardItemViewModel extends UiViewModel {
  /** CommandParameter bound on the card's tap + info buttons (collection index as string). */
  public parameter: string = '';
  public name: string = '';
  public texture: Maybe<TextureAsset> = null;
  public inRoster: boolean = false;
  public hpText: string = '';
  public manaColorHex: string = '#FFFFFF';
  /** Level badge text, e.g. "Lv.3" */
  public levelText: string = 'Lv.1';
  /** HP bar fill width in pixels (0..136) */
  public hpFillWidth: number = 0;
  /** HP bar color hex (green/yellow/orange/red by HP ratio) */
  public hpBarColor: string = '#55FF88';
  /** True when HP = 0 — triggers K.O. overlay */
  public isDead: boolean = false;
  /** Recovery countdown text (empty when alive; "Xh Xm" when dead) */
  public recoveryText: string = '';
  /** True when HP < max (hero is healing) — drives healing overlay visibility */
  public isHealing: boolean = false;
  /** False collapses this card slot in the WrapPanel (hero not yet owned) */
  public isVisible: boolean = true;
  /** True on the dedicated buy-card slot; false on all hero card slots */
  public isBuyCard: boolean = false;
  /** Inverse of isBuyCard — avoids needing an InverseBoolToVis converter in XAML */
  public isHeroCard: boolean = true;
  /** Price text shown on the buy card slot (e.g. "100"); unused on hero slots */
  public buyPriceText: string = '';
  /** Gold color (#FFD700) when affordable, red (#FF4444) when not */
  public buyPriceColorHex: string = '#FFD700';
  /** True when this hero slot is free (price = 0) — shows "FREE" label instead of price */
  public buyIsFree: boolean = false;
  /** Inverse of buyIsFree — shows the gold icon + price row */
  public buyShowGoldIcon: boolean = false;
  /** Gold coin texture for the buy card price row */
  public goldIconTexture: Maybe<TextureAsset> = goldIconTexture;
}

/**
 * Roster slot tile in the bottom team panel. Same in-place mutation pattern
 * as HeroCardItemViewModel; the empty/occupied dual layout is driven by
 * `occupied`.
 */
@uiViewModel()
export class RosterSlotItemViewModel extends UiViewModel {
  /** CommandParameter bound on the slot button (slot index as string). */
  public parameter: string = '';
  public occupied: boolean = false;
  public name: string = '';
  public texture: Maybe<TextureAsset> = null;
  public hpText: string = '';
  public manaColorHex: string = '#FFFFFF';
  /** Level badge text, e.g. "Lv.3" */
  public levelText: string = 'Lv.1';
  /** HP bar fill width in pixels (0..123) */
  public hpFillWidth: number = 0;
  /** HP bar color hex (green/yellow/orange/red by HP ratio) */
  public hpBarColor: string = '#55FF88';
  /** True when HP = 0 — triggers K.O. overlay */
  public isDead: boolean = false;
  /** Recovery countdown text (empty when alive) */
  public recoveryText: string = '';
}

/**
 * Victory hero card for the JRPG victory screen.
 * One per roster hero, mutated in place each frame by VictoryAnimator.
 */
@uiViewModel()
export class VictoryHeroViewModel extends UiViewModel {
  public heroName: string = '';
  public texture: Maybe<TextureAsset> = null;
  public levelText: string = 'Lv.1';
  public xpBarFillWidth: number = 0; // 0..120 (pixel width of fill rect)
  public xpGainedText: string = '';
  public cardScaleX: number = 1.0;
  public cardScaleY: number = 1.0;
  public levelUpVisible: boolean = false;
  /** Animated scale for the LEVEL UP! overlay: pop-in then pulse (driven by VictoryAnimator). */
  public levelUpTextScale: number = 1.0;
  public glowOpacity: number = 0;
  public manaColorHex: string = '#FFFFFF';
  public hpText: string = '';
  /** HP bar fill width in pixels (0..116) */
  public hpFillWidth: number = 0;
  /** True when HP = 0 — triggers K.O. overlay */
  public isDead: boolean = false;
}

/**
 * Hero card for the JRPG defeat / flee result screen.
 * One per roster hero; populated once by GameComponent when the screen opens.
 */
@uiViewModel()
export class DefeatHeroViewModel extends UiViewModel {
  public heroName: string = '';
  public texture: Maybe<TextureAsset> = null;
  public manaColorHex: string = '#FFFFFF';
  /** True when HP = 0 — triggers K.O. overlay */
  public isDead: boolean = false;
  /** "K.O." or "HP/MAX" */
  public hpText: string = '';
  /** HP bar fill width in pixels (0..124) */
  public hpFillWidth: number = 0;
  /** Hex color for the HP bar fill (varies by HP ratio or red for dead) */
  public hpBarColor: string = '#FF3333';
  /** Dim the card body when dead; K.O. overlay is always full opacity. */
  public cardOpacity: number = 1.0;
}

@uiViewModel()
export class TeamRendererViewModel extends UiViewModel {
  /**
   * Bindable list of sprites. Reassign the array reference only when the
   * sprite count changes; mutate existing instances for per-frame updates.
   */
  public sprites: readonly SpriteViewModel[] = [];

  /**
   * Bindable list of floating-text items (damage popups, etc.). Pool is
   * assigned once at init; individual VMs are activated/updated in place.
   */
  public texts: readonly TextItemViewModel[] = [];

  /**
   * 3 ally HP bars rendered above the left half of the board. Pool is
   * assigned once; the projector positions/fills each entry per frame.
   */
  public allyHpBars: readonly HpBarItemViewModel[] = [];

  /**
   * 3 enemy HP bars (mirrored on the right half).
   */
  public enemyHpBars: readonly HpBarItemViewModel[] = [];
}
