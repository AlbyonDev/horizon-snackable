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
 *
 * IMPORTANT: Play is gated behind Events.ProgressRestored so that
 * LevelGeneratorService.restoreBagState() has already executed before StartGame
 * fires. This prevents a timing race where the boss modifier shuffle-bag is
 * reset and reshuffled (producing a different modifier) because the save data
 * hadn't arrived from the server yet.
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
import { SaveService } from '../Services/SaveService';

/** How long (ms) to wait for save data before allowing Play anyway. */
const PROGRESS_LOAD_TIMEOUT_MS = 5000;

// ── Module-level UiEvent constants ──────────────────────────────────────────────

@serializable()
export class TitleScreenPlayTapPayload {
  readonly parameter: string = '';
}

const playTapEvent = new UiEvent('TitleScreenViewModel-onPlayTap', TitleScreenPlayTapPayload);

// ── ViewModel ───────────────────────────────────────────────────────────────────

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  override readonly events = {
    playTap: playTapEvent,
  };

  visible: boolean = true;

  /** True while waiting for the cloud save. The Play button shows a darkened
   *  overlay (PlayButtonDisabled in TitleScreen.xaml) and ignores taps until
   *  this is false. Bound via DataTrigger on `isLoading`. */
  isLoading: boolean = true;

  /** Button caption: "LOADING" while waiting for the cloud save, "PLAY" once ready. */
  buttonLabel: string = 'LOADING';
}

// ── Component ───────────────────────────────────────────────────────────────────

@component()
export class TitleScreenHud extends Component {
  private viewModel: Maybe<TitleScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  /** True once ProgressRestored fires (or timeout expires). Blocks Play until set. */
  private _progressLoaded: boolean = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide native panel before binding to prevent unbound XAML flash
    this.uiComponent.isVisible = false;

    this.viewModel = new TitleScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = true;

    // Reflect whatever load state already exists (save may have arrived before
    // this panel bound), then keep it in sync via SaveRestored below.
    this._setLoading(!SaveService.get().isLoaded);

    // Show panel now that binding is complete
    this.uiComponent.isVisible = true;
    console.log('[TitleScreenHud] Panel bound and shown');
  }

  /** Flip the button between loading and ready. */
  private _setLoading(loading: boolean): void {
    if (!this.viewModel) return;
    this.viewModel.isLoading = loading;
    this.viewModel.buttonLabel = loading ? 'LOADING' : 'PLAY';
  }

  @subscribe(Events.SaveRestored, { execution: ExecuteOn.Owner })
  onSaveRestored(_p: Events.SaveRestoredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    // Cloud save received — enable the Play button.
    this._setLoading(false);
    console.log('[TitleScreenHud] Save loaded — Play enabled');
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

    // Block until the cloud save has been received. Tapping "Play" before the
    // load arrives would mint a new run and overwrite the real save. The load
    // completes within a network round-trip of join, so this is momentary.
    if (!SaveService.get().isLoaded) {
      console.log('[TitleScreenHud] Play tapped before save loaded — ignored');
      return;
    }

    this.viewModel.visible = false;
    // Always fire StartGame which transitions to Overworld
    EventService.sendLocally(Events.StartGame, new Events.StartGamePayload());
  }
}
