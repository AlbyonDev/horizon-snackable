/**
 * SkillTreeHudController — ViewModel + Controller for the skill tree fullscreen overlay.
 *
 * Component Attachment: Scene entity (SkillTreeUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Data-driven approach: 31 nodes (1 root + 10 tiers × 3 branches).
 * All node positions, labels, costs, and connections are derived from SKILL_NODES/SKILL_CONNECTIONS.
 * The ViewModel exposes indexed properties (node0X..node39X) for XAML binding.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  LocalEvent,
  TextureAsset,
  component,
  property,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';
import { SkillTreeService } from '../Services/SkillTreeService';
import { SaveService } from '../Services/SaveService';
import {
  SKILL_NODES,
  SKILL_CONNECTIONS,
  TOTAL_SKILLS,
  ROOT_SKILL_INDEX,
  INFINITE_SKILL_NODES,
  SkillIconType,
  SkillTag,
} from '../Defs/SkillTreeDefs';

// Tower unlock node to texture path mapping (tags used for detection only)

// ── Icon path helper ─────────────────────────────────────────────────────────



// ── Local Events ─────────────────────────────────────────────────────────────

export class OpenSkillTreePayload {}
export const OpenSkillTreeEvent = new LocalEvent<OpenSkillTreePayload>('EvOpenSkillTree', OpenSkillTreePayload);

// ── UiEvents ─────────────────────────────────────────────────────────────────

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

@serializable()
export class SkillTreeReturnTapPayload {
  readonly parameter: string = '';
}

@serializable()
export class SkillTreeBuyTapPayload {
  readonly parameter: string = '';
}

@serializable()
export class SkillTreeDebugResetTapPayload {
  readonly parameter: string = '';
}

@serializable()
export class SkillTreeDebugSkullsTapPayload {
  readonly parameter: string = '';
}

const returnTapEvent = new UiEvent('SkillTreeViewModel-onReturnTap', SkillTreeReturnTapPayload);
const buyTapEvent = new UiEvent('SkillTreeViewModel-onBuyTap', SkillTreeBuyTapPayload);
const debugResetTapEvent = new UiEvent('SkillTreeViewModel-onDebugResetTap', SkillTreeDebugResetTapPayload);
const debugSkullsTapEvent = new UiEvent('SkillTreeViewModel-onDebugSkullsTap', SkillTreeDebugSkullsTapPayload);

// ── Colors ───────────────────────────────────────────────────────────────────

// Visual hierarchy: Buyable=vibrant, Locked=dim/gray, Bought=super faded/washed out
// BUYABLE — full color, vibrant gold (the only nodes that pop)
const COLOR_BORDER_BUYABLE = '#FFf5c518';
const COLOR_TEXT_BUYABLE = '#FFf5c518';
const COLOR_ICON_BUYABLE = '#FFF5E6D0';
const COLOR_COST_BUYABLE = '#FFf5c518';
// LOCKED — grayed out, dim (not yet available)
const COLOR_BORDER_LOCKED = '#44777788';
const COLOR_TEXT_LOCKED = '#44AAAAAA';
const COLOR_ICON_LOCKED = '#44777788';
const COLOR_COST_LOCKED = '#44777788';

// BOUGHT — heavily dimmed/desaturated (clearly spent/inactive, full opacity)
const COLOR_BORDER_BOUGHT = '#FF2A2A2A';
const COLOR_TEXT_BOUGHT = '#FF222222';
const COLOR_ICON_BOUGHT = '#FF2A2A2A';
const COLOR_COST_BOUGHT = '#FF222222';

// UNAFFORDABLE — prereqs met but not enough skulls (cost shown in red)
const COLOR_COST_UNAFFORDABLE = '#FFFF3333';

// INFINITE nodes — teal ring to distinguish from normal one-time nodes
const COLOR_BORDER_INFINITE_BUYABLE = '#FF00CED1';
const COLOR_BORDER_INFINITE_OWNED = '#FF008B8B';
const COLOR_TEXT_INFINITE = '#FF00CED1';
const COLOR_ICON_INFINITE = '#FF00CED1';

const COLOR_CONNECTION_ACTIVE = '#AAF5E6D0';
const COLOR_CONNECTION_LOCKED = '#33777788';

// Root node states
const COLOR_ROOT_BORDER_BUYABLE = '#FFf5c518';
const COLOR_ROOT_RUNE_BUYABLE = '#FFf5c518';
const COLOR_ROOT_BORDER_LOCKED = '#44777788';
const COLOR_ROOT_RUNE_LOCKED = '#33f5c518';
const COLOR_ROOT_BORDER_BOUGHT = '#FF2A2A2A';
const COLOR_ROOT_RUNE_BOUGHT = '#FF2A2A2A';

// ── Layout constants ─────────────────────────────────────────────────────────

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 3790; // 10 tiers at 270px spacing + root/header/padding + 350 top/bottom scroll padding

const NODE_HALF_W = 150;
const NODE_HALF_H = 65;

// Tier vertical spacing
const ROOT_Y = 380;
const TIER_START_Y = 760;
const TIER_SPACING = 270;

// Branch X positions (War=left, Fortify=center, Fortune=right)
const WAR_X = 50;
const FORTIFY_X = 450;
const FORTUNE_X = 750;

/**
 * Compute node positions dynamically based on branch and tier.
 * Returns [canvasLeft, canvasTop] for each node index 0-39.
 * Always produces 40 entries so ViewModel field initializers are safe
 * even if TOTAL_SKILLS < 40.
 */
function computeNodePositions(): [number, number][] {
  const VM_NODE_COUNT = 40; // ViewModel exposes node0..node39
  const positions: [number, number][] = new Array(VM_NODE_COUNT);

  // Initialize all slots to a safe default
  for (let k = 0; k < VM_NODE_COUNT; k++) {
    positions[k] = [0, 0];
  }

  // Root node
  positions[0] = [410, ROOT_Y];

  // Branch nodes: indices 1..(TOTAL_SKILLS-1)
  for (let i = 1; i < TOTAL_SKILLS; i++) {
    const tier = Math.ceil(i / 3); // 1-based tier (1..13)
    const branchMod = i % 3; // 1=war, 2=fortify, 0=fortune

    let x: number;
    if (branchMod === 1) x = WAR_X;
    else if (branchMod === 2) x = FORTIFY_X;
    else x = FORTUNE_X;

    // Add slight horizontal wave for visual interest
    const waveOffset = (tier % 2 === 0) ? 20 : -10;
    x += waveOffset;

    const y = TIER_START_Y + (tier - 1) * TIER_SPACING;
    positions[i] = [x, y];
  }

  return positions;
}

const NODE_POSITIONS: readonly [number, number][] = computeNodePositions();

// Branch header positions
const WAR_HEADER: [number, number] = [120, 620];
const FORTIFY_HEADER: [number, number] = [440, 650];
const FORTUNE_HEADER: [number, number] = [760, 620];

// ── Connection rendering ─────────────────────────────────────────────────────

