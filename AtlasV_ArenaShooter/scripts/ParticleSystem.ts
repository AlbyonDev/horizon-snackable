// Arena Vermin — Particle System (Milestone 2)
// Now includes sprite-based impact/crit/splash effects.

import {
  DrawingCommandsBuilder,
  SolidBrush,
  Pen,
  Color,
  ImageBrush,
} from 'meta/worlds';
import type { Particle, ExpandingRing, SpriteEffect, MuzzleFlash, CameraState } from './Types';
import { SpriteEffectType } from './Types';
import { worldToScreen } from './IsoRenderer';
import { CANVAS_W, CANVAS_H } from './Constants';
import {
  PARTICLE_HIT_COUNT_MIN, PARTICLE_HIT_COUNT_MAX,
  PARTICLE_HIT_SIZE, PARTICLE_HIT_SPEED_MIN, PARTICLE_HIT_SPEED_MAX,
  PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX, PARTICLE_HIT_COLORS,
  PARTICLE_CRIT_COUNT_MIN, PARTICLE_CRIT_COUNT_MAX,
  PARTICLE_CRIT_SIZE, PARTICLE_CRIT_SPEED_MIN, PARTICLE_CRIT_SPEED_MAX,
  PARTICLE_CRIT_RING_COLOR, PARTICLE_CRIT_RING_START, PARTICLE_CRIT_RING_END,
  PARTICLE_CRIT_RING_DUR,
  PARTICLE_DEATH_COUNT_MIN, PARTICLE_DEATH_COUNT_MAX,
  PARTICLE_DEATH_SIZE, PARTICLE_DEATH_SPEED_MIN, PARTICLE_DEATH_SPEED_MAX,
  PARTICLE_DEATH_LIFE_MIN, PARTICLE_DEATH_LIFE_MAX,
  DUST_COUNT_PER_SPAWN, DUST_SIZE_MIN, DUST_SIZE_MAX,
  DUST_SPEED_MIN, DUST_SPEED_MAX,
  DUST_LIFE_MIN, DUST_LIFE_MAX,
  DUST_SPAWN_OFFSET, DUST_COLORS,
} from './Constants';
import { impactTexture, splashTexture, critiqueTexture } from './Assets';

// Pre-built image brushes for sprite effects
const impactBrush = new ImageBrush(impactTexture);
const splashBrush = new ImageBrush(splashTexture);
const critiqueBrush = new ImageBrush(critiqueTexture);

// Sprite effect constants
const SPRITE_EFFECT_IMPACT_DUR = 0.3;
const SPRITE_EFFECT_SPLASH_DUR = 0.4;
const SPRITE_EFFECT_CRIT_DUR = 0.5;
const SPRITE_EFFECT_SIZE = 40;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function randElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Spawn 4-6 hit sparks at a screen position.
 */
export function spawnHitSparks(particles: Particle[], x: number, y: number): void {
  const count = randInt(PARTICLE_HIT_COUNT_MIN, PARTICLE_HIT_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_HIT_SPEED_MIN, PARTICLE_HIT_SPEED_MAX);
    const life = randRange(PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_HIT_SIZE,
      colorHex: randElement(PARTICLE_HIT_COLORS),
    });
  }
}

/**
 * Spawn 8-12 crit sparks + 1 expanding ring.
 */
export function spawnCritSparks(
  particles: Particle[],
  rings: ExpandingRing[],
  x: number,
  y: number
): void {
  const count = randInt(PARTICLE_CRIT_COUNT_MIN, PARTICLE_CRIT_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_CRIT_SPEED_MIN, PARTICLE_CRIT_SPEED_MAX);
    const life = randRange(PARTICLE_HIT_LIFE_MIN, PARTICLE_HIT_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_CRIT_SIZE,
      colorHex: randElement(PARTICLE_HIT_COLORS),
    });
  }

  // Expanding ring
  rings.push({
    cx: x,
    cy: y,
    radius: PARTICLE_CRIT_RING_START,
    maxRadius: PARTICLE_CRIT_RING_END,
    age: 0,
    maxAge: PARTICLE_CRIT_RING_DUR,
    colorHex: PARTICLE_CRIT_RING_COLOR,
  });
}

/**
 * Spawn 6-8 death explosion particles.
 */
export function spawnDeathExplosion(
  particles: Particle[],
  x: number,
  y: number,
  colorHex: string
): void {
  const count = randInt(PARTICLE_DEATH_COUNT_MIN, PARTICLE_DEATH_COUNT_MAX);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(PARTICLE_DEATH_SPEED_MIN, PARTICLE_DEATH_SPEED_MAX);
    const life = randRange(PARTICLE_DEATH_LIFE_MIN, PARTICLE_DEATH_LIFE_MAX);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: PARTICLE_DEATH_SIZE,
      colorHex,
    });
  }
}

