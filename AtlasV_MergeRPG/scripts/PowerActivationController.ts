/**
 * PowerActivationController
 *
 * Owns the hero-power preview / activation flow:
 *   tap → preview panel → confirm → consume mana → lunge → apply effect
 *
 * Splits this self-contained chunk of UI + game logic out of GameComponent
 * so the orchestrator can stay focused on the cascade / combat pipeline.
 */
import { TextureAsset } from 'meta/worlds';
import { getHeroTexture } from './HeroCatalog';
import type { GameViewModel } from './GameViewModel';
import type { TeamState } from './TeamState';
import type { ManaBank } from './ManaBank';
import type { DamagePopupManager } from './DamagePopupManager';
import type { HpBarManager } from './HpBarManager';
import type { PowerAnimationSystem } from './PowerAnimationSystem';
import type { PowerCinematicRenderer } from './PowerCinematicRenderer';
import type { PowerEffectParticles } from './PowerEffectParticles';
import { PowerResolver } from './PowerSystem';
import {
  GEM_COLOR_HEX,
  PowerEffectType,
  PowerTarget,
} from './PowerTypes';
import {
  POPUP_COLOR_POWER,
  POPUP_COLOR_HEAL,
  POPUP_POWER_FONT,
  POPUP_POWER_BURST_FONT,
  POPUP_HEAL_FONT,
} from './AnimationConfig';
import {
  gemRedTexture,
  gemBlueTexture,
  gemGreenTexture,
  gemYellowTexture,
  gemPurpleTexture,
} from './Assets';
import { GemType } from './Types';
import { ScreenShakeManager } from './ScreenShakeManager';


const GEM_TEXTURE_LOOKUP: Record<GemType, TextureAsset> = {
  [GemType.Red]:    gemRedTexture,
  [GemType.Blue]:   gemBlueTexture,
  [GemType.Green]:  gemGreenTexture,
  [GemType.Yellow]: gemYellowTexture,
  [GemType.Purple]: gemPurpleTexture,
};

export interface PowerActivationDeps {
  teamState: TeamState;
  manaBank: ManaBank;
  viewModel: GameViewModel;
  damagePopups: DamagePopupManager;
  /** HP/mana bar pool — used to flash the spent mana column on cast confirm. */
  hpBars: HpBarManager;
  /** Drives the fullscreen Spotlight → Cinematic → ReturnToNormal → ApplyEffect state machine. */
  animSystem: PowerAnimationSystem;
  /** Particle renderer used during the cinematic; reset before each cast. */
  cinematicRenderer: PowerCinematicRenderer;
  /** In-zone particle effects (projectiles, explosions, sparkles, screen shake). */
  powerEffectParticles: PowerEffectParticles;
  /** Called when all enemies die as a result of a power. */
  onVictory: () => void;
  /** Called when a power requests a full board shuffle (e.g. Oracle's Foresight). */
  onBoardShuffle?: () => void;
  /** Called when a power converts board gems in place (e.g. Pyromancer, Alchemist). */
  onGemConvert?: (fromColor: GemType, toColor: GemType, count: number) => void;
  /** Called when a power destroys all gems of a color (e.g. Mage's Fireball). */
  onGemDestroy?: (color: GemType) => void;
  /** Returns the current count of gems of a given color on the board (used by GEM_DESTROY_DAMAGE). */
  getBoardGemCount?: (color: GemType) => number;
  /** Optional per-hero level multiplier for power damage scaling. */
  getLevelMultiplier?: (heroId: string) => number;
  /** Optional: screen shake manager for power activation effects. */
  screenShake?: ScreenShakeManager;
}

export class PowerActivationController {
  private deps: PowerActivationDeps;
  private resolver: PowerResolver;
  private _previewHeroIndex: number = -1;
  /** Set when a power kills the last enemy; consumed by onComplete so the
   *  victory is deferred until after the cinematic fully settles. */
  private _victoryPending: boolean = false;

  constructor(deps: PowerActivationDeps) {
    this.deps = deps;
    this.resolver = new PowerResolver(deps.teamState, deps.getLevelMultiplier, deps.getBoardGemCount);
  }

  /** Index of the hero whose power preview is currently shown (-1 = none). */
  get previewHeroIndex(): number { return this._previewHeroIndex; }

  /** Reset to initial (no preview, no in-flight power, no cinematic). */
  reset(): void {
    this._previewHeroIndex = -1;
    this._victoryPending = false;
    this.deps.viewModel.powerPreviewVisible = false;
    this.deps.animSystem.reset();
    this.deps.cinematicRenderer.reset();
    this.deps.powerEffectParticles.reset();
  }

