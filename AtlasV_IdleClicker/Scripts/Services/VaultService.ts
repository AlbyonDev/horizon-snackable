/**
 * VaultService — Locks gold for a duration, returns it with a bonus (auto-collect).
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { BASE_VAULT_DURATION, BASE_VAULT_BONUS, VAULT_LOCK_FRACTION } from '../Constants';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class VaultService extends Service {

  private _duration        : number = BASE_VAULT_DURATION;
  private _bonusMultiplier : number = BASE_VAULT_BONUS;

  private _locked      : boolean = false;
  private _lockedAmount: number  = 0;
  private _timeLeft    : number  = 0;

  private readonly _resources = Service.injectWeak(ResourceService);

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('vault.unlock');
    ActionService.get().declare('vault.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [+${Math.round((BASE_VAULT_BONUS - 1) * 100)}% / ${BASE_VAULT_DURATION}s]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const lockDef = getActionDef('vault.lock');
    ActionService.get().declare('vault.lock', () => {
      if (this._locked) {
        const total = Math.floor(this._lockedAmount * this._bonusMultiplier);
        return {
          label    : lockDef.label,
          detail   : `Returns ${total} gems (+${Math.round((this._bonusMultiplier - 1) * 100)}% on ${this._lockedAmount})`,
          cost     : 0,
          isEnabled: false,
        };
      }
      return {
        label    : lockDef.label,
        detail   : `Lock ${Math.round(VAULT_LOCK_FRACTION * 100)}% of gems for ${this._duration}s, returns with +${Math.round((this._bonusMultiplier - 1) * 100)}% bonus.`,
        cost     : Math.floor(ResourceService.get().getGold() * VAULT_LOCK_FRACTION),
        isEnabled: ResourceService.get().getGold() > 0,
      };
    });

    const durDef = getActionDef('vault.duration');
    ActionService.get().declare('vault.duration', () => {
      const next = parseFloat((this._duration * 0.8).toFixed(1));
      return {
        label    : durDef.label,
        detail   : `${durDef.description} [${parseFloat(this._duration.toFixed(1))}s -> ${next}s]`,
        cost     : getScaledCost('vault.duration'),
        isEnabled: ResourceService.get().canAfford(getScaledCost('vault.duration')),
      };
    });

    const bonusDef = getActionDef('vault.bonus');
    ActionService.get().declare('vault.bonus', () => ({
      label    : bonusDef.label,
      detail   : `${bonusDef.description} [+${Math.round((this._bonusMultiplier - 1) * 100)}% -> +${Math.round((this._bonusMultiplier - 0.8) * 100)}%]`,
      cost     : getScaledCost('vault.bonus'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('vault.bonus')),
    }));
  }

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._locked) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft <= 0) {
      this._timeLeft = 0;
      this._handleCollect();
    } else {
      const total = Math.floor(this._lockedAmount * this._bonusMultiplier);
      ActionService.get().update('vault.lock', {
        detail: `Returns ${total} gems (+${Math.round((this._bonusMultiplier - 1) * 100)}% on ${this._lockedAmount})`,
      });
    }
  }

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('vault.')) return;

    if (p.id === 'vault.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      return;
    }

    if (p.id === 'vault.lock') { this._handleLock(); return; }

    if (p.id === 'vault.duration') {
      if (!ResourceService.get().buy(p.id)) return;
      this._duration = parseFloat((this._duration * 0.8).toFixed(1));
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'vault.bonus') {
      if (!ResourceService.get().buy(p.id)) return;
      this._bonusMultiplier = Math.round((this._bonusMultiplier + 0.2) * 10) / 10;
      ActionService.get().refreshDeclared();
    }
  }

  isPurchased()        : boolean { return StatsService.get().get('vault.unlock') > 0; }
  isLocked()           : boolean { return this._locked; }
  getTimeLeft()        : number  { return this._timeLeft; }
  getLockedAmount()    : number  { return this._lockedAmount; }
  getDuration()        : number  { return this._duration; }
  getBonusMultiplier() : number  { return this._bonusMultiplier; }

  private _handleLock(): void {
    if (this._locked) return;
    const gold   = ResourceService.get().getGold();
    const amount = Math.max(1, Math.floor(gold * VAULT_LOCK_FRACTION));
    if (!this._resources?.spend(amount)) return;
    this._locked       = true;
    this._lockedAmount = amount;
    this._timeLeft     = this._duration;
    StatsService.get().increment('vault.lock');
  }

  private _handleCollect(): void {
    if (!this._locked) return;
    const total        = this._lockedAmount * this._bonusMultiplier;
    this._locked       = false;
    this._lockedAmount = 0;
    this._resources?.addGain(total, GainSource.VaultPayout);
  }
}
