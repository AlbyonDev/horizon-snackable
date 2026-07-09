/**
 * OverworldHud — Level select screen ViewModel controller (winding path layout).
 *
 * Component Attachment: Scene entity (OverworldUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Displays a single winding S-curve path of level nodes positioned on a Canvas.
 * Nodes alternate left/right as you scroll down, connected by diagonal dirt-trail connectors.
 * Level 1 appears at the top (visible first), higher levels below (scroll down).
 * When a level is tapped, fires Events.LevelSelected with the chosen levelIndex.
 * Shows only during the Overworld GamePhase.
 *
 * Node size, spacing, and horizontal offset all scale dynamically based on totalLevels:
 *   1-5 levels  -> large nodes (~180-200px), generous spacing
 *   10-20 levels -> smaller nodes (~120-140px), tighter spacing
 *
 * Path connectors use a tiling/repeat strategy: the path segment pattern repeats
 * based on a configurable segmentLength rather than being stretched to fit.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  property,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase, UiEvents } from '../Types';

// ── Level Node sub-ViewModel ─────────────────────────────────────────────────────

@uiViewModel()
export class OverworldPathNodeViewModel extends UiViewModel {
  /** Canvas.Left position */
  posX: number = 0;
  /** Canvas.Top position */
  posY: number = 0;
  /** Display number */
  levelNumber: string = '1';
  /** Index as string for CommandParameter binding */
  levelIndex: string = '0';
  /** Whether this is a boss node (last level) */
  isBoss: boolean = false;
  /** Node size (boss nodes are larger) */
  nodeSize: number = 180;
  /** Font size for the level number text */
  fontSize: number = 72;
  /** Vertical offset margin for the level number (top,right,bottom,left format) */
  numberMargin: string = '0,0,0,0';
}

// ── Segment sub-ViewModel (one tile of the repeated path pattern) ────────────────

@uiViewModel()
export class OverworldPathSegmentViewModel extends UiViewModel {
  /** Width of this individual segment tile (px) */
  segmentWidth: number = 80;
  /** Height (thickness) of this segment tile (px) */
  segmentHeight: number = 36;
}

// ── Connector sub-ViewModel ──────────────────────────────────────────────────────

@uiViewModel()
export class OverworldPathConnectorViewModel extends UiViewModel {
  /** Canvas.Left position (midpoint X - width/2) */
  posX: number = 0;
  /** Canvas.Top position (midpoint Y - height/2) */
  posY: number = 0;
  /** Rotation angle in degrees */
  angle: number = 0;
  /** Width of the connector bar */
  connectorWidth: number = 100;
  /** Height (thickness) of the connector bar (px) */
  connectorThickness: number = 40;
  /** Repeated segment tiles to fill the connector length */
  segments: readonly OverworldPathSegmentViewModel[] = [];
}

// ── Main ViewModel ───────────────────────────────────────────────────────────────

@uiViewModel()
export class OverworldViewModel extends UiViewModel {
  override readonly events = {
    levelTap: UiEvents.overworldLevelTap,
  };

  visible: boolean = false;
  nodes: readonly OverworldPathNodeViewModel[] = [];
  connectors: readonly OverworldPathConnectorViewModel[] = [];
  canvasHeight: number = 800;
}

// ── Component ────────────────────────────────────────────────────────────────────

@component()
export class OverworldHud extends Component {
  /** Number of level buttons to display */
  @property() levelCount: number = 5;

  // ══════════════════════════════════════════════════════════════════════════════════
  // LAYOUT PROPERTIES — editable from the MHS properties panel
  // ══════════════════════════════════════════════════════════════════════════════════

  /** Width of the Canvas used for positioning nodes (px) */
  @property() canvasWidth: number = 900;
  /** Top padding before first node center (px) */
  @property() topPadding: number = 120;
  /** Bottom padding after last node center (px) */
  @property() bottomPadding: number = 120;

  /** Left-side node center X as a fraction of canvasWidth (0 = far left, 1 = far right) */
  @property() leftFraction: number = 0.35;
  /** Right-side node center X as a fraction of canvasWidth */
  @property() rightFraction: number = 0.65;

  /** Largest node diameter (px) — used when few levels are present */
  @property() maxNodeSize: number = 200;
  /** Smallest node diameter (px) — used when many levels are present */
  @property() minNodeSize: number = 120;

  /** Greatest vertical distance between node centers (px) — used with few levels */
  @property() maxVerticalSpacing: number = 240;
  /** Smallest vertical distance between node centers (px) — used with many levels */
  @property() minVerticalSpacing: number = 150;

  /** Scale multiplier applied to the last (boss) node relative to computed node size */
  @property() bossSizeMultiplier: number = 1.3;

  /** Level count at or below which nodes/spacing are at their maximum (largest) */
  @property() minLevelCountForScaling: number = 1;
  /** Level count at or above which nodes/spacing are at their minimum (smallest) */
  @property() maxLevelCountForScaling: number = 20;

  /** Font size for level numbers inside nodes (px) */
  @property() levelNumberFontSize: number = 72;

  /** Vertical offset of level number from node center (px, positive = down) */
  @property() levelNumberOffsetX: number = 0;

  /** Horizontal offset of level number from node center (px, positive = left) */
  @property() levelNumberOffsetZ: number = 0;

  /** Height of the connector bar between nodes (px) */
  @property() connectorHeight: number = 40;

  /** Length of one path segment tile (px). The pattern repeats to fill the connector. */
  @property() segmentLength: number = 80;

  /** Width (thickness) of the path segment connectors between nodes (px). */
  @property() segmentWidth: number = 36;

  // ══════════════════════════════════════════════════════════════════════════════════

