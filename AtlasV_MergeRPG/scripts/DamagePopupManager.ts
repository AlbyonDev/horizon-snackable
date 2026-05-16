/**
 * DamagePopupManager.ts
 *
 * Manages a pool of TextItemViewModel instances rendered as floating damage
 * numbers. Lifecycle for each popup:
 *
 *   t = 0.00s : spawn, scale 1.5, opacity 1, at (centerX, centerY)
 *   t = 0.15s : scaled down to 1.0 (overshoot ease-out), starts floating up
 *   t = 0.70s : fully floated up (~50px), opacity starts fading
 *   t = 1.00s : opacity 0, slot freed
 *
 * Color is set per spawn — white for normal damage, gold for crits, red for
 * damage taken by allies, etc.
 */
import { TextItemViewModel } from './SpriteViewModel';

const POOL_SIZE = 16;
const POPUP_DURATION = 1.0;       // total seconds visible
const POP_IN_DURATION = 0.15;     // scale 1.5 → 1.0 over this period
const FADE_START = 0.70;          // start fading at this fraction of total
const FLOAT_DISTANCE = 50;        // total upward drift (px)

const POPUP_W = 100;
const POPUP_H = 50;

export class DamagePopupManager {
  private pool: TextItemViewModel[] = [];
  private timers: number[] = [];   // remaining lifetime per slot, 0 = inactive
  private startY: number[] = [];   // y at spawn time (popup floats from here)

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(new TextItemViewModel());
      this.timers.push(0);
      this.startY.push(0);
    }
  }

  /** Bindable list to assign once to TeamRendererViewModel.texts. */
  getPool(): readonly TextItemViewModel[] {
    return this.pool;
  }

  /** True while any popup is mid-flight. Used by the power cinematic to wait
   *  for damage numbers to finish before unlocking input. */
  hasActive(): boolean {
    for (let i = 0; i < this.timers.length; i++) {
      if (this.timers[i] > 0) return true;
    }
    return false;
  }

  /**
   * Spawn a popup centered at (centerX, centerY).
   * If the pool is full, the request is silently dropped (rare: only during
   * massive simultaneous cascades).
   */
  spawn(
    centerX: number,
    centerY: number,
    text: string,
    options: {
      fontColor?: string;
      fontSize?: number;
      strokeColor?: string;
      strokeThickness?: number;
    } = {},
  ): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.timers[i] <= 0) {
        const p = this.pool[i];
        // Center the popup grid on (centerX, centerY)
        p.x = centerX - POPUP_W / 2;
        p.y = centerY - POPUP_H / 2;
        p.text = text;
        p.fontColor = options.fontColor ?? '#FFFFFF';
        p.fontSize = options.fontSize ?? 36;
        p.strokeColor = options.strokeColor ?? '#000000';
        p.strokeThickness = options.strokeThickness ?? 3;
        p.opacity = 1;
        p.scale = 1.5;
        p.rotation = 0;
        // Float popups stack just above sprites; bigger crits sit on top
        p.zIndex = 1000 + Math.round(p.fontSize);
        this.timers[i] = POPUP_DURATION;
        this.startY[i] = p.y;
        return;
      }
    }
  }

  /** Update all active popups. Call once per frame. */
  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.timers[i] <= 0) continue;

      this.timers[i] -= dt;
      const p = this.pool[i];

      if (this.timers[i] <= 0) {
        this.timers[i] = 0;
        p.opacity = 0;
        p.text = '';
        continue;
      }

      const elapsed = POPUP_DURATION - this.timers[i];
      const progress = elapsed / POPUP_DURATION;

      // Scale: 1.5 → 1.0 over POP_IN_DURATION (ease-out via 1 - (1-t)^2)
      if (elapsed < POP_IN_DURATION) {
        const k = elapsed / POP_IN_DURATION;
        const eased = 1 - (1 - k) * (1 - k);
        p.scale = 1.5 - eased * 0.5;
      } else {
        p.scale = 1.0;
      }

      // Float upward — accelerating slightly so it feels like the number
      // *escapes* rather than drifting flat.
      p.y = this.startY[i] - progress * FLOAT_DISTANCE;

      // Fade only in the last (1 - FADE_START) of lifetime
      if (progress > FADE_START) {
        p.opacity = 1 - (progress - FADE_START) / (1 - FADE_START);
      } else {
        p.opacity = 1;
      }
    }
  }
}
