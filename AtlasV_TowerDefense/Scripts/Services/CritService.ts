/**
 * CritService — HitService modifier that applies critical hit damage.
 *
 * Reads props.critChance from IHitContext. Rolls Math.random(); on success:
 *   - multiplies ctx.damage by props.critMultiplier (default CRIT_MULTIPLIER from Constants).
 *   - sets props.critHit = multiplier so FloatingTextService can display it.
 *   - sets props.isCrit = true (legacy flag, critHit is the authoritative check).
 * Only arrow and cannon towers have critChance in their stats/upgrades.
 * Force-instantiated in GameManager._startGame() to trigger self-registration.
 */
import { Service, service } from 'meta/worlds';
import { OnServiceReadyEvent, subscribe } from 'meta/worlds';
import { HitService } from './HitService';
import { SkillTreeService } from './SkillTreeService';

@service()
export class CritService extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    HitService.get().register(ctx => {
      const baseCritChance = (ctx.props['critChance'] as number | undefined) ?? 0;
      const skillBonus = SkillTreeService.get().getCritChanceBonus();
      const chance = baseCritChance + skillBonus;
      const mult = (ctx.props['critMultiplier'] as number | undefined) ?? 1;
      
      if (chance <= 0 || Math.random() >= chance) return ctx;
      return { ...ctx, damage: ctx.damage * mult, props: { ...ctx.props, isCrit: true } };
    });
  }
}
