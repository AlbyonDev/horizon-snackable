/**
 * SwapHandler
 *
 * Handles gem swap validation, animation, and execution.
 * Match-validity test is delegated to MatchValidator. Easing helpers come
 * from Tweener. Tunable durations live in AnimationConfig.
 */
import type { Gem } from './Types';
import type { SwapRequest } from './InputHandler';
import { gridToPixelX, gridToPixelY } from './BoardState';
import { swapProducesMatch } from './MatchValidator';
import { lerp, easeInOutCubic, bellSine } from './Tweener';
import {
  SWAP_VALID_DURATION,
  SWAP_INVALID_FORWARD_DURATION,
  SWAP_INVALID_RETURN_DURATION,
  SWAP_INVALID_FORWARD_PERCENT,
  SWAP_VALID_ROTATION_DEG,
  SWAP_INVALID_ROTATION_DEG,
} from './AnimationConfig';

export enum SwapState {
  Idle = 0,
  AnimatingSwap = 1,
  AnimatingInvalid = 2,
}

export class SwapHandler {
  private _state: SwapState = SwapState.Idle;
  private _swapRequest: SwapRequest | null = null;
  private _isValidSwap: boolean = false;
  private _animProgress: number = 0;
  private _animPhase: number = 0; // 0 = forward, 1 = return (invalid only)

  // Cached endpoints — populated when the swap starts
  private fromStartX: number = 0;
  private fromStartY: number = 0;
  private toStartX: number = 0;
  private toStartY: number = 0;
  private fromTargetX: number = 0;
  private fromTargetY: number = 0;
  private toTargetX: number = 0;
  private toTargetY: number = 0;

  // Per-frame rotation values surfaced to the renderer
  private _fromRotation: number = 0;
  private _toRotation: number = 0;

  get state(): SwapState { return this._state; }
  get isAnimating(): boolean { return this._state !== SwapState.Idle; }
  get isValid(): boolean { return this._isValidSwap; }
  get fromRotation(): number { return this._fromRotation; }
  get toRotation(): number { return this._toRotation; }
  get swapRequest(): SwapRequest | null { return this._swapRequest; }

  /** Start a swap attempt - validates and begins animation */
  startSwap(request: SwapRequest, board: Gem[][]): void {
    this._swapRequest = request;
    this._isValidSwap = swapProducesMatch(
      board,
      request.fromRow, request.fromCol,
      request.toRow, request.toCol,
    );
    this._animProgress = 0;
    this._animPhase = 0;

    const fromGem = board[request.fromRow][request.fromCol];
    const toGem = board[request.toRow][request.toCol];
    if (!fromGem || !toGem) { this.reset(); return; }

    this.fromStartX = fromGem.visualX;
    this.fromStartY = fromGem.visualY;
    this.toStartX = toGem.visualX;
    this.toStartY = toGem.visualY;

    this.fromTargetX = gridToPixelX(request.toCol);
    this.fromTargetY = gridToPixelY(request.toRow);
    this.toTargetX = gridToPixelX(request.fromCol);
    this.toTargetY = gridToPixelY(request.fromRow);

    if (this._isValidSwap) {
      this._state = SwapState.AnimatingSwap;
    } else {
      this._state = SwapState.AnimatingInvalid;
    }
  }

  /**
   * Update animation each frame. Returns true when animation is complete.
   */
  update(dt: number, board: Gem[][]): boolean {
    if (this._state === SwapState.Idle || !this._swapRequest) return false;

    const request = this._swapRequest;
    const fromGem = board[request.fromRow][request.fromCol];
    const toGem = board[request.toRow][request.toCol];

    return this._state === SwapState.AnimatingSwap
      ? this.updateValidSwap(dt, fromGem, toGem)
      : this.updateInvalidSwap(dt, fromGem, toGem);
  }

