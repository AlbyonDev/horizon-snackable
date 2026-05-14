/**
 * ShuffleHandler
 *
 * Two distinct shuffle modes:
 *
 * No-moves reroll (isPowerShuffle=false):
 *   All gems fade out with rotation → brief pause → board refilled with new
 *   random colours (no initial matches, at least one valid move) → fade in.
 *
 * Power shuffle (isPowerShuffle=true, e.g. Oracle's Foresight):
 *   Existing gem types are rearranged via Fisher-Yates. Each gem immediately
 *   gets its new type and slides visually from its old screen position to its
 *   new grid position over SHUFFLE_DURATION seconds. No fade — gems stay
 *   visible throughout. Matches may form and are resolved by the cascade pipeline.
 */
import { GemType, GEM_TYPE_COUNT } from './Types';
import type { Gem } from './Types';
import { BOARD_COLS, BOARD_ROWS } from './Constants';
import { gridToPixelX, gridToPixelY } from './BoardState';
import { hasValidMoves } from './ValidMoveChecker';

export enum ShufflePhase {
  Idle = 0,
  FadingOut = 1,   // no-moves reroll
  Paused = 2,      // no-moves reroll
  FadingIn = 3,    // no-moves reroll
  Shuffling = 4,   // power shuffle: gems slide to new positions
}

const FADE_OUT_DURATION = 0.3;
const PAUSE_DURATION = 0.1;
const FADE_IN_DURATION = 0.3;
const SHUFFLE_DURATION = 0.5;  // gem-slide animation for power shuffle
const MAX_SHUFFLE_ATTEMPTS = 50;
const FADE_OUT_ROTATION = 15;

export class ShuffleHandler {
  private _phase: ShufflePhase = ShufflePhase.Idle;
  private _progress: number = 0;
  private _rotationAmount: number = 0;
  private _isPowerShuffle: boolean = false;
  /** Source pixel positions for each board cell during the Shuffling animation. */
  private _shuffleSources: { x: number; y: number }[] = [];

  get phase(): ShufflePhase { return this._phase; }
  get isAnimating(): boolean { return this._phase !== ShufflePhase.Idle; }
  get rotationAmount(): number { return this._rotationAmount; }
  get isPowerShuffle(): boolean { return this._isPowerShuffle; }

  /**
   * Start the shuffle animation.
   * @param isPowerShuffle  When true, existing gems are rearranged and slide
   *   to their new positions (power shuffle). When false, the board is refilled
   *   with new random colours (no-moves reroll).
   */
  start(board: (Gem | null)[][], isPowerShuffle: boolean = false): void {
    this._isPowerShuffle = isPowerShuffle;
    this._progress = 0;
    this._rotationAmount = 0;

    if (isPowerShuffle) {
      this.preparePowerShuffle(board);
      this._phase = ShufflePhase.Shuffling;
    } else {
      this._phase = ShufflePhase.FadingOut;
    }
  }

  /** @returns true when the shuffle is fully complete. */
  update(dt: number, board: (Gem | null)[][]): boolean {
    switch (this._phase) {

      case ShufflePhase.FadingOut: {
        this._progress += dt / FADE_OUT_DURATION;
        const t = Math.min(this._progress, 1);
        this._rotationAmount = t * FADE_OUT_ROTATION;
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const gem = board[row][col];
            if (gem) { gem.anim.alpha = 1 - t; gem.anim.scale = 1 - t * 0.3; }
          }
        }
        if (t >= 1) { this._phase = ShufflePhase.Paused; this._progress = 0; }
        return false;
      }

      case ShufflePhase.Paused: {
        this._progress += dt / PAUSE_DURATION;
        if (this._progress >= 1) {
          this.refillBoard(board);
          this._phase = ShufflePhase.FadingIn;
          this._progress = 0;
          this._rotationAmount = 0;
        }
        return false;
      }

