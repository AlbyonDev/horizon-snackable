import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, GamePhase } from '../../Types';
import { WATER_SURFACE_Y, lineDepthAtLevel } from '../../Constants';

// --- ViewModel ---
@uiViewModel()
export class GameHUDData extends UiViewModel {
  /** Gold amount */
  goldAmount: number = 0;

  /** Gold counter visibility - string for XAML DataTrigger ('True'/'False') */
  isGoldVisible: string = 'False';

  /** Depth counter text */
  depthText: string = '0.0 m';

  /** Max depth text (shows max line depth for current upgrade level) */
  maxDepthText: string = '/ 15.0 m';

  /** Depth counter visibility - string for XAML DataTrigger ('True'/'False') */
  isDepthVisible: string = 'False';
}

// --- Component ---
/**
 * GameHUDViewModel - drives the GameHUD XAML (gold + depth counters).
 *
 * Counter panels have IsHitTestVisible=False so they don't block input below.
 *
 * Component Attachment: Scene entity (GameHUD entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class GameHUDViewModel extends Component {
  private _vm = new GameHUDData();
  private _ui: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GameHUDViewModel] onStart');
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
  }

  // -- Phase visibility --
  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Gold visible: Surfacing, Launching, Reset, Idle (above-water phases)
    // Depth visible: Diving (underwater)
    // Throwing: both hidden (hook in arc, no counter needed)
    if (
      p.phase === GamePhase.Launching ||
      p.phase === GamePhase.Reset ||
      p.phase === GamePhase.Idle
    ) {
      this._vm.isGoldVisible = 'True';
      this._vm.isDepthVisible = 'False';
    } else if (p.phase === GamePhase.Diving || p.phase === GamePhase.Surfacing) {
      this._vm.isGoldVisible = 'False';
      this._vm.isDepthVisible = 'True';
    } else {
      // Throwing - both hidden
      this._vm.isGoldVisible = 'False';
      this._vm.isDepthVisible = 'False';
    }

    // Reset depth text when not diving
    if (p.phase !== GamePhase.Diving) {
      this._vm.depthText = '0.0 m';
    }
  }

  // -- Depth counter (hook position) --
  @subscribe(Events.HookMoved)
  private _onHookMoved(p: Events.HookMovedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const depth = Math.max(0, WATER_SURFACE_Y - p.y);
    this._vm.depthText = `${depth.toFixed(1)} m`;
  }

  // -- Gold updates --
  @subscribe(Events.ProgressLoaded)
  private _onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.goldAmount = p.gold;
    this._vm.maxDepthText = `/ ${lineDepthAtLevel(p.lineLevel).toFixed(1)} m`;
  }

  @subscribe(Events.GoldChanged)
  private _onGoldChanged(p: Events.GoldChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.goldAmount = p.gold;
  }

  // -- Max depth updates --
  @subscribe(Events.UpgradesChanged)
  private _onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.maxDepthText = `/ ${p.maxDepth.toFixed(1)} m`;
  }
}
