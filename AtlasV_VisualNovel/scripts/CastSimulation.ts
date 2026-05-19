/**
 * CastSimulation — Cast physics, rod animation, trajectory preview, and the
 * float's visual state from launch through bounce.
 *
 * Owns all 3D physics state (rod, floater position/velocity, line segments,
 * Verlet rope), 2D screen-space float coords, the trajectory aim/preview
 * state, the landing splash + bounce, and the per-action float dip/tension
 * that the dialogue layer triggers via `applyActionImpact`.
 *
 * Does NOT own phase transitions, encounter selection, or any ViewModel
 * writes — the orchestrator/presenter consume the public read-only getters
 * and route phase changes (e.g. `onFlightLanded` reports landing; the
 * orchestrator decides what phase to enter next).
 */

import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  CAST_START_X, CAST_START_Y,
  CAST_FLIGHT_TIME, CAST_MIN_ARC_HEIGHT, CAST_MAX_ARC_HEIGHT,
  SPLASH_RIPPLE_COUNT, SPLASH_RIPPLE_DELAY, SPLASH_RIPPLE_EXPAND_SPEED,
  FLOAT_LANDED_PAUSE,
  FLOAT_X, FLOAT_Y,
  FLOAT_BOUNCE_DURATION,
  GAUGE_CYCLE_TIME,
  ACTION_ANIM_WAIT_DURATION, ACTION_ANIM_WAIT_AMPLITUDE, ACTION_ANIM_WAIT_SPEED,
  ACTION_ANIM_TWITCH_DURATION, ACTION_ANIM_TWITCH_AMPLITUDE_Y, ACTION_ANIM_TWITCH_AMPLITUDE_X,
  ACTION_ANIM_DRIFT_DURATION, ACTION_ANIM_DRIFT_AMPLITUDE_X, ACTION_ANIM_DRIFT_AMPLITUDE_Y,
  ACTION_ANIM_REEL_DURATION, ACTION_ANIM_REEL_PULL_Y, ACTION_ANIM_REEL_BOUNCE_COUNT, ACTION_ANIM_REEL_BOUNCE_DECAY,
  FLOAT_BOUNCE_AMPLITUDE, FLOAT_BOUNCE_COUNT,
  USE_POV_CAST_ANIMATION, USE_3D_PHYSICS_CAST,
  CAST_3D_GRAVITY_Y, CAST_3D_NUM_LINE_SEGMENTS, CAST_3D_SEGMENT_LENGTH,
  CAST_3D_FOCAL_LENGTH, CAST_3D_WATER_Y, CAST_3D_MAX_FLIGHT_TIME,
  CAST_3D_SCALE_MULTIPLIER,
  CAST_3D_CALC_MIN_FLIGHT_TIME, CAST_3D_CALC_MAX_FLIGHT_TIME, CAST_3D_Y_BOOST_MULTIPLIER,
  VERLET_ROPE_NUM_PARTICLES, VERLET_ROPE_SEGMENT_LENGTH,
  VERLET_ROPE_GRAVITY, VERLET_ROPE_CONSTRAINT_ITERATIONS, VERLET_ROPE_DAMPING,
  CAST_LANDING_NEAR_Y, CAST_LANDING_FAR_Y, CAST_LANDING_X_VARIANCE, CAST_LANDING_X_OFFSET,
  CAST_TRAJ_START_X, CAST_TRAJ_START_Y,
  CAST_TRAJ_LANDING_NEAR_Y, CAST_TRAJ_LANDING_FAR_Y,
  CAST_TRAJ_DRAG_SENSITIVITY, CAST_TRAJ_X_SENSITIVITY,
  CAST_TRAJ_LANDING_MIN_X, CAST_TRAJ_LANDING_MAX_X,
  POV_CAST_START_X, POV_CAST_START_Y, POV_CAST_START_SCALE, POV_CAST_END_SCALE, POV_CAST_FLIGHT_TIME,
  POV_CAST_PEAK_X, POV_CAST_PEAK_Y, POV_CAST_PEAK_SCALE, POV_CAST_PEAK_T,
  POV_LINE_START_X, POV_LINE_START_Y,
  ROD_3D_LENGTH, ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z,
  ROD_3D_INITIAL_ANGLE, ROD_3D_TIP_Z_FACTOR,
  ROD_PHASE_WINDUP_END, ROD_PHASE_ACCELERATE_END, ROD_PHASE_RELEASE_END,
  ROD_WINDUP_PULLBACK, ROD_ACCELERATE_SWING, ROD_RELEASE_ANGLE, ROD_FOLLOWTHROUGH_SETTLE,
  RodState,
  ActionId,
} from './Constants';
import { Vec3D } from './Vec3D';
import type { SplashRipple } from './Types';

/** Outcome reported back to the orchestrator after each `update(dt)`.
 *  `null` means "still flying / landed / bouncing"; a specific value tells the
 *  orchestrator that a milestone just happened on this frame and it should
 *  trigger the corresponding phase transition. */
export type CastSimEvent = null | 'landed' | 'bounceFinished';

