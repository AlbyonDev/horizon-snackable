/**
 * TowerShopHud — ViewModel controller for the tower purchase bar at the bottom of the screen.
 *
 * Attached to: TowerShopUI entity in space.hstf (has CustomUiComponent → TowerShop.xaml).
 * TowerShopViewModel: items[] (TowerShopItemViewModel per tower), selectedTowerId, visible.
 * TowerShopItemViewModel: name, cost, state ("affordable"|"too_expensive"), selected, towerColor.
 * Hides when a placed tower is selected (TowerSelected), shows on deselect or RestartGame.
 * On tower tap (UiEvents.towerShopTap): calls TowerService.selectShopTower(), fires TowerShopSelected.
 * Updates affordability state on ResourceChanged.
 * On RestartGame: resets visible=true and resets selection to first tower.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  TextureAsset,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import { TowerService } from '../Services/TowerService';
import { ResourceService } from '../Services/ResourceService';
import { TowerIcons } from '../Assets';

const TOWER_COLORS: Record<string, string> = {
  arrow:  '#552ecc71',
  cannon: '#55e67e22',
  frost:  '#5500bcd4',
  laser:  '#559b59b6',
};

const TOWER_SECONDARY_COLORS: Record<string, string> = {
  arrow:  '#1a7a42',
  cannon: '#a85a18',
  frost:  '#007a8a',
  laser:  '#6a3a7d',
};

@uiViewModel()
export class TowerShopItemViewModel extends UiViewModel {
  icon: Maybe<TextureAsset> = null;
  iconPath: string = '';
  name: string = '';
  cost: number = 0;
  state: string = 'affordable'; // "affordable" | "too_expensive"
  towerId: string = '';
  selected: boolean = false;
  towerColor: string = '#3a3a5a';
  secondaryColor: string = '#2a2a3a';
}

@uiViewModel()
export class TowerShopViewModel extends UiViewModel {
  override readonly events = {
    towerTap: UiEvents.towerShopTap,
  };

  items: readonly TowerShopItemViewModel[] = [];
  selectedTowerId: string = '';
  visible: boolean = true;
}

@component()
export class TowerShopHud extends Component {
  private viewModel: Maybe<TowerShopViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private itemVMs: TowerShopItemViewModel[] = [];

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide the native panel immediately to prevent XAML binding race
    // (unresolved bindings default to Visible, covering the screen)
    this.uiComponent.isVisible = false;

    this.viewModel = new TowerShopViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this._populateTowers();
    this._updateAffordability(ResourceService.get().gold);
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_payload: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.viewModel.visible = true;
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_payload: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._updateAffordability(payload.gold);
  }

  @subscribe(Events.TowerSelected, { execution: ExecuteOn.Owner })
  onTowerSelected(_payload: Events.TowerSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
  }

  @subscribe(Events.TowerDeselected, { execution: ExecuteOn.Owner })
  onTowerDeselected(_payload: Events.TowerDeselectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.viewModel.visible = true;
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_payload: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    // Don't show yet — will show again on LevelSelected
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
    this.viewModel.selectedTowerId = this.itemVMs.length > 0 ? this.itemVMs[0].towerId : '';
    for (const item of this.itemVMs) item.selected = item.towerId === this.viewModel.selectedTowerId;
  }


  @subscribe(UiEvents.towerShopTap, { execution: ExecuteOn.Owner })
  onTowerTapped(payload: UiEvents.TowerShopTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const towerId = payload.parameter;
    if (!TowerService.get().find(towerId)) return;

    TowerService.get().selectShopTower(towerId);

    if (this.viewModel && this.viewModel.selectedTowerId !== towerId) {
      this.viewModel.selectedTowerId = towerId;
    }

    for (const item of this.itemVMs) {
      const shouldBeSelected = item.towerId === towerId;
      if (item.selected !== shouldBeSelected) item.selected = shouldBeSelected;
    }

    const p = new Events.TowerShopSelectedPayload();
    p.towerId = towerId;
    EventService.sendLocally(Events.TowerShopSelected, p);
  }

  private _populateTowers(): void {
    const defs = TowerService.get().all();
    this.itemVMs = defs.map((def) => {
      const item = new TowerShopItemViewModel();
      item.towerId    = def.id;
      item.name       = def.name;
      item.cost       = def.cost;
      item.iconPath   = '';
      item.state      = 'affordable';
      item.selected   = false;
      item.towerColor = TOWER_COLORS[def.id] ?? '#3a3a5a';
      item.secondaryColor = TOWER_SECONDARY_COLORS[def.id] ?? '#2a2a3a';
      const TOWER_ICON_MAP: Record<string, TextureAsset> = {
        arrow: TowerIcons.BallistaTower,
        cannon: TowerIcons.CanonTower,
        frost: TowerIcons.FrostTower,
        laser: TowerIcons.LaserTower,
      };
      if (TOWER_ICON_MAP[def.id]) {
        item.icon = TOWER_ICON_MAP[def.id];
      }
      return item;
    });

    if (this.viewModel) {
      this.viewModel.items = this.itemVMs;
      if (this.itemVMs.length > 0) {
        this.viewModel.selectedTowerId = this.itemVMs[0].towerId;
        this.itemVMs[0].selected = true;
      }
    }
  }

  private _updateAffordability(gold: number): void {
    for (const item of this.itemVMs) {
      const newState = gold >= item.cost ? 'affordable' : 'too_expensive';
      if (item.state !== newState) item.state = newState;
    }
  }
}
