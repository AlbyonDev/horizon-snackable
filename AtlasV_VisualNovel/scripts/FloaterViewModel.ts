import { uiViewModel, UiViewModel, UiEvent } from 'meta/custom_ui';
import { DrawingCommandData } from 'meta/custom_ui';
import { serializable } from 'meta/platform_api';
import { TextureAsset } from 'meta/worlds';

// === Event Payloads ===
@serializable()
export class FloaterActionSelectedPayload {
  readonly parameter: string = "";
}

@serializable()
export class FloaterTabSelectedPayload {
  readonly parameter: string = "";
}

@serializable()
export class FloaterLureSelectedPayload {
  readonly parameter: string = "";
}

// === Events ===
export const onFloaterStartGame = new UiEvent('onFloaterStartGame');
export const onFloaterActionSelected = new UiEvent('onFloaterActionSelected', FloaterActionSelectedPayload);
export const onFloaterNewCast = new UiEvent('onFloaterNewCast');
export const onFloaterSkipBeat = new UiEvent('onFloaterSkipBeat');
export const onFloaterCastStart = new UiEvent('onFloaterCastStart');

// Journal events
export const onJournalOpen = new UiEvent('onJournalOpen');
export const onJournalClose = new UiEvent('onJournalClose');
export const onJournalTabSwitch = new UiEvent('onJournalTabSwitch', FloaterTabSelectedPayload);
export const onCGViewerDismiss = new UiEvent('onCGViewerDismiss');
export const onCGItemTapped = new UiEvent('onCGItemTapped', FloaterTabSelectedPayload);

// Inventory events
export const onInventoryOpen = new UiEvent('onInventoryOpen');
export const onInventoryClose = new UiEvent('onInventoryClose');
export const onInventoryEquip = new UiEvent('onInventoryEquip', FloaterLureSelectedPayload);
export const onInventorySelect = new UiEvent('onInventorySelect', FloaterLureSelectedPayload);

// Character detail events
export const onCharacterDetailOpen = new UiEvent('onCharacterDetailOpen', FloaterTabSelectedPayload);
export const onCharacterDetailClose = new UiEvent('onCharacterDetailClose');

// Reset save events
export const onResetSavePressed = new UiEvent('onResetSavePressed');
export const onResetSaveConfirm = new UiEvent('onResetSaveConfirm');
export const onResetSaveCancel = new UiEvent('onResetSaveCancel');


@uiViewModel()
export class DotViewModel extends UiViewModel {
  color: string = ""
}

@uiViewModel()
export class CharacterCardViewModel extends UiViewModel {
  id: string = '';
  name: string = '???';
  species: string = 'Unknown';
  tier: string = '';
  casts: string = '0';
  unlocked: boolean = false;
  completed: boolean = false;
  spritePath: string = '';
  /** TextureAsset variant for sprite-source bindings; falls back to spritePath. */
  texture?: TextureAsset;
  accentColor: string = '#3A4A5A';
  portraitOpacity: number = 1.0;
}

@uiViewModel()
export class CGCardViewModel extends UiViewModel {
  id: string = '';
  name: string = '???';
  unlocked: boolean = false;
  locked: boolean = true;
  spritePath: string = '';
  texture?: TextureAsset;
}

@uiViewModel()
export class StatItemViewModel extends UiViewModel {
  icon: string = '';
  label: string = '';
  value: string = '';
  valueColor: string = '#E8EAD8';
}

@uiViewModel()
export class BadgeItemViewModel extends UiViewModel {
  icon: string = '';
  name: string = '';
  description: string = '';
  unlocked: boolean = false;
  borderColor: string = '#3A4A5A';
  bgColor: string = '#0D1520';
  statusIcon: string = '\ud83d\udd12';
  nameColor: string = '#5A6A7A';
}

// === ViewModel ===
@uiViewModel()
export class FloaterViewModel extends UiViewModel {
  // DrawingSurface commands
  drawCommands: DrawingCommandData = new DrawingCommandData();

  // UI state
  titleVisible: boolean = true;
  actionMenuVisible: boolean = false;
  hudVisible: boolean = false;
  departureVisible: boolean = false;
  idleVisible: boolean = false;
  skipButtonVisible: boolean = false;
  skipButtonOpacity: number = 0;
  castButtonVisible: boolean = false;