export class CastSimulation {
  // === Power gauge (legacy gauge-based cast — kept for non-trajectory path) ===
  powerGaugeValue: number = 0;
  private powerGaugeDir: number = 1;
  castPower: number = 50;
  lastCastPower: number = 50;

  // === Trajectory aim (touch-drag on LakeIdle) ===
  isInCastAiming: boolean = false;
  isCastTouching: boolean = false;
  private castTouchStartY: number = 0;
  private castTouchStartX: number = 0;
  castTrajectoryDistance: number = 0;
  castTrajectoryOffsetX: number = 0;
  previewLandingX: number = 0;
  previewLandingY: number = 0;

  // === Flight state (2D screen) ===
  castFlightT: number = 0;
  castFloatX: number = 0;
  castFloatY: number = 0;
  castFloatScale: number = 1.0;
  castFloatRotation: number = 0;
  private prevCastFloatScreenX: number = 0;
  private prevCastFloatScreenY: number = 0;

  // === Bezier / 3D ballistic flight ===
  isBezierFlying: boolean = false;
  bezierFlightT: number = 0;
  bezierFlightDuration: number = 0.6;

  // === Verlet rope (line during bezier flight) ===
  verletPositions: Vec3D[] = [];
  verletPrevPositions: Vec3D[] = [];

  // === Splash + landing ===
  splashRipples: SplashRipple[] = [];
  private splashTimer: number = 0;
  private floatLandedTimer: number = 0;
  landingLineSnapshot: { x: number; y: number }[] = [];

  // === Float bounce (post-landing) ===
  floatBounceTimer: number = 0;
  surpriseEmojiTimer: number = 0;
  showingSurpriseEmoji: boolean = false;

  // === Dynamic landing target ===
  landingTargetX: number = FLOAT_X;
  landingTargetY: number = FLOAT_Y;

  // === 3D physics cast ===
  floater3DPos: Vec3D = new Vec3D();
  floater3DVel: Vec3D = new Vec3D();
  lineSegments3D: Vec3D[] = [];
  private castFlyingTimer: number = 0;

  // === 3D fishing rod ===
  rod3D: { basePos: Vec3D; tipPos: Vec3D; angle: number } = {
    basePos: new Vec3D(),
    tipPos: new Vec3D(),
    angle: 0,
  };
  rodState: RodState = RodState.WindUp;

  // === Action-driven float visuals (set by DialogueController.handleAction) ===
  floatDip: number = 0;
  lineTension: number = 0.5;
  actionAnimType: ActionId | null = null;
  private actionAnimTimer: number = 0;
  private actionAnimDuration: number = 0;
  actionAnimOffsetX: number = 0;
  actionAnimOffsetY: number = 0;

  // === Public API: per-frame updates dispatched by orchestrator ===

  updatePowerGauge(dt: number): void {
    const speed = (100 / (GAUGE_CYCLE_TIME / 2));
    this.powerGaugeValue += this.powerGaugeDir * speed * dt;
    if (this.powerGaugeValue >= 100) { this.powerGaugeValue = 100; this.powerGaugeDir = -1; }
    else if (this.powerGaugeValue <= 0) { this.powerGaugeValue = 0; this.powerGaugeDir = 1; }
  }

  /** Slow decay of the action-driven dip applied to the float during dialogue
   *  exchanges. Called every frame regardless of phase. */
  updateFloatDip(dt: number): void {
    if (this.floatDip > 0) this.floatDip = Math.max(0, this.floatDip - dt * 20);
  }

