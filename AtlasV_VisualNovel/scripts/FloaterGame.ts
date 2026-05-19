/**
 * FloaterGameV2 — Slim orchestrator for the refactored architecture.
 *
 * Responsibilities:
 *   - Construct shared state + all subsystems + all controllers, wired
 *     together via constructor injection (no internal event bus).
 *   - Bridge Meta platform/world events (lifecycle, focused interaction,
 *     save events) to the relevant controllers via @subscribe handlers.
 *   - Drive the per-frame update order in onUpdate.
 *
 * No gameplay logic, no rendering, no animation, no save serialization —
 * everything lives in the focused controller files. This class is the wiring
 * harness only.
 *
 * Component Attachment: Scene Entity (2d_game_entity)
 * Component Networking: Local (single-player 2D game)
 * Component Ownership: Not Networked
 */

import {
  Component,
  component,
  subscribe,
} from 'meta/platform_api';
import {
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
} from 'meta/platform_api';
import { CustomUiComponent, DrawingCommandsBuilder } from 'meta/custom_ui';
import {
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputEventPayload,
  NetworkingService,
  ExecuteOn,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import {
  floaterVM,
  onFloaterStartGame,
  onFloaterActionSelected,
  onFloaterNewCast,
  onFloaterSkipBeat,
  onFloaterCastStart,
  onDayNightToggle,
  onJournalOpen,
  onJournalClose,
  onJournalTabSwitch,
  onInventoryOpen,
  onInventoryClose,
  onInventoryEquip,
  onCGViewerDismiss,
  onCGItemTapped,
  onResetSavePressed,
  onResetSaveConfirm,
  onResetSaveCancel,
  onCharacterDetailOpen,
  onCharacterDetailClose,
  FloaterActionSelectedPayload,
  FloaterTabSelectedPayload,
  FloaterLureSelectedPayload,
} from './FloaterViewModel';
import { FloaterRenderer } from './FloaterRenderer';

import { FlagSystem } from './FlagSystem';
import { SaveSystem } from './SaveSystem';
import { AffectionSystem } from './AffectionSystem';
import { QuestSystem } from './QuestSystem';
import { EncounterSystem } from './EncounterSystem';
import { CGGallerySystem } from './CGGallerySystem';
import { JournalSystem } from './JournalSystem';
import { GlobalStatsSystem } from './GlobalStatsSystem';
import { characterRegistry } from './CharacterRegistry';

import {
  OnSaveDataLoaded,
  OnCGDataLoaded,
  OnResetComplete,
  SaveDataLoadedPayload,
  ResetCompletePayload,
  CGDataLoadedPayload,
} from './SaveEvents';

import { ALL_LURES } from './LureData';
import { GamePhase } from './Types';

import { FloaterSharedState } from './FloaterSharedState';
import { CastSimulation } from './CastSimulation';
import { AnimationsRunner } from './AnimationsRunner';
import { SaveCoordinator } from './SaveCoordinator';
import { UIPresenter } from './UIPresenter';
import { DialogueController } from './DialogueController';
import { PhaseController } from './PhaseController';
import { InputController } from './InputController';

@component()
export class FloaterGame extends Component {
  // === Drawing surface ===
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();
  private renderer: Maybe<FloaterRenderer> = null;

  // === Subsystem ref-boxes (replaceable on reset) ===
  private flagSystemRef = { current: new FlagSystem() };
  private questSystemRef = { current: new QuestSystem() };
  private cgGallerySystemRef = { current: new CGGallerySystem() };
  private journalSystemRef = { current: new JournalSystem() };
  private globalStatsSystemRef = { current: new GlobalStatsSystem() };

  // === Singleton subsystems ===
  private readonly saveSystem: SaveSystem = new SaveSystem();
  private readonly affectionSystem: AffectionSystem = new AffectionSystem();
  private readonly encounterSystem: EncounterSystem = new EncounterSystem();

  // === Shared state ===
  private readonly state: FloaterSharedState = new FloaterSharedState(
    this.affectionSystem,
    characterRegistry.getDefaultCharacterId(),
  );

  // === Controllers (initialized in onCreate after renderer is ready) ===
  private cast!: CastSimulation;
  private anim!: AnimationsRunner;
  private save!: SaveCoordinator;
  private presenter!: UIPresenter;
  private dialogue!: DialogueController;
  private phaseCtrl!: PhaseController;
  private input!: InputController;

  // === dt computation ===
  private lastTime: number = 0;

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }

    this.wireControllers();

    // Seed Day/Night from the player's wall-clock hour (6h-18h = Day).
    const hour = new Date().getHours();
    this.state.isDayMode = hour >= 6 && hour < 18;
    floaterVM.isDayMode = this.state.isDayMode;
    floaterVM.dayNightButtonRotation = this.state.isDayMode ? 180 : 0;

    this.save.loadGame(this.dialogue.seenBeats);
    this.presenter.present(this.dialogue.snapshot());
    console.log('[FloaterGameV2] Created');
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (!NetworkingService.get().isPlayerContext()) return;
    this.input.enableTouchInput();
    console.log('[FloaterGameV2] Started, touch enabled');
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const clampedDt = Math.min(dt, 1 / 30);
    this.state.time += clampedDt;

    // Save: tick (deferred flushes).
    this.save.update(clampedDt, Array.from(this.dialogue.seenBeats));

    // Animations that gate phase transitions go first.
    this.anim.updateFadeTransition(clampedDt);
    this.anim.updateDayNightFade(clampedDt);
    this.anim.updateIntro(clampedDt);

    // Phase / dialogue / cast updates.
    this.phaseCtrl.update(clampedDt);

    // Cosmetic per-frame anims (don't drive transitions).
    this.cast.updateFloatDip(clampedDt);
    this.cast.updateActionAnimation(clampedDt);
    this.anim.updateActionButtonAnimation(clampedDt);
    this.anim.updateIdleBarAnimation(clampedDt);
    this.anim.updateEmotionIcons(clampedDt);
    this.anim.updateCharacterRipples(clampedDt);
    this.anim.updateFloatIdleRipples(clampedDt, this.cast.landingTargetX, this.cast.landingTargetY);
    this.anim.updatePortraitAnimation(clampedDt);

    // Compose VM + draw.
    this.presenter.present(this.dialogue.snapshot());
  }

  // === Controller wiring ===

  private wireControllers(): void {
    this.cast = new CastSimulation();

    this.anim = new AnimationsRunner(this.state, {
      onFadeToBlackComplete: () => this.phaseCtrl.onTitleFadeComplete(),
      onIntroComplete: () => this.phaseCtrl.onIntroComplete(),
      onDayNightSwap: () => {
        this.state.isDayMode = !this.state.isDayMode;
        floaterVM.isDayMode = this.state.isDayMode;
        floaterVM.dayNightButtonRotation = this.state.isDayMode ? 180 : 0;
      },
    });

    this.save = new SaveCoordinator(
      this.state,
      this.flagSystemRef,
      this.questSystemRef,
      this.cgGallerySystemRef,
      this.journalSystemRef,
      this.globalStatsSystemRef,
      this.saveSystem,
      this.affectionSystem,
      {
        onLoadComplete: () => this.presenter && this.presenter.syncFromState(this.dialogue.snapshot()),
        onGameplayReset: () => this.onGameplayReset(),
      },
    );

    this.presenter = new UIPresenter(
      this.state,
      this.cast,
      this.anim,
      this.builder,
      this.renderer!,
      this.flagSystemRef,
      this.journalSystemRef,
      this.cgGallerySystemRef,
      this.globalStatsSystemRef,
    );

    // Dialogue ← PhaseTransitions interface forward (resolved later because
    // PhaseController doesn't exist yet at construction time).
    const phaseTransitionsProxy = {
      enterDeparture: (drift: any) => this.phaseCtrl.enterDeparture(drift),
      enterInkDeparture: (drift: any) => this.phaseCtrl.enterInkDeparture(drift),
      triggerEnding: (id: string) => this.phaseCtrl.triggerEnding(id),
      isAtEndOfCast: () => this.phaseCtrl.isAtEndOfCast(),
    };

    this.dialogue = new DialogueController(
      this.state,
      this.cast,
      this.anim,
      this.flagSystemRef,
      this.cgGallerySystemRef,
      this.affectionSystem,
      phaseTransitionsProxy,
      {
        requestSave: () => this.save.requestSave(),
        flushImmediate: () => this.save.flushImmediate(Array.from(this.dialogue.seenBeats)),
        persistCGData: () => this.save.persistCGData(),
      },
    );

    this.phaseCtrl = new PhaseController(
      this.state,
      this.cast,
      this.anim,
      this.dialogue,
      this.presenter,
      this.flagSystemRef,
      this.questSystemRef,
      this.cgGallerySystemRef,
      this.journalSystemRef,
      this.globalStatsSystemRef,
      this.encounterSystem,
      this.affectionSystem,
      {
        requestSave: () => this.save.requestSave(),
        flushImmediate: () => this.save.flushImmediate(Array.from(this.dialogue.seenBeats)),
        persistCGData: () => this.save.persistCGData(),
      },
    );

    this.input = new InputController(
      this.state,
      this.cast,
      this.anim,
      this.dialogue,
      this.phaseCtrl,
      this.cgGallerySystemRef,
      this.questSystemRef,
      this.save,
    );
  }

  /** Called by SaveCoordinator after a reset. Re-initialize controllers' own
   *  per-game state (the controllers themselves are stable; only their data
   *  resets). */
  private onGameplayReset(): void {
    this.dialogue.resetAll();
    this.cast.resetForNewCast();
    this.anim.resetAll();
    this.phaseCtrl.resetAll();

    // Reset ViewModel surface.
    floaterVM.titleVisible = true;
    floaterVM.hudVisible = false;
    floaterVM.actionMenuVisible = false;
    floaterVM.departureVisible = false;
    floaterVM.idleVisible = false;
    floaterVM.castButtonVisible = false;
    floaterVM.endingVisible = false;
    floaterVM.dialogueVisible = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;
    floaterVM.inventoryVisible = false;
    floaterVM.journalVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.idleBarVisible = false;
    floaterVM.idleBarOpacity = 0;
    floaterVM.idleBarTranslateY = 40;
    floaterVM.cgViewerVisible = false;
    floaterVM.resetConfirmVisible = false;
    floaterVM.introVisible = false;

    this.presenter.present(this.dialogue.snapshot());
  }

  // === Event bridges ===

  @subscribe(onFloaterStartGame)
  onStartGame(): void {
    this.phaseCtrl.beginStartGameFade();
  }

  @subscribe(onFloaterActionSelected)
  onActionSelected(payload: FloaterActionSelectedPayload): void {
    if (this.state.phase !== GamePhase.ActionSelect) return;
    this.dialogue.handleAction(payload.parameter as any);
    this.presenter.syncAffectionDisplay();
  }

  @subscribe(onFloaterNewCast)
  onNewCast(): void {
    if (this.state.phase !== GamePhase.Idle) return;
    floaterVM.idleVisible = false;
    this.phaseCtrl.enterLakeIdle();
  }

  @subscribe(onFloaterSkipBeat)
  onSkipBeat(): void {
    this.dialogue.toggleSkip();
  }

  @subscribe(onDayNightToggle)
  onDayNightToggle(): void {
    this.anim.beginDayNightFade();
  }

  @subscribe(onFloaterCastStart)
  onCastStart(): void {
    if (this.state.phase !== GamePhase.LakeIdle) return;
    this.cast.beginAim();
    this.anim.hideIdleBar();
    floaterVM.castInstructionVisible = true;
  }

  // === Journal / inventory / CG / character-detail event bridges ===

  @subscribe(onJournalOpen)
  onJournalOpenEvent(): void {
    this.anim.setIdleBarResponding('journal');
    floaterVM.journalVisible = true;
    floaterVM.setJournalTab(0);
    this.presenter.refreshJournalData();
  }

  @subscribe(onJournalClose)
  onJournalCloseEvent(): void {
    floaterVM.journalVisible = false;
    if (this.state.phase === GamePhase.LakeIdle || this.state.phase === GamePhase.Idle) {
      this.anim.showIdleBar();
    }
  }

  @subscribe(onJournalTabSwitch)
  onJournalTabSwitchEvent(payload: FloaterTabSelectedPayload): void {
    const idx = parseInt(payload.parameter, 10);
    if (idx >= 0 && idx <= 2) {
      floaterVM.setJournalTab(idx);
      if (idx === 2) {
        floaterVM.setStatItems(this.globalStatsSystemRef.current.getStructuredStats());
        floaterVM.setBadgeItems(this.globalStatsSystemRef.current.getStructuredBadges());
      }
    }
  }

  @subscribe(onCGViewerDismiss)
  onCGViewerDismissEvent(): void {
    this.cgGallerySystemRef.current.closeViewer();
    floaterVM.cgViewerVisible = false;
  }

  @subscribe(onCGItemTapped)
  onCGItemTappedEvent(payload: FloaterTabSelectedPayload): void {
    const cgId = payload.parameter;
    if (this.cgGallerySystemRef.current.isCGUnlocked(cgId)) {
      this.cgGallerySystemRef.current.openViewer(cgId);
      floaterVM.cgViewerVisible = true;
      floaterVM.cgViewerImage = this.cgGallerySystemRef.current.getCGTexture(cgId);
    }
  }

  @subscribe(onCharacterDetailOpen)
  onCharacterDetailOpenEvent(payload: FloaterTabSelectedPayload): void {
    this.presenter.openCharacterDetail(payload.parameter);
  }

  @subscribe(onCharacterDetailClose)
  onCharacterDetailCloseEvent(): void {
    floaterVM.charDetailVisible = false;
  }

  @subscribe(onInventoryOpen)
  onInventoryOpenEvent(): void {
    if (this.state.phase !== GamePhase.LakeIdle && this.state.phase !== GamePhase.Idle) return;
    this.anim.setIdleBarResponding('bait');
    floaterVM.inventoryVisible = true;
  }

  @subscribe(onInventoryClose)
  onInventoryCloseEvent(): void {
    floaterVM.inventoryVisible = false;
    if (this.state.phase === GamePhase.LakeIdle || this.state.phase === GamePhase.Idle) {
      this.anim.showIdleBar();
    }
  }

  @subscribe(onInventoryEquip)
  onInventoryEquipEvent(payload: FloaterLureSelectedPayload): void {
    const lureId = payload.parameter;
    if (!lureId) return;

    if (lureId === 'none') {
      this.state.equippedLureId = null;
      floaterVM.setEquippedLure('none', 'None', 'No lure equipped. Fish will still bite, but lures can improve your chances.');
    } else {
      this.state.equippedLureId = lureId;
      const lure = ALL_LURES[lureId];
      const name = lure ? lure.name : lureId;
      const desc = lure ? lure.description : '';
      floaterVM.setEquippedLure(lureId, name, desc);
    }
    this.save.requestSave();
  }

  // === Save event bridges ===

  @subscribe(OnSaveDataLoaded, { execution: ExecuteOn.Everywhere })
  onSaveDataLoaded(payload: SaveDataLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.save.setReady();
    if (payload.data && payload.data.length > 0) {
      this.save.setPersistentData(payload.data);
      this.save.loadGame(this.dialogue.seenBeats);
      this.presenter.syncFromState(this.dialogue.snapshot());
      this.presenter.present(this.dialogue.snapshot());
    }
  }

  @subscribe(OnCGDataLoaded, { execution: ExecuteOn.Everywhere })
  onCGDataLoaded(payload: CGDataLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.save.applyPersistentCGData(payload.data);
  }

  @subscribe(OnResetComplete, { execution: ExecuteOn.Everywhere })
  onResetComplete(payload: ResetCompletePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!payload.success) {
      console.log('[FloaterGameV2] Reset failed on server');
      return;
    }
    this.save.resetAllGameState();
  }

  @subscribe(onResetSavePressed)
  onResetSavePressedEvent(): void {
    floaterVM.resetConfirmVisible = true;
  }

  @subscribe(onResetSaveConfirm)
  onResetSaveConfirmEvent(): void {
    floaterVM.resetConfirmVisible = false;
    floaterVM.journalVisible = false;
    this.save.requestReset();
  }

  @subscribe(onResetSaveCancel)
  onResetSaveCancelEvent(): void {
    floaterVM.resetConfirmVisible = false;
  }

  // === Touch input bridges ===

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    this.input.onTouchStart(payload);
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(payload: OnFocusedInteractionInputEventPayload): void {
    this.input.onTouchMove(payload);
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(payload: OnFocusedInteractionInputEventPayload): void {
    this.input.onTouchEnd(payload);
  }

  // === Hot reload ===

  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }
    this.presenter.syncFromState(this.dialogue.snapshot());
    if (NetworkingService.get().isPlayerContext()) {
      this.input.enableTouchInput();
    }
    this.presenter.present(this.dialogue.snapshot());
  }
}
