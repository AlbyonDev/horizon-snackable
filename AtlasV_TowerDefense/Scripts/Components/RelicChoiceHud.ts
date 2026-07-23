/**
 * RelicChoiceHud — Displays 2 random relic cards for the player to choose after victory.
 *
 * Component Attachment: Scene entity (RelicChoiceUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Listens for ShowRelicChoice event (fired by GameOverScreenHud on victory).
 * Picks 2 random relics the player doesn't already have, shows them as cards.
 * On tap, activates the chosen relic and transitions to Overworld.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  serializable,
  TextureAsset,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';
import { RelicService } from '../Services/RelicService';
import { SaveService } from '../Services/SaveService';
import { RELIC_DEFS, type IRelicDef } from '../Defs/RelicDefs';

// -- Pre-created TextureAsset instances (must be static string literals) --
const RELIC_ICON_GOLD = new TextureAsset('@sprites/relic_gold.png');
const RELIC_ICON_DAMAGE = new TextureAsset('@sprites/relic_damage.png');
const RELIC_ICON_SPEED = new TextureAsset('@sprites/relic_speed.png');
const RELIC_ICON_RANGE = new TextureAsset('@sprites/relic_range.png');
const RELIC_ICON_FORTIFICATION = new TextureAsset('@sprites/relic_fortification.png');
const RELIC_ICON_PERMAFROST = new TextureAsset('@sprites/relic_permafrost.png');

const RELIC_ICON_MAP: Record<string, TextureAsset> = {
  gold: RELIC_ICON_GOLD,
  damage: RELIC_ICON_DAMAGE,
  speed: RELIC_ICON_SPEED,
  range: RELIC_ICON_RANGE,
  lives: RELIC_ICON_FORTIFICATION,
  slow: RELIC_ICON_PERMAFROST,
};

// -- Module-level UiEvent constants --

@serializable()
export class RelicCardTapPayload {
  readonly parameter: string = '';
}

const relicCardTapEvent = new UiEvent('RelicChoiceViewModel-onRelicCardTap', RelicCardTapPayload);

// -- ViewModel --

@uiViewModel()
export class RelicChoiceViewModel extends UiViewModel {
  override readonly events = {
    relicCardTap: relicCardTapEvent,
  };

  visible: boolean = false;

  // Card 1
  relic1Id: string = '';
  relic1Name: string = '';
  relic1Description: string = '';
  relic1Icon: Maybe<TextureAsset> = null;

  // Card 2
  relic2Id: string = '';
  relic2Name: string = '';
  relic2Description: string = '';
  relic2Icon: Maybe<TextureAsset> = null;
}

// -- Component --

@component()
export class RelicChoiceHud extends Component {
  private viewModel: Maybe<RelicChoiceViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;

    this.viewModel = new RelicChoiceViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  /**
   * When ShowRelicChoice is fired, pick 2 random relics and show the panel.
   */
  @subscribe(Events.ShowRelicChoice, { execution: ExecuteOn.Owner })
  onShowRelicChoice(_p: Events.ShowRelicChoicePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const relicService = RelicService.get();
    const activeIds = relicService.getActiveRelicIds();

    // Filter to relics the player doesn't already have
    const available = RELIC_DEFS.filter((def: IRelicDef) => !activeIds.includes(def.id));

    if (available.length < 2) {
      // Not enough relics to choose from — skip directly to overworld
      console.log('[RelicChoiceHud] Not enough relics available, going to overworld');
      EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
      return;
    }

    // Pick 2 random unique relics
    const shuffled = this._shuffle(available);
    const pick1 = shuffled[0];
    const pick2 = shuffled[1];

    this.viewModel.relic1Id = pick1.id;
    this.viewModel.relic1Name = pick1.name;
    this.viewModel.relic1Description = pick1.description;
    this.viewModel.relic1Icon = RELIC_ICON_MAP[pick1.id] ?? null;

    this.viewModel.relic2Id = pick2.id;
    this.viewModel.relic2Name = pick2.name;
    this.viewModel.relic2Description = pick2.description;
    this.viewModel.relic2Icon = RELIC_ICON_MAP[pick2.id] ?? null;

    // Show the panel
    if (this.uiComponent) {
      this.uiComponent.isVisible = true;
    }
    this.viewModel.visible = true;
    console.log(`[RelicChoiceHud] Showing choices: ${pick1.name} vs ${pick2.name}`);
  }

  /**
   * When a relic card is tapped, activate the relic and transition to overworld.
   */
  @subscribe(relicCardTapEvent, { execution: ExecuteOn.Owner })
  onRelicCardTap(payload: RelicCardTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const relicId = payload.parameter;
    console.log(`[RelicChoiceHud] Player chose relic: ${relicId}`);

    // Activate the chosen relic and persist it as part of the current run.
    RelicService.get().activate(relicId);
    SaveService.get().addRelic(relicId);

    // Notify save system about the new relic
    const rcp = new Events.RelicChosenPayload();
    rcp.relicId = relicId;
    EventService.sendLocally(Events.RelicChosen, rcp);

    // Hide this panel
    this.viewModel.visible = false;
    if (this.uiComponent) {
      this.uiComponent.isVisible = false;
    }

    // Transition to overworld (same as the old "Overworld" button)
    EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
  }

  /** Fisher-Yates shuffle (returns a new array). */
  private _shuffle(arr: IRelicDef[]): IRelicDef[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }
}
