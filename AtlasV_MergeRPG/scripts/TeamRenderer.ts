/**
 * TeamRenderer.ts
 *
 * Renders teams in a cascading depth layout:
 * - Allies on the LEFT side of the screen
 * - Enemies on the RIGHT side of the screen
 * - Characters stacked in depth (front = largest, back = smallest)
 * - All visual states (hurt, dead) done with code effects (opacity, scale, bounce)
 */
import {
  DrawingCommandsBuilder,
  SolidBrush,
  ImageBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  DrawTextAlignment,
} from 'meta/custom_ui';
import { Color, Vec2 } from 'meta/platform_api';

import { CANVAS_WIDTH } from './Constants';
import { TeamState, HURT_FLASH_DURATION } from './TeamState';
import { TurnOwner } from './TeamTypes';
import type { Hero, Enemy, TeamMemberVisual } from './TeamTypes';
import { getHeroTexture } from './HeroCatalog';
import { getEnemyTexture } from './EnemyCatalog';

// ===== Layout Constants =====
// Larger sprite size for bigger hero presence
const SPRITE_WIDTH = 160;
const SPRITE_HEIGHT = 200;

const TURN_INDICATOR_Y = 10;
const TURN_INDICATOR_HEIGHT = 20;

// HP bar sizing
const HP_BAR_WIDTH = 50;
const HP_BAR_HEIGHT = 5;
const HP_BAR_OFFSET_Y = 8; // Above the sprite

// Hero textures resolved via HeroCatalog, enemy textures via EnemyCatalog —
// each is the single source of truth for its art keys.

// ===== Pre-created resources =====
const hpBgBrush = new SolidBrush(new Color(0.15, 0.15, 0.15, 0.9));
const hpPlayerBrush = new SolidBrush(Color.fromHex('#44CC44'));
const hpEnemyBrush = new SolidBrush(Color.fromHex('#CC4444'));
const hpBorderBrush = new SolidBrush(new Color(1, 1, 1, 0.3));
const hpBorderPen = new Pen(hpBorderBrush, 1);

const turnFont = new Font(
  FontFamily.Bangers,
  FontWeight.Bold,
  FontStyle.Normal,
  FontStretch.Normal,
);
const turnPlayerBrush = new SolidBrush(Color.fromHex('#44FFAA'));
const turnEnemyBrush = new SolidBrush(Color.fromHex('#FF6666'));
const turnBgBrush = new SolidBrush(new Color(0, 0, 0, 0.5));

