/**
 * TowerUpgradeMenuHud — ViewModel controller for the tower upgrade/sell panel.
 *
 * Attached to: TowerUpgradeMenuUI entity in space.hstf (CustomUiComponent → TowerUpgradeMenu.xaml).
 * Shows when a placed tower is tapped (TowerSelected), hides on TowerDeselected or RestartGame.
 * TowerUpgradeMenuViewModel: visible, towerName, sellValue, upgrade1/2 (name, cost, state).
 * Upgrade state: "affordable" | "too_expensive" | "maxed" (no next node in tree).
 * On sell tap: calls TowerService.sell().
 * On upgrade tap: calls TowerService.upgrade(choiceIndex) if not maxed/too_expensive.
 * On TowerUpgraded: refreshes upgrade options and sell value from updated registry.
 * On ResourceChanged: refreshes affordability of displayed upgrade options.
 * _updateUpgradeInfo(): walks the IUpgradeNode tree to find current available options.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  TextureAsset,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import type { ITowerDef } from '../Types';
import { TowerService } from '../Services/TowerService';
import { ResourceService } from '../Services/ResourceService';
import { SELL_RATIO } from '../Constants';
import { TowerIcons } from '../Assets';

const TOWER_IMAGES: Record<string, TextureAsset> = {
  arrow: TowerIcons.BallistaTower,
  cannon: TowerIcons.CanonTower,
  frost: TowerIcons.FrostTower,
  laser: TowerIcons.LaserTower,
};

const TOWER_BORDER_COLORS: Record<string, string> = {
  arrow: '#2ecc71',
  cannon: '#e67e22',
  frost: '#00bcd4',
  laser: '#9b59b6',
};
const DEFAULT_BORDER_COLOR = '#3a3a5a';

const ROMAN = ['I', 'II', 'III'];
const toRoman = (tier: number): string => ROMAN[tier] ?? String(tier + 1);

const UPGRADE_LABEL_COLORS: Record<string, string> = {
  'Damage':   '#ff4d4d', // vivid red
  'Rate':     '#f9c74f', // warm yellow — speed/tempo
  'Range':    '#4fc3f7', // sky blue — distance
  'Splash':   '#ff8c42', // orange — area
  'Slow':     '#80deea', // ice cyan — freeze
  'Duration': '#b2ebf2', // lighter ice — time
  'Crit':     '#ce93d8', // soft purple — luck
};
const UPGRADE_LABEL_SECONDARY_COLORS: Record<string, string> = {
  'Damage':   '#7a1a1a',
  'Rate':     '#7a6010',
  'Range':    '#1a4f6e',
  'Splash':   '#7a3a10',
  'Slow':     '#1a5a62',
  'Duration': '#1a6070',
  'Crit':     '#5a2a6a',
};
const DEFAULT_UPGRADE_COLOR = '#3a3a5a';
const DEFAULT_UPGRADE_SECONDARY = '#2a2a3a';

@uiViewModel()
export class TowerUpgradeMenuViewModel extends UiViewModel {
  override readonly events = {
    sellTowerTap: UiEvents.sellTowerTap,
    upgradeTowerTap: UiEvents.upgradeTowerTap,
  };

  visible: boolean = false;
  towerName: string = '';
  towerImage: Maybe<TextureAsset> = null;
  sellValue: number = 0;

  upgrade1Name: string = 'Upgrade 1';
  upgrade1Cost: number = 0;
  upgrade1State: string = 'affordable'; // "affordable" | "too_expensive" | "maxed"

  upgrade2Name: string = 'Upgrade 2';
  upgrade2Cost: number = 0;
  upgrade2State: string = 'affordable';

  towerBorderColor: string = '#3a3a5a';
  isMaxed: boolean = false;
  showUpgrades: boolean = true;

  upgrade1Color: string = '#3a3a5a';
  upgrade2Color: string = '#3a3a5a';
  upgrade1SecondaryColor: string = '#2a2a3a';
  upgrade2SecondaryColor: string = '#2a2a3a';
  upgradeHistory1: string = '';
  upgradeHistory2: string = '';
  showHistory1: boolean = false;
  showHistory2: boolean = false;

  card1Visible: boolean = false;
  card2Visible: boolean = false;

  upgrade1Selected: boolean = false;
  upgrade2Selected: boolean = false;
}

@component()
export class TowerUpgradeMenuHud extends Component {
  private viewModel: Maybe<TowerUpgradeMenuViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  private selectedCol: number = 0;
  private selectedRow: number = 0;
  private selectedDefId: string = '';
  private selectedChoices: number[] = [];

  /** Duration of slide-in (disappear) animation in ms — must match XAML Card*SlideIn duration (0:0:0.25) */
  private static readonly SLIDE_IN_MS = 250;
  /** Stagger delay between card 1 and card 2 pop-in, in ms */
  private static readonly CARD_STAGGER_MS = 80;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;
    this.uiComponent.isVisible = false;

    this.viewModel = new TowerUpgradeMenuViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this.uiComponent.isVisible = true;
  }

  @subscribe(Events.TowerSelected, { execution: ExecuteOn.Owner })
  onTowerSelected(payload: Events.TowerSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const wasAlreadyVisible = this.viewModel.visible && this.viewModel.card1Visible;

    this.selectedCol     = payload.col;
    this.selectedRow     = payload.row;
    this.selectedDefId   = payload.defId;
    this.selectedChoices = payload.choices;

    if (wasAlreadyVisible) {
      this.viewModel.card1Visible = false;
      this.viewModel.card2Visible = false;
      setTimeout(() => {
        this._applyTowerData(payload);
        this.viewModel!.card1Visible = true;
        setTimeout(() => { this.viewModel!.card2Visible = true; }, TowerUpgradeMenuHud.CARD_STAGGER_MS);
      }, TowerUpgradeMenuHud.SLIDE_IN_MS);
    } else {
      this._applyTowerData(payload);
      this.viewModel.visible = true;
      this.viewModel.card1Visible = true;
      setTimeout(() => { this.viewModel!.card2Visible = true; }, TowerUpgradeMenuHud.CARD_STAGGER_MS);
    }
  }

  /** Populates ViewModel with tower data from selection payload. */
  private _applyTowerData(payload: Events.TowerSelectedPayload): void {
    if (!this.viewModel) return;
    const def = TowerService.get().find(payload.defId);
    if (!def) return;

    const rec = TowerService.get().getAt(payload.col, payload.row);
    this.viewModel.towerName  = `${def.name} ${toRoman(payload.tier)}`;
    this.viewModel.towerImage = TOWER_IMAGES[payload.defId] ?? null;
    this.viewModel.sellValue  = rec ? Math.floor(rec.totalInvested * SELL_RATIO) : 0;
    this.viewModel.towerBorderColor = TOWER_BORDER_COLORS[payload.defId] ?? DEFAULT_BORDER_COLOR;
    this._updateUpgradeInfo(def, payload.tier, payload.choices);
  }

  @subscribe(Events.TowerDeselected, { execution: ExecuteOn.Owner })
  onTowerDeselected(_payload: Events.TowerDeselectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.card1Visible = false;
    this.viewModel.card2Visible = false;
    this.viewModel.visible = false;
    this.viewModel.towerBorderColor = DEFAULT_BORDER_COLOR;
    this.viewModel.upgrade1Selected = false;
    this.viewModel.upgrade2Selected = false;
    this.selectedCol     = 0;
    this.selectedRow     = 0;
    this.selectedDefId   = '';
    this.selectedChoices = [];
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_payload: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    this.viewModel.card1Visible = false;
    this.viewModel.card2Visible = false;
    this.viewModel.visible = false;
    this.viewModel.towerBorderColor = DEFAULT_BORDER_COLOR;
    this.viewModel.upgrade1Selected = false;
    this.viewModel.upgrade2Selected = false;
    this.selectedCol     = 0;
    this.selectedRow     = 0;
    this.selectedDefId   = '';
    this.selectedChoices = [];
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.viewModel.visible) return;
    this._updateAffordability(payload.gold);
  }

  @subscribe(UiEvents.sellTowerTap, { execution: ExecuteOn.Owner })
  onSellTowerTap(_payload: UiEvents.SellTowerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    TowerService.get().sell();
  }

  @subscribe(UiEvents.upgradeTowerTap, { execution: ExecuteOn.Owner })
  onUpgradeTowerTap(payload: UiEvents.UpgradeTowerTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const upgradeIndex = parseInt(payload.parameter, 10);
    const state = upgradeIndex === 0 ? this.viewModel.upgrade1State : this.viewModel.upgrade2State;
    if (state === 'maxed' || state === 'too_expensive') return;

    // Select the tapped card (triggers pop-up animation)
    this.viewModel.upgrade1Selected = upgradeIndex === 0;
    this.viewModel.upgrade2Selected = upgradeIndex === 1;

    // Slide in (disappear) both cards before upgrade; slide-out happens in onTowerUpgraded
    this.viewModel.card1Visible = false;
    this.viewModel.card2Visible = false;
    TowerService.get().upgrade(upgradeIndex);
  }

  @subscribe(Events.TowerUpgraded, { execution: ExecuteOn.Owner })
  onTowerUpgraded(payload: Events.TowerUpgradedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.viewModel.visible) return;
    if (payload.col !== this.selectedCol || payload.row !== this.selectedRow) return;

    const rec = TowerService.get().getAt(this.selectedCol, this.selectedRow);
    const def = TowerService.get().find(this.selectedDefId);
    if (!rec || !def) return;

    // Wait for slide-in to finish, then refresh data and slide out (appear)
    setTimeout(() => {
      if (!this.viewModel || !this.viewModel.visible) return;
      this.viewModel.sellValue = Math.floor(rec.totalInvested * SELL_RATIO);
      this.viewModel.towerName = `${def.name} ${toRoman(rec.tier)}`;
      this.selectedChoices = [...rec.choices];
      this._updateUpgradeInfo(def, rec.tier, rec.choices);
      // Reset selection state before sliding new cards in
      this.viewModel.upgrade1Selected = false;
      this.viewModel.upgrade2Selected = false;
      this.viewModel.card1Visible = true;
      setTimeout(() => { this.viewModel!.card2Visible = true; }, TowerUpgradeMenuHud.CARD_STAGGER_MS);
    }, TowerUpgradeMenuHud.SLIDE_IN_MS);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _updateUpgradeInfo(def: ITowerDef, tier: number, choices: number[]): void {
    if (!this.viewModel) return;

    // Set maxed state
    const maxed = tier >= 2;
    this.viewModel.isMaxed = maxed;
    this.viewModel.showUpgrades = !maxed;

    // Build upgrade history labels by walking the tree
    this._updateUpgradeHistory(def, choices);

    const options = tier === 0
      ? def.upgrades
      : (() => {
          let node = def.upgrades[choices[0]];
          for (let i = 1; i < choices.length; i++) {
            if (node.next) node = node.next[choices[i]];
          }
          return node.next;
        })();

    if (options) {
      this.viewModel.upgrade1Name  = `Upgrade\n${options[0].label}`;
      this.viewModel.upgrade1Cost  = options[0].cost;
      this.viewModel.upgrade1State = ResourceService.get().canAfford(options[0].cost) ? 'affordable' : 'too_expensive';
      this.viewModel.upgrade1Color = UPGRADE_LABEL_COLORS[options[0].label] ?? DEFAULT_UPGRADE_COLOR;
      this.viewModel.upgrade1SecondaryColor = UPGRADE_LABEL_SECONDARY_COLORS[options[0].label] ?? DEFAULT_UPGRADE_SECONDARY;

      this.viewModel.upgrade2Name  = `Upgrade\n${options[1].label}`;
      this.viewModel.upgrade2Cost  = options[1].cost;
      this.viewModel.upgrade2State = ResourceService.get().canAfford(options[1].cost) ? 'affordable' : 'too_expensive';
      this.viewModel.upgrade2Color = UPGRADE_LABEL_COLORS[options[1].label] ?? DEFAULT_UPGRADE_COLOR;
      this.viewModel.upgrade2SecondaryColor = UPGRADE_LABEL_SECONDARY_COLORS[options[1].label] ?? DEFAULT_UPGRADE_SECONDARY;
    } else {
      this.viewModel.upgrade1Name  = 'Upgrade 1';
      this.viewModel.upgrade1Cost  = 0;
      this.viewModel.upgrade1State = 'maxed';
      this.viewModel.upgrade1Color = DEFAULT_UPGRADE_COLOR;
      this.viewModel.upgrade1SecondaryColor = DEFAULT_UPGRADE_SECONDARY;
      this.viewModel.upgrade2Name  = 'Upgrade 2';
      this.viewModel.upgrade2Cost  = 0;
      this.viewModel.upgrade2State = 'maxed';
      this.viewModel.upgrade2Color = DEFAULT_UPGRADE_COLOR;
      this.viewModel.upgrade2SecondaryColor = DEFAULT_UPGRADE_SECONDARY;
    }
  }

  private _updateUpgradeHistory(def: ITowerDef, choices: number[]): void {
    if (!this.viewModel) return;

    const labels: string[] = [];
    if (choices.length > 0) {
      labels.push(def.upgrades[choices[0]].label);
      let node = def.upgrades[choices[0]];
      for (let i = 1; i < choices.length; i++) {
        if (node.next) {
          node = node.next[choices[i]];
          labels.push(node.label);
        }
      }
    }

    this.viewModel.upgradeHistory1 = labels.length > 0 ? labels[0] : '';
    this.viewModel.upgradeHistory2 = labels.length > 1 ? labels[1] : '';
    this.viewModel.showHistory1 = labels.length > 0;
    this.viewModel.showHistory2 = labels.length > 1;
  }

  private _updateAffordability(gold: number): void {
    if (!this.viewModel) return;
    if (this.viewModel.upgrade1State !== 'maxed')
      this.viewModel.upgrade1State = gold >= this.viewModel.upgrade1Cost ? 'affordable' : 'too_expensive';
    if (this.viewModel.upgrade2State !== 'maxed')
      this.viewModel.upgrade2State = gold >= this.viewModel.upgrade2Cost ? 'affordable' : 'too_expensive';
  }
}
