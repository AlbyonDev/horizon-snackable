/**
 * DungeonSelectionComponent
 *
 * Component Attachment: Scene entity with CustomUiPlatformComponent (dungeon_selection.xaml)
 * Component Networking: Local (UI is client-side only)
 * Component Ownership: Not Networked
 *
 * Displays the dungeon selection screen. Visibility controlled by
 * ShowDungeonSelectionEvent / HideDungeonSelectionEvent from GameComponent.
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
  dungeonSelectionVM,
  onDungeonSelectClicked,
  onManageTeamClicked,
} from './DungeonSelectionViewModel';
import type { DungeonSelectPayload } from './DungeonSelectionViewModel';
import {
  ShowDungeonSelectionEvent,
  HideDungeonSelectionEvent,
  FwdDungeonSelectEvent,
  FwdManageTeamEvent,
} from './ScreenEvents';

@component()
export class DungeonSelectionComponent extends Component {
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (this.customUi) {
      this.customUi.dataContext = dungeonSelectionVM;
      // Start hidden; GameComponent will show us via event
      this.customUi.isVisible = false;
    }
  }

  @subscribe(ShowDungeonSelectionEvent)
  onShow() {
    if (this.customUi) {
      this.customUi.isVisible = true;
    }
  }

  @subscribe(HideDungeonSelectionEvent)
  onHide() {
    if (this.customUi) {
      this.customUi.isVisible = false;
    }
  }

  // ===== UiEvent Forwarding =====
  // UiEvents are entity-scoped; forward as LocalEvents for GameComponent.

  @subscribe(onDungeonSelectClicked)
  onDungeonSelect(payload: DungeonSelectPayload) {
    this.sendLocalEvent(FwdDungeonSelectEvent, { parameter: payload.parameter });
  }

  @subscribe(onManageTeamClicked)
  onManageTeam() {
    this.sendLocalEvent(FwdManageTeamEvent, {});
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    if (this.customUi) {
      this.customUi.dataContext = dungeonSelectionVM;
    }
  }
}
