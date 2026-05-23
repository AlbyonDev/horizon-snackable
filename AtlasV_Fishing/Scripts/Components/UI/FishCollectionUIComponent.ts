/**
 * FishCollectionUIComponent — drives the FishCollection.xaml overlay.
 *
 * Shows a grid of all 31 fish species. Uncaught fish show as dark silhouettes,
 * caught fish show sprite + quantity + gold price. Tapping a caught fish shows
 * a fullscreen detail view.
 *
 * The entity starts with isInteractable=false. When the collection is opened
 * (via onOpenFishCollectionEvent from InteractiveHUD), isInteractable is set to true
 * so the overlay can receive touch. On close, isInteractable is set back to false
 * so it doesn't block anything underneath.
 *
 * Component Attachment: Scene entity (FishCollectionUI entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
import {
  Component,
  CustomUiComponent,
  EntityService,
  NetworkingService,
  OnEntityStartEvent,
  TextureAsset,
  UiEvent,
  UiViewModel,
  component,
  serializable,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, GamePhase } from '../../Types';
import { FISH_DEFS } from '../../FishDefs';
import { SPRITE_FISH_MAP } from '../../FishSpriteAssets';
import { FishCollectionService } from '../../Services/FishCollectionService';
import { OpenFishCollectionRequested, InteractiveHUDViewModel } from './InteractiveHUDViewModel';

// ─── Module-level UiEvent declarations ─────────────────────────────────────
@serializable()
class FishCollectionCellPayload {
  readonly parameter: string = '';
}
export const onCloseCollectionEvent = new UiEvent('FishCollection-onCloseCollection');
export const onCellTappedEvent = new UiEvent('FishCollection-onCellTapped', FishCollectionCellPayload);
export const onCloseDetailEvent = new UiEvent('FishCollection-onCloseDetail');

// ─── Cell ViewModel ──────────────────────────────────────────────────────────
@uiViewModel()
export class FishCollectionCellViewModel extends UiViewModel {
  public isCaught: boolean = false;
  public isUncaught: boolean = true;
  public fishIcon: Maybe<TextureAsset> = null;
  public fishName: string = '';
  public quantity: string = 'x0';
  public goldPrice: string = '0';
  public cellIndex: string = '0';
}

// ─── Main ViewModel ──────────────────────────────────────────────────────────
@uiViewModel()
export class FishCollectionGridViewModel extends UiViewModel {
  public isCollectionVisible: boolean = false;
  public isDetailVisible: boolean = false;
  public detailFishIcon: Maybe<TextureAsset> = null;
  public detailFishName: string = '';
  public fishItems: readonly FishCollectionCellViewModel[] = [];

  override readonly events = {
    onCloseCollection: onCloseCollectionEvent,
    onCellTapped: onCellTappedEvent,
    onCloseDetail: onCloseDetailEvent,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
@component()
export class FishCollectionUIComponent extends Component {
  private _vm = new FishCollectionGridViewModel();
  private _ui: Maybe<CustomUiComponent> = null;
  private _cells: FishCollectionCellViewModel[] = [];
  private _currentPhase: GamePhase = GamePhase.Idle;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._vm;
      // Start hidden — script shows it when overlay opens.
      // When isVisible=false the panel doesn't render or capture touch input.
      this._ui.isVisible = false;
    }

    // Build cell VMs for all 31 fish
    this._cells = [];
    for (let i = 0; i < FISH_DEFS.length; i++) {
      const def = FISH_DEFS[i];
      const cell = new FishCollectionCellViewModel();
      cell.cellIndex = String(i);
      cell.fishName = def.name;
      cell.goldPrice = String(def.gold);

      const spriteInfo = SPRITE_FISH_MAP.get(def.id);
      if (spriteInfo) {
        cell.fishIcon = spriteInfo.texture;
      }

      // Default to uncaught
      cell.isCaught = false;
      cell.isUncaught = true;
      cell.quantity = 'x0';

      this._cells.push(cell);
    }
    this._vm.fishItems = [...this._cells];

    this._updateProgress();
  }

  // ── Phase visibility ─────────────────────────────────────────────────────
  @subscribe(Events.PhaseChanged)
  private _onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentPhase = p.phase;
    if (p.phase !== GamePhase.Idle) {
      // Close collection if it's open during non-idle
      if (this._vm.isCollectionVisible) {
        this._vm.isCollectionVisible = false;
        this._vm.isDetailVisible = false;
        if (this._ui) this._ui.isVisible = false;
      }
    }
  }

  // ── Progress data ────────────────────────────────────────────────────────
  @subscribe(Events.ProgressLoaded)
  private _onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshAllCells();
    this._updateProgress();
  }

  @subscribe(Events.FishCaught)
  private _onFishCaught(p: Events.FishCaughtPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    // Refresh specific cell
    const idx = FISH_DEFS.findIndex(d => d.id === p.defId);
    if (idx >= 0) {
      this._refreshCell(idx);
      this._updateProgress();
      // Force UI re-render by reassigning array
      this._vm.fishItems = [...this._cells];
    }
  }

  // ── UiEvent handlers ─────────────────────────────────────────────────────
  @subscribe(OpenFishCollectionRequested)
  private _onOpen(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshAllCells();
    this._vm.isCollectionVisible = true;

    // Make this entity visible so overlay can receive touch
    if (this._ui) this._ui.isVisible = true;

    // Hide the button on InteractiveHUD
    this._notifyInteractiveHUD('hide');
  }

  @subscribe(onCloseCollectionEvent)
  private _onClose(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.isCollectionVisible = false;
    this._vm.isDetailVisible = false;

    // Hide this entity so it doesn't block anything
    if (this._ui) this._ui.isVisible = false;

    // Re-show the button on InteractiveHUD if in Idle
    if (this._currentPhase === GamePhase.Idle) {
      this._notifyInteractiveHUD('show');
    }
  }

  @subscribe(onCellTappedEvent)
  private _onCellTapped(payload: FishCollectionCellPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const idx = parseInt(payload.parameter, 10);
    if (isNaN(idx) || idx < 0 || idx >= FISH_DEFS.length) return;

    const def = FISH_DEFS[idx];
    const svc = FishCollectionService.get();
    if (!svc.hasCaught(def.id)) return; // Only show detail for caught fish

    const spriteInfo = SPRITE_FISH_MAP.get(def.id);
    this._vm.detailFishIcon = spriteInfo ? spriteInfo.texture : null;
    this._vm.detailFishName = def.name;
    this._vm.isDetailVisible = true;
  }

  @subscribe(onCloseDetailEvent)
  private _onCloseDetail(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.isDetailVisible = false;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private _refreshAllCells(): void {
    for (let i = 0; i < FISH_DEFS.length; i++) {
      this._refreshCell(i);
    }
    this._updateProgress();
    this._vm.fishItems = [...this._cells];
  }

  private _refreshCell(idx: number): void {
    const def = FISH_DEFS[idx];
    const svc = FishCollectionService.get();
    const count = svc.getCount(def.id);
    const cell = this._cells[idx];

    if (count > 0) {
      cell.isCaught = true;
      cell.isUncaught = false;
      cell.quantity = `x${count}`;
    } else {
      cell.isCaught = false;
      cell.isUncaught = true;
      cell.quantity = 'x0';
    }
  }

  private _updateProgress(): void {
    const svc = FishCollectionService.get();
    let caught = 0;
    for (const def of FISH_DEFS) {
      if (svc.hasCaught(def.id)) caught++;
    }
    const text = `${caught}/${FISH_DEFS.length}`;

    // Update the InteractiveHUD button progress text
    const hudEntities = EntityService.findEntitiesWithComponent(InteractiveHUDViewModel);
    if (hudEntities.length > 0) {
      const hudComp = hudEntities[0].getComponent(InteractiveHUDViewModel);
      if (hudComp) {
        hudComp.updateProgressText(text);
      }
    }
  }

  private _notifyInteractiveHUD(action: 'hide' | 'show'): void {
    const hudEntities = EntityService.findEntitiesWithComponent(InteractiveHUDViewModel);
    if (hudEntities.length > 0) {
      const hudComp = hudEntities[0].getComponent(InteractiveHUDViewModel);
      if (hudComp) {
        if (action === 'hide') {
          hudComp.hideCollectionButton();
        } else {
          hudComp.showCollectionButton();
        }
      }
    }
  }
}
