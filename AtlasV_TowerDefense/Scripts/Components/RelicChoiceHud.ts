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
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
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

const BIOME_TAG_LABELS: Record<string, string> = {
  snow: '\u2744\uFE0F Snow Exclusive',
  volcano: '\uD83D\uDD25 Fire Exclusive',
  grass: '\uD83C\uDF3F Grass Exclusive',
};

const BIOME_BADGE_COLORS: Record<string, {border: string; bg: string; text: string}> = {
  snow:    { border: '#FF81D4FA', bg: '#FF1A2A3A', text: '#FFB3E5FC' },
  volcano: { border: '#FFFF5722', bg: '#FF3A1A0A', text: '#FFFF8A65' },
  grass:   { border: '#FF4CAF50', bg: '#FF1B3A1B', text: '#FF8BC34A' },
};
const DEFAULT_BADGE_COLORS = { border: '#FFf5c518', bg: '#F00d0d1a', text: '#FFf5c518' };

// -- Pre-created TextureAsset instances (must be static string literals) --
const RELIC_ICON_GOLD = new TextureAsset('@sprites/relic_gold.png');
const RELIC_ICON_DAMAGE = new TextureAsset('@sprites/relic_damage.png');
const RELIC_ICON_SPEED = new TextureAsset('@sprites/relic_speed.png');
const RELIC_ICON_RANGE = new TextureAsset('@sprites/relic_range.png');
const RELIC_ICON_FORTIFICATION = new TextureAsset('@sprites/relic_fortification.png');
const RELIC_ICON_PERMAFROST = new TextureAsset('@sprites/relic_permafrost.png');
const RELIC_ICON_BONFIRE = new TextureAsset('@sprites/relic_bonfire.png');
const RELIC_ICON_HARVEST = new TextureAsset('@sprites/relic_harvest.png');
const RELIC_ICON_FROSTBITE = new TextureAsset('@sprites/relic_frostbite.png');
const RELIC_ICON_ERUPTION = new TextureAsset('@sprites/relic_eruption.png');
const RELIC_ICON_WARD_BREAKER = new TextureAsset('@sprites/relic_ward_breaker.png');
const RELIC_ICON_GLACIAL_LENS = new TextureAsset('@sprites/relic_glacial_lens.png');
const RELIC_ICON_IRON_WILL = new TextureAsset('@sprites/relic_iron_will.png');
const RELIC_ICON_SWIFT_QUIVER = new TextureAsset('@sprites/relic_swift_quiver.png');
const RELIC_ICON_BOUNTY_MARK = new TextureAsset('@sprites/relic_bounty_mark.png');

const RELIC_ICON_MAP: Record<string, TextureAsset> = {
  gold: RELIC_ICON_GOLD,
  damage: RELIC_ICON_DAMAGE,
  speed: RELIC_ICON_SPEED,
  range: RELIC_ICON_RANGE,
  lives: RELIC_ICON_FORTIFICATION,
  slow: RELIC_ICON_PERMAFROST,
  bonfire: RELIC_ICON_BONFIRE,
  harvest: RELIC_ICON_HARVEST,
  frostbite: RELIC_ICON_FROSTBITE,
  eruption: RELIC_ICON_ERUPTION,
  ward_breaker: RELIC_ICON_WARD_BREAKER,
  glacial_lens: RELIC_ICON_GLACIAL_LENS,
  iron_will: RELIC_ICON_IRON_WILL,
  swift_quiver: RELIC_ICON_SWIFT_QUIVER,
  bounty_mark: RELIC_ICON_BOUNTY_MARK,
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
  relic1BiomeTag: string = '';
  relic1BiomeTagVisible: boolean = false;
  relic1BadgeBorder: string = '#FFf5c518';
  relic1BadgeBg: string = '#F00d0d1a';
  relic1BadgeText: string = '#FFf5c518';

  // Card 1 scale (breathing pulse)
  card1ScaleX: number = 1;
  card1ScaleY: number = 1;

  // Card 2
  relic2Id: string = '';
  relic2Name: string = '';
  relic2Description: string = '';
  relic2Icon: Maybe<TextureAsset> = null;
  relic2BiomeTag: string = '';
  relic2BiomeTagVisible: boolean = false;
  relic2BadgeBorder: string = '#FFf5c518';
  relic2BadgeBg: string = '#F00d0d1a';
  relic2BadgeText: string = '#FFf5c518';

  // Card 2 scale (breathing pulse)
  card2ScaleX: number = 1;
  card2ScaleY: number = 1;
}

