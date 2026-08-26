/**
 * GoldEarnedLeaderboardRelay — Relays cumulative gold earned from client to server for leaderboard scoring.
 *
 * Component Attachment: Networkable scene entity (e.g. LeaderboardRelay in space.hstf)
 * Component Networking: Networked (uses NetworkEvent for client→server relay)
 * Component Ownership: Server-owned (scene entity)
 *
 * On client: Listens for LevelCompleted events. Sends the cumulative gold earned
 * stat to the server via NetworkEvent.
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

// ── NetworkEvent: client → server gold earned notification ──────────────────

@serializable()
class GoldEarnedForLeaderboardPayload {
  @netProp() readonly goldEarned: number = 0;
}

const GoldEarnedForLeaderboardEvent = new NetworkEvent<GoldEarnedForLeaderboardPayload>(
  'TDGoldEarnedForLeaderboard',
  GoldEarnedForLeaderboardPayload,
);

const LEADERBOARD_API_NAME = 'earned-gold';

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class GoldEarnedLeaderboardRelay extends Component {
  private _player: Maybe<Entity> = null;

  // ── Server: cache player reference ─────────────────────────────────────────

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (!p.entity) return;
    this._player = p.entity;
    console.log('[GoldEarnedLeaderboardRelay] Player cached on server');
  }

  // ── Client: detect level completed and relay gold earned to server ─────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(_p: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    const goldEarned = SaveService.get().getGoldEarned();
    console.log(`[GoldEarnedLeaderboardRelay] Level completed, goldEarned=${goldEarned}, relaying to server`);

    EventService.sendGlobally(GoldEarnedForLeaderboardEvent, { goldEarned });
  }

  // ── Server: receive gold earned and update leaderboard score ───────────────

  @subscribe(GoldEarnedForLeaderboardEvent, { execution: ExecuteOn.Everywhere })
  async onGoldEarnedForLeaderboard(p: GoldEarnedForLeaderboardPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!this._player) {
      console.log('[GoldEarnedLeaderboardRelay] No player cached, cannot update score');
      return;
    }

    console.log(`[GoldEarnedLeaderboardRelay] Updating score for ${LEADERBOARD_API_NAME} with goldEarned=${p.goldEarned}`);

    try {
      // Fetch current score
      const currentEntry = await LeaderboardsService.get().fetchEntryForPlayer(
        this._player,
        LEADERBOARD_API_NAME,
        {},
      );
      const currentScore = currentEntry != null ? currentEntry.score : 0;

      // Use Math.max to prevent exploitation via save resets — score can only go up
      const newScore = Math.max(currentScore, p.goldEarned);
      if (newScore <= currentScore) {
        console.log(`[GoldEarnedLeaderboardRelay] Score ${currentScore} already >= reported ${p.goldEarned}, skipping update`);
        return;
      }

      const newEntry = await LeaderboardsService.get().updateEntryForPlayer(
        this._player,
        LEADERBOARD_API_NAME,
        newScore,
        {},
      );

      if (newEntry) {
        console.log(`[GoldEarnedLeaderboardRelay] Score updated: ${LEADERBOARD_API_NAME} = ${newEntry.score}`);
      } else {
        console.log(`[GoldEarnedLeaderboardRelay] Failed to update score for ${LEADERBOARD_API_NAME}`);
      }
    } catch (e) {
      console.log(`[GoldEarnedLeaderboardRelay] Error updating leaderboard: ${e}`);
    }
  }
}
