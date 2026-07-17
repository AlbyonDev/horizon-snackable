/**
 * BossWarningHudController — Shows a dramatic "BOSS LEVEL" banner on boss level start
 * and displays a persistent single modifier badge showing the active boss modifier.
 *
 * Component Attachment: Scene entity (BossWarningUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked (single-player tower defense)
 *
 * Banner: Triggered on LevelSelected when nodeType === 'boss'. Fades in, holds, fades out
 * over ~3 seconds total. Same animation pattern as WaveBannerHud.
 *
 * Modifier Badge: Shows a single large badge during the entire boss level.
 * Hides on RestartGame or when a non-boss level is selected.
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
import { BossModifierService } from '../Services/BossModifierService';

// ── Animation timing constants ──────────────────────────────────────────
const BANNER_SCALE_IN = 0.4;
const BANNER_HOLD = 2.0;
const BANNER_FADE_OUT = 0.6;
const BANNER_TOTAL = BANNER_SCALE_IN + BANNER_HOLD + BANNER_FADE_OUT;

// ── ViewModel ───────────────────────────────────────────────────────────

@uiViewModel()
export class BossWarningViewModel extends UiViewModel {
  // Banner state
  showBanner: boolean = false;
  bannerOpacity: number = 0;

  // Single modifier badge
  showModifiers: boolean = false;
  modifierText: string = '';
}

// ── Component ───────────────────────────────────────────────────────────

@component()
export class BossWarningHudController extends Component {
  private viewModel: Maybe<BossWarningViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Banner animation state
  private _animating: boolean = false;
  private _elapsed: number = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide panel to prevent unresolved binding flash
    this.uiComponent.isVisible = false;

    this.viewModel = new BossWarningViewModel();
    this.uiComponent.dataContext = this.viewModel;
  }

  // ── Events ────────────────────────────────────────────────────────────

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    if (p.nodeType === 'boss') {
      console.log('[BossWarningHudController] Boss level detected — showing banner & modifier badge');

      // Show the panel
      if (this.uiComponent) this.uiComponent.isVisible = true;

      // Start banner animation
      this.viewModel.showBanner = true;
      this.viewModel.bannerOpacity = 0;
      this._elapsed = 0;
      this._animating = true;

      // Populate single modifier badge
      this._populateModifier();
    } else {
      // Not a boss level — hide everything
      this._hideAll();
    }
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_p: Events.RestartGamePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideAll();
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_p: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._hideAll();
  }

  // ── Animation tick ────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._animating || !this.viewModel) return;

    this._elapsed += payload.deltaTime;

    if (this._elapsed < BANNER_SCALE_IN) {
      // Phase 1: Fade in
      this.viewModel.bannerOpacity = this._elapsed / BANNER_SCALE_IN;
    } else if (this._elapsed < BANNER_SCALE_IN + BANNER_HOLD) {
      // Phase 2: Hold
      if (this.viewModel.bannerOpacity !== 1) {
        this.viewModel.bannerOpacity = 1;
      }
    } else if (this._elapsed < BANNER_TOTAL) {
      // Phase 3: Fade out
      const fadeElapsed = this._elapsed - BANNER_SCALE_IN - BANNER_HOLD;
      this.viewModel.bannerOpacity = Math.max(0, 1 - fadeElapsed / BANNER_FADE_OUT);
    } else {
      // Animation done — hide banner, keep modifier badge
      this.viewModel.bannerOpacity = 0;
      this.viewModel.showBanner = false;
      this._animating = false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _populateModifier(): void {
    if (!this.viewModel) return;

    const svc = BossModifierService.get();
    const label = svc.activeModifierLabel;
    this.viewModel.modifierText = label;
    this.viewModel.showModifiers = label.length > 0;
    console.log(`[BossWarningHudController] Active modifier: "${label}"`);
  }

  private _hideAll(): void {
    if (!this.viewModel) return;

    this._animating = false;
    this._elapsed = 0;
    this.viewModel.showBanner = false;
    this.viewModel.bannerOpacity = 0;
    this.viewModel.showModifiers = false;
    this.viewModel.modifierText = '';

    if (this.uiComponent) this.uiComponent.isVisible = false;
  }
}