const MAX_CONNECTIONS = 60;

function getNodeCenter(index: number): [number, number] {
  const pos = NODE_POSITIONS[index];
  return [pos[0] + NODE_HALF_W, pos[1] + NODE_HALF_H];
}

function buildConnectionPath(fromIndex: number, toIndex: number): string {
  const [fx, fy] = getNodeCenter(fromIndex);
  const [tx, ty] = getNodeCenter(toIndex);

  const dx = tx - fx;
  const dy = ty - fy;

  const isVertical = Math.abs(dy) > Math.abs(dx);

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

  if (isVertical) {
    cp1x = fx + dx * 0.2;
    cp1y = fy + dy * 0.35;
    cp2x = tx - dx * 0.2;
    cp2y = ty - dy * 0.35;
  } else {
    const midY = (fy + ty) * 0.5;
    cp1x = fx + dx * 0.3;
    cp1y = midY - 30;
    cp2x = fx + dx * 0.7;
    cp2y = midY + 30;
  }

  return `M ${fx} ${fy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${tx} ${ty}`;
}

function buildAllConnectionPaths(): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  for (const [from, to] of SKILL_CONNECTIONS) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const key = `${lo}-${hi}`;
    if (seen.has(key)) continue;
    seen.add(key);

    paths.push(buildConnectionPath(from, to));
  }

  return paths;
}

const ALL_CONNECTION_PATHS = buildAllConnectionPaths();

// ── Short labels for UI ─────────────────────────────────────────────────────

function getNodeLabel(index: number): string {
  const node = SKILL_NODES.find(n => n.index === index);
  if (!node) return '';
  // Show cost with skull emoji for unpurchased nodes
  return `\u{1F480} ${node.cost}`;
}

function getNodeCost(index: number): number {
  const node = SKILL_NODES.find(n => n.index === index);
  return node ? node.cost : 0;
}

// ── ViewModel ────────────────────────────────────────────────────────────────

@uiViewModel()
export class SkillTreeViewModel extends UiViewModel {
  override readonly events = {
    skillTap: skillTapEvent,
    closeTap: closeTapEvent,
    returnTap: returnTapEvent,
    buyTap: buyTapEvent,
    debugResetTap: debugResetTapEvent,
    debugSkullsTap: debugSkullsTapEvent,
  };

  visible: boolean = false;
  skullCount: number = 0;
  canvasHeight: number = CANVAS_HEIGHT;
  debugVisible: boolean = false;

  // Popup state
  popupVisible: boolean = false;
  popupDescription: string = '';
  popupDetailText: string = '';
  popupInfiniteTextVisible: boolean = false;
  popupCost: string = '';
  popupCostVisible: boolean = false;
  popupBuyVisible: boolean = true;

  // Tower unlock popup (two-column layout)
  popupIsTowerUnlock: boolean = false;
  popupIsNotTowerUnlock: boolean = true;
  popupTowerImage: Maybe<TextureAsset> = null;

  // Branch header positions
  warHeaderX: number = WAR_HEADER[0];
  warHeaderY: number = WAR_HEADER[1];
  fortifyHeaderX: number = FORTIFY_HEADER[0];
  fortifyHeaderY: number = FORTIFY_HEADER[1];
  fortuneHeaderX: number = FORTUNE_HEADER[0];
  fortuneHeaderY: number = FORTUNE_HEADER[1];

  // Connection paths (up to MAX_CONNECTIONS)
  conn0Data: string = ''; conn0Color: string = COLOR_CONNECTION_LOCKED;
  conn1Data: string = ''; conn1Color: string = COLOR_CONNECTION_LOCKED;
  conn2Data: string = ''; conn2Color: string = COLOR_CONNECTION_LOCKED;
  conn3Data: string = ''; conn3Color: string = COLOR_CONNECTION_LOCKED;
  conn4Data: string = ''; conn4Color: string = COLOR_CONNECTION_LOCKED;
  conn5Data: string = ''; conn5Color: string = COLOR_CONNECTION_LOCKED;
  conn6Data: string = ''; conn6Color: string = COLOR_CONNECTION_LOCKED;
  conn7Data: string = ''; conn7Color: string = COLOR_CONNECTION_LOCKED;
  conn8Data: string = ''; conn8Color: string = COLOR_CONNECTION_LOCKED;
  conn9Data: string = ''; conn9Color: string = COLOR_CONNECTION_LOCKED;
  conn10Data: string = ''; conn10Color: string = COLOR_CONNECTION_LOCKED;
  conn11Data: string = ''; conn11Color: string = COLOR_CONNECTION_LOCKED;
  conn12Data: string = ''; conn12Color: string = COLOR_CONNECTION_LOCKED;
  conn13Data: string = ''; conn13Color: string = COLOR_CONNECTION_LOCKED;
  conn14Data: string = ''; conn14Color: string = COLOR_CONNECTION_LOCKED;
  conn15Data: string = ''; conn15Color: string = COLOR_CONNECTION_LOCKED;
  conn16Data: string = ''; conn16Color: string = COLOR_CONNECTION_LOCKED;
  conn17Data: string = ''; conn17Color: string = COLOR_CONNECTION_LOCKED;
  conn18Data: string = ''; conn18Color: string = COLOR_CONNECTION_LOCKED;
  conn19Data: string = ''; conn19Color: string = COLOR_CONNECTION_LOCKED;
  conn20Data: string = ''; conn20Color: string = COLOR_CONNECTION_LOCKED;
  conn21Data: string = ''; conn21Color: string = COLOR_CONNECTION_LOCKED;
  conn22Data: string = ''; conn22Color: string = COLOR_CONNECTION_LOCKED;
  conn23Data: string = ''; conn23Color: string = COLOR_CONNECTION_LOCKED;
  conn24Data: string = ''; conn24Color: string = COLOR_CONNECTION_LOCKED;
  conn25Data: string = ''; conn25Color: string = COLOR_CONNECTION_LOCKED;
  conn26Data: string = ''; conn26Color: string = COLOR_CONNECTION_LOCKED;
  conn27Data: string = ''; conn27Color: string = COLOR_CONNECTION_LOCKED;
  conn28Data: string = ''; conn28Color: string = COLOR_CONNECTION_LOCKED;
  conn29Data: string = ''; conn29Color: string = COLOR_CONNECTION_LOCKED;
  conn30Data: string = ''; conn30Color: string = COLOR_CONNECTION_LOCKED;
  conn31Data: string = ''; conn31Color: string = COLOR_CONNECTION_LOCKED;
  conn32Data: string = ''; conn32Color: string = COLOR_CONNECTION_LOCKED;
  conn33Data: string = ''; conn33Color: string = COLOR_CONNECTION_LOCKED;
  conn34Data: string = ''; conn34Color: string = COLOR_CONNECTION_LOCKED;
  conn35Data: string = ''; conn35Color: string = COLOR_CONNECTION_LOCKED;
  conn36Data: string = ''; conn36Color: string = COLOR_CONNECTION_LOCKED;
  conn37Data: string = ''; conn37Color: string = COLOR_CONNECTION_LOCKED;
  conn38Data: string = ''; conn38Color: string = COLOR_CONNECTION_LOCKED;
  conn39Data: string = ''; conn39Color: string = COLOR_CONNECTION_LOCKED;
  conn40Data: string = ''; conn40Color: string = COLOR_CONNECTION_LOCKED;
  conn41Data: string = ''; conn41Color: string = COLOR_CONNECTION_LOCKED;
  conn42Data: string = ''; conn42Color: string = COLOR_CONNECTION_LOCKED;
  conn43Data: string = ''; conn43Color: string = COLOR_CONNECTION_LOCKED;
  conn44Data: string = ''; conn44Color: string = COLOR_CONNECTION_LOCKED;
  conn45Data: string = ''; conn45Color: string = COLOR_CONNECTION_LOCKED;
  conn46Data: string = ''; conn46Color: string = COLOR_CONNECTION_LOCKED;
  conn47Data: string = ''; conn47Color: string = COLOR_CONNECTION_LOCKED;
  conn48Data: string = ''; conn48Color: string = COLOR_CONNECTION_LOCKED;
  conn49Data: string = ''; conn49Color: string = COLOR_CONNECTION_LOCKED;
  conn50Data: string = ''; conn50Color: string = COLOR_CONNECTION_LOCKED;
  conn51Data: string = ''; conn51Color: string = COLOR_CONNECTION_LOCKED;
  conn52Data: string = ''; conn52Color: string = COLOR_CONNECTION_LOCKED;
  conn53Data: string = ''; conn53Color: string = COLOR_CONNECTION_LOCKED;
  conn54Data: string = ''; conn54Color: string = COLOR_CONNECTION_LOCKED;
  conn55Data: string = ''; conn55Color: string = COLOR_CONNECTION_LOCKED;
  conn56Data: string = ''; conn56Color: string = COLOR_CONNECTION_LOCKED;
  conn57Data: string = ''; conn57Color: string = COLOR_CONNECTION_LOCKED;
  conn58Data: string = ''; conn58Color: string = COLOR_CONNECTION_LOCKED;
  conn59Data: string = ''; conn59Color: string = COLOR_CONNECTION_LOCKED;
  connectionCount: number = 0;

