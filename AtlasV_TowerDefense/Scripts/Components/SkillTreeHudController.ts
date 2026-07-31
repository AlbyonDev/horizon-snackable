/**
 * SkillTreeHudController — ViewModel + Controller for the skill tree fullscreen overlay.
 *
 * Component Attachment: Scene entity (SkillTreeUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Displays an organic tree layout with a root node at the fork point splitting into 3 curving
 * branches (War, Fortify, Fortune). The root node must be purchased first to unlock all branches.
 * Skill nodes are positioned along each branch bezier curve.
 * Uses the same Path Data binding approach as the Overworld map.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  LocalEvent,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  TextureAsset,
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';
import { SkillTreeService } from '../Services/SkillTreeService';
import { SaveService } from '../Services/SaveService';
import { SKILL_BRANCHES, TOTAL_SKILLS, ROOT_SKILL_INDEX } from '../Defs/SkillTreeDefs';

// ── Local Events ──────────────────────────────────────────────────────

export class OpenSkillTreePayload {}
export const OpenSkillTreeEvent = new LocalEvent<OpenSkillTreePayload>('EvOpenSkillTree', OpenSkillTreePayload);

// ── UiEvents ──────────────────────────────────────────────────────────

@serializable()
export class SkillTreeTapPayload {
  readonly parameter: string = '';
}

@serializable()
export class SkillTreeCloseTapPayload {
  readonly parameter: string = '';
}

const skillTapEvent = new UiEvent('SkillTreeViewModel-onSkillTap', SkillTreeTapPayload);
const closeTapEvent = new UiEvent('SkillTreeViewModel-onCloseTap', SkillTreeCloseTapPayload);

// ── Sprite TextureAssets ──────────────────────────────────────────────

const SPRITE_BOUGHT = new TextureAsset('@sprites/skilltree_node_bought.png');
const SPRITE_BUYABLE = new TextureAsset('@sprites/skilltree_node_buyable.png');
const SPRITE_LOCKED = new TextureAsset('@sprites/skilltree_node_locked.png');

// ── Colors ────────────────────────────────────────────────────────────

const COLOR_UNLOCKED_TEXT = '#FFf5c518';
const COLOR_AFFORDABLE_TEXT = '#CCFFFFFF';
const COLOR_LOCKED_TEXT = '#66FFFFFF';
const COLOR_COST_BUYABLE = '#FFf5c518';
const COLOR_COST_LOCKED = '#88888888';

// Branch colors
const COLOR_BRANCH_WAR_ACTIVE = '#FFAA3333';
const COLOR_BRANCH_WAR_LOCKED = '#44AA3333';
const COLOR_BRANCH_FORTIFY_ACTIVE = '#FF3366AA';
const COLOR_BRANCH_FORTIFY_LOCKED = '#443366AA';
const COLOR_BRANCH_FORTUNE_ACTIVE = '#FF33AA33';
const COLOR_BRANCH_FORTUNE_LOCKED = '#4433AA33';

// ── Node labels ──────────────────────────────────────────────────────

const NODE_LABELS: readonly string[] = [
  '+10% DMG', '+15% FIRE RATE', '+25% CRIT',
  '+2 LIVES', '+20% RANGE', '+5 LIVES',
  '+30 GOLD', '+25% WAVE GOLD', '+50% SELL',
  'UNLOCK TREE',
];

const NODE_COSTS: readonly number[] = [3, 6, 10, 3, 6, 10, 3, 6, 10, 1];

// ── Layout constants ──────────────────────────────────────────────────
// Canvas is 1080 wide. Tree grows from TOP downward (root node at top, branches below).

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1800;

// Root node position (the fork point where branches diverge)
const ROOT_NODE_X = 420; // Canvas.Left (centered: 420 + 120 = 540)
const ROOT_NODE_Y = 280; // Canvas.Top

// Fork point (where branches start — center of root node)
const FORK_X = 540;
const FORK_Y = 380;

// Node positions for each branch (x, y) — tree grows DOWNWARD so T1 is highest (lowest Y)
// Offset node X by -120 so the 240px-wide node StackPanel is visually centered
const NODE_HALF_W = 120;

// War branch (curves left-downward) — spreads toward left edge
const WAR_NODES: readonly [number, number][] = [
  [120, 620],   // T1 — centered at 240
  [70, 980],    // T2 — centered at 190
  [40, 1360],   // T3 — centered at 160, ~40px from left edge
];

// Fortify branch (center-downward with gentle curve) — centered at X ~540
const FORTIFY_NODES: readonly [number, number][] = [
  [420, 660],   // T1
  [400, 1020],  // T2
  [410, 1400],  // T3
];

// Fortune branch (curves right-downward) — spreads toward right edge
const FORTUNE_NODES: readonly [number, number][] = [
  [720, 620],   // T1 — centered at 840
  [770, 980],   // T2 — centered at 890
  [800, 1360],  // T3 — centered at 920, ~40px from right edge
];

// Branch header positions (above root node, indicating which branch is below)
const WAR_HEADER: [number, number] = [140, 100];
const FORTIFY_HEADER: [number, number] = [440, 100];
const FORTUNE_HEADER: [number, number] = [740, 100];

// ── Path computation helpers ──────────────────────────────────────────

/** Build a smooth bezier path through branch nodes (growing downward from fork/root node). */
function buildBranchPath(nodes: readonly [number, number][]): string {
  // Start at fork point (center of root node), curve downward through each node center
  const startX = FORK_X;
  const startY = FORK_Y;

  // Node centers (offset by half width and half height)
  const [n0x, n0y] = [nodes[0][0] + NODE_HALF_W, nodes[0][1] + 70];
  const [n1x, n1y] = [nodes[1][0] + NODE_HALF_W, nodes[1][1] + 70];
  const [n2x, n2y] = [nodes[2][0] + NODE_HALF_W, nodes[2][1] + 70];

  // Control points for smooth organic curves (growing downward)
  // Fork -> node 0
  const cp0_1x = startX + (n0x - startX) * 0.3;
  const cp0_1y = startY + 80;
  const cp0_2x = n0x - (n0x - startX) * 0.2;
  const cp0_2y = n0y - 120;

  // Node 0 -> node 1
  const cp1_1x = n0x + (n1x - n0x) * 0.1;
  const cp1_1y = n0y + 120;
  const cp1_2x = n1x - (n1x - n0x) * 0.1;
  const cp1_2y = n1y - 120;

  // Node 1 -> node 2
  const cp2_1x = n1x + (n2x - n1x) * 0.1;
  const cp2_1y = n1y + 120;
  const cp2_2x = n2x - (n2x - n1x) * 0.1;
  const cp2_2y = n2y - 120;

  return [
    `M ${startX} ${startY}`,
    `C ${cp0_1x} ${cp0_1y} ${cp0_2x} ${cp0_2y} ${n0x} ${n0y}`,
    `C ${cp1_1x} ${cp1_1y} ${cp1_2x} ${cp1_2y} ${n1x} ${n1y}`,
    `C ${cp2_1x} ${cp2_1y} ${cp2_2x} ${cp2_2y} ${n2x} ${n2y}`,
  ].join(' ');
}

