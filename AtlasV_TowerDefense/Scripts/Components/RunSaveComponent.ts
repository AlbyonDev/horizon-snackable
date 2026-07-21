/**
 * RunSaveComponent — Global extensible save system for run state persistence.
 *
 * Component Attachment: Player entity (player.hstf)
 * Component Networking: Networked (uses NetworkEvents for client↔server persistence)
 * Component Ownership: Client-owned (player)
 *
 * Architecture:
 *   - Player entity is CLIENT-OWNED → ExecuteOn.Owner runs on the owning client.
 *   - PlayerVariablesService is SERVER-ONLY.
 *   - On start (server): fetch saved data, send to client via sendEventToOwner.
 *   - On save triggers (client): collect state from services, send to server via sendEventToEveryone.
 *   - On save request (server): write to PlayerVariablesService.
 *
 * Save triggers:
 *   1. After run is generated (StartGame, RunAdvanced)
 *   2. After relic is chosen (RelicChosen)
 *
 * Extensibility: To add new variables, update IRunSaveData interface and the
 * _collectState() / _restoreState() methods. All state is serialized as a
 * single JSON object under one PlayerVariable key.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  PlayerVariablesService,
  ExecuteOn,
  EventService,
  Service,
  NetworkEvent,
  component,
  subscribe,
  serializable,
  property as netProp,
} from 'meta/worlds';

import { Events, GamePhase } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { RelicService } from '../Services/RelicService';
import { TOTAL_LEVELS } from '../Constants';

// ─── Save data shape ────────────────────────────────────────────────────────────

/**
 * IRunSaveData — The shape persisted to PlayerVariablesService.
 * To extend the save system, add new fields here and update
 * _collectState() and _restoreState() accordingly.
 */
interface IRunSaveData {
  version: number;           // Schema version for future migration
  runCount: number;          // Current run number (1-based)
  activeRelicIds: string[];  // Active relic IDs
  beatenLevels: boolean[];   // Per-level beaten flags
  biomeId: string;           // Currently selected biome
}

const SAVE_KEY = 'td_level_sav';
const SAVE_VERSION = 1;

// ─── Network Events (defined here, self-contained) ──────────────────────────────

@serializable()
export class RunSaveDataLoadedPayload {
  @netProp() readonly dataJson: string = '';
}
export const RunSaveDataLoadedEvent = new NetworkEvent<RunSaveDataLoadedPayload>(
  'TDRunSaveDataLoaded', RunSaveDataLoadedPayload
);

@serializable()
export class RunSaveRequestPayload {
  @netProp() readonly dataJson: string = '';
}
export const RunSaveRequestEvent = new NetworkEvent<RunSaveRequestPayload>(
  'TDRunSaveRequest', RunSaveRequestPayload
);

// ─── Component ──────────────────────────────────────────────────────────────────

@component()
export class RunSaveComponent extends Component {
  private playerVarsService = Service.inject(PlayerVariablesService);

  /** In-memory tracked state (client-side) */
  private _beatenLevels: boolean[] = [];
  private _currentBiomeId: string = '';

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    // Initialize beaten levels array
    for (let i = 0; i < TOTAL_LEVELS; i++) this._beatenLevels.push(false);