  // Per-node properties (40 nodes: positions, colors, labels, costs)
  // Per-node pulse visibility (true = buyable AND affordable, shows glow animation)
  node0PulseVisible: boolean = false;
  node1PulseVisible: boolean = false;
  node2PulseVisible: boolean = false;
  node3PulseVisible: boolean = false;
  node4PulseVisible: boolean = false;
  node5PulseVisible: boolean = false;
  node6PulseVisible: boolean = false;
  node7PulseVisible: boolean = false;
  node8PulseVisible: boolean = false;
  node9PulseVisible: boolean = false;
  node10PulseVisible: boolean = false;
  node11PulseVisible: boolean = false;
  node12PulseVisible: boolean = false;
  node13PulseVisible: boolean = false;
  node14PulseVisible: boolean = false;
  node15PulseVisible: boolean = false;
  node16PulseVisible: boolean = false;
  node17PulseVisible: boolean = false;
  node18PulseVisible: boolean = false;
  node19PulseVisible: boolean = false;
  node20PulseVisible: boolean = false;
  node21PulseVisible: boolean = false;
  node22PulseVisible: boolean = false;
  node23PulseVisible: boolean = false;
  node24PulseVisible: boolean = false;
  node25PulseVisible: boolean = false;
  node26PulseVisible: boolean = false;
  node27PulseVisible: boolean = false;
  node28PulseVisible: boolean = false;
  node29PulseVisible: boolean = false;
  node30PulseVisible: boolean = false;
  node31PulseVisible: boolean = false;
  node32PulseVisible: boolean = false;
  node33PulseVisible: boolean = false;
  node34PulseVisible: boolean = false;
  node35PulseVisible: boolean = false;
  node36PulseVisible: boolean = false;
  node37PulseVisible: boolean = false;
  node38PulseVisible: boolean = false;
  node39PulseVisible: boolean = false;

  // Node 0 (root - special)
  node0X: number = NODE_POSITIONS[0][0]; node0Y: number = NODE_POSITIONS[0][1];
  node0BorderColor: string = COLOR_ROOT_BORDER_BUYABLE;
  node0RuneColor: string = COLOR_ROOT_RUNE_BUYABLE;
  node0Text: string = COLOR_TEXT_BUYABLE;
  node0Label: string = '\u{1F480} 1';
  node0Cost: string = '1';
  node0CostVisible: boolean = false;
  node0CostColor: string = COLOR_COST_BUYABLE;

  // Nodes 1-39 (branch nodes)
  node1X: number = NODE_POSITIONS[1][0]; node1Y: number = NODE_POSITIONS[1][1];
  node1BorderColor: string = COLOR_BORDER_LOCKED; node1IconColor: string = COLOR_ICON_LOCKED;
  node1Text: string = COLOR_TEXT_LOCKED; node1Label: string = getNodeLabel(1);
  node1Cost: string = `${getNodeCost(1)}`; node1CostVisible: boolean = false; node1CostColor: string = COLOR_COST_LOCKED;

  node2X: number = NODE_POSITIONS[2][0]; node2Y: number = NODE_POSITIONS[2][1];
  node2BorderColor: string = COLOR_BORDER_LOCKED; node2IconColor: string = COLOR_ICON_LOCKED;
  node2Text: string = COLOR_TEXT_LOCKED; node2Label: string = getNodeLabel(2);
  node2Cost: string = `${getNodeCost(2)}`; node2CostVisible: boolean = false; node2CostColor: string = COLOR_COST_LOCKED;

  node3X: number = NODE_POSITIONS[3][0]; node3Y: number = NODE_POSITIONS[3][1];
  node3BorderColor: string = COLOR_BORDER_LOCKED; node3IconColor: string = COLOR_ICON_LOCKED;
  node3Text: string = COLOR_TEXT_LOCKED; node3Label: string = getNodeLabel(3);
  node3Cost: string = `${getNodeCost(3)}`; node3CostVisible: boolean = false; node3CostColor: string = COLOR_COST_LOCKED;

  node4X: number = NODE_POSITIONS[4][0]; node4Y: number = NODE_POSITIONS[4][1];
  node4BorderColor: string = COLOR_BORDER_LOCKED; node4IconColor: string = COLOR_ICON_LOCKED;
  node4Text: string = COLOR_TEXT_LOCKED; node4Label: string = getNodeLabel(4);
  node4Cost: string = `${getNodeCost(4)}`; node4CostVisible: boolean = false; node4CostColor: string = COLOR_COST_LOCKED;

  node5X: number = NODE_POSITIONS[5][0]; node5Y: number = NODE_POSITIONS[5][1];
  node5BorderColor: string = COLOR_BORDER_LOCKED; node5IconColor: string = COLOR_ICON_LOCKED;
  node5Text: string = COLOR_TEXT_LOCKED; node5Label: string = getNodeLabel(5);
  node5Cost: string = `${getNodeCost(5)}`; node5CostVisible: boolean = false; node5CostColor: string = COLOR_COST_LOCKED;

