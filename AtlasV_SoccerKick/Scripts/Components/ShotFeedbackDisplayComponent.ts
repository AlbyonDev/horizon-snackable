import {
  Component, component, subscribe,
  OnEntityStartEvent, OnWorldUpdateEvent,
  ExecuteOn,
  UiViewModel,
  uiViewModel,
  EventService,
} from 'meta/worlds';
import { type OnWorldUpdateEventPayload, type Maybe, CustomUiComponent } from 'meta/worlds';
import {
  ShotFeedbackResultEvent,
  ShotFeedbackResultPayload,
} from '../Events/ShotFeedbackEvents';
import {
  ScoreChangedEvent, ScoreChangedPayload,
  PointsReadyEvent,
  ConfettiExplosionTriggerEvent,
} from '../Events/GameEvents';
import { CONFETTI_GOAL_COUNT } from '../Constants';

// ── Outcome constants (mirrors ShotOutcome const enum) ──
const OUTCOME_GOAL    = 0;
const OUTCOME_SAVE    = 1;
const OUTCOME_POSTHIT = 2;

// ── Animation profiles ──────────────────────────────────────────────────────

interface IAnimProfile {
  scalePhaseDur: number;
  holdDur:       number;
  fadeDur:       number;
  overshoot:     number;  // peak scale during pop-in
  finalScale:    number;  // resting scale
  shakeIntensity: number;
  shakeFreq:     number;
  pulseAmp:      number;  // 0 = no pulse during hold
  pulseFreq:     number;  // Hz of the pulse
  bounceCount:   number;  // extra bounces during scale phase (0 = single elastic)
  fadeScaleGrow: number;  // scale increase during fade-out
  fadeDriftY:    number;  // upward drift during fade-out (negative = up, positive = down)
  scaleYBias:    number;  // ScaleY multiplier relative to ScaleX during scale phase (1 = uniform)
  dropY:         number;  // TranslateY offset applied during hold (positive = down)
  rotationZ:     number;  // peak rotation (degrees) during scale phase, decays to 0
  // Stadium Sweep (GOAL only) — ignored when sweepMode = false
  sweepMode:     boolean;
  entryDur:      number;  // Phase 1: slide in from right
  exitDur:       number;  // Phase 3: slide out to left
  sweepX:        number;  // off-screen X offset (pixels)
  entrySkew:     number;  // SkewX at entry start (negative = lean right)
  exitSkew:      number;  // SkewX at exit end (positive = lean right on depart)
  impactScale:   number;  // scale peak at moment of arrival
  impactFontSize: number; // font size for GOAL sweep
}

const PROFILE_DEFAULT: IAnimProfile = {
  scalePhaseDur:  0.18,
  holdDur:        0.45,
  fadeDur:        0.4,
  overshoot:      2.2,
  finalScale:     1.4,
  shakeIntensity: 18,
  shakeFreq:      22,
  pulseAmp:       0,
  pulseFreq:      0,
  bounceCount:    0,
  fadeScaleGrow:  0.3,
  fadeDriftY:     -20,
  scaleYBias:     1,
  dropY:          0,
  rotationZ:      0,
  sweepMode:      false,
  entryDur:       0,
  exitDur:        0,
  sweepX:         0,
  entrySkew:      0,
  exitSkew:       0,
  impactScale:    0,
  impactFontSize: 96,
};

// MISS: pop brutal + chute dramatique + légère rotation + fondu vers le bas
// Ambiance: le tir part dans les étoiles, le texte "tombe" avec lui
const PROFILE_MISS: IAnimProfile = {
  scalePhaseDur:  0.14,   // pop-in rapide et sec
  holdDur:        0.38,
  fadeDur:        0.45,
  overshoot:      2.8,    // plus violent que default
  finalScale:     1.6,
  shakeIntensity: 28,     // tremblement "oops"
  shakeFreq:      28,     // fréquence élevée = nerveux
  pulseAmp:       0,
  pulseFreq:      0,
  bounceCount:    1,      // un rebond extra pendant le pop
  fadeScaleGrow:  0.5,    // s'étire en partant
  fadeDriftY:     60,     // tombe vers le bas (positif = bas)
  scaleYBias:     0.75,   // squash horizontal au pop (plus large que haut)
  dropY:          25,     // se décale légèrement vers le bas pendant le hold
  rotationZ:      8,      // légère rotation au pop-in
  sweepMode:      false,
  entryDur:       0,
  exitDur:        0,
  sweepX:         0,
  entrySkew:      0,
  exitSkew:       0,
  impactScale:    0,
  impactFontSize: 96,
};