export class TeamRenderer {
  private builder: DrawingCommandsBuilder;

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
  }

  /** Render both teams and the turn indicator */
  render(teamState: TeamState): void {
    this.drawTurnIndicator(teamState.turnOwner);

    this.drawTeam(teamState.heroes, teamState.heroVisuals, teamState.heroDisplayHp, true);
    this.drawTeam(teamState.enemies, teamState.enemyVisuals, teamState.enemyDisplayHp, false);
  }

  // ===== Draw Team (sorted by current scale, back-to-front) =====
  private drawTeam(
    members: (Hero | Enemy)[],
    visuals: TeamMemberVisual[],
    displayHp: number[],
    isAlly: boolean,
  ): void {
    // Sort by *current* scale (smaller = further back = drawn first).
    // Driving the depth from the live-interpolated scale lets characters
    // cross over smoothly during a front-swap instead of popping at the end.
    const sortedIndices = visuals
      .map((_, i) => i)
      .sort((a, b) => visuals[a].scale - visuals[b].scale);

    for (const i of sortedIndices) {
      const member = members[i];
      const visual = visuals[i];

      if (visual.isDead && visual.opacity < 0.01) continue; // Skip fully dead

      this.drawCharacter(member, visual, displayHp[i], isAlly);
    }
  }

  // ===== Draw Single Character =====
  private drawCharacter(
    member: Hero | Enemy,
    visual: TeamMemberVisual,
    displayedHp: number,
    isAlly: boolean,
  ): void {
    const texture = isAlly
      ? getHeroTexture((member as Hero).id)
      : getEnemyTexture((member as Enemy).spriteKey);

    const w = SPRITE_WIDTH * visual.scale;
    const h = SPRITE_HEIGHT * visual.scale;
    // Combine static layout with attack lunge + hurt-shake jitter
    const drawX = visual.x + visual.attackOffsetX + visual.shakeOffsetX;
    const drawY = visual.y + visual.bounceOffset + visual.shakeOffsetY;

    const brush = new ImageBrush(texture);
    this.builder.drawRect(brush, null, {
      x: drawX,
      y: drawY,
      width: w,
      height: h,
    });

    // Opacity fade overlay (darken for back characters)
    if (visual.opacity < 1) {
      const fadeBrush = new SolidBrush(new Color(0.04, 0.04, 0.1, 1 - visual.opacity));
      this.builder.drawRect(fadeBrush, null, {
        x: drawX,
        y: drawY,
        width: w,
        height: h,
      });
    }

    // Hurt flash: brief, low-alpha white overlay that pulses out so it never
    // fully masks the sprite silhouette. The shake driven from TeamState does
    // most of the impact work — the overlay is just a blink to register "hit".
    if (visual.hurtFlashTimer > 0) {
      const t = visual.hurtFlashTimer / HURT_FLASH_DURATION; // 1 -> 0
      const pulse = Math.sin(t * Math.PI); // 0 -> 1 -> 0 (bell)
      const flashAlpha = pulse * 0.35;
      if (flashAlpha > 0.01) {
        const flashBrush = new SolidBrush(new Color(1, 1, 1, flashAlpha));
        this.builder.drawRect(flashBrush, null, {
          x: drawX,
          y: drawY,
          width: w,
          height: h,
        });
      }
    }

    // HP bar above the character (anchored to base position so it doesn't shake with the sprite)
    const baseX = visual.x;
    const baseY = visual.y + visual.bounceOffset;
    const hpBarX = baseX + (w - HP_BAR_WIDTH * visual.scale) / 2;
    const hpBarY = baseY - HP_BAR_HEIGHT - HP_BAR_OFFSET_Y;

    // Use displayedHp for smooth drain (passed from caller)
    const currentHp = displayedHp;
    const maxHp = member.maxHp;
    this.drawHpBar(
      hpBarX,
      hpBarY,
      currentHp,
      maxHp,
      isAlly,
      visual.scale,
    );
  }

  // ===== Turn Indicator =====
  private drawTurnIndicator(turnOwner: TurnOwner): void {
    const text = turnOwner === TurnOwner.Player ? 'YOUR TURN' : 'ENEMY TURN';
    const brush = turnOwner === TurnOwner.Player ? turnPlayerBrush : turnEnemyBrush;

    // Background strip centered at top
    this.builder.drawRect(turnBgBrush, null, {
      x: CANVAS_WIDTH / 2 - 70,
      y: TURN_INDICATOR_Y,
      width: 140,
      height: TURN_INDICATOR_HEIGHT,
    });

    this.builder.drawText(
      text,
      { x: 0, y: TURN_INDICATOR_Y + 2, width: CANVAS_WIDTH, height: TURN_INDICATOR_HEIGHT },
      14,
      brush,
      turnFont,
      { textAlignment: DrawTextAlignment.Center },
    );
  }

  // ===== Helper: Draw HP Bar =====
  private drawHpBar(
    x: number,
    y: number,
    currentHp: number,
    maxHp: number,
    isPlayer: boolean,
    scale: number,
  ): void {
    const barW = HP_BAR_WIDTH * scale;
    const barH = HP_BAR_HEIGHT;
    const fillRatio = maxHp > 0 ? currentHp / maxHp : 0;
    const fillBrush = isPlayer ? hpPlayerBrush : hpEnemyBrush;

    // Background
    this.builder.drawRoundRect(hpBgBrush, null, {
      x, y, width: barW, height: barH,
    }, new Vec2(2, 2));

    // Fill
    if (fillRatio > 0) {
      this.builder.drawRoundRect(fillBrush, null, {
        x, y, width: barW * fillRatio, height: barH,
      }, new Vec2(2, 2));
    }

    // Border
    this.builder.drawRoundRect(null, hpBorderPen, {
      x, y, width: barW, height: barH,
    }, new Vec2(2, 2));
  }
}
