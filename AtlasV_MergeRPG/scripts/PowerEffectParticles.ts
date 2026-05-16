/**
 * PowerEffectParticles.ts
 *
 * In-game-zone particle/projectile effects that play during power execution.
 * Renders projectiles, explosions, sparkles, shields, arrows, and orbs
 * directly in the combat area using DrawingSurface API.
 *
 * Component Attachment: N/A (utility class used by GameComponent)
 * Component Networking: Local (visual-only)
 * Component Ownership: N/A
 */

import {
  DrawingCommandsBuilder,
  SolidBrush,
  RadialGradientBrush,
  Pen,
} from 'meta/custom_ui';
import { Color, Vec2, Rectangle } from 'meta/platform_api';

import { PowerEffectType } from './PowerTypes';

// ===== Types =====

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  rotSpeed: number;
  /** For projectiles: target x */
  tx: number;
  /** For projectiles: target y */
  ty: number;
  /** For projectiles: start x */
  sx: number;
  /** For projectiles: start y */
  sy: number;
}

interface PowerEffect {
  effectType: PowerEffectType;
  particles: Particle[];
  elapsed: number;
  duration: number;
  /** Screen shake intensity (decays over time) */
  shakeIntensity: number;
  /** Source position (hero center) */
  sourceX: number;
  sourceY: number;
  /** Target positions (enemy centers) */
  targets: Array<{ x: number; y: number }>;
}

// ===== Config =====

const EFFECT_DURATIONS: Record<number, number> = {
  [PowerEffectType.DAMAGE_DIRECT]: 0.6,
  [PowerEffectType.DAMAGE_BURST]: 0.7,
  [PowerEffectType.DAMAGE_DOT]: 0.8,
  [PowerEffectType.HEAL]: 0.7,
  [PowerEffectType.SHIELD]: 0.7,
  [PowerEffectType.BUFF_ATK]: 0.6,
  [PowerEffectType.DEBUFF_ATK]: 0.6,
  [PowerEffectType.MANA_BOOST]: 0.6,
};

const EFFECT_COLORS: Record<number, { primary: string; secondary: string }> = {
  [PowerEffectType.DAMAGE_DIRECT]: { primary: '#FF4444', secondary: '#FFAA00' },
  [PowerEffectType.DAMAGE_BURST]: { primary: '#FF6600', secondary: '#FFDD00' },
  [PowerEffectType.DAMAGE_DOT]: { primary: '#88FF00', secondary: '#00CC44' },
  [PowerEffectType.HEAL]: { primary: '#FFD700', secondary: '#FFFFFF' },
  [PowerEffectType.SHIELD]: { primary: '#4488FF', secondary: '#AADDFF' },
  [PowerEffectType.BUFF_ATK]: { primary: '#FF4444', secondary: '#FFAA88' },
  [PowerEffectType.DEBUFF_ATK]: { primary: '#AA44FF', secondary: '#6600CC' },
  [PowerEffectType.MANA_BOOST]: { primary: '#00CCFF', secondary: '#0066FF' },
};

// ===== Particle Spawners =====

function spawnDamageDirectParticles(effect: PowerEffect): void {
  const { sourceX, sourceY, targets } = effect;
  const target = targets[0] ?? { x: sourceX + 200, y: sourceY };

  // Main projectile (large, fast lerp)
  effect.particles.push({
    x: sourceX, y: sourceY,
    vx: 0, vy: 0,
    life: 0.45, maxLife: 0.45,
    size: 14, angle: 0, rotSpeed: 300,
    tx: target.x, ty: target.y,
    sx: sourceX, sy: sourceY,
  });

  // Trail particles behind projectile
  for (let i = 0; i < 8; i++) {
    const delay = i * 0.03;
    effect.particles.push({
      x: sourceX, y: sourceY,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.45 - delay, maxLife: 0.45,
      size: 5 + Math.random() * 4,
      angle: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 200,
      tx: target.x, ty: target.y,
      sx: sourceX + (Math.random() - 0.5) * 10,
      sy: sourceY + (Math.random() - 0.5) * 10,
    });
  }
}

function spawnDamageBurstParticles(effect: PowerEffect): void {
  const { targets } = effect;
  // Explosion particles centered on each target
  for (const tgt of targets) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      effect.particles.push({
        x: tgt.x, y: tgt.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 4 + Math.random() * 6,
        angle: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 400,
        tx: 0, ty: 0, sx: 0, sy: 0,
      });
    }
  }
}

