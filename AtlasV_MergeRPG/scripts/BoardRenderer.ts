import {
  DrawingCommandsBuilder,
  SolidBrush,
  ImageBrush,
  LinearGradientBrush,
  Pen,
  Font,
  FontFamily,
  FontWeight,
  FontStyle,
  FontStretch,
  DrawTextAlignment,
} from 'meta/custom_ui';
import type { DrawTextOptions } from 'meta/custom_ui';
import { Color, Vec2 } from 'meta/worlds';

import { GemType } from './Types';
import type { Gem, Particle } from './Types';
import type { GridPosition } from './InputHandler';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_COLS,
  BOARD_ROWS,
  GEM_RENDER_SIZE,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  GEM_CELL_SIZE,
} from './Constants';
import {
  IDLE_PULSE_PERIOD,
  IDLE_PULSE_MIN,
  IDLE_PULSE_MAX,
  IDLE_PULSE_PHASE_PER_GEM,
} from './AnimationConfig';
import { encodeKey } from './GridCoordinate';
import {
  gemRedTexture,
  gemBlueTexture,
  gemGreenTexture,
  gemYellowTexture,
  gemPurpleTexture,
  dungeonBackgroundTexture,
} from './Assets';
import { ParticleSystem } from './ParticleSystem';
import { GEM_COLOR_HEX } from './PowerTypes';

// ===== Pre-created resources =====
const bgGradient = new LinearGradientBrush(
  new Vec2(0, 0), new Vec2(0, CANVAS_HEIGHT),
  [
    { offset: 0, color: Color.fromHex('#0A0A1A') },
    { offset: 0.4, color: Color.fromHex('#0F0F2D') },
    { offset: 1, color: Color.fromHex('#1A0A2E') },
  ]
);

const boardBgBrush = new SolidBrush(new Color(0, 0, 0, 0.4));
const boardBorderBrush = new SolidBrush(new Color(0.4, 0.3, 0.7, 0.5));
const boardBorderPen = new Pen(boardBorderBrush, 2);

// Enhanced grid panel resources
const panelOuterBrush = new SolidBrush(new Color(0.1, 0.05, 0.2, 0.85));
const panelInnerGlow = new SolidBrush(new Color(0.3, 0.2, 0.6, 0.3));
const panelBorderHighlight = new SolidBrush(new Color(0.6, 0.4, 1.0, 0.6));
const panelBorderPen = new Pen(panelBorderHighlight, 2);
const panelInnerBorderBrush = new SolidBrush(new Color(0.4, 0.3, 0.8, 0.4));
const panelInnerBorderPen = new Pen(panelInnerBorderBrush, 1);

// Pre-created gem brushes (ImageBrush must be stable across frames, not created per draw call)
const gemBrushes: Record<GemType, ImageBrush> = {
  [GemType.Red]: new ImageBrush(gemRedTexture),
  [GemType.Blue]: new ImageBrush(gemBlueTexture),
  [GemType.Green]: new ImageBrush(gemGreenTexture),
  [GemType.Yellow]: new ImageBrush(gemYellowTexture),
  [GemType.Purple]: new ImageBrush(gemPurpleTexture),
};

/**
 * Renders the game board and gems using DrawingCommandsBuilder.
 * Supports animated gems with scale and alpha, idle pulse, particles, and rotation.
 *
 * Particle drawing is delegated to ParticleSystem.render — BoardRenderer
 * just holds the reference to the particles list to draw on the right z-layer.
 */

// Cascade counter font
const cascadeFont = new Font(FontFamily.Bangers, FontWeight.Bold, FontStyle.Normal, FontStretch.Normal);
const cascadeTextOptions: DrawTextOptions = { textAlignment: DrawTextAlignment.Right };

// Mana particle interface
interface ManaParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  elapsed: number;
  duration: number;
  color: string;
}

export class BoardRenderer {
  private builder: DrawingCommandsBuilder;
  private frameCount: number = 0;
  private elapsedTime: number = 0;
  // Rotation overrides for swap animation (keyed by GridKey "row,col")
  private gemRotations: Map<string, number> = new Map();
  // Global rotation for shuffle animation
  private globalRotation: number = 0;
  // Active particles to render
  private particles: Particle[] = [];

