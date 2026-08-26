/**
 * LeaderboardPanelHud — Controls the leaderboard panel UI showing boss kills per biome.
 *
 * Component Attachment: Scene entity (LeaderboardPanel in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a full-screen leaderboard panel with 3 biome tabs (Grass, Snow, Volcano).
 * Each tab displays the top 10 players by boss kills in that biome.
 * Opened via Events.ShowLeaderboard (from TitleScreenHud).
 * Closed via close button → fires Events.ShowTitleScreen to return to title.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  CustomUiComponent,
  LeaderboardsService,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  serializable,
  Visibility,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events } from '../Types';

// ── Biome → leaderboard API name mapping ─────────────────────────────────────

const BIOME_LEADERBOARD_MAP: Record<string, string> = {
  grass: 'grass-boss-kills',
  snow: 'snow-boss-kills',
  volcano: 'volcano-boss-kills',
  gold: 'earned-gold',
  enemies: 'killed-enemies',
};

const SCORE_COLUMN_LABELS: Record<string, string> = {
  grass: 'Boss Killed Count',
  snow: 'Boss Killed Count',
  volcano: 'Boss Killed Count',
  gold: 'Gold Earned',
  enemies: 'Enemies Killed',
};

// ── Module-level UiEvent constants ───────────────────────────────────────────

@serializable()
class LeaderboardTabPayload {
  readonly parameter: string = '';
}

const grassTabEvent = new UiEvent('LeaderboardPanelViewModel-onGrassTab', LeaderboardTabPayload);
const snowTabEvent = new UiEvent('LeaderboardPanelViewModel-onSnowTab', LeaderboardTabPayload);
const volcanoTabEvent = new UiEvent('LeaderboardPanelViewModel-onVolcanoTab', LeaderboardTabPayload);
const goldTabEvent = new UiEvent('LeaderboardPanelViewModel-onGoldTab', LeaderboardTabPayload);
const enemyKillsTabEvent = new UiEvent('LeaderboardPanelViewModel-onEnemyKillsTab', LeaderboardTabPayload);
const closeEvent = new UiEvent('LeaderboardPanelViewModel-onClose', LeaderboardTabPayload);

// ── ViewModels ───────────────────────────────────────────────────────────────

@uiViewModel()
class LeaderboardEntryRowViewModel extends UiViewModel {
  rank: string = '';
  playerName: string = '';
  score: string = '';
}

@uiViewModel()
class LeaderboardPanelViewModel extends UiViewModel {
  override readonly events = {
    grassTab: grassTabEvent,
    snowTab: snowTabEvent,
    volcanoTab: volcanoTabEvent,
    goldTab: goldTabEvent,
    enemyKillsTab: enemyKillsTabEvent,
    close: closeEvent,
  };

  visible: boolean = false;

  entries: readonly LeaderboardEntryRowViewModel[] = [];
  emptyStateVisibility: Visibility = Visibility.Visible;

  // Tab active states (for visual highlighting)
  grassTabOpacity: number = 1.0;
  snowTabOpacity: number = 0.5;
  volcanoTabOpacity: number = 0.5;
  goldTabOpacity: number = 0.5;
  enemyKillsTabOpacity: number = 0.5;

  // Active biome label
  activeBiomeLabel: string = 'GRASS';

  // Score column header (changes per tab)
  scoreColumnLabel: string = 'Boss Killed Count';
}

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class LeaderboardPanelHud extends Component {
  private viewModel: Maybe<LeaderboardPanelViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private activeBiome: string = 'grass';

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new LeaderboardPanelViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    // Keep panel always rendering (visibility controlled by ViewModel binding)
    this.uiComponent.isVisible = true;
    console.log('[LeaderboardPanelHud] Initialized, panel bound');
  }

  // ── Show/Hide ──────────────────────────────────────────────────────────────

  @subscribe(Events.ShowLeaderboard, { execution: ExecuteOn.Owner })
  onShowLeaderboard(_p: Events.ShowLeaderboardPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.uiComponent || !this.viewModel) return;

    console.log('[LeaderboardPanelHud] Showing panel');
    this.viewModel.visible = true;

    // Reset to grass tab and fetch entries
    this.activeBiome = 'grass';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  @subscribe(closeEvent, { execution: ExecuteOn.Owner })
  onClose(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.uiComponent || !this.viewModel) return;

    console.log('[LeaderboardPanelHud] Closing panel');
    this.viewModel.visible = false;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    EventService.sendLocally(Events.ShowTitleScreen, new Events.ShowTitleScreenPayload());
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  @subscribe(grassTabEvent, { execution: ExecuteOn.Owner })
  onGrassTab(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.activeBiome = 'grass';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  @subscribe(snowTabEvent, { execution: ExecuteOn.Owner })
  onSnowTab(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.activeBiome = 'snow';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  @subscribe(volcanoTabEvent, { execution: ExecuteOn.Owner })
  onVolcanoTab(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.activeBiome = 'volcano';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  @subscribe(goldTabEvent, { execution: ExecuteOn.Owner })
  onGoldTab(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.activeBiome = 'gold';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  @subscribe(enemyKillsTabEvent, { execution: ExecuteOn.Owner })
  onEnemyKillsTab(_p: LeaderboardTabPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());
    this.activeBiome = 'enemies';
    this._updateTabVisuals();
    this._fetchEntries();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _updateTabVisuals(): void {
    if (!this.viewModel) return;
    this.viewModel.grassTabOpacity = this.activeBiome === 'grass' ? 1.0 : 0.5;
    this.viewModel.snowTabOpacity = this.activeBiome === 'snow' ? 1.0 : 0.5;
    this.viewModel.volcanoTabOpacity = this.activeBiome === 'volcano' ? 1.0 : 0.5;
    this.viewModel.goldTabOpacity = this.activeBiome === 'gold' ? 1.0 : 0.5;
    this.viewModel.enemyKillsTabOpacity = this.activeBiome === 'enemies' ? 1.0 : 0.5;
    this.viewModel.activeBiomeLabel = this.activeBiome.toUpperCase();
    this.viewModel.scoreColumnLabel = SCORE_COLUMN_LABELS[this.activeBiome] || 'Score';
  }

  private async _fetchEntries(): Promise<void> {
    if (!this.viewModel) return;

    const apiName = BIOME_LEADERBOARD_MAP[this.activeBiome];
    if (!apiName) return;

    console.log(`[LeaderboardPanelHud] Fetching entries for ${apiName}`);

    try {
      const entries = await LeaderboardsService.get().fetchEntries(apiName, { numEntries: 10 });

      const newEntries: LeaderboardEntryRowViewModel[] = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const vm = new LeaderboardEntryRowViewModel();
        vm.rank = `#${entry.rank}`;
        vm.playerName = entry.playerAlias || 'Player';
        vm.score = `${entry.score}`;
        newEntries.push(vm);
      }

      this.viewModel.entries = newEntries;
      this.viewModel.emptyStateVisibility =
        newEntries.length === 0 ? Visibility.Visible : Visibility.Collapsed;

      console.log(`[LeaderboardPanelHud] Loaded ${newEntries.length} entries`);
    } catch (e) {
      console.log(`[LeaderboardPanelHud] Error fetching entries: ${e}`);
      this.viewModel.entries = [];
      this.viewModel.emptyStateVisibility = Visibility.Visible;
    }
  }
}
