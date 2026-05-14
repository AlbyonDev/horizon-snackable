/**
 * ShopZoneController
 *
 * Component Attachment: Scene Entity (with CustomUiComponent)
 * Component Networking: Local (client-side UI only)
 *
 * Drives the shop list from ActionService:
 *   - Subscribes to ActionRegistryChanged → rebuilds item list filtered by tab
 *   - Tab click → switches active tab + rebuilds
 *   - Item buy click → ActionService.get().trigger(actionId)
 *
 * Tab mapping (thematic):
 *   MINING   = generator.buy.*  + tap.buy
 *   UPGRADES = generator.upgrade.* + tap.upgrade + crit.* + frenzy.* + vault.* + interest.* (excluding *.unlock)
 *   PERKS    = crit.unlock + frenzy.unlock + vault.unlock + vault.lock + interest.unlock
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
  TextureAsset,
} from 'meta/worlds';

import { Events } from './Types';
import {
  createShopZoneViewModel,
  ShopItemViewModel,
  shopZoneTabClickedEvent,
  shopItemBuyEvent,
} from './ShopZoneViewModel';
import type {
  ShopZoneViewModel,
  ShopZoneTabClickedPayload,
  ShopItemBuyPayload,
} from './ShopZoneViewModel';
import { ActionService } from './Services/ActionService';
import { StatsService } from './Services/StatsService';
import {
  currencyIcon,
  iconTabMining,
  iconTabUpgrade,
  iconCritical,
  iconFrenzy,
  iconVault,
  iconIncome,
  iconShrine,
  iconMine,
  cursorIcon,
} from './Assets';
import { ACTION_DEFS } from './Defs/ActionDefs';
import { GeneratorService } from './Services/GeneratorService';
import { VaultService } from './Services/VaultService';


type TabName = 'MINING' | 'UPGRADES' | 'PERKS';

const UNLOCK_ACTION_IDS = new Set<string>([
  'crit.unlock',
  'frenzy.unlock',
  'vault.unlock',
  'vault.lock',
  'interest.unlock',
]);

function tabForActionId(id: string): TabName {
  if (UNLOCK_ACTION_IDS.has(id))           return 'PERKS';
  if (id === 'tap.buy')                    return 'MINING';
  if (id.startsWith('generator.buy.'))     return 'MINING';
  if (id === 'tap.upgrade')                return 'UPGRADES';
  if (id.startsWith('generator.upgrade.')) return 'UPGRADES';
  if (id.startsWith('crit.'))              return 'UPGRADES';
  if (id.startsWith('frenzy.'))            return 'UPGRADES';
  if (id.startsWith('vault.'))             return 'UPGRADES';
  if (id.startsWith('interest.'))          return 'UPGRADES';
  return 'UPGRADES';
}

function iconForActionId(id: string): TextureAsset {
  if (id === 'tap.buy' || id === 'tap.upgrade') return cursorIcon;
  if (id === 'generator.buy.0')      return iconShrine;
  if (id === 'generator.buy.1')      return iconMine;
  if (id.startsWith('generator.buy.')) return iconTabMining;
  if (id.startsWith('generator.upgrade.0')) return iconShrine;
  if (id.startsWith('generator.upgrade.1')) return iconMine;
  if (id.startsWith('generator.upgrade.')) return iconTabUpgrade;
  if (id.startsWith('crit.'))     return iconCritical;
  if (id.startsWith('frenzy.'))   return iconFrenzy;
  if (id.startsWith('vault.'))    return iconVault;
  if (id.startsWith('interest.')) return iconIncome;
  return iconTabUpgrade;
}

function countForActionId(id: string): string {
  // Generator buys → owned count (separate stat tracked per generator).
  if (id.startsWith('generator.buy.')) {
    const genId = id.split('.')[2];
    const owned = StatsService.get().get(`generator.${genId}`);
    return owned > 0 ? owned.toString() : '';
  }
  // All other actions (tap.buy + every upgrade) → current level from action stats.
  const count = StatsService.get().get(id);
  return count > 0 ? count.toString() : '';
}

const COMPACT_SUFFIXES: [number, string][] = [
  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
  [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'],  [1e9, 'B'],   [1e6, 'M'],   [1e3, 'k'],
];

function formatCompact(n: number): string {
  const v = Math.floor(n);
  for (const [threshold, suffix] of COMPACT_SUFFIXES) {
    if (v >= threshold) {
      const scaled = v / threshold;
      const body = scaled >= 100 ? Math.floor(scaled).toString()
                 : scaled >= 10  ? scaled.toFixed(1).replace(/\.0$/, '')
                 :                 scaled.toFixed(2).replace(/\.?0+$/, '');
      return `${body}${suffix}`;
    }
  }
  return v.toString();
}

function formatCost(cost: number, isEnabled: boolean): string {
  if (cost <= 0) return isEnabled ? 'FREE' : 'Locked';
  return formatCompact(cost);
}

@component()
export class ShopZoneController extends Component {
  private viewModel: ShopZoneViewModel = createShopZoneViewModel();

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    if (NetworkingService.get().isServerContext()) return;
    const uiComponent = this.entity.getComponent(CustomUiComponent);
    if (uiComponent) {
      uiComponent.dataContext = this.viewModel;
    }
    this._rebuild();
  }

  @subscribe(Events.ActionRegistryChanged)
  onRegistryChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._rebuild();
  }

  @subscribe(shopZoneTabClickedEvent)
  onTabClicked(payload: ShopZoneTabClickedPayload): void {
    const tabLabel = payload.parameter;
    this.viewModel.switchTab(tabLabel);
    this._rebuild();
  }

  @subscribe(shopItemBuyEvent)
  onItemBuy(payload: ShopItemBuyPayload): void {
    const actionId = payload.parameter;
    if (!actionId) return;
    ActionService.get().trigger(actionId);
  }

  private _rebuild(): void {
    const activeTab  = this.viewModel.activeTab as TabName;
    const liveMap    = new Map(ActionService.get().getAll().map(a => [a.id, a]));
    const stats      = StatsService.get();

    // For MINING, enumerate ALL defs in this tab so maxed items stay visible.
    const isMining   = activeTab === 'MINING';
    const defPool    = isMining
      ? ACTION_DEFS.filter(d => tabForActionId(d.id) === 'MINING')
      : ACTION_DEFS.filter(d => tabForActionId(d.id) === activeTab && liveMap.has(d.id));

    const sorted = defPool.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

    const items: ShopItemViewModel[] = sorted.map(def => {
      const live    = liveMap.get(def.id);
      const maxCount = def.maxCount ?? 1;
      const isMaxed  = maxCount > 0 && stats.get(def.id) >= maxCount;

      const item = new ShopItemViewModel();
      item.actionId         = def.id;
      item.icon             = iconForActionId(def.id);
      item.currencyIcon     = currencyIcon;
      item.countText        = countForActionId(def.id);
      item.hasCount         = item.countText.length > 0;
      item.name             = live?.label      ?? def.label;
      item.description      = live?.detail     ?? def.description;
      item.isMaxed          = isMaxed;
      item.priceLabel       = isMaxed ? 'MAX' : formatCost(live?.cost ?? def.cost, live?.isEnabled ?? false);
      item.canAfford        = !isMaxed && (live?.isEnabled ?? false);
      item.showCurrencyIcon = !isMaxed && def.cost > 0;

      if (activeTab === 'MINING' || def.id === 'vault.lock') {
        this._fillGenProgress(item, def.id);
      }

      return item;
    });

    this.viewModel.shopItems = items;
  }

  @subscribe(Events.Tick)
  onTick(): void {
    if (NetworkingService.get().isServerContext()) return;
    for (const item of this.viewModel.shopItems) {
      if (item.showGenProgress) this._fillGenProgress(item, item.actionId);
    }
  }

  private _fillGenProgress(item: ShopItemViewModel, actionId: string): void {
    if (actionId === 'tap.buy') {
      item.showGenProgress = false;
      return;
    }
    if (actionId.startsWith('generator.buy.')) {
      const genId = parseInt(actionId.split('.')[2], 10);
      const info  = GeneratorService.get().getCycleInfo(genId);
      item.showGenProgress    = info.payout > 0;
      item.genProgressPercent = Math.round(info.progress * 100);
      item.genProgressText    = info.payout > 0 ? `+${formatCompact(info.payout)}` : '';
      return;
    }
    if (actionId === 'vault.lock') {
      const vault = VaultService.get();
      if (vault.isLocked()) {
        const total   = vault.getDuration();
        const left    = vault.getTimeLeft();
        const elapsed = total - left;
        item.showGenProgress    = true;
        item.genProgressPercent = Math.round((elapsed / total) * 100);
        item.genProgressText    = `${Math.ceil(left)}s`;
      } else {
        item.showGenProgress = false;
      }
      return;
    }
    item.showGenProgress = false;
  }
}
