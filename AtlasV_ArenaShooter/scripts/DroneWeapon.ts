// Arena Vermin — Drone Weapon System (pure logic module)
// Handles orbiting drone position updates, projectile firing at enemies, and rendering.
// Drones orbit the hero and fire aimed projectiles at nearby enemies.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { ImageBrush, SolidBrush, Pen, Color } from 'meta/worlds';
import type { CameraState, EnemyState, DroneState, DroneProjectileState, MuzzleFlash } from './Types';
import { spawnMuzzleFlash } from './ParticleSystem';
import { worldToScreen } from './IsoRenderer';
import {
  DRONE_LEVELS, DRONE_HIT_RADIUS, DRONE_SPRITE_SIZE,
  CANVAS_W, CANVAS_H, PIXELS_PER_UNIT,
  DRONE_PROJ_SPEED, DRONE_PROJ_MAX_AGE, DRONE_PROJ_RADIUS,
  DRONE_PROJ_SIZE_PX, DRONE_PROJ_COLOR, DRONE_PROJ_GLOW_COLOR,
} from './Constants';
import { droneWeaponTexture } from './Assets';

const droneBrush = new ImageBrush(droneWeaponTexture);
const projFillBrush = new SolidBrush(Color.fromHex(DRONE_PROJ_COLOR));
const projGlowBrush = new SolidBrush(Color.fromHex(DRONE_PROJ_GLOW_COLOR));
const projGlowPen = new Pen(projGlowBrush, 2);

export interface DroneHitResult {
  enemyIndex: number;
  damage: number;
}

/** Initialize drone states for the current level (creates/resizes array). */
export function initDrones(level: number): DroneState[] {
  if (level <= 0) return [];
  const data = DRONE_LEVELS[level - 1];
  const drones: DroneState[] = [];
  for (let i = 0; i < data.count; i++) {
    const angleOffset = (2 * Math.PI * i) / data.count;
    drones.push({
      angle: angleOffset,
      hitCooldownMap: new Map(),
      lastFireTime: -999,
    });
  }
  return drones;
}

/** Update drones each frame: rotate and fire projectiles at nearby enemies. */
export function updateDrones(
  drones: DroneState[],
  heroX: number,
  heroY: number,
  enemies: EnemyState[],
  dt: number,
  level: number,
  gameTime: number,
  droneProjectiles: DroneProjectileState[],
  muzzleFlashes: MuzzleFlash[],
): void {
  if (level <= 0 || drones.length === 0) return;

  const data = DRONE_LEVELS[level - 1];
  const fireInterval = 1.0 / data.fireRate;
  const fireRangeSq = data.fireRange * data.fireRange;

  for (const drone of drones) {
    // Rotate
    drone.angle += data.rotSpeed * dt;
    if (drone.angle > Math.PI * 2) drone.angle -= Math.PI * 2;

    // Drone world position
    const droneX = heroX + data.radius * Math.cos(drone.angle);
    const droneY = heroY + data.radius * Math.sin(drone.angle);

    // Check fire cooldown
    if (gameTime - drone.lastFireTime < fireInterval) continue;

    // Find nearest alive enemy within fireRange
    let nearestIdx = -1;
    let nearestDistSq = fireRangeSq;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.isDead || enemy.isSpawning) continue;
      const dx = enemy.x - droneX;
      const dy = enemy.y - droneY;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestIdx = i;
      }
    }

    // Fire projectile at nearest enemy
    if (nearestIdx >= 0) {
      const target = enemies[nearestIdx];
      const dx = target.x - droneX;
      const dy = target.y - droneY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        droneProjectiles.push({
          x: droneX,
          y: droneY,
          vx: dirX * DRONE_PROJ_SPEED,
          vy: dirY * DRONE_PROJ_SPEED,
          age: 0,
          damage: data.damage,
        });
        // Drones get a smaller cyan flash to match their projectile color.
        spawnMuzzleFlash(muzzleFlashes, droneX, droneY, 0.7, '#5DEFF6');
        drone.lastFireTime = gameTime;
      }
    }
  }
}

/** Update drone projectiles: move, check collision with enemies, remove expired. Returns hits. */
export function updateDroneProjectiles(
  projectiles: DroneProjectileState[],
  dt: number,
  enemies: EnemyState[],
): DroneHitResult[] {
  const hits: DroneHitResult[] = [];

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt;

    // Remove if expired
    if (p.age >= DRONE_PROJ_MAX_AGE) {
      projectiles.splice(i, 1);
      continue;
    }

    // Check collision with enemies (circle-circle)
    let hit = false;
    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];
      if (enemy.isDead || enemy.isSpawning) continue;
      const enemyRadius = 0.5;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const distSq = dx * dx + dy * dy;
      const hitDist = DRONE_PROJ_RADIUS + enemyRadius;
      if (distSq < hitDist * hitDist) {
        hits.push({ enemyIndex: e, damage: p.damage });
        hit = true;
        break;
      }
    }

    if (hit) {
      projectiles.splice(i, 1);
    }
  }

  return hits;
}

/** Draw drones on the DrawingSurface (no rotation — stays vertical). */
export function drawDrones(
  builder: DrawingCommandsBuilder,
  drones: DroneState[],
  camera: CameraState,
  heroX: number,
  heroY: number,
  level: number,
): void {
  if (level <= 0 || drones.length === 0) return;

  const data = DRONE_LEVELS[level - 1];
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const halfSize = DRONE_SPRITE_SIZE / 2;

  for (const drone of drones) {
    const droneWorldX = heroX + data.radius * Math.cos(drone.angle);
    const droneWorldY = heroY + data.radius * Math.sin(drone.angle);

    const { sx, sy } = worldToScreen(droneWorldX, droneWorldY);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -40 || screenX > CANVAS_W + 40 || screenY < -40 || screenY > CANVAS_H + 40) continue;

    // Draw without rotation — sprite stays vertical
    builder.pushTranslate({ x: screenX, y: screenY });
    builder.drawRect(droneBrush, null, {
      x: -halfSize,
      y: -halfSize,
      width: DRONE_SPRITE_SIZE,
      height: DRONE_SPRITE_SIZE,
    });
    builder.pop(); // translate
  }
}

/** Draw drone projectiles on the DrawingSurface. */
export function drawDroneProjectiles(
  builder: DrawingCommandsBuilder,
  projectiles: DroneProjectileState[],
  camera: CameraState,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const halfSize = DRONE_PROJ_SIZE_PX / 2;
  const glowHalf = halfSize + 3;

  for (const p of projectiles) {
    const { sx, sy } = worldToScreen(p.x, p.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -20 || screenX > CANVAS_W + 20 || screenY < -20 || screenY > CANVAS_H + 20) continue;

    // Glow ring (behind)
    builder.drawEllipse(null, projGlowPen, { x: screenX, y: screenY }, { x: glowHalf, y: glowHalf });
    // Filled core
    builder.drawEllipse(projFillBrush, null, { x: screenX, y: screenY }, { x: halfSize, y: halfSize });
  }
}
