/**
 * TeamVisualAnimator
 *
 * Owns the per-frame visual lerps and game-feel effects for a TeamMemberVisual:
 * smooth position/scale/opacity easing, attack lunge, hurt-flash shake,
 * bounce, and global hitstop.
 *
 * Used by TeamState — extracted so TeamState can focus on data (rosters,
 * mana, status effects) instead of animation curves.
 */
import type { TeamMemberVisual } from './TeamTypes';
import { expDecayFactor } from './Tweener';
import {
  TEAM_LERP_SPEED,
  TEAM_DEATH_LERP_SPEED,
  ATTACK_LUNGE_DURATION,
  ATTACK_LUNGE_AMPLITUDE,
  ATTACK_LUNGE_PUNCH_FRACTION,
  HURT_FLASH_DURATION,
  HURT_SHAKE_AMPLITUDE,
  HITSTOP_DURATION,
  BOUNCE_DURATION,
  BOUNCE_AMPLITUDE,
} from './AnimationConfig';
import { getPositions, SOLO_ENEMY_SLOT } from './TeamLayout';
import type { DepthSlot } from './TeamLayout';

export class TeamVisualAnimator {
  /** Global hitstop timer: when > 0, all team animations freeze. */
  hitstopTimer: number = 0;

  /** Trigger a bounce on a member (sinusoidal Y offset for BOUNCE_DURATION s). */
  triggerBounce(visuals: TeamMemberVisual[], index: number): void {
    if (index >= 0 && index < visuals.length) {
      visuals[index].bounceTimer = BOUNCE_DURATION;
    }
  }

  /** Trigger a forward attack lunge. Direction follows team side (ally=+1, enemy=-1). */
  triggerAttack(visuals: TeamMemberVisual[], index: number, isAlly: boolean): void {
    if (index < 0 || index >= visuals.length) return;
    const v = visuals[index];
    if (v.isDead) return;
    v.attackTimer = ATTACK_LUNGE_DURATION;
    v.attackDirection = isAlly ? 1 : -1;
  }

  /** Trigger a hurt flash + global hitstop for impact weight. */
  triggerHurtFlash(visuals: TeamMemberVisual[], index: number): void {
    if (index >= 0 && index < visuals.length) {
      visuals[index].hurtFlashTimer = HURT_FLASH_DURATION;
      this.triggerHitstop(HITSTOP_DURATION);
    }
  }

  /** Freeze all team animations for `duration` seconds (clamps to current value if longer). */
  triggerHitstop(duration: number): void {
    if (duration > this.hitstopTimer) {
      this.hitstopTimer = duration;
    }
  }

  /** Mark a character as dying — animates to scale 0 + fade. */
  markDead(visuals: TeamMemberVisual[], index: number): void {
    if (index >= 0 && index < visuals.length) {
      visuals[index].isDead = true;
      visuals[index].targetScale = 0;
      visuals[index].targetOpacity = 0;
    }
  }

  /**
   * Recompute targetX/Y/scale/opacity for every member based on the front
   * member at `frontIndex`. Skips dead members (they keep their fade-out target).
   * A solo enemy (single live member on the enemy side) gets the larger centred slot.
   */
  recalculateDepthPositions(
    visuals: TeamMemberVisual[],
    frontIndex: number,
    isAlly: boolean,
    isBossRoom?: boolean,
  ): void {
    // Boss room: single oversized centred enemy, no depth cascade needed.
    if (!isAlly && isBossRoom) {
      for (const v of visuals) {
        if (!v.isDead) this.assignSlot(v, 0, SOLO_ENEMY_SLOT);
      }
      return;
    }

    const positions = getPositions(isAlly);
    let depthSlot = 1;
    for (let i = 0; i < visuals.length; i++) {
      if (visuals[i].isDead) continue;

      if (i === frontIndex) {
        this.assignSlot(visuals[i], 0, positions[0]);
      } else {
        const depth = Math.min(depthSlot, positions.length - 1);
        this.assignSlot(visuals[i], depth, positions[depth]);
        depthSlot++;
      }
    }
  }

  /**
   * Tick all per-frame animation state for both teams. Returns true if
   * animations were stepped, false if frozen by hitstop.
   */
  update(allyVisuals: TeamMemberVisual[], enemyVisuals: TeamMemberVisual[], dt: number): boolean {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return false;
    }

