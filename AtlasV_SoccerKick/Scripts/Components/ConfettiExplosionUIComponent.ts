/**
 * ConfettiExplosionUIComponent
 *
 * Component Attachment: Scene entity (local entity in space.hstf) with CustomUiComponent
 * Component Networking: Local-only UI, runs on client only
 * Component Ownership: Not Networked — client-side visual effect
 *
 * A full-screen confetti explosion overlay with a dynamic number of animated
 * colored rectangles that fall from top to bottom. Uses ItemsControl with
 * sub-ViewModels so the piece count is controlled by code at trigger time.
 *
 * **Option 1 — LocalEvent (recommended for decoupled systems):**
 * ```ts
 * import { ConfettiExplosionTriggerEvent } from '../Events/GameEvents';
 * EventService.sendLocally(ConfettiExplosionTriggerEvent, { count: 30 });
 * ```
 *
 * **Option 2 — Direct component reference:**
 * ```ts
 * const confetti = entity.getComponent(ConfettiExplosionUIComponent);
 * if (confetti) confetti.trigger(30);
 * ```
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
  NetworkingService,
  UiViewModel,
  uiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type {
  OnWorldUpdateEventPayload,
  Maybe,
} from 'meta/worlds';
import {
  PhaseChangedEvent, PhaseChangedPayload,
  ConfettiExplosionTriggerEvent, ConfettiExplosionTriggerPayload,
} from '../Events/GameEvents';

// ── Constants ────────────────────────────────────────────────────────
const CONFETTI_COLORS: string[] = [
  '#FFD700', // gold
  '#FF4444', // red
  '#4488FF', // blue
  '#44DD44', // green
  '#FF66AA', // pink
  '#AA44FF', // purple
  '#FF8800', // orange
  '#00DDFF', // cyan
];

// Portrait mobile: canvas is 1080×1920 (width×height)
const SCREEN_WIDTH = 1080 * 2;
const SCREEN_HEIGHT = 1920 * 2;
const OFF_SCREEN_BOTTOM = SCREEN_HEIGHT + 100;

// Confetti piece size — large enough to feel impactful on a mobile screen
const MIN_WIDTH = 40;
const MAX_WIDTH = 90;

const VERBOSE_LOG = false;

// ── Per-piece internal physics state ─────────────────────────────────
interface ConfettiPieceState {
  x: number;
  y: number;
  startX: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  driftPhase: number;
  driftFreq: number;
  driftAmp: number;
  color: string;
  width: number;
  height: number;
  skewAngle: number;
  active: boolean;
  age: number;
  life: number;
}

// ── Sub-ViewModel for each confetti piece ────────────────────────────
@uiViewModel()
export class ConfettiPieceItemViewModel extends UiViewModel {
  PieceX: number = 0;
  PieceY: number = 0;
  PieceRot: number = 0;
  PieceOpacity: number = 0;
  PieceColor: string = '#FFFFFF';
  PieceWidth: number = 20;
  PieceHeight: number = 10;
  PieceSkewAngle: number = 15;
  PieceVisible: boolean = false;
}

// ── Main ViewModel with dynamic items array ──────────────────────────
@uiViewModel()
class ConfettiExplosionViewModel extends UiViewModel {
  confettiItems: readonly ConfettiPieceItemViewModel[] = [];
}

// ── Component ────────────────────────────────────────────────────────
@component()
export class ConfettiExplosionUIComponent extends Component {
  private _viewModel: ConfettiExplosionViewModel = new ConfettiExplosionViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  private _animating = false;
  private _fadeOutRequested = false;
  private _fadeOutTime = 0;          // seconds since fade-out was requested
  private readonly _FADE_OUT_DURATION = 0.4; // seconds
  private _pieces: ConfettiPieceState[] = [];
  private _itemVMs: ConfettiPieceItemViewModel[] = [];

  // ── Lifecycle ──────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    // Skip server — this is purely client-side UI
    if (NetworkingService.get().isServerContext()) return;

    console.log('[ConfettiExplosionUIComponent] Initializing confetti overlay');
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
      this._customUi.isVisible = false;
    }
  }

  // ── Phase changed → start fade out ────────────────────────────────

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(_p: PhaseChangedPayload): void {
    if (!this._animating) return;
    this._fadeOutRequested = true;
    this._fadeOutTime = 0;
  }

  // ── Trigger (LocalEvent) ───────────────────────────────────────────

  @subscribe(ConfettiExplosionTriggerEvent)
  onTriggerEvent(payload: ConfettiExplosionTriggerPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const count = payload.count > 0 ? payload.count : 100;
    this.trigger(count);
  }

  // ── Trigger (direct call) ──────────────────────────────────────────

  /**
   * Starts the confetti explosion animation with the given number of pieces.
   * Call this directly or send ConfettiExplosionTriggerEvent as a LocalEvent.
   */
  public trigger(count: number = 60): void {
    console.log(`[ConfettiExplosionUIComponent] Confetti triggered with ${count} pieces!`);

    if (!this._customUi) return;
    this._customUi.isVisible = true;
    this._animating = true;
    this._fadeOutRequested = false;
    this._fadeOutTime = 0;

    // Build new arrays of pieces and sub-ViewModels
    this._pieces = [];
    this._itemVMs = [];

    for (let i = 0; i < count; i++) {
      const w = MIN_WIDTH + Math.random() * (MAX_WIDTH - MIN_WIDTH);
      const h = w * 0.5; // aspect ratio ~2:1
      const skew = 10 + Math.random() * 20; // 10-30 degrees

      // Distribute evenly across width then add jitter to avoid clustering
      const slot = (i / count) * SCREEN_WIDTH;
      const spawnX = (slot + (Math.random() - 0.5) * (SCREEN_WIDTH / count) * 2 + SCREEN_WIDTH) % SCREEN_WIDTH;

      const startY = -(Math.random() * SCREEN_HEIGHT * 0.6);
      const speed  = 900 + Math.random() * 1100;
      // life = time to travel from startY to OFF_SCREEN_BOTTOM
      const life   = (OFF_SCREEN_BOTTOM - startY) / speed;

      const piece: ConfettiPieceState = {
        x: spawnX,
        startX: spawnX,
        y: startY,
        speed,
        rotation: Math.random() * 360,
        rotationSpeed: 300 + Math.random() * 700,   // 300–1000 deg/s
        driftPhase: Math.random() * Math.PI * 2,
        driftFreq: 1.0 + Math.random() * 2.0,       // 1–3 Hz wobble
        driftAmp: 40 + Math.random() * 80,           // 40–120 px side drift
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        width: w,
        height: h,
        skewAngle: skew,
        active: true,
        age: 0,
        life,
      };
      this._pieces.push(piece);

      const vm = new ConfettiPieceItemViewModel();
      vm.PieceX = piece.x;
      vm.PieceY = piece.y;
      vm.PieceRot = piece.rotation;
      vm.PieceOpacity = 1;
      vm.PieceColor = piece.color;
      vm.PieceWidth = Math.round(w);
      vm.PieceHeight = Math.round(h);
      vm.PieceSkewAngle = skew;
      vm.PieceVisible = true;
      this._itemVMs.push(vm);
    }

    // Immutable array replacement triggers ItemsControl refresh
    this._viewModel.confettiItems = [...this._itemVMs];
  }

  // ── Animation Loop ─────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._animating) return;
    if (NetworkingService.get().isServerContext()) return;

    const dt = payload.deltaTime;

    // Advance global fade-out timer
    if (this._fadeOutRequested) {
      this._fadeOutTime += dt;
    }
    const globalFadeOut = this._fadeOutRequested
      ? Math.max(0, 1 - this._fadeOutTime / this._FADE_OUT_DURATION)
      : 1;

    let anyActive = false;
    const pieceCount = this._pieces.length;

    for (let i = 0; i < pieceCount; i++) {
      const piece = this._pieces[i];
      if (!piece.active) continue;

      piece.age += dt;

      // Fall downward
      piece.y += piece.speed * dt;

      // Horizontal sinusoidal drift
      piece.x = piece.startX + Math.sin(piece.y * 0.005 + piece.driftPhase) * piece.driftAmp;

      // Advance rotation
      piece.rotation += piece.rotationSpeed * dt;

      // Fade in quickly (first 10% of life), stay fully opaque until phase change
      const t      = piece.age / piece.life;
      const fadeIn = Math.min(1, t / 0.1);
      const opacity = fadeIn * globalFadeOut;

      const vm = this._itemVMs[i];

      const doneByLife    = piece.age >= piece.life;
      const doneByFadeOut = this._fadeOutRequested && this._fadeOutTime >= this._FADE_OUT_DURATION;

      if (doneByLife || doneByFadeOut) {
        piece.active = false;
        vm.PieceOpacity = 0;
        vm.PieceVisible = false;
      } else {
        anyActive = true;
        vm.PieceX = piece.x;
        vm.PieceY = piece.y;
        vm.PieceRot = piece.rotation;
        vm.PieceOpacity = opacity;
      }
    }

    if (!anyActive) {
      this._animating = false;
      // Clear the items array to free sub-ViewModels
      this._viewModel.confettiItems = [];
      this._pieces = [];
      this._itemVMs = [];
      if (this._customUi) {
        this._customUi.isVisible = false;
      }
      if (VERBOSE_LOG) {
        console.log('[ConfettiExplosionUIComponent] All pieces finished, hiding overlay');
      }
    }
  }
}