function spawnDamageDotParticles(effect: PowerEffect): void {
  const target = effect.targets[0] ?? { x: effect.sourceX + 150, y: effect.sourceY };
  // Swirling poison cloud above target
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const radius = 20 + Math.random() * 25;
    effect.particles.push({
      x: target.x + Math.cos(angle) * radius,
      y: target.y - 30 + Math.sin(angle) * radius * 0.5,
      vx: Math.cos(angle + Math.PI / 2) * (30 + Math.random() * 20),
      vy: -10 - Math.random() * 20,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 6 + Math.random() * 5,
      angle: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 100,
      tx: 0, ty: 0, sx: 0, sy: 0,
    });
  }
}

function spawnHealParticles(effect: PowerEffect): void {
  // Golden sparkles raining down on source (hero)
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  for (let i = 0; i < 12; i++) {
    effect.particles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy - 60 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 20,
      vy: 40 + Math.random() * 60,
      life: 0.5 + Math.random() * 0.2,
      maxLife: 0.7,
      size: 3 + Math.random() * 4,
      angle: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 300,
      tx: 0, ty: 0, sx: 0, sy: 0,
    });
  }
}

function spawnShieldParticles(effect: PowerEffect): void {
  // Hexagonal shield segments appearing around hero
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const radius = 40;
    effect.particles.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      life: 0.6, maxLife: 0.7,
      size: 16,
      angle: angle * (180 / Math.PI),
      rotSpeed: 30,
      tx: 0, ty: 0, sx: 0, sy: 0,
    });
  }
}

function spawnBuffAtkParticles(effect: PowerEffect): void {
  // Upward arrows floating above hero
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  for (let i = 0; i < 8; i++) {
    effect.particles.push({
      x: cx + (Math.random() - 0.5) * 50,
      y: cy + 10,
      vx: (Math.random() - 0.5) * 15,
      vy: -(80 + Math.random() * 60),
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.6,
      size: 8 + Math.random() * 4,
      angle: 0, rotSpeed: 0,
      tx: 0, ty: 0, sx: 0, sy: 0,
    });
  }
}

function spawnDebuffAtkParticles(effect: PowerEffect): void {
  // Downward arrows above enemy target
  const target = effect.targets[0] ?? { x: effect.sourceX + 150, y: effect.sourceY };
  for (let i = 0; i < 8; i++) {
    effect.particles.push({
      x: target.x + (Math.random() - 0.5) * 50,
      y: target.y - 60 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 15,
      vy: 60 + Math.random() * 50,
      life: 0.4 + Math.random() * 0.2,
      maxLife: 0.6,
      size: 8 + Math.random() * 4,
      angle: 180, rotSpeed: 0,
      tx: 0, ty: 0, sx: 0, sy: 0,
    });
  }
}

function spawnManaBoostParticles(effect: PowerEffect): void {
  // Colored orbs spiral inward to hero
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const dist = 60 + Math.random() * 30;
    effect.particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * (50 + Math.random() * 30),
      vy: -Math.sin(angle) * (50 + Math.random() * 30),
      life: 0.5 + Math.random() * 0.1,
      maxLife: 0.6,
      size: 6 + Math.random() * 5,
      angle: 0, rotSpeed: 200,
      tx: cx, ty: cy, sx: 0, sy: 0,
    });
  }
}

// ===== Main System =====

export class PowerEffectParticles {
  private effects: PowerEffect[] = [];
  /** Screen shake offset for the current frame */
  public shakeX: number = 0;
  public shakeY: number = 0;

  get isActive(): boolean {
    return this.effects.length > 0;
  }

  /**
   * Trigger a power effect animation.
   * @param effectType - Which of the 8 power types
   * @param sourceX - Hero center X
   * @param sourceY - Hero center Y
   * @param targets - Array of enemy/ally positions to target
   */
  trigger(
    effectType: PowerEffectType,
    sourceX: number,
    sourceY: number,
    targets: Array<{ x: number; y: number }>,
  ): void {
    const duration = EFFECT_DURATIONS[effectType] ?? 0.6;
    const effect: PowerEffect = {
      effectType,
      particles: [],
      elapsed: 0,
      duration,
      shakeIntensity: 0,
      sourceX,
      sourceY,
      targets,
    };

    // Spawn particles based on type
    switch (effectType) {
      case PowerEffectType.DAMAGE_DIRECT:
        spawnDamageDirectParticles(effect);
        effect.shakeIntensity = 6;
        break;
      case PowerEffectType.DAMAGE_BURST:
        spawnDamageBurstParticles(effect);
        effect.shakeIntensity = 10;
        break;
      case PowerEffectType.DAMAGE_DOT:
        spawnDamageDotParticles(effect);
        break;
      case PowerEffectType.HEAL:
        spawnHealParticles(effect);
        break;
      case PowerEffectType.SHIELD:
        spawnShieldParticles(effect);
        break;
      case PowerEffectType.BUFF_ATK:
        spawnBuffAtkParticles(effect);
        break;
      case PowerEffectType.DEBUFF_ATK:
        spawnDebuffAtkParticles(effect);
        break;
      case PowerEffectType.MANA_BOOST:
        spawnManaBoostParticles(effect);
        break;
    }

    this.effects.push(effect);
  }