  node6X: number = NODE_POSITIONS[6][0]; node6Y: number = NODE_POSITIONS[6][1];
  node6BorderColor: string = COLOR_BORDER_LOCKED; node6IconColor: string = COLOR_ICON_LOCKED;
  node6Text: string = COLOR_TEXT_LOCKED; node6Label: string = getNodeLabel(6);
  node6Cost: string = `${getNodeCost(6)}`; node6CostVisible: boolean = false; node6CostColor: string = COLOR_COST_LOCKED;

  node7X: number = NODE_POSITIONS[7][0]; node7Y: number = NODE_POSITIONS[7][1];
  node7BorderColor: string = COLOR_BORDER_LOCKED; node7IconColor: string = COLOR_ICON_LOCKED;
  node7Text: string = COLOR_TEXT_LOCKED; node7Label: string = getNodeLabel(7);
  node7Cost: string = `${getNodeCost(7)}`; node7CostVisible: boolean = false; node7CostColor: string = COLOR_COST_LOCKED;

  node8X: number = NODE_POSITIONS[8][0]; node8Y: number = NODE_POSITIONS[8][1];
  node8BorderColor: string = COLOR_BORDER_LOCKED; node8IconColor: string = COLOR_ICON_LOCKED;
  node8Text: string = COLOR_TEXT_LOCKED; node8Label: string = getNodeLabel(8);
  node8Cost: string = `${getNodeCost(8)}`; node8CostVisible: boolean = false; node8CostColor: string = COLOR_COST_LOCKED;

  node9X: number = NODE_POSITIONS[9][0]; node9Y: number = NODE_POSITIONS[9][1];
  node9BorderColor: string = COLOR_BORDER_LOCKED; node9IconColor: string = COLOR_ICON_LOCKED;
  node9Text: string = COLOR_TEXT_LOCKED; node9Label: string = getNodeLabel(9);
  node9Cost: string = `${getNodeCost(9)}`; node9CostVisible: boolean = false; node9CostColor: string = COLOR_COST_LOCKED;

  node10X: number = NODE_POSITIONS[10][0]; node10Y: number = NODE_POSITIONS[10][1];
  node10BorderColor: string = COLOR_BORDER_LOCKED; node10IconColor: string = COLOR_ICON_LOCKED;
  node10Text: string = COLOR_TEXT_LOCKED; node10Label: string = getNodeLabel(10);
  node10Cost: string = `${getNodeCost(10)}`; node10CostVisible: boolean = false; node10CostColor: string = COLOR_COST_LOCKED;

  node11X: number = NODE_POSITIONS[11][0]; node11Y: number = NODE_POSITIONS[11][1];
  node11BorderColor: string = COLOR_BORDER_LOCKED; node11IconColor: string = COLOR_ICON_LOCKED;
  node11Text: string = COLOR_TEXT_LOCKED; node11Label: string = getNodeLabel(11);
  node11Cost: string = `${getNodeCost(11)}`; node11CostVisible: boolean = false; node11CostColor: string = COLOR_COST_LOCKED;

  node12X: number = NODE_POSITIONS[12][0]; node12Y: number = NODE_POSITIONS[12][1];
  node12BorderColor: string = COLOR_BORDER_LOCKED; node12IconColor: string = COLOR_ICON_LOCKED;
  node12Text: string = COLOR_TEXT_LOCKED; node12Label: string = getNodeLabel(12);
  node12Cost: string = `${getNodeCost(12)}`; node12CostVisible: boolean = false; node12CostColor: string = COLOR_COST_LOCKED;

  node13X: number = NODE_POSITIONS[13][0]; node13Y: number = NODE_POSITIONS[13][1];
  node13BorderColor: string = COLOR_BORDER_LOCKED; node13IconColor: string = COLOR_ICON_LOCKED;
  node13Text: string = COLOR_TEXT_LOCKED; node13Label: string = getNodeLabel(13);
  node13Cost: string = `${getNodeCost(13)}`; node13CostVisible: boolean = false; node13CostColor: string = COLOR_COST_LOCKED;

  node14X: number = NODE_POSITIONS[14][0]; node14Y: number = NODE_POSITIONS[14][1];
  node14BorderColor: string = COLOR_BORDER_LOCKED; node14IconColor: string = COLOR_ICON_LOCKED;
  node14Text: string = COLOR_TEXT_LOCKED; node14Label: string = getNodeLabel(14);
  node14Cost: string = `${getNodeCost(14)}`; node14CostVisible: boolean = false; node14CostColor: string = COLOR_COST_LOCKED;

  node15X: number = NODE_POSITIONS[15][0]; node15Y: number = NODE_POSITIONS[15][1];
  node15BorderColor: string = COLOR_BORDER_LOCKED; node15IconColor: string = COLOR_ICON_LOCKED;
  node15Text: string = COLOR_TEXT_LOCKED; node15Label: string = getNodeLabel(15);
  node15Cost: string = `${getNodeCost(15)}`; node15CostVisible: boolean = false; node15CostColor: string = COLOR_COST_LOCKED;

  node16X: number = NODE_POSITIONS[16][0]; node16Y: number = NODE_POSITIONS[16][1];
  node16BorderColor: string = COLOR_BORDER_LOCKED; node16IconColor: string = COLOR_ICON_LOCKED;
  node16Text: string = COLOR_TEXT_LOCKED; node16Label: string = getNodeLabel(16);
  node16Cost: string = `${getNodeCost(16)}`; node16CostVisible: boolean = false; node16CostColor: string = COLOR_COST_LOCKED;

  node17X: number = NODE_POSITIONS[17][0]; node17Y: number = NODE_POSITIONS[17][1];
  node17BorderColor: string = COLOR_BORDER_LOCKED; node17IconColor: string = COLOR_ICON_LOCKED;
  node17Text: string = COLOR_TEXT_LOCKED; node17Label: string = getNodeLabel(17);
  node17Cost: string = `${getNodeCost(17)}`; node17CostVisible: boolean = false; node17CostColor: string = COLOR_COST_LOCKED;

  node18X: number = NODE_POSITIONS[18][0]; node18Y: number = NODE_POSITIONS[18][1];
  node18BorderColor: string = COLOR_BORDER_LOCKED; node18IconColor: string = COLOR_ICON_LOCKED;
  node18Text: string = COLOR_TEXT_LOCKED; node18Label: string = getNodeLabel(18);
  node18Cost: string = `${getNodeCost(18)}`; node18CostVisible: boolean = false; node18CostColor: string = COLOR_COST_LOCKED;

