/**
 * Tweener
 *
 * Shared math utilities for animations: linear interpolation,
 * easing curves, and frame-rate independent exponential decay.
 *
 * All functions are pure and stateless — safe to use anywhere.
 */

/** Linear interpolation between a and b by parameter t in [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value v to the range [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Cubic ease-in-out: slow start, slow end, fast middle. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Quadratic ease-out: fast start, slow end. */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Quadratic ease-in: slow start, fast end. */
export function easeInQuad(t: number): number {
  return t * t;
}

/** Sinusoidal in/out: smooth bell-shaped curve through 0..1..0. */
export function bellSine(t: number): number {
  return Math.sin(t * Math.PI);
}

/**
 * Frame-rate independent exponential decay smoothing factor.
 * Use as: current += (target - current) * expDecayFactor(speed, dt).
 *
 * speed = larger means faster convergence.
 * Equivalent to 1 - exp(-speed * dt).
 */
export function expDecayFactor(speed: number, dt: number): number {
  return 1 - Math.exp(-speed * dt);
}

/**
 * Exponentially decay `current` toward `target` by speed `speed` over time `dt`.
 * Returns the new value.
 */
export function expDecay(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * expDecayFactor(speed, dt);
}