// POST: vibration ultra-rapide "bruit de métal" + rebond multiple + froid
// Ambiance: le poteau résonne, le texte vibre comme du métal frappé
const PROFILE_POST: IAnimProfile = {
  scalePhaseDur:  0.22,   // plus long pour loger les bounces
  holdDur:        0.32,
  fadeDur:        0.38,
  overshoot:      2.5,
  finalScale:     1.5,
  shakeIntensity: 35,     // shake violent = résonance métal
  shakeFreq:      38,     // très haute fréquence = vibration métallique
  pulseAmp:       0.06,   // légère vibration résiduelle pendant le hold
  pulseFreq:      12,     // fréquence haute = frémissement métal
  bounceCount:    3,      // plusieurs rebonds = poteau qui résonne
  fadeScaleGrow:  0.2,
  fadeDriftY:     -15,    // dérive légèrement vers le haut
  scaleYBias:     1.3,    // stretch vertical au pop (s'étire en hauteur)
  dropY:          0,
  rotationZ:      0,
  sweepMode:      false,
  entryDur:       0,
  exitDur:        0,
  sweepX:         0,
  entrySkew:      0,
  exitSkew:       0,
  impactScale:    0,
  impactFontSize: 96,
};

// SAVED: impact de gardien — écrase depuis le haut + shake violent + tient
// Ambiance: le gardien plonge et bloque, l'écran encaisse le choc
const PROFILE_SAVED: IAnimProfile = {
  scalePhaseDur:  0.16,   // impact rapide et sec
  holdDur:        0.52,   // tient plus longtemps = le gardien a tout arrêté
  fadeDur:        0.42,
  overshoot:      3.2,    // impact très fort
  finalScale:     1.8,    // reste grand = présence dominante
  shakeIntensity: 42,     // choc de gardien qui plonge
  shakeFreq:      24,
  pulseAmp:       0.08,   // pulsation triomphale pendant le hold
  pulseFreq:      3,
  bounceCount:    0,
  fadeScaleGrow:  0.15,
  fadeDriftY:     -25,    // remonte en partant
  scaleYBias:     0.55,   // très aplati verticalement au pop = écrasement depuis le haut
  dropY:          -10,    // légèrement au-dessus du centre = gardien qui se lève
  rotationZ:      0,
  sweepMode:      false,
  entryDur:       0,
  exitDur:        0,
  sweepX:         0,
  entrySkew:      0,
  exitSkew:       0,
  impactScale:    0,
  impactFontSize: 96,
};

// Stadium Sweep profile for GOAL
// Phase layout: pass1(0.13s) → pass2(0.11s) → slam(0.10s) → explode(0.18s) → hold+exit(0.58s)
const PROFILE_GOAL: IAnimProfile = {
  scalePhaseDur: 0, // unused in sweepMode
  holdDur: 0.40, // hold after explosion
  fadeDur: 0, // unused in sweepMode
  overshoot: 3.8, // explosion scale peak
  finalScale: 2.0, // resting scale during hold
  shakeIntensity: 45, // violent shake on explosion
  shakeFreq: 22,
  pulseAmp: 0.12,
  pulseFreq: 4,
  bounceCount: 0,
  fadeScaleGrow: 0,
  fadeDriftY: 0,
  sweepMode: true,
  entryDur: 0.13, // duration of each teaser pass
  exitDur: 0.22, // exit slide after hold
  sweepX: 1100, // well off-screen
  entrySkew: -22, // lean into direction of travel
  exitSkew: 18,
  impactScale: 3.8,
  impactFontSize: 260,
  scaleYBias: 0,
  dropY: 0,
  rotationZ: 0
};

