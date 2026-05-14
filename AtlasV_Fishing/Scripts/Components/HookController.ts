import {
  Color,
  ColorComponent,
  Component,
  EventService,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputStartedEvent,
  type OnFocusedInteractionInputEventPayload,
  OnWorldUpdateEvent,
  type OnWorldUpdateEventPayload,
  Quaternion,
  TransformComponent,
  Vec3,
  component,
  property,
  subscribe,
  type Entity,
} from 'meta/worlds';

import {
  WATER_SURFACE_Y, HALF_W, TIP_X, TIP_Y, HOOK_IDLE_X, HOOK_IDLE_Y,
  COLOR_LINE, COLOR_LINE_WATER,
  CAST_CENTER_VX, CAST_VX_RANDOM, CAST_VX_MIN, CAST_VY, CAST_GRAVITY,
  DIVE_SPEED, DIVE_SWIPE_FORCE, DIVE_SWIPE_MAX_SPEED, DIVE_X_DRAG, DIVE_BOUNCE, DIVE_CENTER_PULL,
  LINE_THICKNESS,
  lineDepthAtLevel, hookMaxFishAtLevel,
  SURFACE_SPEED,
  LAUNCH_VY_MIN, LAUNCH_VY_MAX, LAUNCH_VX_SPREAD, LAUNCH_GRAVITY, LAUNCH_STAGGER, LAUNCH_TIMEOUT, LAUNCH_EXIT_Y, LAUNCH_ANCHOR_X,
  HOOK_RETURN_STIFFNESS, HOOK_RETURN_DAMPING,
  DEPTH_SCALE_MIN, DEPTH_SCALE_FULL_AT,
  HOOK_BUBBLE_INTERVAL_DIVE, HOOK_BUBBLE_INTERVAL_SURFACE, HOOK_BUBBLE_X_JITTER,
} from '../Constants';
import { Events, GamePhase, type IFishInstance } from '../Types';
import { FishRegistry } from '../Services/FishRegistry';
import { FishDataService } from '../Services/FishDataService';
import { BubblePool } from '../Services/BubblePool';
import { VFXService } from '../Services/VFXService';

// =============================================================================
//  HookController
//
//  Owns all hook visuals + physics for the new dive-based gameplay.
//
//  ── Phases handled ───────────────────────────────────────────────────────────
//  Idle       — hook bobs at idle position
//  Diving     — hook descends at DIVE_SPEED; swipe adds X velocity; fish attach
//  Surfacing  — hook rises at SURFACE_SPEED; hooked fish follow
//  Launching  — staggered upward launch of all hooked fish (reward anim)
//
//  ── Emits ────────────────────────────────────────────────────────────────────
//  Events.HookMoved         — every frame (camera + pool recycling)
//  Events.FishHooked        — each time a fish is captured during dive
//  Events.FishCollected     — each fish that exits top of screen
//  Events.AllFishCollected  — when last fish has been collected
//
//  ── Editor setup ─────────────────────────────────────────────────────────────
//  Place on the rod entity. Assign hookEntity, lineAbove, lineBelow in inspector.
// =============================================================================

@component()
export class HookController extends Component {

  @property() hookEntity?: Entity;
  @property() lineAbove ?: Entity;
  @property() lineBelow ?: Entity;

  // ── Scene refs ────────────────────────────────────────────────────────────────
  private _hookTc!: TransformComponent;

  // ── Phase ─────────────────────────────────────────────────────────────────────
  private _phase: GamePhase = GamePhase.Idle;


  // ── Hook position + velocity ──────────────────────────────────────────────────
  private _hookX  = HOOK_IDLE_X;
  private _hookY  = HOOK_IDLE_Y;
  private _hookVX = 0;
  private _hookVY = 0;

  // ── Upgrade-driven limits (updated via UpgradesChanged / ProgressLoaded) ──────
  private _maxDepth:  number = 15;
  private _maxFish:   number = 1;
  private _lineLevel: number = 0;
  private _hookLevel: number = 0;

  // ── Dive state ────────────────────────────────────────────────────────────────
  private _diveStart     = WATER_SURFACE_Y;
  private _surfaceTimer  = 0;
  private _depthScale    = 1;  // 0..1 factor based on dive depth, applied to surface/launch intensity
  private _hookedFish  : IFishInstance[] = [];
  private _swipeStartX  = 0;

  // ── Hook bubble trail ─────────────────────────────────────────────────────────
  private _bubbleTimer   = 0;

