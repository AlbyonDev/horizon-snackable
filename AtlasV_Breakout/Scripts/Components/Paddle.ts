import { Color, component, Component, ExecuteOn, NetworkingService, OnEntityStartEvent, OnFocusedInteractionInputEventPayload, OnFocusedInteractionInputMovedEvent, OnFocusedInteractionInputStartedEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, subscribe, TransformComponent, Vec3, ColorComponent, type Maybe } from 'meta/worlds';
import { Events, PowerUpType, type ICollider, type Rect } from '../Types';
import { BOUNDS } from '../Constants';
import { CollisionManager } from '../CollisionManager';
import { createPaddleEffect, type IPowerUpEffect, type PaddleContext } from './PaddleEffects';
import { LEVELS, LEVEL_DEFAULTS, DEFAULT_PALETTE, type ColorPalette } from '../LevelConfig';

type ActiveEffect = { effect: IPowerUpEffect; timers: number[]; };

// ── Squash & Stretch config ──────────────────────────────────────────────────
const SQUASH_SCALE_X = 1.3;   // wider on impact
const SQUASH_SCALE_Y = 0.7;   // flatter on impact
const SQUASH_DURATION = 0.08; // seconds to reach squash
const RECOVER_DURATION = 0.15; // seconds to spring back
const STRETCH_FACTOR = 0.08;  // how much horizontal speed affects stretch

/**
 * Paddle Component
 *
 * Component Attachment: Scene Entity (Paddle object in space.hstf)
 * Component Networking: Local (runs on client only)
 * Component Ownership: Client owns this local entity
 *
 * Controls the paddle movement and dispatches power-up effects generically.
 */
@component()
export class Paddle extends Component implements ICollider {
  private _transform!: TransformComponent;
  private _colorComponent: Maybe<ColorComponent> = null;
  private _targetPosition: Vec3 = Vec3.zero;
  private _resetPosition: Vec3 = Vec3.zero;
  private _normalScale: Vec3 = Vec3.one;

  readonly colliderTag = 'paddle';

  private _isActive = true;
  private _activeEffects = new Map<PowerUpType, ActiveEffect>();
  private _paddleCtx!: PaddleContext;
  private _baseColor: Color = new Color(1, 1, 1, 1);

  private _flashUntil = 0;
  private _lerpFactor: number = LEVEL_DEFAULTS.paddleLerpFactor;
  private _isClient = false;

  // Squash & stretch state
  private _squashTimer = 0;       // > 0 = squashing, counts down
  private _recoverTimer = 0;      // > 0 = recovering from squash
  private _prevX = 0;             // previous frame X for velocity-based stretch
  private _smoothVelocity = 0;    // smoothed horizontal velocity

  @subscribe(OnEntityStartEvent)
  onStart() {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this.entity.requestOwnership();

    this._transform = this.entity.getComponent(TransformComponent)!;
    const color = this.entity.getChildrenWithComponent(ColorComponent);
    if (color.length > 0) {
      this._colorComponent = color[0].getComponent(ColorComponent);
    }

    this._targetPosition = this._transform.worldPosition;
    this._resetPosition = this._transform.worldPosition;
    this._normalScale = this._transform.localScale;

    CollisionManager.get().register(this);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    const config = LEVELS[payload.levelIndex];
    this._lerpFactor = config.physics?.paddleLerpFactor ?? LEVEL_DEFAULTS.paddleLerpFactor;
    this._applyPalette(config.palette);
  }