  /** Drive the CastFlying phase. Returns 'landed' on the frame the float
   *  touches water (caller transitions to FloatLanded). */
  updateFlight(dt: number): CastSimEvent {
    // === 3D Ballistic Flight (replaces flat bezier) ===
    if (this.isBezierFlying) {
      // Integrate gravity: vel.y += gravity * dt
      this.floater3DVel = new Vec3D(
        this.floater3DVel.x,
        this.floater3DVel.y + CAST_3D_GRAVITY_Y * dt,
        this.floater3DVel.z
      );

      // Integrate position: pos += vel * dt
      this.floater3DPos = new Vec3D(
        this.floater3DPos.x + this.floater3DVel.x * dt,
        this.floater3DPos.y + this.floater3DVel.y * dt,
        this.floater3DPos.z + this.floater3DVel.z * dt
      );

      // Project 3D position to screen space
      const projected = this.project3Dto2D(this.floater3DPos);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;

      // Compute rotation from frame-to-frame projected position delta
      const dx = this.castFloatX - this.prevCastFloatScreenX;
      const dy = this.castFloatY - this.prevCastFloatScreenY;
      const tangentAngle = (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)
        ? Math.atan2(dy, dx) * (180 / Math.PI)
        : this.castFloatRotation;
      this.prevCastFloatScreenX = this.castFloatX;
      this.prevCastFloatScreenY = this.castFloatY;
      // Damped wobble based on flight progress
      this.bezierFlightT += dt / this.bezierFlightDuration;
      const wobble = Math.sin(this.bezierFlightT * Math.PI * 3) * (1 - Math.min(1, this.bezierFlightT)) * 15;
      this.castFloatRotation = tangentAngle + wobble;

      // Check landing: flight time elapsed (projectile reached target)
      if (this.bezierFlightT >= 1.0) {
        this.isBezierFlying = false;
        this.castFloatX = this.landingTargetX;
        this.castFloatY = this.landingTargetY;
        this.castFloatScale = 1.0;
        this.castFloatRotation = 0;
        this.beginLanded();
        return 'landed';
      }

      // Safety: max flight time exceeded
      if (this.bezierFlightT >= 1.5) {
        this.isBezierFlying = false;
        this.landingTargetX = this.castFloatX;
        this.landingTargetY = this.castFloatY;
        this.castFloatScale = 1.0;
        this.castFloatRotation = 0;
        this.beginLanded();
        return 'landed';
      }

      // === Verlet Rope Simulation ===
      const rodTip3D = this.unproject2Dto3D(POV_LINE_START_X, POV_LINE_START_Y, 1.2);
      const floatScale = this.castFloatScale > 0.01 ? this.castFloatScale : 0.5;
      const float3D = this.unproject2Dto3D(this.castFloatX, this.castFloatY, floatScale);
      const numP = this.verletPositions.length;

      if (numP >= 2) {
        for (let i = 1; i < numP - 1; i++) {
          const cur = this.verletPositions[i];
          const prev = this.verletPrevPositions[i];
          const vx = (cur.x - prev.x) * VERLET_ROPE_DAMPING;
          const vy = (cur.y - prev.y) * VERLET_ROPE_DAMPING;
          const vz = (cur.z - prev.z) * VERLET_ROPE_DAMPING;
          const newPos = new Vec3D(
            cur.x + vx,
            cur.y + vy + VERLET_ROPE_GRAVITY * dt * dt,
            cur.z + vz
          );
          this.verletPrevPositions[i] = cur;
          this.verletPositions[i] = newPos;
        }

        // Pin endpoints
        this.verletPrevPositions[0] = this.verletPositions[0];
        this.verletPositions[0] = rodTip3D;
        this.verletPrevPositions[numP - 1] = this.verletPositions[numP - 1];
        this.verletPositions[numP - 1] = float3D;

        // Distance constraint iterations
        for (let iter = 0; iter < VERLET_ROPE_CONSTRAINT_ITERATIONS; iter++) {
          this.verletPositions[0] = rodTip3D;
          this.verletPositions[numP - 1] = float3D;

          for (let i = 0; i < numP - 1; i++) {
            const a = this.verletPositions[i];
            const b = this.verletPositions[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 0.001) continue;
            const diff = (dist - VERLET_ROPE_SEGMENT_LENGTH) / dist;
            const offsetX = dx * 0.5 * diff;
            const offsetY = dy * 0.5 * diff;
            const offsetZ = dz * 0.5 * diff;

            if (i > 0) {
              this.verletPositions[i] = new Vec3D(
                a.x + offsetX, a.y + offsetY, a.z + offsetZ
              );
            }
            if (i + 1 < numP - 1) {
              this.verletPositions[i + 1] = new Vec3D(
                b.x - offsetX, b.y - offsetY, b.z - offsetZ
              );
            }
          }
        }
      }

      return null;
    }

    if (USE_3D_PHYSICS_CAST) {
      return this.updateCastFlying3D(dt);
    } else if (USE_POV_CAST_ANIMATION) {
      return this.updateCastFlightPOV(dt);
    } else {
      return this.updateCastFlightSideView(dt);
    }
  }

  /** Drive the FloatLanded phase. Returns 'bounceFinished' is never raised
   *  here — that comes from updateBounce. The orchestrator transitions to
   *  FloatBounce once `floatLandedTimer >= FLOAT_LANDED_PAUSE`. */
  updateLanded(dt: number): boolean {
    this.splashTimer += dt;
    this.floatLandedTimer += dt;
    for (let i = 0; i < this.splashRipples.length; i++) {
      const ripple = this.splashRipples[i];
      const rippleStartTime = i * SPLASH_RIPPLE_DELAY;
      if (this.splashTimer >= rippleStartTime) {
        const elapsed = this.splashTimer - rippleStartTime;
        ripple.radius = elapsed * SPLASH_RIPPLE_EXPAND_SPEED;
        ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      }
    }
    if (this.floatLandedTimer >= FLOAT_LANDED_PAUSE) {
      this.splashRipples = [];
      return true;
    }
    return false;
  }

  /** Drive the FloatBounce phase. Returns true when the bounce duration has
   *  elapsed and the orchestrator should transition into startCast. */
  updateBounce(dt: number): boolean {
    this.floatBounceTimer += dt;
    this.settleLineSegments(dt);
    return this.floatBounceTimer >= FLOAT_BOUNCE_DURATION;
  }