  // Dialogue panel (XAML-based)
  dialogueVisible: boolean = false;
  speakerName: string = '';
  speakerColor: string = '#9B7FCC';
  dialogueText: string = '';
  showContinue: boolean = false;
  tapIndicatorVisible: boolean = false;
  speakerNameVisible: boolean = true;
  dialogueTextAlignment: string = 'Left';
  dialogueTextFontStyle: string = 'Normal';

  // HUD data
  fishNameText: string = '';
  tierText: string = '';
  affectionText: string = '';

  // Affection bar (replaces mood icons)
  affectionBarWidth: number = 0; // 0-200 pixels (mapped from 0-100%)
  emotionName: string = 'Unaware';

  // Vertical affection gauge (right-side during dialogue)
  gaugeVisible: boolean = false;
  gaugeMarkerTranslateY: number = 0; // 0 = bottom (Low), -180 = top (High). Negative moves marker up.
  gaugeFillHeight: number = 0; // Height in px of the gradient-filled portion (0-196)

  // Redesigned HUD: portrait icon + name/mood + progress dots
  hudPortrait?: TextureAsset;
  hudNameMoodText: string = '';
  hudNameText: string = '';
  hudMoodText: string = '';
  hudNameColor: string = '#9B7FCC';
  hudMoodColor: string = '#8A9AB0';
  progressDotsText: string = '';

  // Progress dots — dynamic collection bound to ItemsControl
  progressDots: readonly DotViewModel[] = [];

  /** Update progress dots from total and filled counts */
  setProgressDots(total: number, filled: number): void {
    const filledColor = '#9B7FCC';
    const emptyColor = '#3D2E66';
    const dots: DotViewModel[] = [];
    for (let i = 0; i < total; i++) {
      const item = new DotViewModel();
      item.color = i < filled ? filledColor : emptyColor;
      dots.push(item);
    }
    this.progressDots = dots;
  }

  // Tier transition notification
  tierTransitionVisible: boolean = false;
  tierTransitionText: string = '';

  // Departure / idle text
  departureText: string = '';
  idlePromptText: string = 'Tap to Cast again';

  // Ending overlay
  endingVisible: boolean = false;
  endingText: string = '';
  endingOverlayOpacity: number = 0;
  endingTapVisible: boolean = false;

  // Events
  override readonly events = {
    onFloaterStartGame,
    onFloaterActionSelected,
    onFloaterNewCast,
    onFloaterSkipBeat,
    onFloaterCastStart,
    onJournalOpen,
    onJournalClose,
    onJournalTabSwitch,
    onInventoryOpen,
    onInventoryClose,
    onInventoryEquip,
    onInventorySelect,
    onCGViewerDismiss,
    onCGItemTapped,
    onResetSavePressed,
    onResetSaveConfirm,
    onResetSaveCancel,
    onCharacterDetailOpen,
    onCharacterDetailClose,
  };

  // === Journal Tab Colors (active = gold, inactive = grey) ===
  journalTab1Color: string = '#E8A84C';
  journalTab2Color: string = '#8A9AB0';
  journalTab3Color: string = '#8A9AB0';

  // === Journal State ===
  journalVisible: boolean = false;
  journalTab1Visible: boolean = true;
  journalTab2Visible: boolean = false;
  journalTab3Visible: boolean = false;
  journalTab4Visible: boolean = false;
  journalTab5Visible: boolean = false;
  journalPondNotesText: string = '';
  journalLureBoxText: string = '';
  journalKeepsakesText: string = '';
  journalCollectionText: string = '';
  journalCharactersText: string = '';
  journalStatsText: string = '';
  journalBadgesText: string = '';
  journalMetCounter: string = '';

  // Structured stats & badges for polished Tab 3
  statItems: readonly StatItemViewModel[] = [];
  badgeItems: readonly BadgeItemViewModel[] = [];
  badgeProgressText: string = '0/0 earned';

  // === Reset Save Confirmation ===
  resetConfirmVisible: boolean = false;

  // === CG Viewer State ===
  cgViewerVisible: boolean = false;
  cgViewerImage: TextureAsset | null = null;

  // === Character Detail Overlay ===
  charDetailVisible: boolean = false;
  charDetailName: string = '';
  charDetailSpecies: string = '';
  charDetailTierName: string = '';
  charDetailCasts: string = '0';
  charDetailObservations: string = '';
  charDetailQuestName: string = '';
  charDetailQuestHint: string = '';
  charDetailAccentColor: string = '#9B7FCC';
  charDetailTierColor: string = '#8A9AB0';
  /** TextureAsset for the detail portrait — bound directly to Image.Source. */
  charDetailPortrait?: TextureAsset;

