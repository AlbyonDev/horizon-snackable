import {
  Component,
  CustomUiComponent,
  EventService,
  LocalEvent,
  NetworkingService,
  OnEntityDestroyEvent,
  OnEntityStartEvent,
  UiEvent,
  UiViewModel,
  component,
  serializable,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';

import { Events, GamePhase } from '../../Types';
import { upgradeCost, LINE_MAX_LEVEL, HOOK_MAX_LEVEL, lineDepthAtLevel, hookMaxFishAtLevel } from '../../Constants';
import { TitleScreenPlayRequested } from './TitleScreenUIComponent';

// ─── Module-level UiEvent declarations (unique prefixed IDs) ─────────────────
@serializable()
class InteractiveHUDCastPressedPayload {
  readonly parameter: string = '';
}
export const interactiveCastPressedEvent = new UiEvent(
  'InteractiveHUD-onCastPressed',
  InteractiveHUDCastPressedPayload,
);

@serializable()
class InteractiveHUDBuyLinePayload {
  readonly parameter: string = '';
}
export const interactiveBuyLineEvent = new UiEvent(
  'InteractiveHUD-onBuyLine',
  InteractiveHUDBuyLinePayload,
);

@serializable()
class InteractiveHUDBuyHookPayload {
  readonly parameter: string = '';
}
export const interactiveBuyHookEvent = new UiEvent(
  'InteractiveHUD-onBuyHook',
  InteractiveHUDBuyHookPayload,
);

export const onOpenFishCollectionEvent = new UiEvent('InteractiveHUD-onOpenFishCollection');

/** LocalEvent relay — broadcast when the XAML fish collection button is pressed */
export const OpenFishCollectionRequested = new LocalEvent('InteractiveHUD-OpenFishCollectionRequested');

// ─── ViewModel ──────────────────────────────────────────────────────────────
@uiViewModel()
export class InteractiveHUDData extends UiViewModel {
  /** Cast button label */
  castButtonText: string = 'CAST';

  /** HUD visibility — string for XAML DataTrigger ('True'/'False') */
  isHudVisible: string = 'True';

  /** Whether root is hit-test-visible. True only during IDLE. */
  isInteractive: boolean = true;

  /** Upgrade levels */
  lineLevel: number = 0;
  hookLevel: number = 0;

  /** Upgrade costs (display strings) */
  lineCost: string = '100';
  hookCost: string = '150';

  /** Current/next upgrade value display */
  lineCurrentValue: string = '';
  lineNextValue: string = '';
  hookCurrentValue: string = '';
  hookNextValue: string = '';

  /** Collection progress text e.g. "3/31" */
  collectionProgressText: string = '0/31';

  /** Collection button visibility (used when overlay opens/closes) */
  isCollectionBtnVisible: boolean = true;

  override readonly events = {
    castPressed: interactiveCastPressedEvent,
    buyLine: interactiveBuyLineEvent,
    buyHook: interactiveBuyHookEvent,
    onOpenFishCollection: onOpenFishCollectionEvent,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
/**
 * InteractiveHUDViewModel — drives the InteractiveHUD XAML (buttons only).
 *
 * The key behaviour: when NOT in Idle phase, play hide animation then set
 * `customUI.isVisible = false` so the interactive layer stops blocking swipe.
 * When returning to Idle, set `isVisible = true` first, then trigger the show
 * animation so the XAML transition can play.
 *
 * Component Attachment: Scene entity (InteractiveHUD entity)
 * Component Networking: Local (UI only, client-side)
 * Component Ownership: Not Networked
 */
@component()
export class InteractiveHUDViewModel extends Component {
  private _vm = new InteractiveHUDData();
  private _ui: Maybe<CustomUiComponent> = null;
  private _playPressed = false;

  /** Track hide timer so we can cancel it if show is requested mid-hide */
  private _hideTimerId: ReturnType<typeof setTimeout> | null = null;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) {
      this._ui.dataContext = this._vm;
      this._ui.isVisible = false;
    }
  }

  @subscribe(TitleScreenPlayRequested)
  private _onPlayPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] Play pressed, showing HUD');
    this._playPressed = true;
    this._showHUD();
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    if (this._hideTimerId !== null) {
      clearTimeout(this._hideTimerId);
      this._hideTimerId = null;
    }
  }

  // ── UiEvent handlers ─────────────────────────────────────────────────────
  @subscribe(interactiveCastPressedEvent)
  private _onCastPressed(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.CastRequested, {});
  }

  @subscribe(interactiveBuyLineEvent)
  private _onBuyLine(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'line' });
  }

  @subscribe(interactiveBuyHookEvent)
  private _onBuyHook(): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.BuyUpgrade, { upgrade: 'hook' });
  }

  @subscribe(onOpenFishCollectionEvent)
  private _onOpenFishCollection(): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[InteractiveHUDViewModel] Relaying OpenFishCollectionRequested');
    EventService.sendLocally(OpenFishCollectionRequested, {});
  }

  // ── Phase visibility ─────────────────────────────────────────────────────
  @subscribe(Events.PhaseChanged)
  private _onPhase(p: Events.PhaseChangedPayload): void {
    if (p.phase === GamePhase.Idle) {
      this._showHUD();
    } else {
      this._hideHUD();
    }
  }

  // ── Upgrade data updates ─────────────────────────────────────────────────
  @subscribe(Events.ProgressLoaded)
  private _onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  @subscribe(Events.UpgradesChanged)
  private _onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    this._applyUpgradeLevels(p.lineLevel, p.hookLevel);
  }

  private _applyUpgradeLevels(lineLevel: number, hookLevel: number): void {
    this._vm.lineLevel = lineLevel;
    this._vm.hookLevel = hookLevel;
    this._vm.lineCost = lineLevel < LINE_MAX_LEVEL ? `${upgradeCost(lineLevel + 1)}` : 'MAX';
    this._vm.hookCost = hookLevel < HOOK_MAX_LEVEL ? `${upgradeCost(hookLevel + 1)}` : 'MAX';

    // Current/next upgrade value display
    this._vm.lineCurrentValue = `${lineDepthAtLevel(lineLevel)}m`;
    this._vm.lineNextValue = lineLevel < LINE_MAX_LEVEL ? `${lineDepthAtLevel(lineLevel + 1)}m` : 'MAX';
    this._vm.hookCurrentValue = `${hookMaxFishAtLevel(hookLevel)}`;
    this._vm.hookNextValue = hookLevel < HOOK_MAX_LEVEL ? `${hookMaxFishAtLevel(hookLevel + 1)}` : 'MAX';
  }

  // ── Show / Hide with isVisible gating ────────────────────────────────────
  // -- Collection button helpers (called by FishCollectionUIComponent) --
  /** Called by FishCollectionUIComponent to update the progress text on the button */
  public updateProgressText(text: string): void {
    this._vm.collectionProgressText = text;
  }

  /** Hide the collection button (called when collection overlay is opened) */
  public hideCollectionButton(): void {
    this._vm.isCollectionBtnVisible = false;
  }

  /** Show the collection button (called when collection overlay is closed) */
  public showCollectionButton(): void {
    this._vm.isCollectionBtnVisible = true;
  }

  /** Show: set isVisible=true FIRST so XAML can render, then trigger animation */
  private _showHUD(): void {
    if (!this._playPressed) return;

    if (this._hideTimerId !== null) {
      clearTimeout(this._hideTimerId);
      this._hideTimerId = null;
    }

    if (this._ui) this._ui.isVisible = true;
    this._vm.isInteractive = true;
    this._vm.isHudVisible = 'True';
  }

  /** Hide: play exit animation, then after 700ms set isVisible=false */
  private _hideHUD(): void {
    this._vm.isHudVisible = 'False';
    this._vm.isInteractive = false;

    if (this._hideTimerId !== null) {
      clearTimeout(this._hideTimerId);
      this._hideTimerId = null;
    }

    // Delay isVisible=false until exit animation completes (~700ms)
    this._hideTimerId = setTimeout(() => {
      this._hideTimerId = null;
      if (this._ui && this._vm.isHudVisible === 'False') {
        this._ui.isVisible = false;
      }
    }, 700);
  }
}
