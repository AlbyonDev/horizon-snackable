/**
 * HeroCollectionViewModel.ts
 *
 * ViewModel for the hero collection / roster management screen.
 * Shows hero cards, roster slots, and detail overlay.
 */
import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';
import type { TextureAsset, Maybe } from 'meta/worlds';
import {
  HeroCardItemViewModel,
  RosterSlotItemViewModel,
} from './SpriteViewModel';
import {
  gemRedTexture,
  gemBlueTexture,
  gemGreenTexture,
  gemYellowTexture,
  gemPurpleTexture,
  iconCloseTexture,
  goldIconTexture,
} from './Assets';

// ===== Events =====

@serializable()
export class HeroCardClickPayload {
  readonly parameter: string = "";
}

export const onHeroCardClicked = new UiEvent('onHeroCardClicked', HeroCardClickPayload);
export const onHeroCardInfoClicked = new UiEvent('onHeroCardInfoClicked', HeroCardClickPayload);
export const onRosterSlotClicked = new UiEvent('onRosterSlotClicked', HeroCardClickPayload);
export const onDetailCloseClicked = new UiEvent('onDetailCloseClicked');
export const onRosterBackClicked = new UiEvent('onRosterBackClicked');
export const onRosterEnterDungeonClicked = new UiEvent('onRosterEnterDungeonClicked');
export const onBuyCardClicked = new UiEvent('onBuyCardClicked');
export const onBuyConfirmYes = new UiEvent('onBuyConfirmYes');
export const onBuyConfirmNo = new UiEvent('onBuyConfirmNo');
export const onBuyResultClose = new UiEvent('onBuyResultClose');
export const onHealConfirmYes = new UiEvent('onHealConfirmYes');
export const onHealConfirmNo = new UiEvent('onHealConfirmNo');

// ===== Helper =====
function makePool<T>(size: number, build: (i: number) => T): readonly T[] {
  const out: T[] = [];
  for (let i = 0; i < size; i++) out.push(build(i));
  return out;
}

// ===== ViewModel =====

@uiViewModel()
export class HeroCollectionViewModel extends UiViewModel {
  // Gold counter
  goldText: string = '0';

  // Hero collection cards — 15 hero slots + 1 buy card slot at index 15.
  // Hero slots start hidden; buy card slot visibility is managed by GameComponent.
  heroCards: readonly HeroCardItemViewModel[] = makePool(16, i => {
    const vm = new HeroCardItemViewModel();
    vm.parameter = String(i);
    vm.isVisible = false;
    if (i === 15) {
      vm.isBuyCard = true;
      vm.isHeroCard = false;
      vm.parameter = 'buy';
    }
    return vm;
  });

  // Detail overlay
  detailOverlayVisible: boolean = false;
  detailName: string = '';
  detailTexture: Maybe<TextureAsset> = null;
  detailAtkText: string = '0';
  detailHpText: string = '0/0';
  detailPowerName: string = '';
  detailPowerDesc: string = '';
  detailManaColorHex: string = '#FFFFFF';
  detailManaCost: string = '0';

  // Close button icon
  closeIconTexture: Maybe<TextureAsset> = iconCloseTexture;

  // Gold icon texture
  goldIconTexture: Maybe<TextureAsset> = goldIconTexture;

  // Gem textures for detail panel damage section
  redGemTexture: Maybe<TextureAsset> = gemRedTexture;
  blueGemTexture: Maybe<TextureAsset> = gemBlueTexture;
  greenGemTexture: Maybe<TextureAsset> = gemGreenTexture;
  yellowGemTexture: Maybe<TextureAsset> = gemYellowTexture;
  purpleGemTexture: Maybe<TextureAsset> = gemPurpleTexture;

  /** Gem texture for the power cost display (matches hero mana color) */
  detailCostGemTexture: Maybe<TextureAsset> = null;

  // Damage-per-color table
  detailLevelText: string = 'Lv.1';
  /** HP bar fill width in pixels (0..300) */
  detailHpFillWidth: number = 0;
  /** HP bar color hex (green/yellow/orange/red by HP ratio) */
  detailHpBarColor: string = '#55FF88';
  /** XP bar fill width in pixels (0..300) */
  detailXpFillWidth: number = 0;
  /** XP progress text inside the XP bar, e.g. "450 / 600" or "MAX" */
  detailXpText: string = '';
  /** Recovery text — empty when alive, populated when HP = 0 */
  detailRecoveryText: string = '';
  /** Dynamic color for the HP value text (matches HP bar color) */
  detailHpColor: string = '#55FF88';
  /** Dynamic color for the recovery countdown text (green healing / orange dead) */
  detailRecoveryColor: string = '#88FF88';

  detailDmgRed: string = '0';
  detailDmgBlue: string = '0';
  detailDmgGreen: string = '0';
  detailDmgYellow: string = '0';
  detailDmgPurple: string = '0';
  detailMultRed: string = '0.0x';
  detailMultBlue: string = '0.0x';
  detailMultGreen: string = '0.0x';
  detailMultYellow: string = '0.0x';
  detailMultPurple: string = '0.0x';

  // ===== Buy card =====
  buyCardVisible: boolean = false;
  buyPriceText: string = '';
  buyPriceColorHex: string = '#FFD700';
  buyCanAfford: boolean = true;

  // ===== Buy popup =====
  buyPopupVisible: boolean = false;

  // ===== Heal popup =====
  healPopupVisible: boolean = false;
  healHeroName: string = '';
  healConfirmPriceText: string = '50';
  healCanAfford: boolean = true;
  healPriceColorHex: string = '#FFD700';
  // Confirm phase
  buyConfirmVisible: boolean = false;
  buyConfirmPriceText: string = '';
  // Roll phase
  buyRollVisible: boolean = false;
  buyRollHeroName: string = '';
  buyRollHeroTexture: Maybe<TextureAsset> = null;
  buyRollHeroManaColor: string = '#FFFFFF';
  // Result phase
  buyResultVisible: boolean = false;
  buyResultHeroName: string = '';
  buyResultHeroTexture: Maybe<TextureAsset> = null;
  buyResultHeroManaColor: string = '#FFFFFF';

  // Roster slots (3)
  rosterSlots: readonly RosterSlotItemViewModel[] = makePool(3, i => {
    const vm = new RosterSlotItemViewModel();
    vm.parameter = String(i);
    return vm;
  });
  rosterCanEnterDungeon: boolean = false;
  /** Label for the Enter Dungeon button — changes to "Continue Run (X/4)" mid-run. */
  enterDungeonButtonText: string = 'Enter Dungeon';

  override readonly events = {
    onHeroCardClicked,
    onHeroCardInfoClicked,
    onRosterSlotClicked,
    onDetailCloseClicked,
    onRosterBackClicked,
    onRosterEnterDungeonClicked,
    onBuyCardClicked,
    onBuyConfirmYes,
    onBuyConfirmNo,
    onBuyResultClose,
    onHealConfirmYes,
    onHealConfirmNo,
  };
}

export const heroCollectionVM = new HeroCollectionViewModel();