/**
 * Spawn 1-2 dust trail particles behind the hero while moving.
 * Particles spawn offset behind the hero (opposite to velocity direction)
 * with slight random spread and slow upward drift.
 */
export function spawnDustTrail(
  particles: Particle[],
  screenX: number,
  screenY: number,
  heroVx: number,
  heroVy: number
): void {
  // Compute offset direction (opposite of velocity)
  const speed = Math.sqrt(heroVx * heroVx + heroVy * heroVy);
  let offsetDirX = 0;
  let offsetDirY = 0;
  if (speed > 0.001) {
    offsetDirX = -heroVx / speed;
    offsetDirY = -heroVy / speed;
  }

  for (let i = 0; i < DUST_COUNT_PER_SPAWN; i++) {
    // Spawn position: behind hero with some random spread
    const spreadAngle = (Math.random() - 0.5) * 1.2; // ~±35 degrees spread
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const rotDirX = offsetDirX * cos - offsetDirY * sin;
    const rotDirY = offsetDirX * sin + offsetDirY * cos;

    const spawnX = screenX + rotDirX * DUST_SPAWN_OFFSET + (Math.random() - 0.5) * 6;
    const spawnY = screenY + rotDirY * DUST_SPAWN_OFFSET + (Math.random() - 0.5) * 6;

    // Velocity: slight upward drift + small outward push
    const driftSpeed = randRange(DUST_SPEED_MIN, DUST_SPEED_MAX);
    const vx = rotDirX * driftSpeed * 0.3 + (Math.random() - 0.5) * 10;
    const vy = -driftSpeed * 0.7 + (Math.random() - 0.5) * 8; // Mostly upward (negative Y)

    const life = randRange(DUST_LIFE_MIN, DUST_LIFE_MAX);
    const size = randRange(DUST_SIZE_MIN, DUST_SIZE_MAX);

    particles.push({
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      life,
      maxLife: life,
      size,
      colorHex: randElement(DUST_COLORS),
    });
  }
}

// === Sprite-based impact effects ===

/** Spawn an impact sprite effect at the given screen position. */
export function spawnImpactEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_IMPACT_DUR,
    type: SpriteEffectType.Impact,
    scale: 0.8 + Math.random() * 0.4,
    rotation: Math.random() * 360,
  });
}

/** Spawn a splash sprite effect (for AoE/death). */
export function spawnSplashEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_SPLASH_DUR,
    type: SpriteEffectType.Splash,
    scale: 1.0 + Math.random() * 0.3,
    rotation: Math.random() * 360,
  });
}

/** Spawn a critique (crit) sprite effect. */
export function spawnCritiqueEffect(effects: SpriteEffect[], x: number, y: number): void {
  effects.push({
    x, y,
    age: 0,
    maxAge: SPRITE_EFFECT_CRIT_DUR,
    type: SpriteEffectType.Critique,
    scale: 1.2 + Math.random() * 0.3,
    rotation: -15 + Math.random() * 30,
  });
}

// === Muzzle flashes ===
//
// Short-lived burst sprite drawn at the firing position. We reuse the existing
// impact texture as a generic burst shape — sprites stay parallel to the screen
// (no rotation) per project art direction. The flash scales up briefly then
// fades; an inner additive disc is drawn on top to give it some pop.
const MUZZLE_FLASH_DUR = 0.08; // seconds
const MUZZLE_FLASH_BASE_SIZE = 26; // px at scale=1

/** Spawn a muzzle flash at a world position. */
export function spawnMuzzleFlash(
  flashes: MuzzleFlash[],
  worldX: number,
  worldY: number,
  scale: number = 1,
  colorHex: string = '#FFE070'
): void {
  flashes.push({
    x: worldX,
    y: worldY,
    age: 0,
    maxAge: MUZZLE_FLASH_DUR,
    scale,
    colorHex,
  });
}

/** Tick muzzle flashes, removing expired ones. */
export function updateMuzzleFlashes(flashes: MuzzleFlash[], dt: number): void {
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].age += dt;
    if (flashes[i].age >= flashes[i].maxAge) {
      flashes.splice(i, 1);
    }
  }
}