// Pre-compute static path data (no trunk — branches start directly from root node)
const BRANCH_0_PATH_DATA = buildBranchPath(WAR_NODES);
const BRANCH_1_PATH_DATA = buildBranchPath(FORTIFY_NODES);
const BRANCH_2_PATH_DATA = buildBranchPath(FORTUNE_NODES);

// ── ViewModel ────────────────────────────────────────────────────────

@uiViewModel()
export class SkillTreeViewModel extends UiViewModel {
  override readonly events = {
    skillTap: skillTapEvent,
    closeTap: closeTapEvent,
  };

  visible: boolean = false;
  skullCount: number = 0;

  // Canvas dimensions
  canvasHeight: number = CANVAS_HEIGHT;

  // Branch path data (SVG path strings for XAML Path.Data binding) — no trunk
  branch0PathData: string = BRANCH_0_PATH_DATA;
  branch1PathData: string = BRANCH_1_PATH_DATA;
  branch2PathData: string = BRANCH_2_PATH_DATA;

  // Branch colors (active/locked based on unlock state)
  branch0Color: string = COLOR_BRANCH_WAR_LOCKED;
  branch1Color: string = COLOR_BRANCH_FORTIFY_LOCKED;
  branch2Color: string = COLOR_BRANCH_FORTUNE_LOCKED;

