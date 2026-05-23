import { Color, ColorComponent, component, Component, EventService, ExecuteOn, NetworkingService, OnEntityStartEvent, OnFocusedInteractionInputEventPayload, OnFocusedInteractionInputStartedEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, property, subscribe, TransformComponent, Vec3, type Maybe } from 'meta/worlds';
import { Events, type ICollider, type Rect } from '../Types';
import { BALL_SIZE, BALL_SPEED_BASE, BOUNDS, REVEAL_DURATION, VFX_TRAIL_INTERVAL } from '../Constants';
import { CollisionManager } from '../CollisionManager';
import { StickyBallState } from './StickyBallState';
import { LEVELS, LEVEL_DEFAULTS, DEFAULT_PALETTE, type ColorPalette, type GameplaySettings, type PhysicsSettings } from '../LevelConfig';
import { VfxService } from '../Services/VfxService';
import { JuiceService } from '../Services/JuiceService';
import { BallPowerService } from '../Services/BallPowerService';

@component()
export class Ball extends Component implements ICollider {
  private _resetPosition: Vec3 = Vec3.zero;
  private _transform!: TransformComponent;
  private _colorComponent: Maybe<ColorComponent> = null;
  private _velocity: Vec3 = Vec3.zero;
  private _sticky = new StickyBallState();
  private _baseScale: number = BALL_SIZE;
  private _scaleMultiplier: number = LEVEL_DEFAULTS.ballSizeMultiplier;

  readonly colliderTag = 'ball';

  private _isIdle = true;
  private _locked = false;   // true during level-clear/game-over — blocks input
  private _piercesLeft = 0;  // remaining pierces this frame (reset each update)

  // ── Per-level physics ────────────────────────────────────────────────────
  private _speedMultiplier: number = LEVEL_DEFAULTS.ballSpeedMultiplier;
  private _gravity: number = LEVEL_DEFAULTS.gravity;
  private _bounceRandomness: number = LEVEL_DEFAULTS.bounceRandomness;
  private _speedBonus: number = 0;
  private _speedIncrementPerBrick: number = LEVEL_DEFAULTS.ballSpeedIncrementPerBrick;

  // ── Progressive difficulty ────────────────────────────────────────────────
  private static readonly SPEED_INCREMENT_PER_LEVEL = 0.05;
  private _clearedLevelsAccumulator: number = 0;
  private _revealing = 0;

  private get _effectiveSpeed(): number {
    return (this.ballSpeed * this._speedMultiplier + this._speedBonus)
      * BallPowerService.get().speedMultiplier;
  }

  private ballSpeed: number = BALL_SPEED_BASE;

  private _isClient = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this.entity.requestOwnership();
    this._transform = this.entity.getComponent(TransformComponent)!;
    this._resetPosition = this._transform.worldPosition;

    const children = this.entity.getChildrenWithComponent(ColorComponent);
    this._colorComponent = children.length > 0
      ? children[0].getComponent(ColorComponent)
      : this.entity.getComponent(ColorComponent);

