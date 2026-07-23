/**
 * OverworldHud — Level select screen ViewModel controller (S-curve path layout).
 *
 * Component Attachment: Scene entity (OverworldUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Displays a fixed S-curve bezier path with level nodes evenly distributed
 * along it at equal arc-length intervals. The S-curve shape is always the same
 * regardless of node count:
 *   - Starts at bottom-center
 *   - Curves right via control point 1
 *   - Crosses back left via control point 2
 *   - Ends at top-center
 * Nodes are sampled at evenly-spaced points along the curve's arc length:
 *   - 2 nodes = start and end of the S
 *   - 3 nodes = start, middle, end
 *   - 5+ nodes = evenly distributed along the S
 * Level 1 appears at the bottom, higher levels climb upward.
 * When a level is tapped, fires Events.LevelSelected with the chosen levelIndex.
 * Shows only during the Overworld GamePhase.
 *
 * Level states:
 *   - Open: clickable, highlighted/glowing sprite (next to play)
 *   - Beaten: not clickable, default sprite (already completed)
 *   - Locked: not clickable, greyed out sprite (not yet available)
 *
 * On start, only level 1 is open. Beating a level marks it beaten and opens the next.
 */
import {
  Component,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  NetworkingService,
  ExecuteOn,
  EventService,
  EntityService,
  TextureAsset,
  component,
  subscribe,
  property,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase, OverworldNodeState, UiEvents, BOSS_MODIFIER_LABELS } from '../Types';
import { BIOME_DEFS } from '../Defs/BiomeDefs';
import { RelicService } from '../Services/RelicService';
import { RELIC_DEFS } from '../Defs/RelicDefs';
import type { IRelicDef } from '../Defs/RelicDefs';
import { OverworldNodeType } from '../Defs/NodeDefs';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { TOTAL_LEVELS } from '../Constants';
import { MinigameHud } from './MinigameHud';

// Pre-defined TextureAssets for each biome background (must be static string literals)
const BG_GRASS = new TextureAsset('@sprites/overworld_background-grass.png');
const BG_SNOW = new TextureAsset('@sprites/overworld_background-snow.png');
const BG_VOLCANO = new TextureAsset('@sprites/overworld_background-volcano.png');

const BIOME_BACKGROUNDS: Record<string, TextureAsset> = {
  grass: BG_GRASS,
  snow: BG_SNOW,
  volcano: BG_VOLCANO,
};

// Pre-defined TextureAssets for relic icons (must be static string literals)
const RELIC_ICON_GOLD = new TextureAsset('@sprites/relic_gold.png');
const RELIC_ICON_DAMAGE = new TextureAsset('@sprites/relic_damage.png');
const RELIC_ICON_SPEED = new TextureAsset('@sprites/relic_speed.png');
const RELIC_ICON_RANGE = new TextureAsset('@sprites/relic_range.png');
const RELIC_ICON_LIVES = new TextureAsset('@sprites/relic_fortification.png');
const RELIC_ICON_SLOW = new TextureAsset('@sprites/relic_permafrost.png');

const RELIC_ICONS: Record<string, TextureAsset> = {
  gold: RELIC_ICON_GOLD,
  damage: RELIC_ICON_DAMAGE,
  speed: RELIC_ICON_SPEED,
  range: RELIC_ICON_RANGE,
  lives: RELIC_ICON_LIVES,
  slow: RELIC_ICON_SLOW,
};

// -- Level Node sub-ViewModel --

@uiViewModel()
export class OverworldPathNodeViewModel extends UiViewModel {
  /** Canvas.Left position */
  posX: number = 0;
  /** Canvas.Top position */
  posY: number = 0;
  /** Display number */
  levelNumber: string = '1';
  /** Index as string for CommandParameter binding */
  levelIndex: string = '1';
  /** Node type string: 'combat', 'boss', or 'minigame' -- drives sprite visibility in XAML */
  nodeType: string = 'combat';
  /** Node size (boss nodes are larger) */
  nodeSize: number = 180;
  /** Font size for the level number text */
  fontSize: number = 72;
  /** Vertical offset margin for the level number (top,right,bottom,left format) */
  numberMargin: string = '0,0,0,0';
  /** Node state: "open", "beaten", or "locked" -- drives sprite visibility in XAML */
  nodeState: string = 'locked';
  /** Whether this node is interactable (open or beaten) */
  isInteractable: boolean = false;
  /** Short modifier label for boss nodes (e.g. "x1.2 HP") */
  modifierLabel: string = '';
  /** Left margin for boss modifier badge (nodeSize + extra gap) */
  modifierMargin: string = '230,0,0,0';
  /** X offset for boss modifier badge RenderTransform (nodeSize + extra gap) */
  modifierOffsetX: number = 230;
}

// -- Relic Icon sub-ViewModel --