  /** Per-frame action-impact float animation (Wait/Twitch/Drift/Reel). Owned
   *  here because it animates the float, not the portrait. Triggered by
   *  `applyActionImpact()` from DialogueController. */
  updateActionAnimation(dt: number): void {
    if (this.actionAnimType === null) return;

    this.actionAnimTimer += dt;
    const t = Math.min(1, this.actionAnimTimer / this.actionAnimDuration);

    switch (this.actionAnimType) {
      case ActionId.Wait: {
        const decay = 1 - t;
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * ACTION_ANIM_WAIT_SPEED) * ACTION_ANIM_WAIT_AMPLITUDE * decay;
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Reel: {
        if (t < 0.25) {
          const pullT = t / 0.25;
          const eased = 1 - Math.pow(1 - pullT, 3);
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * eased;
        } else {
          const bounceT = (t - 0.25) / 0.75;
          const decay = Math.pow(ACTION_ANIM_REEL_BOUNCE_DECAY, bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT);
          const bounce = Math.sin(bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT * Math.PI * 2);
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * decay * bounce * (1 - bounceT);
        }
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Drift: {
        let driftX: number;
        if (t < 0.2) {
          const easeT = t / 0.2;
          driftX = easeT * easeT * ACTION_ANIM_DRIFT_AMPLITUDE_X;
        } else if (t < 0.7) {
          const holdT = (t - 0.2) / 0.5;
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X + Math.sin(holdT * Math.PI) * 4;
        } else {
          const easeT = (t - 0.7) / 0.3;
          const eased = 1 - Math.pow(easeT, 2);
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X * eased;
        }
        this.actionAnimOffsetX = driftX;
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * 4) * ACTION_ANIM_DRIFT_AMPLITUDE_Y;
        break;
      }
      case ActionId.Twitch: {
        if (t < 0.15) {
          const impulseT = t / 0.15;
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * impulseT;
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * Math.sin(impulseT * Math.PI);
        } else {
          const settleT = (t - 0.15) / 0.85;
          const decay = Math.pow(1 - settleT, 3);
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * decay * Math.cos(settleT * Math.PI * 4);
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * decay * Math.sin(settleT * Math.PI * 6);
        }
        break;
      }
    }

    if (t >= 1) {
      this.actionAnimType = null;
      this.actionAnimOffsetX = 0;
      this.actionAnimOffsetY = 0;
    }
  }

  // === Public API: trajectory aim (called by InputController) ===

  beginAim(): void {
    this.isInCastAiming = true;
  }

  cancelAim(): void {
    this.isInCastAiming = false;
    this.isCastTouching = false;
    this.castTrajectoryDistance = 0;
    this.castTrajectoryOffsetX = 0;
  }

  startDrag(canvasX: number, canvasY: number): void {
    this.isCastTouching = true;
    this.castTouchStartY = canvasY;
    this.castTouchStartX = canvasX;
    this.castTrajectoryDistance = 0.5;
    this.castTrajectoryOffsetX = 0;
    const startLanding = this.computePhysicsLandingPoint(0.5, 0);
    this.previewLandingX = startLanding.x;
    this.previewLandingY = startLanding.y;
  }

  updateDrag(canvasX: number, canvasY: number): void {
    if (!this.isCastTouching) return;
    const deltaY = this.castTouchStartY - canvasY;
    const rawDistance = (deltaY * CAST_TRAJ_DRAG_SENSITIVITY) / (CANVAS_HEIGHT * 0.3);
    this.castTrajectoryDistance = Math.max(0, Math.min(1, 0.5 + rawDistance));

    const deltaX = canvasX - this.castTouchStartX;
    const rawOffsetX = (deltaX * CAST_TRAJ_X_SENSITIVITY) / (CANVAS_WIDTH * 0.5);
    this.castTrajectoryOffsetX = Math.max(-1, Math.min(1, rawOffsetX));

    const landing = this.computePhysicsLandingPoint(this.castTrajectoryDistance, this.castTrajectoryOffsetX);
    this.previewLandingX = landing.x;
    this.previewLandingY = landing.y;
  }

  /** Returns true if the drag-end represents a valid launch. The caller is
   *  responsible for the phase transition; this method only triggers the
   *  physics. `wasCastTouching` is returned via the caller-side `isCastTouching`
   *  state but the bool is reset here. */
  endDrag(): boolean {
    const wasCastTouching = this.isCastTouching;
    this.isCastTouching = false;
    // Distance is preserved by the caller until the next aim — here we just
    // mirror the original behavior of zeroing it on end.
    if (!wasCastTouching) return false;

    if (this.castTrajectoryDistance < 0) {
      this.castTrajectoryDistance = 0;
      this.castTrajectoryOffsetX = 0;
      return false;
    }
    // Launch the 3D ballistic flight using the captured distance/xOffset.
    this.launchBallistic(this.castTrajectoryDistance, this.castTrajectoryOffsetX);
    this.castTrajectoryDistance = 0;
    this.castTrajectoryOffsetX = 0;
    return true;
  }

  /** Reset trajectory inputs without launching — used when the touch was a
   *  Cast-button tap rather than a drag. */
  resetTrajectoryInputs(): void {
    this.castTrajectoryDistance = 0;
    this.castTrajectoryOffsetX = 0;
  }

  // === Public API: legacy non-trajectory launch (kept for completeness) ===

  launchFloat(): void {
    this.castFlightT = 0;

    if (USE_3D_PHYSICS_CAST) {
      this.initCast3D(this.castPower);
      const projected = this.project3Dto2D(this.floater3DPos);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;
      this.prevCastFloatScreenX = projected.x;
      this.prevCastFloatScreenY = projected.y;
    } else if (USE_POV_CAST_ANIMATION) {
      this.castFloatX = POV_CAST_START_X;
      this.castFloatY = POV_CAST_START_Y;
      this.castFloatScale = POV_CAST_START_SCALE;
    } else {
      this.castFloatX = CAST_START_X;
      this.castFloatY = CAST_START_Y;
      this.castFloatScale = 1.0;
    }
  }

