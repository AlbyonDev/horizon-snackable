/**
 * SaveManagerComponent
 *
 * Component Attachment: Scene Entity (networkable, server-owned)
 * Component Networking: Networked
 * Component Ownership: Server
 *
 * Handles persistent save/load operations using PlayerVariablesService.
 * Listens for global save/load request events from the client-side GameComponent,
 * performs PVar operations on the server, and broadcasts results back globally.
 *
 * This component MUST be on a networkable scene entity so it is server-owned
 * and can access PlayerVariablesService (server-only API).
 */
import {
  Component,
  component,
  subscribe,
  ExecuteOn,
  NetworkingService,
  EntityService,
  Service,
  PlayerService,
} from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/platform_api';
import type { Entity, Maybe } from 'meta/worlds';
import { PlayerVariablesService } from 'meta/worlds';
import { BasePlayerComponent } from 'meta/worlds';
import {
  PuzzleSaveRequestEvent,
  PuzzleLoadRequestEvent,
  PuzzleLoadCompleteEvent,
  PVAR_SAVE_KEY,
} from './SaveData';
import type { PuzzleSaveRequestPayload, PuzzleLoadRequestPayload } from './SaveData';
import { EventService } from 'meta/worlds';

@component()
export class SaveManagerComponent extends Component {
  private playerVarsService = Service.inject(PlayerVariablesService);
  private playerEntity: Maybe<Entity> = null;

  // Attached to a server-owned networkable entity.
  // OnEntityStartEvent with ExecuteOn.Everywhere lets us find the player on the server.
  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart() {
    if (!NetworkingService.get().isServerContext()) return;
  }

  /** Find the first connected player entity (single-player game) */
  private findPlayer(): Maybe<Entity> {
    if (this.playerEntity) return this.playerEntity;

    // Try PlayerService first (more reliable than EntityService for finding players)
    const players = PlayerService.get().getAllPlayers();
    if (players.length > 0) {
      this.playerEntity = players[0];
      return this.playerEntity;
    }

    // Fallback to EntityService
    const entities = EntityService.findEntitiesWithComponent(BasePlayerComponent);
    if (entities.length > 0) {
      this.playerEntity = entities[0];
      return this.playerEntity;
    }

    return null;
  }

  /**
   * Handle save request from client.
   * Executes everywhere but only the server actually persists.
   */
  @subscribe(PuzzleSaveRequestEvent, { execution: ExecuteOn.Everywhere })
  async onSaveRequest(payload: PuzzleSaveRequestPayload) {
    if (!NetworkingService.get().isServerContext()) return;

    const player = this.findPlayer();
    if (!player) {
      console.error('[SaveManager] No player entity found, cannot save. Will retry in 1s...');
      // Retry after delay in case player hasn't connected yet
      setTimeout(async () => {
        this.playerEntity = null; // Clear cache to force re-lookup
        const retryPlayer = this.findPlayer();
        if (!retryPlayer) {
          console.error('[SaveManager] Retry failed - still no player entity');
          return;
        }
        try {
          await this.playerVarsService.setVariable(retryPlayer, PVAR_SAVE_KEY, { data: payload.saveJson });
        } catch (e) {
          console.error('[SaveManager] Save failed on retry:', e);
        }
      }, 1000);
      return;
    }

    try {
      await this.playerVarsService.setVariable(player, PVAR_SAVE_KEY, { data: payload.saveJson });
    } catch (e) {
      console.error('[SaveManager] Save failed:', e);
    }
  }

  /**
   * Handle load request from client.
   * Fetches PVar data and broadcasts result back globally.
   */
  @subscribe(PuzzleLoadRequestEvent, { execution: ExecuteOn.Everywhere })
  async onLoadRequest(_payload: PuzzleLoadRequestPayload) {
    if (!NetworkingService.get().isServerContext()) return;

    const player = this.findPlayer();
    if (!player) {
      // Retry after delay in case player hasn't connected yet
      setTimeout(async () => {
        this.playerEntity = null; // Clear cache to force re-lookup
        const retryPlayer = this.findPlayer();
        if (!retryPlayer) {
          console.error('[SaveManager] Retry failed - still no player, sending empty');
          EventService.sendGlobally(PuzzleLoadCompleteEvent, {
            saveJson: '',
            success: false,
          });
          return;
        }
        try {
          const result = await this.playerVarsService.fetchVariable<{ data: string }>(retryPlayer, PVAR_SAVE_KEY);
          const saveJson = result?.data ?? '';
          EventService.sendGlobally(PuzzleLoadCompleteEvent, {
            saveJson,
            success: true,
          });
        } catch (e) {
          console.error('[SaveManager] Load failed on retry:', e);
          EventService.sendGlobally(PuzzleLoadCompleteEvent, {
            saveJson: '',
            success: false,
          });
        }
      }, 1000);
      return;
    }

    try {
      const result = await this.playerVarsService.fetchVariable<{ data: string }>(player, PVAR_SAVE_KEY);
      const saveJson = result?.data ?? '';
      EventService.sendGlobally(PuzzleLoadCompleteEvent, {
        saveJson,
        success: true,
      });
    } catch (e) {
      console.error('[SaveManager] Load failed:', e);
      EventService.sendGlobally(PuzzleLoadCompleteEvent, {
        saveJson: '',
        success: false,
      });
    }
  }

  // Hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }
  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
  }
}
