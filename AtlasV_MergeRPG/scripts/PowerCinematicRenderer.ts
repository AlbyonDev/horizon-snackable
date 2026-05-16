/**
 * PowerCinematicRenderer - Renders cinematic overlay for hero power animations.
 *
 * Draws on top of the normal game frame using the shared DrawingCommandsBuilder.
 * Must be called AFTER BoardRenderer.renderFrame() and BEFORE builder.build().
 *
 * Component Attachment: Helper class used by GameComponent (scene entity).
 * Component Networking: Not a component - plain class, local only.
 */

import {
  DrawingCommandsBuilder,
  SolidBrush,
  LinearGradientBrush,
  RadialGradientBrush,
  ImageBrush,
  Pen,
} from 'meta/custom_ui';
import { Color, Vec2, Rectangle } from 'meta/platform_api';

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Constants';
import { CinematicPhase, PowerAnimationSystem } from './PowerAnimationSystem';
import type { PowerVfxConfig, CinematicCasterBinding } from './PowerAnimationSystem';
import { PowerEffectType } from './PowerTypes';

// Particle for procedural VFX
interface CinematicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  rotSpeed: number;
}

export class PowerCinematicRenderer {
  private particles: CinematicParticle[] = [];
  private particlesSpawned: boolean = false;

  /** Reset state when a new animation starts */
  reset(): void {
    this.particles = [];
    this.particlesSpawned = false;
  }

  /**
   * Render the cinematic overlay. Call after normal game render.
   */
  render(builder: DrawingCommandsBuilder, animSystem: PowerAnimationSystem, dt: number): void {
    if (!animSystem.isActive) return;

    const state = animSystem.currentState;
    const { phase, phaseProgress: progress, caster, effectType } = state;
    const config = state.vfxConfig;

    switch (phase) {
      case CinematicPhase.Spotlight:
        this.renderSpotlight(builder, state.overlayAlpha, state.glowIntensity, caster, config);
        break;
      case CinematicPhase.Cinematic:
        this.renderCinematic(builder, state.cinematicAlpha, state.heroSpriteScale, caster, effectType, config, dt);
        break;
      case CinematicPhase.ReturnToNormal:
        // Dark overlay fades out so the board cross-fades back in.
        this.renderReturn(builder, progress);
        break;
      case CinematicPhase.ApplyEffect:
        // No fullscreen draw — the board is fully visible here. The in-zone
        // particles (PowerEffectParticles) and damage popups carry the beat,
        // so the player sees who was affected and how much damage landed.
        break;
    }
  }

  // --- Phase Renderers ---

  private renderSpotlight(
    builder: DrawingCommandsBuilder,
    overlayAlpha: number,
    glowIntensity: number,
    caster: CinematicCasterBinding,
    config: PowerVfxConfig,
  ): void {
    const darkBrush = new SolidBrush(new Color(0, 0, 0, overlayAlpha));
    builder.drawRect(darkBrush, null, new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));