@uiViewModel()
export class OverworldRelicIconViewModel extends UiViewModel {
  /** Relic id used as CommandParameter */
  relicId: string = '';
  /** The relic icon texture */
  icon: Maybe<TextureAsset> = null;
}

// -- Carousel Card sub-ViewModel --

@uiViewModel()
export class RelicCarouselCardViewModel extends UiViewModel {
  relicId: string = '';
  relicName: string = '';
  relicDescription: string = '';
  icon: Maybe<TextureAsset> = null;
  /** Positioning and transform */
  cardLeft: number = 0;
  cardTop: number = 0;
  cardWidth: number = 400;
  cardHeight: number = 600;
  cardScaleX: number = 1;
  cardScaleY: number = 1;
  cardOpacity: number = 1;
  cardZIndex: number = 0;
}

// -- Carousel Dot sub-ViewModel --

@uiViewModel()
export class RelicCarouselDotViewModel extends UiViewModel {
  dotSize: number = 24;
  dotColor: string = '#88FFFFFF';
}

// -- Main ViewModel --

@uiViewModel()
export class OverworldViewModel extends UiViewModel {
  override readonly events = {
    levelTap: UiEvents.overworldLevelTap,
    relicIconTap: UiEvents.overworldRelicIconTap,
    relicCarouselTap: UiEvents.relicCarouselTap,
    relicCarouselSwipe: UiEvents.relicCarouselSwipe,
  };

  visible: boolean = false;
  runLabel: string = 'RUN 1';
  nodes: readonly OverworldPathNodeViewModel[] = [];
  /** SVG path data string for the smooth bezier curve connecting all nodes */
  pathData: string = '';
  canvasHeight: number = 800;
  backgroundImage: Maybe<TextureAsset> = null;

  // Relic button visibility (true when player has relics)
  relicIconsVisible: boolean = false;

  // Carousel overlay state
  carouselVisible: boolean = false;
  carouselCards: readonly RelicCarouselCardViewModel[] = [];
  carouselDots: readonly RelicCarouselDotViewModel[] = [];
}

// -- Component --

@component()
export class OverworldHud extends Component {
  /**
   * Dynamic level count: reads from LevelGeneratorService if generated, else
   * falls back to TOTAL_LEVELS constant in Constants.ts (the single source of truth).
   * To change the number of levels per run, edit TOTAL_LEVELS in Constants.ts.
   */
  private _getDynamicLevelCount(): number {
    const gen = LevelGeneratorService.get();
    return gen.isGenerated ? gen.levelCount : TOTAL_LEVELS;
  }

  // ========================================================================
  // LAYOUT PROPERTIES
  // ========================================================================

  @property() canvasWidth: number = 900;
  @property() canvasHeight: number = 1600;
  /** Distance from the top of the canvas to the last (top-most) node center */
  @property() topPadding: number = 150;
  /** Distance from the bottom of the canvas to the first (bottom-most) node center */
  @property() bottomPadding: number = 150;
  @property() leftFraction: number = 0.35;
  @property() rightFraction: number = 0.65;
  @property() maxNodeSize: number = 200;
  @property() minNodeSize: number = 120;
  /** Maximum horizontal offset from canvas center (used when few levels) */
  @property() maxHorizontalSpacing: number = 135;
  /** Minimum horizontal offset from canvas center (used when many levels) */
  @property() minHorizontalSpacing: number = 80;
  @property() bossSizeMultiplier: number = 1.3;
  @property() minLevelCountForScaling: number = 1;
  @property() maxLevelCountForScaling: number = 20;
  @property() levelNumberFontSize: number = 72;
  @property() levelNumberOffsetX: number = 0;
  @property() levelNumberOffsetZ: number = 0;
  /** Thickness of the smooth bezier path stroke (px) */
  @property() pathThickness: number = 40;

  // ========================================================================

  private viewModel: Maybe<OverworldViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  /** Per-level state tracking: index -> OverworldNodeState */
  private levelStates: OverworldNodeState[] = [];

  /** Buffered progress data if SaveRestored fires before onStart completes (null = none) */
  private pendingBeatenLevels: boolean[] | null = null;

  // -- Lifecycle --

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide the native panel immediately to prevent XAML binding race
    this.uiComponent.isVisible = false;

    this.viewModel = new OverworldViewModel();
    this.viewModel.backgroundImage = BG_GRASS;
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    // Initialize level states: level 0 is open, all others locked
    this._initLevelStates();
    this._populateLevels();
    this._refreshRelicIcons();
    this._updateRunLabel();

