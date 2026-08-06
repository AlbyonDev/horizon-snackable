/**
 * ChainLightningService — Subscribes to TakeDamage and fires chain-bounce hits.
 *
 * When a hit has chainCount/chainRange/chainDamageFalloff in props, finds
 * nearby enemies and fires additional TakeDamage events with reduced damage.
 * Each bounce reduces damage by chainDamageFalloff multiplier.
 * Chain hits use empty props (no chain keys) to prevent infinite recursion.
 * Also spawns a brief lightning arc VFX between chain-bounced enemies.
 * Force-instantiated in GameManager._startGame().
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { TargetingService } from './TargetingService';
import { VfxService } from './VfxService';

@service()
export class ChainLightningService extends Service {

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    const chainCount = p.props['chainCount'] as number | undefined;
    const chainRange = p.props['chainRange'] as number | undefined;
    const chainDamageFalloff = p.props['chainDamageFalloff'] as number | undefined;
    if (!chainCount || !chainRange || !chainDamageFalloff) return;

    const enemyService = EnemyService.get();
    const targetingService = TargetingService.get();

    // Start chaining from the primary hit target
    const alreadyHit = new Set<number>();
    alreadyHit.add(p.enemyId);

    let lastHitId = p.enemyId;
    let currentDamage = p.damage;

    // Use hitX/hitZ as the starting position (detonation point).
    // This handles the race condition where the primary target is already dead/unregistered.
    let lastX = p.hitX;
    let lastZ = p.hitZ;

    // If primary target is still alive, prefer its live position
    const primaryRec = enemyService.get(p.enemyId);
    if (primaryRec) {
      lastX = primaryRec.worldX;
      lastZ = primaryRec.worldZ;
    } else if (lastX === 0 && lastZ === 0) {
      // hitX/hitZ not populated (legacy path) — cannot chain
      console.log('[ChainLightningService] Primary target dead and no hitX/hitZ — aborting chain');
      return;
    }

    for (let bounce = 0; bounce < chainCount; bounce++) {
      // Find enemies in chain range of last hit position
      const nearby = targetingService.getEnemiesInRadius(lastX, lastZ, chainRange);
      if (!nearby || nearby.length === 0) break;

      // Pick the closest enemy not already hit
      let bestId = -1;
      let bestDist = Infinity;
      for (const candidateId of nearby) {
        if (alreadyHit.has(candidateId)) continue;
        const candidateRec = enemyService.get(candidateId);
        if (!candidateRec) continue;
        const dx = candidateRec.worldX - lastX;
        const dz = candidateRec.worldZ - lastZ;
        const dist = dx * dx + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          bestId = candidateId;
        }
      }

      if (bestId < 0) break;

      const bestRec = enemyService.get(bestId);
      if (!bestRec) break;

      // Apply falloff
      currentDamage *= chainDamageFalloff;
      alreadyHit.add(bestId);

      // Spawn chain arc VFX between last position and new target
      this._spawnChainArc(lastX, lastZ, bestRec.worldX, bestRec.worldZ);

      // Fire chain damage — empty props to prevent recursion
      EventService.sendLocally(Events.TakeDamage, {
        enemyId: bestId,
        damage: currentDamage,
        props: {},
        originX: lastX,
        originZ: lastZ,
        hitX: bestRec.worldX,
        hitZ: bestRec.worldZ,
      });

      console.log(`[ChainLightningService] Bounce ${bounce + 1}: enemy ${bestId}, dmg ${currentDamage.toFixed(1)}`);

      // Advance chain position
      lastX = bestRec.worldX;
      lastZ = bestRec.worldZ;
      lastHitId = bestId;
    }
  }

  /**
   * Spawns a dramatic lightning arc visual between two world positions.
   * Uses large bright electric-blue/white particles with wide jitter,
   * multiple passes for density, and impact bursts at both endpoints.
   */
  private _spawnChainArc(fromX: number, fromZ: number, toX: number, toZ: number): void {
    const vfx = VfxService.get();
    const segments = 8; // More segments = denser arc
    const dx = (toX - fromX) / segments;
    const dz = (toZ - fromZ) / segments;
    const arcY = 0.5; // Height above ground

    // Fire event so SFX controller can play the electric zap sound
    EventService.sendLocally(Events.ChainArcSpawned, {});

    // === Main arc: bright white-blue core ===
    for (let i = 0; i <= segments; i++) {
      // Heavy random jitter for jagged lightning feel
      const jitterX = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.4 : 0;
      const jitterZ = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.4 : 0;
      const jitterY = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.25 : 0;
      const x = fromX + dx * i + jitterX;
      const z = fromZ + dz * i + jitterZ;
      const y = arcY + jitterY;
      // Bright white core particle — large and long-lived
      vfx.spawnChainParticle(x, y, z, 1.0, 1.0, 1.0, 0.18, 0.4);
    }

    // === Secondary arc pass: electric blue glow (offset jitter for thickness) ===
    for (let i = 0; i <= segments; i++) {
      const jitterX = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.5 : 0;
      const jitterZ = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.5 : 0;
      const jitterY = (i > 0 && i < segments) ? (Math.random() - 0.5) * 0.3 : 0;
      const x = fromX + dx * i + jitterX;
      const z = fromZ + dz * i + jitterZ;
      const y = arcY + jitterY;
      // Vivid electric blue glow particles
      vfx.spawnChainParticle(x, y, z, 0.3, 0.6, 1.0, 0.14, 0.35);
    }

    // === Impact burst at destination (bounce hit point) ===
    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.0;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 2 + Math.random() * 2.5;
      // Bright white-blue burst particles that fly outward
      vfx.spawnChainParticle(toX, arcY, toZ, 0.7, 0.85, 1.0, 0.15, 0.35, vx, vy, vz);
    }

    // === Small flash burst at origin (chain source) ===
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.0;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      vfx.spawnChainParticle(fromX, arcY, fromZ, 1.0, 1.0, 1.0, 0.12, 0.25, vx, 1.5, vz);
    }
  }
}
