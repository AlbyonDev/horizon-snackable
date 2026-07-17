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
import { OverworldNodeType } from '../Defs/NodeDefs';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
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

// —— Level Node sub-ViewModel ———————————————————————————————————————————

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
  /** Node type string: 'combat', 'boss', or 'minigame' — drives sprite visibility in XAML */
  nodeType: string = 'combat';
  /** Node size (boss nodes are larger) */
  nodeSize: number = 180;
  /** Font size for the level number text */
  fontSize: number = 72;
  /** Vertical offset margin for the level number (top,right,bottom,left format) */
  numberMargin: string = '0,0,0,0';
  /** Node state: "open", "beaten", or "locked" — drives sprite visibility in XAML */
  nodeState: string = 'locked';
  /** Whether this node is interactable (open or beaten) */
  isInteractable: boolean = false;
  /** Short modifier label for boss nodes (e.g. "×1.2 HP") */
  modifierLabel: string = '';
  /** Left margin for boss modifier badge (nodeSize + extra gap) */
  modifierMargin: string = '230,0,0,0';
  /** X offset for boss modifier badge RenderTransform (nodeSize + extra gap) */
  modifierOffsetX: number = 230;
}

// —— Segment sub-ViewModel (one tile of the repeated path pattern) ————————

@uiViewModel()
export class OverworldPathSegmentViewModel extends UiViewModel {
  /** Width of this individual segment tile (px) */
  segmentWidth: number = 80;
  /** Height (thickness) of this segment tile (px) */
  segmentHeight: number = 36;
}

// —— Connector sub-ViewModel ——————————————————————————————————————————————

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

// —— Main ViewModel ———————————————————————————————————————————————————————

// —— Relic Icon sub-ViewModel ——————————————————————————————————————

@uiViewModel()
export class OverworldRelicIconViewModel extends UiViewModel {
  /** Relic id used as CommandParameter */
  relicId: string = '';
  /** The relic icon texture */
  icon: Maybe<TextureAsset> = null;
}

// —— Main ViewModel ———————————————————————————————————————————————

@uiViewModel()
export class OverworldViewModel extends UiViewModel {
  override readonly events = {
    levelTap: UiEvents.overworldLevelTap,
    relicIconTap: UiEvents.overworldRelicIconTap,
  };

  visible: boolean = false;
  nodes: readonly OverworldPathNodeViewModel[] = [];
  connectors: readonly OverworldPathConnectorViewModel[] = [];
  canvasHeight: number = 800;
  backgroundImage: Maybe<TextureAsset> = null;

  // Relic icons
  relicIcons: readonly OverworldRelicIconViewModel[] = [];
  relicIconsVisible: boolean = false;

  // Relic popup
  relicPopupVisible: boolean = false;
  relicPopupName: string = '';
  relicPopupDescription: string = '';
  relicPopupMargin: string = '300,24,0,0';
}

// —— Component ————————————————————————————————————————————————————————————

@component()
export class OverworldHud extends Component {
  /** Number of level buttons to display */
  @property() levelCount: number = 5;

  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT PROPERTIES
  // ══════════════════════════════════════════════════════════════════════════

  @property() canvasWidth: number = 900;
  @property() topPadding: number = 120;
  @property() bottomPadding: number = 120;
  @property() leftFraction: number = 0.35;
  @property() rightFraction: number = 0.65;
  @property() maxNodeSize: number = 200;
  @property() minNodeSize: number = 120;
  @property() maxVerticalSpacing: number = 240;
  @property() minVerticalSpacing: number = 150;
  @property() bossSizeMultiplier: number = 1.3;
  @property() minLevelCountForScaling: number = 1;
  @property() maxLevelCountForScaling: number = 20;
  @property() levelNumberFontSize: number = 72;
  @property() levelNumberOffsetX: number = 0;
  @property() levelNumberOffsetZ: number = 0;
  @property() connectorHeight: number = 40;
  @property() segmentLength: number = 80;
  @property() segmentWidth: number = 36;

  // ══════════════════════════════════════════════════════════════════════════

  private viewModel: Maybe<OverworldViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  /** Per-level state tracking: index -> OverworldNodeState */
  private levelStates: OverworldNodeState[] = [];

  /** Buffered progress data if ProgressRestored fires before onStart completes */
  private pendingBeatenLevels: string = '';

  // —— Lifecycle ——————————————————————————————————————————————————————————

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

