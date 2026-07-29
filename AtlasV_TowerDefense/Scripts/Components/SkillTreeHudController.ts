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
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';
import { SkillTreeService } from '../Services/SkillTreeService';
import { SaveService } from '../Services/SaveService';
import { SKILL_BRANCHES, TOTAL_SKILLS } from '../Defs/SkillTreeDefs';

// ── Local Events ────────────────────────────────────────────────────────

export class OpenSkillTreePayload {}
export const OpenSkillTreeEvent = new LocalEvent<OpenSkillTreePayload>('EvOpenSkillTree', OpenSkillTreePayload);

// ── UiEvents ────────────────────────────────────────────────────────────

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

// ── Colors ──────────────────────────────────────────────────────────────

const COLOR_UNLOCKED_BG = '#FF1f2a1a';
const COLOR_UNLOCKED_BORDER = '#FFf5c518';
const COLOR_UNLOCKED_TEXT = '#FFf5c518';

const COLOR_AFFORDABLE_BG = '#FF1a1a2e';
const COLOR_AFFORDABLE_BORDER = '#88f5c518';
const COLOR_AFFORDABLE_TEXT = '#CCFFFFFF';

const COLOR_LOCKED_BG = '#FF0d0d1a';
const COLOR_LOCKED_BORDER = '#44FFFFFF';
const COLOR_LOCKED_TEXT = '#66FFFFFF';

// Line colors
const COLOR_LINE_UNLOCKED = '#FFf5c518';
const COLOR_LINE_LOCKED = '#44FFFFFF';

// ── ViewModel ───────────────────────────────────────────────────────────

@uiViewModel()
export class SkillTreeViewModel extends UiViewModel {
  override readonly events = {
    skillTap: skillTapEvent,
    closeTap: closeTapEvent,
  };

  visible: boolean = false;
  skullCount: number = 0;

  // Per-node styling (node0 through node8)
  node0Bg: string = COLOR_LOCKED_BG; node0Border: string = COLOR_LOCKED_BORDER; node0Text: string = COLOR_LOCKED_TEXT; node0Cost: string = '3';
  node1Bg: string = COLOR_LOCKED_BG; node1Border: string = COLOR_LOCKED_BORDER; node1Text: string = COLOR_LOCKED_TEXT; node1Cost: string = '6';
  node2Bg: string = COLOR_LOCKED_BG; node2Border: string = COLOR_LOCKED_BORDER; node2Text: string = COLOR_LOCKED_TEXT; node2Cost: string = '10';
  node3Bg: string = COLOR_LOCKED_BG; node3Border: string = COLOR_LOCKED_BORDER; node3Text: string = COLOR_LOCKED_TEXT; node3Cost: string = '3';
  node4Bg: string = COLOR_LOCKED_BG; node4Border: string = COLOR_LOCKED_BORDER; node4Text: string = COLOR_LOCKED_TEXT; node4Cost: string = '6';
  node5Bg: string = COLOR_LOCKED_BG; node5Border: string = COLOR_LOCKED_BORDER; node5Text: string = COLOR_LOCKED_TEXT; node5Cost: string = '10';
  node6Bg: string = COLOR_LOCKED_BG; node6Border: string = COLOR_LOCKED_BORDER; node6Text: string = COLOR_LOCKED_TEXT; node6Cost: string = '3';
  node7Bg: string = COLOR_LOCKED_BG; node7Border: string = COLOR_LOCKED_BORDER; node7Text: string = COLOR_LOCKED_TEXT; node7Cost: string = '6';
  node8Bg: string = COLOR_LOCKED_BG; node8Border: string = COLOR_LOCKED_BORDER; node8Text: string = COLOR_LOCKED_TEXT; node8Cost: string = '10';

  // Connecting line colors (between tiers in each branch)
  // War branch: line between T1→T2, T2→T3
  line01Color: string = COLOR_LINE_LOCKED;
  line12Color: string = COLOR_LINE_LOCKED;
  // Fortify branch: line between T1→T2, T2→T3
  line34Color: string = COLOR_LINE_LOCKED;
  line45Color: string = COLOR_LINE_LOCKED;
  // Fortune branch: line between T1→T2, T2→T3
  line67Color: string = COLOR_LINE_LOCKED;
  line78Color: string = COLOR_LINE_LOCKED;
}

// ── Component ───────────────────────────────────────────────────────────

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

  /** Refresh all node colors, line colors, and skull count. */
  private _refreshAllNodes(): void {
    if (!this.viewModel) return;
    const service = SkillTreeService.get();
    this.viewModel.skullCount = SaveService.get().getSkullCount();

    for (let i = 0; i < TOTAL_SKILLS; i++) {
      let bg: string;
      let border: string;
      let text: string;

      if (service.isUnlocked(i)) {
        bg = COLOR_UNLOCKED_BG;
        border = COLOR_UNLOCKED_BORDER;
        text = COLOR_UNLOCKED_TEXT;
      } else if (service.canPurchase(i)) {
        bg = COLOR_AFFORDABLE_BG;
        border = COLOR_AFFORDABLE_BORDER;
        text = COLOR_AFFORDABLE_TEXT;
      } else {
        bg = COLOR_LOCKED_BG;
        border = COLOR_LOCKED_BORDER;
        text = COLOR_LOCKED_TEXT;
      }

      this._setNodeStyle(i, bg, border, text);
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
  private _setNodeStyle(index: number, bg: string, border: string, text: string): void {
    if (!this.viewModel) return;
    const vm = this.viewModel as unknown as Record<string, unknown>;
    vm[`node${index}Bg`] = bg;
    vm[`node${index}Border`] = border;
    vm[`node${index}Text`] = text;
  }
}
