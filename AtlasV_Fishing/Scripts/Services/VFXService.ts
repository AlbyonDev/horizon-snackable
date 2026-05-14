import {
  Color,
  ColorComponent,
  HapticLocation,
  HapticsService,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Service,
  TransformComponent,
  Vec3,
  service,
  subscribe,
  type Entity,
  type Maybe,
} from 'meta/worlds';

import { Events } from '../Types';
import { SURFACE_FREEZE_MS } from '../Constants';
import { GameCameraService } from './GameCameraService';

// =============================================================================
//  VFXService — centralised visual feedback.
//
//  Public API
//  ──────────
//  shake(duration, amplitude)            camera shake via GameCameraService
//  flash(duration, color?)               fade-out flash overlay
//  freeze(durationMs)                    global time-stop (camera excluded)
//  haptic(intensity)                     stub — wire up SDK haptics when available
//  stretch(entity, factor, duration)     scale Y up / X down then recover
//  squash(entity, factor, duration)      scale Y down / X up then recover
//
//  Freeze guard
//  ────────────
//  Other onUpdate handlers call `if (VFXService.get().isFrozen) return;`
//  GameCameraService is exempt so shake continues during freeze.
//
//  Registration (called from ClientSetup)
//  ──────────────────────────────────────
//  registerFlashPlane(entity)
// =============================================================================

interface ScaleAnim {
  tc       : TransformComponent;
  baseScale: number;   // uniform base size
  scaleX   : number;   // current X multiplier
  scaleY   : number;   // current Y multiplier
  targetX  : number;
  targetY  : number;
  timer    : number;
  duration : number;
}

@service()
export class VFXService extends Service {

  // ── Flash ────────────────────────────────────────────────────────────────────
  private _flashCc    : Maybe<ColorComponent> = null;
  private _flashTimer  = 0;
  private _flashDur    = 0;
  private _flashR      = 1;
  private _flashG      = 1;
  private _flashB      = 1;

  // ── Freeze ───────────────────────────────────────────────────────────────────
  private _freezeEnd   = 0;   // performance.now() timestamp

  // ── Scale anims ──────────────────────────────────────────────────────────────
  private _scaleAnims  : ScaleAnim[] = [];

  // ── Public read ──────────────────────────────────────────────────────────────
  get isFrozen(): boolean { return Date.now() < this._freezeEnd; }

  // ── Registration ─────────────────────────────────────────────────────────────

  registerFlashPlane(entity: Entity): void {
    this._flashCc = entity.getComponent(ColorComponent) ?? null;
    if (this._flashCc) this._flashCc.color = new Color(1, 1, 1, 0);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  shake(duration: number, amplitude: number): void {
    GameCameraService.get().startShake(duration, amplitude);
  }

  setContinuousShake(amplitude: number): void {
    GameCameraService.get().setContinuousShake(amplitude);
  }

  stopContinuousShake(): void {
    GameCameraService.get().stopContinuousShake();
  }

  flash(duration: number, r = 1, g = 1, b = 1): void {
    this._flashR     = r;
    this._flashG     = g;
    this._flashB     = b;
    this._flashDur   = duration;
    this._flashTimer = duration;
    if (this._flashCc) this._flashCc.color = new Color(r, g, b, 1);
  }

  freeze(durationMs: number): void {
    this._freezeEnd = Date.now() + durationMs;
  }

  haptic(intensity: 'light' | 'medium' | 'heavy'): void {
    const amp = intensity === 'light' ? 0.35 : intensity === 'medium' ? 0.6 : 0.85;
    HapticsService.get().playOneShot(HapticLocation.BothHands, {
      amplitudeEnvelope: [
        { timeMs: 0,   value: amp },
        { timeMs: 80,  value: amp },
        { timeMs: 150, value: 0.0 },
      ],
      transients: [{ timeMs: 0, amplitude: amp, frequency: 0.5 }],
    });
  }

  stretch(entity: Entity, factor: number, duration: number): void {
    this._addScaleAnim(entity, 1 / factor, factor, duration);
  }

  squash(entity: Entity, factor: number, duration: number): void {
    this._addScaleAnim(entity, factor, 1 / factor, duration);
  }

  // ── Built-in triggers ────────────────────────────────────────────────────────

  @subscribe(Events.FishHooked)
  onFishHooked(_p: Events.FishHookedPayload): void {
    this.freeze(60);
    this.shake(0.30, 0.07);
    this.haptic('medium');
  }

  @subscribe(Events.RequestSurface)
  onRequestSurface(_p: Events.RequestSurfacePayload): void {
    this.flash(0.22, 0.4, 0.9, 1.0);
    this.shake(0.25, 0.10);
    this.haptic('light');
    this.freeze(SURFACE_FREEZE_MS);
  }

  @subscribe(Events.FishCollected)
  onFishCollected(_p: Events.FishCollectedPayload): void {
    this.haptic('light');
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    const dt = p.deltaTime;
    this._tickFlash(dt);
    this._tickScaleAnims(dt);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _addScaleAnim(entity: Entity, targetX: number, targetY: number, duration: number): void {
    const tc = entity.getComponent(TransformComponent);
    if (!tc) return;
    const base = tc.localScale.x; // assume uniform scale
    // Remove any existing anim on same entity
    this._scaleAnims = this._scaleAnims.filter(a => a.tc !== tc);
    this._scaleAnims.push({ tc, baseScale: base, scaleX: 1, scaleY: 1, targetX, targetY, timer: 0, duration });
  }

  private _tickFlash(dt: number): void {
    if (!this._flashCc || this._flashTimer <= 0) return;
    this._flashTimer -= dt;
    const alpha = Math.max(0, this._flashTimer / this._flashDur);
    this._flashCc.color = new Color(this._flashR, this._flashG, this._flashB, alpha);
    if (this._flashTimer <= 0) this._flashCc.color = new Color(this._flashR, this._flashG, this._flashB, 0);
  }

  private _tickScaleAnims(dt: number): void {
    for (let i = this._scaleAnims.length - 1; i >= 0; i--) {
      const a = this._scaleAnims[i];
      a.timer += dt;
      const t = Math.min(1, a.timer / a.duration);

      // First half: deform toward target; second half: recover to 1,1
      let sx: number, sy: number;
      if (t < 0.5) {
        const u = t / 0.5;
        sx = 1 + (a.targetX - 1) * u;
        sy = 1 + (a.targetY - 1) * u;
      } else {
        const u = (t - 0.5) / 0.5;
        sx = a.targetX + (1 - a.targetX) * u;
        sy = a.targetY + (1 - a.targetY) * u;
      }

      a.scaleX = sx;
      a.scaleY = sy;
      const b = a.baseScale;
      a.tc.localScale = new Vec3(b * sx, b * sy, b);

      if (t >= 1) {
        a.tc.localScale = new Vec3(b, b, b);
        this._scaleAnims.splice(i, 1);
      }
    }
  }
}
