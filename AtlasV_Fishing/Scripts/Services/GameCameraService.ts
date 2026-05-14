import {
  CameraService,
  CameraComponent,
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

import { Events, GamePhase } from '../Types';
import { FishDataService } from './FishDataService';
import { CAMERA_SCROLL_LERP_SPEED } from '../Constants';

// =============================================================================
//  GameCameraService — vertical scroll following hook during dive.
//
//  Base pose is registered once by ClientSetup via registerCamera().
//  During Diving and Surfacing the camera tracks hookY (clamped so it
//  never scrolls above the starting position).
//  During Idle / Reset / Launching the camera returns to base.
//
//  Also notifies FishDataService of current camera center so it can recycle
//  fish that scroll out of view.
// =============================================================================

@service()
export class GameCameraService extends Service {

  private _basePosX = 0;
  private _basePosY = 0;
  private _basePosZ = 0;
  private _ready    = false;

  private _scrollOffsetY = 0;
  private _scrollTargetY = 0;
  private readonly _scrollLerpSpeed = CAMERA_SCROLL_LERP_SPEED;

  private _shakeTimer     = 0;
  private _shakeDuration  = 0;
  private _shakeAmplitude = 0;
  private _shakeOffsetX   = 0;
  private _shakeOffsetY   = 0;

  // Continuous shake — independent of the one-shot timer
  private _contShakeAmp   = 0;
  private _contShakeActive = false;

  private _phase: GamePhase = GamePhase.Idle;
  private _camera: Maybe<CameraComponent> = null;

  // ── Public API ───────────────────────────────────────────────────────────────

  registerCamera(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (!tc) return;
    this._basePosX = tc.worldPosition.x;
    this._basePosY = tc.worldPosition.y;
    this._basePosZ = tc.worldPosition.z;
    this._camera = entity.getComponent(CameraComponent);
    if (this._camera) {
      CameraService.get().setActiveCamera({ camera: this._camera });
    }

    this._ready = true;
    this._applyCamera();
  }

  startShake(duration: number, amplitude: number): void {
    this._shakeTimer     = duration;
    this._shakeDuration  = duration;
    this._shakeAmplitude = amplitude;
  }

  setContinuousShake(amplitude: number): void {
    this._contShakeAmp    = amplitude;
    this._contShakeActive = amplitude > 0;
  }

  stopContinuousShake(): void {
    this._contShakeAmp    = 0;
    this._contShakeActive = false;
  }

  getCameraCenterY(): number {
    return this._basePosY + this._scrollOffsetY;
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._phase = p.phase;
    if (p.phase === GamePhase.Idle || p.phase === GamePhase.Reset || p.phase === GamePhase.Launching) {
      this._scrollTargetY = 0;
    }
  }

  @subscribe(Events.HookMoved)
  onHookMoved(p: Events.HookMovedPayload): void {
    if (!this._ready) return;
    if (this._phase !== GamePhase.Diving && this._phase !== GamePhase.Surfacing) return;

    if (p.y >= this._basePosY) {
      this._scrollTargetY = 0;
    } else {
      this._scrollTargetY = p.y - this._basePosY;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._ready) return;
    const dt = p.deltaTime;

    const diff = this._scrollTargetY - this._scrollOffsetY;
    if (Math.abs(diff) > 0.001) {
      // During Surfacing the hook rises very fast — use instant tracking
      // so the camera keeps pace. Otherwise use the smooth lerp for diving.
      const effectiveSpeed = this._phase === GamePhase.Surfacing ? 60.0 : this._scrollLerpSpeed;
      this._scrollOffsetY += diff * Math.min(1, effectiveSpeed * dt);
    } else {
      this._scrollOffsetY = this._scrollTargetY;
    }

    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      if (this._shakeTimer <= 0) {
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      } else {
        const amp = this._shakeAmplitude * (this._shakeTimer / this._shakeDuration);
        this._shakeOffsetX = (Math.random() * 2 - 1) * amp;
        this._shakeOffsetY = (Math.random() * 2 - 1) * amp;
      }
    } else if (this._contShakeActive) {
      this._shakeOffsetX = (Math.random() * 2 - 1) * this._contShakeAmp;
      this._shakeOffsetY = (Math.random() * 2 - 1) * this._contShakeAmp;
    }

    const camCenterY = this._basePosY + this._scrollOffsetY;
    FishDataService.get().setCameraY(camCenterY);

    this._applyCamera();
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _applyCamera(): void {
    if (!this._camera) return;
    const tc = this._camera.entity.getComponent(TransformComponent);
    if (!tc) return;
    tc.worldPosition = new Vec3(
      this._basePosX + this._shakeOffsetX,
      this._basePosY + this._scrollOffsetY + this._shakeOffsetY,
      this._basePosZ,
    );
  }
}