  /** Update all active effects. Call each frame with delta time in seconds. */
  update(dt: number): void {
    this.shakeX = 0;
    this.shakeY = 0;

    for (let ei = this.effects.length - 1; ei >= 0; ei--) {
      const effect = this.effects[ei];
      effect.elapsed += dt;

      // Screen shake decay
      if (effect.shakeIntensity > 0) {
        const shakeDecay = 0.85;
        effect.shakeIntensity *= Math.pow(shakeDecay, dt * 60);
        if (effect.shakeIntensity < 0.3) effect.shakeIntensity = 0;
        this.shakeX += (Math.random() - 0.5) * effect.shakeIntensity * 2;
        this.shakeY += (Math.random() - 0.5) * effect.shakeIntensity * 2;
      }

      // Update particles
      for (let pi = effect.particles.length - 1; pi >= 0; pi--) {
        const p = effect.particles[pi];
        p.life -= dt;
        if (p.life <= 0) {
          effect.particles.splice(pi, 1);
          continue;
        }

        // Projectile-type: lerp position from source to target
        if (effect.effectType === PowerEffectType.DAMAGE_DIRECT && p.maxLife > 0.4) {
          const progress = 1 - (p.life / p.maxLife);
          const ease = progress * progress * (3 - 2 * progress); // smoothstep
          p.x = p.sx + (p.tx - p.sx) * ease;
          p.y = p.sy + (p.ty - p.sy) * ease;
          // Trigger shake at impact (when projectile arrives)
          if (progress > 0.85 && effect.shakeIntensity < 4) {
            effect.shakeIntensity = 6;
          }
        } else {
          // Standard velocity-based movement
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        p.angle += p.rotSpeed * dt;
      }

      // Remove completed effects
      if (effect.elapsed >= effect.duration && effect.particles.length === 0) {
        this.effects.splice(ei, 1);
      }
    }
  }

  /** Render all active effects using the DrawingSurface builder. */
  render(builder: DrawingCommandsBuilder): void {
    for (const effect of this.effects) {
      const colors = EFFECT_COLORS[effect.effectType] ?? EFFECT_COLORS[0];
      const pColor = Color.fromHex(colors.primary);
      const sColor = Color.fromHex(colors.secondary);

      for (const p of effect.particles) {
        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.min(1, lifeRatio * 1.5); // Fade out near end
        const size = p.size * (0.4 + lifeRatio * 0.6);

        // Blend colors over lifetime
        const r = pColor.r + (sColor.r - pColor.r) * (1 - lifeRatio);
        const g = pColor.g + (sColor.g - pColor.g) * (1 - lifeRatio);
        const b = pColor.b + (sColor.b - pColor.b) * (1 - lifeRatio);

        switch (effect.effectType) {
          case PowerEffectType.DAMAGE_DIRECT:
            this.drawProjectileParticle(builder, p, r, g, b, alpha, size, lifeRatio);
            break;
          case PowerEffectType.DAMAGE_BURST:
            this.drawExplosionParticle(builder, p, r, g, b, alpha, size);
            break;
          case PowerEffectType.DAMAGE_DOT:
            this.drawPoisonParticle(builder, p, r, g, b, alpha, size);
            break;
          case PowerEffectType.HEAL:
            this.drawSparkleParticle(builder, p, r, g, b, alpha, size);
            break;
          case PowerEffectType.SHIELD:
            this.drawHexagonParticle(builder, p, r, g, b, alpha, size);
            break;
          case PowerEffectType.BUFF_ATK:
            this.drawArrowParticle(builder, p, r, g, b, alpha, size, true);
            break;
          case PowerEffectType.DEBUFF_ATK:
            this.drawArrowParticle(builder, p, r, g, b, alpha, size, false);
            break;
          case PowerEffectType.MANA_BOOST:
            this.drawOrbParticle(builder, p, r, g, b, alpha, size, lifeRatio);
            break;
        }
      }
    }
  }

  /** Reset all effects (e.g. on game restart) */
  reset(): void {
    this.effects = [];
    this.shakeX = 0;
    this.shakeY = 0;
  }

  // ===== Particle Renderers =====

  private drawProjectileParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number, lifeRatio: number,
  ): void {
    // Main projectile is larger, trail particles are smaller
    const isMain = p.maxLife > 0.4 && p.size > 10;
    if (isMain) {
      // Glowing orb with radial gradient
      const glow = new RadialGradientBrush(
        new Vec2(p.x, p.y),
        new Vec2(size * 1.5, size * 1.5),
        [
          { offset: 0, color: new Color(1, 1, 1, alpha * 0.9) },
          { offset: 0.4, color: new Color(r, g, b, alpha * 0.8) },
          { offset: 1, color: new Color(r, g, b, 0) },
        ],
      );
      builder.drawEllipse(glow, null, new Vec2(p.x, p.y), new Vec2(size * 1.5, size * 1.5));
    } else {
      // Trail dot
      const brush = new SolidBrush(new Color(r, g, b, alpha * 0.7));
      builder.drawEllipse(brush, null, new Vec2(p.x, p.y), new Vec2(size, size));
    }
  }