  // === Character Cards (Fish tab) — dynamic collection bound to ItemsControl ===
  characterCards: readonly CharacterCardViewModel[] = [];

  // === CG Gallery Cards (Collection tab grid) — dynamic collection ===
  cgCards: readonly CGCardViewModel[] = [];
  cgCollectionProgress: string = 'Collection (0/0)';

  // === Inventory (Tackle Box) State ===
  inventoryVisible: boolean = false;
  inventoryButtonVisible: boolean = false;
  equippedLureName: string = 'None';
  equippedLureDesc: string = 'No lure equipped. Fish will still bite, but lures can improve your chances.';
  lure1Equipped: boolean = false;
  lure2Equipped: boolean = false;
  lure3Equipped: boolean = false;

  // Per-lure equipped state (for border treatment - only equipped lure shows border)
  lureNoneEquipped: boolean = true;
  lureRedSpinnerEquipped: boolean = false;
  lureGoldTeardropEquipped: boolean = false;
  lureFeatherFlyEquipped: boolean = false;

  // No-lure warning overlay
  noLureWarningVisible: boolean = false;

  // Action button enable/disable (for silent beat mechanic)
  actionWaitEnabled: boolean = true;
  actionTwitchEnabled: boolean = true;
  actionDriftEnabled: boolean = true;
  actionReelEnabled: boolean = true;

  // Action button animation state (driven from game loop)
  actionMenuOpacity: number = 0;
  actionMenuTranslateY: number = 30;
  actionWaitBtnOpacity: number = 1;
  actionTwitchBtnOpacity: number = 1;
  actionDriftBtnOpacity: number = 1;
  actionReelBtnOpacity: number = 1;
  actionWaitBtnScale: number = 1;
  actionTwitchBtnScale: number = 1;
  actionDriftBtnScale: number = 1;
  actionReelBtnScale: number = 1;
  actionWaitBtnTranslateY: number = 0;
  actionTwitchBtnTranslateY: number = 0;
  actionDriftBtnTranslateY: number = 0;
  actionReelBtnTranslateY: number = 0;

  // === Idle Button Bar (Bait / Cast / Journal) ===
  idleBarVisible: boolean = false;
  idleBarOpacity: number = 0;
  idleBarTranslateY: number = 40;
  // Per-button animation
  idleBaitBtnOpacity: number = 1;
  idleBaitBtnTranslateY: number = 0;
  idleCastBtnOpacity: number = 1;
  idleCastBtnTranslateY: number = 0;
  idleJournalBtnOpacity: number = 1;
  idleJournalBtnTranslateY: number = 0;
  // Per-button enabled state (disabled during cast sequence)
  idleBaitBtnEnabled: boolean = true;
  idleCastBtnEnabled: boolean = true;
  idleJournalBtnEnabled: boolean = true;

  // === Journal Button (legacy, kept for backward compat) ===
  journalButtonVisible: boolean = false;

