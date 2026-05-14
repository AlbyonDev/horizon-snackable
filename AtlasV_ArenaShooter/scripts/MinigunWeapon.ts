// Arena Vermin — Minigun Weapon System (pure logic module)
// Handles rapid-fire projectiles aimed at the nearest enemy.
// Higher levels fire multiple bullets with angular spread.

import type { DrawingCommandsBuilder } from 'meta/worlds';
import { ImageBrush } from 'meta/worlds';
import type { CameraState, EnemyState, MinigunState, MinigunBulletState, MuzzleFlash } from './Types';
import { spawnMuzzleFlash } from './ParticleSystem';
import { worldToScreen } from './IsoRenderer';
import {
  MINIGUN_LEVELS, MINIGUN_BULLET_SPEED, MINIGUN_BULLET_MAX_AGE,
  MINIGUN_BULLET_RADIUS,
  CANVAS_W, CANVAS_H,
  HERO_MINIGUN_MUZZLE_DX, HERO_MINIGUN_MUZZLE_DY,
  HERO_MINIGUN_RECOIL_DUR, HERO_MINIGUN_RECOIL_PX,
  HERO_MINIGUN_W, HERO_MINIGUN_H,
  HERO_MINIGUN_HAND_OFFSET_X, HERO_MINIGUN_HAND_OFFSET_Y,
} from './Constants';
import { cartoucheTexture, heroWeapon02Texture } from './Assets';

export interface MinigunHitResult {
  enemyIndex: number;
  damage: number;
}

/** Initialize minigun state for the current level. */
export function initMinigun(level: number): MinigunState {
  return { lastFireTime: -999, recoilTimer: 0 };
}

/** Update minigun: fire bullets at nearest enemy based on fire rate and level.
 *  Spawns muzzle flashes and bullets from the gun's visible muzzle position
 *  (offset from hero feet by HERO_MINIGUN_MUZZLE_DX/DY in facing direction). */
export function updateMinigun(
  state: MinigunState,
  heroX: number,
  heroY: number,
  heroFacing: number,
  enemies: EnemyState[],
  dt: number,
  level: number,
  gameTime: number,
  bullets: MinigunBulletState[],
  muzzleFlashes: MuzzleFlash[],
): void {
  if (level <= 0) return;
  if (state.recoilTimer > 0) {
    state.recoilTimer = Math.max(0, state.recoilTimer - dt);
  }

  const data = MINIGUN_LEVELS[level - 1];
  const fireInterval = 1.0 / data.fireRate;
  const fireRangeSq = data.range * data.range;

  // Check fire cooldown
  if (gameTime - state.lastFireTime < fireInterval) return;

  // Find nearest alive enemy within range
  let nearestIdx = -1;
  let nearestDistSq = fireRangeSq;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isDead || enemy.isSpawning) continue;
    const dx = enemy.x - heroX;
    const dy = enemy.y - heroY;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestIdx = i;
    }
  }

  // Fire at nearest enemy
  if (nearestIdx >= 0) {
    const target = enemies[nearestIdx];
    const dx = target.x - heroX;
    const dy = target.y - heroY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0) return;

    const baseDirX = dx / dist;
    const baseDirY = dy / dist;

    // Bullets and muzzle flash spawn from the gun's visible muzzle, not the
    // hero's feet. The minigun is on the off-hand side, so muzzle X is in
    // the facing direction (hero turns to face target via heroFacing).
    const muzzleX = heroX + HERO_MINIGUN_MUZZLE_DX * heroFacing;
    const muzzleY = heroY + HERO_MINIGUN_MUZZLE_DY;

    if (data.bulletCount === 1) {
      // Single bullet, no spread
      bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: baseDirX * MINIGUN_BULLET_SPEED,
        vy: baseDirY * MINIGUN_BULLET_SPEED,
        age: 0,
        damage: data.damage,
      });
    } else {
      // Multiple bullets with angular spread
      const spreadRad = (data.spreadDeg * Math.PI) / 180;
      const baseAngle = Math.atan2(baseDirY, baseDirX);

      for (let b = 0; b < data.bulletCount; b++) {
        const t = data.bulletCount === 1 ? 0 : (b / (data.bulletCount - 1)) * 2 - 1;
        const angle = baseAngle + t * spreadRad;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        bullets.push({
          x: muzzleX,
          y: muzzleY,
          vx: dirX * MINIGUN_BULLET_SPEED,
          vy: dirY * MINIGUN_BULLET_SPEED,
          age: 0,
          damage: data.damage,
        });
      }
    }

    spawnMuzzleFlash(muzzleFlashes, muzzleX, muzzleY, 1.0, '#FFE070');
    state.recoilTimer = HERO_MINIGUN_RECOIL_DUR;
    state.lastFireTime = gameTime;
  }
}

