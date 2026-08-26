/**
 * EnemyKillLeaderboardRelay — Relays cumulative enemies killed from client to server for leaderboard scoring.
 *
 * Component Attachment: Networkable scene entity (e.g. LeaderboardRelay in space.hstf)
 * Component Networking: Networked (uses NetworkEvent for client→server relay)
 * Component Ownership: Server-owned (scene entity)
 *
 * On client: Listens for LevelCompleted events. Sends the cumulative enemy kill
 * count to the server via NetworkEvent.
 * On server: Receives the NetworkEvent, uses Math.max to prevent exploitation via
 * save resets, and calls LeaderboardsService.updateEntryForPlayer.
 */
import {
  Component,
  component,
  subscribe,
  serializable,
  property as netProp,
  ExecuteOn,
  NetworkingService,
  NetworkEvent,
  EventService,
  OnPlayerCreateEvent,
  LeaderboardsService,
} from 'meta/worlds';
import type { Entity, Maybe, OnPlayerCreateEventPayload } from 'meta/worlds';

import { Events } from '../Types';
import { SaveService } from '../Services/SaveService';

// ── NetworkEvent: client → server enemy kills notification ───────────────────

@serializable()
class EnemyKillsForLeaderboardPayload {
  @netProp() readonly enemiesKilled: number = 0;
}

const EnemyKillsForLeaderboardEvent = new NetworkEvent<EnemyKillsForLeaderboardPayload>(
  'TDEnemyKillsForLeaderboard',
  EnemyKillsForLeaderboardPayload,
);

const LEADERBOARD_API_NAME = 'killed-enemies';

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class EnemyKillLeaderboardRelay extends Component {
  private _player: Maybe<Entity> = null;

  // ── Server: cache player reference ─────────────────────────────────────────

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (!p.entity) return;
    this._player = p.entity;
    console.log('[EnemyKillLeaderboardRelay] Player cached on server');
  }

  // ── Client: detect level completed and relay enemy kills to server ─────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(_p: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const enemiesKilled = SaveService.get().getEnemiesKilled();
    console.log(`[EnemyKillLeaderboardRelay] Level completed, enemiesKilled=${enemiesKilled}, relaying to server`);

    EventService.sendGlobally(EnemyKillsForLeaderboardEvent, { enemiesKilled });
  }

  // ── Server: receive enemy kills and update leaderboard score ───────────────

  @subscribe(EnemyKillsForLeaderboardEvent, { execution: ExecuteOn.Everywhere })
  async onEnemyKillsForLeaderboard(p: EnemyKillsForLeaderboardPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!this._player) {
      console.log('[EnemyKillLeaderboardRelay] No player cached, cannot update score');
      return;
    }

    console.log(`[EnemyKillLeaderboardRelay] Updating score for ${LEADERBOARD_API_NAME} with enemiesKilled=${p.enemiesKilled}`);

    try {
      // Fetch current score
      const currentEntry = await LeaderboardsService.get().fetchEntryForPlayer(
        this._player,
        LEADERBOARD_API_NAME,
        {},
      );
      const currentScore = currentEntry != null ? currentEntry.score : 0;

      // Use Math.max to prevent exploitation via save resets — score can only go up
      const newScore = Math.max(currentScore, p.enemiesKilled);
      if (newScore <= currentScore) {
        console.log(`[EnemyKillLeaderboardRelay] Score ${currentScore} already >= reported ${p.enemiesKilled}, skipping update`);
        return;
      }

      const newEntry = await LeaderboardsService.get().updateEntryForPlayer(
        this._player,
        LEADERBOARD_API_NAME,
        newScore,
        {},
      );

      if (newEntry) {
        console.log(`[EnemyKillLeaderboardRelay] Score updated: ${LEADERBOARD_API_NAME} = ${newEntry.score}`);
      } else {
        console.log(`[EnemyKillLeaderboardRelay] Failed to update score for ${LEADERBOARD_API_NAME}`);
      }
    } catch (e) {
      console.log(`[EnemyKillLeaderboardRelay] Error updating leaderboard: ${e}`);
    }
  }
}