      case ShufflePhase.FadingIn: {
        this._progress += dt / FADE_IN_DURATION;
        const t = Math.min(this._progress, 1);
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const gem = board[row][col];
            if (gem) { gem.anim.alpha = t; gem.anim.scale = 0.7 + t * 0.3; }
          }
        }
        if (t >= 1) {
          for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
              const gem = board[row][col];
              if (gem) { gem.anim.alpha = 1; gem.anim.scale = 1; gem.anim.isAnimating = false; }
            }
          }
          this._phase = ShufflePhase.Idle;
          return true;
        }
        return false;
      }

      case ShufflePhase.Shuffling: {
        this._progress += dt / SHUFFLE_DURATION;
        const t = easeInOutQuad(Math.min(this._progress, 1));
        for (let row = 0; row < BOARD_ROWS; row++) {
          for (let col = 0; col < BOARD_COLS; col++) {
            const gem = board[row][col];
            if (!gem) continue;
            const src = this._shuffleSources[row * BOARD_COLS + col];
            const destX = gridToPixelX(col);
            const destY = gridToPixelY(row);
            gem.visualX = src.x + (destX - src.x) * t;
            gem.visualY = src.y + (destY - src.y) * t;
          }
        }
        if (this._progress >= 1) {
          for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
              const gem = board[row][col];
              if (gem) {
                gem.visualX = gridToPixelX(col);
                gem.visualY = gridToPixelY(row);
                gem.anim.isAnimating = false;
              }
            }
          }
          this._phase = ShufflePhase.Idle;
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  reset(): void {
    this._phase = ShufflePhase.Idle;
    this._progress = 0;
    this._rotationAmount = 0;
    this._isPowerShuffle = false;
    this._shuffleSources = [];
  }

  // ─── Power shuffle ─────────────────────────────────────────────────────────

  /**
   * Rearrange existing gem types via Fisher-Yates. Each type is paired with
   * its source pixel position so the Shuffling animation knows where each gem
   * started. Types are assigned immediately; visual positions are set to the
   * source so gems appear to slide from their old spot to the new grid cell.
   */
  private preparePowerShuffle(board: (Gem | null)[][]): void {
    // Collect (type, sourcePixelPos) pairs in row-major order
    const pairs: { type: GemType; x: number; y: number }[] = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const gem = board[row][col];
        if (gem) pairs.push({ type: gem.type, x: gem.visualX, y: gem.visualY });
      }
    }

    // Fisher-Yates shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    // Assign shuffled types and record source positions for the animation
    this._shuffleSources = new Array(BOARD_ROWS * BOARD_COLS);
    let idx = 0;
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const gem = board[row][col];
        if (!gem) continue;
        const p = pairs[idx++];
        gem.type = p.type;
        gem.visualX = p.x;
        gem.visualY = p.y;
        this._shuffleSources[row * BOARD_COLS + col] = { x: p.x, y: p.y };
      }
    }
  }

  // ─── No-moves reroll ───────────────────────────────────────────────────────

  private refillBoard(board: (Gem | null)[][]): void {
    let attempts = 0;
    while (attempts < MAX_SHUFFLE_ATTEMPTS) {
      attempts++;
      this.fillBoardMatchFree(board);
      if (hasValidMoves(board)) return;
    }
    console.warn(`[ShuffleHandler] Could not find match-free board after ${MAX_SHUFFLE_ATTEMPTS} attempts`);
  }

  private fillBoardMatchFree(board: (Gem | null)[][]): void {
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const type = this.getRandomTypeNoMatch(board, row, col);
        const gem = board[row][col];
        if (gem) {
          gem.type = type;
          gem.row = row;
          gem.col = col;
          gem.visualX = gridToPixelX(col);
          gem.visualY = gridToPixelY(row);
          gem.anim = { scale: 0.7, alpha: 0, isAnimating: true };
        } else {
          board[row][col] = {
            type, row, col,
            visualX: gridToPixelX(col),
            visualY: gridToPixelY(row),
            anim: { scale: 0.7, alpha: 0, isAnimating: true },
          };
        }
      }
    }
  }

  private getRandomTypeNoMatch(board: (Gem | null)[][], row: number, col: number): GemType {
    const excluded: Set<GemType> = new Set();
    if (col >= 2) {
      const l1 = board[row][col - 1], l2 = board[row][col - 2];
      if (l1 && l2 && l1.type === l2.type) excluded.add(l1.type);
    }
    if (row >= 2) {
      const a1 = board[row - 1][col], a2 = board[row - 2][col];
      if (a1 && a2 && a1.type === a2.type) excluded.add(a1.type);
    }
    const available: GemType[] = [];
    for (let t = 0; t < GEM_TYPE_COUNT; t++) {
      if (!excluded.has(t as GemType)) available.push(t as GemType);
    }
    return available[Math.floor(Math.random() * available.length)];
  }
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
