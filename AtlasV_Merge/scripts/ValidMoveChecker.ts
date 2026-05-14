/**
 * ValidMoveChecker
 *
 * Scans the entire board to determine if at least one valid swap exists.
 * Delegates the per-swap test to MatchValidator so the logic lives in one place.
 */
import type { Gem } from './Types';
import { BOARD_COLS, BOARD_ROWS } from './Constants';
import { swapProducesMatch } from './MatchValidator';

/**
 * Check if any valid move exists on the board.
 * Returns true as soon as one valid swap is found.
 */
export function hasValidMoves(board: (Gem | null)[][]): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (!board[row][col]) continue;

      // Right neighbour
      if (col + 1 < BOARD_COLS && board[row][col + 1]
          && swapProducesMatch(board, row, col, row, col + 1)) {
        return true;
      }
      // Bottom neighbour
      if (row + 1 < BOARD_ROWS && board[row + 1][col]
          && swapProducesMatch(board, row, col, row + 1, col)) {
        return true;
      }
    }
  }
  return false;
}