/** Draw muzzle flashes (no rotation; sprites stay parallel to the screen). */
export function drawMuzzleFlashes(
  builder: DrawingCommandsBuilder,
  flashes: MuzzleFlash[],
  camera: CameraState
): void {
  const screenCX = CANVAS_W / 2;
  const screenCY = CANVAS_H / 2;

  for (const f of flashes) {
    const t = f.age / f.maxAge; // 0→1
    // Scale grows then settles; alpha fades fast.
    const animScale = f.scale * (0.7 + 0.6 * (1 - (1 - t) * (1 - t)));
    const alpha = (1 - t) * (1 - t);
    const size = MUZZLE_FLASH_BASE_SIZE * animScale;
    const innerSize = size * 0.55;

    const { sx, sy } = worldToScreen(f.x, f.y);
    const screenX = sx - camera.offsetX + screenCX;
    const screenY = sy - camera.offsetY + screenCY;

    if (screenX < -40 || screenX > CANVAS_W + 40 || screenY < -40 || screenY > CANVAS_H + 40) continue;

    // Outer burst: tinted impact sprite (already a radial flare). We can't
    // tint the ImageBrush directly, so we layer a colored disc behind it for
    // pop, then the impact sprite on top for shape.
    const outerColor = Color.fromHex(f.colorHex);
    const outerBrush = new SolidBrush(new Color(outerColor.r, outerColor.g, outerColor.b, alpha * 0.9));
    builder.drawEllipse(outerBrush, null, { x: screenX, y: screenY }, { x: size * 0.45, y: size * 0.45 });

    // Bright white core
    const coreBrush = new SolidBrush(new Color(1, 1, 1, alpha));
    builder.drawEllipse(coreBrush, null, { x: screenX, y: screenY }, { x: innerSize * 0.4, y: innerSize * 0.4 });
  }
}

/** Update sprite effects, removing expired ones. */
export function updateSpriteEffects(effects: SpriteEffect[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].age += dt;
    if (effects[i].age >= effects[i].maxAge) {
      effects.splice(i, 1);
    }
  }
}

/** Draw sprite effects with scale-up and fade-out animation. */
export function drawSpriteEffects(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    const t = e.age / e.maxAge; // 0→1 progress
    const alpha = 1 - t; // fade out
    // Scale up slightly over time
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;

    let brush: ImageBrush;
    switch (e.type) {
      case SpriteEffectType.Critique: brush = critiqueBrush; break;
      case SpriteEffectType.Splash: brush = splashBrush; break;
      default: brush = impactBrush; break;
    }

    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    // Apply alpha via opacity (use a fading rect approach)
    // DrawingSurface doesn't have per-draw opacity, so we render at full and rely on texture alpha
    builder.drawRect(brush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop(); // scale
    builder.pop(); // rotate
    builder.pop(); // translate
  }
}

/** Draw only non-crit sprite effects (Impact, Splash). */
export function drawSpriteEffectsBase(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    if (e.type === SpriteEffectType.Critique) continue;
    const t = e.age / e.maxAge;
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;
    let brush: ImageBrush;
    switch (e.type) {
      case SpriteEffectType.Splash: brush = splashBrush; break;
      default: brush = impactBrush; break;
    }
    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    builder.drawRect(brush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop();
    builder.pop();
    builder.pop();
  }
}

/** Draw only Critique sprite effects (rendered on overlay layer). */
export function drawSpriteEffectsCrit(
  builder: DrawingCommandsBuilder,
  effects: SpriteEffect[]
): void {
  for (const e of effects) {
    if (e.type !== SpriteEffectType.Critique) continue;
    const t = e.age / e.maxAge;
    const animScale = e.scale * (0.6 + 0.4 * t);
    const size = SPRITE_EFFECT_SIZE * animScale;
    builder.pushTranslate({x: e.x, y: e.y});
    builder.pushRotate(e.rotation, {x: 0, y: 0});
    builder.pushScale({x: 1, y: 1}, {x: 0, y: 0});
    builder.drawRect(critiqueBrush, null, {x: -size / 2, y: -size / 2, width: size, height: size});
    builder.pop();
    builder.pop();
    builder.pop();
  }
}

/**
 * Update all particles and rings. Frame-rate independent.
 */
export function updateParticles(
  particles: Particle[],
  rings: ExpandingRing[],
  dt: number
): void {
  // Update particles (iterate backwards for safe removal)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Update expanding rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.age += dt;
    const t = r.age / r.maxAge;
    r.radius = r.maxRadius * t + PARTICLE_CRIT_RING_START * (1 - t);
    if (r.age >= r.maxAge) {
      rings.splice(i, 1);
    }
  }
}

/**
 * Draw all particles and rings.
 */
export function drawParticles(
  builder: DrawingCommandsBuilder,
  particles: Particle[],
  rings: ExpandingRing[]
): void {
  // Draw rings
  for (const r of rings) {
    const alpha = 1 - (r.age / r.maxAge);
    const color = Color.fromHex(r.colorHex);
    const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha));
    const pen = new Pen(brush, 2);
    builder.drawEllipse(null, pen, {x: r.cx, y: r.cy}, {x: r.radius, y: r.radius});
  }

  // Draw particles
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const color = Color.fromHex(p.colorHex);
    const brush = new SolidBrush(new Color(color.r, color.g, color.b, alpha));
    builder.drawRect(brush, null, {
      x: p.x - p.size / 2,
      y: p.y - p.size / 2,
      width: p.size,
      height: p.size,
    });
  }
}
