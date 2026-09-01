/**
 * SplitterService — Handles the split-on-death mechanic for Splitter enemies.
 *
 * Subscribes to EnemyDied events. When a dead enemy has `splitOnDeath` in its def,
 * spawns N smaller enemies at the dead enemy's path position (wpIndex + subT).
 * Uses EnemyService.pendingSpawns to prevent premature wave-clear.
 *
 * Attachment: Scene entity (server-systems or any always-alive entity).
 * Networking: Local (all logic is client-local, same as EnemyService spawns).
 * Ownership: Not networked — runs on whoever owns the scene entity.
 */
import { Service, EventService, WorldService, NetworkMode, Quaternion, Vec3 } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';

@service()
export class SplitterService extends Service {

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    const def = EnemyService.get().find(p.defId);
    if (!def || !def.splitOnDeath) return;

    const { enemyId, count } = def.splitOnDeath;
    console.log(`[SplitterService] ${p.defId} died — spawning ${count}x ${enemyId} at wpIndex=${p.wpIndex} subT=${p.subT.toFixed(2)}`);

    // Mark pending so wave-clear waits for these spawns
    EnemyService.get().addPending(count);

    const SPLIT_SPACING = 0.5; // subT units between each mini
    for (let i = 0; i < count; i++) {
      // Center the spread around the parent's death subT so minis fan out evenly
      const offset = (i - (count - 1) / 2) * SPLIT_SPACING;
      const offsetSubT = Math.max(0, p.subT + offset);
      this._spawnSplitEnemy(enemyId, p.wpIndex, offsetSubT, p.worldX, p.worldZ);
    }
  }

  private async _spawnSplitEnemy(
    enemyId: string,
    wpIndex: number,
    subT: number,
    worldX: number,
    worldZ: number,
  ): Promise<void> {
    const def = EnemyService.get().find(enemyId);
    if (!def) {
      EnemyService.get().removePending();
      return;
    }

    try {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: def.template,
        position: new Vec3(worldX, -100, worldZ),
        rotation: Quaternion.identity,
        networkMode: NetworkMode.LocalOnly,
      });

      if (!entity) {
        EnemyService.get().removePending();
        return;
      }

      const initP = new Events.InitEnemyPayload();
      initP.defId = enemyId;
      initP.waveIndex = 0; // minis use base stats (no additional wave scaling beyond current)
      initP.startWpIndex = wpIndex;
      initP.startSubT = subT;
      EventService.sendLocally(Events.InitEnemy, initP, { eventTarget: entity });

      console.log(`[SplitterService] Spawned ${enemyId} at wpIndex=${wpIndex} subT=${subT.toFixed(2)}`);
    } catch (e) {
      console.log(`[SplitterService] Failed to spawn ${enemyId}`);
    }

    EnemyService.get().removePending();
  }
}
