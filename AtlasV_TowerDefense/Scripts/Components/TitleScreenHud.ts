/**
 * TitleScreenHud — Displays the title screen overlay before the game starts.
 *
 * Component Attachment: Scene entity (TitleScreenUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a full-screen overlay with the game logo and a Play button.
 * When the player taps the button, the overlay hides and fires Events.StartGame
 * to kick off the game via GameManager.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';

// ── Module-level UiEvent constants ──────────────────────────────────────────

@serializable()
export class TitleScreenPlayTapPayload {
  readonly parameter: string = '';
}

const playTapEvent = new UiEvent('TitleScreenViewModel-onPlayTap', TitleScreenPlayTapPayload);

// ── ViewModel ───────────────────────────────────────────────────────────────

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  override readonly events = {
    playTap: playTapEvent,
  };

  visible: boolean = true;
}

// ── Component ───────────────────────────────────────────────────────────────

@component()
export class TitleScreenHud extends Component {
  private viewModel: Maybe<TitleScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private _hasPlayed: boolean = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;
    this.uiComponent.isVisible = false;

    this.viewModel = new TitleScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = true;

    this.uiComponent.isVisible = true;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_payload: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = true;
  }

  @subscribe(playTapEvent, { execution: ExecuteOn.Owner })
  onPlayTap(_payload: TitleScreenPlayTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;

    this.viewModel.visible = false;

    if (this._hasPlayed) {
      EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
    } else {
      this._hasPlayed = true;
      EventService.sendLocally(Events.StartGame, new Events.StartGamePayload());
    }
  }
}
