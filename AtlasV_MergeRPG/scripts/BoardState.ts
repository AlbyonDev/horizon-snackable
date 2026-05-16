import { GemType, GEM_TYPE_COUNT } from './Types';
import type { Gem } from './Types';
import {
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  GEM_CELL_SIZE,
} from './Constants';

/**
 * Manages the board grid state: gem placement, random fill, and match-free initialization.
 */

/** Convert grid position to pixel position */
export function gridToPixelX(col: number): number {
  return BOARD_OFFSET_X + col * GEM_CELL_SIZE;
}

export function gridToPixelY(row: number): number {
  return BOARD_OFFSET_Y + row * GEM_CELL_SIZE;
}

/** Create the board grid filled with random gems, ensuring no initial matches */
export function createBoard(): Gem[][] {
  const board: Gem[][] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowArr: Gem[] = [];
    for (let col = 0; col < BOARD_COLS; col++) {
      const type = getRandomGemTypeNoMatch(board, rowArr, row, col);
      rowArr.push({
        type,
        row,
        col,
        visualX: gridToPixelX(col),
        visualY: gridToPixelY(row),
        anim: { scale: 1, alpha: 1, isAnimating: false },
      });
    }
    board.push(rowArr);
  }

  return board;
}

/** Pick a random gem type that won't create an initial 3-in-a-row */
function getRandomGemTypeNoMatch(
  board: Gem[][],
  currentRow: Gem[],
  row: number,
  col: number,
): GemType {
  const excluded: Set<GemType> = new Set();

  // Check horizontal: if the two gems to the left are the same type, exclude that type
  if (col >= 2) {
    const left1 = currentRow[col - 1].type;
    const left2 = currentRow[col - 2].type;
    if (left1 === left2) {
      excluded.add(left1);
    }
  }

  // Check vertical: if the two gems above are the same type, exclude that type
  if (row >= 2) {
    const above1 = board[row - 1][col].type;
    const above2 = board[row - 2][col].type;
    if (above1 === above2) {
      excluded.add(above1);
    }
  }

  // Pick a random type from the remaining options
  const available: GemType[] = [];
  for (let t = 0; t < GEM_TYPE_COUNT; t++) {
    if (!excluded.has(t as GemType)) {
      available.push(t as GemType);
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}
