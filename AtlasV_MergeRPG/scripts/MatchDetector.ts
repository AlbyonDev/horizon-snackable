/**
 * MatchDetector
 *
 * Scans the board for horizontal, vertical, and L/T shape matches.
 * Returns all matches found with positions, type, gem type, and mana value.
 */
import { GemType, MatchType } from './Types';
import type { Gem, Match } from './Types';
import { BOARD_COLS, BOARD_ROWS } from './Constants';
import { encodeKey } from './GridCoordinate';

// Mana values per match type
const MANA_MATCH_3 = 3;
const MANA_MATCH_4 = 5;
const MANA_MATCH_5 = 8;
const MANA_MATCH_LT = 10;

/**
 * Detect all matches on the board.
 * Returns an array of Match objects. Positions may overlap between matches
 * (an L/T shape counts as one match, not two separate ones).
 */
export function detectMatches(board: Gem[][]): Match[] {
  // Step 1: Find all horizontal runs of 3+
  const hRuns = findHorizontalRuns(board);
  // Step 2: Find all vertical runs of 3+
  const vRuns = findVerticalRuns(board);

  // Step 3: Detect L/T shapes by finding intersections between h and v runs of same type
  const matches: Match[] = [];
  const usedH: boolean[] = new Array(hRuns.length).fill(false);
  const usedV: boolean[] = new Array(vRuns.length).fill(false);

  // Check for L/T shapes: an H run and V run of same gem type that share at least one cell
  for (let hi = 0; hi < hRuns.length; hi++) {
    for (let vi = 0; vi < vRuns.length; vi++) {
      if (hRuns[hi].gemType !== vRuns[vi].gemType) continue;

      // Check if they share a cell
      const shared = hasSharedCell(hRuns[hi].positions, vRuns[vi].positions);
      if (shared) {
        // Merge into L/T match
        const merged = mergePositions(hRuns[hi].positions, vRuns[vi].positions);
        if (merged.length >= 5) {
          matches.push({
            positions: merged,
            type: MatchType.MatchLT,
            gemType: hRuns[hi].gemType,
            manaValue: MANA_MATCH_LT,
          });
          usedH[hi] = true;
          usedV[vi] = true;
        }
      }
    }
  }

  // Step 4: Add remaining horizontal runs that weren't part of L/T
  for (let hi = 0; hi < hRuns.length; hi++) {
    if (usedH[hi]) continue;
    const run = hRuns[hi];
    matches.push({
      positions: run.positions,
      type: classifyRunType(run.positions.length),
      gemType: run.gemType,
      manaValue: getManaForRunLength(run.positions.length),
    });
  }

  // Step 5: Add remaining vertical runs that weren't part of L/T
  for (let vi = 0; vi < vRuns.length; vi++) {
    if (usedV[vi]) continue;
    const run = vRuns[vi];
    matches.push({
      positions: run.positions,
      type: classifyRunType(run.positions.length),
      gemType: run.gemType,
      manaValue: getManaForRunLength(run.positions.length),
    });
  }

  return matches;
}

/** Get all unique matched positions (encoded as GridKey strings) from a set of matches */
export function getMatchedPositions(matches: Match[]): Set<string> {
  const positions = new Set<string>();
  for (const match of matches) {
    for (const pos of match.positions) {
      positions.add(encodeKey(pos.row, pos.col));
    }
  }
  return positions;
}

// ===== Internal Helpers =====

interface Run {
  positions: Array<{row: number; col: number}>;
  gemType: GemType;
}

function findHorizontalRuns(board: Gem[][]): Run[] {
  const runs: Run[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    let col = 0;
    while (col < BOARD_COLS) {
      const type = board[row][col].type;
      let end = col + 1;
      while (end < BOARD_COLS && board[row][end].type === type) {
        end++;
      }
      const length = end - col;
      if (length >= 3) {
        const positions: Array<{row: number; col: number}> = [];
        for (let c = col; c < end; c++) {
          positions.push({ row, col: c });
        }
        runs.push({ positions, gemType: type });
      }
      col = end;
    }
  }

  return runs;
}

function findVerticalRuns(board: Gem[][]): Run[] {
  const runs: Run[] = [];

  for (let col = 0; col < BOARD_COLS; col++) {
    let row = 0;
    while (row < BOARD_ROWS) {
      const type = board[row][col].type;
      let end = row + 1;
      while (end < BOARD_ROWS && board[end][col].type === type) {
        end++;
      }
      const length = end - row;
      if (length >= 3) {
        const positions: Array<{row: number; col: number}> = [];
        for (let r = row; r < end; r++) {
          positions.push({ row: r, col });
        }
        runs.push({ positions, gemType: type });
      }
      row = end;
    }
  }

  return runs;
}

function hasSharedCell(
  posA: Array<{row: number; col: number}>,
  posB: Array<{row: number; col: number}>,
): boolean {
  for (const a of posA) {
    for (const b of posB) {
      if (a.row === b.row && a.col === b.col) return true;
    }
  }
  return false;
}

function mergePositions(
  posA: Array<{row: number; col: number}>,
  posB: Array<{row: number; col: number}>,
): Array<{row: number; col: number}> {
  const set = new Set<string>();
  const merged: Array<{row: number; col: number}> = [];

  for (const p of posA) {
    const key = encodeKey(p.row, p.col);
    if (!set.has(key)) {
      set.add(key);
      merged.push(p);
    }
  }
  for (const p of posB) {
    const key = encodeKey(p.row, p.col);
    if (!set.has(key)) {
      set.add(key);
      merged.push(p);
    }
  }

  return merged;
}

function classifyRunType(length: number): MatchType {
  if (length >= 5) return MatchType.Match5;
  if (length >= 4) return MatchType.Match4;
  return MatchType.Match3;
}

function getManaForRunLength(length: number): number {
  if (length >= 5) return MANA_MATCH_5;
  if (length >= 4) return MANA_MATCH_4;
  return MANA_MATCH_3;
}
