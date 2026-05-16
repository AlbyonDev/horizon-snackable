/**
 * GameComponent
 *
 * Component Attachment: Scene Entity (with CustomUiComponent)
 * Component Networking: Local (client-side rendering only)
 * Component Ownership: Not Networked
 *
 * Top-level orchestrator: glues input, animation, combat flow, power
 * activation and rendering together each frame. Heavy lifting lives in
 * dedicated controllers (MatchResolver, CombatFlowController,
 * PowerActivationController).
 */
import {
  CustomUiComponent,
  DrawingCommandsBuilder,
} from 'meta/custom_ui';
import {
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  Component,
  component,
  subscribe,
} from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe } from 'meta/worlds';
import {
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEventPayload,
  Vec2,
  ExecuteOn,
  NetworkingService,
} from 'meta/worlds';

import {
  GameViewModel,
  onFleeClicked,
  onPowerCastClicked,
} from './GameViewModel';
import {
  heroCollectionVM,
} from './HeroCollectionViewModel';
import {
  victoryDefeatVM,
} from './VictoryDefeatViewModel';
import {
  ShowDungeonSelectionEvent,
  HideDungeonSelectionEvent,
  HideDungeonMapEvent,
  ShowHeroCollectionEvent,
  HideHeroCollectionEvent,
  ShowVictoryDefeatEvent,
  HideVictoryDefeatEvent,
  ShowCombatBoardEvent,
  HideCombatBoardEvent,
  FwdManageTeamEvent,
  FwdHeroCardClickedEvent,
  FwdHeroCardInfoClickedEvent,
  FwdRosterSlotClickedEvent,
  FwdDetailCloseEvent,
  FwdRosterEnterDungeonEvent,
  FwdRosterBackEvent,
  FwdStartRunEvent,
  FwdReturnEvent,
  FwdDungeonContinueEvent,
  FwdDungeonExitEvent,
  FwdBuyCardClickedEvent,
  FwdBuyConfirmYesEvent,
  FwdBuyConfirmNoEvent,
  FwdBuyResultCloseEvent,
  FwdHealConfirmYesEvent,
  FwdHealConfirmNoEvent,
} from './ScreenEvents';
import type { ButtonParamPayload } from './ScreenEvents';
import { GameState, CombatPhase, GemType } from './Types';
import type { Gem } from './Types';
import { createBoard } from './BoardState';
import { BoardRenderer } from './BoardRenderer';
import { InputHandler } from './InputHandler';
import type { HeroTouchTarget } from './InputHandler';
import { SwapHandler } from './SwapHandler';
import { ManaBank } from './ManaBank';
import { AnimationHandler } from './AnimationHandler';
import { ShuffleHandler } from './ShuffleHandler';
import { hasValidMoves } from './ValidMoveChecker';
import { TeamState } from './TeamState';
import { TeamRenderer } from './TeamRenderer';
import { TeamSpriteProjector } from './TeamSpriteProjector';
import { DamagePopupManager } from './DamagePopupManager';
import { HpBarManager } from './HpBarManager';
import { MultiAttackNotifier } from './MultiAttackNotifier';
import { PowerEffectParticles } from './PowerEffectParticles';
import { PowerAnimationSystem } from './PowerAnimationSystem';
import { PowerCinematicRenderer } from './PowerCinematicRenderer';
import { MatchResolver } from './MatchResolver';
import { CombatFlowController } from './CombatFlowController';
import { PowerActivationController } from './PowerActivationController';
import { DungeonState } from './DungeonState';
import { RoomTransitionHandler } from './RoomTransitionHandler';
import { VictoryAnimator } from './VictoryAnimator';
import { ScreenShakeManager } from './ScreenShakeManager';
import type { HeroXpSnapshot } from './VictoryAnimator';
import { buildRunSequence, serializeRunSequence, deserializeRunSequence } from './EncounterBuilder';
import { GEM_COLOR_HEX } from './PowerTypes';
import { encodeKey } from './GridCoordinate';
import {
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  GEM_CELL_SIZE,
  GEM_RENDER_SIZE,
} from './Constants';
import {
  gemRedTexture,
  gemBlueTexture,
  gemGreenTexture,
  gemYellowTexture,
  gemPurpleTexture,
} from './Assets';
import { RosterManager, xpRequiredForLevel } from './RosterManager';
import { createHeroById } from './HeroFactory';
import { getHeroData } from './HeroCatalog';
import { getEnemyTexture } from './EnemyCatalog';
import type { HeroData } from './HeroCatalog';
import {
  PuzzleSaveRequestEvent,
  PuzzleLoadRequestEvent,
  PuzzleLoadCompleteEvent,
  SAVE_DATA_VERSION,
} from './SaveData';
import type { SaveData, PuzzleLoadCompletePayload } from './SaveData';
import { EventService } from 'meta/worlds';
import type { TextureAsset } from 'meta/worlds';

const GEM_TEXTURE_BY_COLOR: Record<GemType, TextureAsset> = {
  [GemType.Red]: gemRedTexture,
  [GemType.Blue]: gemBlueTexture,
  [GemType.Green]: gemGreenTexture,
  [GemType.Yellow]: gemYellowTexture,
  [GemType.Purple]: gemPurpleTexture,
};

@component()
export class GameComponent extends Component {
  // ===== UI / drawing =====
  private viewModel: GameViewModel = new GameViewModel();
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();
  private renderer: BoardRenderer = new BoardRenderer(this.builder);

  // ===== Input + board systems =====
  private inputHandler: InputHandler = new InputHandler();
  private swapHandler: SwapHandler = new SwapHandler();
  private manaBank: ManaBank = new ManaBank();
  private animHandler: AnimationHandler = new AnimationHandler();
  private shuffleHandler: ShuffleHandler = new ShuffleHandler();

  // ===== Team / combat =====
  private teamState: TeamState = new TeamState();
  private teamRenderer: TeamRenderer = new TeamRenderer(this.builder);
  private teamSpriteProjector: TeamSpriteProjector = new TeamSpriteProjector();
  private damagePopups: DamagePopupManager = new DamagePopupManager();
  private hpBars: HpBarManager = new HpBarManager();
  private multiAttackNotifier: MultiAttackNotifier = new MultiAttackNotifier();
  private powerEffectParticles: PowerEffectParticles = new PowerEffectParticles();
  private powerAnimSystem: PowerAnimationSystem = new PowerAnimationSystem();
  private powerCinematicRenderer: PowerCinematicRenderer = new PowerCinematicRenderer();

  // ===== Controllers =====
  private matchResolver!: MatchResolver;
  private combatFlow!: CombatFlowController;
  private powerActivation!: PowerActivationController;

  // ===== Dungeon System =====
  private dungeonState: DungeonState = new DungeonState();
  private roomTransition!: RoomTransitionHandler;

  // ===== Roster Management =====
  private rosterManager: RosterManager = new RosterManager();

  // ===== Screen Shake =====
  private screenShake: ScreenShakeManager = new ScreenShakeManager();

  // ===== Victory Screen =====
  private victoryAnimator: VictoryAnimator = new VictoryAnimator();
  private runComplete: boolean = false;

  // ===== Hero Purchase / Roll =====
  private _buyRollActive: boolean = false;
  private _buyRollTargetHero: HeroData | null = null;
  private _buyRollPool: HeroData[] = [];
  private _buyRollCurrentIdx: number = 0;
  private _buyRollElapsed: number = 0;
  private _buyRollIntervalAccum: number = 0;
  private readonly ROLL_FAST_SPEED = 0.07;
  private readonly ROLL_SLOW_SPEED = 0.50;
  private readonly ROLL_TOTAL_DURATION = 3.2;

  // ===== Hero Heal Popup =====
  private _healTargetIndex: number = -1;
  private readonly HEAL_COST = 50;

  // ===== Top-level state =====
  private gameState: GameState = GameState.Playing;
  private board: (Gem | null)[][] = [];
  private score: number = 0;
  private level: number = 1;
  private lastTime: number = 0;
  private lastDt: number = 0;
  private elapsedTime: number = 0;
  private recoveryRefreshAccum: number = 0;

  // Input guard: blocks UI button events briefly after start to prevent
  // the title screen PLAY tap from passing through to underlying game buttons.
  private _inputBlockedUntil: number = 0;

  @subscribe(OnEntityCreateEvent)
  onCreate() {
    this.bindViewModel();
    this.bindFloatingTextPools();
    this.initControllers();
    this.initGame();
  }

