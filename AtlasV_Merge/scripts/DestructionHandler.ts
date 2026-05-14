/**
 * DestructionHandler
 *
 * Animates matched gems bursting: scale up + fade out over BURST_DURATION.
 * After animation completes, gems are removed from the board (set to null).
 * Particle lifecycle is delegated to ParticleSystem.
 */
import type { Gem, Particle } from './Types';
import { decodeKey } from './GridCoordinate';
import type { GridKey } from './GridCoordinate';
import { ParticleSystem } from './ParticleSystem';
import { easeOutQuad } from './Tweener';
import { BURST_DURATION, BURST_MAX_SCALE } from './AnimationConfig';

export class DestructionHandler {
  private destroyingPositions: Set<string> = new Set();
  private progress: number = 0;
  private particleSystem: ParticleSystem = new ParticleSystem();

  get particles(): Particle[] {
    return this.particleSystem.particles;
  }

  /** Start burst animation for the given positions */
  start(matchedPositions: Set<string>, board: (Gem | null)[][]): void {
    this.destroyingPositions = new Set(matchedPositions);
    this.progress = 0;

    for (const key of this.destroyingPositions) {
      const { row, col } = decodeKey(key as GridKey);
      const gem = board[row][col];
      if (gem) {
        gem.anim.isAnimating = true;
        this.particleSystem.spawnBurst(gem);
      }
    }
  }

  /**
   * Update burst animation.
   * @returns true when burst animation is complete
   */
  update(dt: number, board: (Gem | null)[][]): boolean {
    this.progress += dt / BURST_DURATION;
    const t = Math.min(this.progress, 1);
    const eased = easeOutQuad(t);

    for (const key of this.destroyingPositions) {
      const { row, col } = decodeKey(key as GridKey);
      const gem = board[row][col];
      if (gem) {
        // Scale up, then fade out
        gem.anim.scale = 1 + (BURST_MAX_SCALE - 1) * (1 - eased);
        gem.anim.alpha = 1 - eased;
      }
    }

    this.particleSystem.update(dt);
    return t >= 1;
  }

  /** Remove destroyed gems from the board (set to null) */
  removeDestroyedGems(board: (Gem | null)[][]): void {
    for (const key of this.destroyingPositions) {
      const { row, col } = decodeKey(key as GridKey);
      board[row][col] = null;
    }
    this.destroyingPositions.clear();
  }

  reset(): void {
    this.destroyingPositions.clear();
    this.progress = 0;
    this.particleSystem.clear();
  }

  hasActiveParticles(): boolean {
    return this.particleSystem.hasActive();
  }

  /** Update particles independently — called every frame regardless of phase. */
  updateParticles(dt: number): void {
    this.particleSystem.update(dt);
  }
}
