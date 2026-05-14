/**
 * FallHandler
 *
 * After gems are destroyed, makes gems above fall down to fill empty spaces.
 * Gems fall smoothly with eased motion, a slight bounce at the end,
 * and staggered timing per column for visual variety.
 */
import type { Gem } from './Types';
import { gridToPixelY } from './BoardState';
import { BOARD_ROWS, BOARD_COLS } from './Constants';
import { easeOutQuad, lerp } from './Tweener';
import {
  FALL_DURATION_PER_ROW,
  FALL_BOUNCE_OVERSHOOT as BOUNCE_OVERSHOOT,
  FALL_BOUNCE_SETTLE_DURATION as BOUNCE_SETTLE_DURATION,
  FALL_COLUMN_STAGGER as COLUMN_STAGGER,
} from './AnimationConfig';

interface FallingGem {
  gem: Gem;
  startY: number;
  targetY: number;
  targetRow: number;
  duration: number;
  col: number;
  bouncing: boolean;
  bounceProgress: number;
}

export class FallHandler {
  private fallingGems: FallingGem[] = [];
  private progress: number = 0;
  private maxDuration: number = 0;

  /**
   * Scan the board for empty spaces and determine which gems need to fall.
   * @returns true if there are gems that need to fall
   */
  start(board: (Gem | null)[][]): boolean {
    this.fallingGems = [];
    this.progress = 0;
    this.maxDuration = 0;

    // Process each column bottom-to-top
    for (let col = 0; col < BOARD_COLS; col++) {
      let emptyCount = 0;

      // Scan from bottom to top
      for (let row = BOARD_ROWS - 1; row >= 0; row--) {
        if (board[row][col] === null) {
          emptyCount++;
        } else if (emptyCount > 0) {
          // This gem needs to fall down by emptyCount rows
          const gem = board[row][col]!;
          const targetRow = row + emptyCount;
          const duration = emptyCount * FALL_DURATION_PER_ROW;

          this.fallingGems.push({
            gem,
            startY: gem.visualY,
            targetY: gridToPixelY(targetRow),
            targetRow,
            duration,
            col,
            bouncing: false,
            bounceProgress: 0,
          });

          gem.anim.isAnimating = true;

          const totalDuration = duration + COLUMN_STAGGER * col + BOUNCE_SETTLE_DURATION;
          if (totalDuration > this.maxDuration) {
            this.maxDuration = totalDuration;
          }

          // Move gem in board array
          board[targetRow][col] = gem;
          board[row][col] = null;

          // Update gem's logical position
          gem.row = targetRow;
          gem.col = col;
        }
      }
    }

    return this.fallingGems.length > 0;
  }

  /**
   * Update falling animation.
   * @returns true when all gems have finished falling
   */
  update(dt: number, board: (Gem | null)[][]): boolean {
    if (this.fallingGems.length === 0) return true;

    this.progress += dt;
    let allDone = true;

    for (const falling of this.fallingGems) {
      // Column stagger offset
      const staggerOffset = falling.col * COLUMN_STAGGER;
      const adjustedProgress = this.progress - staggerOffset;

      if (adjustedProgress <= 0) {
        allDone = false;
        continue;
      }

      if (falling.bouncing) {
        // Bounce phase: overshoot then settle
        falling.bounceProgress += dt / BOUNCE_SETTLE_DURATION;
        const bt = Math.min(falling.bounceProgress, 1);
        const overshootY = falling.targetY + BOUNCE_OVERSHOOT * (falling.targetY - falling.startY);
        falling.gem.visualY = lerp(overshootY, falling.targetY, bt);
        falling.gem.anim.scale = 1 + (1 - bt) * 0.05; // slight squish during bounce

        if (bt >= 1) {
          falling.gem.visualY = falling.targetY;
          falling.gem.anim.scale = 1;
          falling.gem.anim.isAnimating = false;
        } else {
          allDone = false;
        }
      } else {
        const t = Math.min(adjustedProgress / falling.duration, 1);
        const eased = easeOutQuad(t);
        falling.gem.visualY = lerp(falling.startY, falling.targetY, eased);

        if (t >= 1) {
          // Transition to bounce phase
          falling.bouncing = true;
          falling.bounceProgress = 0;
          // Overshoot slightly
          const overshootY = falling.targetY + BOUNCE_OVERSHOOT * (falling.targetY - falling.startY);
          falling.gem.visualY = overshootY;
          falling.gem.anim.scale = 1.05;
          allDone = false;
        } else {
          allDone = false;
        }
      }
    }

    if (allDone) {
      this.fallingGems = [];
    }

    return allDone;
  }

  /** Reset state */
  reset(): void {
    this.fallingGems = [];
    this.progress = 0;
    this.maxDuration = 0;
  }
}
