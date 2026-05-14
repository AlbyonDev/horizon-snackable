/**
 * FrenzyService — Tap counter → timed all-gain multiplier.
 */
import { OnServiceReadyEvent, Service, service, subscribe } from 'meta/worlds';
import { FRENZY_TAP_THRESHOLD, FRENZY_DURATION, FRENZY_MULTIPLIER } from '../Constants';
import { Events } from '../Types';
import { ResourceService } from './ResourceService';
import { ActionService } from './ActionService';
import { StatsService } from './StatsService';
import { getActionDef, getScaledCost } from '../Defs/ActionDefs';

@service()
export class FrenzyService extends Service {

  private _threshold  : number = FRENZY_TAP_THRESHOLD;
  private _duration   : number = FRENZY_DURATION;
  private _multiplier : number = FRENZY_MULTIPLIER;

  private _tapCount   : number  = 0;
  private _active     : boolean = false;
  private _timeLeft   : number  = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    const unlockDef = getActionDef('frenzy.unlock');
    ActionService.get().declare('frenzy.unlock', () => ({
      label    : unlockDef.label,
      detail   : `${unlockDef.description} [x${FRENZY_MULTIPLIER} / ${FRENZY_TAP_THRESHOLD} taps / ${FRENZY_DURATION}s]`,
      cost     : unlockDef.cost,
      isEnabled: ResourceService.get().canAfford(unlockDef.cost),
    }));

    const thrDef = getActionDef('frenzy.threshold');
    ActionService.get().declare('frenzy.threshold', () => ({
      label    : thrDef.label,
      detail   : `${thrDef.description} [${this._threshold} taps -> ${Math.max(5, this._threshold - 2)} taps]`,
      cost     : getScaledCost('frenzy.threshold'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('frenzy.threshold')),
    }));

    const durDef = getActionDef('frenzy.duration');
    ActionService.get().declare('frenzy.duration', () => ({
      label    : durDef.label,
      detail   : `${durDef.description} [${this._duration}s -> ${this._duration + 3}s]`,
      cost     : getScaledCost('frenzy.duration'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('frenzy.duration')),
    }));

    const powDef = getActionDef('frenzy.power');
    ActionService.get().declare('frenzy.power', () => ({
      label    : powDef.label,
      detail   : `${powDef.description} [x${this._multiplier} -> x${parseFloat((this._multiplier + 0.5).toFixed(1))}]`,
      cost     : getScaledCost('frenzy.power'),
      isEnabled: ResourceService.get().canAfford(getScaledCost('frenzy.power')),
    }));
  }

  @subscribe(Events.PlayerTap)
  onPlayerTap(): void {
    if (!this.isPurchased()) return;
    if (this._active) return;
    this._tapCount++;
    if (this._tapCount >= this._threshold) {
      this._tapCount = 0;
      this._activate();
    }
  }

  @subscribe(Events.Tick)
  onTick(p: Events.TickPayload): void {
    if (!this._active) return;
    this._timeLeft -= p.dt;
    if (this._timeLeft <= 0) {
      this._active   = false;
      this._timeLeft = 0;
    }
  }

  @subscribe(Events.ActionTriggered)
  onActionTriggered(p: Events.ActionTriggeredPayload): void {
    if (!p.id.startsWith('frenzy.')) return;

    if (p.id === 'frenzy.unlock') {
      if (!ResourceService.get().buy(p.id)) return;
      ResourceService.get().registerModifier((amount, _source) => {
        if (!this._active) return { amount };
        return { amount: amount * this._multiplier, isFrenzy: true };
      }, 0);
      return;
    }

    if (p.id === 'frenzy.threshold') {
      if (!ResourceService.get().buy(p.id)) return;
      this._threshold = Math.max(5, this._threshold - 2);
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'frenzy.duration') {
      if (!ResourceService.get().buy(p.id)) return;
      this._duration += 3;
      ActionService.get().refreshDeclared();
      return;
    }

    if (p.id === 'frenzy.power') {
      if (!ResourceService.get().buy(p.id)) return;
      this._multiplier += 0.5;
      ActionService.get().refreshDeclared();
    }
  }

  isActive()     : boolean { return this._active; }
  getTimeLeft()  : number  { return this._timeLeft; }
  getTapCount()  : number  { return this._tapCount; }
  getThreshold() : number  { return this._threshold; }
  getMultiplier(): number  { return this._multiplier; }
  getDuration()  : number  { return this._duration; }

  isPurchased(): boolean {
    return StatsService.get().get('frenzy.unlock') > 0;
  }

  private _activate(): void {
    this._active   = true;
    this._timeLeft = this._duration;
    StatsService.get().increment('frenzy.activated');
  }
}
