import {
  Component, component, subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
  NetworkingService,
  WorldService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/worlds';
import { GamePhase } from '../Types';
import { TOTAL_SHOTS } from '../Constants';
import {
  ShotFiredEvent, ShotFiredPayload,
  PhaseChangedEvent, PhaseChangedPayload,
  PointsReadyEvent, PointsReadyPayload,
  GameResetEvent, GameResetPayload,
} from '../Events/GameEvents';

// ── Dot animation constants ──────────────────────────────────────────
const EXPLOSION_DURATION = 0.25;   // seconds
const EXPLOSION_SCALE_END = 2.0;
const POPIN_DURATION = 0.40;       // seconds per dot
const POPIN_STAGGER = 0.10;        // seconds between dots
const POPIN_OPACITY_PHASE = 0.30;  // fraction of duration for opacity fade-in

enum DotAnimType {
  None = 0,
  Explosion = 1,
  PopIn = 2,
}

@uiViewModel()
class ShotDotViewModel extends UiViewModel {
  Active: boolean = true;
  Scale: number = 1;
  Opacity: number = 1;
  DotFill: string = '#FF4CAF50';
  DotStroke: string = '#FFFFFFFF';
}

@uiViewModel()
class SoccerKickHudViewModel extends UiViewModel {
  ScoreText: string = '0';
  ScoreScale: number = 1;       // elastic bounce on score arrival
  ScoreColor: string = '#FFFFFFFF';  // flash gold on score arrival
  shotDots: readonly ShotDotViewModel[] = [];
  InstructionText: string = '';
  InstructionVisible: boolean = false;
  InstructionOpacity: number = 1;
  InstructionTranslateY: number = 0;
}

/**
 * Component Attachment: Scene Entity (HUD CustomUi entity)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 */
@component()
export class SoccerKickHudComponent extends Component {
  private _viewModel: SoccerKickHudViewModel = new SoccerKickHudViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  // Mutable backing array for dot ViewModels (we replace the readonly array on the VM to trigger updates)
  private _dots: ShotDotViewModel[] = [];

  // Score roll-up state
  private _scoreRolling  = false;
  private _scoreElapsed  = 0;
  private _scoreFrom     = 0;
  private _scoreTo       = 0;
  private _scoreRollDur  = 0.55;  // count-up duration

  // Impact animation — elastic bounce + gold flash, triggered on PointsReady
  private _scoreImpacting    = false;
  private _scoreImpactElapsed = 0;
  private _scoreImpactDur    = 0.70;  // total impact anim duration

  // Per-dot animation state (indices 0..TOTAL_SHOTS-1)
  private _dotAnimType:    number[] = [];
  private _dotAnimElapsed: number[] = [];
  private _dotAnimDelay:   number[] = [];

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._customUi = this.entity.getComponent(CustomUiComponent);

    // Initialize dot ViewModels based on TOTAL_SHOTS
    this._dots = [];
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      const dot = new ShotDotViewModel();
      dot.Active = true;
      dot.Scale = 1;
      dot.Opacity = 1;
      this._dots.push(dot);
    }
    this._viewModel.shotDots = [...this._dots];

    // Initialize animation arrays
    this._dotAnimType = new Array(TOTAL_SHOTS).fill(DotAnimType.None);
    this._dotAnimElapsed = new Array(TOTAL_SHOTS).fill(0);
    this._dotAnimDelay = new Array(TOTAL_SHOTS).fill(0);

    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
    this._updateDots(TOTAL_SHOTS);
    console.log('[SoccerKickHudComponent] Initialized with dynamic dot array, count=' + TOTAL_SHOTS);
  }

  // ── Update: instruction bob + score roll-up + dot animations ───────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;

    if (this._viewModel.InstructionVisible) {
      const t = WorldService.get().getWorldTime();
      this._viewModel.InstructionTranslateY = Math.sin(t * 1.5) * 10;
    }

    if (this._scoreRolling) {
      this._scoreElapsed += dt;
      const p = Math.min(this._scoreElapsed / this._scoreRollDur, 1);
      const eased = this._easeOutExpo(p);
      this._viewModel.ScoreText = `${Math.round(this._scoreFrom + (this._scoreTo - this._scoreFrom) * eased)}`;
      if (p >= 1) {
        this._scoreRolling = false;
        this._viewModel.ScoreText = `${this._scoreTo}`;
      }
    }

    if (this._scoreImpacting) {
      this._scoreImpactElapsed += dt;
      const p = Math.min(this._scoreImpactElapsed / this._scoreImpactDur, 1);
      this._viewModel.ScoreScale = this._elasticImpact(p);
      this._viewModel.ScoreColor = this._goldFlash(p);
      if (p >= 1) {
        this._scoreImpacting = false;
        this._viewModel.ScoreScale = 1;
        this._viewModel.ScoreColor = '#FFFFFFFF';
      }
    }

    // Tick per-dot animations
    this._tickDotAnimations(dt);
  }

  // ── Shot fired → explosion on the consumed dot ─────────────────────

  @subscribe(ShotFiredEvent)
  onShotFired(p: ShotFiredPayload): void {
    const dotIndex = p.shotsLeft;
    if (dotIndex >= 0 && dotIndex < TOTAL_SHOTS) {
      this._startExplosion(dotIndex);
    }
    this._updateDots(p.shotsLeft);
  }

  // ── Points ready (casino drained) → start score roll-up + pulse ────

  @subscribe(PointsReadyEvent)
  onPointsReady(p: PointsReadyPayload): void {
    const prev = this._scoreTo;
    this._scoreFrom          = prev;
    this._scoreTo            = p.score;
    this._scoreElapsed       = 0;
    this._scoreRolling       = p.score !== prev;
    this._scoreImpactElapsed = 0;
    this._scoreImpacting     = p.score !== prev;
  }

  // ── Phase changed → instruction text ───────────────────────────────

  @subscribe(PhaseChangedEvent)
  onPhaseChanged(p: PhaseChangedPayload): void {
    if (p.phase === GamePhase.GameOver) {
      if (this._customUi) this._customUi.isVisible = false;
      return;
    }
    if (this._customUi) this._customUi.isVisible = true;
    if (p.phase === GamePhase.Aim) {
      this._viewModel.InstructionText = 'Swipe to shoot';
      this._viewModel.InstructionVisible = true;
    } else {
      this._viewModel.InstructionVisible = false;
    }
  }

  // ── Game reset → restore everything + pop-in animation ─────────────

  @subscribe(GameResetEvent)
  onGameReset(p: GameResetPayload): void {
    if (this._customUi) this._customUi.isVisible = true;
    this._scoreFrom          = 0;
    this._scoreTo            = 0;
    this._scoreRolling       = false;
    this._scoreImpacting     = false;
    this._scoreImpactElapsed = 0;
    this._viewModel.ScoreText  = '0';
    this._viewModel.ScoreScale = 1;
    this._viewModel.ScoreColor = '#FFFFFFFF';

    this._updateDots(p.shotsLeft);
    this._startPopIn();
  }

  // ── Dot Animation Helpers ──────────────────────────────────────────

  private _startExplosion(dotIndex: number): void {
    this._dotAnimType[dotIndex] = DotAnimType.Explosion;
    this._dotAnimElapsed[dotIndex] = 0;
    this._dotAnimDelay[dotIndex] = 0;
    this._setDotScale(dotIndex, 1);
    this._setDotOpacity(dotIndex, 1);
  }

  private _startPopIn(): void {
    // Iterate over the actual dot array, not TOTAL_SHOTS. The first GameResetEvent
    // is fired by GameManager._spawnEntities() at startup, which can arrive before
    // this component's onStart() has populated _dots — guarding here avoids a
    // "Cannot set properties of undefined (setting 'DotFill')" crash.
    for (let i = 0; i < this._dots.length; i++) {
      this._dotAnimType[i] = DotAnimType.PopIn;
      this._dotAnimElapsed[i] = 0;
      this._dotAnimDelay[i] = i * POPIN_STAGGER;
      this._setDotScale(i, 0);
      this._setDotOpacity(i, 0);
      // Reset colors to active (green filled) for pop-in
      this._dots[i].DotFill = '#FF4CAF50';
      this._dots[i].DotStroke = '#FFFFFFFF';
    }
  }

  private _tickDotAnimations(dt: number): void {
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      const animType = this._dotAnimType[i];
      if (animType === DotAnimType.None) continue;

      if (this._dotAnimDelay[i] > 0) {
        this._dotAnimDelay[i] -= dt;
        if (this._dotAnimDelay[i] > 0) continue;
        this._dotAnimElapsed[i] = -this._dotAnimDelay[i];
        this._dotAnimDelay[i] = 0;
      } else {
        this._dotAnimElapsed[i] += dt;
      }

      if (animType === DotAnimType.Explosion) {
        this._tickExplosion(i);
      } else if (animType === DotAnimType.PopIn) {
        this._tickPopIn(i);
      }
    }
  }

  private _tickExplosion(i: number): void {
    const p = Math.min(this._dotAnimElapsed[i] / EXPLOSION_DURATION, 1);
    const eased = this._easeOutQuad(p);

    const scale = 1 + (EXPLOSION_SCALE_END - 1) * eased;
    const opacity = 1 - eased;

    this._setDotScale(i, scale);
    this._setDotOpacity(i, opacity);

    if (p >= 1) {
      this._dotAnimType[i] = DotAnimType.None;
      this._setDotScale(i, 1);
      this._setDotOpacity(i, 1); // Keep dot visible - Active=false gives hollow outline look
    }
  }

  private _tickPopIn(i: number): void {
    const p = Math.min(this._dotAnimElapsed[i] / POPIN_DURATION, 1);

    const scale = this._elasticPopIn(p);
    const opacityP = Math.min(p / POPIN_OPACITY_PHASE, 1);
    const opacity = this._easeOutQuad(opacityP);

    this._setDotScale(i, scale);
    this._setDotOpacity(i, opacity);

    if (p >= 1) {
      this._dotAnimType[i] = DotAnimType.None;
      this._setDotScale(i, 1);
      this._setDotOpacity(i, 1);
    }
  }

  // ── Dot Scale/Opacity Setters (array-based) ────────────────────────

  private _setDotScale(index: number, value: number): void {
    if (index >= 0 && index < this._dots.length) {
      this._dots[index].Scale = value;
    }
  }

  private _setDotOpacity(index: number, value: number): void {
    if (index >= 0 && index < this._dots.length) {
      this._dots[index].Opacity = value;
    }
  }

  // ── Shared Helpers ─────────────────────────────────────────────────

  private _updateDots(shotsLeft: number): void {
    for (let i = 0; i < this._dots.length; i++) {
      const active = i < shotsLeft;
      this._dots[i].Active = active;
      this._dots[i].DotFill = active ? '#FF4CAF50' : 'Transparent';
      this._dots[i].DotStroke = active ? '#FFFFFFFF' : '#CCFFFFFF';
    }
  }

  private _elasticImpact(t: number): number {
    if (t < 0.15) {
      return 1 + (t / 0.15) * 0.55;
    } else if (t < 0.40) {
      const p = (t - 0.15) / 0.25;
      return 1.55 - p * 0.67;
    } else if (t < 0.60) {
      const p = (t - 0.40) / 0.20;
      return 0.88 + p * 0.24;
    } else {
      const p = (t - 0.60) / 0.40;
      return 1.12 - p * 0.12;
    }
  }

  private _elasticPopIn(t: number): number {
    if (t < 0.25) {
      const p = t / 0.25;
      return p * 1.35;
    } else if (t < 0.50) {
      const p = (t - 0.25) / 0.25;
      return 1.35 - p * 0.45;
    } else if (t < 0.75) {
      const p = (t - 0.50) / 0.25;
      return 0.90 + p * 0.18;
    } else {
      const p = (t - 0.75) / 0.25;
      return 1.08 - p * 0.08;
    }
  }

  private _goldFlash(t: number): string {
    const p  = Math.min(t / 0.65, 1);
    const r  = 0xFF;
    const g  = Math.round(0xD7 + (0xFF - 0xD7) * p);
    const b  = Math.round(0x00 + 0xFF * p);
    const rh = r.toString(16).padStart(2, '0');
    const gh = g.toString(16).padStart(2, '0');
    const bh = b.toString(16).padStart(2, '0');
    return `#FF${rh}${gh}${bh}`;
  }

  private _easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  private _easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
}