    const lerpFactor = expDecayFactor(TEAM_LERP_SPEED, dt);
    this.tickGroup(allyVisuals, dt, lerpFactor);
    this.tickGroup(enemyVisuals, dt, lerpFactor);
    return true;
  }

  /** Build a fresh visual struct for a roster slot at the given depth.
   *  Pass `isSolo=true` for a solo enemy to use the oversized centred slot. */
  createVisual(memberIndex: number, frontIndex: number, isAlly: boolean, isSolo?: boolean): TeamMemberVisual {
    const depthSlot = (!isAlly && isSolo) ? 0 : computeInitialDepth(memberIndex, frontIndex);
    const pos = (!isAlly && isSolo)
      ? SOLO_ENEMY_SLOT
      : getPositions(isAlly)[depthSlot];

    return {
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      opacity: pos.opacity,
      targetOpacity: pos.opacity,
      scale: pos.scale,
      targetScale: pos.scale,
      depthIndex: depthSlot,
      targetDepthIndex: depthSlot,
      rotation: 0,
      targetRotation: 0,
      bounceOffset: 0,
      bounceTimer: 0,
      hurtFlashTimer: 0,
      attackTimer: 0,
      attackDirection: isAlly ? 1 : -1,
      attackOffsetX: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      isDead: false,
    };
  }

  // ===== Internal =====

  private assignSlot(v: TeamMemberVisual, depth: number, slot: DepthSlot): void {
    v.targetDepthIndex = depth;
    v.targetX = slot.x;
    v.targetY = slot.y;
    v.targetScale = slot.scale;
    v.targetOpacity = slot.opacity;
  }

  private tickGroup(visuals: TeamMemberVisual[], dt: number, baseFactor: number): void {
    for (const v of visuals) {
      const factor = v.isDead ? expDecayFactor(TEAM_DEATH_LERP_SPEED, dt) : baseFactor;

      v.x += (v.targetX - v.x) * factor;
      v.y += (v.targetY - v.y) * factor;
      v.scale += (v.targetScale - v.scale) * factor;
      v.opacity += (v.targetOpacity - v.opacity) * factor;
      v.rotation += (v.targetRotation - v.rotation) * factor;

      if (Math.abs(v.x - v.targetX) < 1 && Math.abs(v.y - v.targetY) < 1) {
        v.depthIndex = v.targetDepthIndex;
      }

      this.tickBounce(v, dt);
      this.tickAttackLunge(v, dt);
      this.tickHurtFlash(v, dt);
    }
  }

  private tickBounce(v: TeamMemberVisual, dt: number): void {
    if (v.bounceTimer <= 0) return;
    v.bounceTimer -= dt;
    if (v.bounceTimer <= 0) {
      v.bounceTimer = 0;
      v.bounceOffset = 0;
      return;
    }
    const progress = 1 - (v.bounceTimer / BOUNCE_DURATION);
    v.bounceOffset = Math.sin(progress * Math.PI * 2) * BOUNCE_AMPLITUDE;
  }

  private tickAttackLunge(v: TeamMemberVisual, dt: number): void {
    if (v.attackTimer <= 0) return;
    v.attackTimer -= dt;
    if (v.attackTimer <= 0) {
      v.attackTimer = 0;
      v.attackOffsetX = 0;
      return;
    }
    const progress = 1 - (v.attackTimer / ATTACK_LUNGE_DURATION);
    // Asymmetric curve: quick punch out, longer recovery.
    const curve = progress < ATTACK_LUNGE_PUNCH_FRACTION
      ? progress / ATTACK_LUNGE_PUNCH_FRACTION
      : 1 - (progress - ATTACK_LUNGE_PUNCH_FRACTION) / (1 - ATTACK_LUNGE_PUNCH_FRACTION);
    v.attackOffsetX = curve * ATTACK_LUNGE_AMPLITUDE * v.attackDirection;
  }

  private tickHurtFlash(v: TeamMemberVisual, dt: number): void {
    if (v.hurtFlashTimer <= 0) return;
    const intensity = v.hurtFlashTimer / HURT_FLASH_DURATION;
    v.shakeOffsetX = (Math.random() - 0.5) * 2 * HURT_SHAKE_AMPLITUDE * intensity;
    v.shakeOffsetY = (Math.random() - 0.5) * 2 * HURT_SHAKE_AMPLITUDE * intensity;
    v.hurtFlashTimer -= dt;
    if (v.hurtFlashTimer <= 0) {
      v.hurtFlashTimer = 0;
      v.shakeOffsetX = 0;
      v.shakeOffsetY = 0;
    }
  }
}

/** Initial depth slot for a fresh visual: front gets 0, others fill 1..N-1. */
function computeInitialDepth(memberIndex: number, frontIndex: number): number {
  if (memberIndex === frontIndex) return 0;
  let slot = 1;
  for (let i = 0; i < 3; i++) {
    if (i === frontIndex) continue;
    if (i === memberIndex) return slot;
    slot++;
  }
  return slot;
}
