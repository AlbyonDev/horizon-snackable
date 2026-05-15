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
import { TitleScreenPlayRequested } from './TitleScreenUIComponent';

// --- ViewModel ---
@uiViewModel()
export class GameHUDData extends UiViewModel {
  /** Gold amount */
  goldAmount: number = 0;

  /** Gold counter visibility - string for XAML DataTrigger ('True'/'False') */
  isGoldVisible: string = 'False';
}

// --- Component ---
/**
 * GameHUDViewModel - drives the GameHUD XAML (gold counter).
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
  private _playPressed = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GameHUDViewModel] onStart');
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._vm;
      this._ui.isVisible = false;
    }
  }

  @subscribe(TitleScreenPlayRequested)
  private _onPlayPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GameHUDViewModel] Play pressed, showing HUD');
    this._playPressed = true;
    if (this._ui) this._ui.isVisible = true;
    // Set initial counter visibility for the Idle phase (gold visible)
    this._vm.isGoldVisible = 'True';
  }

  // -- Phase visibility --
  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._playPressed) return;

    // Gold visible: above-water phases (Launching, Reset, Idle, Surfacing)
    // Gold hidden: Diving, Throwing
    if (
      p.phase === GamePhase.Launching ||
      p.phase === GamePhase.Reset ||
      p.phase === GamePhase.Idle ||
      p.phase === GamePhase.Surfacing
    ) {
      this._vm.isGoldVisible = 'True';
    } else {
      this._vm.isGoldVisible = 'False';
    }
  }

  // -- Gold updates --
  @subscribe(Events.ProgressLoaded)
  private _onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.goldAmount = p.gold;
  }

  @subscribe(Events.GoldChanged)
  private _onGoldChanged(p: Events.GoldChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.goldAmount = p.gold;
  }

}
