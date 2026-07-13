/**
 * BiomeSelectHud — Debug biome selection screen shown between Title and Overworld.
 *
 * Component Attachment: Scene entity (BiomeSelectUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Displays 3 biome buttons (Grass, Snow, Volcano). When tapped, fires
 * Events.BiomeChanged with the chosen biome ID, then transitions to the Overworld phase.
 * Temporary debug scaffolding — will be removed later.
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
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase, UiEvents } from '../Types';

// ── ViewModel ────────────────────────────────────────────────────────────────

@uiViewModel()
export class BiomeSelectViewModel extends UiViewModel {
  override readonly events = {
    biomeTap: UiEvents.biomeSelectTap,
  };

  visible: boolean = false;
}

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class BiomeSelectHud extends Component {
  private viewModel: Maybe<BiomeSelectViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide the panel initially
    this.uiComponent.isVisible = false;

    this.viewModel = new BiomeSelectViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    const shouldShow = payload.phase === GamePhase.BiomeSelect;
    this.viewModel.visible = shouldShow;
    if (this.uiComponent) this.uiComponent.isVisible = shouldShow;

    if (shouldShow) {
      console.log('[BiomeSelectHud] Showing biome selection screen');
    }
  }

  @subscribe(UiEvents.biomeSelectTap, { execution: ExecuteOn.Owner })
  onBiomeTap(payload: UiEvents.BiomeSelectTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (!this.viewModel.visible) return;

    const biomeId = payload.parameter;
    if (!biomeId) return;

    console.log(`[BiomeSelectHud] Biome selected: ${biomeId}`);

    // Hide ourselves
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;

    // Fire BiomeChanged with the chosen biome
    const bp = new Events.BiomeChangedPayload();
    bp.biomeId = biomeId;
    EventService.sendLocally(Events.BiomeChanged, bp);

    // Transition to Overworld phase
    const phase = new Events.GamePhaseChangedPayload();
    phase.phase = GamePhase.Overworld;
    EventService.sendLocally(Events.GamePhaseChanged, phase);
  }
}