    // Apply any buffered progress that arrived before initialization
    if (this.pendingBeatenLevels) {
      console.log(`[OverworldHud] Applying buffered progress: ${JSON.stringify(this.pendingBeatenLevels)}`);
      this._applyRestoredProgress(this.pendingBeatenLevels);
      this.pendingBeatenLevels = null;
    }
  }

  // -- Events --

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    const shouldShow = payload.phase === GamePhase.Overworld;
    this.viewModel.visible = shouldShow;
    if (this.uiComponent) this.uiComponent.isVisible = shouldShow;

    // Refresh node states when returning to overworld
    if (shouldShow) {
      // Check if all levels are beaten -> advance to next run
      if (this._allLevelsBeaten()) {
        this._advanceRun();
      }
      this._refreshNodeStates();
      this._refreshRelicIcons();
      this._updateRunLabel();
    }
  }

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Owner })
  onLevelCompleted(payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const idx = payload.levelIndex;
    console.log(`[OverworldHud] Level ${idx} completed`);

    // Mark this level as beaten
    if (idx >= 0 && idx < this.levelStates.length) {
      this.levelStates[idx] = OverworldNodeState.Beaten;
    }

    // Unlock the next level (if it exists and is currently locked)
    const nextIdx = idx + 1;
    if (nextIdx < this.levelStates.length && this.levelStates[nextIdx] === OverworldNodeState.Locked) {
      this.levelStates[nextIdx] = OverworldNodeState.Open;
      console.log(`[OverworldHud] Level ${nextIdx + 1} unlocked`);
    }

    // Refresh the ViewModel so sprites update
    this._refreshNodeStates();
  }

  @subscribe(Events.SaveRestored, { execution: ExecuteOn.Owner })
  onSaveRestored(payload: Events.SaveRestoredPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Save stores "completed runs" (0-based). LevelGeneratorService._runCount is
    // the "current run number" (1-based). Mapping: current = completed + 1.
    const currentRun = payload.runCount + 1;
    LevelGeneratorService.get().setRunCount(currentRun);
    console.log(`[OverworldHud] Run count restored from save: completed=${payload.runCount}, currentRun=${currentRun}`);

    if (payload.beaten.length === 0) {
      // Fresh save — no beaten levels, but still update the run label
      this._updateRunLabel();
      return;
    }

    // If not yet initialized, buffer the data for later
    if (!this.viewModel || this.levelStates.length === 0) {
      console.log(`[OverworldHud] Buffering progress (not yet initialized): ${JSON.stringify(payload.beaten)}`);
      this.pendingBeatenLevels = payload.beaten.slice();
      return;
    }

    this._applyRestoredProgress(payload.beaten);
  }

  /** Apply restored progress data to levelStates and refresh the UI */
  private _applyRestoredProgress(beaten: boolean[]): void {
    console.log(`[OverworldHud] Restoring progress: ${JSON.stringify(beaten)}`);

    // Restore level states from saved data
    for (let i = 0; i < this.levelStates.length; i++) {
      if (i < beaten.length && beaten[i]) {
        this.levelStates[i] = OverworldNodeState.Beaten;
      }
    }

    // Find the first non-beaten level and set it to Open
    let foundOpen = false;
    for (let i = 0; i < this.levelStates.length; i++) {
      if (this.levelStates[i] !== OverworldNodeState.Beaten) {
        this.levelStates[i] = OverworldNodeState.Open;
        foundOpen = true;
        break;
      }
    }

    // If all levels are beaten on restore, the run was already marked complete
    // in the save (runCount was incremented by markRunComplete). Reset level
    // states to a fresh run so _advanceRun() doesn't double-fire in onPhaseChanged.
    if (!foundOpen) {
      console.log('[OverworldHud] All levels beaten on restore — resetting to fresh run');
      this._initLevelStates();
      this._populateLevels();
    }

    // Refresh the ViewModel
    this._refreshNodeStates();
    this._updateRunLabel();
    console.log(`[OverworldHud] Progress restored successfully`);
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const biome = BIOME_DEFS.find(b => b.id === payload.biomeId);
    if (!biome) return;

    console.log(`[OverworldHud] Biome changed to ${biome.name}, updating background`);
    const bgTexture = BIOME_BACKGROUNDS[biome.id];
    if (bgTexture) {
      this.viewModel.backgroundImage = bgTexture;
    }
  }

  @subscribe(UiEvents.overworldLevelTap, { execution: ExecuteOn.Owner })
  onLevelTap(payload: UiEvents.OverworldLevelTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;

    // Dismiss relic carousel on any level tap
    this.viewModel.carouselVisible = false;

    const levelIndex = parseInt(payload.parameter, 10);
    if (isNaN(levelIndex)) return;

    // Block taps on locked or beaten nodes (only Open nodes are playable)
    if (levelIndex >= 0 && levelIndex < this.levelStates.length) {
      const tappedState = this.levelStates[levelIndex];
      if (tappedState === OverworldNodeState.Locked) {
        console.log(`[OverworldHud] Level ${levelIndex + 1} is locked, tap ignored`);
        return;
      }
      if (tappedState === OverworldNodeState.Beaten) {
        console.log(`[OverworldHud] Level ${levelIndex + 1} is already beaten, tap ignored`);
        return;
      }
    }

    const nodeType = this.nodeTypes[levelIndex] || OverworldNodeType.Combat;
    console.log(`[OverworldHud] Level ${levelIndex + 1} selected (state: ${this._stateToString(this.levelStates[levelIndex])}, type: ${nodeType})`);

    // Minigame nodes: show minigame overlay directly, stay on Overworld
    if (nodeType === OverworldNodeType.Minigame) {
      console.log(`[OverworldHud] Minigame node tapped, showing overlay`);
      const minigameEntities = EntityService.findEntitiesWithComponent(MinigameHud);
      if (minigameEntities.length > 0) {
        const minigameHud = minigameEntities[0].getComponent(MinigameHud);
        if (minigameHud) {
          minigameHud.showMinigame(levelIndex);
        }
      } else {
        console.log('[OverworldHud] WARNING: No MinigameHud entity found');
      }
      return;
    }

    // Combat/Boss nodes: hide overworld, fire LevelSelected
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;

    // Fire the LevelSelected event
    const p = new Events.LevelSelectedPayload();
    p.levelIndex = levelIndex;
    p.nodeType = nodeType;
    EventService.sendLocally(Events.LevelSelected, p);
  }

  // -- Private --

  /** Initialize level states: first level open, rest locked */
  private _initLevelStates(): void {
    const count = this._getDynamicLevelCount();
    this.levelStates = [];
    for (let i = 0; i < count; i++) {
      this.levelStates.push(i === 0 ? OverworldNodeState.Open : OverworldNodeState.Locked);
    }
  }

  /** Check if all levels in the current run have been beaten */
  private _allLevelsBeaten(): boolean {
    if (this.levelStates.length === 0) return false;
    return this.levelStates.every(state => state === OverworldNodeState.Beaten);
  }

  /** Advance to a new run: regenerate levels, reset states, increment counter */
  private _advanceRun(): void {
    console.log('[OverworldHud] All levels beaten! Advancing to next run');
    LevelGeneratorService.get().advanceRun();
    RelicService.get().reset();
    this._initLevelStates();
    this._populateLevels();

    // Fire RunAdvanced event so other systems can react
    const p = new Events.RunAdvancedPayload();
    p.runCount = LevelGeneratorService.get().runCount;
    EventService.sendLocally(Events.RunAdvanced, p);
  }

  /** Update the run label in the ViewModel */
  private _updateRunLabel(): void {
    if (!this.viewModel) return;
    this.viewModel.runLabel = `RUN ${LevelGeneratorService.get().runCount}`;
  }

  /** Convert enum to string for XAML binding */
  private _stateToString(state: OverworldNodeState): string {
    switch (state) {
      case OverworldNodeState.Open: return 'open';
      case OverworldNodeState.Beaten: return 'beaten';
      case OverworldNodeState.Locked:
      default: return 'locked';
    }
  }

  /** Refresh all node ViewModels with current level states */
  private _refreshNodeStates(): void {
    if (!this.viewModel) return;
    const currentNodes = this.viewModel.nodes;
    const updatedNodes: OverworldPathNodeViewModel[] = [];

    for (let i = 0; i < currentNodes.length; i++) {
      const node = new OverworldPathNodeViewModel();
      const src = currentNodes[i];
      node.posX = src.posX;
      node.posY = src.posY;
      node.levelNumber = src.levelNumber;
      node.levelIndex = src.levelIndex;
      node.nodeType = src.nodeType;
      node.nodeSize = src.nodeSize;
      node.fontSize = src.fontSize;
      node.numberMargin = src.numberMargin;
      node.modifierMargin = src.modifierMargin;
      node.modifierOffsetX = src.modifierOffsetX;
      // Recompute modifier label for boss nodes (ensures it's always up-to-date)
      if (src.nodeType === OverworldNodeType.Boss) {
        const levelDef = LevelGeneratorService.get().getLevelDef(i);
        if (levelDef.bossModifier !== undefined) {
          node.modifierLabel = BOSS_MODIFIER_LABELS[levelDef.bossModifier];
        }
      } else {
        node.modifierLabel = src.modifierLabel;
      }

      const state = i < this.levelStates.length ? this.levelStates[i] : OverworldNodeState.Locked;
      node.nodeState = this._stateToString(state);
      node.isInteractable = state === OverworldNodeState.Open;
      updatedNodes.push(node);
    }

    this.viewModel.nodes = updatedNodes;
  }

  private computeLayoutParams(totalLevels: number): { nodeSize: number; horizontalSpacing: number } {
    const range = this.maxLevelCountForScaling - this.minLevelCountForScaling;
    const t = Math.max(0, Math.min(1, (totalLevels - this.minLevelCountForScaling) / range));
    const nodeSize = Math.round(this.maxNodeSize - t * (this.maxNodeSize - this.minNodeSize));
    const horizontalSpacing = Math.round(this.maxHorizontalSpacing - t * (this.maxHorizontalSpacing - this.minHorizontalSpacing));
    return { nodeSize, horizontalSpacing };
  }

  /**
   * Build a fixed S-curve bezier path and sample node positions along it at
   * equal arc-length intervals. The S shape is always the same regardless of
   * node count — nodes are simply distributed evenly along the curve.
   *
   * The S-curve:
   *   - Starts at bottom-center
   *   - Curves to one side (right)
   *   - Crosses back to the other side (left)
   *   - Ends at top-center
   *
   * Uses a cubic bezier with control points that create a classic S shape.
   * horizontalSpacing controls the width of the S.
   *
   * @returns SVG path data string and an array of node center positions.
   */
  private _buildSnakePath(
    totalNodes: number,
    horizontalSpacing: number,
  ): { pathData: string; nodeCenters: Array<{ x: number; y: number }> } {
    const canvasCenter = this.canvasWidth / 2;
    const topY = this.topPadding;
    const bottomY = this.canvasHeight - this.bottomPadding;

    if (totalNodes <= 0) {
      return { pathData: '', nodeCenters: [] };
    }

    if (totalNodes === 1) {
      const nodeCenters = [{ x: canvasCenter, y: (topY + bottomY) / 2 }];
      return { pathData: '', nodeCenters };
    }

    // -- Define the fixed S-curve as a cubic bezier --
    // Start: bottom-center, End: top-center
    // Control points push right then left to create the S shape
    const startX = canvasCenter;
    const startY = bottomY;
    const endX = canvasCenter;
    const endY = topY;

    const height = bottomY - topY;

    // Control point 1: push right and ~1/3 up from start
    const cp1x = canvasCenter + horizontalSpacing * 1.8;
    const cp1y = startY - height * 0.33;

    // Control point 2: push left and ~1/3 down from end
    const cp2x = canvasCenter - horizontalSpacing * 1.8;
    const cp2y = endY + height * 0.33;

    // -- Build SVG path data for the S-curve --
    const pathData = `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;

    // -- Sample node positions at equal arc-length intervals along the bezier --
    const nodeCenters = this._sampleBezierEqualArcLength(
      startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY, totalNodes,
    );

    return { pathData, nodeCenters };
  }

  /** Local cache of node types per level index, read from the seeded generator. */
  /**
   * Sample points at equal arc-length intervals along a cubic bezier curve.
   * Uses a lookup table approach: subdivide the curve into many small segments,
   * compute cumulative arc length, then interpolate to find evenly-spaced points.
   */
  private _sampleBezierEqualArcLength(
    x0: number, y0: number,
    cx1: number, cy1: number,
    cx2: number, cy2: number,
    x3: number, y3: number,
    numPoints: number,
  ): Array<{ x: number; y: number }> {
    // Build arc-length lookup table with many subdivisions
    const SUBDIVISIONS = 200;
    const arcLengths: number[] = [0];
    let prevX = x0;
    let prevY = y0;
    let totalLength = 0;

    for (let i = 1; i <= SUBDIVISIONS; i++) {
      const t = i / SUBDIVISIONS;
      const pt = this._evalCubicBezier(x0, y0, cx1, cy1, cx2, cy2, x3, y3, t);
      const dx = pt.x - prevX;
      const dy = pt.y - prevY;
      totalLength += Math.sqrt(dx * dx + dy * dy);
      arcLengths.push(totalLength);
      prevX = pt.x;
      prevY = pt.y;
    }

    // Sample numPoints at equal arc-length intervals
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < numPoints; i++) {
      const targetLength = numPoints === 1
        ? totalLength / 2
        : (i / (numPoints - 1)) * totalLength;

      // Binary search for the subdivision index where this arc length falls
      let low = 0;
      let high = SUBDIVISIONS;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (arcLengths[mid] < targetLength) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }

      // Interpolate between subdivision steps for more precision
      const segIndex = Math.max(0, low - 1);
      const segLength = arcLengths[segIndex + 1] - arcLengths[segIndex];
      const segFraction = segLength > 0
        ? (targetLength - arcLengths[segIndex]) / segLength
        : 0;
      const t = (segIndex + segFraction) / SUBDIVISIONS;

      const pt = this._evalCubicBezier(x0, y0, cx1, cy1, cx2, cy2, x3, y3, t);
      points.push(pt);
    }

    return points;
  }

  /**
   * Evaluate a cubic bezier at parameter t (0..1).
   */
  private _evalCubicBezier(
    x0: number, y0: number,
    cx1: number, cy1: number,
    cx2: number, cy2: number,
    x3: number, y3: number,
    t: number,
  ): { x: number; y: number } {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * x0 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x3;
    const y = mt3 * y0 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y3;
    return { x, y };
  }



  /** Assigned node types per level index */
  private nodeTypes: OverworldNodeType[] = [];

  /** Pull the seeded node-type layout from LevelGeneratorService (single source
   *  of truth). The minigame position is part of the seeded run, so it stays
   *  stable across reloads instead of being re-rolled here. */
  private _assignNodeTypes(totalLevels: number): void {
    const gen = LevelGeneratorService.get();
    this.nodeTypes = [];
    for (let i = 0; i < totalLevels; i++) {
      this.nodeTypes.push(gen.getNodeType(i));
    }
  }

  private _populateLevels(): void {
    const totalLevels = this._getDynamicLevelCount();
    const { nodeSize, horizontalSpacing } = this.computeLayoutParams(totalLevels);
    const bossNodeSize = Math.round(nodeSize * this.bossSizeMultiplier);

    // Assign node types
    this._assignNodeTypes(totalLevels);

    // Build the 3-arc snake path and sample node positions along it
    const { pathData, nodeCenters } = this._buildSnakePath(totalLevels, horizontalSpacing);

    // Build node ViewModels
    const nodes: OverworldPathNodeViewModel[] = [];
    for (let i = 0; i < totalLevels; i++) {
      const node = new OverworldPathNodeViewModel();
      const type = this.nodeTypes[i] || OverworldNodeType.Combat;
      const isBossNode = type === OverworldNodeType.Boss;
      const size = isBossNode ? bossNodeSize : nodeSize;
      const half = size / 2;
      node.posX = nodeCenters[i].x - half;
      node.posY = nodeCenters[i].y - half;
      node.levelNumber = `${i + 1}`;
      node.levelIndex = `${i}`;
      node.nodeType = type;
      node.nodeSize = size;
      node.fontSize = this.levelNumberFontSize;
      node.numberMargin = `0,${this.levelNumberOffsetX},${this.levelNumberOffsetZ},0`;

      // Set node state
      const state = i < this.levelStates.length ? this.levelStates[i] : OverworldNodeState.Locked;
      node.nodeState = this._stateToString(state);
      node.isInteractable = state === OverworldNodeState.Open;

      // Set modifier label and margin for boss nodes (getLevelDef auto-generates if needed)
      if (isBossNode) {
        const levelDef = LevelGeneratorService.get().getLevelDef(i);
        if (levelDef.bossModifier !== undefined) {
          node.modifierLabel = BOSS_MODIFIER_LABELS[levelDef.bossModifier];
        }
        node.modifierMargin = `${size + 50},0,0,0`;
        node.modifierOffsetX = size + 50;
      } else {
        node.modifierMargin = `${size + 50},0,0,0`;
        node.modifierOffsetX = size + 50;
      }
      nodes.push(node);
    }

    if (this.viewModel) {
      this.viewModel.nodes = nodes;
      this.viewModel.pathData = pathData;
      this.viewModel.canvasHeight = this.canvasHeight;
    }
  }

  // -- Relic Carousel --

  /** Current focused card index in the carousel */
  private _carouselIndex: number = 0;
  /** Cached active relic defs for the carousel */
  private _carouselRelics: IRelicDef[] = [];

  // Animation state for smooth 3D carousel transitions
  private _carouselAnimating: boolean = false;
  /** Animation speed — higher = faster transitions (6 = ~160ms settle) */
  private _carouselAnimSpeed: number = 6;
  /** Per-card current animated values (parallel to _carouselRelics) */
  private _cardCurrentLeft: number[] = [];
  private _cardCurrentTop: number[] = [];
  private _cardCurrentScaleX: number[] = [];
  private _cardCurrentScaleY: number[] = [];
  private _cardCurrentOpacity: number[] = [];
  /** Per-card target values for interpolation */
  private _cardTargetLeft: number[] = [];
  private _cardTargetTop: number[] = [];
  private _cardTargetScaleX: number[] = [];
  private _cardTargetScaleY: number[] = [];
  private _cardTargetOpacity: number[] = [];
  private _cardTargetZIndex: number[] = [];

  // Carousel layout constants (larger cards)
  private readonly _carouselCanvasW: number = 1800;
  private readonly _carouselCanvasH: number = 1800;
  private readonly _centerCardW: number = 864;
  private readonly _centerCardH: number = 1224;

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onCarouselUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this._carouselAnimating) return;
    if (!this.viewModel || !this.viewModel.carouselVisible) return;

    const dt = payload.deltaTime;
    const speed = this._carouselAnimSpeed;
    const count = this._carouselRelics.length;
    if (count === 0) return;

    // Lerp factor using exponential ease-out
    const t = 1.0 - Math.exp(-speed * dt);
    let allSettled = true;

    for (let i = 0; i < count; i++) {
      // Interpolate each property toward target
      this._cardCurrentLeft[i] += (this._cardTargetLeft[i] - this._cardCurrentLeft[i]) * t;
      this._cardCurrentTop[i] += (this._cardTargetTop[i] - this._cardCurrentTop[i]) * t;
      this._cardCurrentScaleX[i] += (this._cardTargetScaleX[i] - this._cardCurrentScaleX[i]) * t;
      this._cardCurrentScaleY[i] += (this._cardTargetScaleY[i] - this._cardCurrentScaleY[i]) * t;
      this._cardCurrentOpacity[i] += (this._cardTargetOpacity[i] - this._cardCurrentOpacity[i]) * t;

      // Check if settled (within threshold)
      if (Math.abs(this._cardTargetLeft[i] - this._cardCurrentLeft[i]) > 0.5 ||
          Math.abs(this._cardTargetScaleX[i] - this._cardCurrentScaleX[i]) > 0.005) {
        allSettled = false;
      }
    }

    // Push interpolated values into the ViewModel
    this._pushCarouselToViewModel();

    if (allSettled) {
      this._carouselAnimating = false;
      // Snap to final targets
      for (let i = 0; i < count; i++) {
        this._cardCurrentLeft[i] = this._cardTargetLeft[i];
        this._cardCurrentTop[i] = this._cardTargetTop[i];
        this._cardCurrentScaleX[i] = this._cardTargetScaleX[i];
        this._cardCurrentScaleY[i] = this._cardTargetScaleY[i];
        this._cardCurrentOpacity[i] = this._cardTargetOpacity[i];
      }
      this._pushCarouselToViewModel();
    }
  }

  /** Push current animated card values into ViewModel (creates new array for reactivity) */
  private _pushCarouselToViewModel(): void {
    if (!this.viewModel) return;
    const count = this._carouselRelics.length;
    const cards: RelicCarouselCardViewModel[] = [];

    for (let i = 0; i < count; i++) {
      const def = this._carouselRelics[i];
      const card = new RelicCarouselCardViewModel();
      card.relicId = def.id;
      card.relicName = def.name;
      card.relicDescription = def.description;
      card.icon = RELIC_ICONS[def.id] || null;
      card.cardWidth = this._centerCardW;
      card.cardHeight = this._centerCardH;
      card.cardLeft = this._cardCurrentLeft[i];
      card.cardTop = this._cardCurrentTop[i];
      card.cardScaleX = this._cardCurrentScaleX[i];
      card.cardScaleY = this._cardCurrentScaleY[i];
      card.cardOpacity = this._cardCurrentOpacity[i];
      card.cardZIndex = this._cardTargetZIndex[i];
      cards.push(card);
    }

    this.viewModel.carouselCards = cards;
  }

  @subscribe(UiEvents.relicCarouselTap, { execution: ExecuteOn.Owner })
  onRelicCarouselTap(payload: UiEvents.RelicCarouselTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const cmd = payload.parameter;

    if (cmd === 'open') {
      this._openCarousel();
    } else if (cmd === 'close') {
      this.viewModel.carouselVisible = false;
      this._carouselAnimating = false;
      console.log('[OverworldHud] Carousel closed');
    }
  }

  /** Swipe zone index where the finger went down (-1 = no active drag) */
  private _swipeDownZone: number = -1;

  @subscribe(UiEvents.relicCarouselSwipe, { execution: ExecuteOn.Owner })
  onRelicCarouselSwipe(payload: UiEvents.RelicCarouselSwipePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const cmd = payload.parameter;
    if (cmd.length < 2) return;

    const action = cmd.charAt(0); // 'd' = down, 'u' = up
    const zone = parseInt(cmd.charAt(1), 10);
    if (isNaN(zone)) return;

    if (action === 'd') {
      // Finger touched down on this zone
      this._swipeDownZone = zone;
    } else if (action === 'u') {
      // Finger lifted — compute delta from down zone
      if (this._swipeDownZone < 0) return;
      const delta = zone - this._swipeDownZone;
      this._swipeDownZone = -1;

      if (delta === 0) return; // tap in place — no navigation

      if (this._carouselRelics.length > 0) {
        if (delta > 0) {
          // Swiped right (finger moved from left to right) -> show previous card
          if (this._carouselIndex <= 0) {
            console.log(`[OverworldHud] Already at first card, cannot swipe right`);
            return;
          }
          this._carouselIndex = this._carouselIndex - 1;
          console.log(`[OverworldHud] Swipe right (prev) -> index ${this._carouselIndex}`);
        } else {
          // Swiped left (finger moved from right to left) -> show next card
          if (this._carouselIndex >= this._carouselRelics.length - 1) {
            console.log(`[OverworldHud] Already at last card, cannot swipe left`);
            return;
          }
          this._carouselIndex = this._carouselIndex + 1;
          console.log(`[OverworldHud] Swipe left (next) -> index ${this._carouselIndex}`);
        }
        this._computeCarouselTargets();
        this._carouselAnimating = true;
        this._updateCarouselDots();
      }
    }
  }

  /** Open the carousel overlay */
  private _openCarousel(): void {
    if (!this.viewModel) return;

    const activeIds = RelicService.get().getActiveRelicIds();
    this._carouselRelics = [];
    for (const id of activeIds) {
      const def = RELIC_DEFS.find(r => r.id === id);
      if (def) this._carouselRelics.push(def);
    }

    if (this._carouselRelics.length === 0) return;

    this._carouselIndex = 0;

    // Initialize animation arrays
    const count = this._carouselRelics.length;
    this._cardCurrentLeft = new Array(count).fill(0);
    this._cardCurrentTop = new Array(count).fill(0);
    this._cardCurrentScaleX = new Array(count).fill(0);
    this._cardCurrentScaleY = new Array(count).fill(0);
    this._cardCurrentOpacity = new Array(count).fill(0);
    this._cardTargetLeft = new Array(count).fill(0);
    this._cardTargetTop = new Array(count).fill(0);
    this._cardTargetScaleX = new Array(count).fill(0);
    this._cardTargetScaleY = new Array(count).fill(0);
    this._cardTargetOpacity = new Array(count).fill(0);
    this._cardTargetZIndex = new Array(count).fill(0);

    // Compute targets and snap to them instantly on open
    this._computeCarouselTargets();
    for (let i = 0; i < count; i++) {
      this._cardCurrentLeft[i] = this._cardTargetLeft[i];
      this._cardCurrentTop[i] = this._cardTargetTop[i];
      this._cardCurrentScaleX[i] = this._cardTargetScaleX[i];
      this._cardCurrentScaleY[i] = this._cardTargetScaleY[i];
      this._cardCurrentOpacity[i] = this._cardTargetOpacity[i];
    }

    this._pushCarouselToViewModel();
    this._updateCarouselDots();
    this.viewModel.carouselVisible = true;
    this._carouselAnimating = false;
    console.log(`[OverworldHud] Carousel opened with ${this._carouselRelics.length} relics`);
  }

  /** Compute target positions/scales for all cards based on current _carouselIndex */
  private _computeCarouselTargets(): void {
    const count = this._carouselRelics.length;
    if (count === 0) return;

    const canvasW = this._carouselCanvasW;
    const canvasH = this._carouselCanvasH;
    const centerX = canvasW / 2;
    const centerY = canvasH / 2;
    const cardW = this._centerCardW;
    const cardH = this._centerCardH;

    for (let i = 0; i < count; i++) {
      // Linear offset from center (no wrapping)
      const offset = i - this._carouselIndex;

      const absOffset = Math.abs(offset);

      // 3D carousel arc: cards follow a circular arc
      // Scale decreases with distance from center
      const scale = Math.max(0.45, 1.0 - absOffset * 0.28);
      // All cards at full opacity (no fading)
      const opacity = 1.0;
      // Horizontal shift with slight compression for distant cards
      const xShift = offset * 580;
      // Vertical arc: cards drop down as they move away from center (circular arc feel)
      const yShift = absOffset * absOffset * 20;
      // Z-index: center on top
      const zIndex = absOffset > 2 ? -1 : 100 - absOffset;

      this._cardTargetLeft[i] = centerX - cardW / 2 + xShift;
      this._cardTargetTop[i] = centerY - cardH / 2 + yShift;
      this._cardTargetScaleX[i] = scale;
      this._cardTargetScaleY[i] = scale;
      this._cardTargetOpacity[i] = opacity;
      this._cardTargetZIndex[i] = zIndex;
    }
  }

  /** Update dot indicators only (no card rebuild) */
  private _updateCarouselDots(): void {
    if (!this.viewModel) return;
    const count = this._carouselRelics.length;
    const dots: RelicCarouselDotViewModel[] = [];
    for (let i = 0; i < count; i++) {
      const dot = new RelicCarouselDotViewModel();
      if (i === this._carouselIndex) {
        dot.dotSize = 32;
        dot.dotColor = '#FFf5c518'; // gold
      } else {
        dot.dotSize = 24;
        dot.dotColor = '#88FFFFFF';
      }
      dots.push(dot);
    }
    this.viewModel.carouselDots = dots;
  }

  /** Refresh the relic button visibility from RelicService active relics. */
  private _refreshRelicIcons(): void {
    if (!this.viewModel) return;

    const activeIds = RelicService.get().getActiveRelicIds();
    this.viewModel.relicIconsVisible = activeIds.length > 0;

    // Close carousel if no relics remain
    if (activeIds.length === 0) {
      this.viewModel.carouselVisible = false;
    }
    console.log(`[OverworldHud] Refreshed relic button: ${activeIds.length} active`);
  }
}