    // Glow around the *actual* caster's screen position (captured at start()).
    const heroX = caster.spotlightX;
    const heroY = caster.spotlightY;
    const glowRadius = 40 + glowIntensity * 20;
    const glowAlpha = glowIntensity * 0.5;
    const glowColor = Color.fromHex(config.primaryColor);
    const glowBrush = new RadialGradientBrush(
      new Vec2(heroX, heroY),
      new Vec2(glowRadius, glowRadius),
      [
        { offset: 0, color: new Color(glowColor.r, glowColor.g, glowColor.b, glowAlpha) },
        { offset: 1, color: new Color(glowColor.r, glowColor.g, glowColor.b, 0) },
      ],
    );
    builder.drawEllipse(glowBrush, null, new Vec2(heroX, heroY), new Vec2(glowRadius, glowRadius));
  }

  private renderCinematic(
    builder: DrawingCommandsBuilder,
    cinematicAlpha: number,
    heroSpriteScale: number,
    caster: CinematicCasterBinding,
    effectType: PowerEffectType,
    config: PowerVfxConfig,
    dt: number,
  ): void {
    // Full-screen gradient background
    const gradStart = Color.fromHex(config.gradientTop);
    const gradEnd = Color.fromHex(config.gradientBottom);
    const bgBrush = new LinearGradientBrush(
      new Vec2(0, 0),
      new Vec2(0, CANVAS_HEIGHT),
      [
        { offset: 0, color: new Color(gradStart.r, gradStart.g, gradStart.b, cinematicAlpha * 0.9) },
        { offset: 1, color: new Color(gradEnd.r, gradEnd.g, gradEnd.b, cinematicAlpha * 0.9) },
      ],
    );
    builder.drawRect(bgBrush, null, new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));

    // Large hero sprite in center — uses the texture bound at start() time
    // so we always draw the *actual* casting hero, not a slot-index lookup.
    const spriteSize = 300;
    const heroTexture = caster.texture;
    const scaledSize = spriteSize * heroSpriteScale;
    const spriteX = (CANVAS_WIDTH - scaledSize) / 2;
    const spriteY = (CANVAS_HEIGHT - scaledSize) / 2 - 40;

    // Glow behind hero
    const glowColor = Color.fromHex(config.primaryColor);
    const heroGlow = new RadialGradientBrush(
      new Vec2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40),
      new Vec2(scaledSize * 0.7, scaledSize * 0.7),
      [
        { offset: 0, color: new Color(glowColor.r, glowColor.g, glowColor.b, 0.4 * cinematicAlpha) },
        { offset: 0.6, color: new Color(glowColor.r, glowColor.g, glowColor.b, 0.15 * cinematicAlpha) },
        { offset: 1, color: new Color(glowColor.r, glowColor.g, glowColor.b, 0) },
      ],
    );
    builder.drawEllipse(heroGlow, null, new Vec2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40), new Vec2(scaledSize * 0.7, scaledSize * 0.7));

    // Draw hero sprite
    const heroBrush = new ImageBrush(heroTexture);
    builder.drawRect(heroBrush, null, new Rectangle(spriteX, spriteY, scaledSize, scaledSize));

    // Procedural VFX particles
    this.updateAndDrawParticles(builder, effectType, config, dt);

    // Semi-transparent dark strip to frame the text block
    const stripBrush = new SolidBrush(new Color(0, 0, 0, cinematicAlpha * 0.45));
    builder.drawRect(stripBrush, null, new Rectangle(0, CANVAS_HEIGHT * 0.70, CANVAS_WIDTH, CANVAS_HEIGHT * 0.20));

    // Text (caster name + power name) is rendered by the XAML overlay layer
    // (cinematicTextVisible / cinematicCasterName / cinematicPowerName bindings
    // in GameViewModel), which correctly centres text and supports alpha fade.
  }

  private renderReturn(builder: DrawingCommandsBuilder, progress: number): void {
    // Fade out the dark overlay
    const darkAlpha = (1 - progress) * 0.4;
    if (darkAlpha > 0.01) {
      const darkBrush = new SolidBrush(new Color(0, 0, 0, darkAlpha));
      builder.drawRect(darkBrush, null, new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
    }
  }

  // --- Particle VFX ---

  private updateAndDrawParticles(
    builder: DrawingCommandsBuilder,
    effectType: PowerEffectType,
    config: PowerVfxConfig,
    dt: number,
  ): void {
    // Spawn particles at start of cinematic phase
    if (!this.particlesSpawned) {
      this.spawnParticles(effectType, config);
      this.particlesSpawned = true;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.rotSpeed * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Draw particles
    const pColor = Color.fromHex(config.primaryColor);
    const sColor = Color.fromHex(config.secondaryColor);
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.8;
      const size = p.size * (0.5 + lifeRatio * 0.5);

      // Blend from primaryColor to secondaryColor over lifetime
      const r = pColor.r + (sColor.r - pColor.r) * (1 - lifeRatio);
      const g = pColor.g + (sColor.g - pColor.g) * (1 - lifeRatio);
      const b = pColor.b + (sColor.b - pColor.b) * (1 - lifeRatio);
      const brush = new SolidBrush(new Color(r, g, b, alpha));

      if (effectType === PowerEffectType.SHIELD) {
        // Hexagon shapes for shield
        builder.pushTranslate(new Vec2(p.x, p.y));
        builder.pushRotate(p.angle, new Vec2(0, 0));
        const hex = `M ${size} 0 L ${size * 0.5} ${size * 0.87} L ${-size * 0.5} ${size * 0.87} L ${-size} 0 L ${-size * 0.5} ${-size * 0.87} L ${size * 0.5} ${-size * 0.87} Z`;
        builder.drawPath(brush, null, hex);
        builder.pop();
        builder.pop();
      } else if (effectType === PowerEffectType.DEBUFF_ATK) {
        // Chain link shapes
        builder.pushTranslate(new Vec2(p.x, p.y));
        builder.pushRotate(p.angle, new Vec2(0, 0));
        const chainPen = new Pen(brush, 2);
        builder.drawEllipse(null, chainPen, new Vec2(0, 0), new Vec2(size, size * 0.6));
        builder.pop();
        builder.pop();
      } else if (effectType === PowerEffectType.DAMAGE_BURST) {
        // Diamond / star shards for explosion
        builder.pushTranslate(new Vec2(p.x, p.y));
        builder.pushRotate(p.angle, new Vec2(0, 0));
        const diamond = `M 0 ${-size} L ${size * 0.5} 0 L 0 ${size} L ${-size * 0.5} 0 Z`;
        builder.drawPath(brush, null, diamond);
        builder.pop();
        builder.pop();
      } else if (effectType === PowerEffectType.DAMAGE_DOT) {
        // Teardrop shapes drifting downward
        builder.pushTranslate(new Vec2(p.x, p.y));
        builder.pushRotate(p.angle, new Vec2(0, 0));
        const drop = `M 0 ${-size} C ${size * 0.6} ${-size * 0.3} ${size * 0.6} ${size * 0.3} 0 ${size} C ${-size * 0.6} ${size * 0.3} ${-size * 0.6} ${-size * 0.3} 0 ${-size} Z`;
        builder.drawPath(brush, null, drop);
        builder.pop();
        builder.pop();
      } else if (effectType === PowerEffectType.BUFF_ATK) {
        // Upward-pointing arrows
        builder.pushTranslate(new Vec2(p.x, p.y));
        builder.pushRotate(p.angle, new Vec2(0, 0));
        const arrow = `M 0 ${-size} L ${size * 0.6} 0 L ${size * 0.25} 0 L ${size * 0.25} ${size} L ${-size * 0.25} ${size} L ${-size * 0.25} 0 L ${-size * 0.6} 0 Z`;
        builder.drawPath(brush, null, arrow);
        builder.pop();
        builder.pop();
      } else {
        // Default circular particles (DAMAGE_DIRECT, HEAL, MANA_BOOST, etc.)
        builder.drawEllipse(brush, null, new Vec2(p.x, p.y), new Vec2(size, size));
      }
    }
  }

  private spawnParticles(effectType: PowerEffectType, config: PowerVfxConfig): void {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2 - 40;
    const count = config.particleCount;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      const life = 0.6 + Math.random() * 0.6;

      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      let startX = cx + Math.cos(angle) * (30 + Math.random() * 40);
      let startY = cy + Math.sin(angle) * (30 + Math.random() * 40);

      switch (effectType) {
        case PowerEffectType.DAMAGE_DIRECT:
          // Beam-like: particles stream outward to the right
          vx = 100 + Math.random() * 150;
          vy = (Math.random() - 0.5) * 60;
          startX = cx - 100 + Math.random() * 50;
          startY = cy + (Math.random() - 0.5) * 80;
          break;

        case PowerEffectType.DAMAGE_BURST:
          // Explosion: fast radial burst from center with spread
          vx = Math.cos(angle) * (150 + Math.random() * 100);
          vy = Math.sin(angle) * (150 + Math.random() * 100);
          startX = cx + Math.cos(angle) * (10 + Math.random() * 20);
          startY = cy + Math.sin(angle) * (10 + Math.random() * 20);
          break;

        case PowerEffectType.DAMAGE_DOT:
          // Poison: drip downward, slight horizontal wobble
          vx = (Math.random() - 0.5) * 30;
          vy = 50 + Math.random() * 80;
          startX = cx + (Math.random() - 0.5) * 120;
          startY = cy - 40 + Math.random() * 30;
          break;

        case PowerEffectType.HEAL:
          // Rise upward like light rays
          vx = (Math.random() - 0.5) * 40;
          vy = -(80 + Math.random() * 100);
          startX = cx + (Math.random() - 0.5) * 200;
          startY = cy + 60 + Math.random() * 40;
          break;

        case PowerEffectType.SHIELD:
          // Orbit outward then slow to a hover around hero outline
          vx = Math.cos(angle) * (40 + Math.random() * 30);
          vy = Math.sin(angle) * (40 + Math.random() * 30);
          startX = cx + Math.cos(angle) * (80 + Math.random() * 30);
          startY = cy + Math.sin(angle) * (80 + Math.random() * 30);
          break;

        case PowerEffectType.BUFF_ATK:
          // Fiery upward burst, concentrated above the hero
          vx = (Math.random() - 0.5) * 80;
          vy = -(100 + Math.random() * 120);
          startX = cx + (Math.random() - 0.5) * 80;
          startY = cy + 20 + Math.random() * 40;
          break;

        case PowerEffectType.DEBUFF_ATK:
          // Spiral inward toward the target area
          vx = -Math.cos(angle) * (50 + Math.random() * 40);
          vy = -Math.sin(angle) * (50 + Math.random() * 40);
          startX = cx + Math.cos(angle) * (120 + Math.random() * 60);
          startY = cy + Math.sin(angle) * (120 + Math.random() * 60);
          break;

        case PowerEffectType.MANA_BOOST:
          // Spiral inward from ring
          {
            const dist = 120 + Math.random() * 60;
            startX = cx + Math.cos(angle) * dist;
            startY = cy + Math.sin(angle) * dist;
            vx = -Math.cos(angle) * (60 + Math.random() * 40);
            vy = -Math.sin(angle) * (60 + Math.random() * 40);
          }
          break;
      }

      this.particles.push({
        x: startX,
        y: startY,
        vx,
        vy,
        life,
        maxLife: life,
        size: 4 + Math.random() * 8,
        angle: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 200,
      });
    }
  }
}
