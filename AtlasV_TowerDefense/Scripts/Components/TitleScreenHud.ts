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

@serializable()
export class TitleScreenResetTapPayload {
  readonly parameter: string = '';
}

const resetTapEvent = new UiEvent('TitleScreenViewModel-onResetTap', TitleScreenResetTapPayload);

@serializable()
export class TitleScreenResetConfirmPayload {
  readonly parameter: string = '';
}

const resetConfirmEvent = new UiEvent('TitleScreenViewModel-onResetConfirm', TitleScreenResetConfirmPayload);

@serializable()
export class TitleScreenResetCancelPayload {
  readonly parameter: string = '';
}

const resetCancelEvent = new UiEvent('TitleScreenViewModel-onResetCancel', TitleScreenResetCancelPayload);

@serializable()
export class TitleScreenLeaderboardTapPayload {
  readonly parameter: string = '';
}

const leaderboardTapEvent = new UiEvent('TitleScreenViewModel-onLeaderboardTap', TitleScreenLeaderboardTapPayload);

// ── ViewModel ───────────────────────────────────────────────────────────────────

@uiViewModel()
export class TitleScreenViewModel extends UiViewModel {
  override readonly events = {
    playTap: playTapEvent,
    resetTap: resetTapEvent,
    resetConfirm: resetConfirmEvent,
    resetCancel: resetCancelEvent,
    leaderboardTap: leaderboardTapEvent,
  };

  visible: boolean = true;

  /** True while waiting for the cloud save. The Play button shows a darkened
   *  overlay (PlayButtonDisabled in TitleScreen.xaml) and ignores taps until
   *  this is false. Bound via DataTrigger on `isLoading`. */
  isLoading: boolean = true;

  /** Button caption: "LOADING" while waiting for the cloud save, "PLAY" once ready. */
  buttonLabel: string = 'LOADING';

  /** Whether the reset button is visible (hidden after data is reset). */
  resetButtonVisible: boolean = true;

  /** Whether the confirmation popup is visible. */
  resetPopupVisible: boolean = false;

  /** Label that replaces the reset button after data is reset. */
  resetDoneVisible: boolean = false;
}

// ── Component ───────────────────────────────────────────────────────────────────

@component()
export class TitleScreenHud extends Component {
  private viewModel: Maybe<TitleScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  /** True once ProgressRestored fires (or timeout expires). Blocks Play until set. */
  private _progressLoaded: boolean = false;

  /** Safety timeout handle — cleared when save arrives normally. */
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;

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

    // Safety timeout: if save never arrives, unblock Play after PROGRESS_LOAD_TIMEOUT_MS
    if (!SaveService.get().isLoaded) {
      this._timeoutId = setTimeout(() => {
        this._timeoutId = null;
        if (!SaveService.get().isLoaded) {
          console.log('[TitleScreenHud] Timeout — enabling Play without save data');
          this._setLoading(false);
        }
      }, PROGRESS_LOAD_TIMEOUT_MS);
    }

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
    // Clear safety timeout — save arrived normally
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
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
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Block if still in loading state (button shows LOADING and is visually disabled).
    // Once the timeout or SaveRestored fires, isLoading becomes false and play is allowed.
    if (this.viewModel.isLoading) {
      console.log('[TitleScreenHud] Play tapped while still loading — ignored');
      return;
    }

    this.viewModel.visible = false;
    // Always fire StartGame which transitions to Overworld
    EventService.sendLocally(Events.StartGame, new Events.StartGamePayload());
  }

  // ── Reset save data ──────────────────────────────────────────────────────────

  // ── Leaderboard ────────────────────────────────────────────────────────────────

  @subscribe(leaderboardTapEvent, { execution: ExecuteOn.Owner })
  onLeaderboardTap(_payload: TitleScreenLeaderboardTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.viewModel.visible = false;
    EventService.sendLocally(Events.ShowLeaderboard, new Events.ShowLeaderboardPayload());
    console.log('[TitleScreenHud] Leaderboard button tapped');
  }

  @subscribe(resetTapEvent, { execution: ExecuteOn.Owner })
  onResetTap(_payload: TitleScreenResetTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    // Show the confirmation popup
    this.viewModel.resetPopupVisible = true;
    console.log('[TitleScreenHud] Reset button tapped — showing confirmation popup');
  }

  @subscribe(resetConfirmEvent, { execution: ExecuteOn.Owner })
  onResetConfirm(_payload: TitleScreenResetConfirmPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    // Perform the reset
    SaveService.get().resetSaveData();
    // Hide popup, hide reset button, show "data reset" label
    this.viewModel.resetPopupVisible = false;
    this.viewModel.resetButtonVisible = false;
    this.viewModel.resetDoneVisible = true;
    console.log('[TitleScreenHud] Save data reset confirmed');
  }

  @subscribe(resetCancelEvent, { execution: ExecuteOn.Owner })
  onResetCancel(_payload: TitleScreenResetCancelPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    // Just close the popup
    this.viewModel.resetPopupVisible = false;
    console.log('[TitleScreenHud] Reset cancelled');
  }
}
