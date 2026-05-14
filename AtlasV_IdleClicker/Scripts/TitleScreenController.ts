import {
  Component,
  component,
  subscribe,
  CustomUiComponent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { TitleScreenViewModel, onTitlePlayClicked } from './TitleScreenViewModel';

const VERBOSE_LOG = false;

/**
 * TitleScreenController
 *
 * Component Attachment: Scene Entity (TitleScreenUI entity in space.hstf)
 * Component Networking: Local (non-networked, client-only UI)
 * Component Ownership: Not Networked — runs locally on each client
 *
 * Controls the title screen UI. When the player presses Play,
 * triggers a fade-to-black transition then hides the title screen panel.
 */
@component()
export class TitleScreenController extends Component {
  private viewModel: TitleScreenViewModel = new TitleScreenViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() { return (this._customUi ??= this.entity.getComponent(CustomUiComponent)); }

  private isFading: boolean = false;
  private fadeStartTime: number = 0;

  // Attached to a non-networked scene entity; runs locally on all clients
  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    console.log('[TitleScreenController] Initialized');
    if (this.customUi) {
      this.customUi.dataContext = this.viewModel;
      if (VERBOSE_LOG) {
        console.log('[TitleScreenController] ViewModel connected to CustomUiComponent');
      }
    }
  }

  // Handle Play button click — start fade transition
  @subscribe(onTitlePlayClicked)
  onPlayClicked() {
    if (this.isFading) return; // Guard against double-tap
    console.log('[TitleScreenController] Play button clicked, starting fade');
    this.isFading = true;
    this.fadeStartTime = Date.now();
    this.viewModel.fadeVisible = true;
    this.viewModel.fadeOpacity = 0;
  }

  private readonly FADE_DURATION_MS = 800;
  private animStartTime: number = Date.now();

  // Animate logo and fade every frame
  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload) {
    // Logo animation — runs continuously
    this.updateLogoAnimation();

    // Fade logic
    if (!this.isFading) return;

    const elapsed = Date.now() - this.fadeStartTime;
    const progress = Math.min(1, elapsed / this.FADE_DURATION_MS);
    this.viewModel.fadeOpacity = progress;

    if (progress >= 1) {
      this.isFading = false;
      this.hideTitleScreen();
    }
  }

  private updateLogoAnimation(): void {
    const elapsed = (Date.now() - this.animStartTime) / 1000;
    // Bob: period ~3s, amplitude ~4px
    this.viewModel.logoTranslateY = Math.sin(elapsed * (2 * Math.PI / 3)) * 4;
    // Breathe: period ~4s, amplitude ~0.02 scale
    const breathe = 1.0 + Math.sin(elapsed * (2 * Math.PI / 4)) * 0.02;
    this.viewModel.logoScaleX = breathe;
    this.viewModel.logoScaleY = breathe;
  }

  private hideTitleScreen(): void {
    if (this.customUi) {
      this.customUi.isVisible = false;
      console.log('[TitleScreenController] Title screen hidden');
    }
  }

  // Hot-reload support
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    const saved = super.onBeforeHotReload() ?? {};
    return { ...saved, isFading: this.isFading };
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    const wasFading = savedState.isFading as boolean;
    if (wasFading) {
      // If was mid-fade, just hide immediately
      this.hideTitleScreen();
    }
    // Reconnect ViewModel
    if (this.customUi) {
      this.customUi.dataContext = this.viewModel;
    }
  }
}
