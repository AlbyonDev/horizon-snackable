/**
 * HpBarRenderer.ts
 *
 * Renders 6 chunky HP bars in a horizontal strip between the team character
 * sprites and the match-3 board. Left 3 bars = player heroes, Right 3 bars = enemies.
 *
 * Design:
 * - Sharp rectangular (no rounded corners)
 * - Gradient fill for HP portion
 * - Monocolor dark background for empty portion
 * - White HP text with black outline centered (e.g., "45/100")
 * - Thick border around each bar
 * - Hero bars use green gradient, enemy bars use red gradient
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
  LinearGradientBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  DrawTextAlignment,
} from 'meta/custom_ui';
import { Color, Vec2 } from 'meta/platform_api';
import type { Brush } from 'meta/custom_ui';

import { CANVAS_WIDTH, BOARD_OFFSET_Y } from './Constants';
import { TeamState } from './TeamState';

// ===== Layout Constants =====
// Position the HP strip just above the board
const HP_STRIP_Y = BOARD_OFFSET_Y - 34; // 34px above board top
const BAR_HEIGHT = 22;
const BAR_WIDTH = 68;
const BAR_GAP = 4; // Gap between bars within a team
const TEAM_GAP = 12; // Gap between hero and enemy groups
const BORDER_WIDTH = 2;

// Total width: 3 bars + 2 gaps per team × 2 teams + team gap
const TEAM_WIDTH = BAR_WIDTH * 3 + BAR_GAP * 2;
const TOTAL_WIDTH = TEAM_WIDTH * 2 + TEAM_GAP;
const START_X = (CANVAS_WIDTH - TOTAL_WIDTH) / 2;

// ===== Colors =====
// Hero HP gradient (green tones)
const HERO_FILL_TOP = Color.fromHex('#44FF88');
const HERO_FILL_BOTTOM = Color.fromHex('#228844');
// Enemy HP gradient (red tones)
const ENEMY_FILL_TOP = Color.fromHex('#FF5555');
const ENEMY_FILL_BOTTOM = Color.fromHex('#882222');
// Empty bar background
const EMPTY_BG_COLOR = new Color(0.12, 0.1, 0.15, 1);
// Border
const BORDER_COLOR = new Color(0.7, 0.65, 0.8, 1);
// Low HP warning gradient (yellow-orange)
const LOW_HP_TOP = Color.fromHex('#FFCC33');
const LOW_HP_BOTTOM = Color.fromHex('#CC6600');

// ===== Pre-created resources =====
const emptyBgBrush = new SolidBrush(EMPTY_BG_COLOR);
const borderBrush = new SolidBrush(BORDER_COLOR);
const borderPen = new Pen(borderBrush, BORDER_WIDTH);
const textOutlineBrush = new SolidBrush(new Color(0, 0, 0, 1));
const textFillBrush = new SolidBrush(Color.fromHex('#FFFFFF'));
const hpFont = new Font(
  FontFamily.Roboto,
  FontWeight.Bold,
  FontStyle.Normal,
  FontStretch.Normal,
);

// Dead bar overlay
const deadOverlayBrush = new SolidBrush(new Color(0.2, 0.2, 0.2, 0.7));

export class HpBarRenderer {
  private builder: DrawingCommandsBuilder;

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
  }

  /** Render all 6 HP bars */
  render(teamState: TeamState): void {
    // Draw hero bars (left group)
    for (let i = 0; i < 3; i++) {
      const x = START_X + i * (BAR_WIDTH + BAR_GAP);
      const hero = teamState.heroes[i];
      const displayHp = teamState.heroDisplayHp[i];
      const isDead = hero.currentHp <= 0;
      this.drawBar(x, HP_STRIP_Y, displayHp, hero.maxHp, true, isDead);
    }

    // Draw enemy bars (right group)
    for (let i = 0; i < 3; i++) {
      const x = START_X + TEAM_WIDTH + TEAM_GAP + i * (BAR_WIDTH + BAR_GAP);
      const enemy = teamState.enemies[i];
      const displayHp = teamState.enemyDisplayHp[i];
      const isDead = enemy.currentHp <= 0;
      this.drawBar(x, HP_STRIP_Y, displayHp, enemy.maxHp, false, isDead);
    }
  }

  /** Draw a single chunky HP bar */
  private drawBar(
    x: number,
    y: number,
    currentHp: number,
    maxHp: number,
    isHero: boolean,
    isDead: boolean,
  ): void {
    // 1. Empty background (full bar width)
    this.builder.drawRect(emptyBgBrush, null, {
      x, y, width: BAR_WIDTH, height: BAR_HEIGHT,
    });

    // 2. HP fill (gradient)
    const fillRatio = maxHp > 0 ? Math.max(0, currentHp / maxHp) : 0;
    if (fillRatio > 0 && !isDead) {
      const fillWidth = BAR_WIDTH * fillRatio;
      const isLowHp = fillRatio < 0.25;

      let topColor: Color;
      let bottomColor: Color;
      if (isLowHp) {
        topColor = LOW_HP_TOP;
        bottomColor = LOW_HP_BOTTOM;
      } else if (isHero) {
        topColor = HERO_FILL_TOP;
        bottomColor = HERO_FILL_BOTTOM;
      } else {
        topColor = ENEMY_FILL_TOP;
        bottomColor = ENEMY_FILL_BOTTOM;
      }

      const fillGradient = new LinearGradientBrush(
        new Vec2(x, y),
        new Vec2(x, y + BAR_HEIGHT),
        [
          { offset: 0, color: topColor },
          { offset: 1, color: bottomColor },
        ],
      );
      this.builder.drawRect(fillGradient, null, {
        x, y, width: fillWidth, height: BAR_HEIGHT,
      });
    }

    // 3. Dead overlay
    if (isDead) {
      this.builder.drawRect(deadOverlayBrush, null, {
        x, y, width: BAR_WIDTH, height: BAR_HEIGHT,
      });
    }

    // 4. Border (sharp rectangle)
    this.builder.drawRect(null, borderPen, {
      x, y, width: BAR_WIDTH, height: BAR_HEIGHT,
    });

    // 5. HP text with black outline (e.g., "45/100")
    const hpText = isDead
      ? 'DEAD'
      : `${Math.round(Math.max(0, currentHp))}/${maxHp}`;
    const fontSize = 11;
    const textY = y + (BAR_HEIGHT - fontSize) / 2 - 1;
    const textRect = { x, y: textY, width: BAR_WIDTH, height: BAR_HEIGHT };

    // Black outline (8 directions)
    const offsets = [
      {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
      {dx: -1, dy: 0},                    {dx: 1, dy: 0},
      {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1},
    ];
    for (const off of offsets) {
      this.builder.drawText(
        hpText,
        { x: x + off.dx, y: textY + off.dy, width: BAR_WIDTH, height: BAR_HEIGHT },
        fontSize,
        textOutlineBrush,
        hpFont,
        { textAlignment: DrawTextAlignment.Center },
      );
    }
    // White text on top
    this.builder.drawText(
      hpText,
      textRect,
      fontSize,
      textFillBrush,
      hpFont,
      { textAlignment: DrawTextAlignment.Center },
    );
  }
}
