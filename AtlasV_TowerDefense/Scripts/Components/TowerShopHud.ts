/**
 * TowerShopHud — ViewModel controller for the tower purchase/manage bar at the bottom of the screen.
 *
 * Attached to: TowerShopUI entity in space.hstf (has CustomUiComponent → TowerShop.xaml).
 * Two tabs: TOWERS (buy new towers) and MANAGE (upgrade/sell placed towers).
 * MANAGE has three states: prompt ("Click on a placed tower"), actions (Upgrade/Sell), tree (skill tree).
 * Tapping a placed tower auto-switches to MANAGE tab with actions state.
 */
import {
  Component,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  NetworkingService,
  ExecuteOn,
  EventService,
  TextureAsset,
  UiEvent,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import type { ITowerDef } from '../Types';
import { TowerService } from '../Services/TowerService';
import { ResourceService } from '../Services/ResourceService';
import { SkillTreeService } from '../Services/SkillTreeService';
import { SaveService } from '../Services/SaveService';
import { TowerIcons } from '../Assets';
import { getBiomeModifierState } from '../Defs/BiomeModifierDefs';
import { SELL_RATIO } from '../Constants';

// Module-level UiEvent constants
const tabToggleEvent = new UiEvent('TowerShopViewModel-onTabToggle');

const TOWER_COLORS: Record<string, string> = {
  arrow:  '#552ecc71',
  cannon: '#55e67e22',
  frost:  '#5500bcd4',
  laser:  '#559b59b6',
  fire_cannon: '#55ff4500',
  lightning: '#553d9bdb',
  poison: '#5527ae60',
  pillar: '#556b7040',
  sniper: '#554a6a7a',
};

const TOWER_SECONDARY_COLORS: Record<string, string> = {
  arrow:  '#1a7a42',
  cannon: '#a85a18',
  frost:  '#007a8a',
  laser:  '#6a3a7d',
  fire_cannon: '#b33000',
  lightning: '#2a6b9e',
  poison: '#1a7a3e',
  pillar: '#4a5a38',
  sniper: '#2a4a5a',
};

const BIOME_ARROW_BUFF_ICON = new TextureAsset('@sprites/biome_arrow_buff.png');
const BIOME_ARROW_DEBUFF_ICON = new TextureAsset('@sprites/biome_arrow_debuff.png');

const UPGRADE_LABEL_COLORS: Record<string, string> = {
  'Damage':   '#ff4d4d',
  'Rate':     '#f9c74f',
  'Range':    '#4fc3f7',
  'Splash':   '#ff8c42',
  'Slow':     '#80deea',
  'Duration': '#b2ebf2',
  'Crit':     '#ce93d8',
};
const DEFAULT_UPGRADE_COLOR = '#FFf5c518';

const ROMAN = ['I', 'II', 'III'];
const toRoman = (tier: number): string => ROMAN[tier] ?? String(tier + 1);

const TOWER_ICON_MAP: Record<string, TextureAsset> = {
  arrow: TowerIcons.BallistaTower,
  cannon: TowerIcons.CanonTower,
  frost: TowerIcons.FrostTower,
  laser: TowerIcons.LaserTower,
  fire_cannon: TowerIcons.FireCanonTower,
  lightning: TowerIcons.LightningTower,
  poison: TowerIcons.PoisonTower,
  pillar: TowerIcons.PillarTower,
  sniper: TowerIcons.SniperTower,
};

@uiViewModel()
export class TowerShopItemViewModel extends UiViewModel {
  icon: Maybe<TextureAsset> = null;
  iconPath: string = '';
  name: string = '';
  cost: number = 0;
  state: string = 'affordable'; // "affordable" | "too_expensive"
  towerId: string = '';
  selected: boolean = false;
  towerColor: string = '#3a3a5a';
  secondaryColor: string = '#2a2a3a';
  biomeArrowVisible: boolean = false;
  biomeArrowIcon: Maybe<TextureAsset> = null;
}

@uiViewModel()
export class TowerShopViewModel extends UiViewModel {
  override readonly events = {
    towerTap: UiEvents.towerShopTap,
    tabToggle: tabToggleEvent,
    towersTabTap: UiEvents.towersTabTap,
    manageTabTap: UiEvents.manageTabTap,
    manageUpgradeButtonTap: UiEvents.manageUpgradeButtonTap,
    manageSellButtonTap: UiEvents.manageSellButtonTap,
    manageUpgradeChoiceTap: UiEvents.manageUpgradeChoiceTap,
    manageBackButtonTap: UiEvents.manageBackButtonTap,
  };

  items: readonly TowerShopItemViewModel[] = [];
  selectedTowerId: string = '';
  selectedCardIndex: number = 0;
  visible: boolean = true;
  contentOffsetX: number = 0;
  contentWidth: number = 0;
  slideOffsetY: number = 0;
  dragNormalized: number = 0;

  // Resource display
  goldDisplay: number = 0;
  livesDisplay: number = 0;

  // Tab state
  showTowersContent: boolean = true;
  showManageContent: boolean = false;
  towersTabActive: boolean = true;
  manageTabActive: boolean = false;

  // Manage mode states (prompt / actions / tree)
  showManagePrompt: boolean = false;
  showManageActions: boolean = false;
  showManageTree: boolean = false;

  // Manage tower info
  manageTowerName: string = '';
  manageSellValue: number = 0;

  // Rank I tower card (for tree view)
  manageTowerIcon: Maybe<TextureAsset> = null;
  manageTowerColor: string = '#3a3a5a';
  manageTowerSecondaryColor: string = '#2a2a3a';

  // Skill-tree upgrade nodes: 2 T2 + 2 dynamic T3
  treeT2AName: string = '';
  treeT2ACost: number = 0;
  treeT2AState: string = 'locked'; // available | purchased | locked | blocked
  treeT2BName: string = '';
  treeT2BCost: number = 0;
  treeT2BState: string = 'locked';
  treeT3AName: string = '';
  treeT3ACost: number = 0;
  treeT3AState: string = 'locked';
  treeT3BName: string = '';
  treeT3BCost: number = 0;
  treeT3BState: string = 'locked';

  // Per-node visual state properties (driven by _populateTreeNodes)
  // T2A visuals
  treeT2ABorderColor: string = '#FFf5c518';
  treeT2ABackgroundColor: string = '#FF2a1a0e';
  treeT2AOverlayVisible: boolean = false;
  treeT2ACheckVisible: boolean = false;
  treeT2ABoughtBgVisible: boolean = false;
  treeT2AOpacity: number = 1.0;
  treeT2ACostVisible: boolean = true;
  treeT2AIsPulsing: boolean = false;
  treeT2ACostColor: string = '#FFf5c518';
  // T2B visuals
  treeT2BBorderColor: string = '#FFf5c518';
  treeT2BBackgroundColor: string = '#FF2a1a0e';
  treeT2BOverlayVisible: boolean = false;
  treeT2BCheckVisible: boolean = false;
  treeT2BBoughtBgVisible: boolean = false;
  treeT2BOpacity: number = 1.0;
  treeT2BCostVisible: boolean = true;
  treeT2BIsPulsing: boolean = false;
  treeT2BCostColor: string = '#FFf5c518';
  // T3A visuals
  treeT3ABorderColor: string = '#FFf5c518';
  treeT3ABackgroundColor: string = '#FF2a1a0e';
  treeT3AOverlayVisible: boolean = false;
  treeT3ACheckVisible: boolean = false;
  treeT3ABoughtBgVisible: boolean = false;
  treeT3AOpacity: number = 1.0;
  treeT3AContentVisible: boolean = true;
  treeT3ACostVisible: boolean = true;
  treeT3AMysteryVisible: boolean = false;
  treeT3AIsPulsing: boolean = false;
  treeT3ACostColor: string = '#FFf5c518';
  // T3B visuals
  treeT3BBorderColor: string = '#FFf5c518';
  treeT3BBackgroundColor: string = '#FF2a1a0e';
  treeT3BOverlayVisible: boolean = false;
  treeT3BCheckVisible: boolean = false;
  treeT3BBoughtBgVisible: boolean = false;
  treeT3BOpacity: number = 1.0;
  treeT3BContentVisible: boolean = true;
  treeT3BCostVisible: boolean = true;
  treeT3BMysteryVisible: boolean = false;
  treeT3BIsPulsing: boolean = false;
  treeT3BCostColor: string = '#FFf5c518';

  // TS-driven pulse scale (bound to ScaleTransform in XAML)
  treeT2AScale: number = 1.0;
  treeT2BScale: number = 1.0;
  treeT3AScale: number = 1.0;
  treeT3BScale: number = 1.0;

  // Sell button breathing pulse
  sellButtonScale: number = 1.0;

  // Whether the selected tower has an upgrade tree (hides arrows/tier labels when false)
  hasUpgrades: boolean = true;

  // Placement mode label
  placingTowerName: string = '';
  isPlacingTower: boolean = false;

  // Toggle arrow tab text (▼ = expanded, ▲ = collapsed)
  toggleArrowText: string = '▼';

}

// Scroll constants
const CARD_SLOT_WIDTH = 400;
const VIEWPORT_WIDTH = 1080;
const CARD_EDGE_MARGIN = 30;
const SCROLL_LERP_SPEED = 10;
const SCROLL_SNAP_THRESHOLD = 0.5;
const SLIDE_DISTANCE = 920;
const SLIDE_LERP_SPEED = 12;
const SLIDE_SNAP_THRESHOLD = 1;
const MANUAL_HIDE_SLIDE_DISTANCE = 590;

// Drag constants
const DRAG_TAP_THRESHOLD = 15;
const DRAG_MOMENTUM_FRICTION = 0.92;
const DRAG_MOMENTUM_MIN_VELOCITY = 20;

@component()
export class TowerShopHud extends Component {
  private viewModel: Maybe<TowerShopViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private itemVMs: TowerShopItemViewModel[] = [];

  // Smooth scroll state
  private scrollTarget: number = 0;
  private scrollCurrent: number = 0;
  private isScrollAnimating: boolean = false;

  // Slide animation state
  private slideTarget: number = 0;
  private slideCurrent: number = 0;
  private isSlideAnimating: boolean = false;
  private hideOnSlideComplete: boolean = false;

  // Manual toggle state
  private isManuallyHidden: boolean = false;

  // Drag scrolling state
  private lastDragNormalized: number = 0;
  private isDragging: boolean = false;
  private dragFrameCount: number = 0;
  private dragTotalPixelsMoved: number = 0;
  private dragLastVelocity: number = 0;
  private momentumVelocity: number = 0;
  private isMomentumActive: boolean = false;

  // Pulse animation timer (shared across all nodes for sync)
  private pulseTime: number = 0;

  // Manage mode state
  private manageSelectedCol: number = 0;
  private manageSelectedRow: number = 0;
  private manageSelectedDefId: string = '';
  private manageSelectedChoices: number[] = [];
  private manageSelectedTier: number = 0;

  private _getScrollBounds(): [number, number] {
    const totalWidth = this.itemVMs.length * CARD_SLOT_WIDTH;
    const maxOffset = -CARD_EDGE_MARGIN;
    const minOffset = Math.min(-CARD_EDGE_MARGIN, -(totalWidth - CARD_EDGE_MARGIN - VIEWPORT_WIDTH));
    return [minOffset, maxOffset];
  }

  private _clampOffset(offset: number): number {
    const [min, max] = this._getScrollBounds();
    return Math.max(min, Math.min(max, offset));
  }

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;

    this.viewModel = new TowerShopViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this._populateTowers();
    this._updateAffordability(ResourceService.get().gold);
    this._updateBiomeArrows();

    // Initialize resource displays
    this.viewModel.goldDisplay = ResourceService.get().gold;
    this.viewModel.livesDisplay = ResourceService.get().lives;

    // Initialize scroll flush with left edge
    this.scrollTarget = -CARD_EDGE_MARGIN;
    this.scrollCurrent = -CARD_EDGE_MARGIN;
    this.viewModel.contentOffsetX = -CARD_EDGE_MARGIN;
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const dt = payload.deltaTime;

    // --- Drag/scroll disabled when panel is hidden ---
    const panelIsDown = this.isManuallyHidden || this.viewModel.isPlacingTower;
    if (panelIsDown) {
      // Kill any in-progress drag/momentum and keep lastDragNormalized in sync
      if (this.isDragging) this.isDragging = false;
      if (this.isMomentumActive) {
        this.isMomentumActive = false;
        this.momentumVelocity = 0;
      }
      this.isScrollAnimating = false;
      this.lastDragNormalized = this.viewModel.dragNormalized;
    } else {
      // --- Drag input processing ---
      const currentDragNorm = this.viewModel.dragNormalized;
      const dragDelta = currentDragNorm - this.lastDragNormalized;
      const dragDeltaPx = dragDelta * VIEWPORT_WIDTH;

      if (Math.abs(dragDelta) > 0.0001) {
        if (!this.isDragging) {
          this.isDragging = true;
          this.dragFrameCount = 0;
          this.dragTotalPixelsMoved = 0;
          this.dragLastVelocity = 0;
          this.isMomentumActive = false;
          this.isScrollAnimating = false;
        }
        this.dragFrameCount++;

        if (this.dragFrameCount > 1) {
          this.scrollCurrent += dragDeltaPx;
          this.scrollCurrent = this._clampOffset(this.scrollCurrent);
          this.dragTotalPixelsMoved += Math.abs(dragDeltaPx);
          if (dt > 0) {
            this.dragLastVelocity = dragDeltaPx / dt;
          }
        }
        this.lastDragNormalized = currentDragNorm;
        this.viewModel.contentOffsetX = this.scrollCurrent;
      } else if (this.isDragging) {
        this.isDragging = false;

        if (this.dragFrameCount <= 1 || this.dragTotalPixelsMoved < DRAG_TAP_THRESHOLD) {
          const viewportX = currentDragNorm * VIEWPORT_WIDTH;
          const contentX = viewportX - this.scrollCurrent;
          const cardIndex = Math.max(0, Math.min(this.itemVMs.length - 1, Math.floor(contentX / CARD_SLOT_WIDTH)));
          this._handleDragTap(cardIndex);
        } else {
          this.momentumVelocity = this.dragLastVelocity;
          this.isMomentumActive = Math.abs(this.momentumVelocity) > DRAG_MOMENTUM_MIN_VELOCITY;
        }
        this.dragFrameCount = 0;
        this.dragTotalPixelsMoved = 0;
      }

      // --- Momentum decay ---
      if (this.isMomentumActive && !this.isDragging) {
        this.scrollCurrent += this.momentumVelocity * dt;
        this.scrollCurrent = this._clampOffset(this.scrollCurrent);
        this.momentumVelocity *= Math.pow(DRAG_MOMENTUM_FRICTION, dt * 60);
        if (Math.abs(this.momentumVelocity) < DRAG_MOMENTUM_MIN_VELOCITY) {
          this.momentumVelocity = 0;
          this.isMomentumActive = false;
        }
        this.viewModel.contentOffsetX = this.scrollCurrent;
      }

      // --- Smooth scroll-to-card animation ---
      if (this.isScrollAnimating && !this.isDragging) {
        const t = 1 - Math.exp(-SCROLL_LERP_SPEED * dt);
        this.scrollCurrent = this.scrollCurrent + (this.scrollTarget - this.scrollCurrent) * t;
        this.scrollCurrent = this._clampOffset(this.scrollCurrent);

        if (Math.abs(this.scrollTarget - this.scrollCurrent) < SCROLL_SNAP_THRESHOLD) {
          this.scrollCurrent = this.scrollTarget;
          this.isScrollAnimating = false;
        }
        this.viewModel.contentOffsetX = this.scrollCurrent;
      }
    }

    // --- Upgrade node pulse animation ---
    this.pulseTime += dt;
    if (this.pulseTime > 1.6) this.pulseTime -= 1.6;
    // SineEase InOut 1.0→1.06→1.0 over 1.6s: use cosine for smooth in-out
    const pulseScale = 1.0 + 0.06 * (0.5 - 0.5 * Math.cos(this.pulseTime * (2 * Math.PI / 1.6)));
    this.viewModel.treeT2AScale = this.viewModel.treeT2AIsPulsing ? pulseScale : 1.0;
    this.viewModel.treeT2BScale = this.viewModel.treeT2BIsPulsing ? pulseScale : 1.0;
    this.viewModel.treeT3AScale = this.viewModel.treeT3AIsPulsing ? pulseScale : 1.0;
    this.viewModel.treeT3BScale = this.viewModel.treeT3BIsPulsing ? pulseScale : 1.0;

    // Sell button subtle breathing (amplitude 0.04 vs 0.06 for nodes)
    const sellPulseScale = 1.0 + 0.04 * (0.5 - 0.5 * Math.cos(this.pulseTime * (2 * Math.PI / 1.6)));
    this.viewModel.sellButtonScale = this.viewModel.showManageTree ? sellPulseScale : 1.0;

    // --- Slide show/hide animation ---
    if (this.isSlideAnimating) {
      const st = 1 - Math.exp(-SLIDE_LERP_SPEED * dt);
      this.slideCurrent = this.slideCurrent + (this.slideTarget - this.slideCurrent) * st;

      if (Math.abs(this.slideTarget - this.slideCurrent) < SLIDE_SNAP_THRESHOLD) {
        this.slideCurrent = this.slideTarget;
        this.isSlideAnimating = false;
        if (this.hideOnSlideComplete && this.uiComponent) {
          this.uiComponent.isVisible = false;
          this.hideOnSlideComplete = false;
        }
      }
      this.viewModel.slideOffsetY = this.slideCurrent;
    }
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  @subscribe(UiEvents.towersTabTap, { execution: ExecuteOn.Owner })
  onTowersTabTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] TOWERS tab tapped');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // If in placement mode, cancel placement and restore panel
    if (this.viewModel.selectedTowerId !== '') {
      console.log('[TowerShopHud] Cancelling placement from TOWERS tab tap');
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
      this.viewModel.isPlacingTower = false;
      this.viewModel.placingTowerName = '';
      for (const item of this.itemVMs) {
        if (item.selected) item.selected = false;
      }
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      this.isManuallyHidden = false;
      this._syncToggleArrow();
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      this._switchToTowersTab();
      return;
    }

    // If panel is hidden, show it in towers mode
    if (this.isManuallyHidden) {
      this.isManuallyHidden = false;
      this._syncToggleArrow();
      this._switchToTowersTab();
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      return;
    }

    // If towers tab is already active, toggle hide the panel
    if (this.viewModel.towersTabActive) {
      console.log('[TowerShopHud] Same tab tapped (TOWERS), hiding panel');
      this.isManuallyHidden = true;
      this._syncToggleArrow();
      this.slideTarget = MANUAL_HIDE_SLIDE_DISTANCE;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      return;
    }

    // Otherwise switch to towers tab
    this._switchToTowersTab();
    EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
  }

  @subscribe(UiEvents.manageTabTap, { execution: ExecuteOn.Owner })
  onManageTabTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] MANAGE tab tapped');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // If in placement mode, cancel placement and restore panel
    if (this.viewModel.selectedTowerId !== '') {
      console.log('[TowerShopHud] Cancelling placement from MANAGE tab tap');
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
      this.viewModel.isPlacingTower = false;
      this.viewModel.placingTowerName = '';
      for (const item of this.itemVMs) {
        if (item.selected) item.selected = false;
      }
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      this.isManuallyHidden = false;
      this._syncToggleArrow();
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      this._switchToManageTab('prompt');
      return;
    }

    // If panel is hidden, show it in manage mode
    if (this.isManuallyHidden) {
      this.isManuallyHidden = false;
      this._syncToggleArrow();
      this._switchToManageTab('prompt');
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      return;
    }

    // If manage tab is already active, toggle hide the panel
    if (this.viewModel.manageTabActive) {
      console.log('[TowerShopHud] Same tab tapped (MANAGE), hiding panel');
      this.isManuallyHidden = true;
      this._syncToggleArrow();
      this.slideTarget = MANUAL_HIDE_SLIDE_DISTANCE;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      return;
    }

    // Otherwise switch to manage tab
    this._switchToManageTab('prompt');
  }

  // ── Manage mode: Upgrade/Sell buttons ──────────────────────────────────────

  @subscribe(UiEvents.manageUpgradeButtonTap, { execution: ExecuteOn.Owner })
  onManageUpgradeButtonTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] UPGRADE button tapped — showing skill tree');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Transition from actions state to tree state
    this._switchManageState('tree');
  }

  @subscribe(UiEvents.manageSellButtonTap, { execution: ExecuteOn.Owner })
  onManageSellButtonTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] SELL button tapped');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    TowerService.get().sell();
  }

  @subscribe(UiEvents.manageUpgradeChoiceTap, { execution: ExecuteOn.Owner })
  onManageUpgradeChoiceTap(payload: UiEvents.ManageUpgradeChoiceTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    const nodeId = payload.parameter; // "t2a","t2b","t3a","t3b"
    console.log(`[TowerShopHud] Skill tree node tapped: ${nodeId}`);
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Determine which choice index to pass to TowerService.upgrade()
    const tier = this.manageSelectedTier;
    let choiceIndex = -1;

    if (tier === 0 && (nodeId === 't2a' || nodeId === 't2b')) {
      choiceIndex = nodeId === 't2a' ? 0 : 1;
    } else if (tier === 1 && (nodeId === 't3a' || nodeId === 't3b')) {
      choiceIndex = nodeId === 't3a' ? 0 : 1;
    }

    if (choiceIndex < 0) {
      console.log(`[TowerShopHud] Node ${nodeId} not valid for current tier=${tier}`);
      return;
    }

    // Check affordability from the node cost
    const cost = this._getNodeCost(nodeId);
    if (!ResourceService.get().canAfford(cost)) {
      console.log(`[TowerShopHud] Can't afford node ${nodeId} (cost=${cost})`);
      return;
    }

    TowerService.get().upgrade(choiceIndex);
  }

  @subscribe(UiEvents.manageBackButtonTap, { execution: ExecuteOn.Owner })
  onManageBackButtonTap(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] Back button tapped — deselecting tower');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_payload: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this._populateTowers();
    this._updateAffordability(ResourceService.get().gold);
    this._updateBiomeArrows();
    this._switchToTowersTab();
    this._slideShow();
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_payload: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._updateAffordability(payload.gold);
    // Update resource displays
    if (this.viewModel) {
      this.viewModel.goldDisplay = payload.gold;
      this.viewModel.livesDisplay = payload.lives;
    }
    // Refresh tree node states when gold changes (affordability may change)
    if (this.viewModel && this.viewModel.showManageTree && this.manageSelectedDefId) {
      this._populateTreeNodes();
    }
  }

  @subscribe(Events.TowerSelected, { execution: ExecuteOn.Owner })
  onTowerSelected(payload: Events.TowerSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    console.log(`[TowerShopHud] Tower selected at col=${payload.col}, row=${payload.row}, def=${payload.defId}`);

    // Store selection info for manage mode
    this.manageSelectedCol = payload.col;
    this.manageSelectedRow = payload.row;
    this.manageSelectedDefId = payload.defId;
    this.manageSelectedChoices = payload.choices;
    this.manageSelectedTier = payload.tier;

    // Populate manage tower info
    const def = TowerService.get().find(payload.defId);
    if (!def) return;

    const rec = TowerService.get().getAt(payload.col, payload.row);
    this.viewModel.manageTowerName = def.name;
    this.viewModel.manageSellValue = rec ? Math.floor(rec.totalInvested * SELL_RATIO) : 0;

    // Populate Rank I tower card info
    this.viewModel.manageTowerIcon = TOWER_ICON_MAP[payload.defId] ?? null;
    this.viewModel.manageTowerColor = TOWER_COLORS[payload.defId] ?? '#3a3a5a';
    this.viewModel.manageTowerSecondaryColor = TOWER_SECONDARY_COLORS[payload.defId] ?? '#2a2a3a';

    // Populate skill-tree nodes
    this._populateTreeNodes();

    // Auto-switch to manage tab showing full upgrade tree directly
    this._switchToManageTab('tree');

    // Clear placement state so panelIsDown doesn't keep it collapsed
    this.viewModel.selectedTowerId = '';
    this.viewModel.selectedCardIndex = -1;
    this.viewModel.isPlacingTower = false;
    this.viewModel.placingTowerName = '';
    for (const item of this.itemVMs) {
      if (item.selected) item.selected = false;
    }

    // Force panel open regardless of previous manual-hide or placement state
    this.isManuallyHidden = false;
    this._syncToggleArrow();

    // If panel is hidden, show it
    if (this.uiComponent && !this.uiComponent.isVisible) {
      this._slideShow();
    } else if (this.slideCurrent > 0) {
      // Panel is collapsed/partially hidden, bring it fully up
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
    }
  }

  @subscribe(Events.TowerDeselected, { execution: ExecuteOn.Owner })
  onTowerDeselected(_payload: Events.TowerDeselectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    // If we're in manage mode, go back to prompt state
    if (this.viewModel.showManageContent) {
      this._switchManageState('prompt');
    }

    // Clear manage selection
    this.manageSelectedCol = 0;
    this.manageSelectedRow = 0;
    this.manageSelectedDefId = '';
    this.manageSelectedChoices = [];
    this.manageSelectedTier = 0;
  }

  @subscribe(Events.TowerSold, { execution: ExecuteOn.Owner })
  onTowerSold(_payload: Events.TowerSoldPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[TowerShopHud] Tower sold, switching to towers tab');
    this._switchToTowersTab();
  }

  @subscribe(Events.TowerUpgraded, { execution: ExecuteOn.Owner })
  onTowerUpgraded(payload: Events.TowerUpgradedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (payload.col !== this.manageSelectedCol || payload.row !== this.manageSelectedRow) return;

    console.log(`[TowerShopHud] Tower upgraded at col=${payload.col}, row=${payload.row}, tier=${payload.tier}`);

    // Refresh manage state
    const rec = TowerService.get().getAt(this.manageSelectedCol, this.manageSelectedRow);
    const def = TowerService.get().find(this.manageSelectedDefId);
    if (!rec || !def) return;

    this.manageSelectedTier = rec.tier;
    this.manageSelectedChoices = [...rec.choices];
    this.viewModel.manageTowerName = def.name;
    this.viewModel.manageSellValue = Math.floor(rec.totalInvested * SELL_RATIO);

    // Refresh tree node states
    this._populateTreeNodes();
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(_payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(_payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._updateBiomeArrows();
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_payload: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    this._populateTowers();
    this._updateBiomeArrows();
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
    this.viewModel.selectedTowerId = '';
    this.viewModel.selectedCardIndex = -1;
    this.viewModel.isPlacingTower = false;
    this.viewModel.placingTowerName = '';
    for (const item of this.itemVMs) item.selected = false;
    this.scrollTarget = -CARD_EDGE_MARGIN;
    this.scrollCurrent = -CARD_EDGE_MARGIN;
    this.isScrollAnimating = false;
    this.viewModel.contentOffsetX = -CARD_EDGE_MARGIN;
    this._switchToTowersTab();
  }

  @subscribe(UiEvents.towerShopTap, { execution: ExecuteOn.Owner })
  onTowerTapped(payload: UiEvents.TowerShopTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const towerId = payload.parameter;

    // Ignore tap if can't afford (unless deselecting)
    if (this.viewModel && this.viewModel.selectedTowerId !== towerId) {
      const item = this.itemVMs.find(i => i.towerId === towerId);
      if (item && !ResourceService.get().canAfford(item.cost)) {
        console.log(`[TowerShopHud] Tap ignored — can't afford ${towerId}`);
        return;
      }
    }

    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Toggle OFF
    if (this.viewModel && this.viewModel.selectedTowerId === towerId) {
      console.log(`[TowerShopHud] Same card tapped again (${towerId}), deselecting`);
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
      this.viewModel.isPlacingTower = false;
      this.viewModel.placingTowerName = '';
      for (const item of this.itemVMs) {
        if (item.selected) item.selected = false;
      }
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      return;
    }

    if (!TowerService.get().find(towerId)) {
      return;
    }

    TowerService.get().selectShopTower(towerId);

    if (this.viewModel) {
      this.viewModel.selectedTowerId = towerId;
      const idx = this.itemVMs.findIndex(i => i.towerId === towerId);
      if (idx >= 0) {
        this.viewModel.selectedCardIndex = idx;
        this._scrollToCard(idx);
      }
    }

    for (const item of this.itemVMs) {
      const shouldBeSelected = item.towerId === towerId;
      if (item.selected !== shouldBeSelected) item.selected = shouldBeSelected;
    }

    const p = new Events.TowerShopSelectedPayload();
    p.towerId = towerId;
    EventService.sendLocally(Events.TowerShopSelected, p);

    // Show placement label
    const def = TowerService.get().find(towerId);
    if (this.viewModel && def) {
      this.viewModel.placingTowerName = def.name;
      this.viewModel.isPlacingTower = true;
    }

    // Slide panel to partial-hide (tab still visible/tappable) during placement mode
    this.slideTarget = MANUAL_HIDE_SLIDE_DISTANCE;
    this.isSlideAnimating = true;
    this.hideOnSlideComplete = false;
    // Sync arrow to reflect panel is hidden
    if (this.viewModel) this.viewModel.toggleArrowText = '▲';
  }

  @subscribe(tabToggleEvent, { execution: ExecuteOn.Owner })
  onTabToggle(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    // If in placement mode, cancel placement and bring panel back up
    if (this.viewModel.selectedTowerId !== '') {
      console.log('[TowerShopHud] Tab toggled during placement mode — cancelling placement');
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
      this.viewModel.isPlacingTower = false;
      this.viewModel.placingTowerName = '';
      for (const item of this.itemVMs) {
        if (item.selected) item.selected = false;
      }
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      this.isManuallyHidden = false;
      this._syncToggleArrow();
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
      return;
    }

    this.isManuallyHidden = !this.isManuallyHidden;
    this._syncToggleArrow();
    console.log(`[TowerShopHud] Tab toggled, isManuallyHidden=${this.isManuallyHidden}`);

    if (this.isManuallyHidden) {
      this.slideTarget = MANUAL_HIDE_SLIDE_DISTANCE;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
    } else {
      this.slideTarget = 0;
      this.isSlideAnimating = true;
      this.hideOnSlideComplete = false;
    }
  }

  @subscribe(Events.TowerPlaced, { execution: ExecuteOn.Owner })
  onTowerPlaced(_payload: Events.TowerPlacedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    // Ensure panel comes back fully visible after placement
    this.isManuallyHidden = false;
    this._syncToggleArrow();
    this._slideShow();
    this.viewModel.selectedTowerId = '';
    this.viewModel.selectedCardIndex = -1;
    this.viewModel.isPlacingTower = false;
    this.viewModel.placingTowerName = '';
    for (const item of this.itemVMs) {
      if (item.selected) item.selected = false;
    }
    // Switch back to towers tab after placing
    this._switchToTowersTab();
  }

  // ── Internal: Tab/State switching ──────────────────────────────────────────

  private _switchToTowersTab(): void {
    if (!this.viewModel) return;
    this.viewModel.showTowersContent = true;
    this.viewModel.showManageContent = false;
    this.viewModel.towersTabActive = true;
    this.viewModel.manageTabActive = false;
    this.viewModel.showManagePrompt = false;
    this.viewModel.showManageActions = false;
    this.viewModel.showManageTree = false;
  }

  private _switchToManageTab(state: 'prompt' | 'actions' | 'tree'): void {
    if (!this.viewModel) return;
    this.viewModel.showTowersContent = false;
    this.viewModel.showManageContent = true;
    this.viewModel.towersTabActive = false;
    this.viewModel.manageTabActive = true;
    this._switchManageState(state);
  }

  private _switchManageState(state: 'prompt' | 'actions' | 'tree'): void {
    if (!this.viewModel) return;
    this.viewModel.showManagePrompt = state === 'prompt';
    this.viewModel.showManageActions = state === 'actions';
    this.viewModel.showManageTree = state === 'tree';
  }

  // ── Internal: Upgrade cards ────────────────────────────────────────────────

  private _populateTreeNodes(): void {
    if (!this.viewModel) return;
    const def = TowerService.get().find(this.manageSelectedDefId);
    if (!def) return;

    // Set hasUpgrades for XAML visibility bindings
    this.viewModel.hasUpgrades = !!def.upgrades;

    // Towers with no upgrade tree (e.g. Pillar): hide all nodes
    if (!def.upgrades) {
      this.viewModel.treeT2AOpacity = 0;
      this.viewModel.treeT2BOpacity = 0;
      this.viewModel.treeT3AOpacity = 0;
      this.viewModel.treeT3BOpacity = 0;
      this.viewModel.treeT2ACostVisible = false;
      this.viewModel.treeT2BCostVisible = false;
      this.viewModel.treeT3ACostVisible = false;
      this.viewModel.treeT3BCostVisible = false;
      this.viewModel.treeT3AContentVisible = false;
      this.viewModel.treeT3BContentVisible = false;
      return;
    }

    const tier = this.manageSelectedTier;
    const choices = this.manageSelectedChoices;
    const gold = ResourceService.get().gold;

    // T2 nodes (def.upgrades[0] = T2A, def.upgrades[1] = T2B)
    const t2a = def.upgrades[0];
    const t2b = def.upgrades[1];

    this.viewModel.treeT2AName = t2a.label;
    this.viewModel.treeT2ACost = t2a.cost;
    this.viewModel.treeT2BName = t2b.label;
    this.viewModel.treeT2BCost = t2b.cost;

    // T3 nodes — dynamic based on which T2 was chosen
    if (tier === 0) {
      // No T2 chosen: T3 shows mystery "?" placeholders
      this.viewModel.treeT3AName = '?';
      this.viewModel.treeT3ACost = 0;
      this.viewModel.treeT3AState = 'mystery';
      this.viewModel.treeT3BName = '?';
      this.viewModel.treeT3BCost = 0;
      this.viewModel.treeT3BState = 'mystery';

      this.viewModel.treeT2AState = gold >= t2a.cost ? 'available' : 'locked';
      this.viewModel.treeT2BState = gold >= t2b.cost ? 'available' : 'locked';
    } else {
      const chosenT2 = choices[0];
      this.viewModel.treeT2AState = chosenT2 === 0 ? 'purchased' : 'blocked';
      this.viewModel.treeT2BState = chosenT2 === 1 ? 'purchased' : 'blocked';

      // Get the relevant T3 nodes based on T2 choice
      const chosenBranch = chosenT2 === 0 ? t2a : t2b;
      const t3a = chosenBranch.next ? chosenBranch.next[0] : null;
      const t3b = chosenBranch.next ? chosenBranch.next[1] : null;

      this.viewModel.treeT3AName = t3a ? t3a.label : '';
      this.viewModel.treeT3ACost = t3a ? t3a.cost : 0;
      this.viewModel.treeT3BName = t3b ? t3b.label : '';
      this.viewModel.treeT3BCost = t3b ? t3b.cost : 0;

      if (tier === 1) {
        // T2 chosen but T3 not yet
        this.viewModel.treeT3AState = (t3a && gold >= t3a.cost) ? 'available' : 'locked';
        this.viewModel.treeT3BState = (t3b && gold >= t3b.cost) ? 'available' : 'locked';
      } else {
        // tier === 2: T3 already chosen
        const chosenT3 = choices[1];
        this.viewModel.treeT3AState = chosenT3 === 0 ? 'purchased' : 'blocked';
        this.viewModel.treeT3BState = chosenT3 === 1 ? 'purchased' : 'blocked';
      }
    }

    // Apply visual state for each node based on computed state
    this._applyNodeVisuals('T2A', this.viewModel.treeT2AState);
    this._applyNodeVisuals('T2B', this.viewModel.treeT2BState);
    this._applyNodeVisuals('T3A', this.viewModel.treeT3AState);
    this._applyNodeVisuals('T3B', this.viewModel.treeT3BState);
  }

  private _applyNodeVisuals(node: string, state: string): void {
    if (!this.viewModel) return;

    // Defaults
    let borderColor = '#FFf5c518'; // gold
    let backgroundColor = '#FF2a1a0e'; // dark wood
    let overlayVisible = false;
    let checkVisible = false;
    let boughtBgVisible = false;
    let opacity = 1.0;
    let costVisible = true;
    let contentVisible = true;
    let mysteryVisible = false;
    let isPulsing = false;
    let costColor = '#FFf5c518'; // gold default

    switch (state) {
      case 'available':
        borderColor = '#FFd4a017'; // gold border
        backgroundColor = '#FF3a2a1a'; // lighter warm background
        isPulsing = true;
        break;
      case 'purchased':
        borderColor = '#FF2ecc71'; // green
        backgroundColor = '#FF1a3a1a'; // green-tinted background
        checkVisible = true;
        boughtBgVisible = true;
        costVisible = false;
        break;
      case 'locked':
        borderColor = '#FFe74c3c'; // red (can't afford but path open)
        backgroundColor = '#FF111111'; // very dark
        overlayVisible = true;
        costColor = '#FFe74c3c'; // red (can't afford but path open)
        break;
      case 'blocked':
        borderColor = '#FF888888'; // grey (locked/blocked)
        backgroundColor = '#FF0a0a0a'; // even darker
        overlayVisible = true;
        opacity = 0.5;
        costColor = '#FF888888'; // grey (locked/blocked)
        break;
      case 'mystery':
        borderColor = '#FF555555';
        backgroundColor = '#FF111111';
        contentVisible = false;
        mysteryVisible = true;
        costVisible = false;
        break;
    }

    switch (node) {
      case 'T2A':
        this.viewModel.treeT2ABorderColor = borderColor;
        this.viewModel.treeT2ABackgroundColor = backgroundColor;
        this.viewModel.treeT2AOverlayVisible = overlayVisible;
        this.viewModel.treeT2ACheckVisible = checkVisible;
        this.viewModel.treeT2ABoughtBgVisible = boughtBgVisible;
        this.viewModel.treeT2AOpacity = opacity;
        this.viewModel.treeT2ACostVisible = costVisible;
        this.viewModel.treeT2AIsPulsing = isPulsing;
        this.viewModel.treeT2ACostColor = costColor;
        break;
      case 'T2B':
        this.viewModel.treeT2BBorderColor = borderColor;
        this.viewModel.treeT2BBackgroundColor = backgroundColor;
        this.viewModel.treeT2BOverlayVisible = overlayVisible;
        this.viewModel.treeT2BCheckVisible = checkVisible;
        this.viewModel.treeT2BBoughtBgVisible = boughtBgVisible;
        this.viewModel.treeT2BOpacity = opacity;
        this.viewModel.treeT2BCostVisible = costVisible;
        this.viewModel.treeT2BIsPulsing = isPulsing;
        this.viewModel.treeT2BCostColor = costColor;
        break;
      case 'T3A':
        this.viewModel.treeT3ABorderColor = borderColor;
        this.viewModel.treeT3ABackgroundColor = backgroundColor;
        this.viewModel.treeT3AOverlayVisible = overlayVisible;
        this.viewModel.treeT3ACheckVisible = checkVisible;
        this.viewModel.treeT3ABoughtBgVisible = boughtBgVisible;
        this.viewModel.treeT3AOpacity = opacity;
        this.viewModel.treeT3AContentVisible = contentVisible;
        this.viewModel.treeT3ACostVisible = costVisible;
        this.viewModel.treeT3AMysteryVisible = mysteryVisible;
        this.viewModel.treeT3AIsPulsing = isPulsing;
        this.viewModel.treeT3ACostColor = costColor;
        break;
      case 'T3B':
        this.viewModel.treeT3BBorderColor = borderColor;
        this.viewModel.treeT3BBackgroundColor = backgroundColor;
        this.viewModel.treeT3BOverlayVisible = overlayVisible;
        this.viewModel.treeT3BCheckVisible = checkVisible;
        this.viewModel.treeT3BBoughtBgVisible = boughtBgVisible;
        this.viewModel.treeT3BOpacity = opacity;
        this.viewModel.treeT3BContentVisible = contentVisible;
        this.viewModel.treeT3BCostVisible = costVisible;
        this.viewModel.treeT3BMysteryVisible = mysteryVisible;
        this.viewModel.treeT3BIsPulsing = isPulsing;
        this.viewModel.treeT3BCostColor = costColor;
        break;
    }
  }

  private _getNodeCost(nodeId: string): number {
    if (!this.viewModel) return 9999;
    switch (nodeId) {
      case 't2a': return this.viewModel.treeT2ACost;
      case 't2b': return this.viewModel.treeT2BCost;
      case 't3a': return this.viewModel.treeT3ACost;
      case 't3b': return this.viewModel.treeT3BCost;
      default: return 9999;
    }
  }

  // ── Internal: Tower population ─────────────────────────────────────────────

  private _populateTowers(): void {
    const allDefs = TowerService.get().all();
    const isLaserUnlocked = SkillTreeService.get().isLaserUnlocked();
    const isPoisonUnlocked = SkillTreeService.get().isPoisonUnlocked();
    const isLightningUnlocked = SkillTreeService.get().isLightningUnlocked();
    const isPillarUnlocked = SkillTreeService.get().isPillarUnlocked();
    const isSniperUnlocked = SkillTreeService.get().isSniperUnlocked();
    const activeBiome = SaveService.get().activeBiome;
    const defs = allDefs.filter(def => {
      if (def.id === 'laser' && !isLaserUnlocked) return false;
      if (def.id === 'poison' && !isPoisonUnlocked) return false;
      if (def.id === 'lightning' && !isLightningUnlocked) return false;
      if (def.id === 'pillar' && !isPillarUnlocked) return false;
      if (def.id === 'sniper' && !isSniperUnlocked) return false;
      if (def.biomeExclusive && def.biomeExclusive !== activeBiome) {
        if (def.id === 'fire_cannon' && SkillTreeService.get().isFireCannonUnlocked()) {
          // unlocked
        } else if (def.id === 'frost' && SkillTreeService.get().isFrostUnlocked()) {
          // unlocked
        } else {
          return false;
        }
      }
      return true;
    });

    this.itemVMs = defs.map((def) => {
      const item = new TowerShopItemViewModel();
      item.towerId    = def.id;
      item.name       = def.name;
      item.cost       = def.cost;
      item.iconPath   = '';
      item.state      = 'affordable';
      item.selected   = false;
      item.towerColor = TOWER_COLORS[def.id] ?? '#3a3a5a';
      item.secondaryColor = TOWER_SECONDARY_COLORS[def.id] ?? '#2a2a3a';
      if (TOWER_ICON_MAP[def.id]) {
        item.icon = TOWER_ICON_MAP[def.id];
      }
      return item;
    });


    if (this.viewModel) {
      this.viewModel.contentWidth = this.itemVMs.length * CARD_SLOT_WIDTH;
      this.viewModel.items = this.itemVMs;
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
    }
  }

  private _updateAffordability(gold: number): void {
    for (const item of this.itemVMs) {
      const newState = gold >= item.cost ? 'affordable' : 'too_expensive';
      if (item.state !== newState) item.state = newState;
    }
  }

  private _updateBiomeArrows(): void {
    const activeBiome = SaveService.get().activeBiome;
    for (const item of this.itemVMs) {
      const modState = getBiomeModifierState(item.towerId, activeBiome);
      if (modState === 'buff') {
        item.biomeArrowVisible = true;
        item.biomeArrowIcon = BIOME_ARROW_BUFF_ICON;
      } else if (modState === 'debuff') {
        item.biomeArrowVisible = true;
        item.biomeArrowIcon = BIOME_ARROW_DEBUFF_ICON;
      } else {
        item.biomeArrowVisible = false;
        item.biomeArrowIcon = null;
      }
    }
  }

  private _scrollToCard(index: number): void {
    const totalCards = this.itemVMs.length;
    if (totalCards === 0) return;

    this.isMomentumActive = false;
    this.momentumVelocity = 0;

    const cardCenter = index * CARD_SLOT_WIDTH + CARD_SLOT_WIDTH / 2;
    let target = -(cardCenter - VIEWPORT_WIDTH / 2);
    target = this._clampOffset(target);

    this.scrollTarget = target;
    this.isScrollAnimating = true;
  }

  private _slideHide(): void {
    this.slideTarget = SLIDE_DISTANCE;
    this.isSlideAnimating = true;
    this.hideOnSlideComplete = true;
  }

  private _slideShow(): void {
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.slideCurrent = SLIDE_DISTANCE;
    if (this.viewModel) this.viewModel.slideOffsetY = SLIDE_DISTANCE;
    this.slideTarget = this.isManuallyHidden ? MANUAL_HIDE_SLIDE_DISTANCE : 0;
    this.isSlideAnimating = true;
    this.hideOnSlideComplete = false;
  }

  private _syncToggleArrow(): void {
    if (!this.viewModel) return;
    this.viewModel.toggleArrowText = this.isManuallyHidden ? '▲' : '▼';
  }

  private _handleDragTap(cardIndex: number): void {
    // Guard: ignore drag-taps while panel is animating back into view (slideTarget 0 = showing)
    // This prevents the DragSlider from parasitically re-selecting a tower card
    // when the cancel button is tapped (both receive the same touch event)
    if (this.isSlideAnimating && this.slideTarget < this.slideCurrent) {
      console.log('[TowerShopHud] Drag-tap ignored — panel is sliding into view');
      return;
    }
    if (cardIndex < 0 || cardIndex >= this.itemVMs.length) return;
    const towerId = this.itemVMs[cardIndex].towerId;
    console.log(`[TowerShopHud] Drag-tap detected on card index=${cardIndex}, towerId=${towerId}`);

    if (this.viewModel && this.viewModel.selectedTowerId !== towerId) {
      const item = this.itemVMs[cardIndex];
      if (item && !ResourceService.get().canAfford(item.cost)) {
        console.log(`[TowerShopHud] Drag-tap ignored — can't afford ${towerId}`);
        return;
      }
    }

    // Toggle OFF
    if (this.viewModel && this.viewModel.selectedTowerId === towerId) {
      console.log(`[TowerShopHud] Drag-tap same card (${towerId}), deselecting`);
      this.viewModel.selectedTowerId = '';
      this.viewModel.selectedCardIndex = -1;
      this.viewModel.isPlacingTower = false;
      this.viewModel.placingTowerName = '';
      for (const item of this.itemVMs) {
        if (item.selected) item.selected = false;
      }
      EventService.sendLocally(Events.TowerDeselected, new Events.TowerDeselectedPayload());
      return;
    }

    if (!TowerService.get().find(towerId)) {
      return;
    }

    TowerService.get().selectShopTower(towerId);

    if (this.viewModel) {
      this.viewModel.selectedTowerId = towerId;
      this.viewModel.selectedCardIndex = cardIndex;
      this._scrollToCard(cardIndex);
    }
    for (const item of this.itemVMs) {
      const shouldBeSelected = item.towerId === towerId;
      if (item.selected !== shouldBeSelected) item.selected = shouldBeSelected;
    }

    const p = new Events.TowerShopSelectedPayload();
    p.towerId = towerId;
    EventService.sendLocally(Events.TowerShopSelected, p);

    // Show placement label
    const dragDef = TowerService.get().find(towerId);
    if (this.viewModel && dragDef) {
      this.viewModel.placingTowerName = dragDef.name;
      this.viewModel.isPlacingTower = true;
    }

    // Slide panel to partial-hide (tab still visible/tappable) during placement mode
    this.slideTarget = MANUAL_HIDE_SLIDE_DISTANCE;
    this.isSlideAnimating = true;
    this.hideOnSlideComplete = false;
    // Sync arrow to reflect panel is hidden
    if (this.viewModel) this.viewModel.toggleArrowText = '▲';
  }
}