  @subscribe(ShowCombatBoardEvent)
  onShowCombatBoard() {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.isVisible = true;
    }
  }

  // Title screen sends ShowDungeonSelectionEvent after its fade — route to roster.
  @subscribe(ShowDungeonSelectionEvent)
  onShowDungeonSelection() {
    this.showRosterScreen();
  }

  @subscribe(HideCombatBoardEvent)
  onHideCombatBoard() {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi) {
      customUi.isVisible = false;
    }
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    this.inputHandler.enableTouchInput();
    this.inputHandler.setIsBoardInteractive(() => this.isBoardInteractive());
    // Block UI button events for 1.5s to prevent the title screen PLAY tap
    // from passing through to underlying game buttons (e.g. "Manage Team").
    this._inputBlockedUntil = Date.now() + 1500;
    // Request saved data from server AFTER network is ready (not in onCreate)
    this.requestLoad();
  }

  /**
   * Single source of truth for "is the board accepting gem-selection taps?".
   * When false, taps that miss hero portraits are routed as cancel requests
   * (which dismiss the power preview if it's open). Composed from live system
   * state — there is no imperative enable/disable flag.
   */
  private isBoardInteractive(): boolean {
    if (this.gameState !== GameState.Playing) return false;
    if (this.combatFlow.phase !== CombatPhase.PlayerTurn) return false;
    if (this.animHandler.isAnimating) return false;
    if (this.swapHandler.isAnimating) return false;
    if (this.shuffleHandler.isAnimating) return false;
    if (this.powerActivation.isPreviewOpen) return false;
    if (this.powerAnimSystem.isActive) return false;
    return true;
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload) {
    if (payload.interactionIndex !== 0) return;
    if (this.gameState !== GameState.Playing) return;
    if (this.combatFlow.phase !== CombatPhase.PlayerTurn) return;
    this.inputHandler.handleTouchStart(payload.screenPosition);
  }

  @subscribe(onPowerCastClicked)
  onPowerCast() {
    if (this.powerActivation.previewHeroIndex >= 0) {
      this.powerActivation.confirmPreview();
    }
  }

  @subscribe(onFleeClicked)
  onFlee() {
    this.showResult(false, true);
  }

  @subscribe(FwdReturnEvent)
  onReturn() {
    victoryDefeatVM.resultScreenVisible = false;
    this.sendLocalEvent(HideVictoryDefeatEvent, {});
    this.showRosterScreen();
  }

  // ===== Run Handlers =====

  @subscribe(FwdStartRunEvent)
  onStartRun() {
    if (Date.now() < this._inputBlockedUntil) return;
    if (!this.rosterManager.isRosterValid()) {
      return;
    }
    heroCollectionVM.detailOverlayVisible = false;

    if (this.dungeonState.isInDungeon) {
      // Resume an in-progress run — just enter the next room
      this.enterCombatFromRoster(false);
    } else {
      // Roll a fresh run scaled to the team's average level
      const rosterIds = this.rosterManager.getRosterIds();
      const avgLevel = rosterIds.length > 0
        ? Math.round(rosterIds.reduce((sum, id) => sum + this.rosterManager.getHeroLevel(id), 0) / rosterIds.length)
        : 1;
      const sequence = buildRunSequence(avgLevel);
      this.dungeonState.startRun(sequence);
      this.enterCombatFromRoster(true);
    }
  }

  @subscribe(FwdDungeonContinueEvent)
  onDungeonContinue() {
    this.runComplete = false;
    victoryDefeatVM.roomRewardVisible = false;
    victoryDefeatVM.victoryContinueVisible = false;
    victoryDefeatVM.victoryExitVisible = false;
    victoryDefeatVM.victoryScreenActive = false;
    this.victoryAnimator.reset();
    this.sendLocalEvent(HideVictoryDefeatEvent, {});
    this.showRosterScreen();
  }

  @subscribe(FwdDungeonExitEvent)
  onDungeonExit() {
    this.runComplete = false;
    victoryDefeatVM.roomRewardVisible = false;
    victoryDefeatVM.victoryContinueVisible = false;
    victoryDefeatVM.victoryExitVisible = false;
    victoryDefeatVM.victoryScreenActive = false;
    this.victoryAnimator.reset();
    this.dungeonState.endDungeon();
    this.sendLocalEvent(HideVictoryDefeatEvent, {});
    this.showRosterScreen();
  }

  // ===== Roster Management Handlers =====

  @subscribe(FwdManageTeamEvent)
  onManageTeam() {
    // Guard: ignore if input is still blocked (prevents title screen tap pass-through)
    if (Date.now() < this._inputBlockedUntil) {
      return;
    }
    heroCollectionVM.detailOverlayVisible = false;
    this.gameState = GameState.RosterManagement;
    this.syncRosterToViewModel();

    this.sendLocalEvent(HideDungeonSelectionEvent, {});
    this.sendLocalEvent(ShowHeroCollectionEvent, {});
  }

  @subscribe(FwdHeroCardClickedEvent)
  onHeroCardClick(payload: ButtonParamPayload) {
    if (payload.parameter === 'buy') {
      this.onBuyCardClick();
      return;
    }
    const index = parseInt(payload.parameter, 10);
    if (isNaN(index) || index < 0 || index >= this.rosterManager.collection.length) return;

    // If hero is KO'd (0 HP), show heal popup instead of equip/remove
    const hero = this.rosterManager.collection[index];
    if (hero) {
      const hp = this.rosterManager.heroHp.get(hero.id);
      const hpCurrent = hp?.current ?? hero.baseHp;
      if (hpCurrent <= 0) {
        this._healTargetIndex = index;
        heroCollectionVM.healHeroName = hero.name;
        heroCollectionVM.healConfirmPriceText = String(this.HEAL_COST);
        heroCollectionVM.healCanAfford = this.dungeonState.gold >= this.HEAL_COST;
        heroCollectionVM.healPriceColorHex = heroCollectionVM.healCanAfford ? '#FFD700' : '#FF4444';
        heroCollectionVM.healPopupVisible = true;
        return;
      }
    }

    // Direct toggle: tap-to-equip if not in roster, tap-to-remove if equipped.
    if (this.rosterManager.isInRoster(index)) {
      const hero = this.rosterManager.collection[index];
      const slot = this.rosterManager.getSlotForHero(hero.id);
      if (slot >= 0) this.rosterManager.removeFromSlot(slot);
    } else {
      const emptySlot = this.rosterManager.rosterSlots.findIndex(h => h == null);
      if (emptySlot < 0) {
      } else {
        this.rosterManager.equipToSlot(index, emptySlot);
      }
    }
    this.syncRosterToViewModel();
  }

  @subscribe(FwdHeroCardInfoClickedEvent)
  onHeroCardInfoClick(payload: ButtonParamPayload) {
    const index = parseInt(payload.parameter, 10);
    if (isNaN(index) || index < 0 || index >= this.rosterManager.collection.length) return;
    this.rosterManager.selectHero(index);
    this.syncDetailOverlay(index);
    heroCollectionVM.detailOverlayVisible = true;
  }

  @subscribe(FwdDetailCloseEvent)
  onDetailClose() {
    heroCollectionVM.detailOverlayVisible = false;
  }

  // ===== Buy Hero Handlers =====

  @subscribe(FwdBuyCardClickedEvent)
  onBuyCardClick() {
    if (this.rosterManager.hasAllHeroes()) return;
    const price = this.getHeroPurchasePrice(this.rosterManager.collection.length);
    if (price === 0) {
      // Free hero — bypass confirmation, open directly on roll phase
      heroCollectionVM.buyConfirmVisible = false;
      heroCollectionVM.buyResultVisible = false;
      heroCollectionVM.buyPopupVisible = true;
      this.startBuyRoll(0);
      return;
    }
    heroCollectionVM.buyConfirmPriceText = String(price);
    heroCollectionVM.buyCanAfford = this.dungeonState.gold >= price;
    heroCollectionVM.buyPriceColorHex = heroCollectionVM.buyCanAfford ? '#FFD700' : '#FF4444';
    heroCollectionVM.buyConfirmVisible = true;
    heroCollectionVM.buyRollVisible = false;
    heroCollectionVM.buyResultVisible = false;
    heroCollectionVM.buyPopupVisible = true;
  }

  @subscribe(FwdBuyConfirmYesEvent)
  onBuyConfirmYes() {
    const price = this.getHeroPurchasePrice(this.rosterManager.collection.length);
    if (this.dungeonState.gold < price) return;
    this.startBuyRoll(price);
  }

  /** Deduct gold (if any) and launch the roll animation + reveal popup. */
  private startBuyRoll(price: number): void {
    const unowned = this.rosterManager.getUnownedHeroes();
    if (unowned.length === 0) {
      heroCollectionVM.buyPopupVisible = false;
      return;
    }
    const target = unowned[Math.floor(Math.random() * unowned.length)]!;
    this._buyRollTargetHero = target;
    this._buyRollPool = [...unowned].sort(() => Math.random() - 0.5);
    this._buyRollCurrentIdx = 0;
    this._buyRollElapsed = 0;
    this._buyRollIntervalAccum = 0;
    if (price > 0) {
      this.dungeonState.gold -= price;
      heroCollectionVM.goldText = String(this.dungeonState.gold);
    }
    heroCollectionVM.buyConfirmVisible = false;
    heroCollectionVM.buyRollVisible = true;
    this._buyRollActive = true;
    const first = this._buyRollPool[0];
    if (first) this.showBuyRollHero(first);
  }

  @subscribe(FwdBuyConfirmNoEvent)
  onBuyConfirmNo() {
    heroCollectionVM.buyPopupVisible = false;
    heroCollectionVM.buyConfirmVisible = false;
  }

  @subscribe(FwdBuyResultCloseEvent)
  onBuyResultClose() {
    heroCollectionVM.buyPopupVisible = false;
    heroCollectionVM.buyResultVisible = false;
    this.syncRosterToViewModel();
  }

  // ===== Heal Hero Handlers =====

  @subscribe(FwdHealConfirmYesEvent)
  onHealConfirmYes() {
    if (this._healTargetIndex < 0) return;
    if (this.dungeonState.gold < this.HEAL_COST) {
      return;
    }
    const hero = this.rosterManager.collection[this._healTargetIndex];
    if (!hero) return;

    // Deduct gold and heal
    this.dungeonState.gold -= this.HEAL_COST;
    this.rosterManager.healHero(hero.id);
    heroCollectionVM.healPopupVisible = false;
    this._healTargetIndex = -1;
    this.syncRosterToViewModel();
    this.triggerAutoSave();
  }

  @subscribe(FwdHealConfirmNoEvent)
  onHealConfirmNo() {
    heroCollectionVM.healPopupVisible = false;
    this._healTargetIndex = -1;
  }

  /** First 3 heroes free, then 100 for the 4th, +100 for each subsequent one. */
  private getHeroPurchasePrice(ownedCount: number): number {
    return Math.max(0, (ownedCount - 2) * 100);
  }

  /** Convert up to `count` gems of `fromColor` to `toColor` on the board (random selection). */
  private convertGemsOnBoard(fromColor: GemType, toColor: GemType, count: number): void {
    const positions: { r: number; c: number }[] = [];
    for (let r = 0; r < this.board.length; r++) {
      for (let c = 0; c < this.board[r].length; c++) {
        if (this.board[r][c]?.type === fromColor) positions.push({ r, c });
      }
    }
    // Shuffle positions so we pick randomly
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const toConvert = positions.slice(0, count);
    for (const { r, c } of toConvert) {
      const gem = this.board[r][c];
      if (gem) gem.type = toColor;
    }
  }

  private countGemsOnBoard(color: GemType): number {
    let count = 0;
    for (const row of this.board) {
      for (const gem of row) {
        if (gem?.type === color) count++;
      }
    }
    return count;
  }

  private destroyGemsOnBoard(color: GemType): void {
    const positions = new Set<string>();
    for (let r = 0; r < this.board.length; r++) {
      for (let c = 0; c < this.board[r].length; c++) {
        if (this.board[r][c]?.type === color) positions.add(encodeKey(r, c));
      }
    }
    if (positions.size === 0) return;
    this.animHandler.startDestruction(positions, this.board);
  }

  private showBuyRollHero(hero: HeroData): void {
    heroCollectionVM.buyRollHeroName = hero.name;
    heroCollectionVM.buyRollHeroTexture = hero.texture;
    heroCollectionVM.buyRollHeroManaColor = this.getPrimaryManaColor(hero);
  }

  private tickBuyRoll(dt: number): void {
    this._buyRollElapsed += dt;
    this._buyRollIntervalAccum += dt;

    const progress = Math.min(1, this._buyRollElapsed / this.ROLL_TOTAL_DURATION);
    // Ease from fast to slow: flat fast phase up to 50%, then ease-in to slow
    const slowT = Math.max(0, (progress - 0.5) / 0.5);
    const currentInterval = this.ROLL_FAST_SPEED + (this.ROLL_SLOW_SPEED - this.ROLL_FAST_SPEED) * slowT * slowT;

    if (this._buyRollIntervalAccum >= currentInterval) {
      this._buyRollIntervalAccum -= currentInterval;

      if (progress >= 1.0) {
        this.endBuyRoll();
        return;
      }

      this._buyRollCurrentIdx = (this._buyRollCurrentIdx + 1) % this._buyRollPool.length;
      const hero = this._buyRollPool[this._buyRollCurrentIdx];
      if (hero) this.showBuyRollHero(hero);
    }
  }

  private endBuyRoll(): void {
    this._buyRollActive = false;
    const hero = this._buyRollTargetHero;
    if (!hero) return;

    // Land on target hero
    this.showBuyRollHero(hero);

    // After brief pause, show result
    setTimeout(() => {
      this.rosterManager.addHeroToCollection(hero.id);
      heroCollectionVM.buyRollVisible = false;
      heroCollectionVM.buyResultHeroName = hero.name;
      heroCollectionVM.buyResultHeroTexture = hero.texture;
      heroCollectionVM.buyResultHeroManaColor = this.getPrimaryManaColor(hero);
      heroCollectionVM.buyResultVisible = true;
      this.triggerAutoSave();
    }, 600);
  }

  @subscribe(FwdRosterSlotClickedEvent)
  onRosterSlotClick(payload: ButtonParamPayload) {
    const slotIndex = parseInt(payload.parameter, 10);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= this.rosterManager.rosterSlots.length) return;

    const slot = this.rosterManager.rosterSlots[slotIndex];
    if (slot != null) {
      this.rosterManager.removeFromSlot(slotIndex);
    } else {
      // Empty — equip currently selected hero (from detail panel)
      const selectedIdx = this.rosterManager.selectedIndex;
      if (selectedIdx < 0) {
        return;
      }
      this.rosterManager.equipToSlot(selectedIdx, slotIndex);
    }
    this.syncRosterToViewModel();
  }

  @subscribe(FwdRosterEnterDungeonEvent)
  onRosterEnterDungeon() {
    // "Enter Dungeon / Continue Run" tapped — delegate to the unified handler
    this.onStartRun();
  }

  @subscribe(FwdRosterBackEvent)
  onRosterBack() {
    // Roster screen has no "back" destination in the new flow;
    // the roster IS the hub. This handler is kept in case the XAML
    // wires a back/close button separately from the enter-dungeon button.
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_payload: OnWorldUpdateEventPayload) {
    if (NetworkingService.get().isServerContext()) return;
    const now = Date.now();
    const dt = _payload.deltaTime;
    this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const cappedDt = Math.min(dt, 1 / 30);
    this.lastDt = cappedDt;

    if (this.gameState === GameState.Playing) {
      // Order matters: drain match visuals (HP mutations) BEFORE the combat
      // phase machine reads `allEnemiesDead()` etc., so phase transitions
      // see finalized state.
      this.processShuffle(cappedDt);
      this.processAnimations(cappedDt);
      this.matchResolver.update(cappedDt);
      this.combatFlow.update(cappedDt);
      this.processSwap(cappedDt);
      this.processInput();

      // Screen shake + particles
      this.screenShake.update(cappedDt);
      this.animHandler.updateParticles(cappedDt);
      this.renderer.setParticles(this.animHandler.particles);

      // Team panel animations + project into XAML sprite layer
      this.elapsedTime += cappedDt;
      this.teamState.update(cappedDt);
      this.teamSpriteProjector.update(this.teamState, this.viewModel.team, this.elapsedTime);
      this.applySelectedHeroZIndexOverride();

      // HP bars (smooth slot transitions + mana strips) and damage popup lifecycle
      this.hpBars.update(this.teamState, this.manaBank, cappedDt);
      this.syncManaToViewModel();
      this.damagePopups.update(cappedDt);
      this.multiAttackNotifier.update(cappedDt);
      this.powerEffectParticles.update(cappedDt);
      this.powerAnimSystem.update(cappedDt);
      this.updateHeroTouchTargets();

      // Hide game-UI layers only while the fullscreen hero cast is on screen.
      // Spotlight (charge) and ReturnToNormal/ApplyEffect (board resolution)
      // keep sprites + HP bars + popups visible so the player sees mana drain,
      // projectile travel hero→enemy, and damage numbers.
      const fullscreen = this.powerAnimSystem.isFullscreenActive;
      this.viewModel.gameUiVisible = !fullscreen;
      this.viewModel.cinematicTextVisible = fullscreen;
      if (fullscreen) {
        const cinState = this.powerAnimSystem.currentState;
        this.viewModel.cinematicCasterName = cinState.caster.name;
        this.viewModel.cinematicPowerName = cinState.caster.powerName;
        this.viewModel.cinematicPowerColorHex = cinState.vfxConfig.primaryColor;
        this.viewModel.cinematicAlpha = cinState.cinematicAlpha;
      } else {
        this.viewModel.cinematicAlpha = 0;
      }
      this.render();
    }

    // Live regen: tick while on roster management screen (heroes not in combat)
    if (this.gameState === GameState.RosterManagement) {
      if (this._buyRollActive) {
        this.tickBuyRoll(cappedDt);
      }
      if (this.rosterManager.tickLiveRegen(cappedDt)) {
        this.syncRosterToViewModel();
        this.triggerAutoSave();
      }
      // Per-second refresh of recovery timer text (display only, no save)
      this.recoveryRefreshAccum += cappedDt;
      if (this.recoveryRefreshAccum >= 1.0) {
        this.recoveryRefreshAccum -= 1.0;
        this.refreshRecoveryTimers();
      }
    }

    // Victory screen animation (runs during GameOver state)
    if (this.gameState === GameState.GameOver && this.victoryAnimator.isActive) {
      this.victoryAnimator.update(cappedDt);
      // Show continue button once animations complete
      if (this.victoryAnimator.continueReady) {
        if (this.runComplete && !victoryDefeatVM.victoryExitVisible) {
          victoryDefeatVM.victoryExitVisible = true;
        } else if (!this.runComplete && !victoryDefeatVM.victoryContinueVisible) {
          victoryDefeatVM.victoryContinueVisible = true;
        }
      }
      this.render();
    }
  }

  // ===== Initialization helpers =====

  private bindViewModel(): void {
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) {
      customUi.dataContext = this.viewModel;
      // Start hidden - combat board should only be shown via ShowCombatBoardEvent
      customUi.isVisible = false;
    } else {
      console.error('[GameComponent] CustomUiComponent not found on entity');
    }
  }

  private bindFloatingTextPools(): void {
    // Bind once; managers mutate entries in place each frame.
    this.viewModel.team.texts = [
      ...this.damagePopups.getPool(),
      ...this.multiAttackNotifier.getPool(),
    ];
    this.viewModel.team.allyHpBars = this.hpBars.getAllyPool();
    this.viewModel.team.enemyHpBars = this.hpBars.getEnemyPool();
  }

  private initControllers(): void {
    this.roomTransition = new RoomTransitionHandler(this.dungeonState, this.rosterManager);

    this.matchResolver = new MatchResolver({
      teamState: this.teamState,
      manaBank: this.manaBank,
      animHandler: this.animHandler,
      damagePopups: this.damagePopups,
      multiAttackNotifier: this.multiAttackNotifier,
      getLevelMultiplier: (heroId: string) => this.rosterManager.getHeroLevelMultiplier(heroId),
      onManaGained: (cx: number, cy: number, gemType: number) => {
        // Convert grid coords to pixel coords for particle spawning
        const pixelX = BOARD_OFFSET_X + cx * GEM_CELL_SIZE + GEM_RENDER_SIZE / 2;
        const pixelY = BOARD_OFFSET_Y + cy * GEM_CELL_SIZE + GEM_RENDER_SIZE / 2;
        this.renderer.spawnManaParticles(pixelX, pixelY, gemType as GemType);
      },
      screenShake: this.screenShake,
    });

    this.combatFlow = new CombatFlowController({
      teamState: this.teamState,
      matchResolver: this.matchResolver,
      damagePopups: this.damagePopups,
      onResult: (victory) => this.showResult(victory),
      onPlayerTurnReady: () => this.onPlayerTurnReady(),
      onTeamReorganized: () => this.hpBars.resetBarVisibility(),
      animSystem: this.powerAnimSystem,
      getEnemyTexture: (id) => getEnemyTexture(id),
    });

    this.powerActivation = new PowerActivationController({
      teamState: this.teamState,
      manaBank: this.manaBank,
      viewModel: this.viewModel,
      damagePopups: this.damagePopups,
      hpBars: this.hpBars,
      animSystem: this.powerAnimSystem,
      cinematicRenderer: this.powerCinematicRenderer,
      powerEffectParticles: this.powerEffectParticles,
      onVictory: () => this.combatFlow.scheduleVictory(),
      onBoardShuffle: () => this.shuffleHandler.start(this.board, true),
      onGemConvert: (fromColor, toColor, count) => {
        this.convertGemsOnBoard(fromColor, toColor, count);
        const outcome = this.matchResolver.process(this.board);
        this.score += outcome.scoreAdded;
      },
      onGemDestroy: (color) => {
        this.destroyGemsOnBoard(color);
      },
      getBoardGemCount: (color) => this.countGemsOnBoard(color),
      getLevelMultiplier: (heroId: string) => this.rosterManager.getHeroLevelMultiplier(heroId),
      screenShake: this.screenShake,
    });
  }

  // ===== Per-frame phase processing =====

  /** Process shuffle animation */
  private processShuffle(dt: number): void {
    if (!this.shuffleHandler.isAnimating) return;
    this.renderer.setGlobalRotation(this.shuffleHandler.rotationAmount);

    if (!this.shuffleHandler.update(dt, this.board)) return;

    // Read allowMatches before any new start() call resets it.
    const wasOracleShuffle = this.shuffleHandler.isPowerShuffle;

    this.renderer.setGlobalRotation(0);
    this.viewModel.shuffleText = '';

    if (!hasValidMoves(this.board)) {
      this.shuffleHandler.start(this.board);
      this.viewModel.shuffleText = 'Shuffling...';
      return;
    }

    this.inputHandler.clearSelection();

    if (wasOracleShuffle) {
      // Oracle shuffle can produce initial matches — run the match pipeline
      // immediately so the player gets the cascade as part of the power effect.
      const outcome = this.matchResolver.process(this.board);
      this.score += outcome.scoreAdded;
    }
  }

  /** Update the destruction → fall → spawn pipeline + drive cascades. */
  private processAnimations(_dt: number): void {
    if (!this.animHandler.isAnimating) return;

    const pipelineComplete = this.animHandler.update(_dt, this.board);
    if (!pipelineComplete) return;

    // Stop cascading once all enemies are dead — no point attacking an empty battlefield.
    if (this.teamState.allEnemiesDead()) {
      this.matchResolver.clearCascade();
      this.combatFlow.startApplyingDamage();
      return;
    }

    // Pipeline finished — try cascading matches
    const outcome = this.matchResolver.process(this.board);
    this.score += outcome.scoreAdded;

    if (!this.animHandler.isAnimating) {
      // No new matches — cascade chain ends, transition to applying damage
      this.matchResolver.clearCascade();
      this.renderer.setCascadeCount(0);
      this.combatFlow.startApplyingDamage();
    } else {
      // New matches found after cascade — track the chain
      this.matchResolver.registerCascade();
      this.renderer.setCascadeCount(this.matchResolver.cascadeCount);
    }
  }

  private processInput(): void {
    // Hero taps bypass animation guards so the power panel can open mid-cascade.
    const heroTap = this.inputHandler.consumeHeroTap();
    if (heroTap) {
      this.powerActivation.handleHeroTap(heroTap.heroIndex);
      return;
    }

    // Tap-outside dismiss: routed through InputHandler to avoid race with XAML events.
    if (this.inputHandler.consumeCancelRequest() && this.powerActivation.previewHeroIndex >= 0) {
      this.powerActivation.hidePreview();
      return;
    }

    // Board swap input is gated on all animations being idle
    if (this.animHandler.isAnimating) return;
    if (this.swapHandler.isAnimating) return;
    if (this.shuffleHandler.isAnimating) return;

    const swapRequest = this.inputHandler.consumeSwapRequest();
    if (swapRequest) {
      this.swapHandler.startSwap(swapRequest, this.board as Gem[][]);
    }
  }

  private processSwap(dt: number): void {
    if (!this.swapHandler.isAnimating) return;

    const done = this.swapHandler.update(dt, this.board as Gem[][]);

    // Pipe rotation values to the renderer for the swapping pair
    const req = this.swapHandler.swapRequest;
    if (req && !done) {
      this.renderer.setGemRotation(req.fromRow, req.fromCol, this.swapHandler.fromRotation);
      this.renderer.setGemRotation(req.toRow, req.toCol, this.swapHandler.toRotation);
    } else {
      this.renderer.clearGemRotations();
    }

    if (!done) return;

    this.renderer.clearGemRotations();
    if (this.swapHandler.isValid) {
      this.swapHandler.executeSwap(this.board as Gem[][]);
      const outcome = this.matchResolver.process(this.board);
      this.score += outcome.scoreAdded;
    } else {
      // Invalid swap — trigger red flash + micro-shake
      const req = this.swapHandler.swapRequest;
      if (req) {
        this.renderer.triggerInvalidSwapFeedback(req.fromRow, req.fromCol, req.toRow, req.toCol);
      }
    }
  }

  // ===== Result + reset =====

  private showResult(victory: boolean, isFlee: boolean = false): void {
    this.combatFlow.phase = CombatPhase.CombatOver;
    this.gameState = GameState.GameOver;

    if (victory && this.dungeonState.isInDungeon) {
      // --- Snapshot XP state BEFORE processing rewards ---
      const rosterIds = this.rosterManager.getRosterIds();
      const preXpSnapshots: Array<{ heroId: string; level: number; xp: number }> = [];
      for (const heroId of rosterIds) {
        const state = this.rosterManager.getXpState(heroId);
        preXpSnapshots.push({ heroId, level: state.level, xp: state.xp });
      }

      // Room cleared — process rewards (this mutates XP/level)
      const { reward, hasNextRoom, levelsGained } = this.roomTransition.processRoomComplete(this.teamState.heroes);

      // Sync HP for heroes still alive in combat
      this.rosterManager.syncAllHpFromCombat(this.teamState.heroes);
      // Heroes who died mid-combat were spliced out of teamState by reorganizeHeroes().
      // syncAllHpFromCombat won't reach them, so explicitly zero their HP here.
      const survivingCombatIds = new Set(this.teamState.heroes.map(h => h.id));
      for (const heroId of rosterIds) {
        if (!survivingCombatIds.has(heroId)) {
          this.rosterManager.syncHpFromCombat(heroId, 0);
        }
      }

      // --- Build victory screen snapshots (before vs after) ---
      const aliveCount = rosterIds.filter(id => (this.rosterManager.heroHp.get(id)?.current ?? 0) > 0).length;
      const xpPerHero = aliveCount > 0 ? Math.floor(reward.xp / aliveCount) : 0;
      const heroSnapshots: HeroXpSnapshot[] = preXpSnapshots.map(pre => {
        const heroData = getHeroData(pre.heroId);
        const postState = this.rosterManager.getXpState(pre.heroId);
        const hp = this.rosterManager.heroHp.get(pre.heroId);
        const isDead = hp ? hp.current <= 0 : true;
        const hpCurrent = isDead ? 0 : hp!.current;
        const hpMax = hp ? hp.max : (heroData?.baseHp ?? 0);
        return {
          heroId: pre.heroId,
          heroName: heroData?.name ?? 'Hero',
          texture: heroData?.texture ?? this.rosterManager.collection[0].texture,
          startLevel: pre.level,
          startXp: pre.xp,
          endLevel: postState.level,
          endXp: postState.xp,
          xpGained: isDead ? 0 : xpPerHero,
          levelsGained: levelsGained.get(pre.heroId) ?? 0,
          manaColorHex: heroData ? this.getPrimaryManaColor(heroData) : '#FFFFFF',
          hpText: `${hpCurrent}/${hpMax}`,
          hpFillWidth: hpMax > 0 ? Math.round((hpCurrent / hpMax) * 116) : 0,
          isDead,
        };
      });

      // Start animated victory screen — show reward panel immediately so XP bars
      // animate in view; continue button is gated on animation completion.
      this.victoryAnimator.start(heroSnapshots, reward.gold);
      victoryDefeatVM.victoryScreenActive = true;
      victoryDefeatVM.victoryContinueVisible = false;
      victoryDefeatVM.roomRewardVisible = true;
      this.sendLocalEvent(ShowVictoryDefeatEvent, {});

      const totalLevels = Array.from(levelsGained.values()).reduce((sum, v) => sum + v, 0);
      victoryDefeatVM.roomRewardTitle = 'ROOM CLEARED!';
      victoryDefeatVM.roomRewardXpText = `+${reward.xp} XP`;
      victoryDefeatVM.roomRewardGoldText = `+${reward.gold} Gold`;
      victoryDefeatVM.goldTotalText = `${this.dungeonState.gold} Gold`;
      victoryDefeatVM.roomRewardLevelUpText = totalLevels > 0 ? `LEVEL UP! (${totalLevels} hero${totalLevels > 1 ? 'es' : ''})` : '';
      this.updateDungeonHudText();

      if (!hasNextRoom) {
        victoryDefeatVM.roomRewardTitle = 'DUNGEON CLEARED!';
        this.runComplete = true;
      }

      this.triggerAutoSave();
      return;
    }

    // Defeat / Flee result screen
    const rosterIds = this.rosterManager.getRosterIds();

    // Capture room progress before endDungeon() clears state
    const roomReached = this.dungeonState.isInDungeon ? this.dungeonState.roomIndex + 1 : 0;
    const totalRooms = this.dungeonState.isInDungeon ? this.dungeonState.totalRooms : 0;

    // Sync HP: defeat zeroes all, flee preserves survivors
    if (!isFlee) {
      for (const heroId of rosterIds) {
        this.rosterManager.syncHpFromCombat(heroId, 0);
      }
    } else {
      this.rosterManager.syncAllHpFromCombat(this.teamState.heroes);
      const survivingIds = new Set(this.teamState.heroes.map(h => h.id));
      for (const heroId of rosterIds) {
        if (!survivingIds.has(heroId)) {
          this.rosterManager.syncHpFromCombat(heroId, 0);
        }
      }
    }

    // Populate defeat hero cards
    for (let i = 0; i < victoryDefeatVM.defeatHeroes.length; i++) {
      const vm = victoryDefeatVM.defeatHeroes[i];
      const heroId = rosterIds[i];
      if (!heroId) {
        vm.heroName = '';
        vm.texture = null;
        vm.isDead = false;
        vm.hpText = '';
        vm.hpFillWidth = 0;
        vm.cardOpacity = 0;
        continue;
      }
      const heroData = getHeroData(heroId);
      const hp = this.rosterManager.heroHp.get(heroId);
      const isDead = !hp || hp.current <= 0;
      const hpCurrent = isDead ? 0 : hp!.current;
      const hpMax = hp ? hp.max : (heroData?.baseHp ?? 0);
      const hpRatio = hpMax > 0 ? hpCurrent / hpMax : 0;
      vm.heroName = heroData?.name ?? 'Hero';
      vm.texture = heroData?.texture ?? null;
      vm.manaColorHex = heroData ? this.getPrimaryManaColor(heroData) : '#FFFFFF';
      vm.isDead = isDead;
      vm.hpText = isDead ? '' : `${hpCurrent}/${hpMax}`;
      vm.hpFillWidth = Math.round(hpRatio * 124);
      vm.hpBarColor = isDead ? '#FF3333' : hpRatio > 0.5 ? '#55FF88' : hpRatio > 0.25 ? '#FFDD44' : '#FF7733';
      vm.cardOpacity = isDead ? 0.6 : 1.0;
    }

    victoryDefeatVM.defeatTitle = isFlee ? 'FLED...' : 'DEFEAT';
    victoryDefeatVM.defeatTitleColor = isFlee ? '#FFAA33' : '#FF3333';
    victoryDefeatVM.defeatSubtitle = isFlee ? 'The party retreated!' : 'The party has fallen...';
    victoryDefeatVM.defeatRoomsText = totalRooms > 0 ? `Reached Room ${roomReached} of ${totalRooms}` : '';
    victoryDefeatVM.resultScreenVisible = true;
    this.sendLocalEvent(ShowVictoryDefeatEvent, {});

    this.dungeonState.endDungeon();
    this.triggerAutoSave();
  }

  // ===== Run Flow =====

  /** Show the roster screen as the main hub between runs and rooms. */
  private showRosterScreen(): void {
    this.gameState = GameState.RosterManagement;
    this.syncRosterToViewModel();
    this.syncEnterDungeonButton();

    this.sendLocalEvent(HideCombatBoardEvent, {});
    this.sendLocalEvent(HideDungeonSelectionEvent, {});
    this.sendLocalEvent(HideDungeonMapEvent, {});
    this.sendLocalEvent(HideVictoryDefeatEvent, {});
    this.sendLocalEvent(ShowHeroCollectionEvent, {});
  }

  /** Update the Enter Dungeon button label based on whether a run is active. */
  private syncEnterDungeonButton(): void {
    if (this.dungeonState.isInDungeon) {
      const progress = this.dungeonState.getProgress();
      const idx = (progress?.currentRoomIndex ?? 0) + 1;
      const total = progress?.totalRooms ?? 4;
      heroCollectionVM.enterDungeonButtonText = `Continue Run (${idx}/${total})`;
    } else {
      heroCollectionVM.enterDungeonButtonText = 'Enter Dungeon';
    }
  }

  /**
   * Transition from the roster screen into combat.
   * @param isNewRun true = fresh run (heroes already healed by caller); false = resume mid-run
   */
  private enterCombatFromRoster(isNewRun: boolean): void {
    const heroes = this.rosterManager.getRosterIds()
      .map(id => createHeroById(id))
      .filter((h): h is NonNullable<typeof h> => h != null);
    this.rosterManager.applyHpToHeroes(heroes);
    if (heroes.length > 0) this.teamState.setHeroes(heroes);

    const currentRoom = this.dungeonState.currentRoom;
    if (currentRoom) {
      this.viewModel.backgroundTexture = currentRoom.backgroundTexture;
    }

    heroCollectionVM.detailOverlayVisible = false;
    heroCollectionVM.buyPopupVisible = false;
    heroCollectionVM.buyConfirmVisible = false;
    heroCollectionVM.buyRollVisible = false;
    heroCollectionVM.buyResultVisible = false;
    heroCollectionVM.healPopupVisible = false;
    this._buyRollActive = false;
    this.sendLocalEvent(HideHeroCollectionEvent, {});
    this.sendLocalEvent(ShowCombatBoardEvent, {});
    this.gameState = GameState.Playing;

    if (!isNewRun) {
      // Mid-run resume: clear status effects, keep HP
      this.roomTransition.prepareHeroesForNextRoom(this.teamState.heroes);
    }
    this.startRoomCombat();
  }

  private startRoomCombat(): void {
    // Get enemies for the current room
    const enemies = this.roomTransition.getNextRoomEnemies();

    // Reset board and combat systems
    this.board = createBoard();
    this.score = 0;
    this.viewModel.shuffleText = '';
    victoryDefeatVM.resultScreenVisible = false;
    victoryDefeatVM.roomRewardVisible = false;
    this.gameState = GameState.Playing;

    this.inputHandler.clearSelection();
    this.animHandler.reset();
    this.shuffleHandler.reset();
    this.manaBank.reset();

    // Reset team with custom enemies (keep heroes from previous room)
    this.teamState.setEnemies(enemies);
    this.teamState.assignColors();
    this.teamState.resetHeroDisplayHp();
    this.hpBars.resetBarVisibility();
    // Force immediate update so alive bars snap to opacity=1 before render()
    this.hpBars.update(this.teamState, this.manaBank, 0);

    this.matchResolver.reset();
    this.combatFlow.reset();
    this.powerActivation.reset();
    this.multiAttackNotifier.clear();
    this.renderer.setCascadeCount(0);

    this.updateDungeonHudText();
    this.render();
  }

  private updateDungeonHudText(): void {
    const progress = this.dungeonState.getProgress();
    if (progress) {
      const room = this.dungeonState.currentRoom;
      this.viewModel.dungeonNameText = room?.biomeId ?? '';
      this.viewModel.dungeonRoomText = `Room ${progress.currentRoomIndex + 1}/${progress.totalRooms}`;
    }
    const rosterIds = this.rosterManager.getRosterIds();
    const avgLevel = rosterIds.length > 0
      ? Math.round(rosterIds.reduce((sum, id) => sum + this.rosterManager.getHeroLevel(id), 0) / rosterIds.length)
      : 1;
    this.viewModel.levelText = `Avg Lv.${avgLevel}`;
    this.viewModel.xpText = '';
  }

  /** Called by CombatFlowController when player regains control. */
  private onPlayerTurnReady(): void {
    if (!hasValidMoves(this.board)) {
      this.shuffleHandler.start(this.board);
      this.viewModel.shuffleText = 'Shuffling...';
    } else {
      this.inputHandler.clearSelection();
    }
  }

  private initGame(): void {
    this.score = 0;
    this.level = 1;
    this.viewModel.shuffleText = '';
    victoryDefeatVM.resultScreenVisible = false;
    victoryDefeatVM.roomRewardVisible = false;
    victoryDefeatVM.dungeonCompleteVisible = false;
    this.gameState = GameState.DungeonMap;

    this.inputHandler.clearSelection();
    this.animHandler.reset();
    this.shuffleHandler.reset();

    // Apply default roster to team state (HP will be updated after load completes)
    const heroes = this.rosterManager.getRosterIds()
      .map(id => createHeroById(id))
      .filter((h): h is NonNullable<typeof h> => h != null);
    this.rosterManager.applyHpToHeroes(heroes);
    if (heroes.length > 0) {
      this.teamState.setHeroes(heroes);
    } else {
      this.teamState.reset();
    }

    this.matchResolver.reset();
    this.combatFlow.reset();
    this.powerActivation.reset();

    // Don't show dungeon selection here - it's done in onStart() after all
    // components have initialized their visibility state.

    this.render();
  }

  // ===== Rendering helpers =====

  /** Visually bring the selected hero to the front during player turn. */
  private applySelectedHeroZIndexOverride(): void {
    if (this.combatFlow.phase !== CombatPhase.PlayerTurn) return;
    if (this.powerActivation.previewHeroIndex < 0) return;

    const sprites = this.viewModel.team.sprites;
    let maxZ = 0;
    for (const s of sprites) if (s.zIndex > maxZ) maxZ = s.zIndex;
    //const selected = sprites[this.powerActivation.previewHeroIndex];
    //if (selected) selected.zIndex = maxZ + 10;
  }

  /** Build hero touch targets from HP bars only — compact, stable, non-overlapping. */
  private updateHeroTouchTargets(): void {
    const targets: HeroTouchTarget[] = [];
    const heroes = this.teamState.heroes;
    const visuals = this.teamState.heroVisuals;

    for (let i = 0; i < heroes.length; i++) {
      const visual = visuals[i];
      if (visual.isDead) continue;
      if (visual.opacity < 0.1) continue;

      const bar = this.hpBars.getAllyBarForHero(i);
      if (!bar) continue;

      targets.push({
        heroIndex: i,
        x: bar.x,
        y: bar.y,
        width: bar.width,
        height: bar.height,
        priority: visual.scale,
      });
    }
    this.inputHandler.setHeroTouchTargets(targets);
  }

  /** Sync ManaBank state to ViewModel for XAML rendering. */
  private syncManaToViewModel(): void {
    this.viewModel.redManaText = String(this.manaBank.getMana(GemType.Red));
    this.viewModel.blueManaText = String(this.manaBank.getMana(GemType.Blue));
    this.viewModel.greenManaText = String(this.manaBank.getMana(GemType.Green));
    this.viewModel.yellowManaText = String(this.manaBank.getMana(GemType.Yellow));
    this.viewModel.purpleManaText = String(this.manaBank.getMana(GemType.Purple));
  }

  /** Sync roster manager state to ViewModel for XAML rendering. */
  private syncRosterToViewModel(): void {
    heroCollectionVM.goldText = String(this.dungeonState.gold);
    const collection = this.rosterManager.collection;
    const cards = heroCollectionVM.heroCards;
    // Slot 15 is the buy card — iterate hero slots only (0..14)
    for (let i = 0; i < cards.length - 1; i++) {
      const card = cards[i];
      const hero = collection[i];
      if (!hero) {
        card.isVisible = false;
        continue;
      }
      card.isVisible = true;
      const hp = this.rosterManager.heroHp.get(hero.id);
      const hpCurrent = hp?.current ?? hero.baseHp;
      const hpMax = hp?.max ?? hero.baseHp;
      card.name = hero.name;
      card.texture = hero.texture;
      card.inRoster = this.rosterManager.isInRoster(i);
      card.hpText = `${hpCurrent}/${hpMax}`;
      card.manaColorHex = this.getPrimaryManaColor(hero);
      card.levelText = `Lv.${this.rosterManager.getHeroLevel(hero.id)}`;
      card.hpFillWidth = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 136) : 0;
      card.hpBarColor = this.getHpBarColor(hpCurrent, hpMax);
      card.isDead = hpCurrent <= 0;
      card.recoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
      card.isHealing = hpCurrent < hpMax;
    }

    // Buy card slot (index 15): visible inline with hero cards unless player owns all heroes
    const hasAll = this.rosterManager.hasAllHeroes();
    heroCollectionVM.buyCanAfford = true;
    const buyCard = cards[15];
    buyCard.isVisible = !hasAll;
    if (!hasAll) {
      const price = this.getHeroPurchasePrice(collection.length);
      const isFree = price === 0;
      const affordable = isFree || this.dungeonState.gold >= price;
      heroCollectionVM.buyCanAfford = affordable;
      heroCollectionVM.buyPriceColorHex = affordable ? '#FFD700' : '#FF4444';
      buyCard.buyPriceText = isFree ? '' : String(price);
      buyCard.buyPriceColorHex = affordable ? '#FFD700' : '#FF4444';
      buyCard.buyIsFree = isFree;
      buyCard.buyShowGoldIcon = !isFree;
    }

    const slots = heroCollectionVM.rosterSlots;
    const equipped = this.rosterManager.rosterSlots;
    for (let s = 0; s < slots.length; s++) {
      const slotVm = slots[s];
      const hero = equipped[s];
      if (!hero) {
        slotVm.occupied = false;
        slotVm.name = '';
        slotVm.texture = null;
        slotVm.hpText = '';
        slotVm.manaColorHex = '#FFFFFF';
        slotVm.levelText = '';
        slotVm.hpFillWidth = 0;
        slotVm.isDead = false;
        slotVm.recoveryText = '';
        continue;
      }
      const hp = this.rosterManager.heroHp.get(hero.id);
      const hpCurrent = hp?.current ?? hero.baseHp;
      const hpMax = hp?.max ?? hero.baseHp;
      slotVm.occupied = true;
      slotVm.name = hero.name;
      slotVm.texture = hero.texture;
      slotVm.hpText = `${hpCurrent}/${hpMax}`;
      slotVm.manaColorHex = this.getPrimaryManaColor(hero);
      slotVm.levelText = `Lv.${this.rosterManager.getHeroLevel(hero.id)}`;
      slotVm.hpFillWidth = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 123) : 0;
      slotVm.hpBarColor = this.getHpBarColor(hpCurrent, hpMax);
      slotVm.isDead = hpCurrent <= 0;
      slotVm.recoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
    }

    heroCollectionVM.rosterCanEnterDungeon = this.rosterManager.isRosterValid();
  }

  private getRecoveryText(heroId: string, hpCurrent: number, hpMax: number): string {
    if (hpCurrent >= hpMax) return ''; // Already full

    const restorationMs = this.rosterManager.getRestorationTimeMs(heroId);
    if (restorationMs <= 0) return '';

    const totalSeconds = Math.ceil(restorationMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (m > 0) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${s} s`;
  }

  /** Refresh recovery timer text on cards, slots, and detail overlay (display only). */
  private refreshRecoveryTimers(): void {
    const cards = heroCollectionVM.heroCards;
    for (let i = 0; i < cards.length; i++) {
      const hero = this.rosterManager.collection[i];
      if (!hero) continue;
      const hp = this.rosterManager.heroHp.get(hero.id);
      const hpCurrent = hp?.current ?? hero.baseHp;
      const hpMax = hp?.max ?? hero.baseHp;
      cards[i].recoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
      cards[i].isHealing = hpCurrent < hpMax;
    }

    const slots = heroCollectionVM.rosterSlots;
    const equipped = this.rosterManager.rosterSlots;
    for (let s = 0; s < slots.length; s++) {
      const hero = equipped[s];
      if (!hero) continue;
      const hp = this.rosterManager.heroHp.get(hero.id);
      const hpCurrent = hp?.current ?? hero.baseHp;
      const hpMax = hp?.max ?? hero.baseHp;
      slots[s].recoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
    }

    // Update detail overlay if visible
    if (heroCollectionVM.detailOverlayVisible && this.rosterManager.selectedIndex >= 0) {
      const hero = this.rosterManager.collection[this.rosterManager.selectedIndex];
      if (hero) {
        const hp = this.rosterManager.heroHp.get(hero.id);
        const hpCurrent = hp?.current ?? hero.baseHp;
        const hpMax = hp?.max ?? hero.baseHp;
        heroCollectionVM.detailRecoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
        heroCollectionVM.detailRecoveryColor = hpCurrent <= 0 ? '#FFAA88' : '#88FF88';
      }
    }
  }

  private getHpBarColor(hpCurrent: number, hpMax: number): string {
    if (hpMax <= 0 || hpCurrent <= 0) return '#FF3333';
    const ratio = hpCurrent / hpMax;
    if (ratio > 0.75) return '#55FF88';
    if (ratio > 0.50) return '#FFDD44';
    if (ratio > 0.25) return '#FF8822';
    return '#FF3333';
  }

  /** Sync detail overlay for the hero at the given collection index. */
  private syncDetailOverlay(heroIndex: number): void {
    const hero = this.rosterManager.collection[heroIndex];
    if (!hero) return;

    const hp = this.rosterManager.heroHp.get(hero.id);
    const hpCurrent = hp?.current ?? hero.baseHp;
    const hpMax = hp?.max ?? hero.baseHp;
    heroCollectionVM.detailName = hero.name;
    heroCollectionVM.detailTexture = hero.texture;
    heroCollectionVM.detailAtkText = String(hero.baseAtk);
    heroCollectionVM.detailHpText = `${hpCurrent}/${hpMax}`;
    heroCollectionVM.detailHpFillWidth = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 300) : 0;
    heroCollectionVM.detailHpBarColor = this.getHpBarColor(hpCurrent, hpMax);
    heroCollectionVM.detailRecoveryText = this.getRecoveryText(hero.id, hpCurrent, hpMax);
    heroCollectionVM.detailHpColor = this.getHpBarColor(hpCurrent, hpMax);
    heroCollectionVM.detailRecoveryColor = hpCurrent <= 0 ? '#FFAA88' : '#88FF88';
    const heroLevel = this.rosterManager.getHeroLevel(hero.id);
    heroCollectionVM.detailLevelText = `Lv.${heroLevel}`;
    const xpProgress = this.rosterManager.getXpProgress(hero.id);
    heroCollectionVM.detailXpFillWidth = Math.round(xpProgress.percent * 284);
    heroCollectionVM.detailXpText = xpProgress.xpToNext === 0 ? 'MAX' : `${xpProgress.currentXp} / ${xpProgress.xpToNext}`;
    heroCollectionVM.detailPowerName = hero.power.name;
    heroCollectionVM.detailPowerDesc = hero.power.description ?? '';
    heroCollectionVM.detailManaColorHex = GEM_COLOR_HEX[hero.power.manaColor] ?? '#FFFFFF';
    heroCollectionVM.detailManaCost = String(hero.power.manaCost);
    heroCollectionVM.detailCostGemTexture = GEM_TEXTURE_BY_COLOR[hero.power.manaColor] ?? gemRedTexture;

    // Damage-per-color table: Damage = ATK × Affinity × 3 (base match of 3 gems)
    const dmgByColor = this.rosterManager.calculateDamageByColor(hero.id);
    const GEM_TYPES = [GemType.Red, GemType.Blue, GemType.Green, GemType.Yellow, GemType.Purple];
    const dmgValues = GEM_TYPES.map(g => String(Math.round(dmgByColor[g]?.damage ?? 0)));
    const multValues = GEM_TYPES.map(g => {
      const aff = hero.affinities[g] ?? 0;
      return `${aff.toFixed(1)}x`;
    });

    heroCollectionVM.detailDmgRed = dmgValues[0];
    heroCollectionVM.detailDmgBlue = dmgValues[1];
    heroCollectionVM.detailDmgGreen = dmgValues[2];
    heroCollectionVM.detailDmgYellow = dmgValues[3];
    heroCollectionVM.detailDmgPurple = dmgValues[4];
    heroCollectionVM.detailMultRed = multValues[0];
    heroCollectionVM.detailMultBlue = multValues[1];
    heroCollectionVM.detailMultGreen = multValues[2];
    heroCollectionVM.detailMultYellow = multValues[3];
    heroCollectionVM.detailMultPurple = multValues[4];
  }

  /** Get the primary (highest affinity) mana color hex for a hero. */
  private getPrimaryManaColor(hero: HeroData): string {
    let maxAff = 0;
    let maxColor = GemType.Red;
    for (const g of [GemType.Red, GemType.Blue, GemType.Green, GemType.Yellow, GemType.Purple]) {
      const aff = hero.affinities[g] ?? 0;
      if (aff > maxAff) { maxAff = aff; maxColor = g; }
    }
    return GEM_COLOR_HEX[maxColor] ?? '#FFFFFF';
  }

  private render(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.builder.clear();

    if (this.gameState === GameState.Playing) {
      // Background is rendered via XAML layers (Grid.Background + <Image>) which sit
      // BELOW the team sprites in z-order. Do NOT draw background on the DrawingSurface
      // as it would cover the XAML sprite layer beneath it.

      // Compute combined shake offset from all sources
      const shakeX = this.powerEffectParticles.shakeX;
      const shakeY = this.powerEffectParticles.shakeY;
      const boardShake = this.renderer.getShakeOffset();
      const totalShakeX = shakeX + boardShake.x + this.screenShake.shakeX;
      const totalShakeY = shakeY + boardShake.y + this.screenShake.shakeY;

      // Apply shake translate — board and particles move, background stays fixed
      if (totalShakeX !== 0 || totalShakeY !== 0) {
        this.builder.pushTranslate(new Vec2(totalShakeX, totalShakeY));
      }
      this.renderer.renderFrame(this.board, this.inputHandler.selectedGem, this.lastDt);
      this.powerEffectParticles.render(this.builder);
      if (totalShakeX !== 0 || totalShakeY !== 0) {
        this.builder.pop();
      }

      // Fullscreen power cinematic overlay — drawn last, on top of everything.
      this.powerCinematicRenderer.render(this.builder, this.powerAnimSystem, this.lastDt);
    } else if (this.gameState === GameState.GameOver) {
      // Keep the board visible beneath the victory/defeat overlay.
      this.renderer.renderFrame(this.board, null, this.lastDt);
    }

    // Victory screen overlay (syncs animated state to XAML ViewModels)
    if (this.victoryAnimator.isActive) {
      this.victoryAnimator.syncToViewModels(victoryDefeatVM.victoryHeroes);
    }

    this.viewModel.drawCommands = this.builder.build();
  }

  /** True while the fullscreen power cinematic is playing. */
  private get powerCinematicActive(): boolean {
    return this.powerAnimSystem.isActive;
  }

  // ===== Save/Load Integration =====

  /** Request the server to load saved data on game start. */
  private requestLoad(): void {
    // Only the client should request loads
    if (NetworkingService.get().isServerContext()) return;
    // Delay to allow global event infrastructure to initialize
    setTimeout(() => {
      this.sendGloballyWithRetry(PuzzleLoadRequestEvent, { requestId: Date.now() }, 'load');
    }, 1000);
  }

  /** Handle loaded save data from server. */
  @subscribe(PuzzleLoadCompleteEvent, { execution: ExecuteOn.Everywhere })
  onLoadComplete(payload: PuzzleLoadCompletePayload) {
    if (!payload.success || !payload.saveJson) {
      // New player: RosterManager constructor already set Warrior, Mage, Ranger
      // with full HP and level 1. Apply to team state and persist immediately.
      const heroes = this.rosterManager.getRosterIds()
        .map(id => createHeroById(id))
        .filter((h): h is NonNullable<typeof h> => h != null);
      this.rosterManager.applyHpToHeroes(heroes);
      if (heroes.length > 0) {
        this.teamState.setHeroes(heroes);
      }
      // Refresh hero collection screen with starter heroes
      this.syncRosterToViewModel();
      this.syncEnterDungeonButton();
      // Save immediately so the starter roster persists
      this.triggerAutoSave();
      return;
    }

    try {
      const data: SaveData = JSON.parse(payload.saveJson);
      if (!data || data.version == null) {
        return;
      }

      // Restore gold
      this.dungeonState.gold = data.gold ?? 0;
      heroCollectionVM.goldText = String(this.dungeonState.gold);

      // Restore owned heroes, roster, HP, and per-hero XP
      this.rosterManager.restoreFromSave(
        data.ownedHeroIds,
        data.rosterSlotIds ?? [null, null, null],
        data.heroHpEntries ?? [],
        data.heroXpEntries,
      );

      // Restore death timestamps for resurrection tracking
      if (data.heroDeathTimestamps) {
        this.rosterManager.restoreDeathTimestamps(data.heroDeathTimestamps);
      }

      // Apply offline regen based on elapsed time since last save
      if (data.lastSaveTimestamp && data.lastSaveTimestamp > 0) {
        const elapsedMs = Date.now() - data.lastSaveTimestamp;
        if (elapsedMs > 0) {
          this.rosterManager.applyOfflineRegen(data.lastSaveTimestamp);
        }
      }

      // Restore in-progress run if one was saved.
      // Guard: roomIndex must be in-bounds; a completed run saved before the
      // isDungeonComplete fix would have roomIndex === sequence.length, which
      // would restore an out-of-bounds state.
      if (data.activeRunSequence) {
        const sequence = deserializeRunSequence(data.activeRunSequence);
        const roomIndex = data.activeRunRoomIndex ?? 0;
        if (sequence && roomIndex < sequence.length) {
          this.dungeonState.restoreRun(sequence, roomIndex);
        }
      }

      // Re-apply roster to team state with saved HP
      const heroes = this.rosterManager.getRosterIds()
        .map(id => createHeroById(id))
        .filter((h): h is NonNullable<typeof h> => h != null);
      this.rosterManager.applyHpToHeroes(heroes);
      if (heroes.length > 0) {
        this.teamState.setHeroes(heroes);
      }

      // Update UI with average level
      const rosterIds = this.rosterManager.getRosterIds();
      const avgLevel = rosterIds.length > 0
        ? Math.round(rosterIds.reduce((sum, id) => sum + this.rosterManager.getHeroLevel(id), 0) / rosterIds.length)
        : 1;
      this.viewModel.levelText = `Avg Lv.${avgLevel}`;
      this.viewModel.xpText = '';


      // Refresh the hero collection screen so cards, roster slots, and gold
      // reflect the loaded save state.
      this.syncRosterToViewModel();
      this.syncEnterDungeonButton();
    } catch (e) {
      console.error('[GameComponent] Failed to parse save data:', e);
    }
  }

  /** Build and send save data to the server. */
  private triggerAutoSave(): void {
    // Only the client should send save requests
    if (NetworkingService.get().isServerContext()) {
      return;
    }
    const heroHpEntries = Array.from(this.rosterManager.heroHp.entries()).map(([id, hp]) => ({
      id,
      current: hp.current,
      max: hp.max,
    }));

    const heroXpEntries = Array.from(this.rosterManager.heroXp.entries()).map(([id, state]) => ({
      id,
      xp: state.xp,
      level: state.level,
    }));

    // Compute totalXp as sum of all hero XP for backward compatibility
    const totalXp = Array.from(this.rosterManager.heroXp.values())
      .reduce((sum, s) => sum + s.xp + (s.level - 1) * 100, 0);

    // A completed run (isDungeonComplete) must not be saved as active — doing so
    // stores an out-of-bounds roomIndex that causes room "6/5" with no enemies on reload.
    const runIsActive = this.dungeonState.isInDungeon && !this.dungeonState.isDungeonComplete();
    const activeRunSequence = runIsActive
      ? serializeRunSequence(this.dungeonState.getRunSequence())
      : null;

    const saveData: SaveData = {
      ownedHeroIds: this.rosterManager.getOwnedIds(),
      rosterSlotIds: this.rosterManager.rosterSlots.map(h => h?.id ?? null),
      heroHpEntries,
      heroXpEntries,
      totalXp,
      gold: this.dungeonState.gold,
      activeRunSequence,
      activeRunRoomIndex: runIsActive ? this.dungeonState.roomIndex : undefined,
      lastSaveTimestamp: Date.now(),
      heroDeathTimestamps: this.rosterManager.getDeathTimestamps(),
      version: SAVE_DATA_VERSION,
    };

    const saveJson = JSON.stringify(saveData);
    this.sendGloballyWithRetry(PuzzleSaveRequestEvent, { saveJson }, 'save');
  }

  /** Helper: send a NetworkEvent globally with retry on failure. */
  private sendGloballyWithRetry(event: any, payload: object, label: string): void {
    try {
      EventService.sendGlobally(event, payload);
    } catch (e) {
      setTimeout(() => {
        try {
          EventService.sendGlobally(event, payload);
        } catch (e2) {
          console.error(`[GameComponent] sendGlobally(${label}) retry failed permanently:`, e2);
        }
      }, 2000);
    }
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) customUi.dataContext = this.viewModel;
    this.inputHandler.enableTouchInput();
    this.render();
  }
}
