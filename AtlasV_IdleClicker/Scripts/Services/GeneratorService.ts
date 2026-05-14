/**
 * GeneratorService — Generator counts, buy actions, upgrades, and production cycles.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { Events, GainSource } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { type IGeneratorDef, GENERATOR_DEFS } from '../Defs/GeneratorDefs';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class GeneratorService extends Service {

  private readonly _resources = Service.injectWeak(ResourceService);

  private _counts: Map<number, number> = new Map();
  private _accumulators: Map<number, number> = new Map();
  private _purchasedRanks: Map<number, number> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of GENERATOR_DEFS) {
      this._declareBuyAction(def);
      this._declareUpgradeActions(def);
    }
  }

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    for (const def of GENERATOR_DEFS) {
      const count = this.getCount(def.id);
      if (count === 0) continue;

      const accum = (this._accumulators.get(def.id) ?? 0) + p.dt;
      if (accum < def.cycleTime) {
        this._accumulators.set(def.id, accum);
        continue;
      }
      this._accumulators.set(def.id, accum - def.cycleTime);

      const raw = count * def.baseOutput * this.getOutputMultiplier(def.id);
      this._resources?.addGain(raw, GainSource.Passive);
    }
  }

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (p.id.startsWith('generator.buy.')) {
      const genId = parseInt(p.id.split('.')[2], 10);
      if (isNaN(genId)) return;
      const cost = this.getNextCost(genId);
      if (!this._resources?.spend(cost)) return;
      this._addOne(genId);
      return;
    }

    if (p.id.startsWith('generator.upgrade.')) {
      const parts    = p.id.split('.');
      const genId    = parseInt(parts[2], 10);
      const rank     = parseInt(parts[3], 10);
      if (isNaN(genId) || isNaN(rank)) return;

      const nextRank = this._purchasedRanks.get(genId) ?? 0;
      if (rank !== nextRank) return;

      if (!ResourceService.get().buy(p.id)) return;
      this._purchasedRanks.set(genId, nextRank + 1);
      ActionService.get().refreshDeclared();
    }
  }

  getCount(generatorId: number): number {
    return this._counts.get(generatorId) ?? 0;
  }

  getNextCost(generatorId: number): number {
    if (!GENERATOR_DEFS.some(d => d.id === generatorId)) return Infinity;
    return getScaledCost(`generator.buy.${generatorId}`, this.getCount(generatorId));
  }

  getOutputMultiplier(generatorId: number): number {
    const def       = GENERATOR_DEFS.find(d => d.id === generatorId);
    const purchased = this._purchasedRanks.get(generatorId) ?? 0;
    if (!def || purchased === 0) return 1;
    return def.upgradeMultipliers
      .slice(0, purchased)
      .reduce((mult: number, m: number) => mult * m, 1);
  }

  /** Total passive income per second across all owned generators. */
  getTotalIncomePerSecond(): number {
    let total = 0;
    for (const def of GENERATOR_DEFS) {
      const count = this.getCount(def.id);
      if (count === 0) continue;
      total += (count * def.baseOutput * this.getOutputMultiplier(def.id)) / def.cycleTime;
    }
    return total;
  }

  /** Cycle progress (0-1) of the first owned generator, for UI progress bar. */
  getFirstGeneratorCycleProgress(): { progress: number; hasGenerator: boolean } {
    for (const def of GENERATOR_DEFS) {
      const count = this.getCount(def.id);
      if (count > 0) {
        const accum = this._accumulators.get(def.id) ?? 0;
        return { progress: accum / def.cycleTime, hasGenerator: true };
      }
    }
    return { progress: 0, hasGenerator: false };
  }

  /** Cycle progress (0-1) for a specific generator, plus next payout amount. */
  getCycleInfo(generatorId: number): { progress: number; payout: number } {
    const def = GENERATOR_DEFS.find(d => d.id === generatorId);
    if (!def) return { progress: 0, payout: 0 };
    const count = this.getCount(generatorId);
    if (count === 0) return { progress: 0, payout: 0 };
    const accum = this._accumulators.get(generatorId) ?? 0;
    return {
      progress: accum / def.cycleTime,
      payout  : count * def.baseOutput * this.getOutputMultiplier(generatorId),
    };
  }

  getNextUpgrade(generatorId: number): ReturnType<typeof getActionDef> | undefined {
    const nextRank = this._purchasedRanks.get(generatorId) ?? 0;
    const id = `generator.upgrade.${generatorId}.${nextRank}`;
    try { return getActionDef(id); } catch { return undefined; }
  }

  private _addOne(generatorId: number): void {
    this._counts.set(generatorId, this.getCount(generatorId) + 1);
    StatsService.get().increment(`generator.${generatorId}`);
  }

  private _declareBuyAction(def: IGeneratorDef): void {
    const buyId     = `generator.buy.${def.id}`;
    const actionDef = getActionDef(buyId);
    ActionService.get().declare(buyId, () => {
      const cost = this.getNextCost(def.id);
      return {
        label    : actionDef.label,
        detail   : actionDef.description,
        cost,
        isEnabled: ResourceService.get().canAfford(cost),
      };
    });
  }

  private _declareUpgradeActions(def: IGeneratorDef): void {
    for (let rank = 0; rank < def.upgradeMultipliers.length; rank++) {
      const upgradeId = `generator.upgrade.${def.id}.${rank}`;
      let upgDef: ReturnType<typeof getActionDef>;
      try { upgDef = getActionDef(upgradeId); } catch { break; }

      ActionService.get().declare(upgradeId, () => {
        const currentMult = parseFloat(this.getOutputMultiplier(def.id).toFixed(2));
        const purchased   = this._purchasedRanks.get(def.id) ?? 0;
        const rankMul     = def.upgradeMultipliers[purchased] ?? 1;
        const nextMult    = parseFloat((currentMult * rankMul).toFixed(2));
        return {
          label    : upgDef.label,
          detail   : `${upgDef.description} [x${currentMult} -> x${nextMult}]`,
          cost     : upgDef.cost,
          isEnabled: ResourceService.get().canAfford(upgDef.cost),
        };
      });
    }
  }
}