    // Apply any buffered progress that arrived before initialization
    if (this.pendingBeatenLevels) {
      console.log(`[OverworldHud] Applying buffered progress: ${this.pendingBeatenLevels}`);
      this._applyRestoredProgress(this.pendingBeatenLevels);
      this.pendingBeatenLevels = '';
    }
  }

  // —— Events ———————————————————————————————————————————————————————————————

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    const shouldShow = payload.phase === GamePhase.Overworld;
    this.viewModel.visible = shouldShow;
    if (this.uiComponent) this.uiComponent.isVisible = shouldShow;

    // Refresh node states when returning to overworld
    if (shouldShow) {
      this._refreshNodeStates();
      this._refreshRelicIcons();
    }
  }

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Owner })
  onLevelCompleted(payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const idx = payload.levelIndex;
    console.log(`[OverworldHud] Level ${idx + 1} completed`);

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

  @subscribe(Events.ProgressRestored, { execution: ExecuteOn.Owner })
  onProgressRestored(payload: Events.ProgressRestoredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!payload.beatenLevels) return;

    // If not yet initialized, buffer the data for later
    if (!this.viewModel || this.levelStates.length === 0) {
      console.log(`[OverworldHud] Buffering progress (not yet initialized): ${payload.beatenLevels}`);
      this.pendingBeatenLevels = payload.beatenLevels;
      return;
    }

    this._applyRestoredProgress(payload.beatenLevels);
  }

  /** Apply restored progress data to levelStates and refresh the UI */
  private _applyRestoredProgress(beatenLevelsJson: string): void {
    let beaten: boolean[] = [];
    try {
      beaten = JSON.parse(beatenLevelsJson);
    } catch {
      console.log('[OverworldHud] Failed to parse saved progress');
      return;
    }

    console.log(`[OverworldHud] Restoring progress: ${beatenLevelsJson}`);

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

    // If all levels are beaten, the last one stays beaten (no new open)
    if (!foundOpen) {
      console.log('[OverworldHud] All levels beaten!');
    }

    // Refresh the ViewModel
    this._refreshNodeStates();
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

    // Dismiss relic popup on any level tap
    this.viewModel.relicPopupVisible = false;

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

  // —— Private ————————————————————————————————————————————————————————————

  /** Initialize level states: first level open, rest locked */
  private _initLevelStates(): void {
    this.levelStates = [];
    for (let i = 0; i < this.levelCount; i++) {
      this.levelStates.push(i === 0 ? OverworldNodeState.Open : OverworldNodeState.Locked);
    }
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

  private computeLayoutParams(totalLevels: number): { nodeSize: number; verticalSpacing: number } {
    const range = this.maxLevelCountForScaling - this.minLevelCountForScaling;
    const t = Math.max(0, Math.min(1, (totalLevels - this.minLevelCountForScaling) / range));
    const nodeSize = Math.round(this.maxNodeSize - t * (this.maxNodeSize - this.minNodeSize));
    const verticalSpacing = Math.round(this.maxVerticalSpacing - t * (this.maxVerticalSpacing - this.minVerticalSpacing));
    return { nodeSize, verticalSpacing };
  }

  private _buildSegments(connectorLength: number): OverworldPathSegmentViewModel[] {
    const segLen = Math.max(1, this.segmentLength);
    const count = Math.max(1, Math.round(connectorLength / segLen));
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

  /** Assigned node types per level index */
  private nodeTypes: OverworldNodeType[] = [];

  /** Assign node types: last=Boss, one random middle=Minigame, rest=Combat */
  private _assignNodeTypes(totalLevels: number): void {
    this.nodeTypes = [];
    for (let i = 0; i < totalLevels; i++) {
      this.nodeTypes.push(OverworldNodeType.Combat);
    }
    // Last node is always Boss
    if (totalLevels > 0) {
      this.nodeTypes[totalLevels - 1] = OverworldNodeType.Boss;
    }
    // One random middle node is Minigame (not first, not last)
    if (totalLevels > 2) {
      const minigameIndex = 1 + Math.floor(Math.random() * (totalLevels - 2));
      this.nodeTypes[minigameIndex] = OverworldNodeType.Minigame;
      console.log(`[OverworldHud] Minigame node assigned to level ${minigameIndex + 1}`);
    }
  }

  private _populateLevels(): void {
    const totalLevels = this.levelCount;
    const { nodeSize, verticalSpacing } = this.computeLayoutParams(totalLevels);
    const bossNodeSize = Math.round(nodeSize * this.bossSizeMultiplier);

    // Assign node types
    this._assignNodeTypes(totalLevels);

    // Compute node center positions along the S-curve
    const nodeCenters: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < totalLevels; i++) {
      const isRight = i % 2 === 1;
      const centerX = isRight
        ? this.canvasWidth * this.rightFraction
        : this.canvasWidth * this.leftFraction;
      const centerY = this.topPadding + (totalLevels - 1 - i) * verticalSpacing;
      nodeCenters.push({ x: centerX, y: centerY });
    }

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

    // Build connector ViewModels between consecutive nodes
    const connectors: OverworldPathConnectorViewModel[] = [];
    for (let i = 0; i < totalLevels - 1; i++) {
      const c1 = nodeCenters[i];
      const c2 = nodeCenters[i + 1];
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;

      const connector = new OverworldPathConnectorViewModel();
      connector.posX = midX - length / 2;
      connector.posY = midY - this.connectorHeight / 2;
      connector.angle = angleDeg;
      connector.connectorWidth = length;
      connector.connectorThickness = this.connectorHeight;
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

  // —— Relic Icons ——————————————————————————————————————————————————

  @subscribe(UiEvents.overworldRelicIconTap, { execution: ExecuteOn.Owner })
  onRelicIconTap(payload: UiEvents.OverworldRelicIconTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const relicId = payload.parameter;

    // Dismiss on explicit dismiss or tap on popup card
    if (relicId === '__dismiss__') {
      this.viewModel.relicPopupVisible = false;
      console.log(`[OverworldHud] Relic popup dismissed`);
      return;
    }

    // If popup is already showing for this relic, dismiss it (toggle)
    if (this.viewModel.relicPopupVisible) {
      const currentDef = RELIC_DEFS.find(r => r.name === this.viewModel!.relicPopupName);
      if (currentDef && currentDef.id === relicId) {
        this.viewModel.relicPopupVisible = false;
        console.log(`[OverworldHud] Relic popup dismissed (toggle)`);
        return;
      }
    }

    // Show popup for the tapped relic
    const def = RELIC_DEFS.find(r => r.id === relicId);
    if (!def) return;

    // Calculate vertical offset based on which relic icon was tapped
    // Icons are 250px tall with 6px vertical margin (Margin="0,6") in a StackPanel starting at top margin 24
    // The StackPanel itself has Margin="32,24,0,0"
    const relicIndex = this.viewModel.relicIcons.findIndex(icon => icon.relicId === relicId);
    const iconHeight = 250;
    const iconVerticalMargin = 12; // 6px top + 6px bottom from Margin="0,6"
    const stackPanelTopMargin = 24;
    const popupTopOffset = stackPanelTopMargin + relicIndex * (iconHeight + iconVerticalMargin);
    // Position popup to the right of icons: left offset = 32 (stack margin) + 250 (icon width) + 16 (gap)
    const popupLeftOffset = 300;
    this.viewModel.relicPopupMargin = `${popupLeftOffset},${popupTopOffset},0,0`;

    this.viewModel.relicPopupName = def.name;
    this.viewModel.relicPopupDescription = def.description;
    this.viewModel.relicPopupVisible = true;
    console.log(`[OverworldHud] Relic popup shown: ${def.name} at index ${relicIndex}, topOffset=${popupTopOffset}`);
  }

  /** Refresh the relic icon list from RelicService active relics. */
  private _refreshRelicIcons(): void {
    if (!this.viewModel) return;

    const activeIds = RelicService.get().getActiveRelicIds();
    if (activeIds.length === 0) {
      this.viewModel.relicIcons = [];
      this.viewModel.relicIconsVisible = false;
      this.viewModel.relicPopupVisible = false;
      return;
    }

    const icons: OverworldRelicIconViewModel[] = [];
    for (const relicId of activeIds) {
      const def = RELIC_DEFS.find(r => r.id === relicId);
      if (!def) continue;
      const iconTexture = RELIC_ICONS[relicId];
      if (!iconTexture) continue;
      const vm = new OverworldRelicIconViewModel();
      vm.relicId = def.id;
      vm.icon = iconTexture;
      icons.push(vm);
    }

    this.viewModel.relicIcons = icons;
    this.viewModel.relicIconsVisible = icons.length > 0;
    this.viewModel.relicPopupVisible = false;
    console.log(`[OverworldHud] Refreshed relic icons: ${icons.length} active`);
  }
}