  // === Cascade Counter ===
  private _cascadeCount: number = 0;
  private _cascadeTimer: number = 0; // Time since last cascade (for fade)
  private _cascadePunchScale: number = 1.0;

  // === Invalid Swap Feedback ===
  private _flashGems: Array<{ row: number; col: number; timer: number }> = [];
  private _shakeTimer: number = 0;
  private _shakeIntensity: number = 3; // pixels

  // === Mana Gain Particles ===
  private _manaParticles: ManaParticle[] = [];

  constructor(builder: DrawingCommandsBuilder) {
    this.builder = builder;
  }

  /** Set rotation for a specific gem during swap animation */
  setGemRotation(row: number, col: number, degrees: number): void {
    this.gemRotations.set(encodeKey(row, col), degrees);
  }

  /** Clear all gem rotations */
  clearGemRotations(): void {
    this.gemRotations.clear();
  }

  /** Set global rotation for all gems (used during shuffle) */
  setGlobalRotation(degrees: number): void {
    this.globalRotation = degrees;
  }

  /** Set active particles to render */
  setParticles(particles: Particle[]): void {
    this.particles = particles;
  }

  /** Update cascade counter display. Called from GameComponent when cascades change. */
  setCascadeCount(count: number): void {
    if (count > this._cascadeCount) {
      this._cascadePunchScale = 1.6; // Punch-scale on new cascade
    }
    this._cascadeCount = count;
    if (count > 0) {
      this._cascadeTimer = 0;
    }
  }

  /** Trigger invalid swap visual feedback (red flash + micro-shake). */
  triggerInvalidSwapFeedback(row1: number, col1: number, row2: number, col2: number): void {
    this._flashGems = [
      { row: row1, col: col1, timer: 0.15 },
      { row: row2, col: col2, timer: 0.15 },
    ];
    this._shakeTimer = 0.1;
  }

  /** Spawn mana gain particles from match center toward the mana bar area. */
  spawnManaParticles(centerX: number, centerY: number, gemType: GemType): void {
    const color = GEM_COLOR_HEX[gemType] ?? '#FFFFFF';
    // Target: bottom of the board area (where mana HUD is)
    const targetY = BOARD_OFFSET_Y + BOARD_ROWS * GEM_CELL_SIZE + 20;
    // Spread targets horizontally based on gem type
    const typeIndex = gemType as number;
    const targetX = BOARD_OFFSET_X + (typeIndex + 0.5) * (BOARD_COLS * GEM_CELL_SIZE / 5);

    const count = 3 + Math.floor(Math.random() * 3); // 3-5 particles
    for (let i = 0; i < count; i++) {
      this._manaParticles.push({
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        startX: centerX + (Math.random() - 0.5) * 20,
        startY: centerY + (Math.random() - 0.5) * 20,
        targetX: targetX + (Math.random() - 0.5) * 10,
        targetY: targetY,
        elapsed: -i * 0.05, // Stagger start
        duration: 0.5 + Math.random() * 0.2,
        color,
      });
    }
  }

  /** Get current board shake offset (for GameComponent to apply globally). */
  getShakeOffset(): { x: number; y: number } {
    if (this._shakeTimer <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this._shakeIntensity * 2,
      y: (Math.random() - 0.5) * this._shakeIntensity * 2,
    };
  }

  /** Draw the full-screen background gradient (call BEFORE teams for proper layering) */
  drawBackground(): void {
    this.builder.drawRect(bgGradient, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    // Dungeon background image in the upper portion (behind characters)
    const dungeonBrush = new ImageBrush(dungeonBackgroundTexture);
    this.builder.drawRect(dungeonBrush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: 380 });

    // Fade the bottom of the dungeon image into the gradient
    const fadeGradient = new LinearGradientBrush(
      new Vec2(0, 280), new Vec2(0, 380),
      [
        { offset: 0, color: new Color(0, 0, 0, 0) },
        { offset: 1, color: Color.fromHex('#0F0F2D') },
      ]
    );
    this.builder.drawRect(fadeGradient, null, { x: 0, y: 280, width: CANVAS_WIDTH, height: 100 });
  }

