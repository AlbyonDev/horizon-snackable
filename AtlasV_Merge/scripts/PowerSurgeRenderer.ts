/**
 * PowerSurgeRenderer
 *
 * Renders a "POWER SURGE" text effect on the DrawingSurface when cascades occur.
 * Uses Bangers font with black outline and an animated scale/glow/shake effect.
 *
 * NOTE: DrawTextAlignment.Center does not reliably center text in this engine.
 * Instead we manually estimate text width and position the draw rect so the text
 * appears visually centered.
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
} from 'meta/custom_ui';
import { Color, Vec2 } from 'meta/platform_api';

import { CANVAS_WIDTH } from './Constants';

// ===== Config =====
const DISPLAY_Y = 360;    // In the combat zone, above the board
const FONT_SIZE = 54;
const ANIM_DURATION = 1.8;
const SHAKE_DURATION = 0.25;
const SHAKE_INTENSITY = 9;
const FADE_OUT_START = 0.4;   // Seconds remaining when fade-out begins

// Pop-in keyframes: slam in large, overshoot, settle
// Phase A (0 → PUNCH_END):  2.4× → 0.88×  (cubic ease-out)
// Phase B (PUNCH_END → SETTLE_END): 0.88× → 1.0×  (smooth-step)
const PUNCH_END = 0.18;
const SETTLE_END = 0.32;
const PUNCH_START_SCALE = 2.4;
const PUNCH_TARGET_SCALE = 0.88;

// White flash (entry) → gold transition duration
const COLOR_FLASH_DURATION = 0.15;

// Bangers char width estimate (ratio of fontSize)
const CHAR_WIDTH_FACTOR = 0.55;

// ===== Pre-created resources =====
const surgeFont = new Font(
  FontFamily.Bangers,
  FontWeight.Bold,
  FontStyle.Normal,
  FontStretch.Normal,
);

export class PowerSurgeRenderer {
  private builder: DrawingCommandsBuilder;
  private timer: number = 0;
  private cascadeCount: number = 0;
  private isActive: boolean = false;

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
  }

  /** Trigger power surge display */
  trigger(cascadeCount: number): void {
    this.cascadeCount = cascadeCount;
    this.timer = ANIM_DURATION;
    this.isActive = true;
  }

  /** Clear the display */
  clear(): void {
    this.isActive = false;
    this.timer = 0;
    this.cascadeCount = 0;
  }

  /** Update animation timer */
  update(dt: number): void {
    if (!this.isActive) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.isActive = false;
    }
  }

  /** Render the power surge text */
  render(): void {
    if (!this.isActive || this.timer <= 0) return;

    const elapsed = ANIM_DURATION - this.timer;
    const text = `Multi-Attack x${this.cascadeCount}`;

    // --- Elastic punch-in scale ---
    let scale: number;
    if (elapsed < PUNCH_END) {
      // Cubic ease-out slam: 2.4× → 0.88×
      const t = elapsed / PUNCH_END;
      const eased = 1 - Math.pow(1 - t, 3);
      scale = PUNCH_START_SCALE + (PUNCH_TARGET_SCALE - PUNCH_START_SCALE) * eased;
    } else if (elapsed < SETTLE_END) {
      // Smooth-step bounce back: 0.88× → 1.0×
      const t = (elapsed - PUNCH_END) / (SETTLE_END - PUNCH_END);
      const smooth = t * t * (3 - 2 * t);
      scale = PUNCH_TARGET_SCALE + (1.0 - PUNCH_TARGET_SCALE) * smooth;
    } else {
      scale = 1.0;
    }

    // --- Shake: strong at entry, decays quickly ---
    let shakeX = 0;
    let shakeY = 0;
    if (elapsed < SHAKE_DURATION) {
      const intensity = SHAKE_INTENSITY * (1 - elapsed / SHAKE_DURATION);
      shakeX = (Math.random() - 0.5) * 2 * intensity;
      shakeY = (Math.random() - 0.5) * 2 * intensity;
    }

    // --- Alpha: full until fade-out window ---
    const alpha = this.timer < FADE_OUT_START ? this.timer / FADE_OUT_START : 1.0;

    // --- Color: white flash → gold over COLOR_FLASH_DURATION ---
    const flashT = Math.min(1, elapsed / COLOR_FLASH_DURATION);
    // white (1,1,1) → gold (1, 0.843, 0)
    const fillR = 1.0;
    const fillG = flashT * 0.843;
    const fillB = 0.0;

    const scaledFontSize = FONT_SIZE * scale;
    const approxTextWidth = text.length * scaledFontSize * CHAR_WIDTH_FACTOR;
    const textX = (CANVAS_WIDTH - approxTextWidth) / 2;
    const textHeight = scaledFontSize * 1.5;
    const textY = DISPLAY_Y - textHeight / 2;

    this.builder.pushTranslate(new Vec2(shakeX, shakeY));

    const textRect = {
      x: textX,
      y: textY,
      width: approxTextWidth + 40,
      height: textHeight,
    };

    const outlineAlphaBrush = new SolidBrush(new Color(0, 0, 0, alpha));
    const fillAlphaBrush = new SolidBrush(new Color(fillR, fillG, fillB, alpha));

    // Black outline (8-direction, slightly thicker offset for bigger font)
    const offsets = [
      { dx: -3, dy: -3 }, { dx: 0, dy: -3 }, { dx: 3, dy: -3 },
      { dx: -3, dy: 0 },                      { dx: 3, dy: 0 },
      { dx: -3, dy: 3 },  { dx: 0, dy: 3 },  { dx: 3, dy: 3 },
    ];

    for (const off of offsets) {
      this.builder.drawText(
        text,
        { x: textRect.x + off.dx, y: textRect.y + off.dy, width: textRect.width, height: textRect.height },
        scaledFontSize,
        outlineAlphaBrush,
        surgeFont,
      );
    }

    // Colored fill (white flash → gold)
    this.builder.drawText(text, textRect, scaledFontSize, fillAlphaBrush, surgeFont);

    this.builder.pop();
  }
}
