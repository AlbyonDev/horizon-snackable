/**
 * VictoryDefeatComponent
 *
 * Component Attachment: Scene entity with CustomUiPlatformComponent (victory_defeat.xaml)
 * Component Networking: Local (UI is client-side only)
 * Component Ownership: Not Networked
 *
 * Displays the victory/defeat/dungeon-complete screens.
 * Visibility controlled by ShowVictoryDefeatEvent / HideVictoryDefeatEvent.
 *
 * Subscribes to UiEvents from its own XAML buttons and forwards them
 * as LocalEvents so GameComponent (on a separate entity) can handle them.
 */
import {
  Component,
  component,
  subscribe,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { CustomUiComponent } from 'meta/custom_ui';
import { OnEntityStartEvent } from 'meta/platform_api';
import {
  victoryDefeatVM,
  onReturnClicked,
  onDungeonContinueClicked,
  onDungeonExitClicked,
} from './VictoryDefeatViewModel';
import {
  ShowVictoryDefeatEvent,
  HideVictoryDefeatEvent,
  FwdReturnEvent,
  FwdDungeonContinueEvent,
  FwdDungeonExitEvent,
} from './ScreenEvents';

@component()
export class VictoryDefeatComponent extends Component {
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (this.customUi) {
      this.customUi.dataContext = victoryDefeatVM;
      this.customUi.isVisible = false;
    }
  }

  @subscribe(ShowVictoryDefeatEvent)
  onShow() {
    if (this.customUi) {
      this.customUi.isVisible = true;
    }
  }

  @subscribe(HideVictoryDefeatEvent)
  onHide() {
    if (this.customUi) {
      this.customUi.isVisible = false;
    }
  }

  // ===== UiEvent Forwarding =====

  @subscribe(onReturnClicked)
  onReturn() {
    this.sendLocalEvent(FwdReturnEvent, {});
  }

  @subscribe(onDungeonContinueClicked)
  onDungeonContinue() {
    this.sendLocalEvent(FwdDungeonContinueEvent, {});
  }

  @subscribe(onDungeonExitClicked)
  onDungeonExit() {
    this.sendLocalEvent(FwdDungeonExitEvent, {});
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    if (this.customUi) {
      this.customUi.dataContext = victoryDefeatVM;
    }
  }
}
