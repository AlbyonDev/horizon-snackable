/**
 * HeroCollectionComponent
 *
 * Component Attachment: Scene entity with CustomUiPlatformComponent (hero_collection.xaml)
 * Component Networking: Local (UI is client-side only)
 * Component Ownership: Not Networked
 *
 * Displays the hero collection / roster management screen.
 * Visibility controlled by ShowHeroCollectionEvent / HideHeroCollectionEvent.
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
  heroCollectionVM,
  onHeroCardClicked,
  onHeroCardInfoClicked,
  onRosterSlotClicked,
  onDetailCloseClicked,
  onRosterEnterDungeonClicked,
  onRosterBackClicked,
  onBuyCardClicked,
  onBuyConfirmYes,
  onBuyConfirmNo,
  onBuyResultClose,
  onHealConfirmYes,
  onHealConfirmNo,
} from './HeroCollectionViewModel';
import type { HeroCardClickPayload } from './HeroCollectionViewModel';
import {
  ShowHeroCollectionEvent,
  HideHeroCollectionEvent,
  FwdHeroCardClickedEvent,
  FwdHeroCardInfoClickedEvent,
  FwdRosterSlotClickedEvent,
  FwdDetailCloseEvent,
  FwdRosterEnterDungeonEvent,
  FwdRosterBackEvent,
  FwdBuyCardClickedEvent,
  FwdBuyConfirmYesEvent,
  FwdBuyConfirmNoEvent,
  FwdBuyResultCloseEvent,
  FwdHealConfirmYesEvent,
  FwdHealConfirmNoEvent,
} from './ScreenEvents';

@component()
export class HeroCollectionComponent extends Component {
  private _customUi: Maybe<CustomUiComponent> = null;
  private get customUi() {
    return (this._customUi ??= this.entity.getComponent(CustomUiComponent));
  }

  @subscribe(OnEntityStartEvent)
  onStart() {
    if (this.customUi) {
      this.customUi.dataContext = heroCollectionVM;
      this.customUi.isVisible = false;
    }
  }

  @subscribe(ShowHeroCollectionEvent)
  onShow() {
    if (this.customUi) {
      this.customUi.isVisible = true;
    }
  }

  @subscribe(HideHeroCollectionEvent)
  onHide() {
    if (this.customUi) {
      this.customUi.isVisible = false;
    }
  }

  // ===== UiEvent Forwarding =====

  @subscribe(onHeroCardClicked)
  onHeroCard(payload: HeroCardClickPayload) {
    this.sendLocalEvent(FwdHeroCardClickedEvent, { parameter: payload.parameter });
  }

  @subscribe(onHeroCardInfoClicked)
  onHeroCardInfo(payload: HeroCardClickPayload) {
    this.sendLocalEvent(FwdHeroCardInfoClickedEvent, { parameter: payload.parameter });
  }

  @subscribe(onRosterSlotClicked)
  onRosterSlot(payload: HeroCardClickPayload) {
    this.sendLocalEvent(FwdRosterSlotClickedEvent, { parameter: payload.parameter });
  }

  @subscribe(onDetailCloseClicked)
  onDetailClose() {
    this.sendLocalEvent(FwdDetailCloseEvent, {});
  }

  @subscribe(onRosterEnterDungeonClicked)
  onRosterEnterDungeon() {
    this.sendLocalEvent(FwdRosterEnterDungeonEvent, {});
  }

  @subscribe(onRosterBackClicked)
  onRosterBack() {
    this.sendLocalEvent(FwdRosterBackEvent, {});
  }

  @subscribe(onBuyCardClicked)
  onBuyCard() {
    this.sendLocalEvent(FwdBuyCardClickedEvent, {});
  }

  @subscribe(onBuyConfirmYes)
  onBuyYes() {
    this.sendLocalEvent(FwdBuyConfirmYesEvent, {});
  }

  @subscribe(onBuyConfirmNo)
  onBuyNo() {
    this.sendLocalEvent(FwdBuyConfirmNoEvent, {});
  }

  @subscribe(onBuyResultClose)
  onBuyClose() {
    this.sendLocalEvent(FwdBuyResultCloseEvent, {});
  }

  @subscribe(onHealConfirmYes)
  onHealYes() {
    this.sendLocalEvent(FwdHealConfirmYesEvent, {});
  }

  @subscribe(onHealConfirmNo)
  onHealNo() {
    this.sendLocalEvent(FwdHealConfirmNoEvent, {});
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    if (this.customUi) {
      this.customUi.dataContext = heroCollectionVM;
    }
  }
}