  /** Update gauge marker position from affection value (-10 to 50). */
  updateGaugeMarker(affectionValue: number): void {
    // Clamp to display range [-10, 50]
    const GAUGE_MIN = -10;
    const GAUGE_MAX = 50;
    const clamped = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, affectionValue));
    // Normalize: 0 = bottom (Low), 1 = top (High)
    const normalized = (clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
    // Inner content area = 210 outer - 2*1.5 border = 207px. Use the full
    // track so AFFECTION_MAX (50) visually reaches the top of the gauge.
    const GAUGE_TRACK = 207;
    this.gaugeFillHeight = normalized * GAUGE_TRACK;
    // Cursor translateY aligns cursor center with fill top edge.
    this.gaugeMarkerTranslateY = 16 - this.gaugeFillHeight;
  }

  /** Update structured stat items for Tab 3 */
  setStatItems(items: Array<{icon: string; label: string; value: string; valueColor?: string}>): void {
    const vms: StatItemViewModel[] = [];
    for (const item of items) {
      const vm = new StatItemViewModel();
      vm.icon = item.icon;
      vm.label = item.label;
      vm.value = item.value;
      vm.valueColor = item.valueColor ?? '#E8EAD8';
      vms.push(vm);
    }
    this.statItems = vms;
  }

  /** Update structured badge items for Tab 3 */
  setBadgeItems(items: Array<{icon: string; name: string; description: string; unlocked: boolean}>): void {
    const vms: BadgeItemViewModel[] = [];
    let earned = 0;
    for (const item of items) {
      const vm = new BadgeItemViewModel();
      vm.icon = item.icon;
      vm.name = item.name;
      vm.description = item.description;
      vm.unlocked = item.unlocked;
      if (item.unlocked) {
        earned++;
        vm.borderColor = '#E8A84C';
        vm.bgColor = '#1A2A1A';
        vm.statusIcon = '\u2713';
        vm.nameColor = '#E8EAD8';
      } else {
        vm.borderColor = '#2A3A4A';
        vm.bgColor = '#0D1520';
        vm.statusIcon = '\ud83d\udd12';
        vm.nameColor = '#5A6A7A';
      }
      vms.push(vm);
    }
    this.badgeItems = vms;
    this.badgeProgressText = `${earned}/${items.length} earned`;
  }

  /** Switch journal tab by index (0-4). */
  setJournalTab(tabIndex: number): void {
    this.journalTab1Visible = tabIndex === 0;
    this.journalTab2Visible = tabIndex === 1;
    this.journalTab3Visible = tabIndex === 2;
    this.journalTab4Visible = tabIndex === 3;
    this.journalTab5Visible = tabIndex === 4;
    // Update tab button colors (active = gold, inactive = grey)
    const active = '#E8A84C';
    const inactive = '#8A9AB0';
    this.journalTab1Color = tabIndex === 0 ? active : inactive;
    this.journalTab2Color = tabIndex === 1 ? active : inactive;
    this.journalTab3Color = tabIndex === 2 ? active : inactive;
  }

  /** Update equipped lure indicators from display list */
  updateEquippedIndicators(lures: Array<{ id: string; isEquipped: boolean }>): void {
    this.lure1Equipped = lures[0]?.isEquipped ?? false;
    this.lure2Equipped = lures[1]?.isEquipped ?? false;
    this.lure3Equipped = lures[2]?.isEquipped ?? false;
  }

  /** Replace the journal character-card collection (Fish tab grid). */
  setCharacterCards(cards: Array<{
    id: string;
    name: string;
    species: string;
    tier: string;
    casts: string;
    unlocked: boolean;
    completed: boolean;
    spritePath: string;
    texture?: TextureAsset;
    accentColor: string;
  }>): void {
    const vms: CharacterCardViewModel[] = [];
    for (const c of cards) {
      const vm = new CharacterCardViewModel();
      vm.id = c.id;
      vm.name = c.name;
      vm.species = c.species;
      vm.tier = c.tier;
      vm.casts = c.casts;
      vm.unlocked = c.unlocked;
      vm.completed = c.completed;
      vm.portraitOpacity = c.completed ? 0.5 : 1.0;
      vm.spritePath = c.spritePath;
      vm.texture = c.texture;
      vm.accentColor = c.accentColor;
      vms.push(vm);
    }
    this.characterCards = vms;
  }

  /** Replace the CG gallery card collection (Collection tab grid). */
  setCGCards(cards: Array<{
    id: string;
    name: string;
    unlocked: boolean;
    spritePath: string;
    texture?: TextureAsset;
  }>): void {
    const vms: CGCardViewModel[] = [];
    for (const c of cards) {
      const vm = new CGCardViewModel();
      vm.id = c.id;
      vm.name = c.unlocked ? c.name : '???';
      vm.unlocked = c.unlocked;
      vm.locked = !c.unlocked;
      vm.spritePath = c.spritePath;
      vm.texture = c.texture;
      vms.push(vm);
    }
    this.cgCards = vms;
  }

  /** Update per-lure equipped border state and display name/description */
  setEquippedLure(lureId: string, name: string, description: string): void {
    this.lureNoneEquipped = lureId === 'none';
    this.lureRedSpinnerEquipped = lureId === 'red_spinner';
    this.lureGoldTeardropEquipped = lureId === 'gold_teardrop';
    this.lureFeatherFlyEquipped = lureId === 'feather_fly';
    this.equippedLureName = name;
    this.equippedLureDesc = description;
  }
}

export const floaterVM = new FloaterViewModel();