  node19X: number = NODE_POSITIONS[19][0]; node19Y: number = NODE_POSITIONS[19][1];
  node19BorderColor: string = COLOR_BORDER_LOCKED; node19IconColor: string = COLOR_ICON_LOCKED;
  node19Text: string = COLOR_TEXT_LOCKED; node19Label: string = getNodeLabel(19);
  node19Cost: string = `${getNodeCost(19)}`; node19CostVisible: boolean = false; node19CostColor: string = COLOR_COST_LOCKED;

  node20X: number = NODE_POSITIONS[20][0]; node20Y: number = NODE_POSITIONS[20][1];
  node20BorderColor: string = COLOR_BORDER_LOCKED; node20IconColor: string = COLOR_ICON_LOCKED;
  node20Text: string = COLOR_TEXT_LOCKED; node20Label: string = getNodeLabel(20);
  node20Cost: string = `${getNodeCost(20)}`; node20CostVisible: boolean = false; node20CostColor: string = COLOR_COST_LOCKED;

  node21X: number = NODE_POSITIONS[21][0]; node21Y: number = NODE_POSITIONS[21][1];
  node21BorderColor: string = COLOR_BORDER_LOCKED; node21IconColor: string = COLOR_ICON_LOCKED;
  node21Text: string = COLOR_TEXT_LOCKED; node21Label: string = getNodeLabel(21);
  node21Cost: string = `${getNodeCost(21)}`; node21CostVisible: boolean = false; node21CostColor: string = COLOR_COST_LOCKED;

  node22X: number = NODE_POSITIONS[22][0]; node22Y: number = NODE_POSITIONS[22][1];
  node22BorderColor: string = COLOR_BORDER_LOCKED; node22IconColor: string = COLOR_ICON_LOCKED;
  node22Text: string = COLOR_TEXT_LOCKED; node22Label: string = getNodeLabel(22);
  node22Cost: string = `${getNodeCost(22)}`; node22CostVisible: boolean = false; node22CostColor: string = COLOR_COST_LOCKED;

  node23X: number = NODE_POSITIONS[23][0]; node23Y: number = NODE_POSITIONS[23][1];
  node23BorderColor: string = COLOR_BORDER_LOCKED; node23IconColor: string = COLOR_ICON_LOCKED;
  node23Text: string = COLOR_TEXT_LOCKED; node23Label: string = getNodeLabel(23);
  node23Cost: string = `${getNodeCost(23)}`; node23CostVisible: boolean = false; node23CostColor: string = COLOR_COST_LOCKED;

  node24X: number = NODE_POSITIONS[24][0]; node24Y: number = NODE_POSITIONS[24][1];
  node24BorderColor: string = COLOR_BORDER_LOCKED; node24IconColor: string = COLOR_ICON_LOCKED;
  node24Text: string = COLOR_TEXT_LOCKED; node24Label: string = getNodeLabel(24);
  node24Cost: string = `${getNodeCost(24)}`; node24CostVisible: boolean = false; node24CostColor: string = COLOR_COST_LOCKED;

  node25X: number = NODE_POSITIONS[25][0]; node25Y: number = NODE_POSITIONS[25][1];
  node25BorderColor: string = COLOR_BORDER_LOCKED; node25IconColor: string = COLOR_ICON_LOCKED;
  node25Text: string = COLOR_TEXT_LOCKED; node25Label: string = getNodeLabel(25);
  node25Cost: string = `${getNodeCost(25)}`; node25CostVisible: boolean = false; node25CostColor: string = COLOR_COST_LOCKED;

  node26X: number = NODE_POSITIONS[26][0]; node26Y: number = NODE_POSITIONS[26][1];
  node26BorderColor: string = COLOR_BORDER_LOCKED; node26IconColor: string = COLOR_ICON_LOCKED;
  node26Text: string = COLOR_TEXT_LOCKED; node26Label: string = getNodeLabel(26);
  node26Cost: string = `${getNodeCost(26)}`; node26CostVisible: boolean = false; node26CostColor: string = COLOR_COST_LOCKED;

  node27X: number = NODE_POSITIONS[27][0]; node27Y: number = NODE_POSITIONS[27][1];
  node27BorderColor: string = COLOR_BORDER_LOCKED; node27IconColor: string = COLOR_ICON_LOCKED;
  node27Text: string = COLOR_TEXT_LOCKED; node27Label: string = getNodeLabel(27);
  node27Cost: string = `${getNodeCost(27)}`; node27CostVisible: boolean = false; node27CostColor: string = COLOR_COST_LOCKED;

  node28X: number = NODE_POSITIONS[28][0]; node28Y: number = NODE_POSITIONS[28][1];
  node28BorderColor: string = COLOR_BORDER_LOCKED; node28IconColor: string = COLOR_ICON_LOCKED;
  node28Text: string = COLOR_TEXT_LOCKED; node28Label: string = getNodeLabel(28);
  node28Cost: string = `${getNodeCost(28)}`; node28CostVisible: boolean = false; node28CostColor: string = COLOR_COST_LOCKED;

  node29X: number = NODE_POSITIONS[29][0]; node29Y: number = NODE_POSITIONS[29][1];
  node29BorderColor: string = COLOR_BORDER_LOCKED; node29IconColor: string = COLOR_ICON_LOCKED;
  node29Text: string = COLOR_TEXT_LOCKED; node29Label: string = getNodeLabel(29);
  node29Cost: string = `${getNodeCost(29)}`; node29CostVisible: boolean = false; node29CostColor: string = COLOR_COST_LOCKED;

  node30X: number = NODE_POSITIONS[30][0]; node30Y: number = NODE_POSITIONS[30][1];
  node30BorderColor: string = COLOR_BORDER_LOCKED; node30IconColor: string = COLOR_ICON_LOCKED;
  node30Text: string = COLOR_TEXT_LOCKED; node30Label: string = getNodeLabel(30);
  node30Cost: string = `${getNodeCost(30)}`; node30CostVisible: boolean = false; node30CostColor: string = COLOR_COST_LOCKED;

  node31X: number = NODE_POSITIONS[31][0]; node31Y: number = NODE_POSITIONS[31][1];
  node31BorderColor: string = COLOR_BORDER_LOCKED; node31IconColor: string = COLOR_ICON_LOCKED;
  node31Text: string = COLOR_TEXT_LOCKED; node31Label: string = getNodeLabel(31);
  node31Cost: string = `${getNodeCost(31)}`; node31CostVisible: boolean = false; node31CostColor: string = COLOR_COST_LOCKED;

  node32X: number = NODE_POSITIONS[32][0]; node32Y: number = NODE_POSITIONS[32][1];
  node32BorderColor: string = COLOR_BORDER_LOCKED; node32IconColor: string = COLOR_ICON_LOCKED;
  node32Text: string = COLOR_TEXT_LOCKED; node32Label: string = getNodeLabel(32);
  node32Cost: string = `${getNodeCost(32)}`; node32CostVisible: boolean = false; node32CostColor: string = COLOR_COST_LOCKED;

