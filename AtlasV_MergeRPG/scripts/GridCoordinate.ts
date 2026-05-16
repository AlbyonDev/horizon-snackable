/**
 * GridCoordinate
 *
 * Strongly-typed grid position helpers. Use these instead of ad-hoc
 * "row,col" string keys: the encode/decode functions stay in one place
 * so changes to the encoding (or future migration to numeric keys)
 * touch a single file.
 */
import { BOARD_COLS } from './Constants';

export interface GridCoord {
  row: number;
  col: number;
}

/** Branded string type for grid keys — enforces use of encode()/decode() at call sites. */
export type GridKey = string & { readonly __brand: 'GridKey' };

/** Encode a grid position into a stable, hashable key. */
export function encodeKey(row: number, col: number): GridKey {
  return `${row},${col}` as GridKey;
}

/** Encode a GridCoord into a stable, hashable key. */
export function encodeCoord(coord: GridCoord): GridKey {
  return encodeKey(coord.row, coord.col);
}

/** Decode a key back into row/col. */
export function decodeKey(key: GridKey | string): GridCoord {
  const [r, c] = (key as string).split(',');
  return { row: Number(r), col: Number(c) };
}

/**
 * Pack (row, col) into a single number for set membership / map keys
 * when allocations matter. Reversible via unpack().
 */
export function packIndex(row: number, col: number): number {
  return row * BOARD_COLS + col;
}

export function unpackIndex(idx: number): GridCoord {
  return { row: Math.floor(idx / BOARD_COLS), col: idx % BOARD_COLS };
}

/** Check if two grid positions are 4-neighbour adjacent (no diagonals). */
export function isAdjacent(a: GridCoord, b: GridCoord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}