  // Branch header positions
  warHeaderX: number = WAR_HEADER[0];
  warHeaderY: number = WAR_HEADER[1];
  fortifyHeaderX: number = FORTIFY_HEADER[0];
  fortifyHeaderY: number = FORTIFY_HEADER[1];
  fortuneHeaderX: number = FORTUNE_HEADER[0];
  fortuneHeaderY: number = FORTUNE_HEADER[1];

  // Per-node canvas positions (top-left of the 240-wide node panel)
  node0X: number = WAR_NODES[0][0];
  node0Y: number = WAR_NODES[0][1];
  node1X: number = WAR_NODES[1][0];
  node1Y: number = WAR_NODES[1][1];
  node2X: number = WAR_NODES[2][0];
  node2Y: number = WAR_NODES[2][1];
  node3X: number = FORTIFY_NODES[0][0];
  node3Y: number = FORTIFY_NODES[0][1];
  node4X: number = FORTIFY_NODES[1][0];
  node4Y: number = FORTIFY_NODES[1][1];
  node5X: number = FORTIFY_NODES[2][0];
  node5Y: number = FORTIFY_NODES[2][1];
  node6X: number = FORTUNE_NODES[0][0];
  node6Y: number = FORTUNE_NODES[0][1];
  node7X: number = FORTUNE_NODES[1][0];
  node7Y: number = FORTUNE_NODES[1][1];
  node8X: number = FORTUNE_NODES[2][0];
  node8Y: number = FORTUNE_NODES[2][1];
  node9X: number = ROOT_NODE_X;
  node9Y: number = ROOT_NODE_Y;

  // Per-node image source
  node0Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node1Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node2Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node3Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node4Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node5Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node6Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node7Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node8Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node9Img: Maybe<TextureAsset> = SPRITE_BUYABLE;

  // Per-node text color
  node0Text: string = COLOR_LOCKED_TEXT;
  node1Text: string = COLOR_LOCKED_TEXT;
  node2Text: string = COLOR_LOCKED_TEXT;
  node3Text: string = COLOR_LOCKED_TEXT;
  node4Text: string = COLOR_LOCKED_TEXT;
  node5Text: string = COLOR_LOCKED_TEXT;
  node6Text: string = COLOR_LOCKED_TEXT;
  node7Text: string = COLOR_LOCKED_TEXT;
  node8Text: string = COLOR_LOCKED_TEXT;
  node9Text: string = COLOR_AFFORDABLE_TEXT;

  // Per-node bonus label
  node0Label: string = NODE_LABELS[0];
  node1Label: string = NODE_LABELS[1];
  node2Label: string = NODE_LABELS[2];
  node3Label: string = NODE_LABELS[3];
  node4Label: string = NODE_LABELS[4];
  node5Label: string = NODE_LABELS[5];
  node6Label: string = NODE_LABELS[6];
  node7Label: string = NODE_LABELS[7];
  node8Label: string = NODE_LABELS[8];
  node9Label: string = NODE_LABELS[9];

  // Per-node cost display
  node0Cost: string = '3';
  node1Cost: string = '6';
  node2Cost: string = '10';
  node3Cost: string = '3';
  node4Cost: string = '6';
  node5Cost: string = '10';
  node6Cost: string = '3';
  node7Cost: string = '6';
  node8Cost: string = '10';
  node9Cost: string = '1';

  // Per-node cost visibility
  node0CostVisible: boolean = true;
  node1CostVisible: boolean = true;
  node2CostVisible: boolean = true;
  node3CostVisible: boolean = true;
  node4CostVisible: boolean = true;
  node5CostVisible: boolean = true;
  node6CostVisible: boolean = true;
  node7CostVisible: boolean = true;
  node8CostVisible: boolean = true;
  node9CostVisible: boolean = true;

  // Per-node cost color
  node0CostColor: string = COLOR_COST_LOCKED;
  node1CostColor: string = COLOR_COST_LOCKED;
  node2CostColor: string = COLOR_COST_LOCKED;
  node3CostColor: string = COLOR_COST_LOCKED;
  node4CostColor: string = COLOR_COST_LOCKED;
  node5CostColor: string = COLOR_COST_LOCKED;
  node6CostColor: string = COLOR_COST_LOCKED;
  node7CostColor: string = COLOR_COST_LOCKED;
  node8CostColor: string = COLOR_COST_LOCKED;
  node9CostColor: string = COLOR_COST_BUYABLE;
}

