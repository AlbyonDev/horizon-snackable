/**
 * MatchValidator
 *
 * Shared logic for "would swapping (r1,c1) with (r2,c2) make a 3+ match?"
 *
 * This used to live in two near-identical copies inside ValidMoveChecker
 * and SwapHandler. Bug fixes had to be applied in both places. Centralizing
 * here removes the divergence risk.
 */
import type { Gem } from './Types';
import { BOARD_COLS, BOARD_ROWS } from './Constants';

const MIN_MATCH_LENGTH = 3;

/**
 * Test whether swapping (r1,c1) with (r2,c2) would yield at least one
 * horizontal or vertical line of 3+ same-typed gems. Pure check — does
 * not mutate the board.
 */
export function swapProducesMatch(
  board: (Gem | null)[][],
  r1: number, c1: number,
  r2: number, c2: number,
): boolean {
  const a = board[r1][c1];
  const b = board[r2][c2];
  if (!a || !b) return false;

  if (longestLineThrough(board, r2, c2, a.type, r1, c1, b.type) >= MIN_MATCH_LENGTH) return true;
  if (longestLineThrough(board, r1, c1, b.type, r2, c2, a.type) >= MIN_MATCH_LENGTH) return true;
  return false;
}

/**
 * Length of the longest run (horizontal or vertical) of `placedType`
 * passing through (row, col), using a *virtual swap*: (row, col) is
 * treated as `placedType` and (otherRow, otherCol) as `otherType`.
 */
export function longestLineThrough(
  board: (Gem | null)[][],
  row: number, col: number, placedType: number,
  otherRow: number, otherCol: number, otherType: number,
): number {
  // Horizontal
  let h = 1;
  for (let c = col - 1; c >= 0; c--) {
    if (typeAt(board, row, c, row, col, placedType, otherRow, otherCol, otherType) === placedType) h++;
    else break;
  }
  for (let c = col + 1; c < BOARD_COLS; c++) {
    if (typeAt(board, row, c, row, col, placedType, otherRow, otherCol, otherType) === placedType) h++;
    else break;
  }
  if (h >= MIN_MATCH_LENGTH) return h;

  // Vertical
  let v = 1;
  for (let r = row - 1; r >= 0; r--) {
    if (typeAt(board, r, col, row, col, placedType, otherRow, otherCol, otherType) === placedType) v++;
    else break;
  }
  for (let r = row + 1; r < BOARD_ROWS; r++) {
    if (typeAt(board, r, col, row, col, placedType, otherRow, otherCol, otherType) === placedType) v++;
    else break;
  }
  return Math.max(h, v);
}

/** Effective gem type at (r,c) under the virtual swap. -1 means empty. */
function typeAt(
  board: (Gem | null)[][],
  r: number, c: number,
  placedRow: number, placedCol: number, placedType: number,
  otherRow: number, otherCol: number, otherType: number,
): number {
  if (r === placedRow && c === placedCol) return placedType;
  if (r === otherRow && c === otherCol) return otherType;
  const gem = board[r][c];
  return gem ? gem.type : -1;
}