    CollisionManager.get().register(this);
  }

  @subscribe(Events.LoadLevel)
  private onLoadLevel(payload: Events.LoadLevelPayload): void {
    const config = LEVELS[payload.levelIndex];
    this._revealing = REVEAL_DURATION;
    this._applyPhysics(config.physics ?? {});
    this._applyPalette(config.palette);
    this._applyGameplay(config.gameplay);
  }

  private _applyPalette(palette: ColorPalette | undefined): void {
    if (!this._colorComponent) return;
    const [r, g, b] = palette?.ball ?? DEFAULT_PALETTE.ball;
    this._colorComponent.color = new Color(r, g, b, 1);
  }

  private _applyPhysics(p: PhysicsSettings): void {
    this._speedMultiplier        = (p.ballSpeedMultiplier ?? LEVEL_DEFAULTS.ballSpeedMultiplier)
                                   + this._clearedLevelsAccumulator * Ball.SPEED_INCREMENT_PER_LEVEL;
    this._gravity                = p.gravity                    ?? LEVEL_DEFAULTS.gravity;
    this._bounceRandomness       = p.bounceRandomness           ?? LEVEL_DEFAULTS.bounceRandomness;
    this._speedIncrementPerBrick = p.ballSpeedIncrementPerBrick ?? LEVEL_DEFAULTS.ballSpeedIncrementPerBrick;
  }

  private _applyGameplay(g: GameplaySettings | undefined): void {
    this._scaleMultiplier = g?.ballSizeMultiplier ?? LEVEL_DEFAULTS.ballSizeMultiplier;
    this._updateScale();
  }

  private _updateScale()
  {
    const reveal = 1-(Math.max(this._revealing, 0) / REVEAL_DURATION);
    const m = this._baseScale * this._scaleMultiplier * reveal;
    this._transform.localScale = Vec3.one.mul(m);
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStarted(_payload: OnFocusedInteractionInputEventPayload): void {
    if (this._locked) return;
    if (this._sticky.isStuck || this._isIdle) {
      this._launch();
      return;
    }
  }

  // ── Sticky ────────────────────────────────────────────────────────────────

  @subscribe(Events.StickyPaddleActivated)
  private onStickyPaddleActivated(): void {
    this._sticky.activate();
  }

  @subscribe(Events.StickyPaddleDeactivated)
  private onStickyPaddleDeactivated(): void {
    if (this._sticky.deactivate()) this._launch();
  }

  @subscribe(Events.BallLost)
  private onBallLost(): void {
    this._clearedLevelsAccumulator = 0;
    this._isIdle = true;
    this._velocity = Vec3.zero;
    this._sticky.reset();
  }

  @subscribe(Events.BrickDestroyed)
  private onBrickDestroyed(): void {
    this._speedBonus += this._speedIncrementPerBrick;
  }

  @subscribe(Events.LevelCleared)
  private onLevelCleared(): void {
    this._clearedLevelsAccumulator++;
    this._velocity = Vec3.zero;
    this._isIdle = true;
    this._locked = true;
    // Hide off-screen
    this._transform.worldPosition = new Vec3(0, -100, 0);
  }

  private _launch(): void {
    if (!this._isClient) return;
    this._isIdle = false;
    EventService.sendLocally(Events.ReleaseBall, {});
    const pos = this._transform.worldPosition;
    const v = this._sticky.getLaunchVelocity(this._effectiveSpeed, pos.x);
    if (v) this._velocity = v;
  }

  // ── Collision ─────────────────────────────────────────────────────────────

  getColliderBounds(): Rect {
    const pos = this._transform.worldPosition;
    const r = this._transform.localScale.x * 0.5;
    return { x: pos.x - r, y: pos.y - r, w: r * 2, h: r * 2 };
  }

  onCollision(other: ICollider): void {
    if (other.colliderTag === 'paddle' && this._velocity.y < 0) {
      const paddleBounds = other.getColliderBounds();
      const pos = this._transform.worldPosition;
      const r = this._transform.localScale.x * 0.5;

      this._transform.worldPosition = new Vec3(pos.x, paddleBounds.y + paddleBounds.h + r, pos.z);

      EventService.sendLocally(Events.PaddleHit, {
        position: new Vec3(pos.x, paddleBounds.y + paddleBounds.h, pos.z),
        ballVelocityX: this._velocity.x,
        ballVelocityY: this._velocity.y,
      });

      if (this._sticky.tryStick(other, pos.x)) return;

      this._bounceOffPaddle(paddleBounds, pos.x);
      return;
    }

    if (other.colliderTag === 'brick') {
      // Pierce: skip the bounce, ball tears through — costs combo
      if (this._piercesLeft > 0) {
        this._piercesLeft--;
        BallPowerService.get().consumePierce();
        return;
      }

      const brickBounds = other.getColliderBounds();
      const pos = this._transform.worldPosition;
      const r = this._transform.localScale.x * 0.5;

      const overlapX = Math.min(pos.x + r, brickBounds.x + brickBounds.w) - Math.max(pos.x - r, brickBounds.x);
      const overlapY = Math.min(pos.y + r, brickBounds.y + brickBounds.h) - Math.max(pos.y - r, brickBounds.y);

      const brickCx = brickBounds.x + brickBounds.w * 0.5;
      const brickCy = brickBounds.y + brickBounds.h * 0.5;

      let vx = this._velocity.x;
      let vy = this._velocity.y;

      if (overlapX < overlapY) {
        if ((vx > 0 && pos.x < brickCx) || (vx < 0 && pos.x > brickCx)) vx = -vx;
      } else {
        if ((vy > 0 && pos.y < brickCy) || (vy < 0 && pos.y > brickCy)) vy = -vy;
      }
      [vx, vy] = this._withBounceRandomness(vx, vy);
      this._velocity = new Vec3(vx, vy, 0);
    }
  }

  private _bounceOffPaddle(paddleBounds: Rect, ballX: number): void {
    const paddleCenterX = paddleBounds.x + paddleBounds.w / 2;
    const hitFactor = (ballX - paddleCenterX) / (paddleBounds.w / 2);
    const angle = hitFactor * (Math.PI / 3);
    this._velocity = new Vec3(
      this._effectiveSpeed * Math.sin(angle),
      this._effectiveSpeed * Math.cos(angle),
      0
    );
  }

  /** Applies a slight angular variance to break repetitive bounce patterns. */
  private _withBounceRandomness(vx: number, vy: number): [number, number] {
    if (this._bounceRandomness === 0) return [vx, vy];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * this._bounceRandomness * Math.PI;
    return [speed * Math.cos(angle), speed * Math.sin(angle)];
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  @subscribe(Events.ResetRound)
  private onResetRound(): void {
    this._velocity = Vec3.zero;
    this._locked = true;
    setTimeout(() => { this._reset(); }, 200);
  }

  private _reset(): void {
    this._transform.worldPosition = this._resetPosition;
    this._velocity = Vec3.zero;
    this._isIdle = true;
    this._locked = false;
    this._sticky.reset();
    this._speedBonus = 0;
  }


  // ── Update ────────────────────────────────────────────────────────────────

  private _trailTimer = 0;

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;
    if (JuiceService.get().frozen) return;

    if (this._revealing > 0)
    {
      this._updateScale();
      this._revealing -= (payload.deltaTime * 2);
      return;
    }

    const initPos = this._transform.worldPosition;
    const r = this._transform.localScale.x * 0.5;

    const stuck = this._sticky.getConstrainedPosition(r, initPos.z);
    if (stuck) {
      this._transform.worldPosition = stuck;
      return;
    }

    if (this._isIdle) return;

    const dt = payload.deltaTime;
    this._piercesLeft = BallPowerService.get().pierceCount;

    // Split movement into substeps so the ball never travels more than one radius per step.
    // This prevents tunneling through bricks and ensures checkAgainst fires at intermediate positions.
    const speed = Math.sqrt(this._velocity.x ** 2 + this._velocity.y ** 2);
    const steps = Math.min(8, Math.max(1, Math.ceil((speed * dt) / r)));
    const subDt = dt / steps;

    const color = this._colorComponent?.color ?? Color.white;
    if (this._trailTimer > VFX_TRAIL_INTERVAL)
    {
      VfxService.get().spawnTrail(r*2, initPos.x, initPos.y, initPos.z, color.r, color.g, color.b);
      this._trailTimer = Math.max(0, this._trailTimer - VFX_TRAIL_INTERVAL);
    }
    else
      this._trailTimer += dt;

    for (let s = 0; s < steps; s++) {
      let vx = this._velocity.x;
      let vy = this._velocity.y - this._gravity * subDt;

      const cur = this._transform.worldPosition;
      let nx = cur.x + vx * subDt;
      let ny = cur.y + vy * subDt;

      if (nx - r <= BOUNDS.x) {
        nx = BOUNDS.x + r;
        vx = Math.abs(vx);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      } else if (nx + r >= BOUNDS.x + BOUNDS.w) {
        nx = BOUNDS.x + BOUNDS.w - r;
        vx = -Math.abs(vx);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      }

      if (ny + r >= BOUNDS.y + BOUNDS.h) {
        ny = BOUNDS.y + BOUNDS.h - r;
        vy = -Math.abs(vy);
        [vx, vy] = this._withBounceRandomness(vx, vy);
      }

      if (ny - r <= BOUNDS.y) {
        EventService.sendLocally(Events.BallLost, {});
        return;
      }

      this._velocity = new Vec3(vx, vy, 0);
      this._transform.worldPosition = new Vec3(nx, ny, cur.z);

      // Check collisions at this substep position. onCollision may update this._velocity.
      CollisionManager.get().checkAgainst(this);
    }
  }
}
