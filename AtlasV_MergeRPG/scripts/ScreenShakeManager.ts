/**
 * ScreenShakeManager — Reusable screen shake system for Crystal Vanguard.
 *
 * Supports multiple concurrent shakes with exponential decay, random direction per frame,
 * and stacking intensities. Exposes shakeX/shakeY for use in the board's pushTranslate.
 *
 * Usage:
 *   - Call trigger(preset) or triggerCustom(intensity, decay) to start a shake.
 *   - Call update(dt) each frame with delta time in seconds.
 *   - Read shakeX / shakeY and add to the board translate offset.
 */

/** Preset shake intensities */
export enum ShakePreset {
  Light = 0,
  Medium = 1,
  Heavy = 2,
}

interface ActiveShake {
  intensity: number;
  /** Decay rate per second (how fast intensity falls). Higher = faster decay. */
  decayRate: number;
}

// Preset configs: [initialIntensity (pixels), decayRate (per second)]
// decayRate chosen so shake lasts ~0.3-0.5s visibly
const PRESET_CONFIGS: Record<ShakePreset, [number, number]> = {
  [ShakePreset.Light]: [8, 6.0],
  [ShakePreset.Medium]: [18, 5.0],
  [ShakePreset.Heavy]: [30, 4.0],
};

// Minimum intensity before a shake is removed
const MIN_INTENSITY = 0.5;

export class ScreenShakeManager {
  private shakes: ActiveShake[] = [];

  /** Current frame offset X (pixels) — read each frame for rendering */
  public shakeX: number = 0;
  /** Current frame offset Y (pixels) — read each frame for rendering */
  public shakeY: number = 0;

  /**
   * Trigger a shake using a preset intensity level.
   */
  trigger(preset: ShakePreset): void {
    const [intensity, decayRate] = PRESET_CONFIGS[preset];
    this.shakes.push({ intensity, decayRate });
  }

  /**
   * Trigger a custom shake with explicit parameters.
   * @param intensity — max pixel offset
   * @param decayRate — decay rate per second (e.g., 5.0 means intensity halves roughly every 0.14s)
   */
  triggerCustom(intensity: number, decayRate: number): void {
    if (intensity > 0) {
      this.shakes.push({ intensity, decayRate });
    }
  }

  /**
   * Update all active shakes — call once per frame.
   * @param dt — delta time in seconds (frame-rate independent decay)
   * Sets shakeX / shakeY for the current frame.
   */
  update(dt: number): void {
    let totalIntensity = 0;

    // Decay and accumulate (frame-rate independent using exponential decay)
    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const s = this.shakes[i];
      s.intensity *= Math.exp(-s.decayRate * dt);
      if (s.intensity < MIN_INTENSITY) {
        this.shakes.splice(i, 1);
      } else {
        totalIntensity += s.intensity;
      }
    }

    if (totalIntensity > 0) {
      // Random direction each frame
      const angle = Math.random() * Math.PI * 2;
      this.shakeX = Math.cos(angle) * totalIntensity;
      this.shakeY = Math.sin(angle) * totalIntensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /** Whether any shake is currently active */
  get isShaking(): boolean {
    return this.shakes.length > 0;
  }

  /** Clear all active shakes immediately */
  clear(): void {
    this.shakes.length = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }
}
