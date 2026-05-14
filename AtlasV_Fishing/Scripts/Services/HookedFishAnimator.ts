/**
 * HookedFishAnimator — Per-fish pendulum physics animation for hooked fish.
 *
 * Each fish swings like it's dangling from the hook on a rope. Fish react to
 * hook acceleration (not velocity), and each fish has a unique rope length
 * giving it a different natural frequency so they desync naturally.
 *
 * Component Attachment: Service (singleton, auto-instantiated)
 * Component Networking: Local (client-only visual effects)
 * Component Ownership: Not Networked
 */
import {
  Component,
  NetworkingService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  component,
  subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

import { Events, GamePhase } from '../Types';

// --- Pendulum Tuning Constants ---

const PENDULUM_GRAVITY = 2.5;     // Low gravity for floaty underwater feel
const PENDULUM_DAMPING = 0.4;     // Low damping — fish swing for a while before settling
const ROPE_LENGTH_MIN = 18;       // Min rope length in pixels (higher freq)
const ROPE_LENGTH_MAX = 38;       // Max rope length in pixels (lower freq)
const ANGLE_MAX = Math.PI * 0.4;  // Clamp to ~72° to avoid flipping

// Squash/stretch from tangential velocity
const STRETCH_FACTOR = 0.008;     // Per unit of tangential velocity
const STRETCH_MAX = 0.25;         // Maximum stretch deviation from 1.0

// Swipe kick — instant angular velocity injected on swipe input.
// Swipe delta is in screen-space [0..1], typical per-frame values ~0.005–0.05.
const SWIPE_KICK_GAIN = 5.0;     // rad/s per unit of screen-space delta
const SWIPE_KICK_MAX  = 9.0;      // clamp to avoid wild flips on huge deltas

// --- Exported Animation State ---
export interface HookedFishAnimState {
  offsetX: number;   // Pixel offset X (pendulum swing)
  offsetY: number;   // Pixel offset Y (downward displacement when swinging wide)
  rotation: number;  // Degrees — fish body tilts with the swing
  scaleX: number;    // Squash/stretch X
  scaleY: number;    // Squash/stretch Y
}

// Default state (no animation)
const DEFAULT_STATE: HookedFishAnimState = {
  offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1,
};

// --- Per-Fish Internal State ---
interface FishPendulumState {
  angle: number;        // Current swing angle (radians, 0 = hanging straight down)
  angularVel: number;   // Angular velocity (rad/s)
  ropeLength: number;   // Unique per fish — determines natural frequency
}

function createFreshState(): FishPendulumState {
  // Randomize rope length to give each fish a unique natural frequency
  const ropeLength = ROPE_LENGTH_MIN + Math.random() * (ROPE_LENGTH_MAX - ROPE_LENGTH_MIN);
  return {
    angle: 0,
    angularVel: 0,
    ropeLength,
  };
}

// --- Service Component ---
@component()
export class HookedFishAnimator extends Component {

  private static _instance: HookedFishAnimator | null = null;
  static get(): HookedFishAnimator | null { return HookedFishAnimator._instance; }

  // Hook velocity tracking (to derive acceleration)
  private _prevHookX = 0;
  private _hookVX = 0;
  private _prevHookVX = 0;
  private _hookAccelX = 0;  // Horizontal acceleration of the hook pivot
  private _firstFrame = true;
  private _secondFrame = false;

  // Per-fish animation state (keyed by fishId)
  private _states: Map<number, FishPendulumState> = new Map();

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    HookedFishAnimator._instance = this;
    console.log('[HookedFishAnimator] Service ready (pendulum model)');
  }

  @subscribe(Events.FishHooked)
  onFishHooked(p: Events.FishHookedPayload): void {
    this.trackFish(p.fishId);
  }

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    if (p.phase === GamePhase.Idle || p.phase === GamePhase.Reset || p.phase === GamePhase.Launching) {
      this.resetAll();
    }
  }

  @subscribe(Events.HookMoved)
  onHookMoved(p: Events.HookMovedPayload): void {
    if (this._firstFrame) {
      this._prevHookX = p.x;
      this._hookVX = 0;
      this._prevHookVX = 0;
      this._hookAccelX = 0;
      this._firstFrame = false;
      this._secondFrame = true;
      return;
    }

    // Compute current velocity
    this._hookVX = p.x - this._prevHookX;

    if (this._secondFrame) {
      // On second frame, we have velocity but no previous velocity yet
      this._prevHookVX = this._hookVX;
      this._hookAccelX = 0;
      this._secondFrame = false;
    } else {
      // Acceleration = change in velocity (no dt division needed here,
      // we'll factor dt in the physics step)
      this._hookAccelX = this._hookVX - this._prevHookVX;
    }

    this._prevHookVX = this._hookVX;
    this._prevHookX = p.x;
  }

  @subscribe(Events.SwipeKick)
  onSwipeKick(p: Events.SwipeKickPayload): void {
    // Inject angular velocity directly so fish whip *with* the swipe direction
    // before the pendulum's drag-smoothed physics catches up.
    // A right-going swipe (delta > 0) should swing the fish to the right of vertical,
    // which is positive angle in our convention → positive angular velocity.
    let kick = p.delta * SWIPE_KICK_GAIN;
    if (kick > SWIPE_KICK_MAX) kick = SWIPE_KICK_MAX;
    else if (kick < -SWIPE_KICK_MAX) kick = -SWIPE_KICK_MAX;
    for (const state of this._states.values()) {
      state.angularVel += kick;
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const dt = payload.deltaTime;
    if (dt <= 0) return;

    // Compute hook acceleration in pixels/s² (hookAccelX is delta-of-delta per frame,
    // i.e. acceleration * dt². Divide by dt*dt to recover true acceleration.)
    const accelX = dt > 0.0001 ? this._hookAccelX / (dt * dt) : 0;

    for (const [_fishId, state] of this._states) {
      this._updatePendulum(state, accelX, dt);
    }
  }

  /**
   * Get animation state for a specific fish. Returns default (no anim) if fish
   * is not being tracked.
   */
  getAnimState(fishId: number): HookedFishAnimState {
    const state = this._states.get(fishId);
    if (!state) return DEFAULT_STATE;

    const { angle, angularVel, ropeLength } = state;

    // Positional offsets from pendulum angle
    const offsetX = Math.sin(angle) * ropeLength;
    const offsetY = (1 - Math.cos(angle)) * ropeLength;

    // Rotation follows the swing angle (convert to degrees)
    const rotation = angle * (180 / Math.PI);

    // Squash/stretch from tangential velocity (angularVel * ropeLength = tangential speed)
    const tangentialSpeed = Math.abs(angularVel * ropeLength);
    const stretch = Math.min(STRETCH_MAX, tangentialSpeed * STRETCH_FACTOR);
    const scaleX = 1.0 - stretch * 0.5;  // Slightly compressed perpendicular
    const scaleY = 1.0 + stretch;         // Stretched along body

    return { offsetX, offsetY, rotation, scaleX, scaleY };
  }

  /**
   * Begin tracking a fish (call when fish becomes hooked).
   */
  trackFish(fishId: number): void {
    if (!this._states.has(fishId)) {
      this._states.set(fishId, createFreshState());
    }
  }

  /**
   * Stop tracking a fish (call when fish is unhooked/collected).
   */
  untrackFish(fishId: number): void {
    this._states.delete(fishId);
  }

  /**
   * Reset all tracked fish (e.g., on phase reset).
   */
  resetAll(): void {
    this._states.clear();
    this._firstFrame = true;
    this._secondFrame = false;
    this._hookVX = 0;
    this._prevHookVX = 0;
    this._hookAccelX = 0;
  }

  // --- Pendulum physics per-fish ---
  private _updatePendulum(state: FishPendulumState, hookAccelX: number, dt: number): void {
    const { angle, ropeLength } = state;

    // Driven pendulum equation:
    // angularAccel = -(g/L) * sin(angle) + (aX/L) * cos(angle) - damping * angularVel
    //
    // First term: gravity restoring force (pulls toward center)
    // Second term: hook acceleration drives the pendulum (pivot acceleration)
    // Third term: damping
    const gravityTerm = -(PENDULUM_GRAVITY / ropeLength) * Math.sin(angle);
    const driveTerm = (hookAccelX / ropeLength) * Math.cos(angle);
    const dampingTerm = -PENDULUM_DAMPING * state.angularVel;

    const angularAccel = gravityTerm + driveTerm + dampingTerm;

    // Semi-implicit Euler integration
    state.angularVel += angularAccel * dt;
    state.angle += state.angularVel * dt;

    // Clamp angle to prevent flipping over the top
    if (state.angle > ANGLE_MAX) {
      state.angle = ANGLE_MAX;
      if (state.angularVel > 0) state.angularVel *= -0.3; // Bounce back with energy loss
    } else if (state.angle < -ANGLE_MAX) {
      state.angle = -ANGLE_MAX;
      if (state.angularVel < 0) state.angularVel *= -0.3;
    }
  }
}
