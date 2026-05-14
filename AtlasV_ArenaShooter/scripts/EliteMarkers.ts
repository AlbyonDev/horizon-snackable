// Arena Vermin — Elite Enemy DrawingSurface Markers
// Draws a pulsing ground indicator (ellipse) beneath elite enemies.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { SolidBrush, Pen, Color } from 'meta/worlds';
import type { EnemyState, CameraState, CameraShakeState } from './Types';
import { worldToScreen, wrapRelative } from './IsoRenderer';
import { getEnemyDims } from './SpriteUpdater';
import {
  CANVAS_W, CANVAS_H, WORLD_W, WORLD_H, ELITE_SCALE,
  ELITE_GLOW_COLORS,
} from './Constants';

/** Parse hex color to {r,g,b} in 0-1 range */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/** Draw ground indicator beneath elite enemies on the DrawingSurface. */
export function drawEliteMarkers(
  builder: DrawingCommandsBuilder,
  enemies: EnemyState[],
  camera: CameraState,
  cameraShake: CameraShakeState,
  heroX: number,
  heroY: number,
  gameTime: number,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const shakeX = cameraShake.offsetX;
  const shakeY = cameraShake.offsetY;

  for (const enemy of enemies) {
    if (!enemy.isElite || enemy.isDead || enemy.isSpawning) continue;

    const wrappedX = wrapRelative(enemy.x, heroX, WORLD_W);
    const wrappedY = wrapRelative(enemy.y, heroY, WORLD_H);
    const { sx, sy } = worldToScreen(wrappedX, wrappedY);
    const screenX = sx - camera.offsetX + screenCX + shakeX;
    const screenY = sy - camera.offsetY + screenCY + shakeY;

    // Cull off-screen
    if (screenX < -80 || screenX > CANVAS_W + 80 || screenY < -80 || screenY > CANVAS_H + 80) continue;

    const dims = getEnemyDims(enemy.enemyType);
    const scaledW = dims.w * ELITE_SCALE;

    // Ground indicator: a pulsing, glowing ellipse beneath the enemy
    const colorHex = ELITE_GLOW_COLORS[enemy.enemyType] || ELITE_GLOW_COLORS[0];
    const rgb = hexToRgb(colorHex);

    // Pulsing animation
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 3.5);
    const baseRx = scaledW * 0.4;
    const baseRy = baseRx * 0.35;
    const rxPulse = baseRx + pulse * 4;
    const ryPulse = baseRy + pulse * 2;

    // Position at the feet of the enemy (screenY is the foot position)
    const groundY = screenY - 2; // slightly above exact foot to align with shadow

    // Outer glow ring
    const outerAlpha = 0.3 + 0.15 * pulse;
    const outerBrush = new SolidBrush(new Color(rgb.r, rgb.g, rgb.b, outerAlpha * 0.4));
    const outerPen = new Pen(new SolidBrush(new Color(rgb.r, rgb.g, rgb.b, outerAlpha)), 2.5);
    builder.drawEllipse(outerBrush, outerPen,
      {x: screenX, y: groundY},
      {x: rxPulse, y: ryPulse});

    // Inner brighter ring
    const innerAlpha = 0.5 + 0.3 * pulse;
    const innerPen = new Pen(new SolidBrush(new Color(rgb.r, rgb.g, rgb.b, innerAlpha)), 1.5);
    builder.drawEllipse(null, innerPen,
      {x: screenX, y: groundY},
      {x: rxPulse * 0.6, y: ryPulse * 0.6});
  }
}