/**
 * ShotFeedbackDisplayComponent
 *
 * Subscribes to ShotFeedbackResultEvent and drives a ViewModel to animate
 * center-screen text feedback (GOAL!/MISS!/SAVED!) with elastic scale,
 * shake, and fade effects. GOAL gets an extreme variant.
 */
@uiViewModel()
class ShotFeedbackViewModel extends UiViewModel {
  FeedbackText: string = '';
  TextColor: string = '#FFFFFF';
  Opacity: number = 0;
  ScaleX: number = 1;
  ScaleY: number = 1;
  SkewX: number = 0;
  TranslateX: number = 0;
  TranslateY: number = 0;
  IsVisible: boolean = false;
  PointsText: string = '';
  PointsOpacity: number = 0;
  PointsScaleY: number = 1;   // slot-machine squash on fadeout
  FontSize: number = 96;
  StrokeThickness: number = 8;
  ComboText: string = '';
  ComboVisible: boolean = false;
  ComboOpacity: number = 0;
  RotationZ: number = 0;
}

@component()
export class ShotFeedbackDisplayComponent extends Component {
  private _viewModel: ShotFeedbackViewModel = new ShotFeedbackViewModel();
  private _customUi: Maybe<CustomUiComponent> = null;

  private _animating = false;
  private _elapsed   = 0;
  private _profile: IAnimProfile = PROFILE_DEFAULT;
  private _totalDur  = 0;

  private _currentPoints = 0;

  // Casino counter state
  private _casinoActive   = false;
  private _casinoElapsed  = 0;
  private _casinoRollDur  = 0.50;  // count-up phase: +0 → +N
  private _casinoDrainDur = 0.45;  // drain phase: +N → +0 (pour into HUD)
  private _casinoTotal    = 0;     // target points value

  // Pending score to forward once casino roll-up completes
  private _pendingScore      = -1;  // -1 = nothing pending
  private _pendingComboMulti = 1;
  private _pendingBonusZone  = '';

