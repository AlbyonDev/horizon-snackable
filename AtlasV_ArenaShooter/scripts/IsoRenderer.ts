// Arena Vermin — Flat 2D Top-Down Renderer (formerly Isometric Renderer)
// Provides world-to-screen conversion using a flat 1:1 projection.
import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Color,
} from 'meta/worlds';
import {
  PIXELS_PER_UNIT, WORLD_W, WORLD_H,
  CANVAS_W, CANVAS_H,
  RING_INNER_COLOR, RING_INNER_OPACITY, RING_INNER_WIDTH,
  RING_OUTER_COLOR, RING_OUTER_OPACITY,
  RING_OUTER_WIDTH_MIN, RING_OUTER_WIDTH_MAX,
  RING_PULSE_PERIOD, RING_GAP_PX,
  RING_INNER_GLOW_WIDTH, RING_INNER_GLOW_OPACITY,
  RING_OUTER_GLOW_WIDTH, RING_OUTER_GLOW_OPACITY,
} from './Constants';
import type { CameraState } from './Types';
import { mapTexture } from './Assets';

/**
 * Convert world coordinates to screen-space pixel coordinates.
 * Flat 1:1 projection: 1 world unit = PIXELS_PER_UNIT screen pixels.
 */
export function worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
  const sx = wx * PIXELS_PER_UNIT;
  const sy = wy * PIXELS_PER_UNIT;
  return { sx, sy };
}

/**
 * Convert screen pixel coordinates back to world coordinates.
 */
export function screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
  const wx = sx / PIXELS_PER_UNIT;
  const wy = sy / PIXELS_PER_UNIT;
  return { wx, wy };
}

/**
 * Clamp a world coordinate to stay within the grid [0, size].
 */
export function clampCoord(val: number, size: number): number {
  return Math.max(0, Math.min(size, val));
}

/**
 * Wrap a world coordinate using modulo (legacy compat — prefer clampCoord for bounded maps).
 */
export function wrapCoord(val: number, size: number): number {
  return ((val % size) + size) % size;
}

/**
 * Return val relative to a reference point in a bounded/clamped world.
 * Since the world is clamped (not toroidal), no wrapping adjustment is needed.
 */
export function wrapRelative(val: number, _ref: number, _size: number): number {
  return val;
}

/**
 * Draw the map.png background as a flat rectangle covering the world area.
 * The map image represents the full arena floor.
 */
export function drawTileGrid(
  builder: DrawingCommandsBuilder,
  camera: CameraState
): void {
  // Map covers the full world in screen pixels
  const mapW = WORLD_W * PIXELS_PER_UNIT;
  const mapH = WORLD_H * PIXELS_PER_UNIT;

  const screenCenterX = CANVAS_W / 2;
  const screenCenterY = CANVAS_H / 2;

  // Map starts at world origin (0,0) in screen space
  const drawX = 0 - camera.offsetX + screenCenterX;
  const drawY = 0 - camera.offsetY + screenCenterY;
  builder.drawImage(mapTexture, {x: drawX, y: drawY, width: mapW, height: mapH});
}

/**
 * Draw the attack range ring around the hero.
 * Flat 2D: uses equal-radius circles (no more iso ellipses).
 */
export function drawAttackRangeRing(
  builder: DrawingCommandsBuilder,
  screenX: number,
  screenY: number,
  rangeUnits: number,
  animTime: number
): void {
  // Convert range from world units to screen-space radius (circle)
  const baseRadius = rangeUnits * PIXELS_PER_UNIT;

  // Outer ring (pulsing)
  const pulseT = (Math.sin(animTime * (2 * Math.PI / RING_PULSE_PERIOD)) + 1) / 2;
  const outerWidth = RING_OUTER_WIDTH_MIN + pulseT * (RING_OUTER_WIDTH_MAX - RING_OUTER_WIDTH_MIN);
  const outerColor = Color.fromHex(RING_OUTER_COLOR);

  // Outer glow
  const outerGlowOpacity = RING_OUTER_GLOW_OPACITY * (0.7 + 0.3 * pulseT);
  const outerGlowBrush = new SolidBrush(new Color(outerColor.r, outerColor.g, outerColor.b, outerGlowOpacity));
  const outerGlowPen = new Pen(outerGlowBrush, RING_OUTER_GLOW_WIDTH);
  builder.drawEllipse(null, outerGlowPen, {x: screenX, y: screenY}, {x: baseRadius, y: baseRadius});

  // Outer main stroke
  const outerBrush = new SolidBrush(new Color(outerColor.r, outerColor.g, outerColor.b, RING_OUTER_OPACITY));
  const outerPen = new Pen(outerBrush, outerWidth);
  builder.drawEllipse(null, outerPen, {x: screenX, y: screenY}, {x: baseRadius, y: baseRadius});

  // Inner ring
  const innerRadius = baseRadius - RING_GAP_PX;
  const innerColor = Color.fromHex(RING_INNER_COLOR);

  // Inner glow
  const innerGlowBrush = new SolidBrush(new Color(innerColor.r, innerColor.g, innerColor.b, RING_INNER_GLOW_OPACITY));
  const innerGlowPen = new Pen(innerGlowBrush, RING_INNER_GLOW_WIDTH);
  builder.drawEllipse(null, innerGlowPen, {x: screenX, y: screenY}, {x: innerRadius, y: innerRadius});

  // Inner main stroke
  const innerBrush = new SolidBrush(new Color(innerColor.r, innerColor.g, innerColor.b, RING_INNER_OPACITY));
  const innerPen = new Pen(innerBrush, RING_INNER_WIDTH);
  builder.drawEllipse(null, innerPen, {x: screenX, y: screenY}, {x: innerRadius, y: innerRadius});
}