  // ── Launch state ─────────────────────────────────────────────────────────────
  private _launchQueue    : IFishInstance[] = [];
  private _launchTimer    = 0;
  private _launchPending  = 0;
  private _launchInFlight = 0;
  private _launchTimeout  = 0;  // safety — fires AllFishCollected if phase never ends
  private _hookReturnVX   = 0;  // spring-back velocity X during Launching
  private _hookReturnVY   = 0;  // spring-back velocity Y during Launching

  // ── Init ──────────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    const hookTc = this.hookEntity?.getComponent(TransformComponent);
    this._hookTc = hookTc ?? this.entity.getComponent(TransformComponent)!;
    this._applyColor(this.lineAbove, COLOR_LINE);
    this._applyColor(this.lineBelow, COLOR_LINE_WATER);
    this._moveHook(HOOK_IDLE_X, HOOK_IDLE_Y);
  }

  // ── Phase sync ────────────────────────────────────────────────────────────────

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._lineLevel = p.lineLevel;
    this._hookLevel = p.hookLevel;
    this._maxDepth  = lineDepthAtLevel(p.lineLevel);
    this._maxFish   = hookMaxFishAtLevel(p.hookLevel);
  }

  @subscribe(Events.UpgradesChanged)
  onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    this._lineLevel = p.lineLevel;
    this._hookLevel = p.hookLevel;
    this._maxDepth  = p.maxDepth;
    this._maxFish   = p.maxFish;
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._phase = p.phase;

    if (p.phase === GamePhase.Throwing) {
      // Small random spread around center velocity; always rightward from rod tip
      this._hookVX    = Math.max(CAST_VX_MIN, CAST_CENTER_VX + (Math.random() * 2 - 1) * CAST_VX_RANDOM);
      this._hookVY    = CAST_VY;
      for (const fish of this._hookedFish) {
        fish.isHooked = false;
        FishDataService.get().returnToBench(fish);
      }
      this._hookedFish = [];
    }

    if (p.phase === GamePhase.Diving) {
      this._diveStart = this._hookY;
      this._bubbleTimer = 0;
    }

    if (p.phase === GamePhase.Surfacing) {
      this._hookVX = 0;
      this._surfaceTimer = 0;
      this._bubbleTimer = 0;
      const dived = Math.max(0, this._diveStart - this._hookY);
      const t = Math.min(1, dived / DEPTH_SCALE_FULL_AT);
      this._depthScale = DEPTH_SCALE_MIN + (1 - DEPTH_SCALE_MIN) * t;
    }

    if (p.phase === GamePhase.Launching) {
      this._startLaunch();
    }

    if (p.phase === GamePhase.Idle || p.phase === GamePhase.Reset) {
      for (const fish of this._hookedFish) {
        fish.isHooked = false;
        FishDataService.get().returnToBench(fish);
      }
      this._hookedFish = [];
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────────

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(p: OnFocusedInteractionInputEventPayload): void {
    this._swipeStartX = p.screenPosition.x;
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMoved(p: OnFocusedInteractionInputEventPayload): void {
    if (this._phase !== GamePhase.Diving) return;
    // Screen X is [0,1] — map delta to world impulse
    const delta = p.screenPosition.x - this._swipeStartX;
    this._swipeStartX = p.screenPosition.x;
    this._hookVX += delta * DIVE_SWIPE_FORCE;
    this._hookVX = Math.max(-DIVE_SWIPE_MAX_SPEED, Math.min(DIVE_SWIPE_MAX_SPEED, this._hookVX));

    // Instant pendulum impulse — pendulum reacts to acceleration, but swipe deltas
    // are already smoothed by drag. A direct angularVel kick gives the "snap" feel.
    EventService.sendLocally(Events.SwipeKick, { delta });
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (VFXService.get().isFrozen) return;
    const dt = p.deltaTime;

    switch (this._phase) {
      case GamePhase.Idle:
      case GamePhase.Reset:
        this._tickIdle(dt);
        break;
      case GamePhase.Throwing:
        this._tickThrowing(dt);
        break;
      case GamePhase.Diving:
        this._tickDiving(dt);
        break;
      case GamePhase.Surfacing:
        this._tickSurfacing(dt);
        break;
      case GamePhase.Launching:
        this._tickLaunching(dt);
        break;
    }
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────

  private _tickIdle(_dt: number): void {
    const t = Date.now() / 1000;
    this._moveHook(HOOK_IDLE_X, HOOK_IDLE_Y + Math.sin(t * 1.2) * 0.04);
  }

  // ── Throwing ──────────────────────────────────────────────────────────────────

  private _tickThrowing(dt: number): void {
    this._hookVY += CAST_GRAVITY * dt;
    this._hookX  += this._hookVX * dt;
    this._hookX   = Math.max(-HALF_W + 0.3, Math.min(HALF_W - 0.3, this._hookX));
    this._hookY  += this._hookVY * dt;
    this._moveHook(this._hookX, this._hookY);

    if (this._hookY < WATER_SURFACE_Y) {
      EventService.sendLocally(Events.RequestDiving, {});
    }
  }

  // ── Diving ────────────────────────────────────────────────────────────────────

  private _tickDiving(dt: number): void {
    // Gentle center pull + drag
    this._hookVX += -this._hookX * DIVE_CENTER_PULL * dt;
    this._hookVX *= Math.max(0, 1 - DIVE_X_DRAG * dt);

    // Clamp to terminal descent speed
    this._hookVY = Math.min(this._hookVY, -DIVE_SPEED);

    this._hookX += this._hookVX * dt;

    // Bouncy wall collision
    const wall = HALF_W - 0.3;
    if (this._hookX > wall)  { this._hookX =  wall; this._hookVX = -Math.abs(this._hookVX) * DIVE_BOUNCE; }
    if (this._hookX < -wall) { this._hookX = -wall; this._hookVX =  Math.abs(this._hookVX) * DIVE_BOUNCE; }
    this._hookY += this._hookVY * dt;

    this._moveHook(this._hookX, this._hookY);

    // Collision — collect all fish in range this frame
    if (this._hookedFish.length < this._maxFish) {
      const hits = FishRegistry.get().findHits(this._hookX, this._hookY);
      for (const fish of hits) {
        if (this._hookedFish.length >= this._maxFish) break;
        fish.isHooked = true;
        this._hookedFish.push(fish);
        EventService.sendLocally(Events.FishHooked, { fishId: fish.fishId });
      }
    }

    // Update hooked fish positions — cluster around hook
    this._updateHookedPositions();

    // Bubble trail while underwater
    this._tickHookBubbles(dt, HOOK_BUBBLE_INTERVAL_DIVE);

    // Check end conditions
    const depth = this._diveStart - this._hookY;
    const atMax = depth >= this._maxDepth;
    const full  = this._hookedFish.length >= this._maxFish;
    if (atMax || full) {
      EventService.sendLocally(Events.RequestSurface, {});
    }
  }

  // ── Surfacing ─────────────────────────────────────────────────────────────────

  private _tickSurfacing(dt: number): void {
    this._hookY += SURFACE_SPEED * this._depthScale * dt;
    // Drift X back toward launch anchor gently
    this._hookX += (LAUNCH_ANCHOR_X - this._hookX) * Math.min(1, 2.0 * dt);
    this._hookX  = Math.max(-HALF_W + 0.3, Math.min(HALF_W - 0.3, this._hookX));

    this._moveHook(this._hookX, this._hookY);
    this._updateHookedPositions();

    // Bubble trail while underwater (faster interval for surfacing turbulence)
    this._tickHookBubbles(dt, HOOK_BUBBLE_INTERVAL_SURFACE);

    // Crescendo shake over 1.5s, capped at 0.12
    this._surfaceTimer += dt;
    const t   = Math.min(1, this._surfaceTimer / 1.5);
    const amp = 0.02 + t * t * 0.10;
    VFXService.get().setContinuousShake(amp);

    // Once hook clears water surface → request Launching
    if (this._hookY >= WATER_SURFACE_Y + 1.0) {
      VFXService.get().stopContinuousShake();
      EventService.sendLocally(Events.RequestLaunch, {});
    }
  }

  // ── Launching ─────────────────────────────────────────────────────────────────

  private _startLaunch(): void {
    this._launchQueue   = [...this._hookedFish];
    this._launchPending = this._launchQueue.length;
    this._launchInFlight = 0;
    this._launchTimer   = 0;
    this._launchTimeout = LAUNCH_TIMEOUT;

    // Park the fish cluster at the launch anchor; the hook will spring back to idle independently.
    for (const fish of this._hookedFish) {
      fish.setPosition(LAUNCH_ANCHOR_X, HOOK_IDLE_Y);
    }
    this._hookReturnVX = 0;
    this._hookReturnVY = 0;

    if (this._launchPending === 0) {
      // Nothing to launch — go straight to reset
      EventService.sendLocally(Events.AllFishCollected, { count: 0 });
    }
  }

  private _tickLaunching(dt: number): void {
    // Spring-damper return of the hook toward its idle position (independent of fish)
    const ax = (HOOK_IDLE_X - this._hookX) * HOOK_RETURN_STIFFNESS - this._hookReturnVX * HOOK_RETURN_DAMPING;
    const ay = (HOOK_IDLE_Y - this._hookY) * HOOK_RETURN_STIFFNESS - this._hookReturnVY * HOOK_RETURN_DAMPING;
    this._hookReturnVX += ax * dt;
    this._hookReturnVY += ay * dt;
    this._moveHook(
      this._hookX + this._hookReturnVX * dt,
      this._hookY + this._hookReturnVY * dt,
    );

    // Safety timeout — fires AllFishCollected if phase never ends naturally
    this._launchTimeout -= dt;
    if (this._launchTimeout <= 0) {
      EventService.sendLocally(Events.AllFishCollected, { count: this._launchPending });
      return;
    }

    // Stagger-launch fish from queue
    if (this._launchQueue.length > 0) {
      this._launchTimer -= dt;
      if (this._launchTimer <= 0) {
        const fish = this._launchQueue.shift()!;
        const vy   = (LAUNCH_VY_MIN + Math.random() * (LAUNCH_VY_MAX - LAUNCH_VY_MIN)) * this._depthScale;
        const vx   = (Math.random() * 2 - 1) * LAUNCH_VX_SPREAD * this._depthScale;
        fish.launch(vx, vy, LAUNCH_GRAVITY);
        this._launchInFlight++;
        this._launchTimer = LAUNCH_STAGGER;
      }
    }

    // Check each in-flight fish — collect at the apex of the launch arc (vy <= 0)
    // OR as soon as it crosses LAUNCH_EXIT_Y, whichever happens first.
    for (const fish of this._hookedFish) {
      if (fish.isFlying && (fish.flyVY <= 0 || fish.worldY >= LAUNCH_EXIT_Y)) {
        fish.stopFlying();
        this._launchInFlight--;
        EventService.sendLocally(Events.FishCollected, { fishId: fish.fishId, defId: fish.defId, x: fish.worldX, y: fish.worldY });

        // Recycle immediately — teleport below visible area
        FishDataService.get().returnToBench(fish);

        if (this._launchInFlight <= 0 && this._launchQueue.length === 0) {
          EventService.sendLocally(Events.AllFishCollected, { count: this._launchPending });
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private _tickHookBubbles(dt: number, interval: number): void {
    if (this._hookY >= WATER_SURFACE_Y) return;
    this._bubbleTimer -= dt;
    if (this._bubbleTimer <= 0) {
      const jx = (Math.random() * 2 - 1) * HOOK_BUBBLE_X_JITTER;
      BubblePool.get().acquire(this._hookX + jx, this._hookY);
      this._bubbleTimer = interval;
    }
  }

  private _updateHookedPositions(): void {
    for (let i = 0; i < this._hookedFish.length; i++) {
      this._hookedFish[i].setPosition(this._hookX, this._hookY);
    }
  }

  private _moveHook(x: number, y: number): void {
    this._hookX = x;
    this._hookY = y;
    if (this._hookTc) this._hookTc.worldPosition = new Vec3(x, y, 0);
    this._updateLines(x, y);
    EventService.sendLocally(Events.HookMoved, { x, y });
  }

  private _updateLines(hx: number, hy: number): void {
    const aboveEndY = Math.max(hy, WATER_SURFACE_Y);
    this._stretchLine(this.lineAbove, TIP_X, TIP_Y, hx, aboveEndY);

    const submerged = hy < WATER_SURFACE_Y;
    if (this.lineBelow) this.lineBelow.enabledSelf = submerged;
    if (submerged) this._stretchLine(this.lineBelow, hx, WATER_SURFACE_Y, hx, hy);
  }

  private _stretchLine(e: Entity | undefined, x1: number, y1: number, x2: number, y2: number): void {
    if (!e) return;
    const tc = e.getComponent(TransformComponent);
    if (!tc) return;
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    const angDeg = Math.atan2(-dx, dy) * (180 / Math.PI);
    tc.worldPosition = new Vec3((x1 + x2) / 2, (y1 + y2) / 2, 0);
    tc.localScale    = new Vec3(LINE_THICKNESS, len, LINE_THICKNESS);
    tc.worldRotation = Quaternion.fromEuler(new Vec3(0, 0, angDeg));
  }

  private _applyColor(e: Entity | undefined, c: { r: number; g: number; b: number }): void {
    const cc = e?.getComponent(ColorComponent);
    if (cc) cc.color = new Color(c.r, c.g, c.b, 1);
  }
}