  private drawExplosionParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
  ): void {
    // Diamond-shaped explosion shards
    builder.pushTranslate(new Vec2(p.x, p.y));
    builder.pushRotate(p.angle, new Vec2(0, 0));
    const brush = new SolidBrush(new Color(r, g, b, alpha));
    const diamond = `M 0 ${-size} L ${size * 0.5} 0 L 0 ${size} L ${-size * 0.5} 0 Z`;
    builder.drawPath(brush, null, diamond);
    builder.pop();
    builder.pop();
  }

  private drawPoisonParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
  ): void {
    // Soft circular cloud puff
    const brush = new SolidBrush(new Color(r, g, b, alpha * 0.6));
    builder.drawEllipse(brush, null, new Vec2(p.x, p.y), new Vec2(size, size * 0.8));
  }

  private drawSparkleParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
  ): void {
    // 4-point star sparkle
    builder.pushTranslate(new Vec2(p.x, p.y));
    builder.pushRotate(p.angle, new Vec2(0, 0));
    const brush = new SolidBrush(new Color(r, g, b, alpha));
    const s = size;
    const star = `M 0 ${-s} L ${s * 0.25} ${-s * 0.25} L ${s} 0 L ${s * 0.25} ${s * 0.25} L 0 ${s} L ${-s * 0.25} ${s * 0.25} L ${-s} 0 L ${-s * 0.25} ${-s * 0.25} Z`;
    builder.drawPath(brush, null, star);
    builder.pop();
    builder.pop();
  }

  private drawHexagonParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
  ): void {
    // Hexagon outline (shield segments)
    builder.pushTranslate(new Vec2(p.x, p.y));
    builder.pushRotate(p.angle, new Vec2(0, 0));
    const outlineBrush = new SolidBrush(new Color(r, g, b, alpha));
    const pen = new Pen(outlineBrush, 2.5);
    const s = size;
    const hex = `M ${s} 0 L ${s * 0.5} ${s * 0.87} L ${-s * 0.5} ${s * 0.87} L ${-s} 0 L ${-s * 0.5} ${-s * 0.87} L ${s * 0.5} ${-s * 0.87} Z`;
    const fillBrush = new SolidBrush(new Color(r, g, b, alpha * 0.2));
    builder.drawPath(fillBrush, pen, hex);
    builder.pop();
    builder.pop();
  }

  private drawArrowParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
    isUp: boolean,
  ): void {
    builder.pushTranslate(new Vec2(p.x, p.y));
    if (!isUp) {
      builder.pushRotate(180, new Vec2(0, 0));
    }
    const brush = new SolidBrush(new Color(r, g, b, alpha));
    const s = size;
    // Arrow pointing up
    const arrow = `M 0 ${-s} L ${s * 0.6} ${-s * 0.2} L ${s * 0.25} ${-s * 0.2} L ${s * 0.25} ${s} L ${-s * 0.25} ${s} L ${-s * 0.25} ${-s * 0.2} L ${-s * 0.6} ${-s * 0.2} Z`;
    builder.drawPath(brush, null, arrow);
    if (!isUp) {
      builder.pop();
    }
    builder.pop();
  }

  private drawOrbParticle(
    builder: DrawingCommandsBuilder, p: Particle,
    r: number, g: number, b: number, alpha: number, size: number,
    lifeRatio: number,
  ): void {
    // Pulsing orb that scales with life
    const pulse = 1 + Math.sin(p.angle * 0.05) * 0.3;
    const finalSize = size * pulse;
    const glow = new RadialGradientBrush(
      new Vec2(p.x, p.y),
      new Vec2(finalSize, finalSize),
      [
        { offset: 0, color: new Color(1, 1, 1, alpha * 0.6) },
        { offset: 0.5, color: new Color(r, g, b, alpha * 0.8) },
        { offset: 1, color: new Color(r, g, b, 0) },
      ],
    );
    builder.drawEllipse(glow, null, new Vec2(p.x, p.y), new Vec2(finalSize, finalSize));
  }
}
