/**
 * ShopZoneViewModel
 *
 * Root ViewModel for the Shop Zone UI (bottom of screen).
 * Contains tab bar data and the scrollable shop items list.
 * Data is fed by ShopZoneController from ActionService.
 */
import { uiViewModel, UiViewModel, UiEvent, serializable } from 'meta/worlds';
import type { Maybe, TextureAsset } from 'meta/worlds';
import { iconTabMining, iconTabUpgrade, iconTabCoins } from './Assets';

// ── Tab click event ─────────────────────────────────────────────────────────
@serializable()
export class ShopZoneTabClickedPayload {
  readonly parameter: string = '';
}

export const shopZoneTabClickedEvent = new UiEvent(
  'ShopZoneViewModel-shopZoneTabClicked',
  ShopZoneTabClickedPayload,
);

// ── Shop item buy event ─────────────────────────────────────────────────────
@serializable()
export class ShopItemBuyPayload {
  readonly parameter: string = ''; // ActionId from CommandParameter
}

export const shopItemBuyEvent = new UiEvent(
  'ShopZoneViewModel-shopItemBuy',
  ShopItemBuyPayload,
);

@uiViewModel()
export class ShopTabViewModel extends UiViewModel {
  public icon: Maybe<TextureAsset> = null;
  public label: string = '';
  public isActive: boolean = false;
}

@uiViewModel()
export class ShopItemViewModel extends UiViewModel {
  public actionId: string = '';
  public icon: Maybe<TextureAsset> = null;
  public currencyIcon: Maybe<TextureAsset> = null;
  public countText: string = '';
  /** True when countText has a value — drives count badge visibility in XAML. */
  public hasCount: boolean = false;
  public name: string = '';
  public description: string = '';
  public priceLabel: string = '';
  public canAfford: boolean = true;
  /** True when the action has reached its maxCount — button shows MAX and is disabled. */
  public isMaxed: boolean = false;
  /** False for MAX button and free/zero-cost actions — hides the gem icon in the buy button. */
  public showCurrencyIcon: boolean = true;
  /** Generation progress bar — only shown for MINING buy items that have owned units. */
  public showGenProgress: boolean = false;
  public genProgressPercent: number = 0;
  public genProgressText: string = '';
}

@uiViewModel()
export class ShopZoneViewModel extends UiViewModel {
  public activeTab: string = 'MINING';
  public tabs: readonly ShopTabViewModel[] = [];
  public shopItems: readonly ShopItemViewModel[] = [];

  override readonly events = {
    shopZoneTabClicked: shopZoneTabClickedEvent,
    shopItemBuy: shopItemBuyEvent,
  };

  /** Switch the active tab (controller will repopulate shopItems). */
  public switchTab(tabLabel: string): void {
    if (this.activeTab === tabLabel) return;
    this.activeTab = tabLabel;

    const updatedTabs: ShopTabViewModel[] = [];
    for (const tab of this.tabs) {
      tab.isActive = tab.label === tabLabel;
      updatedTabs.push(tab);
    }
    this.tabs = updatedTabs;
  }
}

/** Creates the ViewModel with empty items — controller rebuilds on actions. */
export function createShopZoneViewModel(): ShopZoneViewModel {
  const vm = new ShopZoneViewModel();

  const tabMining = new ShopTabViewModel();
  tabMining.icon = iconTabMining;
  tabMining.label = 'MINING';
  tabMining.isActive = true;

  const tabUpgrades = new ShopTabViewModel();
  tabUpgrades.icon = iconTabUpgrade;
  tabUpgrades.label = 'UPGRADES';
  tabUpgrades.isActive = false;

  const tabPerks = new ShopTabViewModel();
  tabPerks.icon = iconTabCoins;
  tabPerks.label = 'PERKS';
  tabPerks.isActive = false;

  vm.tabs = [tabMining, tabUpgrades, tabPerks];
  vm.activeTab = 'MINING';
  vm.shopItems = [];

  return vm;
}