  /** True while the fullscreen power cinematic is playing. */
  get isCinematicActive(): boolean { return this.deps.animSystem.isActive; }

  /** Handle a hero portrait tap → open / switch / close the panel. */
  handleHeroTap(heroIndex: number): void {
    // Suppress hero taps while the fullscreen cinematic is playing — the
    // player shouldn't be able to queue a second cast over the first.
    if (this.deps.animSystem.isActive) return;
    const hero = this.deps.teamState.heroes[heroIndex];
    if (!hero) return;
    if (this._previewHeroIndex === heroIndex) {
      this.hidePreview();
      return;
    }
    this.showPreview(heroIndex);
  }

  /** True while the power preview panel is open. */
  get isPreviewOpen(): boolean { return this._previewHeroIndex >= 0; }

  /** Tap-outside or explicit cancel — hide the preview panel. */
  hidePreview(): void {
    this._previewHeroIndex = -1;
    const vm = this.deps.viewModel;
    vm.powerPreviewVisible = false;
    vm.powerHeroName = '';
    vm.powerName = '';
    vm.powerDescription = '';
    vm.powerCanCast = false;
    vm.powerHeroTexture = null;
    vm.powerGemTexture = null;
  }

  /**
   * Player tapped "confirm" on the panel. Returns true if the power was
   * actually launched (mana available, hero valid).
   *
   * Sequence:
   *   1. Spend mana + flash the spent mana column so the player sees the
   *      cause of the cinematic (drops are otherwise easy to miss).
   *   2. Bring caster to the front, hide the preview panel, lock input.
   *   3. Hand off to PowerAnimationSystem → fullscreen cinematic. Phase order
   *      is Spotlight → Cinematic → ReturnToNormal → ApplyEffect → Idle:
   *      the board is fully revealed BEFORE damage/particles play, so the
   *      player sees who was hit and how much landed.
   *   4. The ApplyEffect callback fires applyEffect() while the board is
   *      visible: real damage, popups, hurt-flashes, in-zone particles +
   *      screen shake, lunge animation.
   *   5. ApplyEffect waits on isResolveSettled (particles + popups done),
   *      then onComplete unlocks input.
   */
  confirmPreview(): boolean {
    if (this._previewHeroIndex < 0) return false;
    if (this.deps.animSystem.isActive) return false; // already casting

    const heroIndex = this._previewHeroIndex;
    const hero = this.deps.teamState.heroes[heroIndex];
    if (!hero) { this.hidePreview(); return false; }

    const spent = this.deps.manaBank.spendMana(hero.power.manaColor, hero.power.manaCost);
    if (!spent) {
      this.hidePreview();
      return false;
    }

    // Telegraph the spend on the caster's mana column. The Spotlight phase
    // keeps game UI visible, so the shake/brightness lands on screen and
    // makes the cause-effect (mana → cinematic) read clearly.
    this.deps.hpBars.flashAllyMana(heroIndex);

    // Bring caster to the front so the spotlight glow targets the right slot.
    this.deps.teamState.bringHeroToFront(heroIndex);

    // Hide the preview panel for the entire cinematic. Input gating is
    // automatic via GameComponent's interactivity predicate.
    this._previewHeroIndex = -1;
    this.deps.viewModel.powerPreviewVisible = false;

    // Reset cinematic renderer particles so the previous cast doesn't leak in.
    this.deps.cinematicRenderer.reset();

    // Bind the *actual* casting hero — texture and screen position — so the
    // cinematic draws the right sprite. The team roster is randomly picked
    // from a pool of 5, so heroIndex alone is ambiguous.
    const heroVisual = this.deps.teamState.heroVisuals[heroIndex];
    const sprite = getHeroTexture(hero.id);
    this.deps.animSystem.start(
      {
        heroIndex,
        texture: sprite,
        name: hero.name,
        powerName: hero.power.name,
        // Spotlight glow centres on the hero portrait's body (sprite is 160 wide × 200 tall at scale 1).
        spotlightX: heroVisual.x + 80 * heroVisual.scale,
        spotlightY: heroVisual.y + 100 * heroVisual.scale,
      },
      hero.power.effectType,
      // ApplyEffect callback — fires at the *start* of ApplyEffect, on the
      // visible board. Spawns projectiles, popups, hurt-flashes, lunge.
      (idx) => this.applyEffect(idx),
      // onComplete — runs after the cinematic's settled predicate clears.
      // If a power-kill victory is pending, schedule it now so the death-fade
      // animation plays before the victory screen appears.
      () => {
        if (this._victoryPending) {
          this._victoryPending = false;
          this.deps.onVictory();
        }
      },
      // Settled predicate — ApplyEffect waits until in-zone particles + damage
      // popups have all finished before unlocking input.
      () => !this.deps.powerEffectParticles.isActive && !this.deps.damagePopups.hasActive(),
    );
    return true;
  }