// ── Component ────────────────────────────────────────────────────────

@component()
export class SkillTreeHudController extends Component {
  private viewModel: Maybe<SkillTreeViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;

    this.viewModel = new SkillTreeViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  /** Open the skill tree overlay (called via local event from OverworldHud). */
  @subscribe(OpenSkillTreeEvent, { execution: ExecuteOn.Owner })
  onOpenSkillTree(_p: OpenSkillTreePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this._refreshAllNodes();
    this.viewModel.visible = true;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    console.log('[SkillTreeHud] Opened');
  }

  /** Handle skill node tap. */
  @subscribe(skillTapEvent, { execution: ExecuteOn.Owner })
  onSkillTap(payload: SkillTreeTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const skillIndex = parseInt(payload.parameter, 10);
    if (isNaN(skillIndex) || skillIndex < 0 || skillIndex >= TOTAL_SKILLS) return;

    const service = SkillTreeService.get();
    if (service.purchase(skillIndex)) {
      console.log(`[SkillTreeHud] Purchased skill ${skillIndex}`);
      this._refreshAllNodes();
    } else {
      console.log(`[SkillTreeHud] Cannot purchase skill ${skillIndex}`);
    }
  }

  /** Handle close button tap. */
  @subscribe(closeTapEvent, { execution: ExecuteOn.Owner })
  onCloseTap(_payload: SkillTreeCloseTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
    console.log('[SkillTreeHud] Closed');
  }

  /** Refresh all node images, labels, costs, branch colors, and skull count. */
  private _refreshAllNodes(): void {
    if (!this.viewModel) return;
    const service = SkillTreeService.get();
    this.viewModel.skullCount = SaveService.get().getSkullCount();

    for (let i = 0; i < TOTAL_SKILLS; i++) {
      let img: TextureAsset;
      let text: string;
      let cost: string;
      let costVisible: boolean;
      let costColor: string;

      if (service.isUnlocked(i)) {
        img = SPRITE_BOUGHT;
        text = COLOR_UNLOCKED_TEXT;
        cost = 'OWNED';
        costVisible = false;
        costColor = COLOR_COST_BUYABLE;
      } else if (service.canPurchase(i)) {
        img = SPRITE_BUYABLE;
        text = COLOR_AFFORDABLE_TEXT;
        cost = `${NODE_COSTS[i]}`;
        costVisible = true;
        costColor = COLOR_COST_BUYABLE;
      } else {
        img = SPRITE_LOCKED;
        text = COLOR_LOCKED_TEXT;
        cost = `${NODE_COSTS[i]}`;
        costVisible = true;
        costColor = COLOR_COST_LOCKED;
      }

      this._setNodeStyle(i, img, text, cost, costVisible, costColor);
    }

    // Update branch colors: active if root is unlocked AND any node in that branch is unlocked
    const rootUnlocked = service.isRootUnlocked();
    const hasWar = rootUnlocked && (service.isUnlocked(0) || service.isUnlocked(1) || service.isUnlocked(2));
    const hasFortify = rootUnlocked && (service.isUnlocked(3) || service.isUnlocked(4) || service.isUnlocked(5));
    const hasFortune = rootUnlocked && (service.isUnlocked(6) || service.isUnlocked(7) || service.isUnlocked(8));

    this.viewModel.branch0Color = hasWar ? COLOR_BRANCH_WAR_ACTIVE : COLOR_BRANCH_WAR_LOCKED;
    this.viewModel.branch1Color = hasFortify ? COLOR_BRANCH_FORTIFY_ACTIVE : COLOR_BRANCH_FORTIFY_LOCKED;
    this.viewModel.branch2Color = hasFortune ? COLOR_BRANCH_FORTUNE_ACTIVE : COLOR_BRANCH_FORTUNE_LOCKED;
  }

  /** Set the style properties for a given node index on the ViewModel. */
  private _setNodeStyle(index: number, img: TextureAsset, text: string, cost: string, costVisible: boolean, costColor: string): void {
    if (!this.viewModel) return;
    const vm = this.viewModel as unknown as Record<string, unknown>;
    vm[`node${index}Img`] = img;
    vm[`node${index}Text`] = text;
    vm[`node${index}Cost`] = cost;
    vm[`node${index}CostVisible`] = costVisible;
    vm[`node${index}CostColor`] = costColor;
  }
}
