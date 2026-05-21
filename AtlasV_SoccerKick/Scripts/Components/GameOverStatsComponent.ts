import {
  Component, component, subscribe,
  OnEntityStartEvent, OnWorldUpdateEvent,
  ExecuteOn,
  UiViewModel, UiEvent,
  uiViewModel,
  EventService,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/worlds';
import { GamePhase } from '../Types';
import type { IGameSnapshot } from '../Types';
import { GameStateService } from '../Services/GameStateService';
import { BallService } from '../Services/BallService';
import { GoalkeeperService } from '../Services/GoalkeeperService';
import {
  PhaseChangedEvent, PhaseChangedPayload,
  GameResetEvent, GameResetPayload,
} from '../Events/GameEvents';
import { TOTAL_SHOTS, STARS_3_ACCURACY, STARS_2_ACCURACY } from '../Constants';

// ── UiEvent for Replay button click ──────────────────────────────────
const onReplayClickEvent = new UiEvent('GameOverStatsViewModel-onReplayClick');

// ── Animation phase enum ─────────────────────────────────────────────
enum GameOverAnimPhase {
  Idle = 0,
  CardEntrance = 1,
  StatsCountUp = 2,
  StarsPopIn = 3,
  ReplayFadeIn = 4,
  Done = 5,
}

// ── Animation timing constants ───────────────────────────────────────
const CARD_ENTRANCE_DUR = 0.4;
const STATS_COUNT_DUR = 0.8;
const STARS_TOTAL_DUR = 0.6;  // 3 stars × 0.2s each
const STAR_POP_DELAY = 0.2;
const REPLAY_FADE_DUR = 0.4;
const REPLAY_PULSE_SPEED = 3.0; // Hz
const REPLAY_PULSE_AMP = 0.06;

const VERBOSE_LOG = false;

/**
 * GameOverStatsComponent
 *
 * Component Attachment: Scene entity in space.hstf (GameOverStats)
 * Component Networking: Local (all entities are local in this project)
 * Component Ownership: Not Networked
 *
 * Displays a full-screen game over stats overlay after all 6 shots.
 * Shows score, goals (X/6), precision %, best combo, star rating, and a replay button.
 * Subscribes to PhaseChangedEvent to detect GameOver and GameResetEvent to hide.
 * Drives frame-by-frame animation via OnWorldUpdateEvent.
 */
@uiViewModel()
class GameOverStatsViewModel extends UiViewModel {
  // Overlay visibility
  OverlayVisible: boolean = false;

  // Card animation (content container scale/opacity)
  CardScaleX: number = 0;
  CardScaleY: number = 0;
  CardOpacity: number = 0;

  // Stats text (count-up animation targets)
  ScoreText: string = '0';
  GoalsText: string = '0/6';
  PrecisionText: string = '0%';
  BestComboText: string = 'x0';

  // Star visibility (pop in one by one)
  Star1Visible: boolean = false;
  Star2Visible: boolean = false;
  Star3Visible: boolean = false;
  Star1Color: string = '#555555';
  Star2Color: string = '#555555';
  Star3Color: string = '#555555';

  // Star scale for pop animation
  Star1Scale: number = 0;
  Star2Scale: number = 0;
  Star3Scale: number = 0;

  // Replay button
  ReplayButtonOpacity: number = 0;
  ReplayButtonScale: number = 1;

  // UiEvent for replay button
  override readonly events = { onReplayClickEvent };
}

@component()
export class GameOverStatsComponent extends Component {
  private _viewModel: GameOverStatsViewModel = new GameOverStatsViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  // Animation state
  private _animPhase: GameOverAnimPhase = GameOverAnimPhase.Idle;
  private _phaseElapsed = 0;

  // Snapshot data (captured when GameOver fires)
  private _targetScore = 0;
  private _targetGoals = 0;
  private _targetAccuracy = 0;
  private _targetBestCombo = 0;
  private _starCount = 0;

  // Count-up interpolation
  private _currentScoreDisplay = 0;
  private _currentGoalsDisplay = 0;
  private _currentAccuracyDisplay = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    console.log('[GameOverStatsComponent] Initialized');
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
      this._customUi.isVisible = false;
    }
    // Ensure overlay is hidden initially
    this._viewModel.OverlayVisible = false;
  }

  // ── PhaseChanged → detect GameOver ──────────────────────────────────

  @subscribe(PhaseChangedEvent, { execution: ExecuteOn.Everywhere })
  onPhaseChanged(p: PhaseChangedPayload): void {
    if (p.phase === GamePhase.GameOver) {
      if (this._customUi)
        this._customUi.isVisible = true;
      this._captureStats();
      this._startAnimation();
    }
  }

  // ── GameReset → hide overlay ────────────────────────────────────────

  @subscribe(GameResetEvent, { execution: ExecuteOn.Everywhere })
  onGameReset(_p: GameResetPayload): void {
    console.log('[GameOverStatsComponent] Game reset, hiding overlay');
    this._hideOverlay();
  }

  // ── Replay button click ─────────────────────────────────────────────

  @subscribe(onReplayClickEvent)
  onReplayClick(): void {
    console.log('[GameOverStatsComponent] Replay button clicked');
    this._hideOverlay();
    GameStateService.get().reset();
    BallService.get().reset();
    GoalkeeperService.get().reset();
  }

  // ── Frame-by-frame animation ────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (this._animPhase === GameOverAnimPhase.Idle || this._animPhase === GameOverAnimPhase.Done) {
      // In Done phase, just pulse the replay button
      if (this._animPhase === GameOverAnimPhase.Done) {
        this._phaseElapsed += payload.deltaTime;
        const pulse = 1 + Math.sin(this._phaseElapsed * REPLAY_PULSE_SPEED * 6.28) * REPLAY_PULSE_AMP;
        this._viewModel.ReplayButtonScale = pulse;
      }
      return;
    }

    this._phaseElapsed += payload.deltaTime;

    switch (this._animPhase) {
      case GameOverAnimPhase.CardEntrance:
        this._animCardEntrance();
        break;
      case GameOverAnimPhase.StatsCountUp:
        this._animStatsCountUp();
        break;
      case GameOverAnimPhase.StarsPopIn:
        this._animStarsPopIn();
        break;
      case GameOverAnimPhase.ReplayFadeIn:
        this._animReplayFadeIn();
        break;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private _captureStats(): void {
    const snap: IGameSnapshot = GameStateService.get().snapshot();
    this._targetScore = snap.score;
    this._targetGoals = snap.goals;
    this._targetAccuracy = snap.accuracy; // 0..1
    this._targetBestCombo = snap.bestCombo;

    if (snap.accuracy >= STARS_3_ACCURACY) {
      this._starCount = 3;
    } else if (snap.accuracy >= STARS_2_ACCURACY) {
      this._starCount = 2;
    } else {
      this._starCount = 1;
    }

    if (VERBOSE_LOG) {
      console.log(`[GameOverStatsComponent] Stats: score=${snap.score}, goals=${snap.goals}, accuracy=${snap.accuracy}, bestCombo=${snap.bestCombo}, stars=${this._starCount}`);
    }
  }

  private _startAnimation(): void {
    // Reset display values
    this._currentScoreDisplay = 0;
    this._currentGoalsDisplay = 0;
    this._currentAccuracyDisplay = 0;

    // Reset ViewModel
    this._viewModel.CardScaleX = 0;
    this._viewModel.CardScaleY = 0;
    this._viewModel.CardOpacity = 0;
    this._viewModel.ScoreText = '0';
    this._viewModel.GoalsText = `0/${TOTAL_SHOTS}`;
    this._viewModel.PrecisionText = '0%';
    this._viewModel.BestComboText = 'x0';
    this._viewModel.Star1Visible = false;
    this._viewModel.Star2Visible = false;
    this._viewModel.Star3Visible = false;
    this._viewModel.Star1Color = '#555555';
    this._viewModel.Star2Color = '#555555';
    this._viewModel.Star3Color = '#555555';
    this._viewModel.Star1Scale = 0;
    this._viewModel.Star2Scale = 0;
    this._viewModel.Star3Scale = 0;
    this._viewModel.ReplayButtonOpacity = 0;
    this._viewModel.ReplayButtonScale = 1;

    // Show overlay and start Phase 1
    this._viewModel.OverlayVisible = true;
    this._animPhase = GameOverAnimPhase.CardEntrance;
    this._phaseElapsed = 0;
  }

  private _hideOverlay(): void {
    if (this._customUi)
      this._customUi.isVisible = false;
    this._animPhase = GameOverAnimPhase.Idle;
    this._phaseElapsed = 0;
    this._viewModel.OverlayVisible = false;
    this._viewModel.CardOpacity = 0;
    this._viewModel.CardScaleX = 0;
    this._viewModel.CardScaleY = 0;
  }

  // ── Phase 1: Card elastic pop-in (0 → overshoot → 1) ───────────────

  private _animCardEntrance(): void {
    const t = Math.min(this._phaseElapsed / CARD_ENTRANCE_DUR, 1);
    const scale = this._elasticOut(t);
    this._viewModel.CardScaleX = scale;
    this._viewModel.CardScaleY = scale;
    this._viewModel.CardOpacity = Math.min(t * 3, 1); // Quick fade in

    if (t >= 1) {
      this._viewModel.CardScaleX = 1;
      this._viewModel.CardScaleY = 1;
      this._viewModel.CardOpacity = 1;
      this._advancePhase(GameOverAnimPhase.StatsCountUp);
    }
  }

  // ── Phase 2: Stats count up progressively ───────────────────────────

  private _animStatsCountUp(): void {
    const t = Math.min(this._phaseElapsed / STATS_COUNT_DUR, 1);
    const easedT = this._easeOutCubic(t);

    // Count up score
    const newScore = Math.round(easedT * this._targetScore);
    if (newScore !== this._currentScoreDisplay) {
      this._currentScoreDisplay = newScore;
      this._viewModel.ScoreText = `${newScore}`;
    }

    // Count up goals
    const newGoals = Math.round(easedT * this._targetGoals);
    if (newGoals !== this._currentGoalsDisplay) {
      this._currentGoalsDisplay = newGoals;
      this._viewModel.GoalsText = `${newGoals}/${TOTAL_SHOTS}`;
    }

    // Count up precision (same as old accuracy but renamed)
    const newAccuracy = Math.round(easedT * this._targetAccuracy * 100);
    if (newAccuracy !== this._currentAccuracyDisplay) {
      this._currentAccuracyDisplay = newAccuracy;
      this._viewModel.PrecisionText = `${newAccuracy}%`;
    }

    if (t >= 1) {
      // Snap to final values
      this._viewModel.ScoreText = `${this._targetScore}`;
      this._viewModel.GoalsText = `${this._targetGoals}/${TOTAL_SHOTS}`;
      this._viewModel.PrecisionText = `${Math.round(this._targetAccuracy * 100)}%`;
      this._viewModel.BestComboText = `x${this._targetBestCombo}`;
      this._advancePhase(GameOverAnimPhase.StarsPopIn);
    }
  }

  // ── Phase 3: Stars pop in one-by-one with 0.2s delay ────────────────

  private _animStarsPopIn(): void {
    const t = this._phaseElapsed;
    const goldColor = '#FFD700';
    const grayColor = '#555555';

    // Star 1 (always earned)
    if (t >= 0) {
      const starT = Math.min((t - 0) / STAR_POP_DELAY, 1);
      this._viewModel.Star1Visible = true;
      this._viewModel.Star1Scale = this._elasticOut(starT);
      this._viewModel.Star1Color = this._starCount >= 1 ? goldColor : grayColor;
    }

    // Star 2
    if (t >= STAR_POP_DELAY) {
      const starT = Math.min((t - STAR_POP_DELAY) / STAR_POP_DELAY, 1);
      this._viewModel.Star2Visible = true;
      this._viewModel.Star2Scale = this._elasticOut(starT);
      this._viewModel.Star2Color = this._starCount >= 2 ? goldColor : grayColor;
    }

    // Star 3
    if (t >= STAR_POP_DELAY * 2) {
      const starT = Math.min((t - STAR_POP_DELAY * 2) / STAR_POP_DELAY, 1);
      this._viewModel.Star3Visible = true;
      this._viewModel.Star3Scale = this._elasticOut(starT);
      this._viewModel.Star3Color = this._starCount >= 3 ? goldColor : grayColor;
    }

    if (t >= STARS_TOTAL_DUR) {
      this._viewModel.Star1Scale = 1;
      this._viewModel.Star2Scale = 1;
      this._viewModel.Star3Scale = 1;
      this._advancePhase(GameOverAnimPhase.ReplayFadeIn);
    }
  }

  // ── Phase 4: Replay button fade-in + pulse ──────────────────────────

  private _animReplayFadeIn(): void {
    const t = Math.min(this._phaseElapsed / REPLAY_FADE_DUR, 1);
    this._viewModel.ReplayButtonOpacity = this._easeOutCubic(t);
    this._viewModel.ReplayButtonScale = 1;

    if (t >= 1) {
      this._viewModel.ReplayButtonOpacity = 1;
      this._advancePhase(GameOverAnimPhase.Done);
    }
  }

  // ── Phase transition ────────────────────────────────────────────────

  private _advancePhase(next: GameOverAnimPhase): void {
    this._animPhase = next;
    this._phaseElapsed = 0;
  }

  // ── Easing functions ────────────────────────────────────────────────

  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p = 0.35;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * 6.28 / p) + 1;
  }

  private _easeOutCubic(t: number): number {
    const t1 = 1 - t;
    return 1 - t1 * t1 * t1;
  }
}
