/**
 * TeamLayout
 *
 * Constants and helpers for the depth-stacked team layout (allies on the
 * left, enemies on the right). Position tables live here so designers
 * can tune them without touching gameplay logic.
 *
 * Design:
 *   • Front rows are centre-anchored — the front ally's right edge meets the
 *     front enemy's left edge at x = CANVAS_WIDTH/2 so they appear toe-to-toe.
 *   • Each rank back is offset by (CASCADE_STEP_X, -CASCADE_STEP_Y) and
 *     shrinks by CASCADE_SCALE_STEP. The mirror is exact: ally back-row
 *     left-edge inset == enemy back-row right-edge inset.
 *
 * Tweaking just the four CASCADE_* constants below lets you tune the depth
 * effect without re-deriving the position tables by hand.
 */
import { CANVAS_WIDTH } from './Constants';

export const SPRITE_WIDTH = 160;
export const SPRITE_HEIGHT = 200;

// Centre-line where the two front rows meet.
const CENTRE_X = CANVAS_WIDTH / 2;
// Front-row vertical anchor (top of sprite at scale 1.0).
const FRONT_Y = 130;


// How far each rank steps outward (away from centre) and upward, plus how much
// it shrinks.
//
// CASCADE_STEP_X is large enough that the back rank reaches near the canvas
// edge (≈8 px margin), spreading the team across the full available half-
// width instead of clustering near centre. The step compensates for the
// scale-induced width shrink AND adds a visible peek-out, so each rank's
// silhouette (head + shoulder) sticks out clearly past the rank in front.
const CASCADE_STEP_X = 75;
const CASCADE_STEP_Y = 35;
const CASCADE_SCALE_STEP = 0.13;
const CASCADE_OPACITY_STEP = 0;

const FRONT_SCALE = 1.0;
const FRONT_OPACITY = 1.0;

export interface DepthSlot {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

/** Slot for a given depth (0 = front) on the ally side. */
function allySlot(depth: number): DepthSlot {
  const scale = FRONT_SCALE - depth * CASCADE_SCALE_STEP;
  // Ally is right-aligned to the centre line: at depth 0 the sprite's right
  // edge sits exactly at CENTRE_X (touching the front enemy).
  const x = CENTRE_X - SPRITE_WIDTH * scale - depth * CASCADE_STEP_X;
  const y = FRONT_Y - depth * CASCADE_STEP_Y;
  const opacity = FRONT_OPACITY - depth * CASCADE_OPACITY_STEP;
  return { x, y, scale, opacity };
}

/** Slot for a given depth (0 = front) on the enemy side. Mirror of allySlot. */
function enemySlot(depth: number): DepthSlot {
  const scale = FRONT_SCALE - depth * CASCADE_SCALE_STEP;
  // Enemy is left-aligned to the centre line: at depth 0 the sprite's left
  // edge sits exactly at CENTRE_X (touching the front ally).
  const x = CENTRE_X + depth * CASCADE_STEP_X;
  const y = FRONT_Y - depth * CASCADE_STEP_Y;
  const opacity = FRONT_OPACITY - depth * CASCADE_OPACITY_STEP;
  return { x, y, scale, opacity };
}

/** Allied team positions (left side) — front [0] meets the front enemy at centre. */
export const ALLY_POSITIONS: readonly DepthSlot[] = [
  allySlot(0),
  allySlot(1),
  allySlot(2),
];

/** Enemy team positions (right side, exact mirror of ALLY_POSITIONS). */
export const ENEMY_POSITIONS: readonly DepthSlot[] = [
  enemySlot(0),
  enemySlot(1),
  enemySlot(2),
];

/** Get position table for one side of the field. */
export function getPositions(isAlly: boolean): readonly DepthSlot[] {
  return isAlly ? ALLY_POSITIONS : ENEMY_POSITIONS;
}

/**
 * Override slot for a solo enemy (boss or single-enemy room).
 * Centered on the right half of the canvas at 1.5× scale so it
 * fills the space and feels more imposing than a normal front-rank slot.
 *
 * baseX = CENTRE_X so that the scaled sprite's visual centre lands at
 * 3/4 of the canvas width (right-half centre = 360 px).
 */
export const SOLO_ENEMY_SLOT: DepthSlot = {
  x: CENTRE_X,
  // Lift by the extra height gained from 1.5× scale so the bottom stays
  // aligned with a normal front-rank sprite bottom (FRONT_Y + SPRITE_HEIGHT).
  y: FRONT_Y - SPRITE_HEIGHT * 0.5,
  scale: 1.5,
  opacity: 1.0,
};
