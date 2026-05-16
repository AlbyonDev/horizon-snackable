/**
 * HpBarManager.ts
 *
 * Owns the pool of HpBarItemViewModel instances rendered as the chunky JRPG
 * health bars above the board. Mirrors the architecture of DamagePopupManager:
 * fixed pools, mutated in place, bound once to the renderer VM.
 *
 * Responsibilities:
 *  - Position each bar based on its character's current depth-rank (smooth lerp
 *    so swap-to-front animates instead of snapping)
 *  - Drive `fillWidth` + `hpText` from `teamState.heroDisplayHp` /
 *    `enemyDisplayHp` (smooth-drained values already maintained by TeamState)
 *  - Fade bar in/out on appearance + death
 */
import type { Hero, Enemy, TeamMemberVisual } from './TeamTypes';
import type { TeamState } from './TeamState';
import type { ManaBank } from './ManaBank';
import { HpBarItemViewModel } from './SpriteViewModel';
import { GEM_COLOR_HEX } from './PowerTypes';

const POOL_SIZE = 3;

const BAR_WIDTH = 70;
const ALLY_BAR_HEIGHT = 34;  // HP section + mana strip
const ENEMY_BAR_HEIGHT = 24; // HP only, unchanged
const BAR_GAP = 4;
const BAR_INNER_PAD = 3;
const BAR_Y = 286;           // nudged up slightly to keep the row clear of the board
const ALLY_BASE_X = 6;
const ENEMY_BASE_X = 256;

const POSITION_LERP_SPEED = 12;
const FADE_LERP_SPEED = 10;

/** Duration (s) of the mana-spend telegraph: a short horizontal shake on the
 *  ally bar that draws the player's eye to the column whose mana just dropped. */
const MANA_FLASH_DURATION = 0.28;
/** Peak shake amplitude in pixels. */
const MANA_FLASH_AMPLITUDE = 4;
/** Shake cycles per second. */
const MANA_FLASH_FREQ_HZ = 28;
/** Hex color used for the bright mid-flash; fades back to the hero's gem color. */
const MANA_FLASH_COLOR = '#FFFFFF';