  node33X: number = NODE_POSITIONS[33][0]; node33Y: number = NODE_POSITIONS[33][1];
  node33BorderColor: string = COLOR_BORDER_LOCKED; node33IconColor: string = COLOR_ICON_LOCKED;
  node33Text: string = COLOR_TEXT_LOCKED; node33Label: string = getNodeLabel(33);
  node33Cost: string = `${getNodeCost(33)}`; node33CostVisible: boolean = false; node33CostColor: string = COLOR_COST_LOCKED;

  node34X: number = NODE_POSITIONS[34][0]; node34Y: number = NODE_POSITIONS[34][1];
  node34BorderColor: string = COLOR_BORDER_LOCKED; node34IconColor: string = COLOR_ICON_LOCKED;
  node34Text: string = COLOR_TEXT_LOCKED; node34Label: string = getNodeLabel(34);
  node34Cost: string = `${getNodeCost(34)}`; node34CostVisible: boolean = false; node34CostColor: string = COLOR_COST_LOCKED;

  node35X: number = NODE_POSITIONS[35][0]; node35Y: number = NODE_POSITIONS[35][1];
  node35BorderColor: string = COLOR_BORDER_LOCKED; node35IconColor: string = COLOR_ICON_LOCKED;
  node35Text: string = COLOR_TEXT_LOCKED; node35Label: string = getNodeLabel(35);
  node35Cost: string = `${getNodeCost(35)}`; node35CostVisible: boolean = false; node35CostColor: string = COLOR_COST_LOCKED;

  node36X: number = NODE_POSITIONS[36][0]; node36Y: number = NODE_POSITIONS[36][1];
  node36BorderColor: string = COLOR_BORDER_LOCKED; node36IconColor: string = COLOR_ICON_LOCKED;
  node36Text: string = COLOR_TEXT_LOCKED; node36Label: string = getNodeLabel(36);
  node36Cost: string = `${getNodeCost(36)}`; node36CostVisible: boolean = false; node36CostColor: string = COLOR_COST_LOCKED;

  node37X: number = NODE_POSITIONS[37][0]; node37Y: number = NODE_POSITIONS[37][1];
  node37BorderColor: string = COLOR_BORDER_LOCKED; node37IconColor: string = COLOR_ICON_LOCKED;
  node37Text: string = COLOR_TEXT_LOCKED; node37Label: string = getNodeLabel(37);
  node37Cost: string = `${getNodeCost(37)}`; node37CostVisible: boolean = false; node37CostColor: string = COLOR_COST_LOCKED;

  node38X: number = NODE_POSITIONS[38][0]; node38Y: number = NODE_POSITIONS[38][1];
  node38BorderColor: string = COLOR_BORDER_LOCKED; node38IconColor: string = COLOR_ICON_LOCKED;
  node38Text: string = COLOR_TEXT_LOCKED; node38Label: string = getNodeLabel(38);
  node38Cost: string = `${getNodeCost(38)}`; node38CostVisible: boolean = false; node38CostColor: string = COLOR_COST_LOCKED;

  node39X: number = NODE_POSITIONS[39][0]; node39Y: number = NODE_POSITIONS[39][1];
  node39BorderColor: string = COLOR_BORDER_LOCKED; node39IconColor: string = COLOR_ICON_LOCKED;
  node39Text: string = COLOR_TEXT_LOCKED; node39Label: string = getNodeLabel(39);
  node39Cost: string = `${getNodeCost(39)}`; node39CostVisible: boolean = false; node39CostColor: string = COLOR_COST_LOCKED;

  // Per-node gray overlay opacity (0.88 when bought/grayed out, 0 otherwise — fully opaque node with dark overlay)
  node0IconOpacity: number = 0; node1IconOpacity: number = 0; node2IconOpacity: number = 0;
  node3IconOpacity: number = 0; node4IconOpacity: number = 0; node5IconOpacity: number = 0;
  node6IconOpacity: number = 0; node7IconOpacity: number = 0; node8IconOpacity: number = 0;
  node9IconOpacity: number = 0; node10IconOpacity: number = 0; node11IconOpacity: number = 0;
  node12IconOpacity: number = 0; node13IconOpacity: number = 0; node14IconOpacity: number = 0;
  node15IconOpacity: number = 0; node16IconOpacity: number = 0; node17IconOpacity: number = 0;
  node18IconOpacity: number = 0; node19IconOpacity: number = 0; node20IconOpacity: number = 0;
  node21IconOpacity: number = 0; node22IconOpacity: number = 0; node23IconOpacity: number = 0;
  node24IconOpacity: number = 0; node25IconOpacity: number = 0; node26IconOpacity: number = 0;
  node27IconOpacity: number = 0; node28IconOpacity: number = 0; node29IconOpacity: number = 0;
  node30IconOpacity: number = 0; node31IconOpacity: number = 0; node32IconOpacity: number = 0;
  node33IconOpacity: number = 0; node34IconOpacity: number = 0; node35IconOpacity: number = 0;
  node36IconOpacity: number = 0; node37IconOpacity: number = 0; node38IconOpacity: number = 0;
  node39IconOpacity: number = 0;

