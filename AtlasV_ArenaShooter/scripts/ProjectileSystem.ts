// Arena Vermin — Projectile System (Milestone 4)
// Handles Gunner Mouse projectiles: spawning, movement, collision, and rendering.
// Now renders missile.png sprite rotated to face travel direction.
// Bounded arena: no wrapping, projectiles despawn when out of bounds.

import type { ProjectileState } from './Types';
import type { CameraState } from './Types';
import type { DrawingCommandsBuilder } from 'meta/worlds';
import { ImageBrush } from 'meta/worlds';
import {
  PROJECTILE_SPEED, PROJECTILE_MAX_AGE, PROJECTILE_SIZE_PX, PROJECTILE_COLOR,
  WORLD_W, WORLD_H, CANVAS_W, CANVAS_H,
} from './Constants';
import { worldToScreen } from './IsoRenderer';
import { cartoucheTexture } from './Assets';

const projectileBrush = new ImageBrush(cartoucheTexture);

/** Spawn a projectile from enemyPos aimed at heroPos (direct direction, no wrapping). */
export function spawnProjectile(
  projectiles: ProjectileState[],
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  damage: number
): void {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return;

  const ndx = dx / dist;
  const ndy = dy / dist;

  projectiles.push({
    x: fromX,
    y: fromY,
    vx: ndx * PROJECTILE_SPEED,
    vy: ndy * PROJECTILE_SPEED,
    age: 0,
    maxAge: PROJECTILE_MAX_AGE,
    damage,
  });
}

export interface ProjectileHitEvent {
  damage: number;
}

/** Update projectiles: move, check bounds, check collision with hero, return hits. */
export function updateProjectiles(
  projectiles: ProjectileState[],
  dt: number,
  heroX: number,
  heroY: number,
  heroCollisionRadius: number
): ProjectileHitEvent[] {
  const hits: ProjectileHitEvent[] = [];

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt;

    // Remove if out of bounds (bounded arena, no wrapping)
    if (p.x < -1 || p.x > WORLD_W + 1 || p.y < -1 || p.y > WORLD_H + 1) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check expiry
    if (p.age >= p.maxAge) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check collision with hero (direct distance, no wrapping)
    const dx = p.x - heroX;
    const dy = p.y - heroY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < heroCollisionRadius) {
      hits.push({ damage: p.damage });
      projectiles.splice(i, 1);
    }
  }

  return hits;
}

/** Draw projectiles on DrawingSurface as rotated missile sprites. */
export function drawProjectiles(
  builder: DrawingCommandsBuilder,
  projectiles: ProjectileState[],
  camera: CameraState,
  heroX: number,
  heroY: number
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const size = PROJECTILE_SIZE_PX;
  const halfSize = size / 2;

  for (const p of projectiles) {
    // Direct world-to-screen (no wrapping needed)
    const { sx, sy } = worldToScreen(p.x, p.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -20 || screenX > CANVAS_W + 20 || screenY < -20 || screenY > CANVAS_H + 20) continue;

    // Draw cartouche sprite (no rotation — projectile is a non-rotating bullet shape)
    builder.drawRect(projectileBrush, null, {x: screenX - halfSize, y: screenY - halfSize * 0.6, width: size, height: size * 0.6});
  }
}
