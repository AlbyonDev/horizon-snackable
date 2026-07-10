/**
 * CritService — HitService modifier that applies critical hit damage.
 *
 * Reads props.critChance from IHitContext. Rolls Math.random(); on success:
 *   - multiplies ctx.damage by props.critMultiplier (default 1 if unset).
 *   - sets props.isCrit = true; FloatingTextService reads isCrit + critMultiplier to show the crit.
 * Towers with critChance in their stats/upgrades: arrow, cannon, and laser (Rate→Crit branch).
 * Force-instantiated in GameManager._startGame() to trigger self-registration.
 */
import { Service, service } from 'meta/worlds';
import { OnServiceReadyEvent, subscribe } from 'meta/worlds';
import { HitService } from './HitService';

@service()
export class CritService extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    HitService.get().register(ctx => {
      const chance = (ctx.props['critChance'] as number | undefined) ?? 0;
      const mult = (ctx.props['critMultiplier'] as number | undefined) ?? 1;
      
      if (chance <= 0 || Math.random() >= chance) return ctx;
      return { ...ctx, damage: ctx.damage * mult, props: { ...ctx.props, isCrit: true } };
    });
  }
}
