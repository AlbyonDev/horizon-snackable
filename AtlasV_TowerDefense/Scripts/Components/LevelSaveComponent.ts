/**
 * LevelSaveComponent — Persists level completion progress across sessions.
 *
 * Component Attachment: Player entity (player.hstf)
 * Component Networking: Networked (uses NetworkEvents for client↔server)
 * Component Ownership: Client-owned (player)
 *
 * Architecture:
 *   - Player entity is CLIENT-OWNED → ExecuteOn.Owner runs on the owning client.
 *   - PlayerVariablesService is SERVER-ONLY.
 *   - On start (server, via ExecuteOn.Everywhere): fetch saved data, send to client via sendEventToOwner.
 *   - On LevelCompleted (client): send save request to server via sendEventToEveryone (owner can broadcast).
 *   - On save request (server, via ExecuteOn.Everywhere): write to PlayerVariablesService.
 *
 * Save format: object { b: boolean[] } stored as PlayerVariableType (object with key/value)
 * Key: "td_level_sav"
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  PlayerVariablesService,
  ExecuteOn,
  EventService,
  Service,
  component,
  subscribe,
} from 'meta/worlds';

import { TOTAL_LEVELS } from '../Constants';
import {
  Events,
  SaveLevelProgressEvent,
  SaveLevelProgressPayload,
  ProgressLoadedEvent,
  ProgressLoadedPayload,
} from '../Types';

const SAVE_KEY = 'td_level_sav';

/** Save data shape stored in PlayerVariablesService */
interface LevelSaveData {
  b: boolean[]; // beaten flags per level index
}

@component()
export class LevelSaveComponent extends Component {
  private playerVarsService = Service.inject(PlayerVariablesService);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) {
      // Server: load saved progress and send to owning client
      this._loadAndSendProgress();
    }
  }

  // ── Server: load progress from PlayerVariablesService ──────────────────────

  private async _loadAndSendProgress(): Promise<void> {
    try {
      const saved = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      let beatenStr = '';
      if (saved && saved.b) {
        beatenStr = JSON.stringify(saved.b);
      }
      console.log(`[LevelSaveComponent] Server loaded progress: ${beatenStr || '(none)'}`);

      // Send to owning client via NetworkEvent (plain object literal — required for serialization)
      this.sendEventToOwner(ProgressLoadedEvent, { beatenLevels: beatenStr });
    } catch (e) {
      console.log(`[LevelSaveComponent] Error loading progress: ${e}`);
    }
  }

  // ── Client: receive loaded progress ────────────────────────────────────────

  @subscribe(ProgressLoadedEvent, { execution: ExecuteOn.Owner })
  onProgressLoaded(payload: ProgressLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Client received progress: ${payload.beatenLevels || '(none)'}`);

    // Broadcast locally so OverworldHud can restore node states
    const lp = new Events.ProgressRestoredPayload();
    lp.beatenLevels = payload.beatenLevels;
    EventService.sendLocally(Events.ProgressRestored, lp);
  }

  // ── Client: on level completed, request save ───────────────────────────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(payload: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Client requesting save for level ${payload.levelIndex}`);

    // Send to all replicants (including server) via NetworkEvent (plain object literal — required for serialization)
    // Owner (client) can call sendEventToEveryone
    this.sendEventToEveryone(SaveLevelProgressEvent, { levelIndex: payload.levelIndex });
  }

  // ── Server: handle save request ────────────────────────────────────────────

  @subscribe(SaveLevelProgressEvent, { execution: ExecuteOn.Everywhere })
  onSaveRequest(payload: SaveLevelProgressPayload): void {
    if (!NetworkingService.get().isServerContext()) return;

    console.log(`[LevelSaveComponent] Server saving level ${payload.levelIndex} as beaten`);
    this._saveLevel(payload.levelIndex);
  }

  private async _saveLevel(levelIndex: number): Promise<void> {
    try {
      // Fetch current state
      const existing = await this.playerVarsService.fetchVariable<LevelSaveData>(this.entity, SAVE_KEY);
      let beaten: boolean[] = [];

      if (existing && existing.b) {
        beaten = existing.b;
      }

      // Ensure array is large enough
      while (beaten.length < TOTAL_LEVELS) {
        beaten.push(false);
      }

      // Mark level as beaten
      if (levelIndex >= 0 && levelIndex < TOTAL_LEVELS) {
        beaten[levelIndex] = true;
      }

      const saveData: LevelSaveData = { b: beaten };
      await this.playerVarsService.setVariable(this.entity, SAVE_KEY, saveData);
      console.log(`[LevelSaveComponent] Server saved progress: ${JSON.stringify(saveData)}`);
    } catch (e) {
      console.log(`[LevelSaveComponent] Error saving progress: ${e}`);
    }
  }
}
