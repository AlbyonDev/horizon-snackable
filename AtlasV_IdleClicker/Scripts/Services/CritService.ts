/**
 * CritService — Rolls crit on every gain and manages its own upgrade chain.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class CritService extends Service {

  private _chance     : number = BASE_CRIT_CHANCE;
  private _multiplier : number = BASE_CRIT_MULTIPLIER;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('crit.unlock');
    ActionService.get().declare('crit.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [${BASE_CRIT_CHANCE * 100}% / x${BASE_CRIT_MULTIPLIER}]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const chanceDef = getActionDef('crit.chance');
    ActionService.get().declare('crit.chance', () => ({
      label    : chanceDef.label,
      detail   : `${chanceDef.description} [${Math.round(this._chance * 100)}% -> ${Math.round(this._chance * 100) + 5}%]`,
      cost     : getScaledCost('crit.chance'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('crit.chance')),
    }));

    const powerDef = getActionDef('crit.power');
    ActionService.get().declare('crit.power', () => ({
      label    : powerDef.label,
      detail   : `${powerDef.description} [x${this._multiplier} -> x${parseFloat((this._multiplier + 0.5).toFixed(1))}]`,
      cost     : getScaledCost('crit.power'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('crit.power')),
    }));
  }

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('crit.')) return;

    if (p.id === 'crit.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      ResourceService.get().registerModifier((amount, _source) => {
        if (Math.random() >= this._chance) return { amount };
        StatsService.get().increment('crit.proc');
        return { amount: amount * this._multiplier, isCrit: true };
      }, 10);
      return;
    }

    if (p.id === 'crit.chance') {
      if (!ResourceService.get().buy(p.id)) return;
      this._chance += 0.05;
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'crit.power') {
      if (!ResourceService.get().buy(p.id)) return;
      this._multiplier += 0.5;
      ActionService.get().refreshDeclared();
    }
  }

  getChance()    : number  { return this._chance; }
  getMultiplier(): number  { return this._multiplier; }
  isPurchased() : boolean  { return StatsService.get().get('crit.unlock') > 0; }
}
