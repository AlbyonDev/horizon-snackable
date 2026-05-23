import {
  Component,
  CustomUiComponent,
  EventService,
  LocalEvent,
  NetworkingService,
  OnEntityStartEvent,
  UiEvent,
  UiViewModel,
  component,
  serializable,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';
import { GameCameraService } from '../../Services/GameCameraService';

// ─── Module-level UiEvent declaration ─────────────────────────────────────────
@serializable()
export class TitleScreenPlayPressedPayload {
  readonly parameter: string = '';
}

export const titleScreenPlayPressedEvent = new UiEvent(
  'TitleScreenViewModel-onPlayPressed',
  TitleScreenPlayPressedPayload,
);

// ─── LocalEvent for game scripts to consume ───────────────────────────────────
export const TitleScreenPlayRequested = new LocalEvent('TitleScreen-PlayRequested');

// ─── ViewModel ────────────────────────────────────────────────────────────────
@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  /** Text displayed on the Play button */
  playButtonText: string = 'Play';

  /** Set to 'True' to trigger the XAML exit animation via DataTrigger */
  isExiting: string = 'False';

  override readonly events = {
    onPlayPressed: titleScreenPlayPressedEvent,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * TitleScreenUIComponent — connects the TitleScreen XAML to its ViewModel
 * and relays the Play button press as a LocalEvent for game scripts.
 * Triggers an exit animation before hiding UI and firing the event.
 *
 * Component Attachment: Scene entity (TitleScreen UI entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class TitleScreenUIComponent extends Component {
  private viewModel = new TitleScreenViewModel();
  private _ui: Maybe<CustomUiComponent> = null;
  private _exitTimerId: number = 0;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this.viewModel;
    }
  }

  @subscribe(titleScreenPlayPressedEvent)
  private onPlayPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    // Prevent double-press during exit animation
    if (this.viewModel.isExiting === 'True') return;

    // Start camera intro animation in sync with the UI exit animation
    GameCameraService.get().animateTo(4.5, 550);

    // After animation completes (~550ms), hide UI and fire event
    this._exitTimerId = setTimeout(() => {
      this._exitTimerId = 0;
      if (this._ui) {
        this._ui.isVisible = false;
      }
      EventService.sendLocally(TitleScreenPlayRequested, {});
    }, 550) as unknown as number;
  }

  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    if (this._exitTimerId) {
      clearTimeout(this._exitTimerId);
      this._exitTimerId = 0;
    }
    return super.onBeforeHotReload();
  }
}
