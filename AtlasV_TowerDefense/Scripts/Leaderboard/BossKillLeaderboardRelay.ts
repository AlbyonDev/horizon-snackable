/**
 * BossKillLeaderboardRelay — Relays boss kills from client to server for leaderboard scoring.
 *
 * Component Attachment: Networkable scene entity (e.g. LeaderboardRelay in space.hstf)
 * Component Networking: Networked (uses NetworkEvent for client→server relay)
 * Component Ownership: Server-owned (scene entity)
 *
 * On client: Listens for LevelCompleted events. If the level was a boss (bossSkullReward > 0),
 * sends a NetworkEvent to the server with the active biome.
 * On server: Receives the NetworkEvent, caches the player, and calls
 * LeaderboardsService.updateEntryForPlayer to increment the score for that biome's leaderboard.
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

// ── NetworkEvent: client → server boss kill notification ──────────────────────

@serializable()
class BossKilledForLeaderboardPayload {
  @netProp({ maxLength: 20 }) readonly biomeId: string = '';
  @netProp() readonly bossKillCount: number = 0;
}

const BossKilledForLeaderboardEvent = new NetworkEvent<BossKilledForLeaderboardPayload>(
  'TDBossKilledForLeaderboard',
  BossKilledForLeaderboardPayload,
);

// ── Biome → leaderboard API name mapping ─────────────────────────────────────

const BIOME_LEADERBOARD_MAP: Record<string, string> = {
  grass: 'grass-boss-kills',
  snow: 'snow-boss-kills',
  volcano: 'volcano-boss-kills',
};

// ── Component ────────────────────────────────────────────────────────────────

@component()
export class BossKillLeaderboardRelay extends Component {
  private _player: Maybe<Entity> = null;

  // ── Server: cache player reference ─────────────────────────────────────────

  @subscribe(OnPlayerCreateEvent, { execution: ExecuteOn.Everywhere })
  onPlayerCreate(p: OnPlayerCreateEventPayload): void {
    if (!NetworkingService.get().isServerContext()) return;
    if (!p.entity) return;
    this._player = p.entity;
    console.log('[BossKillLeaderboardRelay] Player cached on server');
  }

  // ── Client: detect boss kill and relay to server ───────────────────────────

  @subscribe(Events.LevelCompleted, { execution: ExecuteOn.Everywhere })
  onLevelCompleted(p: Events.LevelCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // bossSkullReward > 0 means this was a boss level
    if (p.bossSkullReward <= 0) return;

    const biome = SaveService.get().activeBiome;
    // getRunCount() returns completed runs (0-based). At this point markRunComplete()
    // has NOT fired yet, so the actual boss kill count for this biome is runCount + 1.
    const bossKillCount = SaveService.get().getRunCount() + 1;
    console.log(`[BossKillLeaderboardRelay] Boss killed in biome: ${biome}, bossKillCount=${bossKillCount}, relaying to server`);

    EventService.sendGlobally(BossKilledForLeaderboardEvent, { biomeId: biome, bossKillCount: bossKillCount });
  }

  // ── Server: receive boss kill and increment leaderboard score ──────────────

  @subscribe(BossKilledForLeaderboardEvent, { execution: ExecuteOn.Everywhere })
  async onBossKilledForLeaderboard(p: BossKilledForLeaderboardPayload): Promise<void> {
    if (!NetworkingService.get().isServerContext()) return;
    if (!this._player) {
      console.log('[BossKillLeaderboardRelay] No player cached, cannot update score');
      return;
    }

    const apiName = BIOME_LEADERBOARD_MAP[p.biomeId];
    if (!apiName) {
      console.log(`[BossKillLeaderboardRelay] Unknown biome: ${p.biomeId}`);
      return;
    }

    console.log(`[BossKillLeaderboardRelay] Updating score for ${apiName} with bossKillCount=${p.bossKillCount}`);

    try {
      // Fetch current score
      const currentEntry = await LeaderboardsService.get().fetchEntryForPlayer(
        this._player,
        apiName,
        {},
      );
      const currentScore = currentEntry != null ? currentEntry.score : 0;

      // Use Math.max to prevent exploitation via save resets — score can only go up
      const newScore = Math.max(currentScore, p.bossKillCount);
      if (newScore <= currentScore) {
        console.log(`[BossKillLeaderboardRelay] Score ${currentScore} already >= reported ${p.bossKillCount}, skipping update`);
        return;
      }

      const newEntry = await LeaderboardsService.get().updateEntryForPlayer(
        this._player,
        apiName,
        newScore,
        {},
      );

      if (newEntry) {
        console.log(`[BossKillLeaderboardRelay] Score updated: ${apiName} = ${newEntry.score}`);
      } else {
        console.log(`[BossKillLeaderboardRelay] Failed to update score for ${apiName}`);
      }
    } catch (e) {
      console.log(`[BossKillLeaderboardRelay] Error updating leaderboard: ${e}`);
    }
  }
}
