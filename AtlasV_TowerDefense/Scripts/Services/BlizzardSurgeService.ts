/**
 * BlizzardSurgeService — Temporary speed boost for Yeti enemies during blizzard bursts.
 *
 * Subscribes to Events.BlizzardFreeze. When active=true, finds all live enemies
 * with defId='yeti' and multiplies their speedFactor by the blizzardSpeedBoost trait
 * (default x2). When active=false, reverts those enemies to their pre-boost speedFactor.
 *
 * Component Attachment: Force-instantiated as a service singleton (via GameManager or auto)
 * Component Networking: Local (client-only, runs alongside EnemyController)
 * Component Ownership: Not networked — runs on client via ExecuteOn.Owner
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';

import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { ENEMY_DEFS } from '../Defs/EnemyDefs';

@service()
export class BlizzardSurgeService extends Service {
  /** Map of enemyId → pre-boost speedFactor, used to revert after blizzard ends. */
  private _boostedEnemies: Map<number, number> = new Map();
  private _boostMultiplier: number = 2; // default, read from def

  @subscribe(Events.BlizzardFreeze)
  onBlizzardFreeze(p: Events.BlizzardFreezePayload): void {
    if (NetworkingService.get().isServerContext()) return;

    if (p.active) {
      this._applyBoost();
    } else {
      this._revertBoost();
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._boostedEnemies.clear();
  }

  private _applyBoost(): void {
    // Find the blizzardSpeedBoost value from the yeti def
    const yetiDef = ENEMY_DEFS.find(d => d.id === 'yeti');
    if (!yetiDef || !yetiDef.blizzardSpeedBoost) return;
    this._boostMultiplier = yetiDef.blizzardSpeedBoost;

    const allEnemies = EnemyService.get().getAll();
    let boostedCount = 0;

    for (const [id, rec] of allEnemies) {
      if (rec.defId === 'yeti') {
        // Store the current speedFactor before boosting
        this._boostedEnemies.set(id, rec.speedFactor);
        EnemyService.get().setSpeedFactor(id, rec.speedFactor * this._boostMultiplier);
        boostedCount++;
      }
    }

    if (boostedCount > 0) {
      console.log(`[BlizzardSurgeService] Blizzard Surge! Boosted ${boostedCount} yeti(s) x${this._boostMultiplier}`);
    }
  }

  private _revertBoost(): void {
    let revertedCount = 0;

    for (const [id, originalFactor] of this._boostedEnemies) {
      // Only revert if the enemy is still alive (record still exists)
      const rec = EnemyService.get().get(id);
      if (rec) {
        EnemyService.get().setSpeedFactor(id, originalFactor);
        revertedCount++;
      }
    }

    if (revertedCount > 0) {
      console.log(`[BlizzardSurgeService] Blizzard ended. Reverted ${revertedCount} yeti(s) to normal speed`);
    }
    this._boostedEnemies.clear();
  }
}