// -- Component --

@component()
export class RelicChoiceHud extends Component {
  private viewModel: Maybe<RelicChoiceViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Breathing pulse timers (phase-offset for independent feel)
  private _pulse1Time: number = 0;
  private _pulse2Time: number = 0.4;

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

    // Filter to relics the player doesn't already have and that match the current biome
    const activeBiome = SaveService.get().activeBiome;
    const available = RELIC_DEFS.filter((def: IRelicDef) => {
      if (activeIds.includes(def.id)) return false;
      if (def.biomeExclusive && def.biomeExclusive !== activeBiome) return false;
      return true;
    });

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
    this.viewModel.relic1BiomeTag = pick1.biomeExclusive ? (BIOME_TAG_LABELS[pick1.biomeExclusive] ?? '') : '';
    this.viewModel.relic1BiomeTagVisible = !!pick1.biomeExclusive;
    const colors1 = pick1.biomeExclusive ? (BIOME_BADGE_COLORS[pick1.biomeExclusive] ?? DEFAULT_BADGE_COLORS) : DEFAULT_BADGE_COLORS;
    this.viewModel.relic1BadgeBorder = colors1.border;
    this.viewModel.relic1BadgeBg = colors1.bg;
    this.viewModel.relic1BadgeText = colors1.text;

    this.viewModel.relic2Id = pick2.id;
    this.viewModel.relic2Name = pick2.name;
    this.viewModel.relic2Description = pick2.description;
    this.viewModel.relic2Icon = RELIC_ICON_MAP[pick2.id] ?? null;
    this.viewModel.relic2BiomeTag = pick2.biomeExclusive ? (BIOME_TAG_LABELS[pick2.biomeExclusive] ?? '') : '';
    this.viewModel.relic2BiomeTagVisible = !!pick2.biomeExclusive;
    const colors2 = pick2.biomeExclusive ? (BIOME_BADGE_COLORS[pick2.biomeExclusive] ?? DEFAULT_BADGE_COLORS) : DEFAULT_BADGE_COLORS;
    this.viewModel.relic2BadgeBorder = colors2.border;
    this.viewModel.relic2BadgeBg = colors2.bg;
    this.viewModel.relic2BadgeText = colors2.text;

    // Reset pulse timers with phase offset so cards feel independent
    this._pulse1Time = 0;
    this._pulse2Time = 0.4;

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
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

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

  /**
   * Breathing pulse update — scales cards 1.0→1.06→1.0 over 1.6s cycle.
   */
  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onPulseUpdate(payload: OnWorldUpdateEventPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.viewModel.visible) return;

    const dt = payload.deltaTime;
    const CYCLE = 1.6;
    const TWO_PI_OVER_CYCLE = (2 * Math.PI) / CYCLE;

    this._pulse1Time += dt;
    if (this._pulse1Time > CYCLE) this._pulse1Time -= CYCLE;
    this._pulse2Time += dt;
    if (this._pulse2Time > CYCLE) this._pulse2Time -= CYCLE;

    const s1 = 1.0 + 0.06 * (0.5 - 0.5 * Math.cos(this._pulse1Time * TWO_PI_OVER_CYCLE));
    const s2 = 1.0 + 0.06 * (0.5 - 0.5 * Math.cos(this._pulse2Time * TWO_PI_OVER_CYCLE));

    this.viewModel.card1ScaleX = s1;
    this.viewModel.card1ScaleY = s1;
    this.viewModel.card2ScaleX = s2;
    this.viewModel.card2ScaleY = s2;
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
