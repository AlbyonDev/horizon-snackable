/**
 * UpgradePanelComponent — Controller for the Upgrade Panel UI.
 *
 * Component Attachment: Scene Entity (the UpgradePanel entity with CustomUiComponent)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Not Networked
 *
 * Reads upgrade entries from UpgradeRegistryService, populates the
 * UpgradePanelViewModel with positioned items, handles click events,
 * and refreshes the list when the registry changes.
 */
import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
  NetworkingService,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import {
  UpgradePanelViewModel,
  upgradeItemClickEvent,
  UpgradePanelItemClickPayload,
} from '../UI/UpgradePanelViewModel';
import { UpgradeRegistryService } from '../Services/UpgradeRegistryService';
import { EconomyService } from '../Services/EconomyService';
import { Events } from '../Types';

/** Vertical spacing between upgrade buttons (in UI pixels) */

const BUTTON_POSITION : Record<string, { x: number, y: number }> = {
  'conveyor': { x: 25, y: 1400 },
  'production0': { x: 700, y: 700 },
  'production1': { x: 700, y: 1000 },
  'production2': { x: 700, y: 1300 },
  'warehouse': { x: 700, y: 300 },
  'trucks': { x: 700, y: 40 },
};

type ButtonStyle = Parameters<UpgradePanelViewModel['addUpgrade']>[7];

const OUTLINE_TOO_EXPENSIVE = '#00000000';

const BUTTON_STYLE: Record<string, NonNullable<ButtonStyle>> = {
  'conveyor': {
    OutlineColor:          '#FF020D18',
    HighlightBorderColor:  '#FF1A4D73',
    ShadowBorderColor:     '#FF020D18',
    ButtonBackgroundColor: '#FF052039',
    ButtonTextColor:       '#FFFFFFFF',
  },
  'warehouse': {
    OutlineColor:          '#FF020D18',
    HighlightBorderColor:  '#FF1A4D73',
    ShadowBorderColor:     '#FF020D18',
    ButtonBackgroundColor: '#FF052039',
    ButtonTextColor:       '#FFFFFFFF',
  },
  'trucks': {
    OutlineColor:          '#FF020D18',
    HighlightBorderColor:  '#FF1A4D73',
    ShadowBorderColor:     '#FF020D18',
    ButtonBackgroundColor: '#FF052039',
    ButtonTextColor:       '#FFFFFFFF',
  },
  'production0': {
    OutlineColor:          '#FF041626',
    HighlightBorderColor:  '#FF5AB8E8',
    ShadowBorderColor:     '#FF0A3D5C',
    ButtonBackgroundColor: '#FF148FD5',
    ButtonTextColor:       '#FFFFFFFF',
  },
  'production1': {
    OutlineColor:          '#FF152808',
    HighlightBorderColor:  '#FF8DC455',
    ShadowBorderColor:     '#FF2A4D0E',
    ButtonBackgroundColor: '#FF58A31E',
    ButtonTextColor:       '#FFFFFFFF',
  },
  'production2': {
    OutlineColor:          '#FF2E0601',
    HighlightBorderColor:  '#FFEF5350',
    ShadowBorderColor:     '#FF5C0A09',
    ButtonBackgroundColor: '#FFEB1B04',
    ButtonTextColor:       '#FFFFFFFF',
  },
};

const FTUE_PULSE_INTERVAL = 2.0;

@component()
export class UpgradePanelComponent extends Component {
  private viewModel = new UpgradePanelViewModel();
  private uiComponent: Maybe<CustomUiComponent> = null;
  private _ftueActive = true;
  private _pulseTimer = 0;
  private _pulseTick = 1;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    // Skip server context — this is client-only UI
    if (NetworkingService.get().isServerContext()) {
      return;
    }

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) {
      console.error('[UpgradePanelComponent] CustomUiComponent not found on entity');
      return;
    }

    this.uiComponent.dataContext = this.viewModel;
    this.refreshUpgradeList();
  }

  /**
   * Refresh the upgrade list when registry entries change.
   * Fires on LocalEvent from UpgradeRegistryService.
   */
  @subscribe(Events.UpgradeRegistryChanged, { execution: ExecuteOn.Everywhere })
  onRegistryChanged(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.refreshUpgradeList();
  }

  @subscribe(Events.TruckDelivered, { execution: ExecuteOn.Everywhere })
  onMoneyChanged(_p: Events.TruckDeliveredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.refreshUpgradeList();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._ftueActive) return;
    this._pulseTimer += p.deltaTime;
    if (this._pulseTimer >= FTUE_PULSE_INTERVAL) {
      this._pulseTimer = 0;
      this._pulseTick = this._pulseTick === 1 ? 2 : 1;
      this.viewModel.updateUpgrade('production0', { AnimationTrigger: this._pulseTick });
    }
  }

  /**
   * Handle upgrade button clicks from the XAML UI.
   * The payload.parameter contains the UpgradeId from CommandParameter.
   */
  @subscribe(upgradeItemClickEvent)
  onUpgradeItemClick(payload: UpgradePanelItemClickPayload): void {
    const upgradeId = payload.parameter;
    if (!upgradeId) {
      console.warn('[UpgradePanelComponent] Click with empty upgradeId');
      return;
    }

    UpgradeRegistryService.get().tryPurchase(upgradeId);

    // Refresh list to reflect updated costs / removed entries
    this.refreshUpgradeList();
  }

  /**
   * Clear and rebuild the upgrade item list from the registry,
   * assigning vertical positions to each item.
   */
  private refreshUpgradeList(): void {
    // FTUE: show only production0 until the player unlocks it
    const ftueComplete = EconomyService.get().getUpgradeLevel('production0') >= 1;
    if (this._ftueActive && ftueComplete) this._ftueActive = false;

    this.viewModel.clearUpgrades();
    const entries = UpgradeRegistryService.get().getEntries();
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // During FTUE, skip everything except production0
      if (this._ftueActive && entry.id !== 'production0') continue;

      const pos = BUTTON_POSITION[entry.id];
      const x = pos ? pos.x : 0;
      const y = pos ? pos.y : 0;
      const isEnabled = entry.cost <= EconomyService.get().money;
      const staticStyle = BUTTON_STYLE[entry.id];
      this.viewModel.addUpgrade(
        entry.id,
        entry.label,
        entry.description,
        `${entry.cost > 0 ? entry.cost : 'Free'}`,
        isEnabled,
        x,
        y,
        staticStyle ? { ...staticStyle, OutlineColor: isEnabled ? staticStyle.OutlineColor : OUTLINE_TOO_EXPENSIVE } : undefined,
      );
    }
  }
}
