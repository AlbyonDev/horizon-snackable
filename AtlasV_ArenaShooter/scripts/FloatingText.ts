// Arena Vermin — Floating Text System (Milestone 2)
// Uses drawRect-based digit rendering since drawText/Font may not be available
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Color,
} from 'meta/worlds';
import type { FloatingTextEntry } from './Types';
import {
  MAX_FLOATING_TEXTS,
  FLOAT_TEXT_DUR_NORMAL, FLOAT_TEXT_DUR_CRIT,
  FLOAT_TEXT_RISE_SPEED,
  FLOAT_TEXT_SCALE_NORMAL, FLOAT_TEXT_SCALE_CRIT,
  FLOAT_TEXT_CRIT_LABEL_SCALE,
  FLOAT_TEXT_COLOR_NORMAL, FLOAT_TEXT_COLOR_CRIT,
} from './Constants';

// Digit segment patterns for 0-9 (7-segment style, simplified to rectangles)
// Each digit is drawn in a 5x7 grid of small rectangles
const DIGIT_PATTERNS: boolean[][] = [
  // 0
  [true,true,true, true,false,true, true,false,true, true,false,true, true,true,true],
  // 1
  [false,false,true, false,false,true, false,false,true, false,false,true, false,false,true],
  // 2
  [true,true,true, false,false,true, true,true,true, true,false,false, true,true,true],
  // 3
  [true,true,true, false,false,true, true,true,true, false,false,true, true,true,true],
  // 4
  [true,false,true, true,false,true, true,true,true, false,false,true, false,false,true],
  // 5
  [true,true,true, true,false,false, true,true,true, false,false,true, true,true,true],
  // 6
  [true,true,true, true,false,false, true,true,true, true,false,true, true,true,true],
  // 7
  [true,true,true, false,false,true, false,false,true, false,false,true, false,false,true],
  // 8
  [true,true,true, true,false,true, true,true,true, true,false,true, true,true,true],
  // 9
  [true,true,true, true,false,true, true,true,true, false,false,true, true,true,true],
];

/**
 * Draw a single digit at position using pixel-art style.
 */
function drawDigit(
  builder: DrawingCommandsBuilder,
  digit: number,
  x: number,
  y: number,
  pixelSize: number,
  brush: SolidBrush
): void {
  const pattern = DIGIT_PATTERNS[digit];
  if (!pattern) return;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (pattern[row * 3 + col]) {
        builder.drawRect(brush, null, {
          x: x + col * pixelSize,
          y: y + row * pixelSize,
          width: pixelSize,
          height: pixelSize,
        });
      }
    }
  }
}

/**
 * Draw a number string at position using pixel-art digits.
 */
function drawNumber(
  builder: DrawingCommandsBuilder,
  text: string,
  centerX: number,
  centerY: number,
  scale: number,
  brush: SolidBrush,
  outlineBrush: SolidBrush
): void {
  const pixelSize = 2 * scale;
  const digitW = 3 * pixelSize + pixelSize; // 3 cols + spacing
  const totalW = text.length * digitW - pixelSize;
  const startX = centerX - totalW / 2;
  const startY = centerY - (5 * pixelSize) / 2;

  // Outline (draw offset in 4 directions)
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [ox, oy] of offsets) {
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i) - 48; // '0' = 48
      if (ch >= 0 && ch <= 9) {
        drawDigit(builder, ch, startX + i * digitW + ox, startY + oy, pixelSize, outlineBrush);
      }
    }
  }

  // Main text
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i) - 48;
    if (ch >= 0 && ch <= 9) {
      drawDigit(builder, ch, startX + i * digitW, startY, pixelSize, brush);
    }
  }
}

/**
 * Spawn a floating damage number at screen position.
 */
export function spawnDamageNumber(
  texts: FloatingTextEntry[],
  x: number,
  y: number,
  amount: number,
  isCrit: boolean,
  colorOverride?: string
): void {
  while (texts.length >= MAX_FLOATING_TEXTS) {
    texts.shift();
  }

  const duration = isCrit ? FLOAT_TEXT_DUR_CRIT : FLOAT_TEXT_DUR_NORMAL;
  const scale = isCrit ? FLOAT_TEXT_SCALE_CRIT : FLOAT_TEXT_SCALE_NORMAL;
  const colorHex = colorOverride ?? (isCrit ? FLOAT_TEXT_COLOR_CRIT : FLOAT_TEXT_COLOR_NORMAL);

  texts.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -FLOAT_TEXT_RISE_SPEED,
    age: 0,
    maxAge: duration,
    text: String(amount),
    colorHex,
    scale,
    fadeStart: duration * 0.6,
  });
}

/**
 * Spawn a "CRIT!" label near a damage number position.
 * Renders as a bright burst indicator since we use pixel digits.
 */
export function spawnCritLabel(
  texts: FloatingTextEntry[],
  x: number,
  y: number
): void {
  while (texts.length >= MAX_FLOATING_TEXTS) {
    texts.shift();
  }

  // Use "!" as a crit indicator (rendered as special bright marker)
  texts.push({
    x: x + 20,
    y: y - 10,
    vx: (Math.random() - 0.5) * 10,
    vy: -FLOAT_TEXT_RISE_SPEED * 0.8,
    age: 0,
    maxAge: FLOAT_TEXT_DUR_CRIT,
    text: '!',
    colorHex: FLOAT_TEXT_COLOR_CRIT,
    scale: FLOAT_TEXT_CRIT_LABEL_SCALE,
    fadeStart: FLOAT_TEXT_DUR_CRIT * 0.5,
  });
}

/**
 * Update all floating texts. Frame-rate independent.
 */
export function updateFloatingTexts(texts: FloatingTextEntry[], dt: number): void {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    t.age += dt;
    if (t.age >= t.maxAge) {
      texts.splice(i, 1);
    }
  }
}

/**
 * Draw all floating texts with outline.
 */
export function drawFloatingTexts(
  builder: DrawingCommandsBuilder,
  texts: FloatingTextEntry[]
): void {
  for (const t of texts) {
    let alpha = 1;
    if (t.age > t.fadeStart) {
      alpha = 1 - (t.age - t.fadeStart) / (t.maxAge - t.fadeStart);
    }
    if (alpha <= 0) continue;

    const color = Color.fromHex(t.colorHex);
    const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha));
    const outBrush = new SolidBrush(new Color(0, 0, 0, alpha * 0.9));

    if (t.text === '!') {
      // Draw crit exclamation as a bright diamond
      const size = 4 * t.scale;
      const path = `M ${t.x} ${t.y - size} L ${t.x + size * 0.6} ${t.y} L ${t.x} ${t.y + size} L ${t.x - size * 0.6} ${t.y} Z`;
      builder.drawRect(brush, null, {
        x: t.x - size * 0.6,
        y: t.y - size,
        width: size * 1.2,
        height: size * 2,
      });
    } else {
      // Draw damage number using pixel digits
      drawNumber(builder, t.text, t.x, t.y, t.scale, brush, outBrush);
    }
  }
}
