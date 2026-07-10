/**
 * WaveBannerHud — Displays a "WAVE X" announcement banner between waves.
 *
 * Component Attachment: Scene entity (WaveBannerUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a centered banner when a wave begins, with scale-in + fade-out animation
 * driven by OnWorldUpdateEvent. Total display time ~1.5s:
 *   - Scale-in phase: 0.0–0.3s (opacity 0→1)
 *   - Hold phase: 0.3–1.1s (full opacity)
 *   - Fade-out phase: 1.1–1.5s (opacity 1→0, then hide)
 */
import {
  Component,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  NetworkingService,
  ExecuteOn,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';

// ── Animation timing constants ──────────────────────────────────────
const SCALE_IN_DURATION = 0.3;
const HOLD_DURATION = 0.8;
const FADE_OUT_DURATION = 0.4;
const TOTAL_DURATION = SCALE_IN_DURATION + HOLD_DURATION + FADE_OUT_DURATION;

// ── ViewModel ───────────────────────────────────────────────────────

@uiViewModel()
export class WaveBannerViewModel extends UiViewModel {
  visible: boolean = false;
  waveText: string = '';
  opacity: number = 0;
}

// ── Component ───────────────────────────────────────────────────────

@component()
export class WaveBannerHud extends Component {
  private viewModel: Maybe<WaveBannerViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Animation state (local to each client)
  private _animating: boolean = false;
  private _elapsed: number = 0;
  private _holding: boolean = false; // FTUE: banner stays visible until dismissed

  // ── Lifecycle ─────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;
    this.uiComponent.isVisible = false;

    this.viewModel = new WaveBannerViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
    this.viewModel.opacity = 0;

    this.uiComponent.isVisible = true;
  }

  // ── Events ────────────────────────────────────────────────────────

  /**
   * When a wave starts, begin the banner animation.
   * WaveStarted is a LocalEvent so it fires on all sides — guard for client only.
   */
  @subscribe(Events.FtueHint, { execution: ExecuteOn.Owner })
  onFtueHint(_p: Events.FtueHintPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.waveText = 'Place a tower to begin!';
    this.viewModel.opacity = 1;
    this.viewModel.visible = true;
    this._animating = false;
    this._holding = true;
  }

  @subscribe(Events.TowerPlaced, { execution: ExecuteOn.Owner })
  onTowerPlaced(_p: Events.TowerPlacedPayload): void {
    if (!this._holding) return;
    if (!this.viewModel) return;
    this._holding = false;
    this._elapsed = 0;
    this._animating = true;
  }

  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const waveNumber = payload.waveIndex + 1; // 1-based display
    this.viewModel.waveText = `WAVE ${waveNumber}`;
    this.viewModel.opacity = 0;
    this.viewModel.visible = true;
    this._elapsed = 0;
    this._animating = true;

  }

  /**
   * Reset state on game restart.
   */
  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_p: Events.RestartGamePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this._animating = false;
    this._elapsed = 0;
    this.viewModel.visible = false;
    this.viewModel.opacity = 0;
    this.viewModel.waveText = '';
  }

  // ── Animation tick ────────────────────────────────────────────────

  /**
   * Drives the scale-in / hold / fade-out animation each frame.
   * ExecuteOn.Owner on a scene entity runs on server+client — guard for client.
   */
  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._animating || !this.viewModel) return;

    this._elapsed += payload.deltaTime;

    if (this._elapsed < SCALE_IN_DURATION) {
      // Phase 1: Scale-in (opacity 0 → 1)
      const t = this._elapsed / SCALE_IN_DURATION;
      this.viewModel.opacity = t;
    } else if (this._elapsed < SCALE_IN_DURATION + HOLD_DURATION) {
      // Phase 2: Hold at full opacity
      if (this.viewModel.opacity !== 1) {
        this.viewModel.opacity = 1;
      }
    } else if (this._elapsed < TOTAL_DURATION) {
      // Phase 3: Fade-out (opacity 1 → 0)
      const fadeElapsed = this._elapsed - SCALE_IN_DURATION - HOLD_DURATION;
      const t = 1 - fadeElapsed / FADE_OUT_DURATION;
      this.viewModel.opacity = Math.max(0, t);
    } else {
      // Animation complete — hide
      this.viewModel.opacity = 0;
      this.viewModel.visible = false;
      this._animating = false;
    }
  }
}