  // ===== Internal =====

  private showPreview(heroIndex: number): void {
    const hero = this.deps.teamState.heroes[heroIndex];
    this._previewHeroIndex = heroIndex;

    const currentMana = this.deps.manaBank.getMana(hero.power.manaColor);

    // Populate XAML-bound ViewModel properties
    const vm = this.deps.viewModel;
    vm.powerHeroName = hero.name;
    vm.powerName = hero.power.name;
    vm.powerDescription = hero.power.description;
    vm.powerManaColorHex = GEM_COLOR_HEX[hero.power.manaColor as keyof typeof GEM_COLOR_HEX] ?? '#FFFFFF';
    vm.powerManaCost = String(hero.power.manaCost);
    vm.powerCurrentMana = String(currentMana);
    vm.powerCanCast = currentMana >= hero.power.manaCost;
    vm.powerHeroTexture = getHeroTexture(hero.id);
    vm.powerGemTexture = GEM_TEXTURE_LOOKUP[hero.power.manaColor] ?? gemRedTexture;
    vm.powerPreviewVisible = true;

  }

  /**
   * Fires at the cinematic's white-flash beat. Resolves the power, spawns
   * damage popups + hurt flashes, and triggers the in-zone particle effect
   * (projectile / explosion / sparkle / screen shake).
   *
   * The lunge animation is also fired here so the hero is mid-punch as the
   * screen fades back in during ReturnToNormal.
   */
  private applyEffect(heroIndex: number): void {
    const result = this.resolver.executeHero(heroIndex);

    const team = this.deps.teamState;
    const hero = team.heroes[heroIndex];

    // Lunge so the caster is mid-strike as the cinematic fades out.
    team.triggerAttack(team.heroVisuals, heroIndex, true);

    // Trigger the in-zone particle/projectile/shake VFX. The system reads the
    // effect type and picks the right visual (beam, explosion, sparkles, …).
    this.triggerZoneVfx(heroIndex, hero?.power.effectType ?? PowerEffectType.DAMAGE_DIRECT, result.targetsHit);

    if (result.damageDealt > 0) {
      this.spawnDamageVisuals(heroIndex, result.damageDealt, result.targetsHit);
      this.checkEnemyDeaths();

      if (team.allEnemiesDead()) {
        this._victoryPending = true;
        return;
      }
    }

    if (result.healingDone > 0) {
      const isTeamHeal = hero && hero.power.target === PowerTarget.ALL_ALLIES;

      if (isTeamHeal) {
        // Show heal popup on EACH living hero so the player sees the whole team was healed
        const perHero = Math.floor(result.healingDone / Math.max(1, result.targetsHit));
        for (let i = 0; i < team.heroVisuals.length; i++) {
          const h = team.heroes[i];
          if (!h || h.currentHp <= 0) continue;
          const visual = team.heroVisuals[i];
          const cx = visual.x + 80 * visual.scale;
          const cy = visual.y - 5;
          this.deps.damagePopups.spawn(cx, cy, `+${perHero}`, {
            fontColor: POPUP_COLOR_HEAL,
            fontSize: POPUP_HEAL_FONT,
            strokeThickness: 3,
          });
        }
      } else {
        // Single-target heal: show popup on caster only
        const visual = team.heroVisuals[heroIndex];
        const cx = visual.x + 80 * visual.scale;
        const cy = visual.y - 5;
        this.deps.damagePopups.spawn(cx, cy, `+${result.healingDone}`, {
          fontColor: POPUP_COLOR_HEAL,
          fontSize: POPUP_HEAL_FONT,
          strokeThickness: 3,
        });
      }
    }

    if (result.manaGrant) {
      for (const [color, amount] of Object.entries(result.manaGrant)) {
        if (amount) this.deps.manaBank.addMana(Number(color) as GemType, amount);
      }
    }

    if (result.boardShuffle) {
      this.deps.onBoardShuffle?.();
    }

    if (result.gemConvert) {
      const { fromColor, toColor, count } = result.gemConvert;
      this.deps.onGemConvert?.(fromColor, toColor, count);
    }

    if (result.gemDestroy) {
      this.deps.onGemDestroy?.(result.gemDestroy.color);
    }
  }

