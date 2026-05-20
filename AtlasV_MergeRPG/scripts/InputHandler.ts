/**
 * InputHandler
 *
 * Handles touch input for gem selection and swap initiation.
 * Uses FocusedInteractionService with proper coordinate mapping.
 *
 * This is a utility class, NOT a component. It's instantiated by GameComponent.
 */
import {
  FocusedInteractionService,
  NetworkingService,
  Vec2,
} from 'meta/worlds';
import { Color } from 'meta/platform_api';
import { getScreenAspectRatio } from './CameraUtils';

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  BOARD_COLS,
  BOARD_ROWS,
  GEM_CELL_SIZE,
} from './Constants';

export interface GridPosition {
  row: number;
  col: number;
}

export interface SwapRequest {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

/** A request to activate a hero's power (consumed by GameComponent) */
export interface HeroTapRequest {
  heroIndex: number;
}

/** Rectangle describing a hero's touch target */
export interface HeroTouchTarget {
  heroIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Depth priority: higher = checked first. Pass visual.scale so front hero wins overlaps. */
  priority: number;
}


/**
 * Manages touch-to-grid conversion and gem selection state.
 */
export class InputHandler {
  private static readonly GAME_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

  // Selection state
  private _selectedGem: GridPosition | null = null;
  private _pendingSwap: SwapRequest | null = null;
  private _pendingHeroTap: HeroTapRequest | null = null;
  private _pendingCancelRequest: boolean = false;

  /**
   * Predicate consulted on each touch: when it returns false, non-hero taps
   * are treated as panel-cancel requests instead of gem selection. The
   * predicate is owned by GameComponent and composes the live state of
   * animations, combat phase, and panels — there is no imperative
   * enable/disable flag to keep in sync.
   */
  private _isBoardInteractive: () => boolean = () => true;

  /** Hero touch targets set externally by GameComponent each frame */
  private _heroTouchTargets: HeroTouchTarget[] = [];

  get selectedGem(): GridPosition | null {
    return this._selectedGem;
  }

  get pendingSwap(): SwapRequest | null {
    return this._pendingSwap;
  }

  /** Set the current hero touch targets (called by GameComponent each frame) */
  setHeroTouchTargets(targets: HeroTouchTarget[]): void {
    this._heroTouchTargets = targets;
  }

  /** Consume a pending hero tap request */
  consumeHeroTap(): HeroTapRequest | null {
    const tap = this._pendingHeroTap;
    this._pendingHeroTap = null;
    return tap;
  }

  /** Consume a pending cancel request (tap outside all heroes while input locked) */
  consumeCancelRequest(): boolean {
    const had = this._pendingCancelRequest;
    this._pendingCancelRequest = false;
    return had;
  }

  /** Enable FocusedInteractionService for touch input */
  enableTouchInput(): void {
    if (!NetworkingService.get().isPlayerContext()) return;

    const service = FocusedInteractionService.get();
    try {
      service.enableFocusedInteraction({
        disableFocusExitButton: true,
        disableEmotesButton: true,
        interactionStringId: 'puzzle_touch',
      });

      // Disable default visual feedback
      service.setTapOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        duration: 0,
        startScale: 0,
        endScale: 0,
      });

      service.setTrailOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        startWidth: 0,
        endWidth: 0,
        length: 0,
      });

    } catch (e) {
      console.error('[InputHandler] Failed to enable touch input:', e);
    }
  }

  /**
   * Bind the predicate consulted on each touch. Pass a function that returns
   * true while gem-board input should select gems, and false while a panel /
   * animation / cinematic / non-player-turn should treat misses as cancel
   * requests instead. Bound once by GameComponent at startup.
   */
  setIsBoardInteractive(predicate: () => boolean): void {
    this._isBoardInteractive = predicate;
  }

  /** Clear any pending swap request (consumed by game loop) */
  consumeSwapRequest(): SwapRequest | null {
    const swap = this._pendingSwap;
    this._pendingSwap = null;
    return swap;
  }

  /** Clear selection */
  clearSelection(): void {
    this._selectedGem = null;
  }

  /** Handle a touch start event at normalized screen position */
  handleTouchStart(screenPos: Vec2): void {
    const canvasPos = this.screenToCanvas(screenPos);

    // Hero portrait taps bypass _inputEnabled so the power panel can open during gem
    // animations. Sort front-to-back (descending priority = scale) so the front hero
    // always wins when sprites overlap.
    const sorted = this._heroTouchTargets.slice().sort((a, b) => b.priority - a.priority);
    for (const target of sorted) {
      if (canvasPos.x >= target.x && canvasPos.x <= target.x + target.width &&
          canvasPos.y >= target.y && canvasPos.y <= target.y + target.height) {
        this._pendingHeroTap = { heroIndex: target.heroIndex };
        return;
      }
    }

    // No hero hit. If the board isn't currently interactive (panel open,
    // animation in flight, cinematic playing) treat as a cancel request.
    if (!this._isBoardInteractive()) {
      this._pendingCancelRequest = true;
      return;
    }

    const gridPos = this.canvasToGrid(canvasPos.x, canvasPos.y);

    if (!gridPos) {
      // Touched outside the board - deselect
      this._selectedGem = null;
      return;
    }

    if (this._selectedGem === null) {
      // First selection
      this._selectedGem = gridPos;
    } else {
      // Second selection - check if adjacent
      if (this.isAdjacent(this._selectedGem, gridPos)) {
        // Create swap request
        this._pendingSwap = {
          fromRow: this._selectedGem.row,
          fromCol: this._selectedGem.col,
          toRow: gridPos.row,
          toCol: gridPos.col,
        };
        this._selectedGem = null;
      } else {
        // Not adjacent - select the new gem instead
        this._selectedGem = gridPos;
      }
    }
  }

  /** Convert normalized screen position to canvas pixel coordinates */
  private screenToCanvas(screenPos: Vec2): { x: number; y: number } {
    const screenAspect = getScreenAspectRatio();
    console.log(`[InputHandler] screenAspect = ${screenAspect}`);

    let canvasX: number;
    let canvasY: number;

    if (screenAspect > InputHandler.GAME_ASPECT_RATIO) {
      // Screen is wider than game - vertical bars on left/right
      const gameWidthInScreenSpace = InputHandler.GAME_ASPECT_RATIO / screenAspect;
      const offsetX = (1.0 - gameWidthInScreenSpace) / 2.0;
      canvasX = ((screenPos.x - offsetX) / gameWidthInScreenSpace) * CANVAS_WIDTH;
      canvasY = screenPos.y * CANVAS_HEIGHT;
    } else {
      // Screen is taller than game - bars on top/bottom
      const gameHeightInScreenSpace = screenAspect / InputHandler.GAME_ASPECT_RATIO;
      const offsetY = (1.0 - gameHeightInScreenSpace) / 2.0;
      canvasX = screenPos.x * CANVAS_WIDTH;
      canvasY = ((screenPos.y - offsetY) / gameHeightInScreenSpace) * CANVAS_HEIGHT;
    }

    return { x: canvasX, y: canvasY };
  }

  /** Convert canvas pixel position to grid position, or null if outside board */
  private canvasToGrid(canvasX: number, canvasY: number): GridPosition | null {
    const col = Math.floor((canvasX - BOARD_OFFSET_X) / GEM_CELL_SIZE);
    const row = Math.floor((canvasY - BOARD_OFFSET_Y) / GEM_CELL_SIZE);

    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
      return null;
    }

    return { row, col };
  }

  /** Check if two grid positions are horizontally or vertically adjacent */
  private isAdjacent(a: GridPosition, b: GridPosition): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }
}