export class HpBarManager {
  private allyPool: HpBarItemViewModel[] = [];
  private enemyPool: HpBarItemViewModel[] = [];
  /** Per-ally remaining flash time (seconds). 0 = no flash active. */
  private allyManaFlashTimers: number[] = [];
  /** Global time accumulator for the power-ready glow pulse. */
  private glowTime: number = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.allyPool.push(new HpBarItemViewModel());
      this.enemyPool.push(new HpBarItemViewModel());
      this.allyManaFlashTimers.push(0);
    }
  }

  /** Trigger a mana-spend telegraph on the given ally slot. Called when a
   *  hero's power consumes mana so the player sees *which* column dropped. */
  flashAllyMana(heroIndex: number): void {
    if (heroIndex < 0 || heroIndex >= this.allyManaFlashTimers.length) return;
    this.allyManaFlashTimers[heroIndex] = MANA_FLASH_DURATION;
  }

  /** Bind once to TeamRendererViewModel.allyHpBars at init. */
  getAllyPool(): readonly HpBarItemViewModel[] {
    return this.allyPool;
  }

  /** Bind once to TeamRendererViewModel.enemyHpBars at init. */
  getEnemyPool(): readonly HpBarItemViewModel[] {
    return this.enemyPool;
  }

  /** Return the VM for a specific ally hero index, or null if hidden/dead.
   *  Used by GameComponent to register the bar region as a touch target. */
  getAllyBarForHero(heroIndex: number): HpBarItemViewModel | null {
    if (heroIndex < 0 || heroIndex >= this.allyPool.length) return null;
    const bar = this.allyPool[heroIndex];
    return bar.opacity > 0.05 ? bar : null;
  }

  /** Snap all alive bars to full opacity. Call after reorganize or new room. */
  resetBarVisibility(): void {
    for (const bar of this.allyPool) {
      bar.opacity = 0; // will snap to 1 on next frame if alive
    }
    for (const bar of this.enemyPool) {
      bar.opacity = 0;
    }
  }

  /** Update both pools from the current TeamState. Call once per frame. */
  update(teamState: TeamState, manaBank: ManaBank, dt: number): void {
    this.glowTime += dt;

    // Decay ally mana-flash timers so the telegraph fades on its own.
    for (let i = 0; i < this.allyManaFlashTimers.length; i++) {
      if (this.allyManaFlashTimers[i] > 0) {
        this.allyManaFlashTimers[i] = Math.max(0, this.allyManaFlashTimers[i] - dt);
      }
    }

    this.updateTeam(
      this.allyPool,
      teamState.heroes,
      teamState.heroVisuals,
      teamState.heroDisplayHp,
      manaBank,
      true,
      dt,
    );
    this.updateTeam(
      this.enemyPool,
      teamState.enemies,
      teamState.enemyVisuals,
      teamState.enemyDisplayHp,
      manaBank,
      false,
      dt,
    );
  }

  private updateTeam(
    pool: HpBarItemViewModel[],
    members: (Hero | Enemy)[],
    visuals: TeamMemberVisual[],
    displayHps: number[],
    manaBank: ManaBank,
    isAlly: boolean,
    dt: number,
  ): void {
    const baseX = isAlly ? ALLY_BASE_X : ENEMY_BASE_X;
    const slots = this.computeSlots(members, visuals, isAlly);
    const posLerp = 1 - Math.exp(-POSITION_LERP_SPEED * dt);
    const fadeLerp = 1 - Math.exp(-FADE_LERP_SPEED * dt);

    for (let i = 0; i < pool.length; i++) {
      const bar = pool[i];

      const isAlive =
        i < members.length &&
        slots[i] >= 0 &&
        members[i].currentHp > 0 &&
        !visuals[i].isDead;

      if (!isAlive) {
        // Mirror the sprite's opacity so the bar and sprite disappear together.
        // Fall back to the standard lerp when the visual slot is no longer valid
        // (e.g. after reorganizeHeroes splices the hero out of the array).
        if (i < visuals.length && visuals[i].isDead) {
          bar.opacity = visuals[i].opacity;
        } else {
          bar.opacity += (0 - bar.opacity) * fadeLerp;
        }
        bar.powerReadyVisible = false;
        bar.barScale += (1.0 - bar.barScale) * Math.min(1, 6 * dt);
        continue;
      }

      const slot = slots[i];
      const member = members[i];
      const targetX = baseX + slot * (BAR_WIDTH + BAR_GAP);

      // Snap on first appearance or after being repurposed from a dead hero's bar:
      // if the bar was invisible (opacity < 0.05), position and opacity snap
      // immediately so the player never sees a "missing" bar after reorganize.
      if (bar.opacity < 0.05) {
        bar.x = targetX;
        bar.opacity = 1;
      } else {
        bar.x += (targetX - bar.x) * posLerp;
      }

      bar.y = BAR_Y;
      bar.width = BAR_WIDTH;
      bar.height = isAlly ? ALLY_BAR_HEIGHT : ENEMY_BAR_HEIGHT;

      const innerW = BAR_WIDTH - BAR_INNER_PAD * 2;
      const currentRatio =
        member.maxHp > 0 ? Math.max(0, Math.min(1, member.currentHp / member.maxHp)) : 0;
      const displayRatio =
        member.maxHp > 0
          ? Math.max(0, Math.min(1, Math.max(0, displayHps[i]) / member.maxHp))
          : 0;
      bar.fillWidth = currentRatio * innerW;
      bar.trailWidth = displayRatio * innerW;
      bar.hpText = String(Math.ceil(member.currentHp));

      // Mana strip — ally bars only
      if (isAlly) {
        const hero = member as Hero;
        const cost = hero.power.manaCost;
        const current = manaBank.getMana(hero.power.manaColor);
        bar.manaFillWidth = cost > 0 ? Math.min(1, current / cost) * innerW : innerW;
        const baseColor = GEM_COLOR_HEX[hero.power.manaColor as keyof typeof GEM_COLOR_HEX] ?? '#888888';

        const flashRemaining = this.allyManaFlashTimers[i] ?? 0;
        if (flashRemaining > 0) {
          // t = 1.0 just after spend, decays to 0 — drives both shake and
          // brightness so the column stops calling attention to itself once
          // the player's eye has had time to land on it.
          const t = flashRemaining / MANA_FLASH_DURATION;
          // White at peak, base hero color at end. Squared so the flash
          // tails off fast and the "your mana dropped" beat reads cleanly.
          bar.manaColor = t > 0.6 ? MANA_FLASH_COLOR : baseColor;
          // Horizontal shake; amplitude scales with remaining flash so it
          // doesn't feel like the bar is permanently jittering.
          const elapsed = MANA_FLASH_DURATION - flashRemaining;
          const shake = Math.sin(elapsed * Math.PI * 2 * MANA_FLASH_FREQ_HZ) * MANA_FLASH_AMPLITUDE * t;
          bar.x += shake;
        } else {
          bar.manaColor = baseColor;
        }

        // Power-ready CTA: glowing border + CAST! badge + scale pop
        const powerReady = cost > 0 && current >= cost;
        if (powerReady) {
          const pulse = 0.5 + 0.5 * Math.sin(this.glowTime * Math.PI * 2.5);
          bar.borderColor = baseColor;
          bar.borderGlowOpacity = 0.45 + 0.5 * pulse;
        } else {
          bar.borderColor = '#FF000000';
          bar.borderGlowOpacity = 0;
        }
        bar.powerReadyVisible = powerReady;
        const scaleTarget = powerReady ? 1.12 : 1.0;
        bar.barScale += (scaleTarget - bar.barScale) * Math.min(1, 6 * dt);
      }

      bar.opacity += (1 - bar.opacity) * fadeLerp;
    }
  }

  /** Compute slot index per member from current scale ranking.
   *  Allies: ascending (back→front, leftmost→rightmost).
   *  Enemies: descending (front→back, leftmost→rightmost).
   *  Returns -1 for dead/non-existent members. */
  private computeSlots(
    members: (Hero | Enemy)[],
    visuals: TeamMemberVisual[],
    isAlly: boolean,
  ): number[] {
    const ranked = members
      .map((m, i) => ({
        i,
        scale: visuals[i].scale,
        alive: m.currentHp > 0 && !visuals[i].isDead,
      }))
      .filter(e => e.alive);

    if (isAlly) {
      ranked.sort((a, b) => a.scale - b.scale);
    } else {
      ranked.sort((a, b) => b.scale - a.scale);
    }

    const slots = new Array(members.length).fill(-1);
    if (isAlly) {
      // Front hero must stay at the rightmost slot (closest to center/enemies).
      // Assign from the right so survivors don't drift left when a hero dies.
      const offset = POOL_SIZE - ranked.length;
      ranked.forEach((entry, slotIdx) => {
        slots[entry.i] = offset + slotIdx;
      });
    } else {
      ranked.forEach((entry, slotIdx) => {
        slots[entry.i] = slotIdx;
      });
    }
    return slots;
  }
}