  /** Trigger the in-zone particle effect at hero / enemy positions. */
  private triggerZoneVfx(heroIndex: number, effectType: PowerEffectType, targetsHit: number): void {
    const team = this.deps.teamState;
    const hero = team.heroes[heroIndex];
    const heroVisual = team.heroVisuals[heroIndex];
    if (!hero || !heroVisual) return;

    const sourceX = heroVisual.x + 80 * heroVisual.scale;
    const sourceY = heroVisual.y + 90 * heroVisual.scale;

    const isMultiTarget = hero.power.effectType === PowerEffectType.DAMAGE_BURST ||
                          hero.power.target === PowerTarget.ALL_ENEMIES;

    let targets: Array<{ x: number; y: number }> = [];
    if (effectType === PowerEffectType.HEAL ||
        effectType === PowerEffectType.SHIELD ||
        effectType === PowerEffectType.BUFF_ATK ||
        effectType === PowerEffectType.MANA_BOOST) {
      // Check if the power targets all allies; if so, show VFX on each living hero.
      if (hero.power.target === PowerTarget.ALL_ALLIES) {
        for (let i = 0; i < team.heroVisuals.length; i++) {
          const h = team.heroes[i];
          if (!h || h.currentHp <= 0) continue;
          const v = team.heroVisuals[i];
          targets.push({ x: v.x + 80 * v.scale, y: v.y + 90 * v.scale });
        }
      } else {
        // Self-targeted effects centre on the caster.
        targets = [{ x: sourceX, y: sourceY }];
      }
    } else if (isMultiTarget) {
      // Hit every living enemy — used for explosions, debuffs.
      for (let i = 0; i < team.enemyVisuals.length; i++) {
        const enemy = team.enemies[i];
        if (!enemy || enemy.currentHp <= 0) continue;
        const v = team.enemyVisuals[i];
        targets.push({ x: v.x + 80 * v.scale, y: v.y + 90 * v.scale });
      }
    } else {
      // Single front-enemy target.
      const idx = team.frontEnemyIndex;
      const v = team.enemyVisuals[idx];
      if (v) targets.push({ x: v.x + 80 * v.scale, y: v.y + 90 * v.scale });
    }

    if (targets.length === 0 && targetsHit > 0) {
      // Fallback so the effect still plays even if no live target was found.
      targets = [{ x: sourceX + 200, y: sourceY }];
    }

    this.deps.powerEffectParticles.trigger(effectType, sourceX, sourceY, targets);


  }

  /** Spawn damage popups + hurt flashes for the targeted enemies. */
  private spawnDamageVisuals(heroIndex: number, totalDamage: number, targetsHit: number): void {
    const team = this.deps.teamState;
    const hero = team.heroes[heroIndex];
    const isMultiTarget = !!hero && (
      hero.power.effectType === PowerEffectType.DAMAGE_BURST ||
      hero.power.target === PowerTarget.ALL_ENEMIES
    );

    if (isMultiTarget) {
      const perEnemy = Math.floor(totalDamage / Math.max(1, targetsHit));
      for (let i = 0; i < team.enemyVisuals.length; i++) {
        const enemy = team.enemies[i];
        if (!enemy || enemy.currentHp <= 0) continue;
        team.triggerHurtFlash(team.enemyVisuals, i);
        const visual = team.enemyVisuals[i];
        const cx = visual.x + 80 * visual.scale;
        const cy = visual.y - 5;
        this.deps.damagePopups.spawn(cx, cy, String(perEnemy), {
          fontColor: POPUP_COLOR_POWER,
          fontSize: POPUP_POWER_BURST_FONT,
          strokeThickness: 4,
        });
      }
    } else {
      const targetIdx = team.frontEnemyIndex;
      team.triggerHurtFlash(team.enemyVisuals, targetIdx);
      const visual = team.enemyVisuals[targetIdx];
      const cx = visual.x + 80 * visual.scale;
      const cy = visual.y - 5;
      this.deps.damagePopups.spawn(cx, cy, String(totalDamage), {
        fontColor: POPUP_COLOR_POWER,
        fontSize: POPUP_POWER_FONT,
        strokeThickness: 4,
      });
    }
  }

  /** Mark any newly-dead enemies and refresh front-enemy targeting. */
  private checkEnemyDeaths(): void {
    const team = this.deps.teamState;
    for (let i = 0; i < team.enemies.length; i++) {
      if (team.enemies[i].currentHp <= 0 && !team.enemyVisuals[i].isDead) {
        team.markDead(team.enemyVisuals, i);
        team.updateFrontEnemy();
      }
    }
  }
}