  /** Trajectory-launched ballistic cast — invoked at end of drag with the
   *  captured distance (0..1) and xOffset (-1..1). Computes start/target,
   *  initializes Verlet rope, primes flight state. */
  launchBallistic(distance: number, xOffset: number): void {
    const startX = CAST_TRAJ_START_X;
    const startY = CAST_TRAJ_START_Y;
    const centerX = CANVAS_WIDTH / 2;
    const xRange = (CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X) / 2;
    const rawEndX = centerX + xOffset * xRange;
    const endX = Math.max(CAST_TRAJ_LANDING_MIN_X, Math.min(CAST_TRAJ_LANDING_MAX_X, rawEndX));
    const endY = CAST_TRAJ_LANDING_NEAR_Y + distance * (CAST_TRAJ_LANDING_FAR_Y - CAST_TRAJ_LANDING_NEAR_Y);

    const start3D = this.unproject2Dto3D(startX, startY, 1.0);
    const target3D = this.unproject2Dto3D(endX, endY, 1.0);

    const flightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + distance * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);

    const velocity = this.calculateBallisticVelocity(start3D, target3D, flightTime);
    velocity.y *= CAST_3D_Y_BOOST_MULTIPLIER;

    this.floater3DPos = start3D;
    this.floater3DVel = velocity;
    this.isBezierFlying = true;
    this.bezierFlightT = 0;
    this.bezierFlightDuration = flightTime;

    this.landingTargetX = endX;
    this.landingTargetY = endY;
    this.lastCastPower = distance * 100;

    // Initialize Verlet rope: distribute particles from rod tip to float start
    const rodTip3D = this.unproject2Dto3D(POV_LINE_START_X, POV_LINE_START_Y, 1.2);
    this.verletPositions = [];
    this.verletPrevPositions = [];
    for (let i = 0; i < VERLET_ROPE_NUM_PARTICLES; i++) {
      const t = i / (VERLET_ROPE_NUM_PARTICLES - 1);
      const pos = new Vec3D(
        rodTip3D.x + (start3D.x - rodTip3D.x) * t,
        rodTip3D.y + (start3D.y - rodTip3D.y) * t,
        rodTip3D.z + (start3D.z - rodTip3D.z) * t
      );
      this.verletPositions.push(pos);
      this.verletPrevPositions.push(pos.clone());
    }

    const projected = this.project3Dto2D(start3D);
    this.castFloatX = projected.x;
    this.castFloatY = projected.y;
    this.castFloatScale = projected.scale;
    this.prevCastFloatScreenX = projected.x;
    this.prevCastFloatScreenY = projected.y;