/** Update minigun bullets: move, check collision with enemies, remove expired. Returns hits. */
export function updateMinigunBullets(
  bullets: MinigunBulletState[],
  dt: number,
  enemies: EnemyState[],
): MinigunHitResult[] {
  const hits: MinigunHitResult[] = [];

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.age += dt;

    // Remove if expired
    if (b.age >= MINIGUN_BULLET_MAX_AGE) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with enemies (circle-circle)
    let hit = false;
    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];
      if (enemy.isDead || enemy.isSpawning) continue;
      const enemyRadius = 0.5;
      const dx = b.x - enemy.x;
      const dy = b.y - enemy.y;
      const distSq = dx * dx + dy * dy;
      const hitDist = MINIGUN_BULLET_RADIUS + enemyRadius;
      if (distSq < hitDist * hitDist) {
        hits.push({ enemyIndex: e, damage: b.damage });
        hit = true;
        break;
      }
    }

    if (hit) {
      bullets.splice(i, 1);
    }
  }

  return hits;
}

// Pre-create bullet brush from cartouche sprite
const bulletBrush = new ImageBrush(cartoucheTexture);
// Hero minigun sprite brush — shares Weapon02 with the gunner mouse (the
// gunner-mouse alias in Assets.ts also points at heroWeapon02Texture).
const heroMinigunBrush = new ImageBrush(heroWeapon02Texture);

/** Draw the visible hero minigun sprite (no rotation; mirrors with facing).
 *  Anchored at the hero's off-hand offset, with a brief recoil kick when firing. */
export function drawHeroMinigun(
  builder: DrawingCommandsBuilder,
  state: MinigunState,
  heroX: number,
  heroY: number,
  heroFacing: number,
  camera: CameraState,
  level: number,
): void {
  if (level <= 0) return;

  const { sx, sy } = worldToScreen(heroX, heroY);
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  const screenX = sx - camera.offsetX + screenCX;
  const screenY = sy - camera.offsetY + screenCY;

  // Recoil: brief horizontal kick opposite to facing direction. We can't rotate
  // (per art direction), so we just translate the gun back a few pixels.
  let recoilX = 0;
  if (state.recoilTimer > 0) {
    const t = state.recoilTimer / HERO_MINIGUN_RECOIL_DUR; // 1→0
    recoilX = -HERO_MINIGUN_RECOIL_PX * t * heroFacing;
  }

  // Hand anchor mirrors with facing.
  const handX = screenX + HERO_MINIGUN_HAND_OFFSET_X * heroFacing + recoilX;
  const handY = screenY + HERO_MINIGUN_HAND_OFFSET_Y;

  // Cull off-screen
  if (handX < -60 || handX > CANVAS_W + 60 || handY < -60 || handY > CANVAS_H + 60) return;

  // Draw — mirror horizontally with facing using a scale push (no rotation).
  builder.pushTranslate({ x: handX, y: handY });
  builder.pushScale({ x: heroFacing, y: 1 }, { x: 0, y: 0 });
  builder.drawRect(heroMinigunBrush, null, {
    x: -HERO_MINIGUN_W / 2,
    y: -HERO_MINIGUN_H / 2,
    width: HERO_MINIGUN_W,
    height: HERO_MINIGUN_H,
  });
  builder.pop(); // scale
  builder.pop(); // translate
}

/** Draw minigun bullets on the DrawingSurface using cartouche sprite. */
export function drawMinigunBullets(
  builder: DrawingCommandsBuilder,
  bullets: MinigunBulletState[],
  camera: CameraState,
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;
  // Cartouche is a horizontal bullet sprite — render at natural orientation, no rotation
  const bulletW = 14;
  const bulletH = 7;

  for (const b of bullets) {
    const { sx, sy } = worldToScreen(b.x, b.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    // Cull off-screen
    if (screenX < -20 || screenX > CANVAS_W + 20 || screenY < -20 || screenY > CANVAS_H + 20) continue;

    // Draw cartouche sprite centered on bullet position, no rotation
    builder.drawRect(bulletBrush, null, {
      x: screenX - bulletW / 2,
      y: screenY - bulletH / 2,
      width: bulletW,
      height: bulletH,
    });
  }
}
