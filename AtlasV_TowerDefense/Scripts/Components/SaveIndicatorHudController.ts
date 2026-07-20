/**
 * SaveIndicatorHudController — Shows a brief "Saving..." indicator when level progress is saved.
 *
 * Component Attachment: Scene entity (space.hstf) — dedicated SaveIndicatorHud entity
 * Component Networking: Local (UI-only, no network state)
 * Component Ownership: Not networked — runs on every client locally
 *
 * Listens for the LevelCompleted LocalEvent (fires on client when a level is won).
 * Shows the indicator for ~2 seconds then fades out using ViewModel-driven
 * visibility binding + XAML Storyboard animations.
 */
import {
  Component,
  CustomUiComponent,
  OnEntityStartEvent,
  ExecuteOn,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';

// ─── ViewModel ────────────────────────────────────────────────────────────────

@uiViewModel()
export class SaveIndicatorViewModel extends UiViewModel {
  /** Drives the XAML DataTrigger for fade-in / fade-out storyboards */
  public isVisible: boolean = false;
}

// ─── Controller ───────────────────────────────────────────────────────────────

const DISPLAY_DURATION_MS = 2000; // 2 seconds visible before fade-out

@component()
export class SaveIndicatorHudController extends Component {
  private viewModel = new SaveIndicatorViewModel();
  private _hideTimer: number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    const ui = this.entity.getComponent(CustomUiComponent);
    if (ui) {
      ui.dataContext = this.viewModel;
    }
    console.log('[SaveIndicatorHudController] Initialized');
  }

  /**
   * When a level is completed, show the save indicator.
   * The LevelSaveComponent will simultaneously persist progress.
   */
  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(): void {
    console.log('[SaveIndicatorHudController] Level completed — showing save indicator');
    this._showIndicator();
  }

  private _showIndicator(): void {
    // Cancel any pending hide
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = 0;
    }

    // Show (triggers FadeIn storyboard via DataTrigger)
    this.viewModel.isVisible = true;

    // Schedule hide after duration
    this._hideTimer = setTimeout(() => {
      this.viewModel.isVisible = false;
      this._hideTimer = 0;
    }, DISPLAY_DURATION_MS) as unknown as number;
  }
}