    this.castFlightT = 0;
  }

  // === Public API: phase transitions (caller-driven) ===

  beginFloatBounce(): void {
    this.floatBounceTimer = 0;
    this.showingSurpriseEmoji = false;
    this.surpriseEmojiTimer = 0;
  }

  /** Caller invokes this from the FloatBounce visual override in render. */
  computeBouncedFloatPos(): { x: number; y: number } {
    if (this.showingSurpriseEmoji) {
      return { x: this.landingTargetX, y: this.landingTargetY };
    }
    const t = this.floatBounceTimer / FLOAT_BOUNCE_DURATION;
    const amplitude = FLOAT_BOUNCE_AMPLITUDE * (1 - t);
    const bobY = amplitude * Math.sin(t * FLOAT_BOUNCE_COUNT * 2 * Math.PI);
    return { x: this.landingTargetX, y: this.landingTargetY + bobY };
  }

  /** Set per-action visual impact on the float. Called by DialogueController
   *  when the player selects an action. */
  applyActionImpact(actionId: ActionId): void {
    this.actionAnimType = actionId;
    this.actionAnimTimer = 0;
    this.actionAnimOffsetX = 0;
    this.actionAnimOffsetY = 0;

    switch (actionId) {
      case ActionId.Wait:
        this.actionAnimDuration = ACTION_ANIM_WAIT_DURATION;
        this.lineTension = 0.5;
        break;
      case ActionId.Twitch:
        this.actionAnimDuration = ACTION_ANIM_TWITCH_DURATION;
        this.lineTension = 0.7;
        break;
      case ActionId.Drift:
        this.actionAnimDuration = ACTION_ANIM_DRIFT_DURATION;
        this.lineTension = 0.2;
        break;
      case ActionId.Reel:
        this.actionAnimDuration = ACTION_ANIM_REEL_DURATION;
        this.lineTension = 1.0;
        break;
    }
  }

  /** Reset cosmetic float state on cast termination. */
  resetForNewCast(): void {
    this.castTrajectoryDistance = 0;
    this.castTrajectoryOffsetX = 0;
    this.isCastTouching = false;
    this.isInCastAiming = false;
    this.actionAnimType = null;
    this.actionAnimOffsetX = 0;
    this.actionAnimOffsetY = 0;
    this.floatDip = 0;
  }

  // === Private helpers (3D physics, projection, rope) ===

  private beginLanded(): void {
    // Snapshot the line for smooth morph from physics to resting curve.
    if (USE_3D_PHYSICS_CAST && this.lineSegments3D.length > 0) {
      this.landingLineSnapshot = [];
      for (let i = 0; i < this.lineSegments3D.length; i++) {
        const p = this.project3Dto2D(this.lineSegments3D[i]);
        this.landingLineSnapshot.push({ x: p.x, y: p.y });
      }
      if (this.landingLineSnapshot.length > 0) {
        const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
        this.landingLineSnapshot[0] = anchor;
        const fadeCount = Math.min(3, this.landingLineSnapshot.length - 1);
        for (let i = 1; i < fadeCount; i++) {
          const blendT = 1 - (i / fadeCount);
          const blendFactor = blendT * 0.6;
          this.landingLineSnapshot[i] = {
            x: this.landingLineSnapshot[i].x + (anchor.x - this.landingLineSnapshot[i].x) * blendFactor,
            y: this.landingLineSnapshot[i].y + (anchor.y - this.landingLineSnapshot[i].y) * blendFactor,
          };
        }
      }
    } else if (this.verletPositions.length >= 2) {
      this.landingLineSnapshot = [];
      for (let i = 0; i < this.verletPositions.length; i++) {
        const p = this.project3Dto2D(this.verletPositions[i]);
        this.landingLineSnapshot.push({ x: p.x, y: p.y });
      }
      if (this.landingLineSnapshot.length > 0) {
        const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
        this.landingLineSnapshot[0] = anchor;
        const fadeCount = Math.min(3, this.landingLineSnapshot.length - 1);
        for (let i = 1; i < fadeCount; i++) {
          const blendT = 1 - (i / fadeCount);
          const blendFactor = blendT * 0.6;
          this.landingLineSnapshot[i] = {
            x: this.landingLineSnapshot[i].x + (anchor.x - this.landingLineSnapshot[i].x) * blendFactor,
            y: this.landingLineSnapshot[i].y + (anchor.y - this.landingLineSnapshot[i].y) * blendFactor,
          };
        }
      }
    } else {
      this.landingLineSnapshot = [];
    }

    this.landingTargetX = this.castFloatX;
    this.landingTargetY = this.castFloatY;
    this.floatLandedTimer = 0;
    this.splashTimer = 0;
    this.splashRipples = [];
    for (let i = 0; i < SPLASH_RIPPLE_COUNT; i++) {
      this.splashRipples.push({ x: this.landingTargetX, y: this.landingTargetY, radius: 0, maxRadius: 45, alpha: 0 });
    }
  }

  private updateCastFlying3D(dt: number): CastSimEvent {
    this.castFlyingTimer += dt;

    const normalizedPower = this.lastCastPower / 100;
    const totalFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);
    const t = Math.min(this.castFlyingTimer / totalFlightTime, 1.0);

    this.updateRodAnimation(t);

    this.floater3DVel = this.floater3DVel.add(new Vec3D(0, CAST_3D_GRAVITY_Y * dt, 0));
    this.floater3DPos = this.floater3DPos.add(this.floater3DVel.scale(dt));

    const totalSegments = this.lineSegments3D.length;

    // Last segment follows floater
    this.lineSegments3D[totalSegments - 1] = this.floater3DPos.clone();

    // Apply slight gravity to middle segments for natural sag
    const segGravity = CAST_3D_GRAVITY_Y * 0.15 * dt;
    for (let i = 1; i < totalSegments - 1; i++) {
      this.lineSegments3D[i] = new Vec3D(
        this.lineSegments3D[i].x,
        this.lineSegments3D[i].y + segGravity,
        this.lineSegments3D[i].z
      );
    }

    // Backward pass: constrain to segment_length from next
    for (let i = totalSegments - 2; i >= 1; i--) {
      const target = this.lineSegments3D[i + 1];
      const current = this.lineSegments3D[i];
      const dir = target.subtract(current);
      const dist = dir.length();

      if (dist > 0.001) {
        const pull = dir.normalize().scale(CAST_3D_SEGMENT_LENGTH);
        this.lineSegments3D[i] = target.subtract(pull);
      } else {
        const toRod = this.rod3D.tipPos.subtract(target).normalize();
        this.lineSegments3D[i] = target.subtract(toRod.scale(CAST_3D_SEGMENT_LENGTH));
      }
    }

    // Forward pass: ensure segments don't bunch from rod side
    for (let i = 1; i < totalSegments - 1; i++) {
      const prev = this.lineSegments3D[i - 1];
      const current = this.lineSegments3D[i];
      const dir = current.subtract(prev);
      const dist = dir.length();

      if (dist > 0.001 && dist < CAST_3D_SEGMENT_LENGTH * 0.5) {
        const pushed = prev.add(dir.normalize().scale(CAST_3D_SEGMENT_LENGTH));
        this.lineSegments3D[i] = new Vec3D(
          current.x * 0.5 + pushed.x * 0.5,
          current.y * 0.5 + pushed.y * 0.5,
          current.z * 0.5 + pushed.z * 0.5
        );
      }
    }

    // First segment follows rod tip
    this.lineSegments3D[0] = this.rod3D.tipPos.clone();

    const projected = this.project3Dto2D(this.floater3DPos);
    this.castFloatX = projected.x;
    this.castFloatY = projected.y;
    this.castFloatScale = projected.scale;

    if (this.floater3DPos.y < CAST_3D_WATER_Y || this.castFlyingTimer > CAST_3D_MAX_FLIGHT_TIME) {
      this.beginLanded();
      return 'landed';
    }
    return null;
  }

  private updateCastFlightPOV(dt: number): CastSimEvent {
    this.castFlightT += dt / POV_CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) {
      this.castFlightT = 1;
      this.beginLanded();
      return 'landed';
    }
    const t = this.castFlightT;

    const startX = POV_CAST_START_X;
    const startY = POV_CAST_START_Y;
    const startScale = POV_CAST_START_SCALE;
    const peakX = POV_CAST_PEAK_X;
    const peakY = POV_CAST_PEAK_Y;
    const peakScale = POV_CAST_PEAK_SCALE;
    const peakT = POV_CAST_PEAK_T;
    const endX = this.landingTargetX;
    const endY = this.landingTargetY;
    const endScale = POV_CAST_END_SCALE;

    let currentX: number, currentY: number, currentScale: number;
    if (t < peakT) {
      const riseT = t / peakT;
      const eased = 1 - Math.pow(1 - riseT, 2);
      currentX = startX + (peakX - startX) * eased;
      currentY = startY + (peakY - startY) * eased;
      currentScale = startScale + (peakScale - startScale) * eased;
    } else {
      const fallT = (t - peakT) / (1 - peakT);
      const eased = fallT * fallT;
      currentX = peakX + (endX - peakX) * eased;
      currentY = peakY + (endY - peakY) * eased;
      currentScale = peakScale + (endScale - peakScale) * fallT;
    }

    this.castFloatX = currentX;
    this.castFloatY = currentY;
    this.castFloatScale = currentScale;
    return null;
  }

  private updateCastFlightSideView(dt: number): CastSimEvent {
    this.castFlightT += dt / CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) {
      this.castFlightT = 1;
      this.beginLanded();
      return 'landed';
    }
    const t = this.castFlightT;
    const arcHeight = CAST_MIN_ARC_HEIGHT + (this.castPower / 100) * (CAST_MAX_ARC_HEIGHT - CAST_MIN_ARC_HEIGHT);
    this.castFloatX = CAST_START_X + (this.landingTargetX - CAST_START_X) * t;
    this.castFloatY = CAST_START_Y + (this.landingTargetY - CAST_START_Y) * t - arcHeight * Math.sin(Math.PI * t);
    this.castFloatScale = 1.0;
    return null;
  }

  private initRod3D(): void {
    this.rod3D.basePos = new Vec3D(ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z);
    this.rod3D.angle = ROD_3D_INITIAL_ANGLE;
    this.rodState = RodState.WindUp;
    this.updateRodTip();
  }

  private updateRodTip(): void {
    this.rod3D.tipPos = new Vec3D(
      this.rod3D.basePos.x + Math.cos(this.rod3D.angle) * ROD_3D_LENGTH * 0.5,
      this.rod3D.basePos.y + Math.sin(this.rod3D.angle) * ROD_3D_LENGTH,
      this.rod3D.basePos.z + ROD_3D_LENGTH * ROD_3D_TIP_Z_FACTOR,
    );
  }

  private updateRodAnimation(t: number): void {
    if (t < ROD_PHASE_WINDUP_END) {
      this.rodState = RodState.WindUp;
      const windupT = t / ROD_PHASE_WINDUP_END;
      this.rod3D.angle = ROD_3D_INITIAL_ANGLE - windupT * ROD_WINDUP_PULLBACK;
    } else if (t < ROD_PHASE_ACCELERATE_END) {
      this.rodState = RodState.Accelerate;
      const accelT = (t - ROD_PHASE_WINDUP_END) / (ROD_PHASE_ACCELERATE_END - ROD_PHASE_WINDUP_END);
      const eased = accelT * accelT;
      this.rod3D.angle = (ROD_3D_INITIAL_ANGLE - ROD_WINDUP_PULLBACK) + eased * ROD_ACCELERATE_SWING;
    } else if (t < ROD_PHASE_RELEASE_END) {
      this.rodState = RodState.Release;
      this.rod3D.angle = ROD_RELEASE_ANGLE;
    } else {
      this.rodState = RodState.FollowThrough;
      const followT = (t - ROD_PHASE_RELEASE_END) / (1.0 - ROD_PHASE_RELEASE_END);
      const eased = 1 - Math.pow(1 - followT, 2);
      this.rod3D.angle = ROD_RELEASE_ANGLE - eased * ROD_FOLLOWTHROUGH_SETTLE;
    }
    this.updateRodTip();
  }

  private initCast3D(power: number): void {
    this.lastCastPower = power;
    this.initRod3D();

    const start3D = this.rod3D.tipPos.clone();

    const normalizedPower = power / 100;
    this.landingTargetY = CAST_LANDING_NEAR_Y + (CAST_LANDING_FAR_Y - CAST_LANDING_NEAR_Y) * normalizedPower;
    this.landingTargetX = FLOAT_X + CAST_LANDING_X_OFFSET + (normalizedPower - 0.5) * CAST_LANDING_X_VARIANCE * 0.5;

    const target3D = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    const plannedFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);

    const peakFraction = 0.6;
    const vy = Math.abs(CAST_3D_GRAVITY_Y) * peakFraction * plannedFlightTime;

    const aCoeff = 0.5 * Math.abs(CAST_3D_GRAVITY_Y);
    const bCoeff = -vy;
    const cCoeff = CAST_3D_WATER_Y - start3D.y;
    const discriminant = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    const actualFlightTime = discriminant > 0
      ? (-bCoeff + Math.sqrt(discriminant)) / (2 * aCoeff)
      : plannedFlightTime * 2.5;

    const vx = (target3D.x - start3D.x) / actualFlightTime;
    const vz = (target3D.z - start3D.z) / actualFlightTime;

    this.floater3DPos = start3D.clone();
    this.floater3DVel = new Vec3D(vx, vy, vz);

    this.lineSegments3D = [];
    const initDir = this.floater3DVel.normalize();
    for (let i = 0; i < CAST_3D_NUM_LINE_SEGMENTS; i++) {
      const fraction = i / (CAST_3D_NUM_LINE_SEGMENTS - 1);
      const offset = initDir.scale(fraction * CAST_3D_SEGMENT_LENGTH * 3);
      this.lineSegments3D.push(this.rod3D.tipPos.add(offset));
    }

    this.castFlyingTimer = 0;
  }

  /** Exposed for the renderer (line drawing during cast flight). */
  project3Dto2D(pos3D: Vec3D): { x: number; y: number; scale: number } {
    const depth = pos3D.z + CAST_3D_FOCAL_LENGTH;
    if (depth <= 0.1) {
      return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 0.1 };
    }
    const screenX = (pos3D.x / depth) * 200 + CANVAS_WIDTH / 2;
    const screenY = (-pos3D.y / depth) * 200 + CANVAS_HEIGHT / 2;
    const scale = (CAST_3D_FOCAL_LENGTH / depth) * CAST_3D_SCALE_MULTIPLIER;
    return { x: screenX, y: screenY, scale };
  }

  unproject2Dto3D(screenX: number, screenY: number, desiredScale: number): Vec3D {
    const depth = (CAST_3D_FOCAL_LENGTH * CAST_3D_SCALE_MULTIPLIER) / desiredScale;
    const z = depth - CAST_3D_FOCAL_LENGTH;
    const x = (screenX - CANVAS_WIDTH / 2) * depth / 200;
    const y = -(screenY - CANVAS_HEIGHT / 2) * depth / 200;
    return new Vec3D(x, y, z);
  }

  private calculateBallisticVelocity(start: Vec3D, target: Vec3D, flightTime: number): Vec3D {
    const gravity = new Vec3D(0, CAST_3D_GRAVITY_Y, 0);
    const displacement = target.subtract(start);
    const gravityTerm = gravity.scale(0.5 * flightTime * flightTime);
    return displacement.subtract(gravityTerm).scale(1 / flightTime);
  }

  private computePhysicsLandingPoint(distance: number, xOffset: number): { x: number; y: number } {
    const centerX = CANVAS_WIDTH / 2;
    const xRange = (CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X) / 2;
    const rawEndX = centerX + xOffset * xRange;
    const endX = Math.max(CAST_TRAJ_LANDING_MIN_X, Math.min(CAST_TRAJ_LANDING_MAX_X, rawEndX));
    const endY = CAST_TRAJ_LANDING_NEAR_Y + distance * (CAST_TRAJ_LANDING_FAR_Y - CAST_TRAJ_LANDING_NEAR_Y);
    return { x: endX, y: endY };
  }

  private settleLineSegments(dt: number): void {
    if (this.lineSegments3D.length < 2) return;
    const numSegments = this.lineSegments3D.length;

    const rodTipTarget = this.rod3D.tipPos.clone();
    const floaterTarget = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    const settleRate = 4.0;
    const t = 1 - Math.exp(-settleRate * dt);

    this.lineSegments3D[0] = rodTipTarget;
    this.lineSegments3D[numSegments - 1] = floaterTarget;

    for (let i = 1; i < numSegments - 1; i++) {
      const fraction = i / (numSegments - 1);
      const targetX = rodTipTarget.x + (floaterTarget.x - rodTipTarget.x) * fraction;
      const targetZ = rodTipTarget.z + (floaterTarget.z - rodTipTarget.z) * fraction;
      const sagAmount = -0.5 * fraction * (1 - fraction) * 4;
      const targetY = rodTipTarget.y + (floaterTarget.y - rodTipTarget.y) * fraction + sagAmount;

      const current = this.lineSegments3D[i];
      this.lineSegments3D[i] = new Vec3D(
        current.x + (targetX - current.x) * t,
        current.y + (targetY - current.y) * t,
        current.z + (targetZ - current.z) * t
      );
    }
  }
}