    if (NetworkingService.get().isServerContext()) {
      // Server: load saved data and send to owning client
      this._loadAndSend();
    }
  }

  // ── Server: load from PlayerVariablesService ─────────────────────────────────

  private async _loadAndSend(): Promise<void> {
    try {
      const saved = await this.playerVarsService.fetchVariable<IRunSaveData>(this.entity, SAVE_KEY);
      let dataJson = '';
      if (saved && saved.version) {
        dataJson = JSON.stringify(saved);
        console.log(`[RunSaveComponent] Server loaded save: runCount=${saved.runCount}, relics=${saved.activeRelicIds.length}, biome=${saved.biomeId}`);
      } else {
        console.log(`[RunSaveComponent] Server: no existing save found`);
      }
      this.sendEventToOwner(RunSaveDataLoadedEvent, { dataJson });
    } catch (e) {
      console.log(`[RunSaveComponent] Error loading save: ${e}`);
      this.sendEventToOwner(RunSaveDataLoadedEvent, { dataJson: '' });
    }
  }

  // ── Client: receive loaded data ──────────────────────────────────────────────

  @subscribe(RunSaveDataLoadedEvent, { execution: ExecuteOn.Owner })
  onSaveDataLoaded(payload: RunSaveDataLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    if (payload.dataJson) {
      try {
        const data: IRunSaveData = JSON.parse(payload.dataJson);
        console.log(`[RunSaveComponent] Client received save: runCount=${data.runCount}, relics=[${data.activeRelicIds.join(',')}], biome=${data.biomeId}`);

        // Update tracked state
        this._currentBiomeId = data.biomeId;
        this._beatenLevels = data.beatenLevels.length > 0 ? [...data.beatenLevels] : this._beatenLevels;

        // Restore game state from save
        this._restoreState(data);

        // Fire RunSaveLoaded so GameManager can decide the game flow
        const p = new Events.RunSaveLoadedPayload();
        p.runCount = data.runCount;
        p.activeRelicIds = JSON.stringify(data.activeRelicIds);
        p.beatenLevels = JSON.stringify(data.beatenLevels);
        p.biomeId = data.biomeId;
        EventService.sendLocally(Events.RunSaveLoaded, p);
      } catch (e) {
        console.log(`[RunSaveComponent] Error parsing save data: ${e}`);
        this._fireEmptyLoad();
      }
    } else {
      console.log(`[RunSaveComponent] No save data, fresh start`);
      this._fireEmptyLoad();
    }
  }

  private _fireEmptyLoad(): void {
    const p = new Events.RunSaveLoadedPayload();
    p.runCount = 0;
    p.activeRelicIds = '[]';
    p.beatenLevels = '[]';
    p.biomeId = '';
    EventService.sendLocally(Events.RunSaveLoaded, p);
  }

  // ── Save triggers ────────────────────────────────────────────────────────────

  /** Save after StartGame (run generated for the first time). */
  @subscribe(Events.StartGame, { execution: ExecuteOn.Everywhere })
  onStartGame(_p: Events.StartGamePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    // Reset tracked state for new game
    this._beatenLevels = [];
    for (let i = 0; i < TOTAL_LEVELS; i++) this._beatenLevels.push(false);
    this._currentBiomeId = '';
    // Delay slightly to allow LevelGeneratorService to generate first
    setTimeout(() => this._triggerSave('StartGame'), 100);
  }

  /** Save after RunAdvanced (new run generated after beating boss). */
  @subscribe(Events.RunAdvanced, { execution: ExecuteOn.Everywhere })
  onRunAdvanced(_p: Events.RunAdvancedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    // Reset beaten levels for new run
    this._beatenLevels = [];
    for (let i = 0; i < TOTAL_LEVELS; i++) this._beatenLevels.push(false);
    setTimeout(() => this._triggerSave('RunAdvanced'), 100);
  }

  /** Save after RelicChosen. */
  @subscribe(Events.RelicChosen, { execution: ExecuteOn.Everywhere })
  onRelicChosen(_p: Events.RelicChosenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    setTimeout(() => this._triggerSave('RelicChosen'), 100);
  }

  // ── Track state changes (not save triggers, but captured for next save) ──────

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Everywhere })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentBiomeId = payload.biomeId;
  }

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    const idx = payload.levelIndex;
    if (idx >= 0 && idx < this._beatenLevels.length) {
      this._beatenLevels[idx] = true;
    }
  }

  // ── Private: collect and save ────────────────────────────────────────────────

  private _triggerSave(reason: string): void {
    const state = this._collectState();
    const dataJson = JSON.stringify(state);
    console.log(`[RunSaveComponent] Saving (${reason}): runCount=${state.runCount}, relics=[${state.activeRelicIds.join(',')}], beaten=${JSON.stringify(state.beatenLevels)}, biome=${state.biomeId}`);

    // Send to server via NetworkEvent (owner can broadcast to all replicants including server)
    this.sendEventToEveryone(RunSaveRequestEvent, { dataJson });
  }

  /** Collect current game state from services. */
  private _collectState(): IRunSaveData {
    const levelGen = LevelGeneratorService.get();
    const relicService = RelicService.get();

    return {
      version: SAVE_VERSION,
      runCount: levelGen.runCount,
      activeRelicIds: relicService.getActiveRelicIds(),
      beatenLevels: [...this._beatenLevels],
      biomeId: this._currentBiomeId,
    };
  }

  /** Restore game state from loaded save data. */
  private _restoreState(data: IRunSaveData): void {
    // Restore runCount and regenerate levels
    if (data.runCount > 0) {
      LevelGeneratorService.get().restoreRunCount(data.runCount);
    }

    // Restore active relics
    if (data.activeRelicIds.length > 0) {
      RelicService.get().restoreRelics(data.activeRelicIds);
    }

    // Restore biome by firing BiomeChanged (services/HUDs subscribe to this)
    if (data.biomeId) {
      const bp = new Events.BiomeChangedPayload();
      bp.biomeId = data.biomeId;
      EventService.sendLocally(Events.BiomeChanged, bp);
    }

    // Restore beaten levels via ProgressRestored (OverworldHud subscribes)
    if (data.beatenLevels.some(b => b)) {
      const prp = new Events.ProgressRestoredPayload();
      prp.beatenLevels = JSON.stringify(data.beatenLevels);
      EventService.sendLocally(Events.ProgressRestored, prp);
    }
  }

  // ── Server: handle save request ──────────────────────────────────────────────

  @subscribe(RunSaveRequestEvent, { execution: ExecuteOn.Everywhere })
  onSaveRequest(payload: RunSaveRequestPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[RunSaveComponent] Server writing save data`);
    this._writeSave(payload.dataJson);
  }

  private async _writeSave(dataJson: string): Promise<void> {
    try {
      const data: IRunSaveData = JSON.parse(dataJson);
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, data);
      console.log(`[RunSaveComponent] Server saved successfully`);
    } catch (e) {
      console.log(`[RunSaveComponent] Error writing save: ${e}`);
    }
  }
}
