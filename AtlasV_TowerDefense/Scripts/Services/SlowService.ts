/**
 * SlowService — Applies slow debuffs to enemies on TakeDamage hits.
 *
 * Subscribes to TakeDamage. If props.slowFactor and props.slowDuration are present,
 * calls EnemyService.setSpeedFactor() to slow the enemy for the given duration.
 * Tracks active slow timers per enemyId in onUpdate, restoring speedFactor=1 on expiry.
 * Also tints the enemy entity blue while slowed via EnemyController.applyTint/resetTint.
 */
import { Service, Color, subscribe } from 'meta/worlds';
import { service } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { EnemyController } from '../Components/EnemyController';
import { SkillTreeService } from './SkillTreeService';

const TINT_SLOW = new Color(0.4, 0.85, 1.0, 1.0); // icy cyan

interface ISlowState {
  factor: number;
  expiresAt: number;
}

@service()
export class SlowService extends Service {
  private _slows: Map<number, ISlowState> = new Map();
  private _enemyService = Service.inject(EnemyService);

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    const factor   = p.props['slowFactor']   as number | undefined;
    const duration = p.props['slowDuration'] as number | undefined;
    if (factor === undefined || duration === undefined || factor >= 1) return;

    const rec = this._enemyService.get(p.enemyId);
    const def = rec ? this._enemyService.find(rec.defId) : undefined;
    if (def?.slowImmune) return;

    const skills = SkillTreeService.get();
    const adjustedFactor = Math.max(0, factor - skills.getSlowFactorBonus());
    const adjustedDuration = duration * skills.getSlowDurationMultiplier();
    const expiresAt = Date.now() + adjustedDuration * 1000;
    const existing  = this._slows.get(p.enemyId);

    if (!existing || adjustedFactor <= existing.factor || expiresAt > existing.expiresAt) {
      this._slows.set(p.enemyId, { factor: adjustedFactor, expiresAt });
      this._enemyService.setSpeedFactor(p.enemyId, adjustedFactor);
      const rec = this._enemyService.get(p.enemyId);
      if (rec) rec.entity.getComponent(EnemyController)?.applyTint(TINT_SLOW);
    }
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(_p: unknown): void {
    const now = Date.now();
    for (const [id, slow] of this._slows) {
      if (now >= slow.expiresAt) {
        this._slows.delete(id);
        this._enemyService.setSpeedFactor(id, 1);
        const rec = this._enemyService.get(id);
        if (rec) rec.entity.getComponent(EnemyController)?.resetTint();
      }
    }
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    this._slows.delete(p.enemyId);
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._slows.clear();
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(p: Events.EnemyReachedEndPayload): void {
    this._slows.delete(p.enemyId);
  }
}
