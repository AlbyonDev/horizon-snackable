/**
 * ResourceService — Gold database + gain modifier pipeline.
 */
import { EventService, Service, service } from 'meta/worlds';
import { Events, GainSource, ResourceType } from '../Types';
import { INITIAL_RESOURCES } from '../Constants';
import { StatsService } from './StatsService';
import { getScaledCost } from '../Defs/ActionDefs';

type GainModifierResult = { amount: number; isCrit?: boolean; isFrenzy?: boolean };
type GainModifier = (amount: number, source: GainSource) => GainModifierResult;

@service()
export class ResourceService extends Service {

  private _gold     : number = INITIAL_RESOURCES;
  private _modifiers: Array<{ fn: GainModifier; priority: number }> = [];

  registerModifier(fn: GainModifier, priority: number = 0): void {
    this._modifiers.push({ fn, priority });
    this._modifiers.sort((a, b) => b.priority - a.priority);
  }

  addGain(rawAmount: number, source: GainSource): void {
    let amount   = rawAmount;
    let isCrit   = false;
    let isFrenzy = false;
    for (const { fn } of this._modifiers) {
      const result = fn(amount, source);
      amount   = result.amount;
      if (result.isCrit)   isCrit   = true;
      if (result.isFrenzy) isFrenzy = true;
    }
    this._gold += amount;
    StatsService.get().increment('gold_earned', amount);
    EventService.sendLocally(Events.GainApplied, { amount, source, isCrit, isFrenzy });
    this._notify();
  }

  spend(amount: number): boolean {
    if (this._gold < amount) return false;
    this._gold -= amount;
    this._notify();
    return true;
  }

  canAfford(amount: number): boolean { return this._gold >= amount; }
  getGold()              : number    { return this._gold; }

  buy(actionId: string): boolean {
    const cost = getScaledCost(actionId);
    if (!this.spend(cost)) return false;
    StatsService.get().increment(actionId);
    return true;
  }

  private _notify(): void {
    EventService.sendLocally(Events.ResourceChanged, {
      type:   ResourceType.Gold,
      amount: this._gold,
    });
  }
}
