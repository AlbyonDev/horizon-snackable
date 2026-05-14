// Arena Vermin — Damage Circle Weapon System (pure logic module)
// The damage circle is a Weapon03 sprite centered on the hero, scaled to the
// level's damage radius, that spins around its own center. Any enemy inside
// the radius takes damage on a per-enemy cooldown.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { ImageBrush } from 'meta/worlds';
import type { CameraState, EnemyState, DamageCircleState } from './Types';
import { worldToScreen } from './IsoRenderer';
import {
  DAMAGE_CIRCLE_LEVELS,
  CANVAS_W, CANVAS_H, PIXELS_PER_UNIT,
} from './Constants';
import { heroWeapon03Texture } from './Assets';

const damageCircleBrush = new ImageBrush(heroWeapon03Texture);

export interface DamageCircleHitResult {
  enemyIndex: number;
  damage: number;
}

/** Initialize damage circle state for the current level. */
export function initDamageCircle(level: number): DamageCircleState {
  return {
    angle: 0,
    hitCooldownMap: new Map(),
  };
}

/** Update the damage circle: spin the sprite and damage enemies inside the
 *  radius (per-enemy cooldown). Returns hits for the main loop to apply. */
export function updateDamageCircle(
  state: DamageCircleState,
  heroX: number,
  heroY: number,
  enemies: EnemyState[],
  dt: number,
  level: number,
  gameTime: number,
): DamageCircleHitResult[] {
  if (level <= 0) return [];

  const data = DAMAGE_CIRCLE_LEVELS[level - 1];
  const hits: DamageCircleHitResult[] = [];

  // Spin the sprite around its own center.
  state.angle += data.orbitSpeed * dt;
  if (state.angle > Math.PI * 2) state.angle -= Math.PI * 2;

  // Hit detection: any enemy inside (radius + enemy body radius) takes a hit,
  // respecting per-enemy cooldown.
  const enemyRadius = 0.5;
  const hitDist = data.radius + enemyRadius;
  const hitDistSq = hitDist * hitDist;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead || enemy.isSpawning) continue;
    const dx = enemy.x - heroX;
    const dy = enemy.y - heroY;
    if (dx * dx + dy * dy >= hitDistSq) continue;

    const lastHit = state.hitCooldownMap.get(enemy);
    if (lastHit !== undefined && gameTime - lastHit < data.hitCooldown) continue;

    state.hitCooldownMap.set(enemy, gameTime);
    hits.push({ enemyIndex: i, damage: data.damage });
  }

  // Periodically prune cooldown entries for dead/stale enemies.
  if (state.hitCooldownMap.size > 32) {
    const horizon = gameTime - data.hitCooldown;
    for (const [enemy, t] of state.hitCooldownMap) {
      if (enemy.isDead || t < horizon) state.hitCooldownMap.delete(enemy);
    }
  }

  return hits;
}

/** Draw the damage circle: Weapon03 sprite centered on hero, sized to the
 *  level's damage radius, spinning around its own center. */
export function drawDamageCircle(
  builder: DrawingCommandsBuilder,
  state: DamageCircleState,
  heroX: number,
  heroY: number,
  camera: CameraState,
  level: number,
): void {
  if (level <= 0) return;

  const data = DAMAGE_CIRCLE_LEVELS[level - 1];

  const { sx, sy } = worldToScreen(heroX, heroY);
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const screenX = sx - camera.offsetX + screenCX;
  const screenY = sy - camera.offsetY + screenCY;

  // Sprite diameter = 2 * radius (in pixels). The sprite IS the damage zone.
  const diam = data.radius * 2 * PIXELS_PER_UNIT;
  const half = diam / 2;

  // Cull off-screen (with margin for the disc)
  if (screenX < -half - 20 || screenX > CANVAS_W + half + 20 ||
      screenY < -half - 20 || screenY > CANVAS_H + half + 20) return;

  // Spin around the sprite's center (the hero position on screen).
  const angleDeg = state.angle * (180 / Math.PI);
  builder.pushTranslate({ x: screenX, y: screenY });
  builder.pushRotate(angleDeg, { x: 0, y: 0 });
  builder.drawRect(damageCircleBrush, null, {
    x: -half,
    y: -half,
    width: diam,
    height: diam,
  });
  builder.pop(); // rotate
  builder.pop(); // translate
}
