/**
 * ParticleSystem
 *
 * Owns the lifecycle of board burst particles: spawning, gravity-driven
 * physics, expiration, and rendering. Previously this logic was split
 * between DestructionHandler (spawn + update) and BoardRenderer (draw).
 */
import { Color, Vec2 } from 'meta/platform_api';
import { DrawingCommandsBuilder, SolidBrush } from 'meta/custom_ui';

import { GemType } from './Types';
import type { Gem, Particle } from './Types';
import { GEM_RENDER_SIZE } from './Constants';
import {
  PARTICLES_PER_GEM,
  PARTICLE_GRAVITY,
  PARTICLE_MIN_SPEED,
  PARTICLE_SPEED_RANGE,
  PARTICLE_MIN_LIFE,
  PARTICLE_LIFE_RANGE,
  PARTICLE_MAX_LIFE,
  PARTICLE_MIN_SIZE,
  PARTICLE_SIZE_RANGE,
} from './AnimationConfig';

const GEM_PARTICLE_COLORS: Record<GemType, string> = {
  [GemType.Red]:    '#FF4444',
  [GemType.Blue]:   '#4488FF',
  [GemType.Green]:  '#44FF66',
  [GemType.Yellow]: '#FFDD44',
  [GemType.Purple]: '#BB44FF',
};

export class ParticleSystem {
  private _particles: Particle[] = [];

  get particles(): Particle[] { return this._particles; }
  get count(): number { return this._particles.length; }
  hasActive(): boolean { return this._particles.length > 0; }

  /** Burst PARTICLES_PER_GEM particles outward from a destroyed gem's centre. */
  spawnBurst(gem: Gem): void {
    const cx = gem.visualX + GEM_RENDER_SIZE / 2;
    const cy = gem.visualY + GEM_RENDER_SIZE / 2;
    const color = GEM_PARTICLE_COLORS[gem.type];

    for (let i = 0; i < PARTICLES_PER_GEM; i++) {
      const angle = (i / PARTICLES_PER_GEM) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const speed = PARTICLE_MIN_SPEED + Math.random() * PARTICLE_SPEED_RANGE;
      this._particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: PARTICLE_MIN_LIFE + Math.random() * PARTICLE_LIFE_RANGE,
        maxLife: PARTICLE_MAX_LIFE,
        size: PARTICLE_MIN_SIZE + Math.random() * PARTICLE_SIZE_RANGE,
        color,
      });
    }
  }

  /** Tick physics + expire dead particles. */
  update(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += PARTICLE_GRAVITY * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this._particles.splice(i, 1);
      }
    }
  }

  /** Render all live particles. */
  render(builder: DrawingCommandsBuilder): void {
    ParticleSystem.renderList(builder, this._particles);
  }

  /** Render an arbitrary particle list — used by renderers that hold only a reference. */
  static renderList(builder: DrawingCommandsBuilder, particles: Particle[]): void {
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const size = p.size * lifeRatio;
      if (size <= 0) continue;
      const color = Color.fromHex(p.color);
      const brush = new SolidBrush(new Color(color.r, color.g, color.b, lifeRatio));
      builder.drawEllipse(brush, null, new Vec2(p.x, p.y), new Vec2(size, size));
    }
  }

  clear(): void {
    this._particles.length = 0;
  }
}
