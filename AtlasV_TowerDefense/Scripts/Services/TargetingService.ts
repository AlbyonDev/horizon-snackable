/**
 * TargetingService — Enemy targeting queries for towers and hit systems.
 *
 * getBestTarget(worldX, worldZ, range): returns the enemyId furthest along the path
 *   within range — towers always shoot the enemy closest to the exit.
 * getEnemiesInRadius(worldX, worldZ, radius): returns all enemy IDs within radius
 *   of a world position — used by SplashSystem at detonation.
 * Both read live positions from EnemyService.getAll().
 */
import { Service } from 'meta/worlds';
import { service } from 'meta/worlds';
import { EnemyService } from './EnemyService';
import { VISIBLE_GRID_TOP_X } from '../Constants';

@service()
export class TargetingService extends Service {
  // Returns the id of the enemy with the highest pathT within range,
  // or -1 if none found. "Furthest along path" is the standard TD priority.
  getBestTarget(worldX: number, worldZ: number, range: number): number {
    const registry = EnemyService.get();
    let bestId = -1;
    let bestPathT = -1;

    for (const [id, rec] of registry.getAll()) {
      // Skip enemies still in the spawn offset area (above the visible grid)
      if (rec.worldX > VISIBLE_GRID_TOP_X) continue;
      // Skip shielded enemies — towers should not waste shots on them
      if (rec.shieldActive) continue;

      const dx = rec.worldX - worldX;
      const dz = rec.worldZ - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= range && rec.pathT > bestPathT) {
        bestPathT = rec.pathT;
        bestId = id;
      }
    }

    return bestId;
  }

  // Returns all enemy ids within a radius of a world position.
  // Used by projectile controllers for AoE hit detection.
  getEnemiesInRadius(worldX: number, worldZ: number, radius: number): number[] {
    const registry = EnemyService.get();
    const result: number[] = [];

    for (const [id, rec] of registry.getAll()) {
      // Skip enemies still in the spawn offset area (above the visible grid)
      if (rec.worldX > VISIBLE_GRID_TOP_X) continue;
      const dx = rec.worldX - worldX;
      const dz = rec.worldZ - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) <= radius) {
        result.push(id);
      }
    }

    return result;
  }
}
