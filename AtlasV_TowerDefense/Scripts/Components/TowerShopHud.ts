/**
 * TowerShopHud — ViewModel controller for the tower purchase bar at the bottom of the screen.
 *
 * Attached to: TowerShopUI entity in space.hstf (has CustomUiComponent → TowerShop.xaml).
 * TowerShopViewModel: items[] (TowerShopItemViewModel per tower), selectedTowerId, visible, selectedCardIndex, contentOffsetX.
 * TowerShopItemViewModel: name, cost, state ("affordable"|"too_expensive"), selected, towerColor.
 * Hides when a placed tower is selected (TowerSelected), shows on deselect or RestartGame.
 * On tower tap (UiEvents.towerShopTap): calls TowerService.selectShopTower(), fires TowerShopSelected.
 * Auto-scrolls to tapped card with smooth animation (lerp-based ease-out).
 * Updates affordability state on ResourceChanged.
 * On RestartGame: resets visible=true and resets selection to first tower.
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
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import { TowerService } from '../Services/TowerService';
import { ResourceService } from '../Services/ResourceService';
import { SkillTreeService } from '../Services/SkillTreeService';
import { SaveService } from '../Services/SaveService';
import { TowerIcons } from '../Assets';
import { getBiomeModifierState } from '../Defs/BiomeModifierDefs';

const TOWER_COLORS: Record<string, string> = {
  arrow:  '#552ecc71',
  cannon: '#55e67e22',
  frost:  '#5500bcd4',
  laser:  '#559b59b6',
  fire_cannon: '#55ff4500',
  lightning: '#553d9bdb',
  poison: '#5527ae60',
  pillar: '#556b7040',
  test:   '#55ff6b00',
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
  test:   '#b34700',
};

const BIOME_ARROW_BUFF_ICON = new TextureAsset('@sprites/biome_arrow_buff.png');
const BIOME_ARROW_DEBUFF_ICON = new TextureAsset('@sprites/biome_arrow_debuff.png');

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
  };

  items: readonly TowerShopItemViewModel[] = [];
  selectedTowerId: string = '';
  selectedCardIndex: number = 0;
  visible: boolean = true;
  contentOffsetX: number = 0;
  contentWidth: number = 0;
  // Drag input: normalized 0-1 position from the transparent Slider overlay
  dragNormalized: number = 0;
}

// Scroll constants — card slot width = 400 (card) + 20*2 (ItemContainer margin) + 10*2 (CardContainer margin)
const CARD_SLOT_WIDTH = 460;
// Viewport width matches the Page design width
const VIEWPORT_WIDTH = 1080;
// Combined left/right margin before the first card's visible content (20px ItemContainer + 10px CardContainer)
const CARD_EDGE_MARGIN = 30;
// Smooth scroll interpolation speed (higher = faster settle)
const SCROLL_LERP_SPEED = 10;
// Snap threshold — stop animating when within this distance of target
const SCROLL_SNAP_THRESHOLD = 0.5;
// Drag constants
// Minimum pixel-distance of drag to classify as drag (vs tap)
const DRAG_TAP_THRESHOLD = 15;
// Momentum friction per second (velocity multiplied by this^dt each frame)
const DRAG_MOMENTUM_FRICTION = 0.92;
// Minimum momentum velocity before stopping (px/s)
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

  // --- Drag scrolling state ---
  private lastDragNormalized: number = 0;
  private isDragging: boolean = false;
  private dragFrameCount: number = 0;
  private dragTotalPixelsMoved: number = 0;
  private dragLastVelocity: number = 0;
  // Momentum state (applied after drag ends)
  private momentumVelocity: number = 0;
  private isMomentumActive: boolean = false;

  /** Returns [minOffset, maxOffset] so content never reveals empty space.
   *  maxOffset = -CARD_EDGE_MARGIN so first card's visible edge is flush with viewport left.
   *  minOffset pulls content left until last card's visible edge is flush with viewport right. */
  private _getScrollBounds(): [number, number] {
    const totalWidth = this.itemVMs.length * CARD_SLOT_WIDTH;
    const maxOffset = -CARD_EDGE_MARGIN; // First card flush against left edge
    const minOffset = Math.min(-CARD_EDGE_MARGIN, -(totalWidth - CARD_EDGE_MARGIN - VIEWPORT_WIDTH)); // Last card flush against right edge
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

    // Hide the native panel immediately to prevent XAML binding race
    // (unresolved bindings default to Visible, covering the screen)
    this.uiComponent.isVisible = false;

    this.viewModel = new TowerShopViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this._populateTowers();
    this._updateAffordability(ResourceService.get().gold);
    this._updateBiomeArrows();

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

    // --- Drag input processing ---
    const currentDragNorm = this.viewModel.dragNormalized;
    const dragDelta = currentDragNorm - this.lastDragNormalized;
    const dragDeltaPx = dragDelta * VIEWPORT_WIDTH;

    if (Math.abs(dragDelta) > 0.0001) {
      // Slider value is changing — user is touching/dragging
      if (!this.isDragging) {
        // First frame of a new interaction (Slider jumped to touch point)
        this.isDragging = true;
        this.dragFrameCount = 0;
        this.dragTotalPixelsMoved = 0;
        this.dragLastVelocity = 0;
        // Cancel any ongoing momentum or scroll animation
        this.isMomentumActive = false;
        this.isScrollAnimating = false;
      }
      this.dragFrameCount++;

      if (this.dragFrameCount > 1) {
        // From 2nd frame onwards, apply delta to scroll (natural scroll: drag right → content moves right → offset increases)
        this.scrollCurrent += dragDeltaPx;
        this.scrollCurrent = this._clampOffset(this.scrollCurrent);
        this.dragTotalPixelsMoved += Math.abs(dragDeltaPx);
        // Track velocity for momentum (px/s)
        if (dt > 0) {
          this.dragLastVelocity = dragDeltaPx / dt;
        }
      }
      this.lastDragNormalized = currentDragNorm;
      this.viewModel.contentOffsetX = this.scrollCurrent;
    } else if (this.isDragging) {
      // Drag just ended (value stopped changing)
      this.isDragging = false;

      if (this.dragFrameCount <= 1 || this.dragTotalPixelsMoved < DRAG_TAP_THRESHOLD) {
        // TAP detected — determine which card was tapped from normalized position
        const viewportX = currentDragNorm * VIEWPORT_WIDTH;
        const contentX = viewportX - this.scrollCurrent;
        const cardIndex = Math.max(0, Math.min(this.itemVMs.length - 1, Math.floor(contentX / CARD_SLOT_WIDTH)));
        this._handleDragTap(cardIndex);
      } else {
        // DRAG ended — apply momentum
        this.momentumVelocity = this.dragLastVelocity;
        this.isMomentumActive = Math.abs(this.momentumVelocity) > DRAG_MOMENTUM_MIN_VELOCITY;
      }
      this.dragFrameCount = 0;
      this.dragTotalPixelsMoved = 0;
    }

    // --- Momentum decay (after drag release) ---
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

    // --- Smooth scroll-to-card animation (from tap selection) ---
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

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_payload: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    // Re-populate towers in case skill tree unlock state changed since onStart
    this._populateTowers();
    this._updateAffordability(ResourceService.get().gold);
    this._updateBiomeArrows();
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.viewModel.visible = true;
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
  }

  @subscribe(Events.TowerSelected, { execution: ExecuteOn.Owner })
  onTowerSelected(_payload: Events.TowerSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
  }

  @subscribe(Events.TowerDeselected, { execution: ExecuteOn.Owner })
  onTowerDeselected(_payload: Events.TowerDeselectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.viewModel.visible = true;
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
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
    // Re-populate towers in case skill tree unlock state changed
    this._populateTowers();
    this._updateBiomeArrows();
    // Don't show yet — will show again on LevelSelected
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
    this.viewModel.selectedTowerId = this.itemVMs.length > 0 ? this.itemVMs[0].towerId : '';
    this.viewModel.selectedCardIndex = 0;
    for (const item of this.itemVMs) item.selected = item.towerId === this.viewModel.selectedTowerId;
    // Reset scroll to first card (flush with left edge)
    this.scrollTarget = -CARD_EDGE_MARGIN;
    this.scrollCurrent = -CARD_EDGE_MARGIN;
    this.isScrollAnimating = false;
    this.viewModel.contentOffsetX = -CARD_EDGE_MARGIN;
  }


  @subscribe(UiEvents.towerShopTap, { execution: ExecuteOn.Owner })
  onTowerTapped(payload: UiEvents.TowerShopTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const towerId = payload.parameter;
    if (!TowerService.get().find(towerId)) {
      // Handle the test card tap (no TowerService entry)
      if (towerId === 'test') {
        console.log('[TowerShopHud] Test card tapped');
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
        return;
      }
      return;
    }

    TowerService.get().selectShopTower(towerId);

    if (this.viewModel && this.viewModel.selectedTowerId !== towerId) {
      this.viewModel.selectedTowerId = towerId;
    }

    // Update selectedCardIndex for scroll-into-view
    if (this.viewModel) {
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
  }

  private _populateTowers(): void {
    const allDefs = TowerService.get().all();
    // Filter out the laser tower if the skill tree node hasn't been unlocked
    const isLaserUnlocked = SkillTreeService.get().isLaserUnlocked();
    const isPoisonUnlocked = SkillTreeService.get().isPoisonUnlocked();
    const isLightningUnlocked = SkillTreeService.get().isLightningUnlocked();
    const isPillarUnlocked = SkillTreeService.get().isPillarUnlocked();
    const activeBiome = SaveService.get().activeBiome;
    const defs = allDefs.filter(def => {
      if (def.id === 'laser' && !isLaserUnlocked) return false;
      if (def.id === 'poison' && !isPoisonUnlocked) return false;
      if (def.id === 'lightning' && !isLightningUnlocked) return false;
      if (def.id === 'pillar' && !isPillarUnlocked) return false;
      // Biome-exclusive towers: show if current biome matches OR corresponding skill tree unlock is purchased
      if (def.biomeExclusive && def.biomeExclusive !== activeBiome) {
        // Check if the skill tree unlocks this tower for all biomes
        if (def.id === 'fire_cannon' && SkillTreeService.get().isFireCannonUnlocked()) {
          // Fire cannon unlocked via skill tree - show in any biome
        } else if (def.id === 'frost' && SkillTreeService.get().isFrostUnlocked()) {
          // Frost tower unlocked via skill tree - show in any biome
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
      const TOWER_ICON_MAP: Record<string, TextureAsset> = {
        arrow: TowerIcons.BallistaTower,
        cannon: TowerIcons.CanonTower,
        frost: TowerIcons.FrostTower,
        laser: TowerIcons.LaserTower,
        fire_cannon: TowerIcons.FireCanonTower,
        lightning: TowerIcons.LightningTower,
        poison: TowerIcons.PoisonTower,
        pillar: TowerIcons.PillarTower,
      };
      if (TOWER_ICON_MAP[def.id]) {
        item.icon = TOWER_ICON_MAP[def.id];
      }
      return item;
    });

    // Add a 5th test card for testing horizontal scroll
    const testCard = new TowerShopItemViewModel();
    testCard.towerId = 'test';
    testCard.name = 'Test';
    testCard.cost = 999;
    testCard.iconPath = '';
    testCard.state = 'affordable';
    testCard.selected = false;
    testCard.towerColor = TOWER_COLORS['test'] ?? '#3a3a5a';
    testCard.secondaryColor = TOWER_SECONDARY_COLORS['test'] ?? '#2a2a3a';
    testCard.icon = TowerIcons.BallistaTower; // Reuse an existing icon for testing
    this.itemVMs.push(testCard);

    if (this.viewModel) {
      this.viewModel.contentWidth = this.itemVMs.length * CARD_SLOT_WIDTH;
      this.viewModel.items = this.itemVMs;
      if (this.itemVMs.length > 0) {
        this.viewModel.selectedTowerId = this.itemVMs[0].towerId;
        this.viewModel.selectedCardIndex = 0;
        this.itemVMs[0].selected = true;
      }
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

  /**
   * Initiates smooth scroll animation to bring the card at `index` into view (centered).
   */
  private _scrollToCard(index: number): void {
    const totalCards = this.itemVMs.length;
    if (totalCards === 0) return;

    // Cancel any active momentum when scroll-to-card is triggered
    this.isMomentumActive = false;
    this.momentumVelocity = 0;

    // Target offset to center the card in the viewport
    const cardCenter = index * CARD_SLOT_WIDTH + CARD_SLOT_WIDTH / 2;
    let target = -(cardCenter - VIEWPORT_WIDTH / 2);

    // Clamp to valid range so no empty space is visible on either side
    target = this._clampOffset(target);

    this.scrollTarget = target;
    this.isScrollAnimating = true;
  }

  /**
   * Called when a drag interaction is classified as a tap (minimal movement).
   * Simulates tapping the card at the given index — selects and scrolls to it.
   */
  private _handleDragTap(cardIndex: number): void {
    if (cardIndex < 0 || cardIndex >= this.itemVMs.length) return;
    const towerId = this.itemVMs[cardIndex].towerId;
    console.log(`[TowerShopHud] Drag-tap detected on card index=${cardIndex}, towerId=${towerId}`);

    // Reuse the same logic as the XAML tap handler
    if (!TowerService.get().find(towerId)) {
      if (towerId === 'test') {
        if (this.viewModel) {
          this.viewModel.selectedTowerId = towerId;
          this.viewModel.selectedCardIndex = cardIndex;
          this._scrollToCard(cardIndex);
        }
        for (const item of this.itemVMs) {
          const shouldBeSelected = item.towerId === towerId;
          if (item.selected !== shouldBeSelected) item.selected = shouldBeSelected;
        }
        return;
      }
      return;
    }

    TowerService.get().selectShopTower(towerId);

    if (this.viewModel && this.viewModel.selectedTowerId !== towerId) {
      this.viewModel.selectedTowerId = towerId;
    }
    if (this.viewModel) {
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
  }
}