  /** Draw the full frame: board + gems + highlights + particles + mana HUD (no background!) */
  renderFrame(board: (Gem | null)[][], selectedGem?: GridPosition | null, dt?: number): void {
    this.frameCount++;
    if (dt != null) {
      this.elapsedTime += dt;
      this.updateEffects(dt);
    }
    this.drawBoardBackground();
    this.drawGems(board);
    // Red flash overlay on invalid swap gems
    this.drawInvalidFlash();
    if (selectedGem) {
      this.drawHighlight(selectedGem, board);
    }
    // Draw particles on top of gems
    this.drawParticles();
    // Mana gain particles
    this.drawManaParticles();
    // Cascade counter (top-right)
    this.drawCascadeCounter();
  }



  /** Semi-transparent board area with enhanced panel frame */
  private drawBoardBackground(): void {
    const boardW = BOARD_COLS * GEM_CELL_SIZE;
    const boardH = BOARD_ROWS * GEM_CELL_SIZE;
    const outerPad = 12;
    const innerPad = 6;

    // Outer decorative panel (larger frame)
    this.builder.drawRoundRect(
      panelOuterBrush,
      panelBorderPen,
      {
        x: BOARD_OFFSET_X - outerPad,
        y: BOARD_OFFSET_Y - outerPad,
        width: boardW + outerPad * 2,
        height: boardH + outerPad * 2,
      },
      new Vec2(12, 12),
    );

    // Inner glow layer
    this.builder.drawRoundRect(
      panelInnerGlow,
      panelInnerBorderPen,
      {
        x: BOARD_OFFSET_X - innerPad,
        y: BOARD_OFFSET_Y - innerPad,
        width: boardW + innerPad * 2,
        height: boardH + innerPad * 2,
      },
      new Vec2(8, 8),
    );
  }