  private _applyPalette(palette: ColorPalette | undefined): void {
    const [r, g, b] = palette?.paddle ?? DEFAULT_PALETTE.paddle;
    this._baseColor = new Color(r, g, b, 1);
    if (this._colorComponent) this._colorComponent.color = this._baseColor;
    this._paddleCtx = {
      transform: this._transform,
      colorComponent: this._colorComponent,
      normalScale: this._normalScale,
    };
  }

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const hw = this._transform.localScale.x * 0.5;
    const hh = this._transform.localScale.y * 0.5;
    return { x: pos.x - hw, y: pos.y - hh, w: hw * 2, h: hh * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag !== 'ball') return;
    if (this._colorComponent) {
      this._colorComponent.color = new Color(1, 1, 1, 1);
      this._flashUntil = Date.now() + 50;
    }
    // Trigger squash on ball impact
    this._squashTimer = SQUASH_DURATION;
    this._recoverTimer = 0;
  }

  @subscribe(Events.ResetRound)
  private onResetRound(): void {
    this.reset();
  }

  private reset(): void {
    this._isActive = false;
    this._targetPosition = this._resetPosition;
    this._transform.worldPosition = this._resetPosition;

    for (const { effect } of this._activeEffects.values()) {
      effect.onEnd(this._paddleCtx);
    }
    this._activeEffects.clear();
  }

  @subscribe(Events.PowerUpCollected)
  private onPowerUpCollected(payload: Events.PowerUpCollectedPayload): void {
    const type = payload.powerUpType;
    const existing = this._activeEffects.get(type);

    if (existing) {
      if (existing.effect.stackable) {
        // Stack: new instance with its own timer
        existing.timers.push(payload.duration);
        existing.effect.onStackChanged?.(this._paddleCtx, existing.timers.length);
      } else {
        // Refresh: restart from the new timer duration
        existing.timers[0] = payload.duration;
      }
    } else {
      const effect = createPaddleEffect(type);
      effect.onStart(this._paddleCtx);
      if (effect.stackable) effect.onStackChanged?.(this._paddleCtx, 1);
      this._activeEffects.set(type, { effect, timers: [payload.duration] });
    }
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    this._isActive = true;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMoved(payload: OnFocusedInteractionInputEventPayload): void {
    if (!this._isActive) return;
    if (payload.interactionIndex !== 0) return;
    const origin = payload.worldRayOrigin;
    const direction = payload.worldRayDirection;

    const planeZ = this._transform.worldPosition.z;
    const t = (planeZ - origin.z) / direction.z;
    this._targetPosition = new Vec3(
      origin.x + t * direction.x,
      this._transform.worldPosition.y,
      planeZ
    );
  }

  updatePowerups(deltaTime: number): void {
    // ── Tick timers ──────────────────────────────────────────────────────────
    for (const [type, active] of this._activeEffects) {
      const { effect, timers } = active;

      if (!effect.stackable) {
        timers[0] -= deltaTime;
        if (timers[0] <= 0) {
          effect.onEnd(this._paddleCtx);
          this._activeEffects.delete(type);
        }
      } else {
        const before = timers.length;
        for (let i = timers.length - 1; i >= 0; i--) {
          timers[i] -= deltaTime;
          if (timers[i] <= 0) timers.splice(i, 1);
        }
        if (timers.length === 0) {
          effect.onEnd(this._paddleCtx);
          this._activeEffects.delete(type);
        } else if (timers.length !== before) {
          effect.onStackChanged?.(this._paddleCtx, timers.length);
        }
      }
    }
  }


  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;
    const dt = payload.deltaTime;
    this.updatePowerups(dt);

    // Restore base color after flash
    if (this._flashUntil > 0 && Date.now() >= this._flashUntil) {
      if (this._colorComponent) this._colorComponent.color = this._baseColor;
      this._flashUntil = 0;
    }

    // Move paddle
    const current = this._transform.worldPosition;
    const dx = this._targetPosition.x - current.x;
    const newX = current.x + dx * this._lerpFactor;
    const halfwidth = this._normalScale.x * 0.5; // use base scale for bounds
    const clampedX = Math.max(BOUNDS.x + halfwidth, Math.min(BOUNDS.x + BOUNDS.w - halfwidth, newX));
    this._transform.worldPosition = new Vec3(clampedX, current.y, current.z);

    // ── Squash & Stretch ──────────────────────────────────────────────────
    let scaleX = this._normalScale.x;
    let scaleY = this._normalScale.y;

    // Movement-based stretch: paddle elongates horizontally when moving fast
    const rawVelocity = (clampedX - this._prevX) / Math.max(dt, 0.001);
    this._prevX = clampedX;
    // Smooth velocity to avoid jitter from lerp
    this._smoothVelocity += (rawVelocity - this._smoothVelocity) * 0.15;
    const stretchAmount = Math.min(Math.abs(this._smoothVelocity) * STRETCH_FACTOR, 0.3);
    scaleX += stretchAmount;
    scaleY -= stretchAmount * 0.3; // slight vertical compression when stretching

    // Impact squash: overrides stretch briefly
    if (this._squashTimer > 0) {
      this._squashTimer -= dt;
      const t = 1 - (this._squashTimer / SQUASH_DURATION); // 0→1
      scaleX = this._normalScale.x * (1 + (SQUASH_SCALE_X - 1) * t);
      scaleY = this._normalScale.y * (1 + (SQUASH_SCALE_Y - 1) * t);
      if (this._squashTimer <= 0) {
        this._recoverTimer = RECOVER_DURATION;
      }
    } else if (this._recoverTimer > 0) {
      this._recoverTimer -= dt;
      const t = Math.max(this._recoverTimer / RECOVER_DURATION, 0); // 1→0
      scaleX = this._normalScale.x * (1 + (SQUASH_SCALE_X - 1) * t) + stretchAmount;
      scaleY = this._normalScale.y * (1 + (SQUASH_SCALE_Y - 1) * t);
    }

    this._transform.localScale = new Vec3(scaleX, scaleY, this._normalScale.z);
  }
}