  // Sweep mode phase boundaries (computed on shot start)
  private _swP1End    = 0;  // end of teaser pass 1 (R→L)
  private _swP2End    = 0;  // end of teaser pass 2 (L→R)
  private _swSlamEnd  = 0;  // end of slam approach (R→center)
  private _swExplEnd  = 0;  // end of explosion burst
  private _swHoldEnd  = 0;  // end of hold
  private _swExitEnd  = 0;  // end of exit slide

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._customUi = this.entity.getComponent(CustomUiComponent);
    if (this._customUi) {
      this._customUi.dataContext = this._viewModel;
    }
  }

  @subscribe(ScoreChangedEvent, { execution: ExecuteOn.Everywhere })
  onScoreChanged(payload: ScoreChangedPayload): void {
    // Store the new score — will be forwarded via PointsReadyEvent once casino roll-up completes.
    // If no casino is running (non-goal outcome), forward immediately.
    if (this._casinoActive) {
      this._pendingScore      = payload.score;
      this._pendingComboMulti = payload.comboMulti;
    } else {
      EventService.sendLocally(PointsReadyEvent, {
        score:      payload.score,
        comboMulti: payload.comboMulti,
      });
    }

    // Update combo display — show corner tag and/or combo multiplier
    const combo      = payload.combo;
    const hasCombo   = combo >= 2;
    const bonusZone  = this._pendingBonusZone;
    this._pendingBonusZone = '';

    const parts: string[] = [];
    if (bonusZone) parts.push(bonusZone);
    if (hasCombo)  parts.push(`COMBO X${combo}`);

    const showLine = parts.length > 0;
    this._viewModel.ComboVisible = showLine;
    this._viewModel.ComboText    = parts.join('  •  ');
    this._viewModel.ComboOpacity = showLine ? 1 : 0;
  }

  @subscribe(ShotFeedbackResultEvent, { execution: ExecuteOn.Everywhere })
  onShotFeedback(payload: ShotFeedbackResultPayload): void {
    const outcome   = payload.outcome;
    const points    = payload.pointsEarned;
    const bonusZone = payload.bonusZone;

    let text:  string;
    let color: string;

    if (outcome === OUTCOME_GOAL) {
      text  = 'GOAL!';
      color = '#FFD700';
      this._profile = PROFILE_GOAL;
      this._currentPoints = points;
      EventService.sendLocally(ConfettiExplosionTriggerEvent, { count: CONFETTI_GOAL_COUNT });
      // Corner tag will be merged into ComboText via onScoreChanged
      this._pendingBonusZone = bonusZone;
    } else if (outcome === OUTCOME_SAVE) {
      text  = 'SAVED!';
      color = '#CC1111';
      this._profile = PROFILE_SAVED;
      this._currentPoints = 0;
      this._viewModel.ComboVisible = false;
      this._viewModel.ComboOpacity = 0;
    } else if (outcome === OUTCOME_POSTHIT) {
      text  = 'POST!';
      color = '#C8C8C8';
      this._profile = PROFILE_POST;
      this._currentPoints = 0;
      this._viewModel.ComboVisible = false;
      this._viewModel.ComboOpacity = 0;
    } else {
      text  = 'MISS!';
      color = '#FF5500';
      this._profile = PROFILE_MISS;
      this._currentPoints = 0;
      this._viewModel.ComboVisible = false;
      this._viewModel.ComboOpacity = 0;
    }

    const pr = this._profile;

    if (pr.sweepMode) {
      // pass1(R→L) + pass2(L→R) + slam(R→center) + explode + hold + exit
      const passDur  = pr.entryDur;          // 0.13s each teaser pass
      const slamDur  = 0.10;
      const explDur  = 0.18;
      this._swP1End   = passDur;
      this._swP2End   = passDur * 2;
      this._swSlamEnd = passDur * 2 + slamDur;
      this._swExplEnd = passDur * 2 + slamDur + explDur;
      this._swHoldEnd = passDur * 2 + slamDur + explDur + pr.holdDur;
      this._swExitEnd = passDur * 2 + slamDur + explDur + pr.holdDur + pr.exitDur;
      this._totalDur  = this._swExitEnd;
    } else {
      this._totalDur = pr.scalePhaseDur + pr.holdDur + pr.fadeDur;
    }

    this._elapsed   = 0;
    this._animating = true;

    this._viewModel.FeedbackText    = text;
    this._viewModel.TextColor       = color;
    this._viewModel.IsVisible       = true;
    this._viewModel.Opacity         = 1;
    this._viewModel.ScaleX          = pr.sweepMode ? 1 : 0;
    this._viewModel.ScaleY          = pr.sweepMode ? 1 : 0;
    this._viewModel.SkewX           = pr.sweepMode ? pr.entrySkew : 0;
    this._viewModel.TranslateX      = pr.sweepMode ? pr.sweepX : 0;
    this._viewModel.TranslateY      = 0;
    this._viewModel.FontSize        = pr.impactFontSize;
    this._viewModel.StrokeThickness = pr.sweepMode ? 14 : 8;
    if (this._currentPoints > 0) {
      this._casinoTotal   = this._currentPoints;
      this._casinoElapsed = 0;
      this._casinoActive  = true;
      this._viewModel.PointsText    = '+0';
      this._viewModel.PointsOpacity = 1;
      this._viewModel.PointsScaleY  = 1;
    } else {
      this._casinoActive            = false;
      this._viewModel.PointsText    = '';
      this._viewModel.PointsOpacity = 0;
      this._viewModel.PointsScaleY  = 1;
      this._viewModel.ComboVisible  = false;
      this._viewModel.ComboText     = '';
      this._viewModel.ComboOpacity  = 0;
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._animating) return;

    this._elapsed += payload.deltaTime;
    const pr = this._profile;

    if (this._elapsed >= this._totalDur) {
      this._animating = false;
      this._viewModel.IsVisible       = false;
      this._viewModel.Opacity         = 0;
      this._viewModel.ScaleX          = 0;
      this._viewModel.ScaleY          = 0;
      this._viewModel.SkewX           = 0;
      this._viewModel.TranslateX      = 0;
      this._viewModel.TranslateY      = 0;
      this._viewModel.RotationZ       = 0;
      this._viewModel.PointsOpacity   = 0;
      this._viewModel.FontSize        = 96;
      this._viewModel.StrokeThickness = 8;
      this._viewModel.ComboOpacity    = 0;
      this._viewModel.ComboVisible    = false;
      return;
    }

    const t = this._elapsed;

    if (this._casinoActive) {
      this._tickCasino(payload.deltaTime);
    }

    if (pr.sweepMode) {
      if (t < this._swP1End) {
        this._animSweepPass1(t, pr);
      } else if (t < this._swP2End) {
        this._animSweepPass2(t - this._swP1End, pr);
      } else if (t < this._swSlamEnd) {
        this._animSweepSlam(t - this._swP2End, pr);
      } else if (t < this._swExplEnd) {
        this._animSweepExplode(t - this._swSlamEnd, pr);
      } else if (t < this._swHoldEnd) {
        this._animSweepHold(t - this._swExplEnd, pr);
      } else {
        this._animSweepExit(t - this._swHoldEnd, pr);
      }
    } else {
      if (t < pr.scalePhaseDur) {
        this._animScalePhase(t, pr);
      } else if (t < pr.scalePhaseDur + pr.holdDur) {
        this._animHoldPhase(t - pr.scalePhaseDur, pr);
      } else {
        this._animFadePhase(t - pr.scalePhaseDur - pr.holdDur, pr);
      }
    }
  }

  // ── Casino counter ────────────────────────────────────────────────────────
  //
  //  Phase 1 — Roll-up  (0 → _casinoRollDur):  +0 → +N  (easeOutExpo)
  //  Phase 2 — Drain    (_casinoRollDur → +_casinoDrainDur):
  //              sends PointsReadyEvent once, then counts +N → +0
  //              while TranslateY drifts upward (pours into HUD)

  private _casinoDrainStarted = false;  // guard: fire PointsReadyEvent once

  private _tickCasino(dt: number): void {
    this._casinoElapsed += dt;
    const rollEnd   = this._casinoRollDur;
    const drainEnd  = this._casinoRollDur + this._casinoDrainDur;

    if (this._casinoElapsed < rollEnd) {
      // Roll-up: +0 → +N
      const p = this._easeOutExpo(this._casinoElapsed / rollEnd);
      this._viewModel.PointsText     = `+${Math.round(p * this._casinoTotal)}`;
      this._viewModel.PointsOpacity  = 1;
      this._viewModel.PointsScaleY   = 1;
      this._viewModel.TranslateY     = 0;

    } else if (this._casinoElapsed < drainEnd) {
      // Fire PointsReadyEvent once at the transition boundary
      if (!this._casinoDrainStarted) {
        this._casinoDrainStarted = true;
        if (this._pendingScore >= 0) {
          EventService.sendLocally(PointsReadyEvent, {
            score:      this._pendingScore,
            comboMulti: this._pendingComboMulti,
          });
          this._pendingScore = -1;
        }
      }

      // Drain: +N → +0, text floats upward
      const p     = (this._casinoElapsed - rollEnd) / this._casinoDrainDur;
      const eased = this._easeInQuad(p);
      this._viewModel.PointsText     = `+${Math.round((1 - eased) * this._casinoTotal)}`;
      this._viewModel.PointsOpacity  = 1 - eased;
      this._viewModel.PointsScaleY   = 1 - eased * 0.3;
      // Float upward toward HUD score badge (negative Y = up)
      this._viewModel.TranslateY     = -eased * 80;

    } else {
      this._casinoActive            = false;
      this._casinoDrainStarted      = false;
      this._viewModel.PointsOpacity = 0;
      this._viewModel.PointsText    = '';
      this._viewModel.PointsScaleY  = 1;
      this._viewModel.TranslateY    = 0;
    }
  }

  // ── Stadium Sweep phases (GOAL only) ─────────────────────────────────────

  /** Pass 1: teaser — enters from right, exits to left. Small scale, fast. */
  private _animSweepPass1(t: number, pr: IAnimProfile): void {
    const dur = pr.entryDur;
    const p   = t / dur;
    // First half: enter from right; second half: exit to left
    const tx  = p < 0.5
      ? pr.sweepX * (1 - p * 2)          // +sweepX → 0
      : -pr.sweepX * ((p - 0.5) * 2);    // 0 → -sweepX
    this._viewModel.TranslateX = tx;
    this._viewModel.SkewX      = pr.entrySkew * (1 - p);
    this._viewModel.ScaleX     = 0.9;
    this._viewModel.ScaleY     = 0.9;
    this._viewModel.Opacity    = 1;
    this._viewModel.TranslateY = 0;
  }

  /** Pass 2: teaser — enters from left, exits to right. Slightly bigger. */
  private _animSweepPass2(t: number, pr: IAnimProfile): void {
    const dur = pr.entryDur;
    const p   = t / dur;
    const tx  = p < 0.5
      ? -pr.sweepX * (1 - p * 2)         // -sweepX → 0
      : pr.sweepX * ((p - 0.5) * 2);     // 0 → +sweepX
    this._viewModel.TranslateX = tx;
    this._viewModel.SkewX      = -pr.entrySkew * (1 - p);
    this._viewModel.ScaleX     = 1.1;
    this._viewModel.ScaleY     = 1.1;
    this._viewModel.Opacity    = 1;
    this._viewModel.TranslateY = 0;
  }

  /** Slam: charges in from right → center, scale grows with approach. */
  private _animSweepSlam(t: number, pr: IAnimProfile): void {
    const slamDur = this._swSlamEnd - this._swP2End;
    const p       = this._easeInCubic(t / slamDur);
    this._viewModel.TranslateX = pr.sweepX * (1 - p);
    this._viewModel.SkewX      = pr.entrySkew * (1 - p);
    // Scale ramps from 1.1 up to impactScale as it arrives
    this._viewModel.ScaleX     = 1.1 + (pr.impactScale - 1.1) * p;
    this._viewModel.ScaleY     = 1.1 + (pr.impactScale - 1.1) * p;
    this._viewModel.Opacity    = 1;
    this._viewModel.TranslateY = 0;
  }

  /** Explosion: scale bursts from impactScale → finalScale + violent shake. */
  private _animSweepExplode(t: number, pr: IAnimProfile): void {
    const explDur = this._swExplEnd - this._swSlamEnd;
    const p       = t / explDur;
    const settleP = this._easeOutCubic(p);
    const scale   = pr.impactScale + (pr.finalScale - pr.impactScale) * settleP;
    this._viewModel.ScaleX     = scale;
    this._viewModel.ScaleY     = scale;
    const shakeDecay           = 1 - p;
    this._viewModel.TranslateX = Math.sin(t * pr.shakeFreq * 6.28) * pr.shakeIntensity * shakeDecay;
    this._viewModel.TranslateY = Math.cos(t * pr.shakeFreq * 1.7 * 6.28) * pr.shakeIntensity * 0.5 * shakeDecay;
    this._viewModel.SkewX      = 0;
    this._viewModel.Opacity    = 1;
  }

  /** Hold: rests at finalScale with gentle pulse. Points visible. */
  private _animSweepHold(ht: number, pr: IAnimProfile): void {
    let scale = pr.finalScale;
    if (pr.pulseAmp > 0) {
      scale += Math.sin(ht * pr.pulseFreq * 6.28) * pr.pulseAmp;
    }
    this._viewModel.ScaleX        = scale;
    this._viewModel.ScaleY        = scale;
    this._viewModel.TranslateX    = 0;
    this._viewModel.TranslateY    = 0;
    this._viewModel.SkewX         = 0;
    this._viewModel.Opacity       = 1;
    this._viewModel.PointsOpacity = this._currentPoints > 0 ? 1 : 0;
    this._viewModel.ComboOpacity  = this._viewModel.ComboVisible ? 1 : 0;
  }

  /** Exit: slides out to left with speed-blur stretch. */
  private _animSweepExit(et: number, pr: IAnimProfile): void {
    const p = this._easeInCubic(et / pr.exitDur);
    this._viewModel.TranslateX    = -pr.sweepX * p;
    this._viewModel.SkewX         = pr.exitSkew * p;
    this._viewModel.ScaleX        = pr.finalScale + p * 0.5;
    this._viewModel.ScaleY        = pr.finalScale - p * 0.25;
    this._viewModel.Opacity       = 1 - p * 0.3;
    this._viewModel.PointsOpacity = 1 - p;
    this._viewModel.ComboOpacity  = this._viewModel.ComboVisible ? (1 - p) : 0;
    this._viewModel.TranslateY    = 0;
  }

  // ── Phase 1: Pop-in with elastic + optional multi-bounce ──────────────────

  private _animScalePhase(t: number, pr: IAnimProfile): void {
    const p = t / pr.scalePhaseDur; // 0..1

    let scale: number;
    if (pr.bounceCount > 0) {
      // Multi-bounce: elastic with extra oscillations
      scale = this._elasticBounce(p, pr.bounceCount) * pr.overshoot;
    } else {
      scale = this._elasticOut(p) * pr.overshoot;
    }

    // scaleYBias: 1 = uniform, <1 = squash (wide), >1 = stretch (tall)
    this._viewModel.ScaleX  = scale;
    this._viewModel.ScaleY  = scale * (1 + (pr.scaleYBias - 1) * (1 - p));
    this._viewModel.Opacity = 1;

    // Rotation: peak at start, decays to 0 as scale settles
    this._viewModel.RotationZ = pr.rotationZ * (1 - p);

    // Shake
    const shakeDecay = 1 - p;
    this._viewModel.TranslateX = Math.sin(t * pr.shakeFreq * 6.28) * pr.shakeIntensity * shakeDecay;
    this._viewModel.TranslateY = Math.cos(t * pr.shakeFreq * 1.7 * 6.28) * pr.shakeIntensity * 0.6 * shakeDecay;
  }

  // ── Phase 2: Hold with settle + optional pulse ────────────────────────────

  private _animHoldPhase(ht: number, pr: IAnimProfile): void {
    const holdP = ht / pr.holdDur;
    // Settle from overshoot to final
    const settleP = this._easeOutQuad(Math.min(holdP * 2.5, 1));
    let scale = pr.overshoot + (pr.finalScale - pr.overshoot) * settleP;

    // Breathing pulse
    if (pr.pulseAmp > 0) {
      scale += Math.sin(ht * pr.pulseFreq * 6.28) * pr.pulseAmp;
    }

    this._viewModel.ScaleX     = scale;
    this._viewModel.ScaleY     = scale;
    this._viewModel.Opacity    = 1;
    this._viewModel.TranslateX = 0;
    // dropY settles in: full offset at start of hold, decays to 0
    this._viewModel.TranslateY = pr.dropY * (1 - settleP);
    this._viewModel.RotationZ  = 0;
  }

  // ── Phase 3: Fade-out + expand + drift ────────────────────────────────────

  private _animFadePhase(ft: number, pr: IAnimProfile): void {
    const fadeP     = ft / pr.fadeDur;
    const easedFade = this._easeInQuad(fadeP);

    this._viewModel.Opacity       = 1 - easedFade;
    this._viewModel.PointsOpacity = 1 - easedFade;
    this._viewModel.ComboOpacity  = this._viewModel.ComboVisible ? (1 - easedFade) : 0;

    const scale = pr.finalScale + easedFade * pr.fadeScaleGrow;
    this._viewModel.ScaleX     = scale;
    this._viewModel.ScaleY     = scale;
    this._viewModel.TranslateX = 0;
    // fadeDriftY: negative = up, positive = down
    this._viewModel.TranslateY = easedFade * pr.fadeDriftY;
    this._viewModel.RotationZ  = 0;
  }

  // ── Easing functions ──────────────────────────────────────────────────────

  private _elasticOut(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p = 0.4;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * 6.28 / p) + 1;
  }

  /** Elastic with extra bounces — more oscillations, tighter decay. */
  private _elasticBounce(t: number, bounces: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const freq = 0.4 / (bounces + 1);
    return Math.pow(2, -12 * t) * Math.sin((t - freq / 4) * 6.28 / freq) + 1;
  }

  private _easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private _easeInQuad(t: number): number {
    return t * t;
  }

  private _easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  private _easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private _easeInCubic(t: number): number {
    return t * t * t;
  }
}
