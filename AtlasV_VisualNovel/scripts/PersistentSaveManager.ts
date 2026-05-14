/**
 * PersistentSaveManager — Server-side PlayerVariablesService bridge.
 * Fetches save data from PVars on player join, persists on request.
 *
 * Component Attachment: Scene Entity (2d_game_entity) — same as FloaterGame
 * Component Networking: Local (both server and client get a copy)
 * Component Ownership: Not Networked (local scene entity)
 *
 * Data flow:
 * - Server polls for player → fetches PVar → sends OnSaveDataLoaded globally
 * - Client receives OnSaveDataLoaded → stores in SaveSystem → FloaterGame reloads
 * - Client sends OnSaveDataRequested → Server persists to PVar
 * - Client sends OnResetSaveRequested → Server clears PVar → sends OnResetComplete
 */

import {
  Component,
  component,
  subscribe,
} from 'meta/platform_api';
import {
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
} from 'meta/platform_api';
import {
  NetworkingService,
  PlayerService,
  PlayerVariablesService,
  EventService,
  ExecuteOn,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';

import {
  OnSaveDataLoaded,
  OnSaveDataRequested,
  OnResetSaveRequested,
  OnResetComplete,
  OnCGDataLoaded,
  OnCGSaveRequested,
  SaveDataRequestPayload,
  ResetSavePayload,
  CGSaveRequestPayload,
} from './SaveEvents';

const PVAR_NAME = 'floater_save_v1';
const CG_PVAR_NAME = 'floater_cg_v1';

@component()
export class PersistentSaveManager extends Component {
  private playerEntity: Maybe<Entity> = null;
  private loaded: boolean = false;
  private pollTimer: number = 0;

  // Server: Poll for player and fetch PVar data
  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (this.loaded) return;

    this.pollTimer += 1 / 72; // approximate dt
    if (this.pollTimer < 0.5) return; // poll every 0.5s
    this.pollTimer = 0;

    const players = PlayerService.get().getAllPlayers();
    if (players.length === 0) return;

    this.playerEntity = players[0];
    this.loaded = true;
    this.fetchSaveData();
  }

  private async fetchSaveData(): Promise<void> {
    if (!this.playerEntity) return;

    try {
      const data = await PlayerVariablesService.get().fetchVariable<{save: string}>(
        this.playerEntity,
        PVAR_NAME,
      );
      const saveJson = data?.save ?? '';
      console.log(`[PersistentSaveManager] Fetched PVar: ${saveJson.length} chars`);
      EventService.sendGlobally(OnSaveDataLoaded, { data: saveJson });
    } catch (e) {
      console.log('[PersistentSaveManager] ERROR fetching PVar:', e);
      // Send empty data so client knows load attempt completed
      EventService.sendGlobally(OnSaveDataLoaded, { data: '' });
    }

    // Fetch CG data from separate PVar
    try {
      const cgData = await PlayerVariablesService.get().fetchVariable<{cg: string}>(
        this.playerEntity,
        CG_PVAR_NAME,
      );
      const cgJson = cgData?.cg ?? '';
      console.log(`[PersistentSaveManager] Fetched CG PVar: ${cgJson.length} chars`);
      EventService.sendGlobally(OnCGDataLoaded, { data: cgJson });
    } catch (e) {
      console.log('[PersistentSaveManager] ERROR fetching CG PVar:', e);
      EventService.sendGlobally(OnCGDataLoaded, { data: '' });
    }
  }

  // Server: Handle save requests from client
  @subscribe(OnSaveDataRequested, { execution: ExecuteOn.Everywhere })
  async onSaveRequested(payload: SaveDataRequestPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!this.playerEntity) {
      console.log('[PersistentSaveManager] No player entity for save');
      return;
    }

    try {
      if (payload.data.length > 9500) {
        console.log(`[PersistentSaveManager] WARNING: Save data is ${payload.data.length} chars (limit 10000)`);
      }
      await PlayerVariablesService.get().setVariable(
        this.playerEntity,
        PVAR_NAME,
        { save: payload.data },
      );
      console.log('[PersistentSaveManager] Save persisted to PVar');
    } catch (e) {
      console.log('[PersistentSaveManager] ERROR persisting save:', e);
    }
  }

  // Server: Handle reset requests from client
  @subscribe(OnResetSaveRequested, { execution: ExecuteOn.Everywhere })
  async onResetRequested(payload: ResetSavePayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!payload.confirm) return;
    if (!this.playerEntity) return;

    try {
      // Only clear main save PVar — CG PVar is preserved across resets
      await PlayerVariablesService.get().setVariable(
        this.playerEntity,
        PVAR_NAME,
        { save: '' },
      );
      console.log('[PersistentSaveManager] PVar cleared (reset) — CG data preserved');
      EventService.sendGlobally(OnResetComplete, { success: true });
    } catch (e) {
      console.log('[PersistentSaveManager] ERROR resetting PVar:', e);
      EventService.sendGlobally(OnResetComplete, { success: false });
    }
  }

  // Server: Handle CG save requests from client (separate PVar)
  @subscribe(OnCGSaveRequested, { execution: ExecuteOn.Everywhere })
  async onCGSaveRequested(payload: CGSaveRequestPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!this.playerEntity) {
      console.log('[PersistentSaveManager] No player entity for CG save');
      return;
    }

    try {
      await PlayerVariablesService.get().setVariable(
        this.playerEntity,
        CG_PVAR_NAME,
        { cg: payload.data },
      );
      console.log('[PersistentSaveManager] CG data persisted to separate PVar');
    } catch (e) {
      console.log('[PersistentSaveManager] ERROR persisting CG data:', e);
    }
  }

  // === Hot Reload ===
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    // Re-fetch player on server after hot reload
    if (NetworkingService.get().isServerContext()) {
      this.loaded = false;
      this.pollTimer = 0;
    }
  }
}
