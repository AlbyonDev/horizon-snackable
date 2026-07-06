/**
 * OverworldHud — Level select screen ViewModel controller.
 *
 * Component Attachment: Scene entity (OverworldUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Displays a grid of level buttons. When a level is tapped, fires Events.LevelSelected
 * with the chosen levelIndex. Shows only during the Overworld GamePhase.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  property,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase, UiEvents } from '../Types';
import { LEVEL_DEFS } from '../Defs/LevelDefs';

// ── Level item sub-ViewModel ────────────────────────────────────────────────

@uiViewModel()
export class OverworldLevelItemViewModel extends UiViewModel {
  levelNumber: string = '1';
  levelIndex: string = '0'; // string for CommandParameter binding
}

// ── Main ViewModel ──────────────────────────────────────────────────────────

@uiViewModel()
export class OverworldViewModel extends UiViewModel {
  override readonly events = {
    levelTap: UiEvents.overworldLevelTap,
  };

  visible: boolean = false;
  items: readonly OverworldLevelItemViewModel[] = [];
}

// ── Component ───────────────────────────────────────────────────────────────

@component()
export class OverworldHud extends Component {
  /** Number of level buttons to display */
  @property() levelCount: number = 5;

  private viewModel: Maybe<OverworldViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new OverworldViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this._populateLevels();
  }

  // ── Events ────────────────────────────────────────────────────────────────

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = payload.phase === GamePhase.Overworld;
  }

  @subscribe(UiEvents.overworldLevelTap, { execution: ExecuteOn.Owner })
  onLevelTap(payload: UiEvents.OverworldLevelTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;

    const levelIndex = parseInt(payload.parameter, 10);
    if (isNaN(levelIndex)) return;

    // Clamp to available levels (all levels use same data for now)
    const clampedIndex = Math.min(levelIndex, LEVEL_DEFS.length - 1);

    console.log(`[OverworldHud] Level ${clampedIndex + 1} selected`);

    // Hide ourselves
    this.viewModel.visible = false;

    // Fire the LevelSelected event
    const p = new Events.LevelSelectedPayload();
    p.levelIndex = clampedIndex;
    EventService.sendLocally(Events.LevelSelected, p);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _populateLevels(): void {
    const items: OverworldLevelItemViewModel[] = [];
    for (let i = 0; i < this.levelCount; i++) {
      const item = new OverworldLevelItemViewModel();
      item.levelNumber = `${i + 1}`;
      item.levelIndex = `${i}`;
      items.push(item);
    }
    if (this.viewModel) {
      this.viewModel.items = items;
    }
  }
}
