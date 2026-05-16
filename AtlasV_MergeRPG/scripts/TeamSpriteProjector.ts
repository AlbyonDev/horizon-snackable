/**
 * TeamSpriteProjector.ts
 *
 * Projects the existing TeamState (heroVisuals + enemyVisuals) into the
 * generic SpriteViewModel pool consumed by team_renderer.xaml.
 *
 * Pool semantics:
 *  - One SpriteViewModel per slot, created once and mutated each frame.
 *  - The bindable `sprites` array is reassigned only when the slot count
 *    changes (e.g. after a team reset).
 *
 * Coordinate conversion: TeamState stores the *top-left of the scaled sprite*
 * (legacy DrawingSurface convention). The XAML scales each sprite around its
 * center (RenderTransformOrigin="0.5,0.5"), so we shift x/y to compensate so
 * the visual position matches the previous renderer.
 */
import type { TeamState } from './TeamState';
import { HURT_FLASH_DURATION } from './TeamState';
import type { Hero, Enemy, TeamMemberVisual } from './TeamTypes';
import { getHeroTexture } from './HeroCatalog';
import { getEnemyTexture } from './EnemyCatalog';
import { SpriteViewModel, TeamRendererViewModel } from './SpriteViewModel';
import { StatusEffectType } from './PowerTypes';
import type { StatusEffect } from './PowerTypes';

const STATUS_TINT: Record<StatusEffectType, string> = {
  [StatusEffectType.DOT]:        '#88FF22',
  [StatusEffectType.DEBUFF_ATK]: '#CC44FF',
  [StatusEffectType.SHIELD]:     '#44AAFF',
  [StatusEffectType.BUFF_ATK]:   '#FFAA00',
  [StatusEffectType.REGEN]:      '#44FF88',
};

// Lower value = shown first when multiple effects are active
const STATUS_PRIORITY: Record<StatusEffectType, number> = {
  [StatusEffectType.DOT]:        0,
  [StatusEffectType.DEBUFF_ATK]: 1,
  [StatusEffectType.SHIELD]:     2,
  [StatusEffectType.BUFF_ATK]:   3,
  [StatusEffectType.REGEN]:      4,
};

function dominantEffect(effects: StatusEffect[]): StatusEffectType | null {
  let best: StatusEffectType | null = null;
  let bestPri = Infinity;
  for (const e of effects) {
    const p = STATUS_PRIORITY[e.type] ?? 99;
    if (p < bestPri) { bestPri = p; best = e.type; }
  }
  return best;
}

// Intrinsic sprite size for hero/enemy art (matches TeamRenderer.ts)
const SPRITE_WIDTH = 160;
const SPRITE_HEIGHT = 200;

export class TeamSpriteProjector {
  /** Persistent pool: index 0..N-1 heroes, then N..N+M-1 enemies. */
  private pool: SpriteViewModel[] = [];
  private lastHeroCount: number = -1;
  private lastEnemyCount: number = -1;

  /**
   * Update the renderer VM from the current TeamState. Call once per frame
   * after `teamState.update(dt)`.
   */
  update(teamState: TeamState, vm: TeamRendererViewModel, time: number): void {
    const heroCount = teamState.heroes.length;
    const enemyCount = teamState.enemies.length;

    // Recreate the pool only when the slot count changes
    if (heroCount !== this.lastHeroCount || enemyCount !== this.lastEnemyCount) {
      this.pool = [];
      for (let i = 0; i < heroCount + enemyCount; i++) {
        this.pool.push(new SpriteViewModel());
      }
      vm.sprites = this.pool;
      this.lastHeroCount = heroCount;
      this.lastEnemyCount = enemyCount;
    }

    // Project heroes
    for (let i = 0; i < heroCount; i++) {
      this.projectMember(
        this.pool[i],
        teamState.heroes[i],
        teamState.heroVisuals[i],
        true,
        time,
      );
    }
    // Project enemies (offset in pool after heroes)
    for (let i = 0; i < enemyCount; i++) {
      this.projectMember(
        this.pool[heroCount + i],
        teamState.enemies[i],
        teamState.enemyVisuals[i],
        false,
        time,
      );
    }
  }

  private projectMember(
    sprite: SpriteViewModel,
    member: Hero | Enemy,
    visual: TeamMemberVisual,
    isAlly: boolean,
    time: number,
  ): void {
    const texture = isAlly
      ? getHeroTexture((member as Hero).id)
      : getEnemyTexture((member as Enemy).spriteKey);

    // Convert top-left-anchored legacy coords → center-anchored XAML coords.
    // Live offsets (attack lunge, hurt shake, bounce) are summed in here.
    const baseX = visual.x + visual.attackOffsetX + visual.shakeOffsetX;
    const baseY = visual.y + visual.bounceOffset + visual.shakeOffsetY;
    sprite.x = baseX - SPRITE_WIDTH * (1 - visual.scale) / 2;
    sprite.y = baseY - SPRITE_HEIGHT * (1 - visual.scale) / 2;

    sprite.width = SPRITE_WIDTH;
    sprite.height = SPRITE_HEIGHT;
    sprite.scale = visual.scale;
    sprite.rotation = visual.rotation;
    sprite.opacity = visual.opacity;
    sprite.spriteTexture = texture;

    // Hurt flash overrides everything: brief red strobe on damage.
    if (visual.hurtFlashTimer > 0) {
      const t = visual.hurtFlashTimer / HURT_FLASH_DURATION; // 1 → 0
      sprite.tintColor = '#FF4444';
      sprite.tintOpacity = t * 0.7;
    } else {
      // Pulsing glow tint for active status effects.
      const effect = dominantEffect(member.statusEffects);
      if (effect !== null) {
        sprite.tintColor = STATUS_TINT[effect];
        sprite.tintOpacity = 0.18 + 0.12 * Math.sin(time * Math.PI * 2);
      } else {
        sprite.tintColor = '#FF4444';
        sprite.tintOpacity = 0;
      }
    }

    // Drive z-order from the live scale so depth swaps cross over smoothly
    // without snapping at the end of the lerp.
    sprite.zIndex = Math.round(visual.scale * 100);
  }
}