  private viewModel: Maybe<OverworldViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide the native panel immediately to prevent XAML binding race
    // (unresolved bindings default to Visible, covering the screen)
    this.uiComponent.isVisible = false;

    this.viewModel = new OverworldViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this._populateLevels();
  }

  // ── Events ─────────────────────────────────────────────────────────────────────

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    const shouldShow = payload.phase === GamePhase.Overworld;
    this.viewModel.visible = shouldShow;
    if (this.uiComponent) this.uiComponent.isVisible = shouldShow;
  }

  @subscribe(UiEvents.overworldLevelTap, { execution: ExecuteOn.Owner })
  onLevelTap(payload: UiEvents.OverworldLevelTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;

    const levelIndex = parseInt(payload.parameter, 10);
    if (isNaN(levelIndex)) return;

    // No clamping needed — levels are procedurally generated to match levelCount
    console.log(`[OverworldHud] Level ${levelIndex + 1} selected`);

    // Hide ourselves
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;

    // Fire the LevelSelected event
    const p = new Events.LevelSelectedPayload();
    p.levelIndex = levelIndex;
    EventService.sendLocally(Events.LevelSelected, p);
  }

  // ── Private ────────────────────────────────────────────────────────────────────

  /**
   * Computes node size and vertical spacing based on total level count.
   * Fewer levels -> larger nodes and more generous spacing.
   * Many levels -> smaller nodes and tighter spacing.
   */
  private computeLayoutParams(totalLevels: number): { nodeSize: number; verticalSpacing: number } {
    const range = this.maxLevelCountForScaling - this.minLevelCountForScaling;
    const t = Math.max(0, Math.min(1, (totalLevels - this.minLevelCountForScaling) / range));

    // Node size: MAX at few levels -> MIN at many levels
    const nodeSize = Math.round(this.maxNodeSize - t * (this.maxNodeSize - this.minNodeSize));

    // Vertical spacing: MAX at few levels -> MIN at many levels
    const verticalSpacing = Math.round(this.maxVerticalSpacing - t * (this.maxVerticalSpacing - this.minVerticalSpacing));

    return { nodeSize, verticalSpacing };
  }

  /**
   * Builds the segment tiles array for a connector of a given length.
   * The pattern tile repeats at segmentLength intervals. The last tile may be
   * slightly smaller or larger to avoid gaps (distributes evenly).
   */
  private _buildSegments(connectorLength: number): OverworldPathSegmentViewModel[] {
    const segLen = Math.max(1, this.segmentLength);
    // Calculate how many tiles to fit — at least 1
    const count = Math.max(1, Math.round(connectorLength / segLen));
    // Distribute width evenly so there are no gaps or overflow
    const tileWidth = connectorLength / count;

    const segments: OverworldPathSegmentViewModel[] = [];
    for (let s = 0; s < count; s++) {
      const seg = new OverworldPathSegmentViewModel();
      seg.segmentWidth = tileWidth;
      seg.segmentHeight = this.segmentWidth;
      segments.push(seg);
    }
    return segments;
  }

  private _populateLevels(): void {
    const totalLevels = this.levelCount;

    // Dynamically compute sizing based on level count
    const { nodeSize, verticalSpacing } = this.computeLayoutParams(totalLevels);
    const bossNodeSize = Math.round(nodeSize * this.bossSizeMultiplier);

    // Compute node center positions along the S-curve
    const nodeCenters: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < totalLevels; i++) {
      // Alternate left and right: even indices (0,2,4) on left, odd (1,3,5) on right
      const isRight = i % 2 === 1;
      const centerX = isRight
        ? this.canvasWidth * this.rightFraction
        : this.canvasWidth * this.leftFraction;
      // Reversed: level 1 (i=0) at bottom, boss (last) at top
      const centerY = this.topPadding + (totalLevels - 1 - i) * verticalSpacing;
      nodeCenters.push({ x: centerX, y: centerY });
    }

    // Build node ViewModels
    const nodes: OverworldPathNodeViewModel[] = [];
    for (let i = 0; i < totalLevels; i++) {
      const node = new OverworldPathNodeViewModel();
      const isBoss = i === totalLevels - 1;
      const size = isBoss ? bossNodeSize : nodeSize;
      const half = size / 2;
      node.posX = nodeCenters[i].x - half;
      node.posY = nodeCenters[i].y - half;
      node.levelNumber = `${i + 1}`;
      node.levelIndex = `${i}`;
      node.isBoss = isBoss;
      node.nodeSize = size;
      node.fontSize = this.levelNumberFontSize;
      node.numberMargin = `0,${this.levelNumberOffsetX},${this.levelNumberOffsetZ},0`;
      nodes.push(node);
    }

    // Build connector ViewModels between consecutive nodes
    const connectors: OverworldPathConnectorViewModel[] = [];

    for (let i = 0; i < totalLevels - 1; i++) {
      const c1 = nodeCenters[i];
      const c2 = nodeCenters[i + 1];

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      // Midpoint between the two node centers
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;

      const connector = new OverworldPathConnectorViewModel();
      // Position the connector so its center aligns with the midpoint
      connector.posX = midX - length / 2;
      connector.posY = midY - this.connectorHeight / 2;
      connector.angle = angleDeg;
      connector.connectorWidth = length;
      connector.connectorThickness = this.connectorHeight;
      // Build repeating segment tiles for this connector
      connector.segments = this._buildSegments(length);
      connectors.push(connector);
    }

    // Compute total canvas height dynamically
    const canvasHeight = this.topPadding + (totalLevels - 1) * verticalSpacing + this.bottomPadding;

    if (this.viewModel) {
      this.viewModel.nodes = nodes;
      this.viewModel.connectors = connectors;
      this.viewModel.canvasHeight = canvasHeight;
    }
  }
}
