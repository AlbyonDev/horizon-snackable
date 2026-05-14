/**
 * SpawnHandler
 *
 * After gems fall, spawns new random gems at the top of each column
 * to fill remaining empty spaces. New gems appear above the board
 * and animate down into place with a scale bounce on landing.
 */
import { GemType, GEM_TYPE_COUNT } from './Types';
import type { Gem } from './Types';
import { gridToPixelX, gridToPixelY } from './BoardState';
import { BOARD_ROWS, BOARD_COLS, GEM_CELL_SIZE, BOARD_OFFSET_Y } from './Constants';
import { easeOutQuad, lerp, bellSine } from './Tweener';
import {
  SPAWN_FALL_DURATION_PER_ROW,
  SPAWN_LAND_BOUNCE_DURATION as LAND_BOUNCE_DURATION,
  SPAWN_LAND_BOUNCE_SCALE as LAND_BOUNCE_SCALE,
} from './AnimationConfig';

interface SpawningGem {
  gem: Gem;
  startY: number;
  targetY: number;
  duration: number;
  landed: boolean;
  bounceProgress: number;
}

export class SpawnHandler {
  private spawningGems: SpawningGem[] = [];
  private progress: number = 0;
  private maxDuration: number = 0;

  /**
   * Scan the board for remaining empty spaces (top of columns after fall)
   * and spawn new gems that fall into place.
   * @returns true if new gems were spawned
   */
  start(board: (Gem | null)[][]): boolean {
    this.spawningGems = [];
    this.progress = 0;
    this.maxDuration = 0;

    for (let col = 0; col < BOARD_COLS; col++) {
      // Count empty spaces from the top
      let emptyCount = 0;
      for (let row = 0; row < BOARD_ROWS; row++) {
        if (board[row][col] === null) {
          emptyCount++;
        } else {
          break; // No more empty spaces in this column from top
        }
      }

      if (emptyCount === 0) continue;

      // Spawn gems for each empty row (from top to bottom within the empty section)
      for (let i = 0; i < emptyCount; i++) {
        const row = i; // Empty rows are at the top
        const type = this.getRandomGemType();

        const gem: Gem = {
          type,
          row,
          col,
          visualX: gridToPixelX(col),
          visualY: gridToPixelY(row), // Will be overridden by animation start
          anim: { scale: 1, alpha: 1, isAnimating: true },
        };

        // Start position: above the board (further up for higher empty slots)
        const startY = BOARD_OFFSET_Y - (emptyCount - i) * GEM_CELL_SIZE;
        const targetY = gridToPixelY(row);
        const rowsToFall = emptyCount - i; // Distance in rows
        const duration = rowsToFall * SPAWN_FALL_DURATION_PER_ROW;

        gem.visualY = startY;

        this.spawningGems.push({
          gem,
          startY,
          targetY,
          duration,
          landed: false,
          bounceProgress: 0,
        });

        const totalDuration = duration + LAND_BOUNCE_DURATION;
        if (totalDuration > this.maxDuration) {
          this.maxDuration = totalDuration;
        }

        // Place gem in the board
        board[row][col] = gem;
      }
    }

    return this.spawningGems.length > 0;
  }

  /**
   * Update spawn falling animation.
   * @returns true when all spawned gems have landed
   */
  update(dt: number, board: (Gem | null)[][]): boolean {
    if (this.spawningGems.length === 0) return true;

    this.progress += dt;
    let allDone = true;

    for (const spawning of this.spawningGems) {
      if (spawning.landed) {
        // Bounce phase: scale 1.0 -> LAND_BOUNCE_SCALE -> 1.0
        spawning.bounceProgress += dt / LAND_BOUNCE_DURATION;
        const bt = Math.min(spawning.bounceProgress, 1);
        spawning.gem.anim.scale = 1 + (LAND_BOUNCE_SCALE - 1) * bellSine(bt);

        if (bt >= 1) {
          spawning.gem.anim.scale = 1;
          spawning.gem.anim.isAnimating = false;
        } else {
          allDone = false;
        }
      } else {
        const t = Math.min(this.progress / spawning.duration, 1);
        const eased = easeOutQuad(t);
        spawning.gem.visualY = lerp(spawning.startY, spawning.targetY, eased);

        if (t >= 1) {
          spawning.gem.visualY = spawning.targetY;
          spawning.landed = true;
          spawning.bounceProgress = 0;
          spawning.gem.anim.scale = LAND_BOUNCE_SCALE;
          allDone = false;
        } else {
          allDone = false;
        }
      }
    }

    if (allDone) {
      this.spawningGems = [];
    }

    return allDone;
  }

  /** Reset state */
  reset(): void {
    this.spawningGems = [];
    this.progress = 0;
    this.maxDuration = 0;
  }

  private getRandomGemType(): GemType {
    return Math.floor(Math.random() * GEM_TYPE_COUNT) as GemType;
  }
}