  // Per-node scale (0.8 when bought, 1.0 otherwise)
  node0Scale: number = 1; node1Scale: number = 1; node2Scale: number = 1;
  node3Scale: number = 1; node4Scale: number = 1; node5Scale: number = 1;
  node6Scale: number = 1; node7Scale: number = 1; node8Scale: number = 1;
  node9Scale: number = 1; node10Scale: number = 1; node11Scale: number = 1;
  node12Scale: number = 1; node13Scale: number = 1; node14Scale: number = 1;
  node15Scale: number = 1; node16Scale: number = 1; node17Scale: number = 1;
  node18Scale: number = 1; node19Scale: number = 1; node20Scale: number = 1;
  node21Scale: number = 1; node22Scale: number = 1; node23Scale: number = 1;
  node24Scale: number = 1; node25Scale: number = 1; node26Scale: number = 1;
  node27Scale: number = 1; node28Scale: number = 1; node29Scale: number = 1;
  node30Scale: number = 1; node31Scale: number = 1; node32Scale: number = 1;
  node33Scale: number = 1; node34Scale: number = 1; node35Scale: number = 1;
  node36Scale: number = 1; node37Scale: number = 1; node38Scale: number = 1;
  node39Scale: number = 1;
}

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class SkillTreeHudController extends Component {
  /** When false, the Reset Skill Tree and +1000 Skulls debug buttons are hidden. */
  @property()
  isDebug: boolean = false;

  private viewModel: Maybe<SkillTreeViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private pendingNodeIndex: number = -1;

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

  @subscribe(OpenSkillTreeEvent, { execution: ExecuteOn.Owner })
  onOpenSkillTree(_p: OpenSkillTreePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.debugVisible = this.isDebug;
    this._refreshAllNodes();
    this.viewModel.visible = true;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    console.log('[SkillTreeHud] Opened');
  }

  @subscribe(skillTapEvent, { execution: ExecuteOn.Owner })
  onSkillTap(payload: SkillTreeTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    const skillIndex = parseInt(payload.parameter, 10);
    if (isNaN(skillIndex) || skillIndex < 0 || skillIndex >= TOTAL_SKILLS) return;

    const service = SkillTreeService.get();
    const node = SKILL_NODES.find(n => n.index === skillIndex);
    if (!node) return;

    this.pendingNodeIndex = skillIndex;
    const isBought = service.isUnlocked(skillIndex);
    const isInfinite = INFINITE_SKILL_NODES.has(skillIndex);
    const infiniteCount = service.getInfiniteCount(skillIndex);

    // Detect tower-unlock nodes and set two-column popup layout
    const isTowerUnlock = node.iconType === SkillIconType.TowerUnlock;
    this.viewModel.popupIsTowerUnlock = isTowerUnlock;
    this.viewModel.popupIsNotTowerUnlock = !isTowerUnlock;
    if (isTowerUnlock) {
      this.viewModel.popupTowerImage = this._getTowerTexture(node.tag);
    } else {
      this.viewModel.popupTowerImage = null;
    }

    this.viewModel.popupDescription = node.label.toUpperCase();
    this.viewModel.popupInfiniteTextVisible = isInfinite;
    if (isInfinite && infiniteCount > 0) {
      this.viewModel.popupDetailText = `${node.description}\n\n\u2713 Purchased x${infiniteCount}`;
    } else {
      this.viewModel.popupDetailText = node.description;
    }
    if (isBought && !isInfinite) {
      this.viewModel.popupCost = 'BOUGHT!';
    } else {
      this.viewModel.popupCost = `\u{1F480} ${service.getCurrentCost(skillIndex)}`;
    }
    this.viewModel.popupCostVisible = true;
    this.viewModel.popupBuyVisible = (isInfinite && (service.canPurchase(skillIndex))) || (!isBought && service.canPurchase(skillIndex));
    this.viewModel.popupVisible = true;

    console.log(`[SkillTreeHud] Popup opened for node ${skillIndex}`);
  }

  @subscribe(returnTapEvent, { execution: ExecuteOn.Owner })
  onReturnTap(_payload: SkillTreeReturnTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.viewModel.popupVisible = false;
    this.pendingNodeIndex = -1;
    console.log('[SkillTreeHud] Popup closed (Return)');
  }

  @subscribe(buyTapEvent, { execution: ExecuteOn.Owner })
  onBuyTap(_payload: SkillTreeBuyTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    if (this.pendingNodeIndex < 0 || this.pendingNodeIndex >= TOTAL_SKILLS) return;

    const service = SkillTreeService.get();
    const purchasedIndex = this.pendingNodeIndex;
    if (service.purchase(purchasedIndex)) {
      console.log(`[SkillTreeHud] Purchased skill ${purchasedIndex}`);
      this._refreshAllNodes();

      // Notify other systems (e.g. OverworldHud biome arrows) that a skill was purchased
      const purchasePayload = new Events.SkillTreeNodePurchasedPayload();
      purchasePayload.skillIndex = purchasedIndex;
      EventService.sendLocally(Events.SkillTreeNodePurchased, purchasePayload);
    } else {
      console.log(`[SkillTreeHud] Cannot purchase skill ${purchasedIndex}`);
    }

    this.viewModel.popupVisible = false;
    this.pendingNodeIndex = -1;
  }

  @subscribe(closeTapEvent, { execution: ExecuteOn.Owner })
  onCloseTap(_payload: SkillTreeCloseTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
    console.log('[SkillTreeHud] Closed');
  }

  @subscribe(debugResetTapEvent, { execution: ExecuteOn.Owner })
  onDebugResetTap(_payload: SkillTreeDebugResetTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const save = SaveService.get();
    save.setSkillTreeState([]);
    save.setSkillTreeCounts({});
    save.resetSkulls();
    // Fire SaveRestored to re-initialize SkillTreeService with empty state
    const restorePayload = new Events.SaveRestoredPayload();
    restorePayload.skillTree = [];
    restorePayload.skillTreeCounts = {};
    restorePayload.skulls = 0;
    EventService.sendLocally(Events.SaveRestored, restorePayload);
    this._refreshAllNodes();
    console.log('[SkillTreeHud] DEBUG: Skill tree + skulls reset');
  }

  @subscribe(debugSkullsTapEvent, { execution: ExecuteOn.Owner })
  onDebugSkullsTap(_payload: SkillTreeDebugSkullsTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    SaveService.get().addSkulls(1000);
    this._refreshAllNodes();
    console.log('[SkillTreeHud] DEBUG: +1000 skulls');
  }

  private _refreshAllNodes(): void {
    if (!this.viewModel) return;
    const service = SkillTreeService.get();
    this.viewModel.skullCount = SaveService.get().getSkullCount();

    for (let i = 0; i < TOTAL_SKILLS; i++) {
      if (i === ROOT_SKILL_INDEX) {
        this._setRootNodeStyle(service);
      } else {
        this._setNodeStyle(i, service);
      }
    }

    this._refreshConnections(service);
  }

  private _refreshConnections(service: SkillTreeService): void {
    if (!this.viewModel) return;
    const vm = this.viewModel as unknown as Record<string, unknown>;

    const seen = new Set<string>();
    let connIdx = 0;

    for (const [from, to] of SKILL_CONNECTIONS) {
      if (connIdx >= MAX_CONNECTIONS) break;

      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isActive = service.isUnlocked(from) || service.isUnlocked(to);
      const color = isActive ? COLOR_CONNECTION_ACTIVE : COLOR_CONNECTION_LOCKED;

      vm[`conn${connIdx}Data`] = ALL_CONNECTION_PATHS[connIdx] ?? '';
      vm[`conn${connIdx}Color`] = color;
      connIdx++;
    }

    for (let i = connIdx; i < MAX_CONNECTIONS; i++) {
      vm[`conn${i}Data`] = '';
      vm[`conn${i}Color`] = COLOR_CONNECTION_LOCKED;
    }

    vm['connectionCount'] = connIdx;
  }

  private _setRootNodeStyle(service: SkillTreeService): void {
    if (!this.viewModel) return;

    if (service.isUnlocked(ROOT_SKILL_INDEX)) {
      this.viewModel.node0BorderColor = COLOR_ROOT_BORDER_BOUGHT;
      this.viewModel.node0RuneColor = COLOR_ROOT_RUNE_BOUGHT;
      this.viewModel.node0Text = COLOR_TEXT_BOUGHT;
      this.viewModel.node0Label = 'BOUGHT!';
      this.viewModel.node0Cost = 'OWNED';
      this.viewModel.node0CostVisible = false;
      this.viewModel.node0CostColor = COLOR_COST_BUYABLE;
      this.viewModel.node0PulseVisible = false;
      this.viewModel.node0IconOpacity = 0.88;
      this.viewModel.node0Scale = 0.8;
    } else if (service.canPurchase(ROOT_SKILL_INDEX)) {
      this.viewModel.node0BorderColor = COLOR_ROOT_BORDER_BUYABLE;
      this.viewModel.node0RuneColor = COLOR_ROOT_RUNE_BUYABLE;
      this.viewModel.node0Text = COLOR_TEXT_BUYABLE;
      this.viewModel.node0Label = `\u{1F480} ${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0Cost = `${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0CostVisible = true;
      this.viewModel.node0CostColor = COLOR_COST_BUYABLE;
      this.viewModel.node0PulseVisible = true;
      this.viewModel.node0IconOpacity = 0;
      this.viewModel.node0Scale = 1;
    } else if (service.hasPrerequisitesMet(ROOT_SKILL_INDEX)) {
      // Root prereqs always met — this means can't afford
      this.viewModel.node0BorderColor = COLOR_ROOT_BORDER_BUYABLE;
      this.viewModel.node0RuneColor = COLOR_ROOT_RUNE_BUYABLE;
      this.viewModel.node0Text = COLOR_TEXT_BUYABLE;
      this.viewModel.node0Label = `\u{1F480} ${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0Cost = `${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0CostVisible = true;
      this.viewModel.node0CostColor = COLOR_COST_UNAFFORDABLE;
      this.viewModel.node0PulseVisible = false;
      this.viewModel.node0IconOpacity = 0;
      this.viewModel.node0Scale = 1;
    } else {
      this.viewModel.node0BorderColor = COLOR_ROOT_BORDER_LOCKED;
      this.viewModel.node0RuneColor = COLOR_ROOT_RUNE_LOCKED;
      this.viewModel.node0Text = COLOR_TEXT_LOCKED;
      this.viewModel.node0Label = `\u{1F480} ${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0Cost = `${getNodeCost(ROOT_SKILL_INDEX)}`;
      this.viewModel.node0CostVisible = true;
      this.viewModel.node0CostColor = COLOR_COST_LOCKED;
      this.viewModel.node0PulseVisible = false;
      this.viewModel.node0IconOpacity = 0;
      this.viewModel.node0Scale = 1;
    }
  }

  private _setNodeStyle(index: number, service: SkillTreeService): void {
    if (!this.viewModel) return;
    const vm = this.viewModel as unknown as Record<string, unknown>;

    let borderColor: string;
    let iconColor: string;
    let text: string;
    let cost: string;
    let costVisible: boolean;
    let costColor: string;
    let pulseVisible: boolean;

    let label: string;

    const isInfinite = INFINITE_SKILL_NODES.has(index);
    const infiniteCount = service.getInfiniteCount(index);
    const currentCost = service.getCurrentCost(index);

    if (isInfinite && service.isUnlocked(index)) {
      // Infinite node that has been purchased at least once — show as re-buyable
      if (service.canPurchase(index)) {
        borderColor = COLOR_BORDER_INFINITE_BUYABLE;
        iconColor = COLOR_ICON_INFINITE;
        text = COLOR_TEXT_INFINITE;
        cost = `${currentCost}`;
        costVisible = true;
        costColor = COLOR_COST_BUYABLE;
        label = `\u2713 x${infiniteCount}`;
        pulseVisible = true;
      } else {
        // Owned but can't afford another purchase
        borderColor = COLOR_BORDER_INFINITE_OWNED;
        iconColor = COLOR_ICON_INFINITE;
        text = COLOR_TEXT_INFINITE;
        cost = `${currentCost}`;
        costVisible = true;
        costColor = COLOR_COST_UNAFFORDABLE;
        label = `\u2713 x${infiniteCount}`;
        pulseVisible = false;
      }
    } else if (service.isUnlocked(index)) {
      borderColor = COLOR_BORDER_BOUGHT;
      iconColor = COLOR_ICON_BOUGHT;
      text = COLOR_TEXT_BOUGHT;
      cost = 'OWNED';
      costVisible = false;
      costColor = COLOR_COST_BUYABLE;
      label = 'BOUGHT!';
      pulseVisible = false;
    } else if (service.canPurchase(index)) {
      borderColor = isInfinite ? COLOR_BORDER_INFINITE_BUYABLE : COLOR_BORDER_BUYABLE;
      iconColor = isInfinite ? COLOR_ICON_INFINITE : COLOR_ICON_BUYABLE;
      text = isInfinite ? COLOR_TEXT_INFINITE : COLOR_TEXT_BUYABLE;
      cost = `${currentCost}`;
      costVisible = true;
      costColor = COLOR_COST_BUYABLE;
      label = `\u{1F480} ${currentCost}`;
      pulseVisible = true;
    } else if (service.hasPrerequisitesMet(index)) {
      // Prereqs met but can't afford — show buyable appearance with RED cost
      borderColor = isInfinite ? COLOR_BORDER_INFINITE_BUYABLE : COLOR_BORDER_BUYABLE;
      iconColor = isInfinite ? COLOR_ICON_INFINITE : COLOR_ICON_BUYABLE;
      text = isInfinite ? COLOR_TEXT_INFINITE : COLOR_TEXT_BUYABLE;
      cost = `${currentCost}`;
      costVisible = true;
      costColor = COLOR_COST_UNAFFORDABLE;
      label = `\u{1F480} ${currentCost}`;
      pulseVisible = false;
    } else {
      borderColor = COLOR_BORDER_LOCKED;
      iconColor = COLOR_ICON_LOCKED;
      text = COLOR_TEXT_LOCKED;
      cost = `${currentCost}`;
      costVisible = true;
      costColor = COLOR_COST_LOCKED;
      label = `\u{1F480} ${currentCost}`;
      pulseVisible = false;
    }

    vm[`node${index}BorderColor`] = borderColor;
    vm[`node${index}IconColor`] = iconColor;
    vm[`node${index}Text`] = text;
    vm[`node${index}Label`] = label;
    vm[`node${index}Cost`] = cost;
    vm[`node${index}CostVisible`] = costVisible;
    vm[`node${index}CostColor`] = costColor;
    vm[`node${index}PulseVisible`] = pulseVisible;
    // Infinite nodes keep full opacity even when owned
    vm[`node${index}IconOpacity`] = (service.isUnlocked(index) && !isInfinite) ? 0.88 : 0;
    // Bought (non-infinite) nodes render at 80% scale
    vm[`node${index}Scale`] = (service.isUnlocked(index) && !isInfinite) ? 0.8 : 1;
  }

  /** Returns the correct TextureAsset for a tower-unlock node using static string literals. */
  private _getTowerTexture(tag: SkillTag): TextureAsset | null {
    switch (tag) {
      case SkillTag.UnlockPoison: return new TextureAsset('@Textures/poison_tower.png');
      case SkillTag.UnlockPillar: return new TextureAsset('@Textures/pillar_tower.png');
      case SkillTag.UnlockLaser: return new TextureAsset('@Textures/laser_tower.png');
      case SkillTag.UnlockFireCannon: return new TextureAsset('@Textures/fire_tower.png');
      case SkillTag.UnlockLightning: return new TextureAsset('@Textures/lightning_tower.png');
      case SkillTag.UnlockFrost: return new TextureAsset('@Textures/frost_tower.png');
      default: return null;
    }
  }
}
