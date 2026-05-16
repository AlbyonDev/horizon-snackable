/**
 * AnimationHandler
 *
 * Orchestrates the destruction → fall → spawn animation pipeline.
 * Tracks the current animation phase and delegates to sub-handlers.
 */
import { AnimPhase } from './Types';
import type { Gem, Particle } from './Types';
import { DestructionHandler } from './DestructionHandler';
import { FallHandler } from './FallHandler';
import { SpawnHandler } from './SpawnHandler';
import { BOARD_ROWS, BOARD_COLS } from './Constants';

export class AnimationHandler {
  private _phase: AnimPhase = AnimPhase.Idle;
  private destruction: DestructionHandler = new DestructionHandler();
  private fall: FallHandler = new FallHandler();
  private spawn: SpawnHandler = new SpawnHandler();

  get phase(): AnimPhase {
    return this._phase;
  }

  get isAnimating(): boolean {
    return this._phase !== AnimPhase.Idle || this.destruction.hasActiveParticles();
  }

  /** Get active particles from the destruction handler */
  get particles(): Particle[] {
    return this.destruction.particles;
  }

  /** Update particles independently (call every frame regardless of phase) */
  updateParticles(dt: number): void {
    this.destruction.updateParticles(dt);
  }

  /**
   * Start the destruction → fall → spawn pipeline for matched positions.
   * @param matchedPositions Set of "row,col" strings to destroy
   * @param board The current board state
   */
  startDestruction(matchedPositions: Set<string>, board: (Gem | null)[][]): void {
    if (matchedPositions.size === 0) return;
    this._phase = AnimPhase.Destroying;
    this.destruction.start(matchedPositions, board);
  }

  /**
   * Update the animation pipeline each frame.
   * @returns true when the entire pipeline (destroy + fall + spawn) is complete
   */
  update(dt: number, board: (Gem | null)[][]): boolean {
    switch (this._phase) {
      case AnimPhase.Destroying: {
        const done = this.destruction.update(dt, board);
        if (done) {
          // Remove destroyed gems from board
          this.destruction.removeDestroyedGems(board);
          // Transition to falling phase
          const hasFallers = this.fall.start(board);
          if (hasFallers) {
            this._phase = AnimPhase.Falling;
          } else {
            // No gems to fall - check if we need to spawn
            const hasSpawns = this.spawn.start(board);
            if (hasSpawns) {
              this._phase = AnimPhase.Spawning;
            } else {
              this._phase = AnimPhase.Idle;
              return true;
            }
          }
        }
        return false;
      }

      case AnimPhase.Falling: {
        const done = this.fall.update(dt, board);
        if (done) {
          // Transition to spawning
          const hasSpawns = this.spawn.start(board);
          if (hasSpawns) {
            this._phase = AnimPhase.Spawning;
          } else {
            this._phase = AnimPhase.Idle;
            return true;
          }
        }
        return false;
      }

      case AnimPhase.Spawning: {
        const done = this.spawn.update(dt, board);
        if (done) {
          this._phase = AnimPhase.Idle;
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /** Reset all animation state */
  reset(): void {
    this._phase = AnimPhase.Idle;
    this.destruction.reset();
    this.fall.reset();
    this.spawn.reset();
  }
}
