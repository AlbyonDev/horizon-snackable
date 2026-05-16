/**
 * FloatingTextRenderer.ts
 *
 * Renders floating "+N" text particles that rise from enemy portraits
 * and fade out. Used for enemy combo bonus mana gains.
 *
 * Each floating text:
 * - Spawns at the top of an enemy portrait
 * - Floats upward 60px over 600ms
 * - Fades from opacity 1.0 to 0.0
 * - Color matches the mana gem color
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  DrawTextAlignment,
} from 'meta/custom_ui';
import { Color } from 'meta/platform_api';

import { GemType } from './Types';

// ===== Animation Constants =====
const FLOAT_DURATION = 0.6; // seconds
const FLOAT_DISTANCE = 60; // pixels upward
const FONT_SIZE = 16;

// ===== Gem Colors =====
const GEM_COLORS: Record<number, string> = {
  [GemType.Red]: '#FF6060',
  [GemType.Blue]: '#60A0FF',
  [GemType.Green]: '#60E080',
  [GemType.Yellow]: '#FFE060',
  [GemType.Purple]: '#C060FF',
};

// ===== Pre-created resources =====
const floatFont = new Font(
  FontFamily.Bangers,
  FontWeight.Bold,
  FontStyle.Normal,
  FontStretch.Normal,
);
const outlineBrush = new SolidBrush(new Color(0, 0, 0, 1));

/** A single floating text particle */
export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  timer: number; // counts down from FLOAT_DURATION to 0
}

export class FloatingTextRenderer {
  private builder: DrawingCommandsBuilder;
  private texts: FloatingText[] = [];

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
  }

  /** Spawn a new floating text at the given position */
  spawn(x: number, y: number, text: string, gemType: GemType): void {
    this.texts.push({
      x,
      y,
      text,
      color: GEM_COLORS[gemType] ?? '#FFFFFF',
      timer: FLOAT_DURATION,
    });
  }

  /** Update all floating texts (call each frame) */
  update(dt: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].timer -= dt;
      if (this.texts[i].timer <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  /** Render all active floating texts */
  render(): void {
    for (const ft of this.texts) {
      const progress = 1 - (ft.timer / FLOAT_DURATION); // 0 -> 1
      const alpha = 1 - progress; // Fade out
      const offsetY = -progress * FLOAT_DISTANCE; // Float upward

      if (alpha <= 0) continue;

      const drawX = ft.x;
      const drawY = ft.y + offsetY;

      // Black outline
      const offsets = [
        {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
        {dx: -1, dy: 0},                    {dx: 1, dy: 0},
        {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1},
      ];
      const outlineFade = new SolidBrush(new Color(0, 0, 0, alpha));
      for (const off of offsets) {
        this.builder.drawText(
          ft.text,
          { x: drawX + off.dx, y: drawY + off.dy, width: 60, height: 24 },
          FONT_SIZE,
          outlineFade,
          floatFont,
          { textAlignment: DrawTextAlignment.Center },
        );
      }

      // Colored text
      const hexColor = Color.fromHex(ft.color);
      const colorBrush = new SolidBrush(new Color(hexColor.r, hexColor.g, hexColor.b, alpha));
      this.builder.drawText(
        ft.text,
        { x: drawX, y: drawY, width: 60, height: 24 },
        FONT_SIZE,
        colorBrush,
        floatFont,
        { textAlignment: DrawTextAlignment.Center },
      );
    }
  }

  /** Check if any floating texts are active */
  get isActive(): boolean {
    return this.texts.length > 0;
  }

  /** Clear all floating texts */
  clear(): void {
    this.texts = [];
  }
}
