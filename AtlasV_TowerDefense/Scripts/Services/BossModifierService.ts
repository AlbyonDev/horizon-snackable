/**
 * BossModifierService — Applies a SINGLE boss modifier for the current boss level.
 *
 * Component Attachment: Scene Entity (via GameManager force-instantiation)
 * Component Networking: Local (single-player tower defense)
 * Component Ownership: Not Networked
 *
 * Listens to LevelSelected to detect boss nodes. When active, reads the
 * bossModifier field from the generated ILevelDef and exposes only that
 * modifier's effect through the same getter API the rest of the game uses:
 *   - hpMultiplier (1.2× only if HpUp)
 *   - speedMultiplier (1.5× only if SpeedUp)
 *   - damageMultiplier (0.9× only if DmgDown)
 *   - incomeMultiplier (0.9× only if NoIncome, else 1×)
 *   - startLivesOverride (1 only if OneLife)
 *   - shouldDestroyTower(waveNumber) (only if TowerDestroy)
 *
 * Also exposes the active modifier enum value for UI consumption.
 * Resets on RestartGame.
 */
import { Service } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { Events, BossModifier, BOSS_MODIFIER_LABELS } from '../Types';
import { LevelGeneratorService } from './LevelGeneratorService';

@service()
export class BossModifierService extends Service {
  private _active: boolean = false;
  private _modifier: BossModifier | null = null;

  get active(): boolean { return this._active; }

  /** The currently active single boss modifier, or null if not a boss level. */
  get activeModifier(): BossModifier | null { return this._modifier; }

  /** Short display label for the active modifier (empty if none). */
  get activeModifierLabel(): string {
    return this._modifier !== null ? BOSS_MODIFIER_LABELS[this._modifier] : '';
  }

  get hpMultiplier(): number { return this._modifier === BossModifier.HpUp ? 1.2 : 1; }
  get speedMultiplier(): number { return this._modifier === BossModifier.SpeedUp ? 1.2 : 1; }
  get damageMultiplier(): number { return this._modifier === BossModifier.DmgDown ? 0.9 : 1; }
  get incomeMultiplier(): number { return this._modifier === BossModifier.NoIncome ? 0.9 : 1; }
  get startLivesOverride(): number | null { return this._modifier === BossModifier.OneLife ? 1 : null; }

  /** Returns true if a tower should be destroyed at the given 1-based wave number. */
  shouldDestroyTower(waveNumber: number): boolean {
    return this._modifier === BossModifier.TowerDestroy && waveNumber % 5 === 0;
  }

  @subscribe(Events.LevelSelected)
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (p.nodeType === 'boss') {
      this._active = true;
      const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
      this._modifier = levelDef.bossModifier ?? null;
      console.log(`[BossModifierService] Boss level selected, modifier=${this._modifier !== null ? BossModifier[this._modifier] : 'none'}`);
    } else {
      this._active = false;
      this._modifier = null;
      console.log(`[BossModifierService] Non-boss level selected, modifiers cleared`);
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._active = false;
    this._modifier = null;
  }
}
