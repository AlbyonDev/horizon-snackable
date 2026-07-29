/**
 * SkillTreeHudController — ViewModel + Controller for the skill tree fullscreen overlay.
 *
 * Component Attachment: Scene entity (SkillTreeUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Listens for the OpenSkillTree local event (fired by OverworldHud when skull section is tapped).
 * Displays 3 branches × 3 tiers with purchase logic delegated to SkillTreeService.
 * On purchase, refreshes all node states and updates the skull count.
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
import { SKILL_BRANCHES, TOTAL_SKILLS } from '../Defs/SkillTreeDefs';
import type { ISkillBranchDef } from '../Defs/SkillTreeDefs';

// ── Local Events ────────────────────────────────────────────────────

export class OpenSkillTreePayload {}
export const OpenSkillTreeEvent = new LocalEvent<OpenSkillTreePayload>('EvOpenSkillTree', OpenSkillTreePayload);

// ── UiEvents ────────────────────────────────────────────────────────

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

// ── Sprite TextureAssets ────────────────────────────────────────────

const SPRITE_BOUGHT = new TextureAsset('@sprites/skilltree_node_bought.png');
const SPRITE_BUYABLE = new TextureAsset('@sprites/skilltree_node_buyable.png');
const SPRITE_LOCKED = new TextureAsset('@sprites/skilltree_node_locked.png');

// ── Colors ──────────────────────────────────────────────────────────

const COLOR_UNLOCKED_TEXT = '#FFf5c518';
const COLOR_AFFORDABLE_TEXT = '#CCFFFFFF';
const COLOR_LOCKED_TEXT = '#66FFFFFF';

// Cost overlay colors (gold when buyable, grey when locked/unaffordable)
const COLOR_COST_BUYABLE = '#FFf5c518';
const COLOR_COST_LOCKED = '#88888888';

// Line colors
const COLOR_LINE_UNLOCKED = '#FFf5c518';
const COLOR_LINE_LOCKED = '#44FFFFFF';

// ── Node labels (bonus descriptions from SkillTreeDefs) ─────────────

const NODE_LABELS: readonly string[] = [
  '+10% DMG', '+15% FIRE RATE', '+25% CRIT',
  '+2 LIVES', '+20% RANGE', '+5 LIVES',
  '+30 GOLD', '+25% WAVE GOLD', '+50% SELL',
];

const NODE_COSTS: readonly number[] = [3, 6, 10, 3, 6, 10, 3, 6, 10];

// ── ViewModel ───────────────────────────────────────────────────────

@uiViewModel()
export class SkillTreeViewModel extends UiViewModel {
  override readonly events = {
    skillTap: skillTapEvent,
    closeTap: closeTapEvent,
  };

  visible: boolean = false;
  skullCount: number = 0;

  // Per-node image source (TextureAsset for dynamic ImageBrush binding)
  node0Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node1Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node2Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node3Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node4Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node5Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node6Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node7Img: Maybe<TextureAsset> = SPRITE_LOCKED;
  node8Img: Maybe<TextureAsset> = SPRITE_LOCKED;

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

  // Per-node cost display (number or "OWNED")
  node0Cost: string = '3';
  node1Cost: string = '6';
  node2Cost: string = '10';
  node3Cost: string = '3';
  node4Cost: string = '6';
  node5Cost: string = '10';
  node6Cost: string = '3';
  node7Cost: string = '6';
  node8Cost: string = '10';

  // Per-node cost visibility (hidden when bought)
  node0CostVisible: boolean = true;
  node1CostVisible: boolean = true;
  node2CostVisible: boolean = true;
  node3CostVisible: boolean = true;
  node4CostVisible: boolean = true;
  node5CostVisible: boolean = true;
  node6CostVisible: boolean = true;
  node7CostVisible: boolean = true;
  node8CostVisible: boolean = true;

  // Per-node cost color (gold when buyable, grey when locked)
  node0CostColor: string = COLOR_COST_LOCKED;
  node1CostColor: string = COLOR_COST_LOCKED;
  node2CostColor: string = COLOR_COST_LOCKED;
  node3CostColor: string = COLOR_COST_LOCKED;
  node4CostColor: string = COLOR_COST_LOCKED;
  node5CostColor: string = COLOR_COST_LOCKED;
  node6CostColor: string = COLOR_COST_LOCKED;
  node7CostColor: string = COLOR_COST_LOCKED;
  node8CostColor: string = COLOR_COST_LOCKED;

  // Connecting line colors (between tiers in each branch)
  line01Color: string = COLOR_LINE_LOCKED;
  line12Color: string = COLOR_LINE_LOCKED;
  line34Color: string = COLOR_LINE_LOCKED;
  line45Color: string = COLOR_LINE_LOCKED;
  line67Color: string = COLOR_LINE_LOCKED;
  line78Color: string = COLOR_LINE_LOCKED;
}

// ── Component ───────────────────────────────────────────────────────

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

  /** Refresh all node images, labels, costs, line colors, and skull count. */
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

    // Update connecting line colors: gold if source node is unlocked, grey otherwise
    this.viewModel.line01Color = service.isUnlocked(0) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
    this.viewModel.line12Color = service.isUnlocked(1) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
    this.viewModel.line34Color = service.isUnlocked(3) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
    this.viewModel.line45Color = service.isUnlocked(4) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
    this.viewModel.line67Color = service.isUnlocked(6) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
    this.viewModel.line78Color = service.isUnlocked(7) ? COLOR_LINE_UNLOCKED : COLOR_LINE_LOCKED;
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
