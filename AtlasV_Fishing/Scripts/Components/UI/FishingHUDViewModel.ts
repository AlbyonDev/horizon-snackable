import {
  Component,
  CustomUiComponent,
  NetworkingService,
  OnEntityStartEvent,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEndedEvent,
  UiViewModel,
  component,
  subscribe,
  uiViewModel,
  type Maybe,
} from 'meta/worlds';
import type { OnFocusedInteractionInputEventPayload } from 'meta/worlds';

import { Events, HUDEvents } from '../../Types';
import { GamePhase } from '../../Types';
import { FishCollectionService } from '../../Services/FishCollectionService';
import { FISH_DEFS } from '../../FishDefs';
import { hookMaxFishAtLevel, WATER_SURFACE_Y, lineDepthAtLevel } from '../../Constants';

const TOTAL_FISH_COUNT = FISH_DEFS.length;
const XP_BAR_WIDTH     = 868; // 880 - 12 (margins), must match XAML

@uiViewModel()
export class FishingHUDData extends UiViewModel {
  isHudVisible      : string  = 'False';
  fishDiscovered    : number  = 0;
  fishTotal         : number  = TOTAL_FISH_COUNT;
  progressPercent   : number  = 0;
  progressBarWidth  : number  = 0;
  progressBarVisible: boolean = false;
  fishProgressText  : string  = `0/${TOTAL_FISH_COUNT}`;
  isSwipeHintVisible: string  = 'False';
  fishCountText     : string  = '0/1';

  /** Depth counter text */
  depthText: string = '0.0 m';

  /** Max depth text (shows max line depth for current upgrade level) */
  maxDepthText: string = '/ 15.0 m';

  /** Depth counter visibility - string for XAML DataTrigger ('True'/'False') */
  isDepthVisible: string = 'False';
}

@component()
export class FishingHUDViewModel extends Component {

  private _vm  = new FishingHUDData();
  private _ui: Maybe<CustomUiComponent> = null;
  private _isDiving  = false;
  private _isTouching = false;
  private _hookedCount = 0;
  private _maxFish = 1;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._ui = this.entity.getComponent(CustomUiComponent);
    if (this._ui) this._ui.dataContext = this._vm;
    this._updateProgressBar();
    this._updateFishCount();
  }

  @subscribe(Events.FishCaught)
  onFishCaught(_p: Events.FishCaughtPayload): void {
    this._updateProgressBar();
    this._vm.progressBarVisible = true;
  }

  @subscribe(HUDEvents.UpdateProgress)
  onUpdateProgress(_p: HUDEvents.UpdateProgressPayload): void {
    this._updateProgressBar();
  }

  @subscribe(HUDEvents.HideCatch)
  onHideCatch(_p: HUDEvents.HideCatchPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._vm.progressBarVisible = false;
  }

  private _updateProgressBar(): void {
    const discovered          = FishCollectionService.get().totalUnique();
    const percent             = TOTAL_FISH_COUNT > 0 ? (discovered / TOTAL_FISH_COUNT) * 100 : 0;
    this._vm.fishDiscovered   = discovered;
    this._vm.progressPercent  = percent;
    this._vm.progressBarWidth = (percent / 100) * XP_BAR_WIDTH;
    this._vm.fishProgressText = `${discovered}/${TOTAL_FISH_COUNT}`;
  }

  // --- Fish count tracking ---

  @subscribe(Events.FishHooked)
  onFishHooked(_p: Events.FishHookedPayload): void {
    this._hookedCount++;
    this._updateFishCount();
  }

  @subscribe(Events.UpgradesChanged)
  onUpgradesChanged(p: Events.UpgradesChangedPayload): void {
    this._maxFish = p.maxFish;
    this._updateFishCount();
    this._vm.maxDepthText = `/ ${p.maxDepth.toFixed(1)} m`;
  }

  @subscribe(Events.ProgressLoaded)
  onProgressLoaded(p: Events.ProgressLoadedPayload): void {
    this._maxFish = hookMaxFishAtLevel(p.hookLevel);
    this._updateFishCount();
    this._vm.maxDepthText = `/ ${lineDepthAtLevel(p.lineLevel).toFixed(1)} m`;
  }

  private _updateFishCount(): void {
    this._vm.fishCountText = `${this._hookedCount}/${this._maxFish}`;
  }

  // --- Phase & swipe hint ---

  @subscribe(Events.PhaseChanged)
  onPhaseChanged(p: Events.PhaseChangedPayload): void {
    this._isDiving = p.phase === GamePhase.Diving;
    this._updateSwipeHint();

    // Show HUD during Diving and Surfacing phases
    const showHud = p.phase === GamePhase.Diving || p.phase === GamePhase.Surfacing;
    this._vm.isHudVisible = showHud ? 'True' : 'False';

    // Depth visible: Diving and Surfacing phases
    if (p.phase === GamePhase.Diving || p.phase === GamePhase.Surfacing) {
      this._vm.isDepthVisible = 'True';
    } else {
      this._vm.isDepthVisible = 'False';
    }

    // Reset depth text when not diving
    if (p.phase !== GamePhase.Diving) {
      this._vm.depthText = '0.0 m';
    }

    // Reset hooked count when entering Diving phase (new run)
    if (p.phase === GamePhase.Diving) {
      this._hookedCount = 0;
      this._updateFishCount();
    }
  }

  // -- Depth counter (hook position) --
  @subscribe(Events.HookMoved)
  private _onHookMoved(p: Events.HookMovedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const depth = Math.max(0, WATER_SURFACE_Y - p.y);
    this._vm.depthText = `${depth.toFixed(1)} m`;
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(_p: OnFocusedInteractionInputEventPayload): void {
    this._isTouching = true;
    this._updateSwipeHint();
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(_p: OnFocusedInteractionInputEventPayload): void {
    this._isTouching = false;
    this._updateSwipeHint();
  }

  private _updateSwipeHint(): void {
    this._vm.isSwipeHintVisible = (this._isDiving && !this._isTouching) ? 'True' : 'False';
  }

}