  /** Draw all gems on the board */
  private drawGems(board: (Gem | null)[][]): void {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const gem = board[row][col];
        if (gem) {
          this.drawGem(gem, row, col);
        }
      }
    }
  }

  /** Draw a single gem at its visual position with animation effects */
  private drawGem(gem: Gem, row: number, col: number): void {
    const { alpha } = gem.anim;
    let { scale } = gem.anim;
    
    const brush = gemBrushes[gem.type];

    // Skip fully invisible gems
    //if (alpha <= 0) return;

    // Apply idle pulse if gem is not already animating
    if (!gem.anim.isAnimating) {
      // Offset phase per gem for organic feel
      const phase = (row * BOARD_COLS + col) * IDLE_PULSE_PHASE_PER_GEM;
      const pulseT = Math.sin((this.elapsedTime / IDLE_PULSE_PERIOD) * Math.PI * 2 + phase);
      const idleScale = IDLE_PULSE_MIN + (IDLE_PULSE_MAX - IDLE_PULSE_MIN) * (0.5 + 0.5 * pulseT);
      scale *= idleScale;
    }

    const centerX = gem.visualX + GEM_RENDER_SIZE / 2;
    const centerY = gem.visualY + GEM_RENDER_SIZE / 2;

    // Get rotation for this gem
    const key = encodeKey(row, col);
    const rotation = (this.gemRotations.get(key) ?? 0) + this.globalRotation;

    // If no transformations needed, draw efficiently
    if (scale === 1 && alpha === 1 && rotation === 0) {
      this.builder.drawRect(brush, null, {
        x: gem.visualX,
        y: gem.visualY,
        width: GEM_RENDER_SIZE,
        height: GEM_RENDER_SIZE,
      });
      return;
    }

    // Animated gem: apply transforms
    this.builder.pushTranslate(new Vec2(centerX, centerY));
    if (rotation !== 0) {
      this.builder.pushRotate(rotation, new Vec2(0, 0));
    }
    this.builder.pushScale(new Vec2(scale * alpha, scale * alpha), new Vec2(0, 0));
    this.builder.drawRect(brush, null, {
      x: -GEM_RENDER_SIZE / 2,
      y: -GEM_RENDER_SIZE / 2,
      width: GEM_RENDER_SIZE,
      height: GEM_RENDER_SIZE,
    });


    this.builder.pop(); // scale
    if (rotation !== 0) {
      this.builder.pop(); // rotate
    }
    this.builder.pop(); // translate
  }

  /** Draw a pulsing glow with gem's color and 1.15× scale pulse around the selected gem */
  private drawHighlight(pos: GridPosition, board: (Gem | null)[][]): void {
    const gem = board[pos.row]?.[pos.col];
    if (!gem) return;

    const x = BOARD_OFFSET_X + pos.col * GEM_CELL_SIZE;
    const y = BOARD_OFFSET_Y + pos.row * GEM_CELL_SIZE;
    const centerX = x + GEM_RENDER_SIZE / 2;
    const centerY = y + GEM_RENDER_SIZE / 2;

    // Get gem color for the glow
    const gemColorHex = GEM_COLOR_HEX[gem.type] ?? '#FFFFFF';
    const gemColor = Color.fromHex(gemColorHex);

    // Pulsing glow (outer soft glow with gem's color)
    const glowPulse = 0.35 + 0.2 * Math.sin(this.frameCount * 0.12);
    const glowSize = GEM_RENDER_SIZE + 14 + Math.sin(this.frameCount * 0.1) * 3;
    const glowBrush = new SolidBrush(new Color(gemColor.r, gemColor.g, gemColor.b, glowPulse));
    this.builder.drawRoundRect(glowBrush, null, {
      x: centerX - glowSize / 2,
      y: centerY - glowSize / 2,
      width: glowSize,
      height: glowSize,
    }, new Vec2(10, 10));

    // Inner border highlight with gem color
    const borderPulse = 0.7 + 0.3 * Math.sin(this.frameCount * 0.1);
    const borderBrush = new SolidBrush(new Color(gemColor.r, gemColor.g, gemColor.b, borderPulse));
    const pen = new Pen(borderBrush, 3);
    this.builder.drawRoundRect(null, pen, {
      x: x - 2,
      y: y - 2,
      width: GEM_RENDER_SIZE + 4,
      height: GEM_RENDER_SIZE + 4,
    }, new Vec2(6, 6));

    // 1.15× scale pulse: redraw the gem sprite on top at larger scale
    const pulseScale = 1.10 + 0.05 * Math.sin(this.frameCount * 0.15);
    const brush = gemBrushes[gem.type];
    this.builder.pushTranslate(new Vec2(centerX, centerY));
    this.builder.pushScale(new Vec2(pulseScale, pulseScale), new Vec2(0, 0));
    this.builder.drawRect(brush, null, {
      x: -GEM_RENDER_SIZE / 2,
      y: -GEM_RENDER_SIZE / 2,
      width: GEM_RENDER_SIZE,
      height: GEM_RENDER_SIZE,
    });
    this.builder.pop(); // scale
    this.builder.pop(); // translate
  }

  /** Draw active particles via the shared ParticleSystem renderer */
  private drawParticles(): void {
    ParticleSystem.renderList(this.builder, this.particles);
  }

  // ===== Effects Update =====

  /** Update timers for flash, shake, cascade, and mana particles */
  private updateEffects(dt: number): void {
    // Cascade timer (for fade-out after 1s of no cascades)
    if (this._cascadeCount > 0) {
      this._cascadeTimer += dt;
      // Decay punch scale toward 1.0
      this._cascadePunchScale += (1.0 - this._cascadePunchScale) * Math.min(1, dt * 8);
    } else if (this._cascadeTimer < 2) {
      this._cascadeTimer += dt;
    }

    // Invalid swap flash timers
    for (let i = this._flashGems.length - 1; i >= 0; i--) {
      this._flashGems[i].timer -= dt;
      if (this._flashGems[i].timer <= 0) {
        this._flashGems.splice(i, 1);
      }
    }

    // Board shake timer
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
    }

    // Mana gain particles
    for (let i = this._manaParticles.length - 1; i >= 0; i--) {
      const mp = this._manaParticles[i];
      mp.elapsed += dt;
      if (mp.elapsed >= mp.duration) {
        this._manaParticles.splice(i, 1);
        continue;
      }
      if (mp.elapsed < 0) continue; // Stagger delay

      // Ease-in-out cubic interpolation
      const t = mp.elapsed / mp.duration;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // Add a slight arc (parabolic Y offset)
      const arcHeight = -40 * Math.sin(t * Math.PI);
      mp.x = mp.startX + (mp.targetX - mp.startX) * eased;
      mp.y = mp.startY + (mp.targetY - mp.startY) * eased + arcHeight;
    }
  }

  // ===== Cascade Counter =====

  /** Draw cascade counter "×N" in top-right of the board area */
  private drawCascadeCounter(): void {
    if (this._cascadeCount < 2) return;
    // Fade out after 1s of no new cascade
    const fadeAlpha = this._cascadeTimer < 1.0 ? 1.0 : Math.max(0, 1.0 - (this._cascadeTimer - 1.0) * 2);
    if (fadeAlpha <= 0) return;

    const text = `×${this._cascadeCount}`;
    const scale = this._cascadePunchScale;
    const boardRight = BOARD_OFFSET_X + BOARD_COLS * GEM_CELL_SIZE;
    const textX = boardRight - 80;
    const textY = BOARD_OFFSET_Y - 38;

    // Drop shadow
    const shadowBrush = new SolidBrush(new Color(0, 0, 0, 0.7 * fadeAlpha));
    this.builder.pushTranslate(new Vec2(textX + 40, textY + 14));
    this.builder.pushScale(new Vec2(scale, scale), new Vec2(0, 0));
    this.builder.drawText(text, {x: -40, y: -14, width: 80, height: 28}, 26, shadowBrush, cascadeFont, cascadeTextOptions);
    this.builder.pop();
    this.builder.pop();

    // Main text (golden)
    const mainBrush = new SolidBrush(new Color(1, 0.85, 0.2, fadeAlpha));
    this.builder.pushTranslate(new Vec2(textX + 39, textY + 13));
    this.builder.pushScale(new Vec2(scale, scale), new Vec2(0, 0));
    this.builder.drawText(text, {x: -40, y: -14, width: 80, height: 28}, 26, mainBrush, cascadeFont, cascadeTextOptions);
    this.builder.pop();
    this.builder.pop();
  }

  // ===== Invalid Swap Flash =====

  /** Draw red flash overlays on gems that had an invalid swap */
  private drawInvalidFlash(): void {
    if (this._flashGems.length === 0) return;

    for (const fg of this._flashGems) {
      const alpha = fg.timer / 0.15; // Fade from 1 → 0
      const x = BOARD_OFFSET_X + fg.col * GEM_CELL_SIZE;
      const y = BOARD_OFFSET_Y + fg.row * GEM_CELL_SIZE;
      const flashBrush = new SolidBrush(new Color(1, 0.15, 0.15, 0.45 * alpha));
      this.builder.drawRoundRect(flashBrush, null, {
        x: x - 2,
        y: y - 2,
        width: GEM_RENDER_SIZE + 4,
        height: GEM_RENDER_SIZE + 4,
      }, new Vec2(6, 6));
    }
  }

  // ===== Mana Gain Particles =====

  /** Draw mana gain particles traveling to the mana bar */
  private drawManaParticles(): void {
    for (const mp of this._manaParticles) {
      if (mp.elapsed < 0) continue; // Not started yet (stagger)
      const t = mp.elapsed / mp.duration;
      const alpha = t < 0.8 ? 1.0 : 1.0 - (t - 0.8) / 0.2; // Fade near end
      const size = 4 + (1 - t) * 3; // Shrink over time
      const color = Color.fromHex(mp.color);
      const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha * 0.9));
      this.builder.drawEllipse(brush, null, new Vec2(mp.x, mp.y), new Vec2(size, size));
      // Bright core
      const coreBrush = new SolidBrush(new Color(1, 1, 1, alpha * 0.6));
      this.builder.drawEllipse(coreBrush, null, new Vec2(mp.x, mp.y), new Vec2(size * 0.4, size * 0.4));
    }
  }
}
