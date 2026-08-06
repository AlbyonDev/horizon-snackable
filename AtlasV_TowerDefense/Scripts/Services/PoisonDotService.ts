/**
 * PoisonDotService — Applies stacking damage-over-time on TakeDamage hits.
 *
 * When a hit has dotDamage/dotDuration/dotTickRate in props, adds an independent
 * DoT stack to the target enemy. Each stack ticks independently and fires
 * TakeDamage with empty props (no dotDamage) to prevent recursion.
 * Multiple poison hits on the same enemy produce independent stacks.
 * Applies green tint while any stack is active.
 * Cleans up on EnemyDied, EnemyReachedEnd, RestartGame.
 * Force-instantiated in GameManager._startGame().
 */
import { Service, Color, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { EnemyController } from '../Components/EnemyController';

const TINT_POISON = new Color(0.3, 0.9, 0.2, 1.0); // toxic green

interface IDotStack {
  damage: number;
  tickRate: number;
  remainingDuration: number;
  timeSinceLastTick: number;
}

@service()
export class PoisonDotService extends Service {
  private _dots: Map<number, IDotStack[]> = new Map();

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    const dotDamage = p.props['dotDamage'] as number | undefined;
    const dotDuration = p.props['dotDuration'] as number | undefined;
    const dotTickRate = p.props['dotTickRate'] as number | undefined;
    if (!dotDamage || !dotDuration || !dotTickRate) return;

    const stack: IDotStack = {
      damage: dotDamage,
      tickRate: dotTickRate,
      remainingDuration: dotDuration,
      timeSinceLastTick: 0,
    };

    let stacks = this._dots.get(p.enemyId);
    if (!stacks) {
      stacks = [];
      this._dots.set(p.enemyId, stacks);
    }
    stacks.push(stack);

    // Apply tint
    const rec = EnemyService.get().get(p.enemyId);
    if (rec) rec.entity.getComponent(EnemyController)?.applyTint(TINT_POISON);

    console.log(`[PoisonDotService] Applied DoT to enemy ${p.enemyId} (${stacks.length} stacks)`);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    const dt = p.deltaTime;
    const enemyService = EnemyService.get();

    for (const [enemyId, stacks] of this._dots) {
      let i = stacks.length;
      while (i-- > 0) {
        const stack = stacks[i];
        stack.remainingDuration -= dt;
        stack.timeSinceLastTick += dt;

        // Fire tick damage
        if (stack.timeSinceLastTick >= stack.tickRate) {
          stack.timeSinceLastTick -= stack.tickRate;
          EventService.sendLocally(Events.TakeDamage, {
            enemyId,
            damage: stack.damage,
            props: {},
            originX: 0,
            originZ: 0,
            hitX: 0,
            hitZ: 0,
          });
        }

        // Remove expired stacks
        if (stack.remainingDuration <= 0) {
          stacks.splice(i, 1);
        }
      }

      // If no stacks remain, remove entry and reset tint
      if (stacks.length === 0) {
        this._dots.delete(enemyId);
        const rec = enemyService.get(enemyId);
        if (rec) rec.entity.getComponent(EnemyController)?.resetTint();
      }
    }
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    this._dots.delete(p.enemyId);
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(p: Events.EnemyReachedEndPayload): void {
    this._dots.delete(p.enemyId);
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._dots.clear();
  }
}