  /** After a valid swap animation completes, execute the actual board swap */
  executeSwap(board: Gem[][]): void {
    if (!this._swapRequest) return;

    const req = this._swapRequest;
    const fromGem = board[req.fromRow][req.fromCol];
    const toGem = board[req.toRow][req.toCol];

    board[req.fromRow][req.fromCol] = toGem;
    board[req.toRow][req.toCol] = fromGem;

    fromGem.row = req.toRow;
    fromGem.col = req.toCol;
    toGem.row = req.fromRow;
    toGem.col = req.fromCol;

    fromGem.visualX = gridToPixelX(fromGem.col);
    fromGem.visualY = gridToPixelY(fromGem.row);
    toGem.visualX = gridToPixelX(toGem.col);
    toGem.visualY = gridToPixelY(toGem.row);

    this.reset();
  }

  reset(): void {
    this._state = SwapState.Idle;
    this._swapRequest = null;
    this._animProgress = 0;
    this._animPhase = 0;
    this._fromRotation = 0;
    this._toRotation = 0;
  }

  // ===== Private Animation =====

  private updateValidSwap(dt: number, fromGem: Gem, toGem: Gem): boolean {
    this._animProgress += dt / SWAP_VALID_DURATION;
    const t = Math.min(this._animProgress, 1);
    const eased = easeInOutCubic(t);

    fromGem.visualX = lerp(this.fromStartX, this.fromTargetX, eased);
    fromGem.visualY = lerp(this.fromStartY, this.fromTargetY, eased);
    toGem.visualX = lerp(this.toStartX, this.toTargetX, eased);
    toGem.visualY = lerp(this.toStartY, this.toTargetY, eased);

    // Rotation peaks at midpoint, returns to 0 at end
    const rotationAmount = bellSine(t) * SWAP_VALID_ROTATION_DEG;
    this._fromRotation = rotationAmount;
    this._toRotation = -rotationAmount;

    if (t >= 1) {
      this._fromRotation = 0;
      this._toRotation = 0;
    }
    return t >= 1;
  }

  private updateInvalidSwap(dt: number, fromGem: Gem, toGem: Gem): boolean {
    if (this._animPhase === 0) {
      // Phase 0: move SWAP_INVALID_FORWARD_PERCENT toward target
      this._animProgress += dt / SWAP_INVALID_FORWARD_DURATION;
      const t = Math.min(this._animProgress, 1);
      const partial = easeInOutCubic(t) * SWAP_INVALID_FORWARD_PERCENT;

      fromGem.visualX = lerp(this.fromStartX, this.fromTargetX, partial);
      fromGem.visualY = lerp(this.fromStartY, this.fromTargetY, partial);
      toGem.visualX = lerp(this.toStartX, this.toTargetX, partial);
      toGem.visualY = lerp(this.toStartY, this.toTargetY, partial);

      const rotAmount = bellSine(t) * SWAP_INVALID_ROTATION_DEG;
      this._fromRotation = rotAmount;
      this._toRotation = -rotAmount;

      if (t >= 1) {
        this._animPhase = 1;
        this._animProgress = 0;
      }
      return false;
    }

    // Phase 1: return to original positions
    this._animProgress += dt / SWAP_INVALID_RETURN_DURATION;
    const t = Math.min(this._animProgress, 1);
    const eased = easeInOutCubic(t);

    const partialFromX = lerp(this.fromStartX, this.fromTargetX, SWAP_INVALID_FORWARD_PERCENT);
    const partialFromY = lerp(this.fromStartY, this.fromTargetY, SWAP_INVALID_FORWARD_PERCENT);
    const partialToX = lerp(this.toStartX, this.toTargetX, SWAP_INVALID_FORWARD_PERCENT);
    const partialToY = lerp(this.toStartY, this.toTargetY, SWAP_INVALID_FORWARD_PERCENT);

    fromGem.visualX = lerp(partialFromX, this.fromStartX, eased);
    fromGem.visualY = lerp(partialFromY, this.fromStartY, eased);
    toGem.visualX = lerp(partialToX, this.toStartX, eased);
    toGem.visualY = lerp(partialToY, this.toStartY, eased);

    this._fromRotation = 0;
    this._toRotation = 0;

    if (t >= 1) {
      fromGem.visualX = this.fromStartX;
      fromGem.visualY = this.fromStartY;
      toGem.visualX = this.toStartX;
      toGem.visualY = this.toStartY;
      this.reset();
      return true;
    }
    return false;
  }
}
