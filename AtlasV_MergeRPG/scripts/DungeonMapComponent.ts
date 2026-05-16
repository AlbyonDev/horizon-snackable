/**
 * DungeonMapComponent
 *
 * Component Attachment: Scene entity with CustomUiPlatformComponent (dungeon_map.xaml)
 * Component Networking: Local (UI is client-side only)
 * Component Ownership: Not Networked
 *
 * Displays the dungeon map screen with room progress nodes.
 * Visibility controlled by ShowDungeonMapEvent / HideDungeonMapEvent.
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
  dungeonMapVM,
  onEnterBattleClicked,
  onFleeDungeonClicked,
} from './DungeonMapViewModel';
import {
  ShowDungeonMapEvent,
  HideDungeonMapEvent,
  FwdEnterBattleEvent,
  FwdFleeDungeonEvent,
} from './ScreenEvents';

@component()
export class DungeonMapComponent extends Component {
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (this.customUi) {
      this.customUi.dataContext = dungeonMapVM;
      this.customUi.isVisible = false;
    }
  }

  @subscribe(ShowDungeonMapEvent)
  onShow() {
    if (this.customUi) {
      this.customUi.isVisible = true;
    }
  }

  @subscribe(HideDungeonMapEvent)
  onHide() {
    if (this.customUi) {
      this.customUi.isVisible = false;
    }
  }

  // ===== UiEvent Forwarding =====

  @subscribe(onEnterBattleClicked)
  onEnterBattle() {
    this.sendLocalEvent(FwdEnterBattleEvent, {});
  }

  @subscribe(onFleeDungeonClicked)
  onFleeDungeon() {
    this.sendLocalEvent(FwdFleeDungeonEvent, {});
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    if (this.customUi) {
      this.customUi.dataContext = dungeonMapVM;
    }
  }
}
